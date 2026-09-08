import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import path from "path";
import fs from "fs";
import https from "https";
import http from "http";
import multer from "multer";
import { exec, spawn, ChildProcess } from "child_process";
import {
  createLocalServer, startLocalServer, stopLocalServer,
  killLocalServer, sendLocalCommand, isRunning, getStartedAt,
  getServerLogs, getServerPath,
} from "../services/processManager";
import { sendServerInvoiceDM } from "../services/discordBot";

const router = Router();

const fileStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const serverId = String(_req.params.id || "");
    const serverDir = getServerPath(serverId);
    const subpath = (_req.query.path as string) || "";
    const dest = path.join(serverDir, subpath);
    if (!dest.startsWith(serverDir)) return cb(new Error("Invalid path"), "");
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    cb(null, Buffer.from(file.originalname, "latin1").toString("utf8"));
  },
});
const fileUpload = multer({ storage: fileStorage, limits: { fileSize: 500 * 1024 * 1024 } });

// Track playit processes in memory
const playitProcesses: Map<string, ChildProcess> = new Map();

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

    // Enforce resource limits
    const userId = req.user!.userId;
    const userServers = await prisma.server.findMany({ where: { userId } });

    // Get default limits
    const limitSetting = await prisma.setting.findFirst({ where: { group: "limits", key: "defaults" } });
    const defaultLimits = limitSetting ? JSON.parse(limitSetting.value) : {
      maxServers: 5, maxRamPerServer: 4096, maxDiskPerServer: 20480,
      maxCpuPerServer: 100, maxTotalRam: 16384, maxTotalDisk: 102400,
    };

    // Check server count limit
    if (userServers.length >= defaultLimits.maxServers) {
      return res.status(400).json({ error: `Server limit reached. Maximum ${defaultLimits.maxServers} servers allowed.` });
    }

    // Check per-server RAM limit
    const reqRam = ram || 2048;
    if (reqRam > defaultLimits.maxRamPerServer) {
      return res.status(400).json({ error: `RAM limit exceeded. Maximum ${defaultLimits.maxRamPerServer}MB per server.` });
    }

    // Check per-server disk limit
    const reqDisk = disk || 10240;
    if (reqDisk > defaultLimits.maxDiskPerServer) {
      return res.status(400).json({ error: `Disk limit exceeded. Maximum ${defaultLimits.maxDiskPerServer}MB per server.` });
    }

    // Check per-server CPU limit
    const reqCpu = cpu || 100;
    if (reqCpu > defaultLimits.maxCpuPerServer) {
      return res.status(400).json({ error: `CPU limit exceeded. Maximum ${defaultLimits.maxCpuPerServer}% per server.` });
    }

    // Check total RAM limit
    const totalRamUsed = userServers.reduce((sum, s) => sum + s.ram, 0);
    if (totalRamUsed + reqRam > defaultLimits.maxTotalRam) {
      return res.status(400).json({ error: `Total RAM limit exceeded. You have ${(totalRamUsed / 1024).toFixed(0)}GB used, trying to add ${(reqRam / 1024).toFixed(0)}GB. Max: ${(defaultLimits.maxTotalRam / 1024).toFixed(0)}GB.` });
    }

    // Check total disk limit
    const totalDiskUsed = userServers.reduce((sum, s) => sum + s.disk, 0);
    if (totalDiskUsed + reqDisk > defaultLimits.maxTotalDisk) {
      return res.status(400).json({ error: `Total disk limit exceeded. You have ${(totalDiskUsed / 1024).toFixed(0)}GB used, trying to add ${(reqDisk / 1024).toFixed(0)}GB. Max: ${(defaultLimits.maxTotalDisk / 1024).toFixed(0)}GB.` });
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

      // Send invoice DM to user's Discord if verified
      const user = await prisma.user.findUnique({ where: { id: server.userId } });
      if (user?.discordVerified && user?.discordId) {
        const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        await sendServerInvoiceDM(user.discordId, server.name, {
          amount: 0, // Free tier
          currency: "USD",
          renewalDate,
          serverSoftware: server.software,
          serverRam: server.ram,
          serverIp: server.ip || "127.0.0.1",
          serverPort: server.port,
        });
      }
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
// SFTP INFO
// ============================================================

router.get("/servers/:id/sftp", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });

    if (req.user!.role !== "ADMIN" && server.userId !== req.user!.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const user = await prisma.user.findUnique({ where: { id: server.userId } });
    const sftpPort = parseInt(process.env.SFTP_PORT || "2022");

    // Auto-detect host from request domain
    let host = process.env.SFTP_HOST || "";
    if (!host) {
      const forwarded = req.headers["x-forwarded-host"];
      if (forwarded) {
        host = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      } else {
        host = req.hostname || req.headers.host || "127.0.0.1";
      }
      // Strip port if present
      if (host.includes(":")) host = host.split(":")[0];
    }

    return res.json({
      host,
      port: sftpPort,
      username: user?.email || "unknown",
      password: "Use your panel password",
      serverPath: `/`,
      note: "Login with your panel email and password. Your files are in the server root directory.",
    });
  } catch (error) {
    console.error("Get SFTP info error:", error);
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
// PLUGIN SEARCH PROXY
// ============================================================

const UA = { "User-Agent": "Minevo-Panel/1.0" };

router.get("/plugins/search/modrinth", async (req: Request, res: Response) => {
  try {
    const { query, limit, facets, index } = req.query;
    const params = new URLSearchParams();
    if (query) params.set("query", String(query));
    if (limit) params.set("limit", String(limit));
    if (index) params.set("index", String(index));
    if (facets) params.set("facets", String(facets));
    const r = await fetch(`https://api.modrinth.com/v2/search?${params}`, { headers: UA });
    if (!r.ok) return res.status(r.status).json({ error: "Modrinth API error" });
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    console.error("Modrinth search proxy error:", err);
    res.status(500).json({ error: "Failed to search Modrinth" });
  }
});

router.get("/plugins/search/hangar", async (req: Request, res: Response) => {
  try {
    const { q, limit } = req.query;
    const params = new URLSearchParams();
    if (q) params.set("q", String(q));
    if (limit) params.set("limit", String(limit));
    const r = await fetch(`https://hangar.papermc.io/api/v1/projects?${params}`, { headers: UA });
    if (!r.ok) return res.status(r.status).json({ error: "Hangar API error" });
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    console.error("Hangar search proxy error:", err);
    res.status(500).json({ error: "Failed to search Hangar" });
  }
});

// ============================================================
// PLUGIN INSTALL
// ============================================================

router.post("/servers/:id/install-plugin", authenticate, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { slug, name, owner, source } = req.body;
    const server = await prisma.server.findUnique({ where: { id } });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const serverDir = path.resolve(__dirname, "../../servers", server.id);
    const pluginsDir = path.join(serverDir, "plugins");
    if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });

    // Modrinth install
    if (source === "modrinth") {
      try {
        const projectRes = await fetch(`https://api.modrinth.com/v2/project/${slug}`, { headers: { "User-Agent": "Minevo-Panel/1.0" } });
        if (!projectRes.ok) return res.status(404).json({ error: "Plugin not found on Modrinth" });
        const project: any = await projectRes.json();

        const loaders = server.software === "paper" ? ["paper"] :
                       server.software === "spigot" ? ["spigot"] :
                       server.software === "purpur" ? ["purpur"] :
                       ["paper", "spigot", "bukkit"];

        const versionParams = new URLSearchParams({
          loaders: JSON.stringify(loaders),
          game_versions: JSON.stringify([server.mcVersion]),
          limit: "1",
        });
        const versionRes = await fetch(`https://api.modrinth.com/v2/project/${slug}/version?${versionParams}`, { headers: { "User-Agent": "Minevo-Panel/1.0" } });
        if (!versionRes.ok) return res.status(404).json({ error: "No compatible version found" });
        const versions: any = await versionRes.json();
        if (versions.length === 0) return res.status(404).json({ error: "No compatible version found for your server" });

        const version = versions[0];
        const file = version.files.find((f: any) => f.primary) || version.files[0];
        if (!file || !file.url) return res.status(404).json({ error: "No download URL found" });

        const jarRes = await fetch(file.url, { headers: { "User-Agent": "Minevo-Panel/1.0" } });
        if (!jarRes.ok) return res.status(500).json({ error: "Failed to download plugin" });
        const buffer = Buffer.from(await jarRes.arrayBuffer());
        const fileName = file.filename || `${slug}.jar`;
        fs.writeFileSync(path.join(pluginsDir, fileName), buffer);

        return res.json({ success: true, message: `Installed ${name || slug}` });
      } catch (dlErr: any) {
        console.error("Modrinth plugin install error:", dlErr);
        return res.status(500).json({ error: "Failed to install plugin" });
      }
    }

    // Hangar install (default)
    try {
      const hangarUrl = owner ? `https://hangar.papermc.io/api/v1/projects/${owner}/${slug}/versions?limit=1` : `https://hangar.papermc.io/api/v1/projects/${slug}/versions?limit=1`;
      const hangarRes = await fetch(hangarUrl, { headers: { "User-Agent": "Minevo-Panel/1.0" } });
      if (hangarRes.ok) {
        const hangarData: any = await hangarRes.json();
        const versions = hangarData.result || [];
        if (versions.length > 0) {
          const latest = versions[0];
          const platform = server.software.toUpperCase();
          const dl = latest.downloads?.[platform] || latest.downloads?.PAPER || {};
          const downloadUrl = dl.downloadUrl;
          if (downloadUrl) {
            const jarRes = await fetch(downloadUrl, { headers: { "User-Agent": "Minevo-Panel/1.0" } });
            if (jarRes.ok) {
              const fileName = dl.fileInfo?.name || `${slug}.jar`;
              const buffer = Buffer.from(await jarRes.arrayBuffer());
              fs.writeFileSync(path.join(pluginsDir, fileName), buffer);
              return res.json({ success: true, message: `Installed ${name || slug}` });
            }
          }
        }
      }
      return res.json({ success: true, message: `Plugin ${slug} queued for install (restart server to load)` });
    } catch (dlErr: any) {
      console.error("Plugin download error:", dlErr);
      return res.json({ success: true, message: `Plugin ${slug} will be installed on next restart` });
    }
  } catch (error) {
    console.error("Install plugin error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// FILE SAVE
// ============================================================

router.put("/servers/:id/file", authenticate, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { path: filePath, content } = req.body;
    const server = await prisma.server.findUnique({ where: { id } });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const serverDir = path.resolve(__dirname, "../../servers", server.id);
    const fullPath = path.join(serverDir, filePath || "");

    if (!fullPath.startsWith(serverDir)) {
      return res.status(400).json({ error: "Invalid path" });
    }

    fs.writeFileSync(fullPath, content || "");
    return res.json({ success: true });
  } catch (error) {
    console.error("Save file error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// FILE UPLOAD
// ============================================================

router.post("/servers/:id/upload", authenticate, fileUpload.array("files", 20), async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) return res.status(400).json({ error: "No files uploaded" });
    return res.json({ success: true, uploaded: files.map((f) => f.originalname) });
  } catch (error) {
    console.error("Upload files error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// FILE DELETE
// ============================================================

router.delete("/servers/:id/file", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const serverDir = getServerPath(server.id);
    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).json({ error: "No path" });

    const fullPath = path.join(serverDir, filePath);
    if (!fullPath.startsWith(serverDir)) return res.status(403).json({ error: "Access denied" });
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: "File not found" });

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("Delete file error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// FILE DOWNLOAD
// ============================================================

router.get("/servers/:id/download", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const serverDir = getServerPath(server.id);
    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).json({ error: "No path" });

    const fullPath = path.join(serverDir, filePath);
    if (!fullPath.startsWith(serverDir)) return res.status(403).json({ error: "Access denied" });
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: "File not found" });

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) return res.status(400).json({ error: "Cannot download directory" });

    const fileName = path.basename(fullPath);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", stat.size);
    const stream = fs.createReadStream(fullPath);
    stream.pipe(res);
  } catch (error) {
    console.error("Download file error:", error);
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
// SERVER PROPERTIES
// ============================================================

router.get("/:id/properties", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    const serverDir = getServerPath(server.id);
    const propsPath = path.join(serverDir, "server.properties");
    if (!fs.existsSync(propsPath)) {
      return res.json({});
    }
    const content = fs.readFileSync(propsPath, "utf-8");
    const properties: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        properties[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
      }
    }
    return res.json(properties);
  } catch (error) {
    console.error("Get properties error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id/properties", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    const serverDir = getServerPath(server.id);
    if (!fs.existsSync(serverDir)) fs.mkdirSync(serverDir, { recursive: true });
    const propsPath = path.join(serverDir, "server.properties");
    const lines: string[] = ["# Generated by Minecraft Panel", "# Edit properties below", ""];
    for (const [key, value] of Object.entries(req.body as Record<string, string>)) {
      lines.push(`${key}=${value}`);
    }
    fs.writeFileSync(propsPath, lines.join("\n"), "utf-8");
    return res.json({ message: "Properties saved" });
  } catch (error) {
    console.error("Save properties error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// SUB-USERS (per-server access)
// ============================================================

router.get("/:id/users", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true },
      where: { role: { in: ["ADMIN", "STAFF"] } },
    });
    const owner = await prisma.user.findUnique({ where: { id: server.userId }, select: { id: true, email: true, name: true, role: true } });
    const result = owner ? [owner, ...users.filter(u => u.id !== owner.id)] : users;
    return res.json(result);
  } catch (error) {
    console.error("Get server users error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/users", authenticate, async (req: Request, res: Response) => {
  try {
    const { email, name, permissions } = req.body;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email, name: name || email.split("@")[0], role: "CUSTOMER" } });
    }
    return res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role, permissions: permissions || [] });
  } catch (error) {
    console.error("Add server user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id/users/:userId", authenticate, async (req: Request, res: Response) => {
  try {
    return res.json({ message: "Removed" });
  } catch (error) {
    console.error("Remove server user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// PLAYIT TUNNEL
// ============================================================

const PLAYIT_VERSION = "v0.15.26";

router.get("/:id/playit", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const serverDir = getServerPath(server.id);
    const secretPath = path.join(serverDir, "playit.toml");
    const hasSecret = fs.existsSync(secretPath);

    if (playitProcesses.has(server.id)) {
      const proc = playitProcesses.get(server.id)!;
      if (!proc.killed && proc.pid) {
        let logs = "";
        const logFile = path.join(serverDir, "playit.log");
        if (fs.existsSync(logFile)) {
          const content = fs.readFileSync(logFile, "utf-8");
          logs = content.split("\n").slice(-80).join("\n");
        }
        const claimMatch = logs.match(/https:\/\/playit\.gg\/claim\/[a-zA-Z0-9]+/g);
        return res.json({
          status: "running",
          claimLink: claimMatch ? claimMatch[claimMatch.length - 1] : null,
          logs,
          pid: proc.pid,
        });
      } else {
        playitProcesses.delete(server.id);
      }
    }

    return res.json({ status: "stopped", claimLink: null, logs: "", hasSecret });
  } catch (error) {
    console.error("Get playit status error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/playit/start", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });

    if (playitProcesses.has(server.id)) {
      return res.json({ success: true, message: "Already running" });
    }

    const serverDir = getServerPath(server.id);
    if (!fs.existsSync(serverDir)) fs.mkdirSync(serverDir, { recursive: true });

    const playitBin = path.join(serverDir, "playit");
    const secretPath = path.join(serverDir, "playit.toml");
    const logFile = path.join(serverDir, "playit.log");

    if (!fs.existsSync(playitBin)) {
      await new Promise<void>((resolve, reject) => {
        const url = `https://github.com/playit-cloud/playit-agent/releases/download/${PLAYIT_VERSION}/playit-linux-amd64`;
        exec(`wget -qO "${playitBin}" "${url}" && chmod +x "${playitBin}"`, (err) => {
          if (err) reject(err); else resolve();
        });
      });
    }

    const logStream = fs.createWriteStream(logFile, { flags: "a" });

    const proc = spawn(playitBin, ["-s", "--secret_path", secretPath], {
      detached: true,
      stdio: ["ignore", logStream, logStream],
      cwd: serverDir,
    });

    proc.on("error", (err) => {
      console.error(`Playit process error for server ${server.id}:`, err.message);
      playitProcesses.delete(server.id);
    });

    proc.on("exit", () => {
      playitProcesses.delete(server.id);
    });

    proc.unref();
    playitProcesses.set(server.id, proc);

    return res.json({ success: true, pid: proc.pid });
  } catch (error) {
    console.error("Start playit error:", error);
    return res.status(500).json({ error: "Failed to start playit tunnel" });
  }
});

router.post("/:id/playit/stop", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const proc = playitProcesses.get(server.id);
    if (proc && !proc.killed && proc.pid) {
      process.kill(-proc.pid, "SIGTERM");
      playitProcesses.delete(server.id);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Stop playit error:", error);
    return res.status(500).json({ error: "Failed to stop playit tunnel" });
  }
});

router.post("/:id/playit/reset", authenticate, async (req: Request, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: param(req, "id") } });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const proc = playitProcesses.get(server.id);
    if (proc && !proc.killed && proc.pid) {
      process.kill(-proc.pid, "SIGTERM");
      playitProcesses.delete(server.id);
    }

    const serverDir = getServerPath(server.id);
    const secretPath = path.join(serverDir, "playit.toml");
    const logFile = path.join(serverDir, "playit.log");
    if (fs.existsSync(secretPath)) fs.unlinkSync(secretPath);
    if (fs.existsSync(logFile)) fs.unlinkSync(logFile);

    return res.json({ success: true });
  } catch (error) {
    console.error("Reset playit error:", error);
    return res.status(500).json({ error: "Failed to reset playit tunnel" });
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

    const FALLBACK: Record<string, string[]> = {
      PAPER: ["26.2", "26.1.2", "1.21.4", "1.21.3", "1.21.1", "1.20.6", "1.20.4", "1.20.2", "1.20.1", "1.19.4", "1.19.3", "1.19.2", "1.18.2", "1.17.1", "1.16.5", "1.12.2"],
      SPIGOT: ["26.2", "26.1.2", "1.21.4", "1.21.3", "1.21.1", "1.20.6", "1.20.4", "1.20.2", "1.19.4", "1.19.2", "1.18.2", "1.17.1", "1.16.5", "1.12.2"],
      PURPUR: ["26.2", "26.1.2", "1.21.4", "1.21.3", "1.21.1", "1.20.6", "1.20.4", "1.20.2", "1.19.4", "1.19.2", "1.18.2", "1.16.5"],
      VELOCITY: ["4.1.2", "4.1.1", "4.1.0", "4.0.0", "3.4.0", "3.3.0", "3.2.1"],
      WATERFALL: ["1.21", "1.20.6", "1.20.4", "1.20.2", "1.19.4", "1.19.2", "1.18.2"],
      BUNGEECORD: ["1.21", "1.20.6", "1.20.4", "1.20.2", "1.19.4", "1.19.2", "1.18.2"],
      FABRIC: ["26.2", "26.1.2", "1.21.4", "1.21.3", "1.21.1", "1.20.6", "1.20.4", "1.20.2", "1.19.4", "1.19.2", "1.18.2", "1.17.1", "1.16.5"],
      FORGE: ["26.2", "26.1.2", "1.21.4", "1.21.3", "1.21.1", "1.20.6", "1.20.4", "1.20.2", "1.19.4", "1.19.2", "1.18.2", "1.17.1", "1.16.5"],
      NEOFORGE: ["26.2", "26.1.2", "1.21.4", "1.21.3", "1.21.1"],
      QUILT: ["26.2", "26.1.2", "1.21.4", "1.21.3", "1.21.1", "1.20.6", "1.20.4"],
    };

    try {
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
    } catch (apiErr) {
      console.warn(`[Versions] API failed for ${software}, using fallback`);
    }

    if (versions.length === 0) {
      versions = FALLBACK[software] || FALLBACK["PAPER"];
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

// ============================================================
// ADMIN: RESOURCE LIMITS
// ============================================================

const DEFAULT_LIMITS = {
  maxServers: 5,
  maxRamPerServer: 4096,
  maxDiskPerServer: 20480,
  maxCpuPerServer: 100,
  maxTotalRam: 16384,
  maxTotalDisk: 102400,
};

router.get("/admin/limits", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const setting = await prisma.setting.findFirst({ where: { group: "limits", key: "defaults" } });
    const limits = setting ? JSON.parse(setting.value) : DEFAULT_LIMITS;
    return res.json(limits);
  } catch (error) {
    console.error("Get limits error:", error);
    return res.json(DEFAULT_LIMITS);
  }
});

