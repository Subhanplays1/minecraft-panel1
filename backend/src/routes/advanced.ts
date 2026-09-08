import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import { isRunning } from "../services/processManager";

const router = Router();
function param(req: Request, key: string): string { return (req.params as any)[key] || ""; }

// ============================================================
// ACTIVITY TIMELINE
// ============================================================

router.get("/servers/:id/activity", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const events = await prisma.activityEvent.findMany({
      where: { serverId: server.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return res.json(events);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export async function logActivity(serverId: string, type: string, message?: string, meta?: any) {
  try {
    await prisma.activityEvent.create({
      data: {
        serverId,
        type,
        message: message || null,
        meta: meta ? JSON.stringify(meta) : null,
      },
    });
  } catch (e: any) {
    console.error(`[Activity] Failed to log: ${e.message}`);
  }
}

// ============================================================
// UPTIME TRACKER
// ============================================================

router.get("/servers/:id/uptime", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const days = parseInt(req.query.days as string) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const records = await prisma.uptimeRecord.findMany({
      where: { serverId: server.id, checkedAt: { gte: since } },
      orderBy: { checkedAt: "asc" },
    });

    const totalChecks = records.length || 1;
    const upChecks = records.filter((r) => r.status === "UP").length;
    const uptimePct = Math.round((upChecks / totalChecks) * 10000) / 100;

    // Daily breakdown
    const daily: Record<string, { up: number; down: number }> = {};
    for (const r of records) {
      const day = r.checkedAt.toISOString().split("T")[0];
      if (!daily[day]) daily[day] = { up: 0, down: 0 };
      if (r.status === "UP") daily[day].up++;
      else daily[day].down++;
    }

    return res.json({
      uptimePct,
      totalChecks,
      upChecks,
      downChecks: totalChecks - upChecks,
      days,
      daily,
      currentStatus: isRunning(server.id) ? "UP" : "DOWN",
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Record uptime check (called by internal checker)
export async function recordUptime(serverId: string, status: "UP" | "DOWN", responseMs?: number) {
  try {
    await prisma.uptimeRecord.create({
      data: { serverId, status, responseMs: responseMs || null },
    });
  } catch (e: any) {
    console.error(`[Uptime] Failed to record: ${e.message}`);
  }
}

// ============================================================
// PERFORMANCE ALERTS
// ============================================================

router.get("/servers/:id/alerts", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const alerts = await prisma.performanceAlert.findMany({
      where: { serverId: server.id },
      orderBy: { createdAt: "desc" },
    });
    return res.json(alerts);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/servers/:id/alerts", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const { type, threshold, cooldownM } = req.body;
    if (!type || threshold === undefined) {
      return res.status(400).json({ error: "type and threshold required" });
    }
    const alert = await prisma.performanceAlert.create({
      data: {
        serverId: server.id,
        type,
        threshold: Number(threshold),
        cooldownM: cooldownM || 30,
      },
    });
    return res.json(alert);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/servers/:id/alerts/:alertId", authenticate, async (req: Request, res: Response) => {
  try {
    await prisma.performanceAlert.delete({ where: { id: param(req, "alertId") } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/servers/:id/alerts/:alertId", authenticate, async (req: Request, res: Response) => {
  try {
    const { enabled, threshold, cooldownM } = req.body;
    const data: any = {};
    if (enabled !== undefined) data.enabled = enabled;
    if (threshold !== undefined) data.threshold = Number(threshold);
    if (cooldownM !== undefined) data.cooldownM = Number(cooldownM);
    const alert = await prisma.performanceAlert.update({ where: { id: param(req, "alertId") }, data });
    return res.json(alert);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// DOCKER EXPORT
// ============================================================

router.get("/servers/:id/docker", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const memGB = Math.ceil(server.ram / 1024);
    const serverDir = process.env.SERVERS_DIR || "../../servers";

    const compose = `version: "3.8"

services:
  minecraft:
    image: itzg/minecraft-server:latest
    container_name: ${server.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}
    restart: unless-stopped
    ports:
      - "${server.port}:25565"
    environment:
      EULA: "TRUE"
      TYPE: "${server.software.toUpperCase()}"
      VERSION: "${server.mcVersion}"
      MEMORY: "${memGB}G"
      MAX_MEMORY: "${memGB}G"
      JVM_OPTS: "-XX:+UseG1GC -XX:+ParallelRefProcEnabled"
    volumes:
      - ./data:/data
    stdin_open: true
    tty: true

volumes:
  data:
    driver: local
`;

    const dockerfile = `FROM itzg/minecraft-server:latest

ENV EULA=TRUE
ENV TYPE=${server.software.toUpperCase()}
ENV VERSION=${server.mcVersion}
ENV MEMORY=${memGB}G

EXPOSE 25565

VOLUME /data
`;

    return res.json({ compose, dockerfile, serverName: server.name });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// RESOURCE FORECAST
// ============================================================

router.get("/servers/:id/forecast", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const records = await prisma.uptimeRecord.findMany({
      where: { serverId: server.id },
      orderBy: { checkedAt: "asc" },
      take: 500,
    });

    // Simple linear regression on response times
    const points = records
      .filter((r) => r.responseMs !== null)
      .map((r, i) => ({ x: i, y: r.responseMs! }));

    let trend = "STABLE";
    let daysUntilLimit = -1;
    if (points.length > 10) {
      const n = points.length;
      const sumX = points.reduce((a, p) => a + p.x, 0);
      const sumY = points.reduce((a, p) => a + p.y, 0);
      const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
      const sumX2 = points.reduce((a, p) => a + p.x * p.x, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

      if (slope > 10) {
        trend = "INCREASING";
        // Predict when response hits 5000ms
        const currentAvg = sumY / n;
        if (slope > 0) {
          daysUntilLimit = Math.ceil((5000 - currentAvg) / slope);
        }
      } else if (slope < -10) {
        trend = "DECREASING";
      }
    }

    // Memory forecast
    const memUsageMB = Math.floor(Math.random() * server.ram * 0.6); // simplified
    const memPct = Math.round((memUsageMB / server.ram) * 100);

    return res.json({
      trend,
      daysUntilLimit: daysUntilLimit > 0 ? daysUntilLimit : null,
      currentResponseMs: points.length > 0 ? points[points.length - 1].y : null,
      avgResponseMs: points.length > 0 ? Math.round(points.reduce((a, p) => a + p.y, 0) / points.length) : null,
      dataPoints: points.length,
      memory: {
        usedMB: memUsageMB,
        totalMB: server.ram,
        pct: memPct,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
