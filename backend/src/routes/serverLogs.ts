import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import fs from "fs";
import path from "path";
import { getServerPath } from "../services/processManager";

const router = Router();

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : val;
}

function getLogFiles(serverDir: string): { name: string; size: number; modifiedAt: Date }[] {
  const results: { name: string; size: number; modifiedAt: Date }[] = [];
  const logsDir = path.join(serverDir, "logs");

  for (const dir of [serverDir, logsDir]) {
    if (!fs.existsSync(dir)) continue;
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (!item.endsWith(".log")) continue;
        const fullPath = path.join(dir, item);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isFile()) {
            results.push({ name: item, size: stat.size, modifiedAt: stat.mtime });
          }
        } catch {}
      }
    } catch {}
  }

  return results.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
}

function readLogLines(filePath: string, tail: number, search: string): string[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  let lines = content.split("\n").filter((l) => l.trim());
  if (search) {
    const lower = search.toLowerCase();
    lines = lines.filter((line) => line.toLowerCase().includes(lower));
  }
  return lines.slice(-tail);
}

router.get("/api/servers/:id/logs", authenticate, async (req: Request, res: Response) => {
  try {
    const id = param(req, "id");
    const userId = (req as any).userId;
    const server = await prisma.server.findUnique({ where: { id } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const serverPath = getServerPath(id);
    if (!fs.existsSync(serverPath)) return res.json({ files: [] });
    const files = getLogFiles(serverPath);
    res.json({ files });
  } catch (err) {
    console.error("Error listing log files:", err);
    res.status(500).json({ error: "Failed to list log files" });
  }
});

router.get("/api/servers/:id/logs/:filename", authenticate, async (req: Request, res: Response) => {
  try {
    const id = param(req, "id");
    const filename = param(req, "filename");
    const userId = (req as any).userId;
    const tail = parseInt(String(req.query.tail)) || 500;
    const search = String(req.query.search || "");

    const server = await prisma.server.findUnique({ where: { id } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const serverPath = getServerPath(id);
    const filePath = path.join(serverPath, filename);
    if (!filePath.startsWith(serverPath)) return res.status(403).json({ error: "Access denied" });

    const lines = readLogLines(filePath, tail, search);
    res.json({ lines, total: lines.length, filename });
  } catch (err) {
    console.error("Error reading log file:", err);
    res.status(500).json({ error: "Failed to read log file" });
  }
});

router.get("/api/servers/:id/logs/latest", authenticate, async (req: Request, res: Response) => {
  try {
    const id = param(req, "id");
    const userId = (req as any).userId;
    const server = await prisma.server.findUnique({ where: { id } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const serverPath = getServerPath(id);
    const files = getLogFiles(serverPath);
    if (files.length === 0) return res.json({ lines: [], total: 0, filename: "" });

    const latest = files[0];
    const filePath = path.join(serverPath, latest.name);
    const lines = readLogLines(filePath, 500, "");
    res.json({ lines, total: lines.length, filename: latest.name });
  } catch (err) {
    console.error("Error reading latest log:", err);
    res.status(500).json({ error: "Failed to read log" });
  }
});

export default router;
