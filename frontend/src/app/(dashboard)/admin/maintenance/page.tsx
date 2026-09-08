"use client"
import { useState, useEffect } from "react"
import { Loader2, Wrench, ToggleLeft, ToggleRight } from "lucide-react"

export default function MaintenancePage() {
  const [enabled, setEnabled] = useState(false); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/admin/maintenance", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(r => r.ok ? r.json() : null).then(d => { if (d) { setEnabled(d.enabled); setMessage(d.message) } }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try { await fetch("/api/admin/maintenance", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ enabled, message }) }) } catch {} finally { setSaving(false) }
  }

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>

  return (
    <div className="p-5 md:p-6 max-w-[600px] mx-auto">
      <div className="mb-5"><h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Maintenance Mode</h1><p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Show maintenance message to all users</p></div>
      <div className="space-y-3">
        <div className="p-4 rounded-xl flex items-center justify-between" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="flex items-center gap-3"><Wrench size={16} strokeWidth={1.5} style={{ color: enabled ? "#f59e0b" : "var(--brand-muted)" }} />
            <div><div className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>Maintenance Mode</div><div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{enabled ? "Active — users see maintenance page" : "Disabled"}</div></div></div>
          <button onClick={() => setEnabled(!enabled)}>{enabled ? <ToggleRight size={28} strokeWidth={1.5} className="text-yellow-500" /> : <ToggleLeft size={28} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />}</button>
        </div>
        <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--brand-muted)" }}>Maintenance Message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg text-[12px] outline-none resize-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
        </div>
        <button onClick={save} disabled={saving} className="btn-primary text-[11px] py-2 px-4 disabled:opacity-40">{saving ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} /> : "Save"}</button>
      </div>
    </div>
  )
}
