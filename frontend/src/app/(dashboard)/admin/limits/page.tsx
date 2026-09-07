"use client"

import { useState, useEffect } from "react"
import { Sliders, Save, Loader2, Users, HardDrive, Cpu, Server, Check } from "lucide-react"

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

  if (loading) return <div className="p-6 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--brand-primary)" }} /></div>

  const fields = [
    { key: "maxServers" as const, label: "Max Servers Per User", icon: <Server className="w-4 h-4" />, suffix: "servers" },
    { key: "maxRamPerServer" as const, label: "Max RAM Per Server", icon: <HardDrive className="w-4 h-4" />, suffix: "MB" },
    { key: "maxDiskPerServer" as const, label: "Max Disk Per Server", icon: <HardDrive className="w-4 h-4" />, suffix: "MB" },
    { key: "maxCpuPerServer" as const, label: "Max CPU Per Server", icon: <Cpu className="w-4 h-4" />, suffix: "%" },
    { key: "maxTotalRam" as const, label: "Max Total RAM", icon: <HardDrive className="w-4 h-4" />, suffix: "MB" },
    { key: "maxTotalDisk" as const, label: "Max Total Disk", icon: <HardDrive className="w-4 h-4" />, suffix: "MB" },
  ]

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6 animate-fade-in">
        <h1 className="text-xl font-bold" style={{ color: "var(--brand-text)" }}>Resource Limits</h1>
        <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>Set default limits for all users when creating servers</p>
      </div>

      <div className="rounded-xl p-6 animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="flex items-center gap-2 mb-6">
          <Sliders className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
          <h2 className="font-semibold" style={{ color: "var(--brand-text)" }}>Default User Limits</h2>
        </div>

        <div className="space-y-5">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="flex items-center gap-2 text-xs font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>
                {field.icon} {field.label}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={limits[field.key]}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/40"
                  style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
                />
                <span className="text-xs min-w-[40px]" style={{ color: "var(--brand-muted)" }}>{field.suffix}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-6 pt-4" style={{ borderTop: "1px solid var(--brand-border)" }}>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover-lift disabled:opacity-50" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Limits
          </button>
          {saved && <span className="text-sm text-green-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Saved</span>}
        </div>
      </div>
    </div>
  )
}
