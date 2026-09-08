import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import { isRunning, getStartedAt, getServerPath } from "../services/processManager";
import { execSync, exec } from "child_process";
import fs from "fs";
import path from "path";

const router = Router();
function param(req: Request, key: string): string { return (req.params as any)[key] || ""; }

// ============================================================
// SERVER HEALTH SCORE
// ============================================================

router.get("/servers/:id/health", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) return res.status(403).json({ error: "Access denied" });

    // Calculate health score
    let score = 100;
    const crashes = await prisma.crashLog.count({ where: { serverId: server.id } });
    const uptimeRecords = await prisma.uptimeRecord.findMany({ where: { serverId: server.id }, take: 100 });
    const upChecks = uptimeRecords.filter((r) => r.status === "UP").length;
    const uptimePct = uptimeRecords.length > 0 ? (upChecks / uptimeRecords.length) * 100 : 100;

    // Deductions
    if (crashes > 0) score -= Math.min(crashes * 5, 25);
    if (uptimePct < 99) score -= Math.round((99 - uptimePct) * 2);
    if (uptimePct < 95) score -= 10;
    if (server.status === "CRASHED") score -= 15;
    if (server.status === "EXPIRED") score -= 20;

    // RAM pressure
    const ramPct = Math.round((server.ram / (server.ram || 2048)) * 100);
    if (ramPct > 90) score -= 10;
    score = Math.max(0, Math.min(100, score));

    // Save health history
    await prisma.serverHealth.create({
      data: {
        serverId: server.id,
        score,
        ramPct,
        uptimePct,
        crashCount: crashes,
        details: JSON.stringify({ uptimePct, crashes, ramPct }),
      },
    });

    // Get last 30 health records for trend
    const history = await prisma.serverHealth.findMany({
      where: { serverId: server.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";

    return res.json({ score, grade, uptimePct: Math.round(uptimePct * 100) / 100, crashes, ramPct, history, status: server.status });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// FILE EDITOR
// ============================================================

router.get("/servers/:id/files/read", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) return res.status(403).json({ error: "Access denied" });

    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).json({ error: "path required" });

    const serverDir = getServerPath(server.id);
    const fullPath = path.join(serverDir, filePath);
    if (!fullPath.startsWith(serverDir)) return res.status(403).json({ error: "Access denied" });
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: "File not found" });

    const stat = fs.statSync(fullPath);
    if (stat.size > 2 * 1024 * 1024) return res.status(400).json({ error: "File too large (>2MB)" });

    const content = fs.readFileSync(fullPath, "utf-8");
    return res.json({ content, size: stat.size, modified: stat.mtime });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/servers/:id/files/write", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) return res.status(403).json({ error: "Access denied" });

    const { filePath, content } = req.body;
    if (!filePath || content === undefined) return res.status(400).json({ error: "filePath and content required" });

    const serverDir = getServerPath(server.id);
    const fullPath = path.join(serverDir, filePath);
    if (!fullPath.startsWith(serverDir)) return res.status(403).json({ error: "Access denied" });

    // Backup original
    const backupPath = fullPath + ".bak";
    if (fs.existsSync(fullPath)) fs.copyFileSync(fullPath, backupPath);

    fs.writeFileSync(fullPath, content, "utf-8");
    return res.json({ success: true, size: Buffer.byteLength(content) });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// AUTO-RESTART ON CRASH
// ============================================================

router.get("/servers/:id/auto-restart", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) return res.status(403).json({ error: "Access denied" });
    const setting = await prisma.setting.findFirst({ where: { group: `autorestart_${server.id}`, key: "enabled" } });
    return res.json({ enabled: setting ? setting.value === "true" : false });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/servers/:id/auto-restart", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) return res.status(403).json({ error: "Access denied" });
    const { enabled } = req.body;
    const existing = await prisma.setting.findFirst({ where: { group: `autorestart_${server.id}`, key: "enabled" } });
    if (existing) await prisma.setting.update({ where: { id: existing.id }, data: { value: String(enabled) } });
    else await prisma.setting.create({ data: { group: `autorestart_${server.id}`, key: "enabled", value: String(enabled) } });
    return res.json({ enabled: !!enabled });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// PLAYER HISTORY
