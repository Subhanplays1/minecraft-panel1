import { prisma } from "../utils/prisma";

const DEFAULT_TENANT = "default";

export class SettingsService {
  // ============================================================
  // GENERIC KEY-VALUE SETTINGS
  // ============================================================

  async get(group: string, key: string) {
    const setting = await prisma.setting.findUnique({
      where: { group_key: { group, key } },
    });
    return setting?.value;
  }

  async getGroup(group: string) {
    const settings = await prisma.setting.findMany({
      where: { group },
    });
    const result: Record<string, unknown> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return result;
  }

  async getPublicGroup(group: string) {
    const settings = await prisma.setting.findMany({
      where: { group, isPublic: true },
    });
    const result: Record<string, unknown> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return result;
  }

  async set(group: string, key: string, value: unknown, isPublic = false) {
    const strValue = typeof value === "string" ? value : JSON.stringify(value);
    return prisma.setting.upsert({
      where: { group_key: { group, key } },
      update: { value: strValue, isPublic },
      create: { group, key, value: strValue, isPublic },
    });
  }

  async setGroup(group: string, values: Record<string, unknown>, isPublic = false) {
    const ops = Object.entries(values).map(([key, value]) => {
      const strValue = typeof value === "string" ? value : JSON.stringify(value);
      return prisma.setting.upsert({
        where: { group_key: { group, key } },
        update: { value: strValue, isPublic },
        create: { group, key, value: strValue, isPublic },
      });
    });
    await prisma.$transaction(ops);
  }

  async delete(group: string, key: string) {
    return prisma.setting.delete({
      where: { group_key: { group, key } },
    });
  }

  // ============================================================
  // BRANDING SETTINGS
  // ============================================================

  async getBranding(tenantId = DEFAULT_TENANT) {
    let branding = await prisma.brandingSettings.findUnique({
      where: { tenantId },
    });

    if (!branding) {
      branding = await prisma.brandingSettings.create({
        data: { tenantId },
      });
    }

    return branding;
  }

  async updateBranding(data: Record<string, unknown>, tenantId = DEFAULT_TENANT) {
    await this.getBranding(tenantId);

    return prisma.brandingSettings.update({
      where: { tenantId },
      data,
    });
  }

  // ============================================================
  // AUTH BRANDING
  // ============================================================

  async getAuthBranding(tenantId = DEFAULT_TENANT) {
    let auth = await prisma.authBranding.findUnique({
      where: { tenantId },
    });

    if (!auth) {
      auth = await prisma.authBranding.create({
        data: { tenantId },
      });
    }

    return auth;
  }

  async updateAuthBranding(data: Record<string, unknown>, tenantId = DEFAULT_TENANT) {
    await this.getAuthBranding(tenantId);

    return prisma.authBranding.update({
      where: { tenantId },
      data,
    });
  }

  // ============================================================
  // PUBLIC SETTINGS (exposed to frontend)
  // ============================================================

