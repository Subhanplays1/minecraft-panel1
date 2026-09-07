"use client"

import { useState, useEffect } from "react"
import { Activity, Server, Play, Square, Clock, Loader2 } from "lucide-react"

interface LogEntry { id: string; action: string; details: string; timestamp: string }

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

  return (
    <div className="p-5 md:p-6 max-w-[800px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[17px] font-semibold" style={{ color: "var(--brand-text)" }}>Activity</h1>
        <p className="text-[12px] mt-0.5" style={{ color: "var(--brand-muted)" }}>Recent server activity</p>
      </div>

      <div className="rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--brand-muted)", opacity: 0.3 }} strokeWidth={1.5} />
            <p className="text-[12px]" style={{ color: "var(--brand-muted)" }}>No activity yet</p>
          </div>
        ) : (
          <div>
            {logs.map((log, i) => (
              <div key={log.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors" style={{ borderBottom: i < logs.length - 1 ? "1px solid var(--brand-border)" : undefined }}>
                <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#1a1a1a", border: "1px solid #222" }}>
                  {log.action.includes("Online") ? <Play size={12} strokeWidth={1.5} style={{ color: "#888" }} /> : <Square size={12} strokeWidth={1.5} style={{ color: "#888" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>{log.action}</div>
                  <div className="text-[11px]" style={{ color: "var(--brand-muted)" }}>{log.details}</div>
                </div>
                <div className="text-[10px] flex-shrink-0" style={{ color: "var(--brand-muted)" }}>
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