// ============================================================

router.get("/servers/:id/players/history", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) return res.status(403).json({ error: "Access denied" });
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const history = await prisma.playerHistory.findMany({
      where: { serverId: server.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return res.json(history);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/servers/:id/players/history", authenticate, async (req: Request, res: Response) => {
  try {
    const { playerName, action, ip } = req.body;
    const event = await prisma.playerHistory.create({
      data: { serverId: param(req, "id"), playerName, action, ip },
    });
    return res.json(event);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// HEATMAP DATA
// ============================================================

router.get("/servers/:id/heatmap", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) return res.status(403).json({ error: "Access denied" });

    const days = parseInt(req.query.days as string) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const events = await prisma.activityEvent.findMany({
      where: { serverId: server.id, createdAt: { gte: since } },
      select: { createdAt: true, type: true },
    });

    // Build 24h x days matrix
    const now = new Date();
    const heatmap: Record<string, Record<number, number>> = {};
    for (let d = 0; d < days; d++) {
      const date = new Date(now.getTime() - (days - 1 - d) * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split("T")[0];
      heatmap[key] = {};
      for (let h = 0; h < 24; h++) heatmap[key][h] = 0;
    }
    for (const e of events) {
      const d = new Date(e.createdAt);
      const key = d.toISOString().split("T")[0];
      if (heatmap[key]) heatmap[key][d.getHours()]++;
    }

    return res.json({ heatmap, days });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// PLUGIN CONFLICT DETECTOR
// ============================================================

router.get("/servers/:id/plugin-conflicts", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) return res.status(403).json({ error: "Access denied" });

    const serverDir = getServerPath(server.id);
    const logsDir = path.join(serverDir, "logs");
    const conflicts: { plugin: string; issue: string; severity: string }[] = [];

    if (fs.existsSync(path.join(logsDir, "latest.log"))) {
      const log = fs.readFileSync(path.join(logsDir, "latest.log"), "utf-8");
      const lines = log.split("\n");

      const errorPatterns = [
        { pattern: /Could not load '(.+?)'.*conflict/i, severity: "HIGH", issue: "Plugin load conflict" },
        { pattern: /(.+?) has provided an invalid UUID/i, severity: "MEDIUM", issue: "Invalid UUID" },
        { pattern: /Error occurred while enabling (.+?)/i, severity: "HIGH", issue: "Plugin enable error" },
        { pattern: /(.+?) registered incompatible.*handler/i, severity: "HIGH", issue: "Incompatible handler" },
        { pattern: /NoSuchMethodError.*(.+?)/i, severity: "HIGH", issue: "Method not found (version mismatch)" },
        { pattern: /ClassNotFoundException.*(.+?)/i, severity: "HIGH", issue: "Missing dependency class" },
        { pattern: /OutOfMemoryError/i, severity: "CRITICAL", issue: "Out of memory" },
        { pattern: /Thread (.+?) timed out/i, severity: "MEDIUM", issue: "Thread timeout" },
      ];

      for (const line of lines) {
        for (const { pattern, severity, issue } of errorPatterns) {
          const match = line.match(pattern);
          if (match) {
            const plugin = match[1] || "Unknown";
            if (!conflicts.find((c) => c.plugin === plugin && c.issue === issue)) {
              conflicts.push({ plugin: plugin.substring(0, 50), issue, severity });
            }
          }
        }
      }
    }

    return res.json({ conflicts, total: conflicts.length });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// CONFIG DIFF VIEWER
// ============================================================

router.get("/servers/:id/config-diff", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) return res.status(403).json({ error: "Access denied" });

    const serverDir = getServerPath(server.id);
    const configFiles = ["server.properties", "bungee.yml", "paper.yml", "spigot.yml", "pufferfish.yml"];
    const diffs: { file: string; current: string; backup: string | null; changed: boolean }[] = [];

    for (const file of configFiles) {
      const currentPath = path.join(serverDir, file);
      const backupPath = path.join(serverDir, file + ".bak");
      if (fs.existsSync(currentPath)) {
        const current = fs.readFileSync(currentPath, "utf-8");
        const backup = fs.existsSync(backupPath) ? fs.readFileSync(backupPath, "utf-8") : null;
        const changed = backup !== null && current !== backup;
        if (changed) diffs.push({ file, current: current.substring(0, 5000), backup: backup?.substring(0, 5000) || null, changed });
      }
    }

    return res.json({ diffs, total: diffs.length });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// PORT FORWARDING
// ============================================================

router.get("/servers/:id/ports", authenticate, async (req: Request, res: Response) => {
  try {
    const ports = await prisma.portForward.findMany({ where: { serverId: param(req, "id") }, orderBy: { createdAt: "desc" } });
    return res.json(ports);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/servers/:id/ports", authenticate, async (req: Request, res: Response) => {
  try {
    const { internalPort, externalPort, protocol, description } = req.body;
    const port = await prisma.portForward.create({
      data: {
        serverId: param(req, "id"),
        internalPort: Number(internalPort),
        externalPort: Number(externalPort),
        protocol: protocol || "TCP",
        description,
      },
    });
    return res.json(port);
  } catch (error: any) {
    if (error.code === "P2002") return res.status(400).json({ error: "Port already in use" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/servers/:id/ports/:portId", authenticate, async (req: Request, res: Response) => {
  try {
    await prisma.portForward.delete({ where: { id: param(req, "portId") } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/servers/:id/ports/:portId", authenticate, async (req: Request, res: Response) => {
  try {
    const { enabled, description } = req.body;
    const data: any = {};
    if (enabled !== undefined) data.enabled = enabled;
    if (description !== undefined) data.description = description;
    const port = await prisma.portForward.update({ where: { id: param(req, "portId") }, data });
    return res.json(port);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// GIT INTEGRATION
// ============================================================

router.get("/servers/:id/git", authenticate, async (req: Request, res: Response) => {
  try {
    const repos = await prisma.gitRepo.findMany({ where: { serverId: param(req, "id") } });
    return res.json(repos);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/servers/:id/git", authenticate, async (req: Request, res: Response) => {
  try {
    const { repoUrl, branch } = req.body;
    if (!repoUrl) return res.status(400).json({ error: "repoUrl required" });
    const repo = await prisma.gitRepo.create({
      data: { serverId: param(req, "id"), repoUrl, branch: branch || "main" },
    });
    return res.json(repo);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/servers/:id/git/pull", authenticate, async (req: Request, res: Response) => {
  try {
    const repo = await prisma.gitRepo.findFirst({ where: { serverId: param(req, "id") } });
    if (!repo) return res.status(404).json({ error: "No git repo configured" });

    const serverDir = getServerPath(param(req, "id"));
    const repoDir = path.join(serverDir, "git_repo");

    if (!fs.existsSync(path.join(repoDir, ".git"))) {
      execSync(`git clone -b ${repo.branch} ${repo.repoUrl} ${repoDir}`, { timeout: 60000 });
    } else {
      execSync(`cd ${repoDir} && git pull origin ${repo.branch}`, { timeout: 60000 });
    }

    const commitHash = execSync("git rev-parse --short HEAD", { cwd: repoDir }).toString().trim();

    await prisma.gitRepo.update({
      where: { id: repo.id },
      data: { lastCommit: commitHash, lastPullAt: new Date() },
    });

    return res.json({ success: true, commit: commitHash });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Git pull failed" });
  }
});

router.delete("/servers/:id/git/:repoId", authenticate, async (req: Request, res: Response) => {
  try {
    await prisma.gitRepo.delete({ where: { id: param(req, "repoId") } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// RESOURCE COST CALCULATOR
// ============================================================

router.get("/servers/:id/cost", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) return res.status(403).json({ error: "Access denied" });

    // Cost per unit per month (configurable)
    const ramCostPerGB = 5.00;
    const diskCostPerGB = 0.10;
    const cpuCostPerCore = 10.00;
    const bandwidthCostPerGB = 0.50;

    const ramGB = server.ram / 1024;
    const diskGB = server.disk / 1024;
    const cpuCores = server.cpu / 100;

    const monthlyRam = ramGB * ramCostPerGB;
    const monthlyDisk = diskGB * diskCostPerGB;
    const monthlyCpu = cpuCores * cpuCostPerCore;

    const totalMonthly = monthlyRam + monthlyDisk + monthlyCpu;

    // Usage based on uptime
    const uptimeRecords = await prisma.uptimeRecord.findMany({ where: { serverId: server.id }, take: 4320 }); // 30 days * 144 checks/day
    const upChecks = uptimeRecords.filter((r) => r.status === "UP").length;
    const usagePct = uptimeRecords.length > 0 ? (upChecks / uptimeRecords.length) * 100 : 0;

    const estimatedMonthly = totalMonthly * (usagePct / 100);

    return res.json({
      breakdown: {
        ram: { amount: `${ramGB} GB`, cost: monthlyRam, costPerGB: ramCostPerGB },
        disk: { amount: `${diskGB} GB`, cost: monthlyDisk, costPerGB: diskCostPerGB },
        cpu: { amount: `${cpuCores} cores`, cost: monthlyCpu, costPerCore: cpuCostPerCore },
      },
      totalMonthly: Math.round(totalMonthly * 100) / 100,
      usagePct: Math.round(usagePct * 100) / 100,
      estimatedMonthly: Math.round(estimatedMonthly * 100) / 100,
      uptimeHours: Math.round((upChecks * 5 / 60) * 100) / 100, // 5min intervals
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// SERVER TRANSFER (admin only)
// ============================================================

router.post("/servers/:id/transfer", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== "ADMIN") return res.status(403).json({ error: "Admin only" });
    const { nodeId } = req.body;
    if (!nodeId) return res.status(400).json({ error: "nodeId required" });
    const node = await prisma.node.findUnique({ where: { id: nodeId } });
    if (!node) return res.status(404).json({ error: "Node not found" });
    await prisma.server.update({ where: { id: param(req, "id") }, data: { nodeId } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// DUPLICATE SERVER
// ============================================================

router.post("/servers/:id/duplicate", authenticate, async (req: Request, res: Response) => {
  try {
    const original = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!original) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && original.userId !== req.user!.userId) return res.status(403).json({ error: "Access denied" });

    const renewalSetting = await prisma.setting.findFirst({ where: { group: "renewal", key: "days" } });
    const renewalDays = renewalSetting ? parseInt(renewalSetting.value) : 3;

    // Find available port
    const usedPorts = await prisma.server.findMany({ select: { port: true } });
    const used = new Set(usedPorts.map((p) => p.port));
    let port = 25565;
    while (used.has(port)) port++;

    const dup = await prisma.server.create({
      data: {
        name: `${original.name} (Copy)`,
        userId: original.userId,
        nodeId: original.nodeId,
        software: original.software,
        mcVersion: original.mcVersion,
        javaVersion: original.javaVersion,
        ram: original.ram,
        cpu: original.cpu,
        disk: original.disk,
        port,
        ip: "127.0.0.1",
        status: "STOPPED",
        renewalAt: new Date(Date.now() + renewalDays * 24 * 60 * 60 * 1000),
        renewedAt: new Date(),
      },
    });

    return res.json({ id: dup.id, name: dup.name, port: dup.port });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
