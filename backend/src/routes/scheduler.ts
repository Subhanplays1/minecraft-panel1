import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import path from "path";
import fs from "fs";
import {
  isRunning,
  sendLocalCommand,
  startLocalServer,
  stopLocalServer,
} from "../services/processManager";

const router = Router();

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : val;
}

// ============================================================
// CRON PARSER
// ============================================================

function parseCronInterval(expr: string): number | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const [minPart, hourPart, dayPart, monthPart, dowPart] = parts;

  // Every minute: * * * * *
  if (minPart === "*" && hourPart === "*" && dayPart === "*" && monthPart === "*" && dowPart === "*") {
    return 60 * 1000;
  }

  // Every N minutes: */N * * * *
  const minEveryMatch = minPart.match(/^\*\/(\d+)$/);
  if (minEveryMatch) {
    const interval = parseInt(minEveryMatch[1], 10);
    if (interval >= 1 && interval <= 59 && hourPart === "*" && dayPart === "*" && monthPart === "*" && dowPart === "*") {
      return interval * 60 * 1000;
    }
  }

  // Every hour at :NN: * * * * *
  if (minPart !== "*" && !minPart.includes("/") && hourPart === "*" && dayPart === "*" && monthPart === "*" && dowPart === "*") {
    return 60 * 60 * 1000;
  }

  // Daily at HH:MM: NN NN * * *
  if (minPart !== "*" && hourPart !== "*" && !hourPart.includes("/") && dayPart === "*" && monthPart === "*" && dowPart === "*") {
    return 24 * 60 * 60 * 1000;
  }

  // Weekly on day D at HH:MM: NN NN * * D
  if (minPart !== "*" && hourPart !== "*" && dayPart === "*" && monthPart === "*" && dowPart !== "*") {
    return 7 * 24 * 60 * 60 * 1000;
  }

  return null;
}

function getNextRunTime(expr: string): Date | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const [minPart, hourPart, dayPart, monthPart, dowPart] = parts;
  const now = new Date();
  const next = new Date(now);

  // Parse minute
  if (minPart === "*") {
    next.setSeconds(0, 0);
    next.setMinutes(next.getMinutes() + 1);
  } else if (minPart.startsWith("*/")) {
    const interval = parseInt(minPart.slice(2), 10);
    const currentMin = now.getMinutes();
    const nextMin = Math.ceil((currentMin + 1) / interval) * interval;
    if (nextMin >= 60) {
      next.setHours(next.getHours() + 1);
      next.setMinutes(nextMin - 60);
    } else {
      next.setMinutes(nextMin);
    }
    next.setSeconds(0, 0);
  } else {
    const targetMin = parseInt(minPart, 10);
    next.setMinutes(targetMin);
    next.setSeconds(0, 0);
    if (next <= now) {
      next.setHours(next.getHours() + 1);
    }
  }

  // Parse hour
  if (hourPart === "*") {
    // Already handled above
  } else if (hourPart.startsWith("*/")) {
    const interval = parseInt(hourPart.slice(2), 10);
    const currentHour = now.getHours();
    const nextHour = Math.ceil((currentHour + 1) / interval) * interval;
    if (nextHour >= 24) {
      next.setDate(next.getDate() + 1);
      next.setHours(nextHour - 24);
    } else {
      next.setHours(nextHour);
    }
  } else {
    const targetHour = parseInt(hourPart, 10);
    next.setHours(targetHour);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
  }

  // Parse day of week (0=Sun, 1=Mon, ..., 6=Sat)
  if (dowPart !== "*") {
    const targetDow = parseInt(dowPart, 10);
    const currentDow = next.getDay();
    let daysAhead = targetDow - currentDow;
    if (daysAhead <= 0) daysAhead += 7;
    if (daysAhead === 0 && next <= now) daysAhead = 7;
    next.setDate(next.getDate() + daysAhead);
  }

  return next;
}

// ============================================================
// TASK EXECUTOR
// ============================================================

