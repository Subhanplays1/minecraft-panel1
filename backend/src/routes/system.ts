import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import { isRunning, getStartedAt, getServerPath } from "../services/processManager";
import os from "os";
import { execSync } from "child_process";
import fs from "fs";

const router = Router();

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : val;
}

function getCpuUsage(): number {
  try {
    if (os.platform() === "linux" && fs.existsSync("/proc/stat")) {
      const stat = fs.readFileSync("/proc/stat", "utf-8");
      const line = stat.split("\n")[0];
      const parts = line.split(/\s+/).slice(1).map(Number);
      const idle = parts[3];
      const total = parts.reduce((a, b) => a + b, 0);
      return ((total - idle) / total) * 100;
    }
  } catch {}
  return Math.min(os.loadavg()[0] * 10, 100);
}

function getDiskUsage(diskPath: string): { total: number; used: number; free: number } {
  try {
    if (os.platform() === "linux") {
      const output = execSync(`du -sb "${diskPath}" 2>/dev/null || echo 0`, { encoding: "utf-8" });
      const used = parseInt(output.split("\t")[0], 10) || 0;
      return { total: used, used, free: 0 };
    } else {
      const output = execSync(`wmic logicaldisk where "DeviceID='C:'" get Size,FreeSpace /format:csv`, { encoding: "utf-8" });
      const lines = output.trim().split("\n").filter((l) => l.trim());
      if (lines.length > 1) {
        const parts = lines[1].split(",");
        const free = parseInt(parts[1], 10) || 0;
        const total = parseInt(parts[2], 10) || 0;
        return { total, used: total - free, free };
      }
    }
  } catch {}
  return { total: 0, used: 0, free: 0 };
}

router.get("/api/system/health", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const cpuUsage = getCpuUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const disk = getDiskUsage("/");

    let panelVersion = "1.0.0";
    try {
      const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
      panelVersion = pkg.version;
    } catch {}

    res.json({
      cpu: { usage: Math.round(cpuUsage * 100) / 100, cores: os.cpus().length },
      memory: { total: totalMem, used: usedMem, free: freeMem },
      disk,
      uptime: os.uptime(),
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      nodeVersion: process.version,
      panelVersion,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get system health" });
  }
});

router.get("/api/system/health/node/:nodeId", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const nodeId = param(req, "nodeId");
    const node = await prisma.node.findUnique({ where: { id: nodeId } });
    if (!node) return res.status(404).json({ error: "Node not found" });

    const cpuUsage = getCpuUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const disk = getDiskUsage("/");

    let panelVersion = "1.0.0";
    try {
      const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
      panelVersion = pkg.version;
    } catch {}

    res.json({
      nodeId: node.id,
      nodeName: node.name,
      cpu: { usage: Math.round(cpuUsage * 100) / 100, cores: os.cpus().length },
      memory: { total: totalMem, used: usedMem, free: freeMem },
      disk,
      uptime: os.uptime(),
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      nodeVersion: process.version,
      panelVersion,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get node health" });
  }
});

router.get("/api/servers/:id/resources", authenticate, async (req: Request, res: Response) => {
  try {
    const id = param(req, "id");
    const server = await prisma.server.findUnique({ where: { id } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const cpuUsage = getCpuUsage();
    let ramUsage = 0;
    try {
      if (os.platform() === "linux") {
        const status = fs.readFileSync("/proc/self/status", "utf-8");
        const match = status.match(/VmRSS:\s+(\d+)/);
        if (match) ramUsage = parseInt(match[1], 10) * 1024;
      }
    } catch {}

    const serverDir = getServerPath(server.id);
    const disk = getDiskUsage(serverDir);
    const startedAt = getStartedAt(server.id);

    res.json({
      serverId: server.id,
      name: server.name,
      cpu: { usage: Math.round(cpuUsage * 100) / 100 },
      memory: { used: ramUsage, allocated: server.ram * 1024 * 1024 },
      disk: { used: disk.used, allocated: server.disk * 1024 * 1024 },
      uptime: startedAt ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000) : 0,
      running: isRunning(server.id),
      startedAt,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get server resources" });
  }
});

export default router;
