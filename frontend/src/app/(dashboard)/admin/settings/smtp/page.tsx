"use client"

import { useState, useEffect } from "react"
import { Loader2, Save, Send } from "lucide-react"
import toast from "react-hot-toast"

interface SMTPSettings {
  host: string
  port: string
  user: string
  pass: string
  from: string
}

export default function SMTPSettingsPage() {
  const [settings, setSettings] = useState<SMTPSettings>({ host: "", port: "587", user: "", pass: "", from: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    fetch("/api/admin/smtp-settings", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then((r) => r.json())
      .then((d) => {
        setSettings({ host: d.host || "", port: d.port || "587", user: d.user || "", pass: d.pass || "", from: d.from || "" })
        setLoading(false)
      })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const r = await fetch("/api/admin/smtp-settings", {
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
          <h1 className="text-[17px] font-semibold" style={{ color: "var(--brand-text)" }}>SMTP Settings</h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--brand-muted)" }}>Configure email delivery for verification emails</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary text-[11px] py-2 px-4 flex items-center gap-1.5">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save
        </button>
      </div>

      <div className="rounded-xl p-4 space-y-4" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--brand-muted)" }}>SMTP Host</label>
            <input type="text" value={settings.host} onChange={(e) => setSettings({ ...settings, host: e.target.value })} placeholder="smtp.gmail.com" className="input w-full" />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--brand-muted)" }}>Port</label>
            <input type="text" value={settings.port} onChange={(e) => setSettings({ ...settings, port: e.target.value })} placeholder="587" className="input w-full" />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--brand-muted)" }}>Username</label>
          <input type="text" value={settings.user} onChange={(e) => setSettings({ ...settings, user: e.target.value })} placeholder="your@email.com" className="input w-full" />
        </div>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--brand-muted)" }}>Password</label>
          <input type="password" value={settings.pass} onChange={(e) => setSettings({ ...settings, pass: e.target.value })} placeholder="App password" className="input w-full" />
        </div>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--brand-muted)" }}>From Address</label>
          <input type="email" value={settings.from} onChange={(e) => setSettings({ ...settings, from: e.target.value })} placeholder="noreply@yourdomain.com" className="input w-full" />
        </div>

        <div className="p-3 rounded-lg text-[11px]" style={{ backgroundColor: "var(--brand-background)", color: "var(--brand-muted)" }}>
          <div className="font-medium mb-1" style={{ color: "var(--brand-text)" }}>Notes</div>
          <ul className="list-disc list-inside space-y-0.5">
            <li>For Gmail, use an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline">App Password</a></li>
            <li>For Outlook, use your regular password with SMTP enabled</li>
            <li>If SMTP is not configured, verification tokens are logged to console</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
