"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { branding as brandingApi, type PublicSettings } from "@/lib/api";

interface BrandingContextType {
  settings: PublicSettings | null;
  loading: boolean;
  refresh: () => Promise<void>;
  theme: "dark" | "light";
  toggleTheme: () => void;
}

const BrandingContext = createContext<BrandingContextType>({
  settings: null,
  loading: true,
  refresh: async () => {},
  theme: "dark",
  toggleTheme: () => {},
});

export function useBranding() { return useContext(BrandingContext); }

const darkTheme: Record<string, string> = {
  "--brand-primary": "#FFFFFF",
  "--brand-secondary": "#A3A3A3",
  "--brand-accent": "#D4D4D4",
  "--brand-background": "#080808",
  "--brand-sidebar": "#0A0A0A",
  "--brand-card": "#111111",
  "--brand-border": "#1C1C1C",
  "--brand-text": "#FAFAFA",
  "--brand-muted": "#666666",
  "--brand-success": "#FFFFFF",
  "--brand-warning": "#999999",
  "--brand-danger": "#666666",
  "--brand-info": "#CCCCCC",
};

const lightTheme: Record<string, string> = {
  "--brand-primary": "#000000",
  "--brand-secondary": "#52525B",
  "--brand-accent": "#27272A",
  "--brand-background": "#F5F5F5",
  "--brand-sidebar": "#FFFFFF",
  "--brand-card": "#FFFFFF",
  "--brand-border": "#E5E5E5",
  "--brand-text": "#0A0A0A",
  "--brand-muted": "#888888",
  "--brand-success": "#000000",
  "--brand-warning": "#666666",
  "--brand-danger": "#555555",
  "--brand-info": "#333333",
};

function applyThemeVars(theme: "dark" | "light", branding?: PublicSettings["branding"]) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  const vars = theme === "dark" ? darkTheme : lightTheme;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }

  if (branding) {
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
    else if (branding.bgType === "gradient") document.body.style.background = `linear-gradient(${branding.bgDirection || "to bottom right"}, ${branding.bgColor1 || "#080808"}, ${branding.bgColor2 || "#111111"})`;
    else if (branding.bgType === "image" && branding.bgImage) document.body.style.background = `url(/${branding.bgImage}) center / ${branding.bgSize || "cover"} ${branding.bgRepeat || "no-repeat"}`;
    else document.body.style.background = theme === "dark" ? "#080808" : "#F5F5F5";
    document.body.style.backgroundAttachment = "fixed";

    if (branding.customCss) {
      let el = document.getElementById("brand-css") as HTMLStyleElement;
      if (!el) { el = document.createElement("style"); el.id = "brand-css"; document.head.appendChild(el); }
      el.textContent = branding.customCss;
    }
    if (branding.favicon) {
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
      link.href = `/${branding.favicon}`;
    }
    if (branding.panelName) document.title = `${branding.panelName} — Minecraft Hosting`;
  } else {
    document.body.style.background = theme === "dark" ? "#080808" : "#F5F5F5";
    document.body.style.backgroundAttachment = "fixed";
    document.title = "Minevo — Minecraft Hosting";
  }
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    const initial = saved || "dark";
    setThemeState(initial);
    applyThemeVars(initial);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      applyThemeVars(next);
      return next;
    });
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await brandingApi.getPublic();
      setSettings(data);
      applyThemeVars(theme, data.branding);
    } catch {
      applyThemeVars(theme);
    } finally { setLoading(false); }
  }, [theme]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  return <BrandingContext.Provider value={{ settings, loading, refresh: fetchSettings, theme, toggleTheme }}>{children}</BrandingContext.Provider>;
}
