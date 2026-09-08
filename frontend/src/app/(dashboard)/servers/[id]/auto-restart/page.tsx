"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, RotateCcw, ToggleLeft, ToggleRight } from "lucide-react"

export default function AutoRestartPage() {
  const params = useParams(); const id = params.id as string
  const [enabled, setEnabled] = useState(false); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/servers/${id}/auto-restart`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(r => r.json()).then(d => setEnabled(d.enabled)).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  const toggle = async () => {
    setSaving(true)
    try {
      await fetch(`/api/servers/${id}/auto-restart`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ enabled: !enabled }) })
      setEnabled(!enabled)
    } catch {} finally { setSaving(false) }
  }

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>

  return (
    <div className="p-5 md:p-6 max-w-[600px] mx-auto">
      <div className="mb-5"><h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Auto-Restart on Crash</h1>
        <p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Automatically restart server when it crashes</p></div>
      <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RotateCcw size={16} strokeWidth={1.5} style={{ color: enabled ? "#22c55e" : "var(--brand-muted)" }} />
            <div>
              <div className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>Auto-Restart</div>
              <div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{enabled ? "Server will auto-restart on crash" : "Disabled"}</div>
            </div>
          </div>
          <button onClick={toggle} disabled={saving} className="disabled:opacity-40">
            {enabled ? <ToggleRight size={28} strokeWidth={1.5} className="text-green-500" /> : <ToggleLeft size={28} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />}
          </button>
        </div>
      </div>
    </div>
  )
}
