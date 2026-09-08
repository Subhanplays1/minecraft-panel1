"use client"
import { useState, useEffect } from "react"
import { Loader2, Database } from "lucide-react"

export default function QuotasPage() {
  const [form, setForm] = useState({ maxServers: 5, maxRamPerServer: 4096, maxDiskPerServer: 20480, maxCpuPerServer: 100, maxTotalRam: 16384, maxTotalDisk: 102400 })
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/admin/quotas", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(r => r.ok ? r.json() : null).then(d => { if (d) setForm(d) }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try { await fetch("/api/admin/quotas", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify(form) }) } catch {} finally { setSaving(false) }
  }

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>

  const fields = [
    { key: "maxServers", label: "Max Servers", unit: "" },
    { key: "maxRamPerServer", label: "Max RAM per Server", unit: "MB" },
    { key: "maxDiskPerServer", label: "Max Disk per Server", unit: "MB" },
    { key: "maxCpuPerServer", label: "Max CPU per Server", unit: "%" },
    { key: "maxTotalRam", label: "Max Total RAM", unit: "MB" },
    { key: "maxTotalDisk", label: "Max Total Disk", unit: "MB" },
  ]

  return (
    <div className="p-5 md:p-6 max-w-[600px] mx-auto">
      <div className="mb-5"><h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Resource Quotas</h1><p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Default limits for all users</p></div>
      <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        {fields.map(f => (
          <div key={f.key}><label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--brand-muted)" }}>{f.label}</label>
            <div className="flex items-center gap-2"><input type="number" value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: parseInt(e.target.value) || 0 })} className="flex-1 px-3 py-1.5 rounded-lg text-[12px] outline-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
              <span className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{f.unit}</span></div></div>
        ))}
        <button onClick={save} disabled={saving} className="w-full btn-primary text-[11px] py-2 disabled:opacity-40">{saving ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} /> : "Save"}</button>
      </div>
    </div>
  )
}
