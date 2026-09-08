"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Settings, Save, Loader2, Trash2, AlertTriangle, Power, HardDrive } from "lucide-react"
import toast from "react-hot-toast"

interface ServerInfo {
  id: string; name: string; status: string; software: string; mcVersion: string
  ram: number; cpu: number; disk: number; port: number; ip: string | null
  notes: string | null
}

export default function ServerSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [server, setServer] = useState<ServerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [name, setName] = useState("")
  const [ram, setRam] = useState(2048)
  const [cpu, setCpu] = useState(100)
  const [port, setPort] = useState(25565)
  const [notes, setNotes] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("token")
    fetch(`/api/servers/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => {
        setServer(d); setName(d.name); setRam(d.ram); setCpu(d.cpu); setPort(d.port); setNotes(d.notes || "")
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [id])

  const saveSettings = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, ram, cpu, port, notes }),
      })
      if (res.ok) { toast.success("Settings saved") } else { toast.error("Failed to save") }
    } catch { toast.error("Failed to save") } finally { setSaving(false) }
  }

  const deleteServer = async () => {
    if (!confirm("Are you sure you want to delete this server? This cannot be undone.")) return
    setDeleting(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { toast.success("Server deleted"); router.push("/servers") } else { toast.error("Failed to delete") }
    } catch { toast.error("Failed to delete") } finally { setDeleting(false) }
  }

  if (loading) return <div className="p-6 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--brand-primary)" }} /></div>
  if (!server) return <div className="p-6 text-center" style={{ color: "var(--brand-muted)" }}>Server not found</div>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-6 animate-fade-in" style={{ color: "var(--brand-text)" }}>Server Settings</h1>

      <div className="space-y-6">
        {/* General */}
        <div className="rounded-xl p-5 animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
            <Settings className="w-4 h-4" style={{ color: "var(--brand-primary)" }} /> General
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "var(--brand-muted)" }}>Server Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/40" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--brand-muted)" }}>Software</label>
                <input value={server.software} disabled className="w-full px-3 py-2 rounded-lg text-sm opacity-50" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--brand-muted)" }}>Version</label>
                <input value={server.mcVersion} disabled className="w-full px-3 py-2 rounded-lg text-sm opacity-50" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Resources */}
        <div className="rounded-xl p-5 animate-fade-in-up delay-100" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
            <HardDrive className="w-4 h-4" style={{ color: "var(--brand-primary)" }} /> Resources
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "var(--brand-muted)" }}>RAM (MB)</label>
              <input type="number" value={ram} onChange={(e) => setRam(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/40" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "var(--brand-muted)" }}>CPU Limit (%)</label>
              <input type="number" value={cpu} onChange={(e) => setCpu(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/40" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "var(--brand-muted)" }}>Port</label>
              <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/40" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "var(--brand-muted)" }}>Status</label>
              <input value={server.status} disabled className="w-full px-3 py-2 rounded-lg text-sm opacity-50" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl p-5 animate-fade-in-up delay-150" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--brand-text)" }}>Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Private notes about this server..."
            rows={4}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
          />
        </div>

        <button onClick={saveSettings} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover-lift disabled:opacity-50" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
        </button>

        {/* Duplicate */}
        <button onClick={async () => {
          if (!confirm("Duplicate this server?")) return
          const token = localStorage.getItem("token")
          const r = await fetch(`/api/servers/${server.id}/duplicate`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
          if (r.ok) { const d = await r.json(); router.push(`/servers/${d.id}`) }
        }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}>
          Duplicate Server
        </button>

        {/* Danger zone */}
        <div className="rounded-xl p-5 animate-fade-in-up delay-200" style={{ backgroundColor: "var(--brand-card)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "#ef4444" }}>
            <AlertTriangle className="w-4 h-4" /> Danger Zone
          </h2>
          <p className="text-xs mb-3" style={{ color: "var(--brand-muted)" }}>Permanently delete this server and all its data. This action cannot be undone.</p>
          <button onClick={deleteServer} disabled={deleting} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover-lift disabled:opacity-50" style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete Server
          </button>
        </div>
      </div>
    </div>
  )
}
