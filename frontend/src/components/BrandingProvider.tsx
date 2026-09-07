"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { branding as brandingApi, type PublicSettings } from "@/lib/api";

interface BrandingContextType { settings: PublicSettings | null; loading: boolean; refresh: () => Promise<void> }
const BrandingContext = createContext<BrandingContextType>({ settings: null, loading: true, refresh: async () => {} });
export function useBranding() { return useContext(BrandingContext); }

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await brandingApi.getPublic();
      setSettings(data);
      applyTheme(data);
    } catch (error) {
      console.error("Failed to load branding:", error);
      applyDefaults();
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  return <BrandingContext.Provider value={{ settings, loading, refresh: fetchSettings }}>{children}</BrandingContext.Provider>;
}

function applyDefaults() {
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", "#6366F1");
  root.style.setProperty("--brand-secondary", "#4F46E5");
  root.style.setProperty("--brand-accent", "#818CF8");
  root.style.setProperty("--brand-background", "#0F1117");
  root.style.setProperty("--brand-sidebar", "#111318");
  root.style.setProperty("--brand-card", "#1A1D27");
  root.style.setProperty("--brand-border", "#2A2D3A");
  root.style.setProperty("--brand-text", "#F1F5F9");
  root.style.setProperty("--brand-muted", "#8B92A5");
  document.title = "Minevo - Minecraft Server Hosting";
}

function applyTheme(settings: PublicSettings) {
  const { branding } = settings;
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", branding.primaryColor);
  root.style.setProperty("--brand-secondary", branding.secondaryColor);
  root.style.setProperty("--brand-accent", branding.accentColor);
  root.style.setProperty("--brand-background", branding.backgroundColor);
  root.style.setProperty("--brand-sidebar", branding.sidebarColor);
  root.style.setProperty("--brand-card", branding.cardColor);
  root.style.setProperty("--brand-border", branding.borderColor);
  root.style.setProperty("--brand-text", branding.textColor);
  root.style.setProperty("--brand-muted", branding.mutedTextColor);
  root.style.setProperty("--brand-success", branding.successColor);
  root.style.setProperty("--brand-warning", branding.warningColor);
  root.style.setProperty("--brand-danger", branding.dangerColor);
  root.style.setProperty("--brand-info", branding.infoColor);
  root.style.setProperty("--font-heading", branding.headingFont);
  root.style.setProperty("--font-body", branding.bodyFont);
  root.style.setProperty("--font-code", branding.codeFont);

  if (branding.bgType === "solid") document.body.style.background = branding.bgColor1 || branding.backgroundColor;
  else if (branding.bgType === "gradient") document.body.style.background = `linear-gradient(${branding.bgDirection || "to bottom right"}, ${branding.bgColor1 || "#0F1117"}, ${branding.bgColor2 || "#1A1D27"})`;
  else if (branding.bgType === "image" && branding.bgImage) document.body.style.background = `url(/${branding.bgImage}) center / ${branding.bgSize || "cover"} ${branding.bgRepeat || "no-repeat"}`;
  else if (branding.bgType === "video" && branding.bgVideo) document.body.style.background = `url(/${branding.bgVideo}) center / cover no-repeat`;
  document.body.style.backgroundAttachment = "fixed";

  if (branding.customCss) { let el = document.getElementById("brand-css") as HTMLStyleElement; if (!el) { el = document.createElement("style"); el.id = "brand-css"; document.head.appendChild(el); } el.textContent = branding.customCss; }
  if (branding.favicon) { let link = document.querySelector("link[rel='icon']") as HTMLLinkElement; if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); } link.href = `/${branding.favicon}`; }
  if (branding.panelName) document.title = `${branding.panelName} - Minecraft Hosting`;
}
