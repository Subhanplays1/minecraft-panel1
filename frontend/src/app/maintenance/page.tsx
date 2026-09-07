"use client";

import React from "react";
import { useBranding } from "@/components/BrandingProvider";

export default function MaintenancePage() {
  const { settings } = useBranding();

  if (!settings?.branding.maintenanceEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--brand-background)" }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--brand-text)" }}>No Maintenance Active</h1>
          <p style={{ color: "var(--brand-muted)" }}>The system is currently operational.</p>
          <a href="/dashboard" className="mt-4 inline-block text-sm hover:underline" style={{ color: "var(--brand-primary)" }}>Go to Dashboard</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--brand-background)" }}>
      <div className="text-center max-w-md">
        {settings.branding.maintenanceLogo ? (
          <img src={`/${settings.branding.maintenanceLogo}`} alt="Logo" className="h-16 mx-auto mb-6 object-contain" />
        ) : settings.branding.mainLogo ? (
          <img src={`/${settings.branding.mainLogo}`} alt="Logo" className="h-16 mx-auto mb-6 object-contain" />
        ) : (
          <img src="/logo.svg" alt="Logo" className="h-16 w-auto mx-auto mb-6" />
        )}

        <h1
          className="text-3xl font-bold mb-3"
          style={{ color: "var(--brand-text)", fontFamily: "var(--font-heading)" }}
        >
          {settings.branding.maintenanceTitle}
        </h1>
        <p className="text-lg mb-8" style={{ color: "var(--brand-muted)" }}>
          {settings.branding.maintenanceDescription}
        </p>

        {settings.branding.maintenanceStatusUrl && (
          <a
            href={settings.branding.maintenanceStatusUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            Check Status Page
          </a>
        )}
      </div>
    </div>
  );
}
