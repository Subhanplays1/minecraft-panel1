"use client";

import React, { useEffect, useState, useCallback } from "react";
import { branding as brandingApi, type BrandingSettings } from "@/lib/api";
import { useBranding } from "@/components/BrandingProvider";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Save, Upload, Trash2, Palette, Type, Image as ImageIcon, Globe,
  Shield, Code, Eye, RotateCcw, Download, Upload as UploadIcon
} from "lucide-react";

type Tab = "basic" | "colors" | "background" | "fonts" | "logos" | "whitelabel" | "css";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "basic", label: "Basic Branding", icon: <Globe size={18} /> },
  { id: "colors", label: "Colors", icon: <Palette size={18} /> },
  { id: "background", label: "Background", icon: <ImageIcon size={18} /> },
  { id: "fonts", label: "Fonts", icon: <Type size={18} /> },
  { id: "logos", label: "Logos", icon: <ImageIcon size={18} /> },
  { id: "whitelabel", label: "White Label", icon: <Shield size={18} /> },
  { id: "css", label: "Custom CSS", icon: <Code size={18} /> },
];

export default function BrandingPage() {
  const router = useRouter();
  const { refresh: refreshBranding } = useBranding();
  const [branding, setBranding] = useState<BrandingSettings>({} as BrandingSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("basic");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!t || !user) {
      router.push("/auth/login");
      return;
    }
    const parsed = JSON.parse(user);
    if (parsed.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
    setToken(t);
  }, [router]);

  const loadBranding = useCallback(async () => {
    if (!token) return;
    try {
      const data = await brandingApi.get(token);
      setBranding(data);
    } catch (error) {
      toast.error("Failed to load branding");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) loadBranding();
  }, [token, loadBranding]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await brandingApi.update(branding, token);
      toast.success("Branding saved!");
      applyLiveTheme();
      refreshBranding();
    } catch (error) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const applyLiveTheme = () => {
    const root = document.documentElement;
    if (branding.primaryColor) root.style.setProperty("--brand-primary", String(branding.primaryColor));
    if (branding.secondaryColor) root.style.setProperty("--brand-secondary", String(branding.secondaryColor));
    if (branding.accentColor) root.style.setProperty("--brand-accent", String(branding.accentColor));
    if (branding.backgroundColor) root.style.setProperty("--brand-background", String(branding.backgroundColor));
    if (branding.sidebarColor) root.style.setProperty("--brand-sidebar", String(branding.sidebarColor));
    if (branding.cardColor) root.style.setProperty("--brand-card", String(branding.cardColor));
    if (branding.borderColor) root.style.setProperty("--brand-border", String(branding.borderColor));
    if (branding.textColor) root.style.setProperty("--brand-text", String(branding.textColor));
    if (branding.mutedTextColor) root.style.setProperty("--brand-muted", String(branding.mutedTextColor));
    if (branding.headingFont) root.style.setProperty("--font-heading", String(branding.headingFont));
    if (branding.bodyFont) root.style.setProperty("--font-body", String(branding.bodyFont));
    if (branding.codeFont) root.style.setProperty("--font-code", String(branding.codeFont));
  };

  const handleFileUpload = async (field: string, file: File) => {
    if (!token) return;
    try {
      let result;
      switch (field) {
        case "mainLogo": result = await brandingApi.uploadLogo(file, token); break;
        case "smallLogo": result = await brandingApi.uploadSmallLogo(file, token); break;
        case "favicon": result = await brandingApi.uploadFavicon(file, token); break;
        case "loginLogo": result = await brandingApi.uploadLoginLogo(file, token); break;
        case "bgImage": result = await brandingApi.uploadBackground(file, token); break;
        default: return;
      }
      setBranding((prev) => ({ ...prev, [field]: result.logo || result.bgImage }));
      toast.success("Uploaded!");
      refreshBranding();
    } catch {
      toast.error("Upload failed");
    }
  };

  const handleRemoveAsset = async (field: string) => {
    if (!token) return;
    try {
      await brandingApi.removeAsset(field, token);
      setBranding((prev) => ({ ...prev, [field]: null }));
      toast.success("Removed");
      refreshBranding();
    } catch {
      toast.error("Remove failed");
    }
  };

  const handleExport = async () => {
    if (!token) return;
    try {
      const data = await brandingApi.export(token);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "branding.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported!");
    } catch {
      toast.error("Export failed");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await brandingApi.import(data, token);
      toast.success("Imported!");
      loadBranding();
    } catch {
      toast.error("Invalid file");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ backgroundColor: "var(--brand-background)" }}>
        <div className="animate-pulse text-lg" style={{ color: "var(--brand-muted)" }}>Loading branding settings...</div>
      </div>
    );
  }

  const update = (key: string, value: unknown) => {
    setBranding((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex" style={{ backgroundColor: "var(--brand-background)" }}>
      {/* Tab Navigation Sidebar */}
      <aside className="w-48 flex-shrink-0" style={{ borderRight: "1px solid var(--brand-border)" }}>
        <div className="px-3 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider px-2" style={{ color: "var(--brand-muted)" }}>Branding</span>
        </div>
        <nav className="px-2 space-y-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: activeTab === tab.id ? "var(--brand-primary)" + "20" : "transparent",
                color: activeTab === tab.id ? "var(--brand-primary)" : "var(--brand-muted)",
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="px-2 mt-4 space-y-1">
          <button onClick={handleExport} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/5" style={{ color: "var(--brand-muted)" }}>
            <Download size={14} /> Export
          </button>
          <label className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/5 cursor-pointer" style={{ color: "var(--brand-muted)" }}>
            <UploadIcon size={14} /> Import
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Top Bar */}
        <div
          className="h-16 flex items-center justify-between px-6 sticky top-0 z-10"
          style={{
            backgroundColor: "color-mix(in srgb, var(--brand-background) 80%, transparent)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--brand-border)",
          }}
        >
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "var(--brand-text)" }}>
              {TABS.find((t) => t.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadBranding()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm hover:bg-white/5"
              style={{ color: "var(--brand-muted)", border: "1px solid var(--brand-border)" }}
            >
              <RotateCcw size={16} /> Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white font-medium disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        <div className="flex">
          {/* Editor */}
          <div className="flex-1 p-6 max-w-3xl">
            {activeTab === "basic" && (
              <div className="space-y-6">
                <Field label="Panel Name" value={branding.panelName || ""} onChange={(v) => update("panelName", v)} placeholder="VexPanel" />
                <Field label="Company Name" value={branding.companyName || ""} onChange={(v) => update("companyName", v)} placeholder="Subhan Hosting" />
                <Field label="Short Name" value={branding.shortName || ""} onChange={(v) => update("shortName", v)} placeholder="Subhan" />
                <Field label="Tagline" value={branding.tagline || ""} onChange={(v) => update("tagline", v)} placeholder="Powerful Minecraft Hosting" />
                <Field label="Description" value={branding.description || ""} onChange={(v) => update("description", v)} textarea placeholder="About your hosting company..." />
                <Field label="Copyright Text" value={branding.copyrightText || ""} onChange={(v) => update("copyrightText", v)} placeholder="© 2026 Your Company" />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Support Name" value={branding.supportName || ""} onChange={(v) => update("supportName", v)} placeholder="Support Team" />
                  <Field label="Support URL" value={branding.supportUrl || ""} onChange={(v) => update("supportUrl", v)} placeholder="https://support.example.com" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Website URL" value={branding.websiteUrl || ""} onChange={(v) => update("websiteUrl", v)} placeholder="https://example.com" />
                  <Field label="Status Page URL" value={branding.statusPageUrl || ""} onChange={(v) => update("statusPageUrl", v)} placeholder="https://status.example.com" />
                </div>
                <Field label="Documentation URL" value={branding.documentationUrl || ""} onChange={(v) => update("documentationUrl", v)} placeholder="https://docs.example.com" />
              </div>
            )}

            {activeTab === "colors" && (
              <div className="space-y-6">
                <SectionTitle>Brand Colors</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <ColorField label="Primary Color" value={branding.primaryColor || "#7C3AED"} onChange={(v) => update("primaryColor", v)} />
                  <ColorField label="Secondary Color" value={branding.secondaryColor || "#6D28D9"} onChange={(v) => update("secondaryColor", v)} />
                  <ColorField label="Accent Color" value={branding.accentColor || "#A855F7"} onChange={(v) => update("accentColor", v)} />
                </div>
                <SectionTitle>Interface Colors</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <ColorField label="Background" value={branding.backgroundColor || "#09090B"} onChange={(v) => update("backgroundColor", v)} />
                  <ColorField label="Sidebar" value={branding.sidebarColor || "#0A0A0C"} onChange={(v) => update("sidebarColor", v)} />
                  <ColorField label="Card" value={branding.cardColor || "#18181B"} onChange={(v) => update("cardColor", v)} />
                  <ColorField label="Border" value={branding.borderColor || "#27272A"} onChange={(v) => update("borderColor", v)} />
                  <ColorField label="Text" value={branding.textColor || "#FAFAFA"} onChange={(v) => update("textColor", v)} />
                  <ColorField label="Muted Text" value={branding.mutedTextColor || "#A1A1AA"} onChange={(v) => update("mutedTextColor", v)} />
                </div>
                <SectionTitle>Status Colors</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <ColorField label="Success" value={branding.successColor || "#22C55E"} onChange={(v) => update("successColor", v)} />
                  <ColorField label="Warning" value={branding.warningColor || "#EAB308"} onChange={(v) => update("warningColor", v)} />
                  <ColorField label="Danger" value={branding.dangerColor || "#EF4444"} onChange={(v) => update("dangerColor", v)} />
                  <ColorField label="Info" value={branding.infoColor || "#3B82F6"} onChange={(v) => update("infoColor", v)} />
                </div>
                <SectionTitle>Theme Mode</SectionTitle>
                <div className="flex gap-3">
                  {(["dark", "light", "system"] as const).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => update("defaultTheme", theme)}
                      className="px-4 py-2 rounded-lg text-sm capitalize"
                      style={{
                        backgroundColor: branding.defaultTheme === theme ? "var(--brand-primary)" : "var(--brand-card)",
                        color: branding.defaultTheme === theme ? "white" : "var(--brand-muted)",
                        border: `1px solid ${branding.defaultTheme === theme ? "var(--brand-primary)" : "var(--brand-border)"}`,
                      }}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "background" && (
              <div className="space-y-6">
                <SectionTitle>Background Type</SectionTitle>
                <div className="flex gap-3">
                  {(["solid", "gradient", "image", "video"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => update("bgType", type)}
                      className="px-4 py-2 rounded-lg text-sm capitalize"
                      style={{
                        backgroundColor: branding.bgType === type ? "var(--brand-primary)" : "var(--brand-card)",
                        color: branding.bgType === type ? "white" : "var(--brand-muted)",
                        border: `1px solid ${branding.bgType === type ? "var(--brand-primary)" : "var(--brand-border)"}`,
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {branding.bgType === "solid" && (
                  <ColorField label="Background Color" value={branding.bgColor1 || "#09090B"} onChange={(v) => update("bgColor1", v)} />
                )}

                {branding.bgType === "gradient" && (
                  <div className="space-y-4">
                    <ColorField label="Color 1" value={branding.bgColor1 || "#09090B"} onChange={(v) => update("bgColor1", v)} />
                    <ColorField label="Color 2" value={branding.bgColor2 || "#18181B"} onChange={(v) => update("bgColor2", v)} />
                    <Field label="Direction" value={branding.bgDirection || "to bottom right"} onChange={(v) => update("bgDirection", v)} placeholder="to bottom right" />
                  </div>
                )}

                {branding.bgType === "image" && (
                  <div className="space-y-4">
                    <FileUpload label="Background Image" field="bgImage" current={branding.bgImage} onUpload={handleFileUpload} onRemove={handleRemoveAsset} />
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Opacity" type="number" value={String(branding.bgOpacity ?? 1)} onChange={(v) => update("bgOpacity", parseFloat(v))} />
                      <Field label="Blur" type="number" value={String(branding.bgBlur ?? 0)} onChange={(v) => update("bgBlur", parseFloat(v))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Position" value={branding.bgPosition || "center"} onChange={(v) => update("bgPosition", v)} />
                      <Field label="Size" value={branding.bgSize || "cover"} onChange={(v) => update("bgSize", v)} />
                    </div>
                    <Field label="Repeat" value={branding.bgRepeat || "no-repeat"} onChange={(v) => update("bgRepeat", v)} />
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={branding.bgOverlay || false}
                        onChange={(e) => update("bgOverlay", e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <label className="text-sm" style={{ color: "var(--brand-muted)" }}>Dark Overlay</label>
                    </div>
                  </div>
                )}

                {branding.bgType === "video" && (
                  <div className="space-y-4">
                    <FileUpload label="Background Video" field="bgVideo" current={branding.bgVideo} onUpload={handleFileUpload} onRemove={handleRemoveAsset} accept="video/*" />
                  </div>
                )}
              </div>
            )}

            {activeTab === "fonts" && (
              <div className="space-y-6">
                <SectionTitle>Font Configuration</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <SelectField label="Font Provider" value={branding.fontProvider || "system"} onChange={(v) => update("fontProvider", v)} options={[
                    { value: "system", label: "System" },
                    { value: "google", label: "Google Fonts" },
                    { value: "custom", label: "Custom Upload" },
                  ]} />
                </div>
                {branding.fontProvider === "google" && (
                  <div className="grid grid-cols-3 gap-4">
                    <Field label="Heading Font" value={branding.headingFont || "Inter"} onChange={(v) => update("headingFont", v)} placeholder="Inter" />
                    <Field label="Body Font" value={branding.bodyFont || "Inter"} onChange={(v) => update("bodyFont", v)} placeholder="Inter" />
                    <Field label="Code Font" value={branding.codeFont || "JetBrains Mono"} onChange={(v) => update("codeFont", v)} placeholder="JetBrains Mono" />
                  </div>
                )}
                {branding.fontProvider === "custom" && (
                  <FileUpload label="Upload Font File" field="customFontUrl" current={branding.customFontUrl} onUpload={handleFileUpload} onRemove={handleRemoveAsset} accept=".woff,.woff2,.ttf" />
                )}
              </div>
            )}

            {activeTab === "logos" && (
              <div className="space-y-6">
                <SectionTitle>Logo Management</SectionTitle>
                <FileUpload label="Main Logo" description="Used in sidebar, dashboard, login, emails" field="mainLogo" current={branding.mainLogo} onUpload={handleFileUpload} onRemove={handleRemoveAsset} />
                <FileUpload label="Small Logo / Icon" description="Used when sidebar is collapsed" field="smallLogo" current={branding.smallLogo} onUpload={handleFileUpload} onRemove={handleRemoveAsset} />
                <FileUpload label="Favicon" description="Browser tab icon (.ico, .png, .svg)" field="favicon" current={branding.favicon} onUpload={handleFileUpload} onRemove={handleRemoveAsset} />
                <FileUpload label="Login Logo" description="Separate logo for login/register pages" field="loginLogo" current={branding.loginLogo} onUpload={handleFileUpload} onRemove={handleRemoveAsset} />
              </div>
            )}

            {activeTab === "whitelabel" && (
              <div className="space-y-6">
                <SectionTitle>White Label Mode</SectionTitle>
                <Toggle label="White Label Mode" checked={branding.whiteLabelMode || false} onChange={(v) => update("whiteLabelMode", v)} description="Hide all platform branding" />
                <Toggle label="Hide Platform Branding" checked={branding.hidePlatformBranding || false} onChange={(v) => update("hidePlatformBranding", v)} />
                <Toggle label="Hide Developer Credits" checked={branding.hideDeveloperCredits || false} onChange={(v) => update("hideDeveloperCredits", v)} />
                <Field label="Custom Product Name" value={branding.customProductName || ""} onChange={(v) => update("customProductName", v)} placeholder="Override displayed product name" />
                <Field label="Custom Support URL" value={branding.customSupportUrl || ""} onChange={(v) => update("customSupportUrl", v)} />
                <Field label="Custom Documentation URL" value={branding.customDocsUrl || ""} onChange={(v) => update("customDocsUrl", v)} />
              </div>
            )}

            {activeTab === "css" && (
              <div className="space-y-6">
                <SectionTitle>Custom CSS</SectionTitle>
                <div
                  className="p-4 rounded-xl text-sm"
                  style={{ backgroundColor: "color-mix(in srgb, var(--brand-warning) 15%, var(--brand-card))", border: "1px solid var(--brand-warning)40", color: "var(--brand-text)" }}
                >
                  Warning: Custom CSS can break the interface. Only use if you know what you&apos;re doing.
                </div>
                <textarea
                  value={branding.customCss || ""}
                  onChange={(e) => update("customCss", e.target.value)}
                  className="w-full h-64 p-4 rounded-xl text-sm font-mono resize-none focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: "var(--brand-card)",
                    border: "1px solid var(--brand-border)",
                    color: "var(--brand-text)",
                  }}
                  placeholder=":root { --brand-radius: 14px; }"
                />
              </div>
            )}
          </div>

          {/* Live Preview */}
          <div
            className="w-80 p-4 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto"
            style={{ borderLeft: "1px solid var(--brand-border)" }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--brand-muted)" }}>
              Live Preview
            </h3>
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--brand-border)" }}
            >
              {/* Mini Sidebar */}
              <div className="h-12 flex items-center px-3 gap-2" style={{ backgroundColor: branding.sidebarColor || "#0A0A0C", borderBottom: "1px solid var(--brand-border)" }}>
                <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold" style={{ backgroundColor: branding.primaryColor || "#7C3AED", color: "white" }}>
                  {(branding.shortName || branding.panelName || "M")[0]}
                </div>
                <span className="text-xs font-medium" style={{ color: branding.textColor || "#FAFAFA" }}>
                  {branding.shortName || branding.panelName || "Panel"}
                </span>
              </div>
              {/* Mini Content */}
              <div className="p-3" style={{ backgroundColor: branding.backgroundColor || "#09090B" }}>
                <div className="p-3 rounded-lg mb-2" style={{ backgroundColor: branding.cardColor || "#18181B", border: `1px solid ${branding.borderColor || "#27272A"}` }}>
                  <div className="text-xs font-medium mb-1" style={{ color: branding.textColor || "#FAFAFA" }}>Dashboard</div>
                  <div className="text-xs" style={{ color: branding.mutedTextColor || "#A1A1AA" }}>Welcome back!</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: branding.cardColor || "#18181B", border: `1px solid ${branding.borderColor || "#27272A"}` }}>
                    <div className="text-lg font-bold" style={{ color: branding.primaryColor || "#7C3AED" }}>12</div>
                    <div className="text-xs" style={{ color: branding.mutedTextColor || "#A1A1AA" }}>Servers</div>
                  </div>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: branding.cardColor || "#18181B", border: `1px solid ${branding.borderColor || "#27272A"}` }}>
                    <div className="text-lg font-bold" style={{ color: branding.successColor || "#22C55E" }}>8</div>
                    <div className="text-xs" style={{ color: branding.mutedTextColor || "#A1A1AA" }}>Online</div>
                  </div>
                </div>
                <button className="w-full mt-2 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: branding.primaryColor || "#7C3AED" }}>
                  Create Server
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// UI Components
// ============================================================

function Field({ label, value, onChange, placeholder, textarea, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 resize-none h-20"
          style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
          style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
        />
      )}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer border-0"
          style={{ backgroundColor: "var(--brand-card)" }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg text-sm font-mono focus:outline-none focus:ring-2"
          style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
        />
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
        style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange, description }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; description?: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
      <div>
        <div className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>{label}</div>
        {description && <div className="text-xs mt-0.5" style={{ color: "var(--brand-muted)" }}>{description}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="relative w-10 h-6 rounded-full transition-colors"
        style={{ backgroundColor: checked ? "var(--brand-primary)" : "var(--brand-border)" }}
      >
        <div
          className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(16px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>
      {children}
    </h3>
  );
}

function FileUpload({ label, description, field, current, onUpload, onRemove, accept }: {
  label: string; description?: string; field: string; current: string | null | undefined;
  onUpload: (field: string, file: File) => void; onRemove: (field: string) => void; accept?: string;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(field, file);
  };

  return (
    <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
      <div className="text-sm font-medium mb-1" style={{ color: "var(--brand-text)" }}>{label}</div>
      {description && <div className="text-xs mb-3" style={{ color: "var(--brand-muted)" }}>{description}</div>}

      {current && (
        <div className="mb-3 flex items-center gap-3">
          <img src={`/${current}`} alt={label} className="h-16 w-auto rounded-lg object-contain" style={{ backgroundColor: "var(--brand-background)" }} />
          <button onClick={() => onRemove(field)} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "var(--brand-danger)" }}>
            <Trash2 size={16} />
          </button>
        </div>
      )}

      <label className="flex items-center justify-center gap-2 w-full py-6 rounded-lg cursor-pointer border-2 border-dashed transition-colors hover:border-[var(--brand-primary)]"
        style={{ borderColor: "var(--brand-border)", color: "var(--brand-muted)" }}>
        <Upload size={18} />
        <span className="text-sm">Upload {label}</span>
        <input type="file" accept={accept || "image/*"} className="hidden" onChange={handleChange} />
      </label>
    </div>
  );
}
