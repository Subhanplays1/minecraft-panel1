import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Default admin
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
    console.log("Created admin: admin@example.com / admin123");
  }

  // Default branding
  const brandingExists = await prisma.brandingSettings.findUnique({ where: { tenantId: "default" } });
  if (!brandingExists) {
    await prisma.brandingSettings.create({ data: { tenantId: "default" } });
    console.log("Created default branding");
  }

  // Default auth branding
  const authExists = await prisma.authBranding.findUnique({ where: { tenantId: "default" } });
  if (!authExists) {
    await prisma.authBranding.create({ data: { tenantId: "default" } });
    console.log("Created default auth branding");
  }

  // Default navigation
  const navCount = await prisma.navigationItem.count();
  if (navCount === 0) {
    const items = [
      { name: "Dashboard", icon: "LayoutDashboard", url: "/dashboard", section: "main", sortOrder: 0 },
      { name: "Servers", icon: "Server", url: "/servers", section: "main", sortOrder: 1 },
      { name: "Store", icon: "ShoppingBag", url: "/store", section: "main", sortOrder: 2 },
      { name: "Files", icon: "FolderOpen", url: "/files", section: "main", sortOrder: 3 },
      { name: "Plugins", icon: "Puzzle", url: "/plugins", section: "main", sortOrder: 4 },
      { name: "Backups", icon: "Archive", url: "/backups", section: "main", sortOrder: 5 },
      { name: "Users", icon: "Users", url: "/admin/users", section: "admin", sortOrder: 6 },
      { name: "Nodes", icon: "Network", url: "/admin/nodes", section: "admin", sortOrder: 7 },
      { name: "Settings", icon: "Settings", url: "/admin/settings", section: "admin", sortOrder: 8 },
    ];
    for (const item of items) {
      await prisma.navigationItem.create({
        data: { ...item, tenantId: "default", isCustom: false, isVisible: true, openNewTab: false },
      });
    }
    console.log("Created default navigation");
  }

  // Default widgets
  const widgetCount = await prisma.dashboardWidget.count();
  if (widgetCount === 0) {
    const widgets = [
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
    for (const widget of widgets) {
      await prisma.dashboardWidget.create({
        data: { ...widget, tenantId: "default", isVisible: true },
      });
    }
    console.log("Created default widgets");
  }

  // Default features
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
    console.log("Created default features");
  }

  // Default OAuth providers
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
    console.log("Created default OAuth providers");
  }

  // Default languages
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
    console.log("Created default languages");
  }

  // Default email settings
  const emailExists = await prisma.emailSettings.findUnique({ where: { tenantId: "default" } });
  if (!emailExists) {
    await prisma.emailSettings.create({ data: { tenantId: "default" } });
    console.log("Created default email settings");
  }

  // Default footer
  const footerExists = await prisma.footerSettings.findUnique({ where: { tenantId: "default" } });
  if (!footerExists) {
    await prisma.footerSettings.create({ data: { tenantId: "default", copyright: "\u00a9 2026 Minecraft Panel" } });
    console.log("Created default footer");
  }

  // Default error pages
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
  console.log("Created default error pages");

  // Default status page
  const statusExists = await prisma.statusPage.findUnique({ where: { tenantId: "default" } });
  if (!statusExists) {
    await prisma.statusPage.create({ data: { tenantId: "default" } });
    console.log("Created default status page");
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
