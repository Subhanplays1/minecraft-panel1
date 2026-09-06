"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Archive, Plus, Trash2, RotateCcw, Clock, Loader2, Download, HardDrive } from "lucide-react"
import toast from "react-hot-toast"

interface Backup {
  id: string
  name: string
  size: number
  status: string
  createdAt: string
}

export default function ServerBackupsPage() {
  const params = useParams()
  const id = params.id as string
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchBackups = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/backups?serverId=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const data = await res.json(); setBackups(Array.isArray(data) ? data : data.backups || []) }
    } catch {} finally { setLoading(false) }
  }

  const createBackup = async () => {
    setCreating(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ serverId: id, name: `backup-${new Date().toISOString().slice(0, 19).replace("T", "-")}` }),
      })
      if (res.ok) { toast.success("Backup created"); fetchBackups() } else { toast.error("Failed to create backup") }
    } catch { toast.error("Failed to create backup") } finally { setCreating(false) }
  }

  const deleteBackup = async (backupId: string) => {
    setDeleting(backupId)
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/backups/${backupId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      toast.success("Backup deleted"); fetchBackups()
    } catch { toast.error("Failed to delete backup") } finally { setDeleting(null) }
  }

  useEffect(() => { fetchBackups() }, [id])

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 B"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--brand-text)" }}>Backups</h1>
          <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>{backups.length} backup{backups.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={createBackup}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover-lift disabled:opacity-50"
          style={{ backgroundColor: "var(--brand-primary)", color: "white" }}
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create Backup
        </button>
      </div>

      <div className="rounded-xl overflow-hidden animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        {loading ? (
          <div className="p-10 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--brand-primary)" }} /></div>
        ) : backups.length === 0 ? (
          <div className="p-10 text-center" style={{ color: "var(--brand-muted)" }}>
            <HardDrive className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-medium mb-1">No backups yet</p>
            <p className="text-sm">Create your first backup to protect your server</p>
          </div>
        ) : (
          backups.map((backup, i) => (
            <div key={backup.id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors" style={{ borderBottom: i < backups.length - 1 ? "1px solid var(--brand-border)" : undefined }}>
              <div className="p-2.5 rounded-lg" style={{ backgroundColor: "rgba(124,58,237,0.12)" }}>
                <Archive className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate" style={{ color: "var(--brand-text)" }}>{backup.name}</div>
                <div className="flex items-center gap-3 text-xs mt-0.5" style={{ color: "var(--brand-muted)" }}>
                  <span>{formatSize(backup.size)}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(backup.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--brand-primary)" }} title="Restore">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--brand-muted)" }} title="Download">
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteBackup(backup.id)}
                  disabled={deleting === backup.id}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                  style={{ color: "var(--brand-danger)" }}
                  title="Delete"
                >
                  {deleting === backup.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
