const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, token } = options;

  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders["Authorization"] = `Bearer ${token}`;
  }

  // Check for token in localStorage if not provided
  let authToken = token;
  if (!authToken && typeof window !== "undefined") {
    authToken = localStorage.getItem("token") || undefined;
    if (authToken) {
      authHeaders["Authorization"] = `Bearer ${authToken}`;
    }
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth
export const auth = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  register: (data: { email: string; password: string; name: string }) =>
    request<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: data,
    }),
  me: (token?: string) => request<{ user: User }>("/api/auth/me", { token }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
};

// Branding
export const branding = {
  getPublic: () => request<PublicSettings>("/api/branding/public"),
  get: (token?: string) => request<BrandingSettings>("/api/branding", { token }),
  update: (data: Partial<BrandingSettings>, token?: string) =>
    request<BrandingSettings>("/api/branding", { method: "PUT", body: data, token }),
  uploadLogo: async (file: File, token?: string) => {
    const formData = new FormData();
    formData.append("logo", file);
    const res = await fetch(`${API_BASE}/api/branding/logo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token || localStorage.getItem("token")}` },
      body: formData,
    });
    return res.json();
  },
  uploadSmallLogo: async (file: File, token?: string) => {
    const formData = new FormData();
    formData.append("logo", file);
    const res = await fetch(`${API_BASE}/api/branding/logo-small`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token || localStorage.getItem("token")}` },
      body: formData,
    });
    return res.json();
  },
  uploadFavicon: async (file: File, token?: string) => {
    const formData = new FormData();
    formData.append("favicon", file);
    const res = await fetch(`${API_BASE}/api/branding/favicon`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token || localStorage.getItem("token")}` },
      body: formData,
    });
    return res.json();
  },
  uploadLoginLogo: async (file: File, token?: string) => {
    const formData = new FormData();
    formData.append("logo", file);
    const res = await fetch(`${API_BASE}/api/branding/login-logo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token || localStorage.getItem("token")}` },
      body: formData,
    });
    return res.json();
  },
  uploadBackground: async (file: File, token?: string) => {
    const formData = new FormData();
    formData.append("background", file);
    const res = await fetch(`${API_BASE}/api/branding/background`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token || localStorage.getItem("token")}` },
      body: formData,
    });
    return res.json();
  },
  uploadVideo: async (file: File, token?: string) => {
    const formData = new FormData();
    formData.append("video", file);
    const res = await fetch(`${API_BASE}/api/branding/video`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token || localStorage.getItem("token")}` },
      body: formData,
    });
    return res.json();
  },
  removeAsset: (field: string, token?: string) =>
    request(`/api/branding/${field}`, { method: "DELETE", token }),
  export: (token?: string) => request("/api/branding/export", { method: "POST", token }),
  import: (data: unknown, token?: string) =>
    request("/api/branding/import", { method: "POST", body: data, token }),

  // Auth branding
  getAuth: (token?: string) => request("/api/branding/auth", { token }),
  updateAuth: (data: unknown, token?: string) =>
    request("/api/branding/auth", { method: "PUT", body: data, token }),

  // Navigation
  getNavigation: (token?: string) => request("/api/branding/navigation", { token }),
  createNavigation: (data: unknown, token?: string) =>
    request("/api/branding/navigation", { method: "POST", body: data, token }),
  updateNavigation: (id: string, data: unknown, token?: string) =>
    request(`/api/branding/navigation/${id}`, { method: "PUT", body: data, token }),
  deleteNavigation: (id: string, token?: string) =>
    request(`/api/branding/navigation/${id}`, { method: "DELETE", token }),
  reorderNavigation: (items: { id: string; sortOrder: number }[], token?: string) =>
    request("/api/branding/navigation/reorder", { method: "PUT", body: { items }, token }),

  // Widgets
  getWidgets: (token?: string) => request("/api/branding/widgets", { token }),
  updateWidget: (id: string, data: unknown, token?: string) =>
    request(`/api/branding/widgets/${id}`, { method: "PUT", body: data, token }),
  reorderWidgets: (items: { id: string; sortOrder: number }[], token?: string) =>
    request("/api/branding/widgets/reorder", { method: "PUT", body: { items }, token }),

  // Social links
  getSocialLinks: (token?: string) => request("/api/branding/social", { token }),
  createSocialLink: (data: unknown, token?: string) =>
    request("/api/branding/social", { method: "POST", body: data, token }),
  updateSocialLink: (id: string, data: unknown, token?: string) =>
    request(`/api/branding/social/${id}`, { method: "PUT", body: data, token }),
  deleteSocialLink: (id: string, token?: string) =>
    request(`/api/branding/social/${id}`, { method: "DELETE", token }),

  // Announcements
  getAnnouncements: (token?: string) => request("/api/branding/announcements", { token }),
  createAnnouncement: (data: unknown, token?: string) =>
    request("/api/branding/announcements", { method: "POST", body: data, token }),
  updateAnnouncement: (id: string, data: unknown, token?: string) =>
    request(`/api/branding/announcements/${id}`, { method: "PUT", body: data, token }),
  deleteAnnouncement: (id: string, token?: string) =>
    request(`/api/branding/announcements/${id}`, { method: "DELETE", token }),

  // Features
  getFeatures: (token?: string) => request("/api/branding/features", { token }),
  updateFeature: (key: string, isEnabled: boolean, token?: string) =>
    request(`/api/branding/features/${key}`, { method: "PUT", body: { isEnabled }, token }),

  // Error pages
  getErrorPage: (code: number, token?: string) => request(`/api/branding/error-pages/${code}`, { token }),
  updateErrorPage: (code: number, data: unknown, token?: string) =>
    request(`/api/branding/error-pages/${code}`, { method: "PUT", body: data, token }),

  // Email
  getEmail: (token?: string) => request("/api/branding/email", { token }),
  updateEmail: (data: unknown, token?: string) =>
    request("/api/branding/email", { method: "PUT", body: data, token }),
  getEmailTemplates: (token?: string) => request("/api/branding/email/templates", { token }),
  updateEmailTemplate: (key: string, data: unknown, token?: string) =>
    request(`/api/branding/email/templates/${key}`, { method: "PUT", body: data, token }),

  // OAuth
  getOAuth: (token?: string) => request("/api/branding/oauth", { token }),
  updateOAuth: (name: string, data: unknown, token?: string) =>
    request(`/api/branding/oauth/${name}`, { method: "PUT", body: data, token }),

  // Footer
  getFooter: (token?: string) => request("/api/branding/footer", { token }),
  updateFooter: (data: unknown, token?: string) =>
    request("/api/branding/footer", { method: "PUT", body: data, token }),

  // Presets
  getPresets: (token?: string) => request("/api/branding/presets", { token }),
  createPreset: (name: string, token?: string) =>
    request("/api/branding/presets", { method: "POST", body: { name }, token }),
  applyPreset: (id: string, token?: string) =>
    request(`/api/branding/presets/${id}/apply`, { method: "POST", token }),
  deletePreset: (id: string, token?: string) =>
    request(`/api/branding/presets/${id}`, { method: "DELETE", token }),
};