async function executeTask(taskId: string): Promise<void> {
  const task = await prisma.scheduledTask.findUnique({
    where: { id: taskId },
    include: { server: true },
  });
  if (!task || !task.isEnabled) return;

  const server = task.server;
  if (!server) return;

  console.log(`[Scheduler] Executing task "${task.name}" (${task.type}) for server "${server.name}"`);

  try {
    switch (task.type) {
      case "RESTART":
        if (isRunning(server.id)) {
          stopLocalServer(server.id);
          await new Promise((r) => setTimeout(r, 1000));
        }
        await prisma.server.update({ where: { id: server.id }, data: { status: "STARTING" } });
        await startLocalServer(server.id, {
          name: server.name,
          software: server.software,
          mcVersion: server.mcVersion,
          ram: server.ram,
          port: server.port,
          startupCmd: server.startupCmd || undefined,
        });
        await prisma.server.update({ where: { id: server.id }, data: { status: "RUNNING" } });
        break;

      case "STOP":
        if (isRunning(server.id)) {
          await prisma.server.update({ where: { id: server.id }, data: { status: "STOPPING" } });
          stopLocalServer(server.id);
          await prisma.server.update({ where: { id: server.id }, data: { status: "STOPPED" } });
        }
        break;

      case "START":
        if (!isRunning(server.id)) {
          await prisma.server.update({ where: { id: server.id }, data: { status: "STARTING" } });
          await startLocalServer(server.id, {
            name: server.name,
            software: server.software,
            mcVersion: server.mcVersion,
            ram: server.ram,
            port: server.port,
            startupCmd: server.startupCmd || undefined,
          });
          await prisma.server.update({ where: { id: server.id }, data: { status: "RUNNING" } });
        }
        break;

      case "COMMAND":
        if (task.command && isRunning(server.id)) {
          sendLocalCommand(server.id, task.command);
        }
        break;

      case "BACKUP": {
        const serverDir = path.resolve(
          process.env.SERVERS_DIR || path.join(__dirname, "../../servers"),
          server.id
        );
        const backupsDir = path.join(serverDir, "backups");
        fs.mkdirSync(backupsDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const backupName = `scheduled-${task.name}-${timestamp}`;
        const backupPath = path.join(backupsDir, backupName);
        fs.mkdirSync(backupPath, { recursive: true });

        let totalSize = 0;
        const filesToBackup = [
          "server.properties",
          "eula.txt",
          "start.sh",
          "start.bat",
          "velocity.toml",
          "config.yml",
        ];
        for (const file of filesToBackup) {
          const src = path.join(serverDir, file);
          if (fs.existsSync(src)) {
            totalSize += fs.statSync(src).size;
            fs.copyFileSync(src, path.join(backupPath, file));
          }
        }

        await prisma.backup.create({
          data: {
            serverId: server.id,
            name: backupName,
            size: totalSize,
            status: "COMPLETED",
          },
        });
        break;
      }
    }

    const now = new Date();
    const interval = parseCronInterval(task.cronExpr);
    const nextRun = interval ? new Date(now.getTime() + interval) : getNextRunTime(task.cronExpr);

    await prisma.scheduledTask.update({
      where: { id: task.id },
      data: { lastRunAt: now, nextRunAt: nextRun },
    });

    console.log(`[Scheduler] Task "${task.name}" completed. Next run: ${nextRun?.toISOString()}`);
  } catch (error: any) {
    console.error(`[Scheduler] Task "${task.name}" failed:`, error.message);
  }
}

// ============================================================
// SCHEDULER INTERVAL CHECKER
// ============================================================

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

async function checkScheduledTasks(): Promise<void> {
  try {
    const enabledTasks = await prisma.scheduledTask.findMany({
      where: { isEnabled: true },
    });

    const now = new Date();

    for (const task of enabledTasks) {
      const shouldRun =
        !task.nextRunAt || task.nextRunAt <= now || !task.lastRunAt;

      if (shouldRun) {
        executeTask(task.id).catch((err) => {
          console.error(`[Scheduler] Background execution error for task "${task.name}":`, err.message);
        });
      }
    }
  } catch (error: any) {
    console.error("[Scheduler] Check error:", error.message);
  }
}

export function startScheduler(): void {
  if (schedulerInterval) return;
  console.log("[Scheduler] Starting scheduler (checking every 30 seconds)");
  schedulerInterval = setInterval(checkScheduledTasks, 30 * 1000);
  // Run once immediately
  checkScheduledTasks();
}

// ============================================================
// ROUTES
// ============================================================

// GET /api/schedules - list all schedules across all user's servers (global view)
router.get("/schedules", authenticate, async (_req: Request, res: Response) => {
  try {
    const where = _req.user!.role === "ADMIN"
      ? {}
      : { server: { userId: _req.user!.userId } };

    const tasks = await prisma.scheduledTask.findMany({
      where,
      include: { server: { select: { id: true, name: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });

    return res.json(tasks);
  } catch (error) {
    console.error("Get all schedules error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/servers/:serverId/schedules - list all scheduled tasks for a server
router.get("/servers/:serverId/schedules", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "serverId") } });
    if (!server) return res.status(404).json({ error: "Server not found" });

    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const tasks = await prisma.scheduledTask.findMany({
      where: { serverId: server.id },
      orderBy: { createdAt: "desc" },
    });

    return res.json(tasks);
  } catch (error) {
    console.error("Get schedules error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/servers/:serverId/schedules - create a scheduled task
router.post("/servers/:serverId/schedules", authenticate, async (req: Request, res: Response) => {
  try {
    const { name, type, command, cronExpr, isEnabled } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Task name is required" });
    }

    const validTypes = ["RESTART", "STOP", "START", "COMMAND", "BACKUP"];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid task type. Must be one of: ${validTypes.join(", ")}` });
    }

    if (!cronExpr || !cronExpr.trim()) {
      return res.status(400).json({ error: "Cron expression is required" });
    }

    if (parseCronInterval(cronExpr) === null && getNextRunTime(cronExpr) === null) {
      return res.status(400).json({ error: "Invalid cron expression" });
    }

    if (type === "COMMAND" && (!command || !command.trim())) {
      return res.status(400).json({ error: "Command is required for COMMAND type tasks" });
    }

    const server = await prisma.server.findUnique({ where: { id: param(req, "serverId") } });
    if (!server) return res.status(404).json({ error: "Server not found" });

    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const nextRun = getNextRunTime(cronExpr);

    const task = await prisma.scheduledTask.create({
      data: {
        serverId: server.id,
        name: name.trim(),
        type,
        command: command || null,
        cronExpr: cronExpr.trim(),
        isEnabled: isEnabled !== false,
        nextRunAt: nextRun,
      },
    });

    return res.status(201).json(task);
  } catch (error) {
    console.error("Create schedule error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/servers/:serverId/schedules/:taskId - update a task
router.put("/servers/:serverId/schedules/:taskId", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "serverId") } });
    if (!server) return res.status(404).json({ error: "Server not found" });

    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const existing = await prisma.scheduledTask.findUnique({ where: { id: param(req, "taskId") } });
    if (!existing || existing.serverId !== server.id) {
      return res.status(404).json({ error: "Scheduled task not found" });
    }

    const { name, type, command, cronExpr, isEnabled } = req.body;
    const validTypes = ["RESTART", "STOP", "START", "COMMAND", "BACKUP"];

    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid task type. Must be one of: ${validTypes.join(", ")}` });
    }

    if (cronExpr) {
      if (parseCronInterval(cronExpr) === null && getNextRunTime(cronExpr) === null) {
        return res.status(400).json({ error: "Invalid cron expression" });
      }
    }

    const newType = type || existing.type;
    if (newType === "COMMAND" && command !== undefined && (!command || !command.trim())) {
      return res.status(400).json({ error: "Command is required for COMMAND type tasks" });
    }

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (type !== undefined) updateData.type = type;
    if (command !== undefined) updateData.command = command || null;
    if (cronExpr !== undefined) {
      updateData.cronExpr = cronExpr.trim();
      updateData.nextRunAt = getNextRunTime(cronExpr);
    }
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;

    const updated = await prisma.scheduledTask.update({
      where: { id: param(req, "taskId") },
      data: updateData,
    });

    return res.json(updated);
  } catch (error) {
    console.error("Update schedule error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/servers/:serverId/schedules/:taskId - delete a task
router.delete("/servers/:serverId/schedules/:taskId", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "serverId") } });
    if (!server) return res.status(404).json({ error: "Server not found" });

    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const existing = await prisma.scheduledTask.findUnique({ where: { id: param(req, "taskId") } });
    if (!existing || existing.serverId !== server.id) {
      return res.status(404).json({ error: "Scheduled task not found" });
    }

    await prisma.scheduledTask.delete({ where: { id: param(req, "taskId") } });
    return res.json({ message: "Deleted" });
  } catch (error) {
    console.error("Delete schedule error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/servers/:serverId/schedules/:taskId/run - manually trigger a task now
router.post("/servers/:serverId/schedules/:taskId/run", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "serverId") } });
    if (!server) return res.status(404).json({ error: "Server not found" });

    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const existing = await prisma.scheduledTask.findUnique({ where: { id: param(req, "taskId") } });
    if (!existing || existing.serverId !== server.id) {
      return res.status(404).json({ error: "Scheduled task not found" });
    }

    // Execute in background
    executeTask(existing.id).catch((err) => {
      console.error(`[Scheduler] Manual execution error for task "${existing.name}":`, err.message);
    });

    return res.json({ message: `Task "${existing.name}" triggered` });
  } catch (error) {
    console.error("Run schedule error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
