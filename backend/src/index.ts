import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import bcrypt from "bcryptjs";
import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { prisma } from "./utils/prisma";
import { randomBytes } from "crypto";
import authRoutes from "./routes/auth";
import twoFactorRoutes from "./routes/twoFactor";
import brandingRoutes from "./routes/branding";
import serverRoutes from "./routes/servers";
import { discordRouter, initializeDiscordBot } from "./routes/discord";
import schedulerRoutes, { startScheduler } from "./routes/scheduler";
import systemRoutes from "./routes/system";
import webhookRoutes from "./routes/webhooks";
import templateRoutes from "./routes/templates";
import serverLogRoutes from "./routes/serverLogs";
import { handleUploadError } from "./services/upload";
import { stopLocalServer, isRunning, onCrash } from "./services/processManager";
import { triggerWebhooks } from "./routes/webhooks";
import { startSftpServer, stopSftpServer } from "./services/sftpServer";
import http from "http";

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT || "3001");

// Trust proxy (required behind reverse proxies for rate limiting)
app.set("trust proxy", 1);

// Performance: compression
app.use(compression());

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});
app.use("/api/auth/login", limiter);
app.use("/api/auth/login/2fa", limiter);
app.use("/api/auth/register", limiter);
app.use("/api/auth/2fa/verify", limiter);
app.use("/api/auth/2fa/disable", limiter);

// Body parsing
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Static uploads with cache
app.use("/uploads", express.static(path.resolve(process.env.UPLOAD_DIR || "./uploads"), { maxAge: "1h" }));