// Servers
export const servers = {
  list: (token?: string) => request<Server[]>("/api/servers", { token }),
  get: (id: string, token?: string) => request<Server>(`/api/servers/${id}`, { token }),
  create: (data: { name: string; software?: string; mcVersion?: string; ram?: number; cpu?: number; disk?: number; port?: number }, token?: string) =>
    request<Server>("/api/servers", { method: "POST", body: data, token }),
  update: (id: string, data: Partial<Server>, token?: string) =>
    request<Server>(`/api/servers/${id}`, { method: "PUT", body: data, token }),
  delete: (id: string, token?: string) =>
    request(`/api/servers/${id}`, { method: "DELETE", token }),
  start: (id: string, token?: string) =>
    request<Server>(`/api/servers/${id}/start`, { method: "POST", token }),
  stop: (id: string, token?: string) =>
    request<Server>(`/api/servers/${id}/stop`, { method: "POST", token }),
  restart: (id: string, token?: string) =>
    request(`/api/servers/${id}/restart`, { method: "POST", token }),
  getConsole: (id: string, token?: string) =>
    request<{ logs: string[] }>(`/api/servers/${id}/console`, { token }),
  sendCommand: (id: string, command: string, token?: string) =>
    request<{ response: string }>(`/api/servers/${id}/command`, { method: "POST", body: { command }, token }),
};

// Admin
export const admin = {
  getUsers: (token?: string) => request<User[]>(`/api/admin/users`, { token }),
  updateUser: (id: string, data: { role?: string; banned?: boolean; banReason?: string }, token?: string) =>
    request(`/api/admin/users/${id}`, { method: "PUT", body: data, token }),
  getStats: (token?: string) => request<{ userCount: number; serverCount: number; runningServers: number; onlineServers: number }>(`/api/admin/stats`, { token }),
};

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "STAFF" | "CUSTOMER";
  avatar?: string;
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
    customCss: string | null;
    customJs: string | null;
  };
  auth: Record<string, unknown>;
  navigation: Array<{ id: string; name: string; icon?: string; url: string; section: string; sortOrder: number; isVisible: boolean }>;
  widgets: Array<{ id: string; widgetType: string; label: string; isVisible: boolean; sortOrder: number; role: string }>;
  socialLinks: Array<{ id: string; platform: string; url: string; icon?: string; isVisible: boolean }>;
  announcements: Array<{ id: string; title: string; content: string; type: string; isVisible: boolean }>;
  features: Record<string, boolean>;
  footer: { copyright: string; sections: unknown; isVisible: boolean } | null;
  languages: Array<{ code: string; name: string; nativeName: string }>;
}

export interface BrandingSettings {
  id: string;
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

export interface Server {
  id: string;
  name: string;
  userId: string;
  nodeId: string | null;
  status: string;
  software: string;
  mcVersion: string;
  javaVersion: string;
  ram: number;
  cpu: number;
  disk: number;
  port: number;
  ip: string | null;
  sftpUser: string | null;
  planId: string | null;
  createdAt: string;
  updatedAt: string;
}
