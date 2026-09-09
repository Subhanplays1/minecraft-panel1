import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import bcrypt from "bcryptjs";

const router = Router();
function param(req: Request, key: string): string { return (req.params as any)[key] || ""; }

// ============================================================
// AUDIT LOG
// ============================================================

export async function logAudit(userId: string | null, action: string, targetType?: string, targetId?: string, details?: string, ip?: string) {
  try {
    await prisma.auditLog.create({ data: { userId, action, targetType, targetId, details, ip } });
  } catch {}
}

router.get("/admin/audit", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    const total = await prisma.auditLog.count();
    return res.json({ logs, total });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// LOGIN HISTORY
// ============================================================

router.get("/admin/login-history", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    const where: any = {};
    if (userId) where.userId = userId as string;
    const logs = await prisma.loginHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return res.json(logs);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// USER MANAGEMENT
// ============================================================

router.get("/admin/users", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, name: true, role: true, banned: true, banReason: true,
        lastLoginAt: true, loginCount: true, createdAt: true, discordVerified: true,
        discordUsername: true, avatar: true, _count: { select: { servers: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/users/:id/role", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    if (!["ADMIN", "MODERATOR", "CUSTOMER"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const user = await prisma.user.update({ where: { id: param(req, "id") }, data: { role } });
    logAudit(req.user!.userId, "ROLE_CHANGE", "USER", user.id, `Role changed to ${role}`, req.ip);
    return res.json({ id: user.id, role: user.role });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/users/:id/ban", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { banned, reason } = req.body;
    const user = await prisma.user.update({
      where: { id: param(req, "id") },
      data: { banned, banReason: banned ? (reason || "Banned by admin") : null },
    });
    logAudit(req.user!.userId, banned ? "USER_SUSPEND" : "USER_UNSUSPEND", "USER", user.id, reason || "", req.ip);
    return res.json({ id: user.id, banned: user.banned });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/users/:id", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const userId = param(req, "id");
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "ADMIN") return res.status(400).json({ error: "Cannot delete admin" });
    await prisma.user.delete({ where: { id: userId } });
    logAudit(req.user!.userId, "USER_DELETE", "USER", userId, user.email, req.ip);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/users", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { email, name, password, role } = req.body;
    if (!email || !name || !password) return res.status(400).json({ error: "email, name, password required" });
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, name, password: hashedPassword, role: role || "CUSTOMER", emailVerified: true },
    });
    logAudit(req.user!.userId, "USER_CREATE", "USER", user.id, email, req.ip);
    return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (error: any) {
    if (error.code === "P2002") return res.status(400).json({ error: "Email already exists" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Impersonate
router.post("/admin/users/:id/impersonate", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: param(req, "id") } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const jwt = require("jsonwebtoken");
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || "secret", { expiresIn: "1h" });
    logAudit(req.user!.userId, "IMPERSONATE", "USER", user.id, `Impersonating ${user.email}`, req.ip);
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// SUSPENSIONS
// ============================================================

router.get("/admin/suspensions", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const suspensions = await prisma.userSuspension.findMany({
      where: { active: true },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.json(suspensions);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// REVENUE DASHBOARD
// ============================================================

router.get("/admin/revenue", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalServers = await prisma.server.count();
    const activeServers = await prisma.server.count({ where: { status: "RUNNING" } });
    const totalNodes = await prisma.node.count();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const newUsers30d = await prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } });
    const newUsers7d = await prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } });
    const newServers30d = await prisma.server.count({ where: { createdAt: { gte: thirtyDaysAgo } } });

    // Daily signups for last 30 days
    const dailySignups: Record<string, number> = {};
    const users = await prisma.user.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } });
    for (const u of users) {
      const day = u.createdAt.toISOString().split("T")[0];
      dailySignups[day] = (dailySignups[day] || 0) + 1;
    }

    // Daily server creations
    const dailyServers: Record<string, number> = {};
    const servers = await prisma.server.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } });
    for (const s of servers) {
      const day = s.createdAt.toISOString().split("T")[0];
      dailyServers[day] = (dailyServers[day] || 0) + 1;
    }

    // Total resources
    const totalRam = await prisma.server.aggregate({ _sum: { ram: true } });
    const totalDisk = await prisma.server.aggregate({ _sum: { disk: true } });

    return res.json({
      totalUsers, totalServers, activeServers, totalNodes,
      newUsers30d, newUsers7d, newServers30d,
      dailySignups, dailyServers,
      totalRamMB: totalRam._sum.ram || 0,
      totalDiskMB: totalDisk._sum.disk || 0,
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// MAINTENANCE MODE
// ============================================================

router.get("/admin/maintenance", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const setting = await prisma.setting.findFirst({ where: { group: "maintenance", key: "enabled" } });
    const message = await prisma.setting.findFirst({ where: { group: "maintenance", key: "message" } });
    return res.json({
      enabled: setting ? setting.value === "true" : false,
      message: message ? message.value : "System maintenance in progress. Please try again later.",
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/maintenance", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { enabled, message } = req.body;
    const upsert = async (key: string, value: string) => {
      const existing = await prisma.setting.findFirst({ where: { group: "maintenance", key } });
      if (existing) await prisma.setting.update({ where: { id: existing.id }, data: { value } });
      else await prisma.setting.create({ data: { group: "maintenance", key, value } });
    };
    if (enabled !== undefined) await upsert("enabled", String(enabled));
    if (message !== undefined) await upsert("message", message);
    logAudit(req.user!.userId, "MAINTENANCE_TOGGLE", "SETTINGS", undefined, `Maintenance ${enabled ? "enabled" : "disabled"}`, req.ip);
    return res.json({ enabled: enabled ?? false, message: message ?? "" });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// PLUGIN BLACKLIST
// ============================================================

router.get("/admin/plugin-blacklist", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const blacklist = await prisma.pluginBlacklist.findMany({ orderBy: { createdAt: "desc" } });
    return res.json(blacklist);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/plugin-blacklist", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { name, reason } = req.body;
    if (!name) return res.status(400).json({ error: "Plugin name required" });
    const item = await prisma.pluginBlacklist.create({ data: { name, reason, addedBy: req.user!.userId } });
    logAudit(req.user!.userId, "PLUGIN_BLACKLIST", undefined, item.id, `Blacklisted ${name}`, req.ip);
    return res.json(item);
  } catch (error: any) {
    if (error.code === "P2002") return res.status(400).json({ error: "Already blacklisted" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/plugin-blacklist/:id", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    await prisma.pluginBlacklist.delete({ where: { id: param(req, "id") } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// API KEY MANAGEMENT
// ============================================================

router.get("/admin/api-keys", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const keys = await prisma.apiKey.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.json(keys);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/api-keys", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { name, userId, expiresAt } = req.body;
    const crypto = require("crypto");
    const key = `mk_${crypto.randomBytes(24).toString("hex")}`;
    const apiKey = await prisma.apiKey.create({
      data: {
        name: name || "API Key",
        key,
        userId: userId || req.user!.userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    logAudit(req.user!.userId, "APIKEY_CREATE", "API_KEY", apiKey.id, name, req.ip);
    return res.json(apiKey);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/api-keys/:id", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    await prisma.apiKey.delete({ where: { id: param(req, "id") } });
    logAudit(req.user!.userId, "APIKEY_DELETE", "API_KEY", param(req, "id"), undefined, req.ip);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// QUOTA MANAGEMENT
// ============================================================

router.get("/admin/quotas", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const setting = await prisma.setting.findFirst({ where: { group: "limits", key: "defaults" } });
    const quotas = setting ? JSON.parse(setting.value) : {
      maxServers: 5, maxRamPerServer: 4096, maxDiskPerServer: 20480,
      maxCpuPerServer: 100, maxTotalRam: 16384, maxTotalDisk: 102400,
    };
    return res.json(quotas);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/quotas", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { maxServers, maxRamPerServer, maxDiskPerServer, maxCpuPerServer, maxTotalRam, maxTotalDisk } = req.body;
    const value = JSON.stringify({
      maxServers: maxServers || 5,
      maxRamPerServer: maxRamPerServer || 4096,
      maxDiskPerServer: maxDiskPerServer || 20480,
      maxCpuPerServer: maxCpuPerServer || 100,
      maxTotalRam: maxTotalRam || 16384,
      maxTotalDisk: maxTotalDisk || 102400,
    });
    const existing = await prisma.setting.findFirst({ where: { group: "limits", key: "defaults" } });
    if (existing) await prisma.setting.update({ where: { id: existing.id }, data: { value } });
    else await prisma.setting.create({ data: { group: "limits", key: "defaults", value } });
    logAudit(req.user!.userId, "SETTINGS_CHANGE", "SETTINGS", undefined, "Quotas updated", req.ip);
    return res.json(JSON.parse(value));
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// GOOGLE OAUTH & SMTP SETTINGS
// ============================================================

router.get("/admin/google-settings", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.setting.findMany({ where: { group: "google" } });
    const result: Record<string, string> = {};
    for (const s of settings) result[s.key] = s.value;
    return res.json(result);
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.put("/admin/google-settings", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    for (const [key, value] of Object.entries(settings)) {
      const strValue = typeof value === "string" ? value : JSON.stringify(value);
      await prisma.setting.upsert({
        where: { group_key: { group: "google", key } },
        update: { value: strValue },
        create: { group: "google", key, value: strValue },
      });
    }
    return res.json({ success: true });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/admin/smtp-settings", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.setting.findMany({ where: { group: "smtp" } });
    const result: Record<string, string> = {};
    for (const s of settings) result[s.key] = s.value;
    return res.json(result);
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.put("/admin/smtp-settings", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    for (const [key, value] of Object.entries(settings)) {
      const strValue = typeof value === "string" ? value : JSON.stringify(value);
      await prisma.setting.upsert({
        where: { group_key: { group: "smtp", key } },
        update: { value: strValue },
        create: { group: "smtp", key, value: strValue },
      });
    }
    return res.json({ success: true });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

export default router;
