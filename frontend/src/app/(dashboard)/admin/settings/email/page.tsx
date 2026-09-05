"use client";

import React, { useEffect, useState, useCallback } from "react";
import { branding as brandingApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Save, Mail } from "lucide-react";

interface EmailSettings {
  senderName: string;
  senderEmail: string;
  replyTo: string;
  headerText: string;
  footerText: string;
  companyName: string;
  supportUrl: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
}

export default function EmailPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Partial<EmailSettings>>({});
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
    try { setSettings(await brandingApi.getEmail(token) as Partial<EmailSettings>); }
    catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { if (token) load(); }, [token, load]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try { await brandingApi.updateEmail(settings, token); toast.success("Saved!"); }
    catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  const update = (key: string, value: unknown) => setSettings((prev) => ({ ...prev, [key]: value }));

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--brand-background)" }}><div className="animate-pulse" style={{ color: "var(--brand-muted)" }}>Loading...</div></div>;

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "var(--brand-background)" }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--brand-text)" }}>Email Settings</h1>
            <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>Configure email sending and branding</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50" style={{ backgroundColor: "var(--brand-primary)" }}>
            <Save size={16} /> {saving ? "Saving..." : "Save"}
          </button>
        </div>

        <div className="space-y-4">
          <Section title="Sender Information">
            <Field label="Sender Name" value={settings.senderName || ""} onChange={(v) => update("senderName", v)} placeholder="My Panel" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Sender Email" value={settings.senderEmail || ""} onChange={(v) => update("senderEmail", v)} placeholder="noreply@example.com" />
              <Field label="Reply-To" value={settings.replyTo || ""} onChange={(v) => update("replyTo", v)} placeholder="support@example.com" />
            </div>
          </Section>

          <Section title="SMTP Configuration">
            <div className="grid grid-cols-3 gap-4">
              <Field label="SMTP Host" value={settings.smtpHost || ""} onChange={(v) => update("smtpHost", v)} placeholder="smtp.example.com" />
              <Field label="SMTP Port" type="number" value={String(settings.smtpPort || 587)} onChange={(v) => update("smtpPort", parseInt(v))} />
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm" style={{ color: "var(--brand-muted)" }}>
                  <input type="checkbox" checked={settings.smtpSecure ?? true} onChange={(e) => update("smtpSecure", e.target.checked)} className="w-4 h-4 rounded" />
                  SSL/TLS
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="SMTP Username" value={settings.smtpUser || ""} onChange={(v) => update("smtpUser", v)} />
              <Field label="SMTP Password" type="password" value={settings.smtpPass || ""} onChange={(v) => update("smtpPass", v)} />
            </div>
          </Section>

          <Section title="Email Branding">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Company Name" value={settings.companyName || ""} onChange={(v) => update("companyName", v)} />
              <Field label="Support URL" value={settings.supportUrl || ""} onChange={(v) => update("supportUrl", v)} />
            </div>
            <Field label="Header Text" value={settings.headerText || ""} onChange={(v) => update("headerText", v)} placeholder="Custom email header" />
            <Field label="Footer Text" value={settings.footerText || ""} onChange={(v) => update("footerText", v)} placeholder="Custom email footer" />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl space-y-4" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
      <h3 className="text-sm font-medium flex items-center gap-2" style={{ color: "var(--brand-text)" }}><Mail size={14} /> {title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
    </div>
  );
}
