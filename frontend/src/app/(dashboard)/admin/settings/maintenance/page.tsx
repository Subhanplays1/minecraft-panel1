"use client";

import React, { useEffect, useState, useCallback } from "react";
import { branding as brandingApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Save } from "lucide-react";

export default function MaintenancePage() {
  const router = useRouter();
  const [branding, setBranding] = useState<Record<string, unknown>>({});
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

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await brandingApi.get(token);
      setBranding(data as unknown as Record<string, unknown>);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { if (token) load(); }, [token, load]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await brandingApi.update({
        maintenanceEnabled: branding.maintenanceEnabled as boolean,
        maintenanceTitle: branding.maintenanceTitle as string,
        maintenanceDescription: branding.maintenanceDescription as string,
        maintenanceCountdown: branding.maintenanceCountdown as boolean,
        maintenanceStatusUrl: branding.maintenanceStatusUrl as string,
      }, token);
      toast.success("Saved!");
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  const update = (key: string, value: unknown) => setBranding((prev) => ({ ...prev, [key]: value }));

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--brand-background)" }}><div className="animate-pulse" style={{ color: "var(--brand-muted)" }}>Loading...</div></div>;

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "var(--brand-background)" }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--brand-text)" }}>Maintenance Mode</h1>
            <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>Show a maintenance page to all non-admin users</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50" style={{ backgroundColor: "var(--brand-primary)" }}>
            <Save size={16} /> {saving ? "Saving..." : "Save"}
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl flex items-center justify-between" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>Enable Maintenance Mode</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--brand-muted)" }}>All non-admin users will see the maintenance page</div>
            </div>
            <button onClick={() => update("maintenanceEnabled", !branding.maintenanceEnabled)} className="relative w-10 h-6 rounded-full transition-colors" style={{ backgroundColor: branding.maintenanceEnabled ? "var(--brand-danger)" : "var(--brand-border)" }}>
              <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform" style={{ transform: branding.maintenanceEnabled ? "translateX(16px)" : "translateX(0)" }} />
            </button>
          </div>

          <div className="p-4 rounded-xl space-y-4" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Title</label>
              <input value={(branding.maintenanceTitle as string) || ""} onChange={(e) => update("maintenanceTitle", e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Description</label>
              <textarea value={(branding.maintenanceDescription as string) || ""} onChange={(e) => update("maintenanceDescription", e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm h-20 resize-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Status Page URL</label>
              <input value={(branding.maintenanceStatusUrl as string) || ""} onChange={(e) => update("maintenanceStatusUrl", e.target.value)} placeholder="https://status.example.com" className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