  async getPublicSettings(tenantId = DEFAULT_TENANT) {
    const branding = await this.getBranding(tenantId);
    const auth = await this.getAuthBranding(tenantId);
    const navItems = await prisma.navigationItem.findMany({
      where: { tenantId, isVisible: true },
      orderBy: { sortOrder: "asc" },
    });
    const widgets = await prisma.dashboardWidget.findMany({
      where: { tenantId, isVisible: true },
      orderBy: { sortOrder: "asc" },
    });
    const socialLinks = await prisma.socialLink.findMany({
      where: { tenantId, isVisible: true },
      orderBy: { sortOrder: "asc" },
    });
    const announcements = await prisma.announcement.findMany({
      where: {
        tenantId,
        isVisible: true,
        OR: [
          { startDate: null },
          { startDate: { lte: new Date() } },
        ],
        AND: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    const features = await prisma.featureFlag.findMany({
      where: { tenantId },
    });
    const footer = await prisma.footerSettings.findUnique({
      where: { tenantId },
    });
    const languages = await prisma.language.findMany({
      where: { isEnabled: true },
    });

    return {
      branding: {
        panelName: branding.panelName,
        companyName: branding.companyName,
        shortName: branding.shortName,
        tagline: branding.tagline,
        description: branding.description,
        copyrightText: branding.copyrightText,
        supportName: branding.supportName,
        supportUrl: branding.supportUrl,
        websiteUrl: branding.websiteUrl,
        statusPageUrl: branding.statusPageUrl,
        documentationUrl: branding.documentationUrl,
        mainLogo: branding.mainLogo,
        smallLogo: branding.smallLogo,
        favicon: branding.favicon,
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        accentColor: branding.accentColor,
        backgroundColor: branding.backgroundColor,
        sidebarColor: branding.sidebarColor,
        cardColor: branding.cardColor,
        borderColor: branding.borderColor,
        textColor: branding.textColor,
        mutedTextColor: branding.mutedTextColor,
        successColor: branding.successColor,
        warningColor: branding.warningColor,
        dangerColor: branding.dangerColor,
        infoColor: branding.infoColor,
        defaultTheme: branding.defaultTheme,
        allowUserThemeSwitch: branding.allowUserThemeSwitch,
        bgType: branding.bgType,
        bgColor1: branding.bgColor1,
        bgColor2: branding.bgColor2,
        bgDirection: branding.bgDirection,
        bgImage: branding.bgImage,
        bgOpacity: branding.bgOpacity,
        bgBlur: branding.bgBlur,
        bgPosition: branding.bgPosition,
        bgSize: branding.bgSize,
        bgRepeat: branding.bgRepeat,
        bgOverlay: branding.bgOverlay,
        bgVideo: branding.bgVideo,
        fontProvider: branding.fontProvider,
        headingFont: branding.headingFont,
        bodyFont: branding.bodyFont,
        codeFont: branding.codeFont,
        customFontUrl: branding.customFontUrl,
        customFontName: branding.customFontName,
        whiteLabelMode: branding.whiteLabelMode,
        hidePlatformBranding: branding.hidePlatformBranding,
        hideDeveloperCredits: branding.hideDeveloperCredits,
        customProductName: branding.customProductName,
        customSupportUrl: branding.customSupportUrl,
        customDocsUrl: branding.customDocsUrl,
        customCss: branding.whiteLabelMode ? undefined : undefined, // Never expose custom CSS to public
        maintenanceEnabled: branding.maintenanceEnabled,
        maintenanceTitle: branding.maintenanceTitle,
        maintenanceDescription: branding.maintenanceDescription,
        maintenanceLogo: branding.maintenanceLogo,
        maintenanceStatusUrl: branding.maintenanceStatusUrl,
      },
      auth: {
        loginTitle: auth.loginTitle,
        loginDescription: auth.loginDescription,
        loginLogo: auth.loginLogo,
        loginBgType: auth.loginBgType,
        loginBgColor: auth.loginBgColor,
        loginBgImage: auth.loginBgImage,
        loginBgGradient: auth.loginBgGradient,
        loginButtonText: auth.loginButtonText,
        loginFooterText: auth.loginFooterText,
        loginSupportLink: auth.loginSupportLink,
        loginTermsLink: auth.loginTermsLink,
        loginPrivacyLink: auth.loginPrivacyLink,
        registerEnabled: auth.registerEnabled,
        registerTitle: auth.registerTitle,
        registerDescription: auth.registerDescription,
        registerLogo: auth.registerLogo,
        registerBgType: auth.registerBgType,
        registerBgColor: auth.registerBgColor,
        registerBgImage: auth.registerBgImage,
        registerBgGradient: auth.registerBgGradient,
        registerTermsText: auth.registerTermsText,
        registerPrivacyText: auth.registerPrivacyText,
        registerButtonText: auth.registerButtonText,
      },
      navigation: navItems,
      widgets,
      socialLinks,
      announcements,
      features: Object.fromEntries(features.map((f) => [f.key, f.isEnabled])),
      footer,
      languages,
    };
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  async getNavigation(tenantId = DEFAULT_TENANT) {
    return prisma.navigationItem.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
    });
  }

  async createNavigation(data: {
    name: string;
    icon?: string;
    url: string;
    permission?: string;
    openNewTab?: boolean;
    section?: string;
    sortOrder?: number;
    tenantId?: string;
  }) {
    return prisma.navigationItem.create({
      data: {
        ...data,
        tenantId: data.tenantId || DEFAULT_TENANT,
        isCustom: true,
      },
    });
  }

  async updateNavigation(id: string, data: Record<string, unknown>) {
    return prisma.navigationItem.update({
      where: { id },
      data,
    });
  }

  async deleteNavigation(id: string) {
    return prisma.navigationItem.delete({ where: { id } });
  }

  async reorderNavigation(items: { id: string; sortOrder: number }[]) {
    const ops = items.map((item) =>
      prisma.navigationItem.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    );
    await prisma.$transaction(ops);
  }

  // ============================================================
  // DASHBOARD WIDGETS
  // ============================================================

  async getWidgets(tenantId = DEFAULT_TENANT, role?: string) {
    const where: Record<string, unknown> = { tenantId, isVisible: true };
    if (role) where.role = role;

    return prisma.dashboardWidget.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });
  }

