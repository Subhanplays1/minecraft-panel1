"use client"

import { useState, useEffect } from "react"
import { Activity, Server, Play, Square, Settings, User, Clock, Loader2 } from "lucide-react"

interface LogEntry {
  id: string
  action: string
  details: string
  timestamp: string
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    fetch("/api/servers", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((servers) => {
        const entries: LogEntry[] = (Array.isArray(servers) ? servers : []).map((s: any) => ({
          id: s.id,
          action: s.status === "RUNNING" ? "Server Online" : "Server Offline",
          details: `${s.name} (${s.software} ${s.mcVersion})`,
          timestamp: s.updatedAt,
        }))
        entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        setLogs(entries)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const getIcon = (action: string) => {
    if (action.includes("Online")) return <Play className="w-4 h-4 text-green-400" />
    if (action.includes("Offline")) return <Square className="w-4 h-4 text-red-400" />
    if (action.includes("Settings")) return <Settings className="w-4 h-4 text-blue-400" />
    return <Server className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 animate-fade-in">
        <h1 className="text-xl font-bold" style={{ color: "var(--brand-text)" }}>Activity Log</h1>
        <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>Recent server activity</p>
      </div>

      <div className="rounded-xl overflow-hidden animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        {loading ? (
          <div className="p-10 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--brand-primary)" }} /></div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center" style={{ color: "var(--brand-muted)" }}>
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No activity yet</p>
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={log.id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors" style={{ borderBottom: i < logs.length - 1 ? "1px solid var(--brand-border)" : undefined }}>
              <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(124,58,237,0.12)" }}>
                {getIcon(log.action)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>{log.action}</div>
                <div className="text-xs" style={{ color: "var(--brand-muted)" }}>{log.details}</div>
              </div>
              <div className="flex items-center gap-1 text-xs" style={{ color: "var(--brand-muted)" }}>
                <Clock className="w-3 h-3" />
                {new Date(log.timestamp).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