// Static server files with cache
const serversDir = process.env.SERVERS_DIR || path.resolve(__dirname, "../servers");
if (!existsSync(serversDir)) mkdirSync(serversDir, { recursive: true });
app.use("/servers", express.static(serversDir, { maxAge: "1h" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/auth/2fa", twoFactorRoutes);
app.use("/api/branding", brandingRoutes);
app.use("/api/discord", discordRouter);
app.use("/api", schedulerRoutes);
app.use("/api", systemRoutes);
app.use("/api", webhookRoutes);
app.use("/api", templateRoutes);
app.use("/api", serverLogRoutes);
app.use("/api", serverRoutes);

// Upload error handling
app.use(handleUploadError);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Graceful shutdown - stop all running servers
let shuttingDown = false;
async function gracefulShutdown(signal: string) {
  if (shuttingDown) process.exit(1);
  shuttingDown = true;
  console.log(`\n[Panel] Received ${signal}. Stopping all running servers...`);

  // Force exit after 5 seconds if graceful shutdown hangs
  const forceExit = setTimeout(() => {
    console.log("[Panel] Forced exit (timeout).");
    process.exit(1);
  }, 5000);
  forceExit.unref();

  try {
    const runningServers = await prisma.server.findMany({ where: { status: "RUNNING" } });
    for (const server of runningServers) {
      try {
        if (isRunning(server.id)) {
          stopLocalServer(server.id);
          console.log(`[Panel] Stopped server: ${server.name}`);
        }
      } catch (e: any) {
        console.error(`[Panel] Failed to stop ${server.name}: ${e.message}`);
      }
    }
    // Mark all as STOPPED in DB
    await prisma.server.updateMany({ where: { status: { in: ["RUNNING", "STARTING", "STOPPING"] } }, data: { status: "STOPPED" } });
    stopSftpServer();
    console.log("[Panel] SFTP stopped.");

    // Close HTTP server
    server.close(() => {
      console.log("[Panel] HTTP server closed.");
    });

    console.log("[Panel] All servers stopped.");
  } catch (e: any) {
    console.error("[Panel] Shutdown error:", e.message);
  }
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Auto-setup database and start server
async function main() {
  try {
    console.log("Setting up database...");

    // Auto-push schema to create/update SQLite database
    try {
      execSync("npx prisma db push --skip-generate", {
        cwd: __dirname + "/..",
        stdio: "pipe",
      });
      console.log("Database schema applied");
    } catch (e) {
      // If prisma db push fails, try connecting anyway
      console.warn("Prisma db push warning, attempting connection...");
    }

    await prisma.$connect();
    console.log("Database connected");

    // Register crash detection callback
    onCrash(async (serverId, exitCode, logs) => {
      try {
        const server = await prisma.server.findUnique({ where: { id: serverId } });
        if (!server) return;
        await prisma.server.update({ where: { id: serverId }, data: { status: "CRASHED" } });
        await prisma.crashLog.create({ data: { serverId, exitCode: exitCode ?? 0, logs } });
        triggerWebhooks("server.crash", { serverId, serverName: server.name, exitCode }).catch(() => {});
        console.log(`[Panel] Server ${server.name} crashed with code ${exitCode}`);
      } catch (err: any) {
        console.error(`[Panel] Crash handler error: ${err.message}`);
      }
    });

    // Reset all servers to STOPPED on startup (they were killed when backend died)
    const resetResult = await prisma.server.updateMany({
      where: { status: { in: ["RUNNING", "STARTING", "RESTARTING"] } },
      data: { status: "STOPPED" },
    });
    if (resetResult.count > 0) {
      console.log(`[Panel] Reset ${resetResult.count} server(s) to STOPPED (backend restarted)`);
    }

    // Auto-seed default data
    await seedDefaults();

    // Initialize Discord bot
    await initializeDiscordBot();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API: http://localhost:${PORT}/api`);
      console.log(`Health: http://localhost:${PORT}/api/health`);
      startSftpServer();
      startScheduler();
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

async function seedDefaults() {
  try {
    // Create default admin user if none exists
    const adminExists = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin123", 12);
      await prisma.user.create({
        data: {
          email: "admin@example.com",
          password: hashedPassword,
          name: "Admin",
          role: "ADMIN",
          emailVerified: true,
        },
      });
      console.log("Default admin created: admin@example.com / admin123");
    }

    // Create default branding
    const brandingExists = await prisma.brandingSettings.findUnique({ where: { tenantId: "default" } });
    if (!brandingExists) {
      await prisma.brandingSettings.create({ data: { tenantId: "default" } });
      console.log("Default branding created");
    }

    // Create default auth branding
    const authExists = await prisma.authBranding.findUnique({ where: { tenantId: "default" } });
    if (!authExists) {
      await prisma.authBranding.create({ data: { tenantId: "default" } });
    }

    // Force-reset navigation to correct items
    const defaultNav = [
      { name: "Dashboard", icon: "LayoutDashboard", url: "/dashboard", section: "main", sortOrder: 0 },
      { name: "Servers", icon: "Server", url: "/servers", section: "main", sortOrder: 1 },
      { name: "Profile", icon: "User", url: "/profile", section: "main", sortOrder: 2 },
      { name: "Activity", icon: "Activity", url: "/activity", section: "main", sortOrder: 3 },
      { name: "Support", icon: "HelpCircle", url: "/support", section: "main", sortOrder: 4 },
      { name: "Users", icon: "Users", url: "/admin/users", section: "admin", sortOrder: 6 },
      { name: "Nodes", icon: "Network", url: "/admin/nodes", section: "admin", sortOrder: 7 },
      { name: "Resource Limits", icon: "Sliders", url: "/admin/limits", section: "admin", sortOrder: 8 },
      { name: "Settings", icon: "Settings", url: "/admin/settings", section: "admin", sortOrder: 9 },
    ];
    const allowedNavUrls = defaultNav.map((n) => n.url);

    // Delete old nav items not in allowed list
    const allNavItems = await prisma.navigationItem.findMany();
    for (const item of allNavItems) {
      if (!allowedNavUrls.includes(item.url)) {
        await prisma.navigationItem.delete({ where: { id: item.id } });
      }
    }

    // Ensure all required nav items exist
    for (const navItem of defaultNav) {
      const existing = await prisma.navigationItem.findFirst({ where: { url: navItem.url, tenantId: "default" } });
      if (!existing) {
        await prisma.navigationItem.create({
          data: { ...navItem, tenantId: "default", isCustom: false, isVisible: true, openNewTab: false },
        });
        console.log(`Created missing nav item: ${navItem.name}`);
      }
    }

    // Create default dashboard widgets
    const widgetCount = await prisma.dashboardWidget.count();
    if (widgetCount === 0) {
      const defaultWidgets = [
        { widgetType: "server_count", label: "Total Servers", role: "CUSTOMER", sortOrder: 0 },
        { widgetType: "online_servers", label: "Online Servers", role: "CUSTOMER", sortOrder: 1 },
        { widgetType: "cpu_usage", label: "CPU Usage", role: "CUSTOMER", sortOrder: 2 },
        { widgetType: "ram_usage", label: "RAM Usage", role: "CUSTOMER", sortOrder: 3 },
        { widgetType: "disk_usage", label: "Disk Usage", role: "CUSTOMER", sortOrder: 4 },
        { widgetType: "announcements", label: "Announcements", role: "CUSTOMER", sortOrder: 5 },
        { widgetType: "recent_servers", label: "Recent Servers", role: "CUSTOMER", sortOrder: 6 },
        { widgetType: "quick_actions", label: "Quick Actions", role: "CUSTOMER", sortOrder: 7 },
        { widgetType: "system_status", label: "System Status", role: "ADMIN", sortOrder: 0 },
        { widgetType: "user_count", label: "User Count", role: "ADMIN", sortOrder: 1 },
      ];
      for (const widget of defaultWidgets) {
        await prisma.dashboardWidget.create({
          data: { ...widget, tenantId: "default", isVisible: true },
        });
      }
    }

    // Create default feature flags
    const featureCount = await prisma.featureFlag.count();
    if (featureCount === 0) {
      const features = [
        "plugins", "mods", "backups", "billing", "marketplace",
        "discord", "oauth", "custom_css", "custom_js",
        "server_templates", "proxy_networks", "file_manager", "sftp", "api",
      ];
      for (const key of features) {
        await prisma.featureFlag.create({
          data: {
            tenantId: "default",
            key,
            name: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            isEnabled: true,
          },
        });
      }
    }

    // Create default OAuth providers
    const providerCount = await prisma.oAuthProvider.count();
    if (providerCount === 0) {
      const providers = [
        { name: "email", displayName: "Email & Password", isEnabled: true, sortOrder: 0, scopes: "[]" },
        { name: "discord", displayName: "Discord", isEnabled: false, sortOrder: 1, scopes: "[\"identify\",\"email\"]" },
        { name: "google", displayName: "Google", isEnabled: false, sortOrder: 2, scopes: "[\"openid\",\"email\",\"profile\"]" },
        { name: "github", displayName: "GitHub", isEnabled: false, sortOrder: 3, scopes: "[\"user:email\"]" },
        { name: "microsoft", displayName: "Microsoft", isEnabled: false, sortOrder: 4, scopes: "[\"openid\",\"email\",\"profile\"]" },
      ];
      for (const provider of providers) {
        await prisma.oAuthProvider.create({
          data: { ...provider, tenantId: "default" },
        });
      }
    }

    // Create default languages
    const langCount = await prisma.language.count();
    if (langCount === 0) {
      const languages = [
        { code: "en", name: "English", nativeName: "English", isDefault: true, isEnabled: true },
        { code: "es", name: "Spanish", nativeName: "Espanol", isEnabled: false },
        { code: "de", name: "German", nativeName: "Deutsch", isEnabled: false },
        { code: "fr", name: "French", nativeName: "Francais", isEnabled: false },
        { code: "ar", name: "Arabic", nativeName: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", isEnabled: false },
        { code: "ur", name: "Urdu", nativeName: "\u0627\u0631\u062f\u0648", isEnabled: false },
      ];
      for (const lang of languages) {
        await prisma.language.create({ data: lang });
      }
    }

    // Create default email settings
    const emailExists = await prisma.emailSettings.findUnique({ where: { tenantId: "default" } });
    if (!emailExists) {
      await prisma.emailSettings.create({ data: { tenantId: "default" } });
    }

    // Create default footer
    const footerExists = await prisma.footerSettings.findUnique({ where: { tenantId: "default" } });
    if (!footerExists) {
      await prisma.footerSettings.create({ data: { tenantId: "default", copyright: "\u00a9 2026 Minecraft Panel" } });
    }

    // Create default status page
    const statusExists = await prisma.statusPage.findUnique({ where: { tenantId: "default" } });
    if (!statusExists) {
      await prisma.statusPage.create({ data: { tenantId: "default" } });
    }

    // Auto-create local node
    const localNode = await prisma.node.findFirst({ where: { name: "local" } });
    if (!localNode) {
      await prisma.node.create({
        data: {
          name: "local",
          displayName: "Local Node",
          description: "Auto-created local node for this machine",
          hostname: "127.0.0.1",
          port: 8080,
          scheme: "http",
          token: randomBytes(32).toString("hex"),
          location: "Local",
          isOnline: true,
          isVisible: true,
          maxServers: 50,
          totalRam: 32768,
          totalDisk: 512000,
        },
      });
      console.log("Local node auto-created");
    }

    // Auto-create servers directory
    const serversDirSeed = process.env.SERVERS_DIR || path.resolve(__dirname, "../servers");
    if (!existsSync(serversDirSeed)) {
      mkdirSync(serversDirSeed, { recursive: true });
      console.log("Created servers directory");
    }

    // Create default error pages
    const errorPages = [
      { statusCode: 404, title: "Page Not Found", description: "The page you're looking for doesn't exist." },
      { statusCode: 403, title: "Access Denied", description: "You don't have permission to access this page." },
      { statusCode: 500, title: "Server Error", description: "Something went wrong on our end." },
      { statusCode: 503, title: "Service Unavailable", description: "The service is temporarily unavailable." },
    ];
    for (const page of errorPages) {
      const exists = await prisma.errorPage.findUnique({
        where: { tenantId_statusCode: { tenantId: "default", statusCode: page.statusCode } },
      });
      if (!exists) {
        await prisma.errorPage.create({
          data: { ...page, tenantId: "default", buttonText: "Go Home", buttonUrl: "/" },
        });
      }
    }
  } catch (error) {
    console.error("Seed error (non-fatal):", error);
  }
}

main();
