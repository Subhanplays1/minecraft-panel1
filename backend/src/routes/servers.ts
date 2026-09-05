import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import path from "path";
import fs from "fs";
import https from "https";
import http from "http";
import {
  createLocalServer, startLocalServer, stopLocalServer,
  killLocalServer, sendLocalCommand, isRunning, getStartedAt,
  getServerLogs, getServerPath,
} from "../services/processManager";

const router = Router();

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : val;
}

function getServersRoot(): string {
  return path.resolve(process.env.SERVERS_DIR || path.join(__dirname, "../../servers"));
}

// ============================================================
// SERVERS
// ============================================================

router.get("/servers", authenticate, async (req: Request, res: Response) => {
  try {
    const where = req.user!.role === "ADMIN" ? {} : { userId: req.user!.userId };
    const servers = await prisma.server.findMany({
      where,
      include: { node: { select: { id: true, name: true, location: true } } },
      orderBy: { createdAt: "desc" },
    });
    // Update status based on actual process state
    const updated = await Promise.all(servers.map(async (s) => {
      const running = isRunning(s.id);
      const status = running ? "RUNNING" : s.status === "STARTING" ? "STOPPED" : s.status;
      if (status !== s.status) {
        await prisma.server.update({ where: { id: s.id }, data: { status } });
      }
      return { ...s, status };
    }));
    return res.json(updated);
  } catch (error) {
    console.error("Get servers error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/servers", authenticate, async (req: Request, res: Response) => {
  try {
    const { name, software, mcVersion, ram, cpu, disk, port, nodeId, startupCmd } = req.body;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ error: "Server name must be at least 3 characters" });
    }

    // Check name uniqueness
    const existing = await prisma.server.findFirst({ where: { name: name.trim() } });
    if (existing) {
      return res.status(400).json({ error: "A server with this name already exists" });
    }

    // Check port uniqueness
    const portUsed = await prisma.server.findFirst({ where: { port: port || 25565 } });
    if (portUsed) {
      return res.status(400).json({ error: `Port ${port || 25565} is already in use` });
    }

    // Get or create local node
    let node = nodeId ? await prisma.node.findUnique({ where: { id: nodeId } }) : await prisma.node.findFirst();
    if (!node) {
      node = await prisma.node.create({
        data: { name: "local", displayName: "Local Node", hostname: "127.0.0.1" },
      });
    }

    const server = await prisma.server.create({
      data: {
        name: name.trim(),
        userId: req.user!.userId,
        nodeId: node.id,
        software: software || "paper",
        mcVersion: mcVersion || "1.21.4",
        javaVersion: "21",
        ram: ram || 2048,
        cpu: cpu || 100,
        disk: disk || 10240,
        port: port || 25565,
        ip: "127.0.0.1",
        status: "INSTALLING",
        startupCmd: startupCmd || null,
      },
    });

    // Create local server files in background
    createLocalServer({
      id: server.id,
      name: server.name,
      software: server.software,
      mcVersion: server.mcVersion,
      ram: server.ram,
      port: server.port,
    }).then(async () => {
      await prisma.server.update({ where: { id: server.id }, data: { status: "STOPPED" } });
    }).catch((err) => {
      console.error("CreateLocalServer error:", err);
    });

    return res.status(201).json(server);
  } catch (error) {
    console.error("Create server error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/servers/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({
      where: { id: param(req, "id") },
      include: { node: { select: { id: true, name: true, location: true, hostname: true } } },
    });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    // Update status
    const running = isRunning(server.id);
    const status = running ? "RUNNING" : server.status === "STARTING" ? "STOPPED" : server.status;
    return res.json({ ...server, status });
  } catch (error) {
    console.error("Get server error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/servers/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const updated = await prisma.server.update({ where: { id: param(req, "id") }, data: req.body });
    return res.json(updated);
  } catch (error) {
    console.error("Update server error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/servers/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    // Stop process if running
    killLocalServer(server.id);
    // Remove server directory
    const serverDir = getServerPath(server.id);
    if (fs.existsSync(serverDir)) {
      fs.rmSync(serverDir, { recursive: true, force: true });
    }
    await prisma.server.delete({ where: { id: param(req, "id") } });
    return res.json({ message: "Deleted" });
  } catch (error) {
    console.error("Delete server error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// SERVER ACTIONS
// ============================================================

router.post("/servers/:id/start", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    if (isRunning(server.id)) {
      return res.json({ message: "Server is already running" });
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
    return res.json({ message: "Server started" });
  } catch (error: any) {
    console.error("Start server error:", error);
    await prisma.server.update({ where: { id: param(req, "id") }, data: { status: "ERROR" } }).catch(() => {});
    return res.status(500).json({ error: error.message || "Failed to start server" });
  }
});

router.post("/servers/:id/stop", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });

    await prisma.server.update({ where: { id: server.id }, data: { status: "STOPPING" } });
    stopLocalServer(server.id);
    await prisma.server.update({ where: { id: server.id }, data: { status: "STOPPED" } });
    return res.json({ message: "Server stopped" });
  } catch (error) {
    console.error("Stop server error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/servers/:id/restart", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });

    stopLocalServer(server.id);
    await new Promise((r) => setTimeout(r, 1000));

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
    return res.json({ message: "Server restarted" });
  } catch (error: any) {
    console.error("Restart server error:", error);
    await prisma.server.update({ where: { id: param(req, "id") }, data: { status: "ERROR" } }).catch(() => {});
    return res.status(500).json({ error: error.message || "Failed to restart" });
  }
});

