"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { branding as brandingApi, type PublicSettings } from "@/lib/api";

interface BrandingContextType {
  settings: PublicSettings | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType>({
  settings: null,
  loading: true,
  refresh: async () => {},
});

export function useBranding() {
  return useContext(BrandingContext);
}

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <BrandingContext.Provider value={{ settings, loading, refresh: fetchSettings }}>
      {children}
    </BrandingContext.Provider>
  );
}

function applyTheme(settings: PublicSettings) {
  const { branding } = settings;

  // Apply CSS variables
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

  // Apply fonts
  root.style.setProperty("--font-heading", branding.headingFont);
  root.style.setProperty("--font-body", branding.bodyFont);
  root.style.setProperty("--font-code", branding.codeFont);

  // Apply favicon
  if (branding.favicon) {
    const link = document.querySelector("link[rel='icon']") as HTMLLinkElement || document.createElement("link");
    link.rel = "icon";
    link.href = `/${branding.favicon}`;
    document.head.appendChild(link);
  }

  // Apply theme class
  const theme = branding.defaultTheme;
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
    root.classList.toggle("light", !prefersDark);
  } else {
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
  }

  // Apply page title
  if (branding.panelName) {
    document.title = branding.panelName;
  }
}