  async updateWidget(id: string, data: Record<string, unknown>) {
    return prisma.dashboardWidget.update({
      where: { id },
      data,
    });
  }

  async reorderWidgets(items: { id: string; sortOrder: number }[]) {
    const ops = items.map((item) =>
      prisma.dashboardWidget.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    );
    await prisma.$transaction(ops);
  }

  // ============================================================
  // FEATURE FLAGS
  // ============================================================

  async getFeatures(tenantId = DEFAULT_TENANT) {
    return prisma.featureFlag.findMany({
      where: { tenantId },
    });
  }

  async setFeature(key: string, isEnabled: boolean, tenantId = DEFAULT_TENANT) {
    return prisma.featureFlag.upsert({
      where: { tenantId_key: { tenantId, key } },
      update: { isEnabled },
      create: { tenantId, key, name: key, isEnabled },
    });
  }

  async isFeatureEnabled(key: string, tenantId = DEFAULT_TENANT) {
    const feature = await prisma.featureFlag.findUnique({
      where: { tenantId_key: { tenantId, key } },
    });
    return feature?.isEnabled ?? true;
  }

  // ============================================================
  // ANNOUNCEMENTS
  // ============================================================

  async getAnnouncements(tenantId = DEFAULT_TENANT) {
    return prisma.announcement.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createAnnouncement(data: {
    title: string;
    content: string;
    type?: string;
    locations?: string[];
    isDismissible?: boolean;
    startDate?: Date;
    endDate?: Date;
    roles?: string[];
    tenantId?: string;
  }) {
    return prisma.announcement.create({
      data: {
        ...data,
        tenantId: data.tenantId || DEFAULT_TENANT,
        type: data.type || "INFO",
        roles: JSON.stringify(data.roles || []),
        locations: JSON.stringify(data.locations || ["dashboard"]),
      },
    });
  }

  async updateAnnouncement(id: string, data: Record<string, unknown>) {
    return prisma.announcement.update({
      where: { id },
      data,
    });
  }

  async deleteAnnouncement(id: string) {
    return prisma.announcement.delete({ where: { id } });
  }

  // ============================================================
  // SOCIAL LINKS
  // ============================================================

  async getSocialLinks(tenantId = DEFAULT_TENANT) {
    return prisma.socialLink.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
    });
  }

  async createSocialLink(data: {
    platform: string;
    url: string;
    icon?: string;
    isVisible?: boolean;
    sortOrder?: number;
    locations?: string[];
    tenantId?: string;
  }) {
    return prisma.socialLink.create({
      data: {
        platform: data.platform,
        url: data.url,
        icon: data.icon,
        isVisible: data.isVisible,
        sortOrder: data.sortOrder,
        locations: JSON.stringify(data.locations || ["footer"]),
        tenantId: data.tenantId || DEFAULT_TENANT,
      },
    });
  }

  async updateSocialLink(id: string, data: Record<string, unknown>) {
    return prisma.socialLink.update({
      where: { id },
      data,
    });
  }

  async deleteSocialLink(id: string) {
    return prisma.socialLink.delete({ where: { id } });
  }

  // ============================================================
  // ERROR PAGES
  // ============================================================

  async getErrorPage(statusCode: number, tenantId = DEFAULT_TENANT) {
    return prisma.errorPage.findUnique({
      where: { tenantId_statusCode: { tenantId, statusCode } },
    });
  }

  async upsertErrorPage(statusCode: number, data: Record<string, unknown>, tenantId = DEFAULT_TENANT) {
    return prisma.errorPage.upsert({
      where: { tenantId_statusCode: { tenantId, statusCode } },
      update: data,
      create: { ...data, tenantId, statusCode } as never,
    });
  }

  // ============================================================
  // EMAIL
  // ============================================================

  async getEmailSettings(tenantId = DEFAULT_TENANT) {
    return prisma.emailSettings.findUnique({
      where: { tenantId },
    });
  }

  async updateEmailSettings(data: Record<string, unknown>, tenantId = DEFAULT_TENANT) {
    await this.getEmailSettings(tenantId);
    return prisma.emailSettings.update({
      where: { tenantId },
      data,
    });
  }

  async getEmailTemplates(tenantId = DEFAULT_TENANT) {
    return prisma.emailTemplate.findMany({
      where: { tenantId },
    });
  }

  async upsertEmailTemplate(key: string, data: Record<string, unknown>, tenantId = DEFAULT_TENANT) {
    return prisma.emailTemplate.upsert({
      where: { tenantId_key: { tenantId, key } },
      update: data,
      create: { ...data, tenantId, key } as never,
    });
  }

  // ============================================================
  // OAUTH PROVIDERS
  // ============================================================

  async getOAuthProviders(tenantId = DEFAULT_TENANT) {
    return prisma.oAuthProvider.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
    });
  }

  async updateOAuthProvider(name: string, data: Record<string, unknown>, tenantId = DEFAULT_TENANT) {
    return prisma.oAuthProvider.upsert({
      where: { tenantId_name: { tenantId, name } },
      update: data,
      create: { ...data, tenantId, name } as never,
    });
  }

  // ============================================================
  // FOOTER
  // ============================================================

  async getFooter(tenantId = DEFAULT_TENANT) {
    return prisma.footerSettings.findUnique({
      where: { tenantId },
    });
  }

  async updateFooter(data: Record<string, unknown>, tenantId = DEFAULT_TENANT) {
    await this.getFooter(tenantId);
    return prisma.footerSettings.update({
      where: { tenantId },
      data,
    });
  }

  // ============================================================
  // TRANSLATIONS
  // ============================================================

  async getTranslation(code: string, key: string) {
    const lang = await prisma.language.findUnique({ where: { code } });
    if (!lang) return null;

    const translation = await prisma.translation.findUnique({
      where: { languageId_key: { languageId: lang.id, key } },
    });
    return translation?.value;
  }

  async getTranslations(code: string) {
    const lang = await prisma.language.findUnique({
      where: { code },
      include: { translations: true },
    });
    if (!lang) return null;

    return Object.fromEntries(lang.translations.map((t) => [t.key, t.value]));
  }

  // ============================================================
  // BRAND PRESETS
  // ============================================================

  async getPresets(tenantId = DEFAULT_TENANT) {
    return prisma.brandPreset.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createPreset(name: string, data: Record<string, unknown>, tenantId = DEFAULT_TENANT) {
    return prisma.brandPreset.create({
      data: {
        tenantId,
        name,
        data: JSON.stringify(data),
      },
    });
  }

  async deletePreset(id: string) {
    return prisma.brandPreset.delete({ where: { id } });
  }

  // ============================================================
  // MAINTENANCE MODE
  // ============================================================

  async isMaintenanceMode(tenantId = DEFAULT_TENANT) {
    const branding = await this.getBranding(tenantId);
    return branding.maintenanceEnabled;
  }

  async canBypassMaintenance(ipAddress: string, tenantId = DEFAULT_TENANT) {
    const branding = await this.getBranding(tenantId);
    return branding.maintenanceBypassIps.includes(ipAddress);
  }
}

export const settings = new SettingsService();
