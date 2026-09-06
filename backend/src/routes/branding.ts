import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate, brandingUpdateSchema, authBrandingSchema } from "../middleware/validation";
import { settings } from "../services/settings";
import { upload, optimizeImage } from "../services/upload";
import { prisma } from "../utils/prisma";

const router = Router();

// Helper to safely extract route params as strings
function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : val;
}

// GET /api/branding/public - Public settings (no auth required)
router.get("/public", async (_req: Request, res: Response) => {
  try {
    const publicSettings = await settings.getPublicSettings();
    return res.json(publicSettings);
  } catch (error) {
    console.error("Get public settings error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/branding - Get full branding (admin only)
router.get("/", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const branding = await settings.getBranding();
    return res.json(branding);
  } catch (error) {
    console.error("Get branding error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/branding - Update branding (admin only)
router.put("/", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { id, tenantId, createdAt, updatedAt, ...raw } = req.body;
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (key === "maintenanceBypassIps") {
        if (Array.isArray(value)) data[key] = value;
      } else {
        data[key] = value;
      }
    }
    const updated = await settings.updateBranding(data);
    return res.json(updated);
  } catch (error: any) {
    console.error("Update branding error:", error.message || error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// POST /api/branding/logo - Upload main logo
router.post("/logo", authenticate, authorize("ADMIN"), upload.single("logo"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = await optimizeImage(req.file.path, { width: 400, quality: 85 });
    const relativePath = filePath.replace(/\\/g, "/").replace(/^\.\//, "");

    const updated = await settings.updateBranding({ mainLogo: relativePath });
    return res.json({ logo: updated.mainLogo });
  } catch (error) {
    console.error("Upload logo error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/branding/logo-small - Upload small logo
router.post("/logo-small", authenticate, authorize("ADMIN"), upload.single("logo"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = await optimizeImage(req.file.path, { width: 100, quality: 85 });
    const relativePath = filePath.replace(/\\/g, "/").replace(/^\.\//, "");

    const updated = await settings.updateBranding({ smallLogo: relativePath });
    return res.json({ logo: updated.smallLogo });
  } catch (error) {
    console.error("Upload small logo error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/branding/favicon - Upload favicon
router.post("/favicon", authenticate, authorize("ADMIN"), upload.single("favicon"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const relativePath = req.file.path.replace(/\\/g, "/").replace(/^\.\//, "");

    const updated = await settings.updateBranding({ favicon: relativePath });
    return res.json({ favicon: updated.favicon });
  } catch (error) {
    console.error("Upload favicon error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/branding/login-logo - Upload login logo
router.post("/login-logo", authenticate, authorize("ADMIN"), upload.single("logo"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = await optimizeImage(req.file.path, { width: 300, quality: 85 });
    const relativePath = filePath.replace(/\\/g, "/").replace(/^\.\//, "");

    const updated = await settings.updateBranding({ loginLogo: relativePath });
    return res.json({ logo: updated.loginLogo });
  } catch (error) {
    console.error("Upload login logo error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/branding/background - Upload background image
router.post("/background", authenticate, authorize("ADMIN"), upload.single("background"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const relativePath = req.file.path.replace(/\\/g, "/").replace(/^\.\//, "");

    const updated = await settings.updateBranding({ bgImage: relativePath });
    return res.json({ bgImage: updated.bgImage });
  } catch (error) {
    console.error("Upload background error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/branding/video - Upload video background
router.post("/video", authenticate, authorize("ADMIN"), upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const relativePath = req.file.path.replace(/\\/g, "/").replace(/^\.\//, "");

    const updated = await settings.updateBranding({ bgVideo: relativePath });
    return res.json({ bgVideo: updated.bgVideo });
  } catch (error) {
    console.error("Upload video error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/branding/font - Upload custom font
router.post("/font", authenticate, authorize("ADMIN"), upload.single("font"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const relativePath = req.file.path.replace(/\\/g, "/").replace(/^\.\//, "");
    const fontName = req.body.name || "Custom Font";

    const updated = await settings.updateBranding({
      customFontUrl: relativePath,
      customFontName: fontName,
      fontProvider: "custom",
    });

    return res.json({ fontUrl: updated.customFontUrl, fontName: updated.customFontName });
  } catch (error) {
    console.error("Upload font error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/branding/:field - Remove a branding asset
router.delete("/:field", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const field = param(req, "field");
    const allowedFields = ["mainLogo", "smallLogo", "favicon", "loginLogo", "emailLogo", "bgImage", "bgVideo", "customFontUrl"];

    if (!allowedFields.includes(field)) {
      return res.status(400).json({ error: "Invalid field" });
    }

    const updated = await settings.updateBranding({ [field]: null });
    return res.json({ field, value: (updated as Record<string, unknown>)[field] });
  } catch (error) {
    console.error("Delete branding asset error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// AUTH BRANDING
// ============================================================

// GET /api/branding/auth
router.get("/auth", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const authBranding = await settings.getAuthBranding();
    return res.json(authBranding);
  } catch (error) {
    console.error("Get auth branding error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/branding/auth
router.put("/auth", authenticate, authorize("ADMIN"), validate(authBrandingSchema), async (req: Request, res: Response) => {
  try {
    const updated = await settings.updateAuthBranding(req.body);
    return res.json(updated);
  } catch (error) {
    console.error("Update auth branding error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/branding/auth/login-logo
router.post("/auth/login-logo", authenticate, authorize("ADMIN"), upload.single("logo"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = await optimizeImage(req.file.path, { width: 300, quality: 85 });
    const relativePath = filePath.replace(/\\/g, "/").replace(/^\.\//, "");

    const updated = await settings.updateAuthBranding({ loginLogo: relativePath });
    return res.json({ logo: updated.loginLogo });
  } catch (error) {
    console.error("Upload auth login logo error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// NAVIGATION
// ============================================================

// GET /api/branding/navigation
router.get("/navigation", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const items = await settings.getNavigation();
    return res.json(items);
  } catch (error) {
    console.error("Get navigation error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/branding/navigation
router.post("/navigation", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const item = await settings.createNavigation(req.body);
    return res.status(201).json(item);
  } catch (error) {
    console.error("Create navigation error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/branding/navigation/:id
router.put("/navigation/:id", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const item = await settings.updateNavigation(param(req, "id"), req.body);
    return res.json(item);
  } catch (error) {
    console.error("Update navigation error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/branding/navigation/:id
router.delete("/navigation/:id", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    await settings.deleteNavigation(param(req, "id"));
    return res.json({ message: "Deleted" });
  } catch (error) {
    console.error("Delete navigation error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/branding/navigation/reorder
router.put("/navigation/reorder", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    await settings.reorderNavigation(req.body.items);
    return res.json({ message: "Reordered" });
  } catch (error) {
    console.error("Reorder navigation error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// DASHBOARD WIDGETS
// ============================================================

// GET /api/branding/widgets
router.get("/widgets", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const role = req.query.role as string | undefined;
    const widgets = await settings.getWidgets("default", role);
    return res.json(widgets);
  } catch (error) {
    console.error("Get widgets error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/branding/widgets/:id
router.put("/widgets/:id", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const widget = await settings.updateWidget(param(req, "id"), req.body);
    return res.json(widget);
  } catch (error) {
    console.error("Update widget error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/branding/widgets/reorder
router.put("/widgets/reorder", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    await settings.reorderWidgets(req.body.items);
    return res.json({ message: "Reordered" });
  } catch (error) {
    console.error("Reorder widgets error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// SOCIAL LINKS
// ============================================================

// GET /api/branding/social
router.get("/social", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const links = await settings.getSocialLinks();
    return res.json(links);
  } catch (error) {
    console.error("Get social links error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/branding/social
router.post("/social", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const link = await settings.createSocialLink(req.body);
    return res.status(201).json(link);
  } catch (error) {
    console.error("Create social link error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/branding/social/:id
router.put("/social/:id", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const link = await settings.updateSocialLink(param(req, "id"), req.body);
    return res.json(link);
  } catch (error) {
    console.error("Update social link error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/branding/social/:id
router.delete("/social/:id", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    await settings.deleteSocialLink(param(req, "id"));
    return res.json({ message: "Deleted" });
  } catch (error) {
    console.error("Delete social link error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// ANNOUNCEMENTS
// ============================================================

// GET /api/branding/announcements
router.get("/announcements", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const items = await settings.getAnnouncements();
    return res.json(items);
  } catch (error) {
    console.error("Get announcements error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/branding/announcements
router.post("/announcements", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const item = await settings.createAnnouncement(req.body);
    return res.status(201).json(item);
  } catch (error) {
    console.error("Create announcement error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/branding/announcements/:id
router.put("/announcements/:id", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const item = await settings.updateAnnouncement(param(req, "id"), req.body);
    return res.json(item);
  } catch (error) {
    console.error("Update announcement error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/branding/announcements/:id
router.delete("/announcements/:id", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    await settings.deleteAnnouncement(param(req, "id"));
    return res.json({ message: "Deleted" });
  } catch (error) {
    console.error("Delete announcement error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// FEATURE FLAGS
// ============================================================

// GET /api/branding/features
router.get("/features", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const features = await settings.getFeatures();
    return res.json(features);
  } catch (error) {
    console.error("Get features error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/branding/features/:key
router.put("/features/:key", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { isEnabled } = req.body;
    const feature = await settings.setFeature(param(req, "key"), isEnabled);
    return res.json(feature);
  } catch (error) {
    console.error("Update feature error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// ERROR PAGES
// ============================================================

// GET /api/branding/error-pages/:code
router.get("/error-pages/:code", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const page = await settings.getErrorPage(parseInt(param(req, "code")));
    return res.json(page || { statusCode: parseInt(param(req, "code")), title: "Error", description: "Something went wrong" });
  } catch (error) {
    console.error("Get error page error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/branding/error-pages/:code
router.put("/error-pages/:code", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const page = await settings.upsertErrorPage(parseInt(param(req, "code")), req.body);
    return res.json(page);
  } catch (error) {
    console.error("Update error page error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// EMAIL SETTINGS
// ============================================================

// GET /api/branding/email
router.get("/email", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const emailSettings = await settings.getEmailSettings();
    return res.json(emailSettings);
  } catch (error) {
    console.error("Get email settings error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/branding/email
router.put("/email", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const updated = await settings.updateEmailSettings(req.body);
    return res.json(updated);
  } catch (error) {
    console.error("Update email settings error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/branding/email/templates
router.get("/email/templates", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const templates = await settings.getEmailTemplates();
    return res.json(templates);
  } catch (error) {
    console.error("Get email templates error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/branding/email/templates/:key
router.put("/email/templates/:key", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const template = await settings.upsertEmailTemplate(param(req, "key"), req.body);
    return res.json(template);
  } catch (error) {
    console.error("Update email template error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// OAUTH PROVIDERS
// ============================================================

// GET /api/branding/oauth
router.get("/oauth", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const providers = await settings.getOAuthProviders();
    return res.json(providers);
  } catch (error) {
    console.error("Get OAuth providers error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/branding/oauth/:name
router.put("/oauth/:name", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const provider = await settings.updateOAuthProvider(param(req, "name"), req.body);
    return res.json(provider);
  } catch (error) {
    console.error("Update OAuth provider error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// FOOTER
// ============================================================

// GET /api/branding/footer
router.get("/footer", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const footer = await settings.getFooter();
    return res.json(footer);
  } catch (error) {
    console.error("Get footer error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/branding/footer
router.put("/footer", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const updated = await settings.updateFooter(req.body);
    return res.json(updated);
  } catch (error) {
    console.error("Update footer error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// BRAND PRESETS
// ============================================================

// GET /api/branding/presets
router.get("/presets", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const presets = await settings.getPresets();
    return res.json(presets);
  } catch (error) {
    console.error("Get presets error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/branding/presets
router.post("/presets", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const branding = await settings.getBranding();
    const preset = await settings.createPreset(name, branding as unknown as Record<string, unknown>);
    return res.status(201).json(preset);
  } catch (error) {
    console.error("Create preset error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/branding/presets/:id/apply
router.post("/presets/:id/apply", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const preset = await prisma.brandPreset.findUnique({ where: { id: param(req, "id") } });
    if (!preset) {
      return res.status(404).json({ error: "Preset not found" });
    }
    const updated = await settings.updateBranding(JSON.parse(preset.data) as Record<string, unknown>);
    return res.json(updated);
  } catch (error) {
    console.error("Apply preset error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/branding/presets/:id
router.delete("/presets/:id", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    await settings.deletePreset(param(req, "id"));
    return res.json({ message: "Deleted" });
  } catch (error) {
    console.error("Delete preset error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/branding/export - Export all branding settings
router.post("/export", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const branding = await settings.getBranding();
    const auth = await settings.getAuthBranding();
    const nav = await settings.getNavigation();
    const social = await settings.getSocialLinks();
    const features = await settings.getFeatures();

    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      branding,
      auth,
      navigation: nav,
      socialLinks: social,
      features,
    };

    return res.json(exportData);
  } catch (error) {
    console.error("Export branding error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/branding/import - Import branding settings
router.post("/import", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { branding, auth, navigation, socialLinks, features } = req.body;

    if (branding) {
      await settings.updateBranding(branding);
    }
    if (auth) {
      await settings.updateAuthBranding(auth);
    }
    if (navigation && Array.isArray(navigation)) {
      for (const item of navigation) {
        await settings.createNavigation(item);
      }
    }
    if (socialLinks && Array.isArray(socialLinks)) {
      for (const link of socialLinks) {
        await settings.createSocialLink(link);
      }
    }
    if (features && Array.isArray(features)) {
      for (const feature of features) {
        await settings.setFeature(feature.key, feature.isEnabled);
      }
    }

    return res.json({ message: "Imported successfully" });
  } catch (error) {
    console.error("Import branding error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
