// Shared types for backend/frontend communication

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: "ADMIN" | "STAFF" | "CUSTOMER";
  avatar?: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface BrandingSettings {
  id: string;
  tenantId: string;
  panelName: string;
  companyName: string;
  shortName: string;
  tagline: string;
  description: string;
  copyrightText: string;
  supportName: string;
  supportUrl: string;
  websiteUrl: string;
  statusPageUrl: string;
  documentationUrl: string;
  mainLogo: string | null;
  smallLogo: string | null;
  favicon: string | null;
  loginLogo: string | null;
  emailLogo: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  sidebarColor: string;
  cardColor: string;
  borderColor: string;
  textColor: string;
  mutedTextColor: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;
  infoColor: string;
  defaultTheme: string;
  allowUserThemeSwitch: boolean;
  bgType: string;
  bgColor1: string;
  bgColor2: string;
  bgDirection: string;
  bgImage: string | null;
  bgOpacity: number;
  bgBlur: number;
  bgPosition: string;
  bgSize: string;
  bgRepeat: string;
  bgOverlay: boolean;
  bgVideo: string | null;
  fontProvider: string;
  headingFont: string;
  bodyFont: string;
  codeFont: string;
  customFontUrl: string | null;
  customFontName: string | null;
  whiteLabelMode: boolean;
  hidePlatformBranding: boolean;
  hideDeveloperCredits: boolean;
  customProductName: string | null;
  customSupportUrl: string | null;
  customDocsUrl: string | null;
  customCss: string | null;
  customJs: string | null;
  customJsEnabled: boolean;
  maintenanceEnabled: boolean;
  maintenanceTitle: string;
  maintenanceDescription: string;
  maintenanceLogo: string | null;
  maintenanceBg: string | null;
  maintenanceCountdown: boolean;
  maintenanceStatusUrl: string | null;
  maintenanceBypassIps: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthBranding {
  id: string;
  tenantId: string;
  loginTitle: string;
  loginDescription: string;
  loginLogo: string | null;
  loginBgType: string;
  loginBgColor: string;
  loginBgImage: string | null;
  loginBgGradient: string | null;
  loginButtonText: string;
  loginFooterText: string;
  loginSupportLink: string;
  loginTermsLink: string;
  loginPrivacyLink: string;
  registerEnabled: boolean;
  registerTitle: string;
  registerDescription: string;
  registerLogo: string | null;
  registerBgType: string;
  registerBgColor: string;
  registerBgImage: string | null;
  registerBgGradient: string | null;
  registerTermsText: string;
  registerPrivacyText: string;
  registerButtonText: string;
  registerSuccessMessage: string;
}

export interface NavigationItem {
  id: string;
  tenantId: string;
  name: string;
  icon?: string;
  url: string;
  permission?: string;
  openNewTab: boolean;
  section: string;
  sortOrder: number;
  isVisible: boolean;
  isCustom: boolean;
}

export interface DashboardWidget {
  id: string;
  tenantId: string;
  widgetType: string;
  label: string;
  isVisible: boolean;
  sortOrder: number;
  role: string;
  config?: Record<string, unknown>;
}

export interface SocialLink {
  id: string;
  tenantId: string;
  platform: string;
  url: string;
  icon?: string;
  isVisible: boolean;
  sortOrder: number;
  locations: string[];
}

export interface Announcement {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "MAINTENANCE" | "PROMOTION";
  locations: string[];
  isVisible: boolean;
  isDismissible: boolean;
  startDate?: string;
  endDate?: string;
  authorId?: string;
  roles: string[];
}

export interface FeatureFlag {
  id: string;
  tenantId: string;
  key: string;
  name: string;
  description?: string;
  isEnabled: boolean;
}

export interface ErrorPage {
  id: string;
  tenantId: string;
  statusCode: number;
  title: string;
  description: string;
  image?: string;
  logo?: string;
  buttonText: string;
  buttonUrl: string;
  background?: string;
}

export interface EmailSettings {
  id: string;
  tenantId: string;
  senderName: string;
  senderEmail: string;
  replyTo?: string;
  logo?: string;
  headerText?: string;
  footerText?: string;
  headerColor: string;
  footerBgColor: string;
  companyName?: string;
  supportUrl?: string;
  documentationUrl?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure: boolean;
}

export interface OAuthProvider {
  id: string;
  tenantId: string;
  name: string;
  displayName: string;
  isEnabled: boolean;
  clientId?: string;
  clientSecret?: string;
  callbackUrl?: string;
  scopes: string[];
  icon?: string;
  sortOrder: number;
}

export interface FooterSettings {
  id: string;
  tenantId: string;
  copyright: string;
  sections: FooterSection[];
  isVisible: boolean;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

export interface FooterLink {
  label: string;
  url: string;
  openNewTab?: boolean;
}

export interface BrandPreset {
  id: string;
  tenantId: string;
  name: string;
  data: Record<string, unknown>;
  isDefault: boolean;
  createdAt: string;
}

export interface PublicSettings {
  branding: {
    panelName: string;
    companyName: string;
    shortName: string;
    tagline: string;
    description: string;
    copyrightText: string;
    supportName: string;
    supportUrl: string;
    websiteUrl: string;
    statusPageUrl: string;
    documentationUrl: string;
    mainLogo: string | null;
    smallLogo: string | null;
    favicon: string | null;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    sidebarColor: string;
    cardColor: string;
    borderColor: string;
    textColor: string;
    mutedTextColor: string;
    successColor: string;
    warningColor: string;
    dangerColor: string;
    infoColor: string;
    defaultTheme: string;
    allowUserThemeSwitch: boolean;
    bgType: string;
    bgColor1: string;
    bgColor2: string;
    bgDirection: string;
    bgImage: string | null;
    bgOpacity: number;
    bgBlur: number;
    bgPosition: string;
    bgSize: string;
    bgRepeat: string;
    bgOverlay: boolean;
    bgVideo: string | null;
    fontProvider: string;
    headingFont: string;
    bodyFont: string;
    codeFont: string;
    customFontUrl: string | null;
    customFontName: string | null;
    whiteLabelMode: boolean;
    hidePlatformBranding: boolean;
    hideDeveloperCredits: boolean;
    customProductName: string | null;
    maintenanceEnabled: boolean;
    maintenanceTitle: string;
    maintenanceDescription: string;
    maintenanceLogo: string | null;
    maintenanceStatusUrl: string | null;
  };
  auth: Record<string, unknown>;
  navigation: NavigationItem[];
  widgets: DashboardWidget[];
  socialLinks: SocialLink[];
  announcements: Announcement[];
  features: Record<string, boolean>;
  footer: FooterSettings | null;
  languages: { code: string; name: string; nativeName: string }[];
}
