"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, Bell, Plus, Trash2, AlertTriangle, Cpu, HardDrive, Activity, X } from "lucide-react"

interface Alert { id: string; type: string; threshold: number; enabled: boolean; lastFired: string | null; cooldownM: number }

const ALERT_TYPES = [
  { value: "HIGH_RAM", label: "High RAM", icon: <HardDrive size={12} strokeWidth={1.5} />, desc: "Alert when RAM usage exceeds threshold %" },
  { value: "HIGH_CPU", label: "High CPU", icon: <Cpu size={12} strokeWidth={1.5} />, desc: "Alert when CPU usage exceeds threshold %" },
  { value: "LOW_TPS", label: "Low TPS", icon: <Activity size={12} strokeWidth={1.5} />, desc: "Alert when TPS drops below threshold" },
  { value: "HIGH_DISK", label: "High Disk", icon: <HardDrive size={12} strokeWidth={1.5} />, desc: "Alert when disk usage exceeds threshold %" },
]

export default function AlertsPage() {
  const params = useParams()
  const id = params.id as string
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newType, setNewType] = useState("HIGH_RAM")
  const [newThreshold, setNewThreshold] = useState("90")
  const [creating, setCreating] = useState(false)

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/alerts`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setAlerts(await res.json())
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchAlerts() }, [id])

  const createAlert = async () => {
    setCreating(true)
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/servers/${id}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: newType, threshold: parseFloat(newThreshold), cooldownM: 30 }),
      })
      setShowCreate(false)
      fetchAlerts()
    } catch {} finally { setCreating(false) }
  }

  const deleteAlert = async (alertId: string) => {
    const token = localStorage.getItem("token")
    await fetch(`/api/servers/${id}/alerts/${alertId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    fetchAlerts()
  }

  const toggleAlert = async (alert: Alert) => {
    const token = localStorage.getItem("token")
    await fetch(`/api/servers/${id}/alerts/${alert.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ enabled: !alert.enabled }),
    })
    fetchAlerts()
  }

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>

  return (
    <div className="p-5 md:p-6 max-w-[800px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Performance Alerts</h1>
          <p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Get Discord notifications when resources are critical</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-[11px] py-1.5 px-3">
          <Plus className="w-3 h-3" strokeWidth={2} /> New Alert
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="w-[380px] p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>Create Alert</span>
              <button onClick={() => setShowCreate(false)}><X size={14} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--brand-muted)" }}>Type</label>
                <div className="space-y-1">
                  {ALERT_TYPES.map((t) => (
                    <button key={t.value} onClick={() => setNewType(t.value)} className="w-full flex items-center gap-2 p-2 rounded-lg text-[11px] text-left" style={{
                      backgroundColor: newType === t.value ? "#1a1a1a" : "transparent",
                      border: `1px solid ${newType === t.value ? "#333" : "transparent"}`,
                      color: "var(--brand-text)",
                    }}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--brand-muted)" }}>Threshold</label>
                <input type="number" min="1" max="100" value={newThreshold} onChange={(e) => setNewThreshold(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg text-[12px] outline-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
              </div>
              <p className="text-[10px]" style={{ color: "var(--brand-muted)" }}>
                {ALERT_TYPES.find((t) => t.value === newType)?.desc}. Cooldown: 30 minutes between alerts.
              </p>
              <button onClick={createAlert} disabled={creating} className="w-full btn-primary text-[11px] py-2 disabled:opacity-40">
                {creating ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} /> : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert list */}
      {alerts.length === 0 ? (
        <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <Bell size={20} strokeWidth={1.5} style={{ color: "var(--brand-muted)", margin: "0 auto" }} />
          <p className="text-[12px] mt-2" style={{ color: "var(--brand-muted)" }}>No alerts configured</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => {
            const conf = ALERT_TYPES.find((t) => t.value === a.type) || ALERT_TYPES[0]
            return (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center" style={{ backgroundColor: a.enabled ? "#1a2a1a" : "#1a1a1a", border: `1px solid ${a.enabled ? "#2a4a2a" : "#222"}` }}>
                    <AlertTriangle size={13} strokeWidth={1.5} style={{ color: a.enabled ? "#22c55e" : "#888" }} />
                  </div>
                  <div>
                    <div className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>{conf.label}</div>
                    <div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>Threshold: {a.threshold} — {a.cooldownM}min cooldown</div>
                    {a.lastFired && <div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>Last fired: {new Date(a.lastFired).toLocaleString()}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => toggleAlert(a)} className="btn-ghost text-[10px]">{a.enabled ? "Disable" : "Enable"}</button>
                  <button onClick={() => deleteAlert(a.id)} className="btn-ghost text-[10px] text-red-400"><Trash2 size={11} strokeWidth={1.5} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
