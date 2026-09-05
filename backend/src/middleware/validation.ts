import { z } from "zod";
import { Request, Response, NextFunction } from "express";

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}

// Branding validation schemas
export const brandingUpdateSchema = z.object({
  panelName: z.string().min(1).max(100).optional(),
  companyName: z.string().max(200).optional(),
  shortName: z.string().max(50).optional(),
  tagline: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  copyrightText: z.string().max(200).optional(),
  supportName: z.string().max(100).optional(),
  supportUrl: z.string().url().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  statusPageUrl: z.string().url().optional().or(z.literal("")),
  documentationUrl: z.string().url().optional().or(z.literal("")),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  sidebarColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  cardColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  borderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  mutedTextColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  successColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  warningColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  dangerColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  infoColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  defaultTheme: z.enum(["dark", "light", "system"]).optional(),
  allowUserThemeSwitch: z.boolean().optional(),
  bgType: z.enum(["solid", "gradient", "image", "video"]).optional(),
  bgColor1: z.string().optional(),
  bgColor2: z.string().optional(),
  bgDirection: z.string().optional(),
  bgOpacity: z.number().min(0).max(1).optional(),
  bgBlur: z.number().min(0).max(20).optional(),
  bgPosition: z.string().optional(),
  bgSize: z.string().optional(),
  bgRepeat: z.string().optional(),
  bgOverlay: z.boolean().optional(),
  fontProvider: z.string().optional(),
  headingFont: z.string().optional(),
  bodyFont: z.string().optional(),
  codeFont: z.string().optional(),
  whiteLabelMode: z.boolean().optional(),
  hidePlatformBranding: z.boolean().optional(),
  hideDeveloperCredits: z.boolean().optional(),
  customProductName: z.string().optional(),
  customSupportUrl: z.string().url().optional().or(z.literal("")),
  customDocsUrl: z.string().url().optional().or(z.literal("")),
  customCss: z.string().max(50000).optional(),
  customJs: z.string().max(50000).optional(),
  customJsEnabled: z.boolean().optional(),
  maintenanceEnabled: z.boolean().optional(),
  maintenanceTitle: z.string().max(200).optional(),
  maintenanceDescription: z.string().max(1000).optional(),
  maintenanceCountdown: z.boolean().optional(),
  maintenanceStatusUrl: z.string().url().optional().or(z.literal("")),
});

export const authBrandingSchema = z.object({
  loginTitle: z.string().max(200).optional(),
  loginDescription: z.string().max(500).optional(),
  loginBgType: z.enum(["solid", "gradient", "image"]).optional(),
  loginBgColor: z.string().optional(),
  loginBgGradient: z.string().optional(),
  loginButtonText: z.string().max(50).optional(),
  loginFooterText: z.string().max(500).optional(),
  loginSupportLink: z.string().url().optional().or(z.literal("")),
  loginTermsLink: z.string().url().optional().or(z.literal("")),
  loginPrivacyLink: z.string().url().optional().or(z.literal("")),
  registerEnabled: z.boolean().optional(),
  registerTitle: z.string().max(200).optional(),
  registerDescription: z.string().max(500).optional(),
  registerBgType: z.enum(["solid", "gradient", "image"]).optional(),
  registerBgColor: z.string().optional(),
  registerBgGradient: z.string().optional(),
  registerTermsText: z.string().max(100).optional(),
  registerPrivacyText: z.string().max(100).optional(),
  registerButtonText: z.string().max(50).optional(),
  registerSuccessMessage: z.string().max(500).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
});
