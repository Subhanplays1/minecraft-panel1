"use client"

import { useState, useEffect } from "react"
import { Loader2, Save, ExternalLink } from "lucide-react"
import toast from "react-hot-toast"

interface GoogleSettings {
  clientId: string
  enabled: string
}

export default function GoogleSettingsPage() {
  const [settings, setSettings] = useState<GoogleSettings>({ clientId: "", enabled: "false" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/admin/google-settings", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then((r) => r.json())
      .then((d) => {
        setSettings({ clientId: d.clientId || "", enabled: d.enabled || "false" })
        setLoading(false)
      })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const r = await fetch("/api/admin/google-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ settings }),
      })
      if (r.ok) toast.success("Saved")
      else toast.error("Failed")
    } catch { toast.error("Failed") }
    setSaving(false)
  }

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="animate-spin" style={{ color: "var(--brand-muted)" }} /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[17px] font-semibold" style={{ color: "var(--brand-text)" }}>Google OAuth</h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--brand-muted)" }}>Allow users to sign in with Google</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary text-[11px] py-2 px-4 flex items-center gap-1.5">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save
        </button>
      </div>

      <div className="rounded-xl p-4 space-y-4" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="flex items-center gap-3">
          <label className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>Enable Google Login</label>
          <button
            onClick={() => setSettings({ ...settings, enabled: settings.enabled === "true" ? "false" : "true" })}
            className="relative w-9 h-5 rounded-full transition-colors"
            style={{ backgroundColor: settings.enabled === "true" ? "var(--brand-text)" : "var(--brand-border)" }}
          >
            <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform" style={{
              backgroundColor: settings.enabled === "true" ? "var(--brand-background)" : "var(--brand-muted)",
              transform: settings.enabled === "true" ? "translateX(16px)" : "none"
            }} />
          </button>
        </div>

        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--brand-muted)" }}>Google Client ID</label>
          <input
            type="text"
            value={settings.clientId}
            onChange={(e) => setSettings({ ...settings, clientId: e.target.value })}
            placeholder="xxxx.apps.googleusercontent.com"
            className="input w-full"
          />
        </div>

        <div className="p-3 rounded-lg text-[11px]" style={{ backgroundColor: "var(--brand-background)", color: "var(--brand-muted)" }}>
          <div className="font-medium mb-1" style={{ color: "var(--brand-text)" }}>Setup Guide</div>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">Google Cloud Console <ExternalLink size={10} /></a></li>
            <li>Create an OAuth 2.0 Client ID</li>
            <li>Add your domain to Authorized JavaScript origins</li>
            <li>Copy the Client ID above</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
