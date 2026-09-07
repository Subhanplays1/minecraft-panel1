"use client"

import { useState, useEffect } from "react"
import { Sliders, Save, Loader2, Server, HardDrive, Cpu, Check } from "lucide-react"

interface Limits {
  maxServers: number
  maxRamPerServer: number
  maxDiskPerServer: number
  maxCpuPerServer: number
  maxTotalRam: number
  maxTotalDisk: number
}

export default function AdminLimitsPage() {
  const [limits, setLimits] = useState<Limits>({
    maxServers: 5, maxRamPerServer: 4096, maxDiskPerServer: 20480,
    maxCpuPerServer: 100, maxTotalRam: 16384, maxTotalDisk: 102400,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    fetch("/api/admin/limits", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d && !d.error) setLimits(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      await fetch("/api/admin/limits", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(limits),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {} finally { setSaving(false) }
  }

  const updateField = (key: keyof Limits, value: string) => {
    const num = parseInt(value) || 0
    setLimits((prev) => ({ ...prev, [key]: num }))
  }

  if (loading) return <div className="p-6 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>

  const fields = [
    { key: "maxServers" as const, label: "Max Servers Per User", icon: <Server size={14} strokeWidth={1.5} />, suffix: "servers", desc: "Maximum number of servers each user can create" },
    { key: "maxRamPerServer" as const, label: "Max RAM Per Server", icon: <HardDrive size={14} strokeWidth={1.5} />, suffix: "MB", desc: "Maximum RAM allocation for a single server" },
    { key: "maxDiskPerServer" as const, label: "Max Disk Per Server", icon: <HardDrive size={14} strokeWidth={1.5} />, suffix: "MB", desc: "Maximum disk space for a single server" },
    { key: "maxCpuPerServer" as const, label: "Max CPU Per Server", icon: <Cpu size={14} strokeWidth={1.5} />, suffix: "%", desc: "Maximum CPU limit per server" },
    { key: "maxTotalRam" as const, label: "Max Total RAM", icon: <HardDrive size={14} strokeWidth={1.5} />, suffix: "MB", desc: "Total RAM limit across all user servers" },
    { key: "maxTotalDisk" as const, label: "Max Total Disk", icon: <HardDrive size={14} strokeWidth={1.5} />, suffix: "MB", desc: "Total disk limit across all user servers" },
  ]

  return (
    <div className="p-5 md:p-6 max-w-[800px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[17px] font-semibold" style={{ color: "var(--brand-text)" }}>Resource Limits</h1>
        <p className="text-[12px] mt-0.5" style={{ color: "var(--brand-muted)" }}>Set default resource limits for all users when creating servers</p>
      </div>

      <div className="rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--brand-border)" }}>
          <Sliders size={14} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
          <h2 className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>Default User Limits</h2>
        </div>

        <div className="p-4 space-y-4">
          {fields.map((field) => (
            <div key={field.key}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-2 text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>
                  {field.icon} {field.label}
                </label>
                <span className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{field.desc}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={limits[field.key]}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  className="input py-2 text-[13px]"
                />
                <span className="text-[11px] font-medium min-w-[40px]" style={{ color: "var(--brand-muted)" }}>{field.suffix}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 flex items-center gap-3" style={{ borderTop: "1px solid var(--brand-border)" }}>
          <button onClick={save} disabled={saving} className="btn-primary text-[12px] disabled:opacity-40">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} /> : <Save className="w-3.5 h-3.5" strokeWidth={2} />} Save Limits
          </button>
          {saved && (
            <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: "var(--brand-text)" }}>
              <Check size={12} strokeWidth={2} /> Saved
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