// ============================================================
// CONSOLE
// ============================================================

router.get("/servers/:id/console", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    const logs = getServerLogs(server.id);
    return res.json({ logs });
  } catch (error) {
    console.error("Get console error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/servers/:id/command", authenticate, async (req: Request, res: Response) => {
  try {
    const { command } = req.body;
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (!isRunning(server.id)) return res.status(400).json({ error: "Server is not running" });
    sendLocalCommand(server.id, command);
    return res.json({ response: `Command sent: ${command}` });
  } catch (error) {
    console.error("Send command error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// FILES
// ============================================================

router.get("/servers/:id/files", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const serverDir = getServerPath(server.id);
    const subpath = (req.query.path as string) || "";
    const fullPath = path.join(serverDir, subpath);

    if (!fullPath.startsWith(serverDir)) return res.status(403).json({ error: "Access denied" });
    if (!fs.existsSync(fullPath)) return res.json({ files: [], path: subpath || "/" });

    const items = fs.readdirSync(fullPath, { withFileTypes: true }).map((item) => ({
      name: item.name,
      isDirectory: item.isDirectory(),
      size: item.isDirectory() ? 0 : fs.statSync(path.join(fullPath, item.name)).size,
    }));

    return res.json({ files: items, path: subpath || "/" });
  } catch (error) {
    console.error("List files error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/servers/:id/file", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const serverDir = getServerPath(server.id);
    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).json({ error: "No path" });

    const fullPath = path.join(serverDir, filePath);
    if (!fullPath.startsWith(serverDir)) return res.status(403).json({ error: "Access denied" });
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: "File not found" });

    const content = fs.readFileSync(fullPath, "utf-8");
    return res.json({ content, path: filePath });
  } catch (error) {
    console.error("Read file error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// NODES
// ============================================================

router.get("/nodes", authenticate, async (_req: Request, res: Response) => {
  try {
    const nodes = await prisma.node.findMany({ orderBy: { createdAt: "desc" } });
    return res.json(nodes);
  } catch (error) {
    console.error("Get nodes error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/nodes", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { name, displayName, description, hostname, port, scheme, location, token, maxServers, totalRam, totalDisk, isVisible, isOnline } = req.body;
    const node = await prisma.node.create({
      data: {
        name, displayName: displayName || name, description: description || null,
        hostname: hostname || "127.0.0.1", port: port || 8080, scheme: scheme || "http",
        location: location || "Local", token: token || null,
        maxServers: maxServers || 50, totalRam: totalRam || 32768, totalDisk: totalDisk || 512000,
        isVisible: isVisible !== false, isOnline: isOnline !== false,
      },
    });
    return res.status(201).json(node);
  } catch (error) {
    console.error("Create node error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/nodes/:id", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const node = await prisma.node.update({ where: { id: param(req, "id") }, data: req.body });
    return res.json(node);
  } catch (error) {
    console.error("Update node error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/nodes/:id", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    await prisma.node.delete({ where: { id: param(req, "id") } });
    return res.json({ message: "Deleted" });
  } catch (error) {
    console.error("Delete node error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// BACKUPS
// ============================================================

router.get("/backups", authenticate, async (req: Request, res: Response) => {
  try {
    const where = req.user!.role === "ADMIN" ? {} : { server: { userId: req.user!.userId } };
    const backups = await prisma.backup.findMany({
      where,
      include: { server: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.json(backups);
  } catch (error) {
    console.error("Get backups error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/backups", authenticate, async (req: Request, res: Response) => {
  try {
    const { serverId } = req.body;
    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const serverDir = getServerPath(server.id);
    const backupsDir = path.join(serverDir, "backups");
    fs.mkdirSync(backupsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupName = `backup-${timestamp}`;
    const backupPath = path.join(backupsDir, backupName);

    fs.mkdirSync(backupPath, { recursive: true });
    let totalSize = 0;
    const filesToBackup = ["server.properties", "eula.txt", "start.sh", "start.bat", "velocity.toml", "config.yml"];
    for (const file of filesToBackup) {
      const src = path.join(serverDir, file);
      if (fs.existsSync(src)) { totalSize += fs.statSync(src).size; fs.copyFileSync(src, path.join(backupPath, file)); }
    }

    const backup = await prisma.backup.create({
      data: { serverId, name: backupName, size: totalSize, status: "COMPLETED" },
    });
    return res.status(201).json(backup);
  } catch (error) {
    console.error("Create backup error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/backups/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const backup = await prisma.backup.findUnique({ where: { id: param(req, "id") }, include: { server: true } });
    if (!backup) return res.status(404).json({ error: "Backup not found" });
    const backupDir = path.join(getServerPath(backup.server.id), "backups", backup.name);
    if (fs.existsSync(backupDir)) fs.rmSync(backupDir, { recursive: true, force: true });
    await prisma.backup.delete({ where: { id: param(req, "id") } });
    return res.json({ message: "Deleted" });
  } catch (error) {
    console.error("Delete backup error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// ADMIN
// ============================================================

router.get("/admin/users", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, banned: true, createdAt: true, lastLoginAt: true, loginCount: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/users/:id", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { role, banned, banReason } = req.body;
    const updated = await prisma.user.update({
      where: { id: param(req, "id") },
      data: { role, banned, banReason },
      select: { id: true, email: true, name: true, role: true, banned: true },
    });
    return res.json(updated);
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// VERSIONS - Fetch available versions for each software
// ============================================================

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, { headers: { "User-Agent": "MinecraftPanel/1.0" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJson(res.headers.location!).then(resolve).catch(reject);
      }
      let data = "";
      res.on("data", (chunk: Buffer) => (data += chunk.toString()));
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch { reject(new Error("Invalid JSON")); } });
    });
    req.on("error", reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

router.get("/versions/:software", authenticate, async (req: Request, res: Response) => {
  try {
    const software = String(req.params.software || "paper").toUpperCase();
    let versions: string[] = [];

    const semverSort = (a: string, b: string) => {
      const pa = a.replace(/-.*$/, "").split(".").map(Number);
      const pb = b.replace(/-.*$/, "").split(".").map(Number);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na !== nb) return na - nb;
      }
      return 0;
    };

    switch (software) {
      case "PAPER":
      case "SPIGOT":
      case "BUKKIT": {
        const data = await fetchJson("https://fill.papermc.io/v3/projects/paper");
        const groups: Record<string, string[]> = data.versions || {};
        versions = Object.values(groups).flat()
          .filter((v) => !v.includes("-rc") && !v.includes("-pre") && !v.includes("-alpha") && !v.includes("-beta"))
          .sort(semverSort)
          .reverse();
        break;
      }
      case "PURPUR": {
        const data = await fetchJson("https://api.purpurmc.org/v2/purpur");
        versions = (data.versions || []).sort(semverSort).reverse();
        break;
      }
      case "VELOCITY": {
        const data = await fetchJson("https://fill.papermc.io/v3/projects/velocity");
        const groups: Record<string, string[]> = data.versions || {};
        versions = Object.values(groups).flat()
          .filter((v) => !v.includes("-rc") && !v.includes("-pre") && !v.includes("-alpha") && !v.includes("-beta"))
          .sort(semverSort)
          .reverse();
        break;
      }
      case "WATERFALL":
      case "BUNGEECORD": {
        const data = await fetchJson("https://fill.papermc.io/v3/projects/waterfall");
        const groups: Record<string, string[]> = data.versions || {};
        versions = Object.values(groups).flat()
          .filter((v) => !v.includes("-rc") && !v.includes("-pre") && !v.includes("-alpha") && !v.includes("-beta"))
          .sort(semverSort)
          .reverse();
        break;
      }
      case "FABRIC": {
        const data = await fetchJson("https://meta.fabricmc.net/v2/versions/game");
        versions = data.filter((v: any) => v.stable).map((v: any) => v.version).sort(semverSort).reverse();
        if (versions.length === 0) versions = data.map((v: any) => v.version).sort(semverSort).reverse();
        break;
      }
      case "FORGE":
      case "NEOFORGE":
      case "QUILT": {
        const data = await fetchJson("https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json");
        const promos = data.promos || {};
        versions = Object.keys(promos).filter((k) => k.includes("recommended")).sort(semverSort).reverse();
        if (versions.length === 0) versions = Object.keys(promos).sort(semverSort).reverse();
        break;
      }
      default:
        versions = ["latest"];
    }

    return res.json({ software, versions: ["latest", ...versions.filter((v) => v !== "latest")] });
  } catch (error: any) {
    console.error("Get versions error:", error);
    return res.json({ software: req.params.software, versions: ["latest"] });
  }
});

router.get("/admin/stats", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const [userCount, serverCount, runningServers, stoppedServers, errorServers, nodeCount, onlineNodes] = await Promise.all([
      prisma.user.count(),
      prisma.server.count(),
      prisma.server.count({ where: { status: "RUNNING" } }),
      prisma.server.count({ where: { status: "STOPPED" } }),
      prisma.server.count({ where: { status: "ERROR" } }),
      prisma.node.count(),
      prisma.node.count({ where: { isOnline: true } }),
    ]);
    const totalRam = await prisma.server.aggregate({ _sum: { ram: true } });
    const totalDisk = await prisma.server.aggregate({ _sum: { disk: true } });
    const recentServers = await prisma.server.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, name: true, status: true, createdAt: true } });
    const recentUsers = await prisma.user.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, createdAt: true } });
    return res.json({
      userCount, serverCount, runningServers, stoppedServers, errorServers,
      nodeCount, onlineNodes,
      totalRam: totalRam._sum.ram || 0, totalDisk: totalDisk._sum.disk || 0,
      recentServers, recentUsers,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
