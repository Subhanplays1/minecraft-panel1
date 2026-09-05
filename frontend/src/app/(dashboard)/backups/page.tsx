"use client"

import { useState, useEffect } from "react"
import { HardDrive, Download, Trash2, RotateCcw, Plus, Clock, Server, Loader2 } from "lucide-react"

interface Backup {
  id: string
  name: string
  size: number
  status: string
  createdAt: string
  server: { id: string; name: string }
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [servers, setServers] = useState<{ id: string; name: string }[]>([])
  const [selectedServer, setSelectedServer] = useState("")
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchBackups()
    fetchServers()
  }, [])

  const fetchBackups = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/backups", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setBackups(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchServers = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/servers", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        const arr = Array.isArray(data) ? data : []
        setServers(arr.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })))
        if (arr.length > 0) setSelectedServer(arr[0].id)
      }
    } catch {}
  }

  const createBackup = async () => {
    if (!selectedServer) return
    setCreating(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ serverId: selectedServer }),
      })
      if (res.ok) fetchBackups()
    } catch (e) {
      console.error(e)
    } finally {
      setCreating(false)
    }
  }

  const deleteBackup = async (id: string) => {
    if (!confirm("Delete this backup?")) return
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/backups/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      setBackups((prev) => prev.filter((b) => b.id !== id))
    } catch {}
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
            <HardDrive className="w-6 h-6" style={{ color: "var(--brand-primary)" }} />
            Backups
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>
            {backups.length} backup{backups.length !== 1 ? "s" : ""} stored
          </p>
        </div>
        <div className="flex items-center gap-3 animate-fade-in-up delay-100">
          {servers.length > 0 && (
            <select
              value={selectedServer}
              onChange={(e) => setSelectedServer(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
            >
              {servers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={createBackup}
            disabled={creating || !selectedServer}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover-lift btn-ripple disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Backup
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="p-5 rounded-xl skeleton h-20" />)}
        </div>
      ) : backups.length === 0 ? (
        <div className="text-center py-20 rounded-xl animate-fade-in" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <HardDrive className="w-16 h-16 mx-auto mb-4 animate-float" style={{ color: "var(--brand-primary)", opacity: 0.3 }} />
          <p className="text-lg font-medium" style={{ color: "var(--brand-muted)" }}>No backups yet</p>
          <p className="text-sm mt-1" style={{ color: "var(--brand-muted)", opacity: 0.6 }}>
            {servers.length === 0 ? "Create a server first to make backups" : "Select a server and create your first backup"}
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden animate-fade-in-up delay-200" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="grid grid-cols-12 gap-4 p-4 text-sm font-medium" style={{ borderBottom: "1px solid var(--brand-border)", color: "var(--brand-muted)" }}>
            <div className="col-span-4">Name</div>
            <div className="col-span-3">Server</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-1">Size</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          {backups.map((backup, idx) => (
            <div
              key={backup.id}
              className="grid grid-cols-12 gap-4 p-4 items-center text-sm hover:bg-white/5 transition-colors animate-fade-in"
              style={{ borderBottom: "1px solid var(--brand-border)", animationDelay: `${idx * 50}ms`, opacity: 0, animationFillMode: "forwards" }}
            >
              <div className="col-span-4 flex items-center gap-2">
                <HardDrive className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
                <span className="font-medium" style={{ color: "var(--brand-text)" }}>{backup.name}</span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{
                  backgroundColor: backup.status === "COMPLETED" ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)",
                  color: backup.status === "COMPLETED" ? "var(--brand-success)" : "var(--brand-warning)",
                }}>
                  {backup.status}
                </span>
              </div>
              <div className="col-span-3 flex items-center gap-2" style={{ color: "var(--brand-muted)" }}>
                <Server className="w-3 h-3" />
                {backup.server?.name || "Unknown"}
              </div>
              <div className="col-span-2 flex items-center gap-2" style={{ color: "var(--brand-muted)" }}>
                <Clock className="w-3 h-3" />
                {new Date(backup.createdAt).toLocaleDateString()}
              </div>
              <div className="col-span-1" style={{ color: "var(--brand-muted)" }}>{formatSize(backup.size)}</div>
              <div className="col-span-2 flex items-center justify-end gap-2">
                <button className="p-2 rounded-lg transition-colors hover:bg-green-500/20" title="Restore" style={{ color: "var(--brand-success)" }}>
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-lg transition-colors hover:bg-blue-500/20" title="Download" style={{ color: "var(--brand-info)" }}>
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteBackup(backup.id)}
                  className="p-2 rounded-lg transition-colors hover:bg-red-500/20"
                  title="Delete"
                  style={{ color: "var(--brand-danger)" }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