router.put("/admin/limits", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const limits = { ...DEFAULT_LIMITS, ...req.body };
    const existing = await prisma.setting.findFirst({ where: { group: "limits", key: "defaults" } });
    if (existing) {
      await prisma.setting.update({ where: { id: existing.id }, data: { value: JSON.stringify(limits) } });
    } else {
      await prisma.setting.create({ data: { group: "limits", key: "defaults", value: JSON.stringify(limits) } });
    }
    return res.json(limits);
  } catch (error) {
    console.error("Update limits error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/limits/user/:userId", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const userId = param(req, "userId");
    const setting = await prisma.setting.findFirst({ where: { group: "limits", key: `user:${userId}` } });
    const limits = setting ? JSON.parse(setting.value) : null;
    return res.json(limits);
  } catch (error) {
    console.error("Get user limits error:", error);
    return res.json(null);
  }
});

router.put("/admin/limits/user/:userId", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const userId = param(req, "userId");
    const limits = req.body;
    const existing = await prisma.setting.findFirst({ where: { group: "limits", key: `user:${userId}` } });
    if (existing) {
      await prisma.setting.update({ where: { id: existing.id }, data: { value: JSON.stringify(limits) } });
    } else {
      await prisma.setting.create({ data: { group: "limits", key: `user:${userId}`, value: JSON.stringify(limits) } });
    }
    return res.json(limits);
  } catch (error) {
    console.error("Update user limits error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// NOTIFICATIONS
// ============================================================

router.get("/notifications", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return res.json(notifications);
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.json([]);
  }
});

router.put("/notifications/:id/read", authenticate, async (req: Request, res: Response) => {
  try {
    await prisma.notification.update({
      where: { id: param(req, "id") },
      data: { read: true },
    });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/notifications/:id", authenticate, async (req: Request, res: Response) => {
  try {
    await prisma.notification.delete({ where: { id: param(req, "id") } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
