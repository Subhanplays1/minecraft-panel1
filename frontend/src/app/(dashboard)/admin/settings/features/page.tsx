"use client";

import React, { useEffect, useState, useCallback } from "react";
import { branding as brandingApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Save } from "lucide-react";

interface Feature {
  id: string;
  key: string;
  name: string;
  description?: string;
  isEnabled: boolean;
}

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  plugins: "Allow users to install plugins on their servers",
  mods: "Allow users to install mods on their servers",
  backups: "Enable server backup functionality",
  billing: "Enable billing and payment features",
  marketplace: "Enable the plugin/mod marketplace",
  discord: "Enable Discord integration",
  oauth: "Enable OAuth login providers",
  custom_css: "Allow custom CSS in branding",
  custom_js: "Allow custom JavaScript in branding",
  server_templates: "Enable server templates",
  proxy_networks: "Enable proxy network support (BungeeCord, Velocity)",
  file_manager: "Enable the web file manager",
  sftp: "Enable SFTP access",
  api: "Enable public API access",
};

export default function FeaturesPage() {
  const router = useRouter();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!t || !user) { router.push("/auth/login"); return; }
    if (JSON.parse(user).role !== "ADMIN") { router.push("/dashboard"); return; }
    setToken(t);
  }, [router]);

  const loadFeatures = useCallback(async () => {
    if (!token) return;
    try {
      const data = await brandingApi.getFeatures(token) as Feature[];
      setFeatures(data);
    } catch { toast.error("Failed to load features"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { if (token) loadFeatures(); }, [token, loadFeatures]);

  const toggleFeature = (key: string) => {
    setFeatures((prev) => prev.map((f) => f.key === key ? { ...f, isEnabled: !f.isEnabled } : f));
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      for (const feature of features) {
        await brandingApi.updateFeature(feature.key, feature.isEnabled, token);
      }
      toast.success("Features saved!");
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--brand-background)" }}><div className="animate-pulse" style={{ color: "var(--brand-muted)" }}>Loading...</div></div>;

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "var(--brand-background)" }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--brand-text)" }}>Feature Flags</h1>
            <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>Enable or disable features across the platform</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50" style={{ backgroundColor: "var(--brand-primary)" }}>
            <Save size={16} /> {saving ? "Saving..." : "Save"}
          </button>
        </div>

        <div className="space-y-2">
          {features.map((feature) => (
            <div key={feature.key} className="p-4 rounded-xl flex items-center justify-between" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>{feature.name}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--brand-muted)" }}>
                  {FEATURE_DESCRIPTIONS[feature.key] || feature.description || `Feature key: ${feature.key}`}
                </div>
              </div>
              <button onClick={() => toggleFeature(feature.key)} className="relative w-10 h-6 rounded-full transition-colors" style={{ backgroundColor: feature.isEnabled ? "var(--brand-success)" : "var(--brand-border)" }}>
                <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform" style={{ transform: feature.isEnabled ? "translateX(16px)" : "translateX(0)" }} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
