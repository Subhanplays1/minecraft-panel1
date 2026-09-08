"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, Clock, Play, Square, AlertTriangle, RotateCcw, Puzzle, Settings, RefreshCw } from "lucide-react"

interface Activity { id: string; type: string; message: string | null; meta: string | null; createdAt: string }

const ICONS: Record<string, any> = {
  START: { icon: Play, color: "#22c55e" },
  STOP: { icon: Square, color: "#888" },
  CRASH: { icon: AlertTriangle, color: "#ef4444" },
  RESTART: { icon: RotateCcw, color: "#3b82f6" },
  INSTALL: { icon: Settings, color: "#a855f7" },
  PLUGIN_INSTALL: { icon: Puzzle, color: "#06b6d4" },
  PLUGIN_UNINSTALL: { icon: Puzzle, color: "#f59e0b" },
  RENEW: { icon: RefreshCw, color: "#22c55e" },
  NOTE: { icon: Clock, color: "#888" },
  CONFIG_CHANGE: { icon: Settings, color: "#f59e0b" },
}

export default function TimelinePage() {
  const params = useParams()
  const id = params.id as string
  const [events, setEvents] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem("token")
        const res = await fetch(`/api/servers/${id}/activity?limit=100`, { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) setEvents(await res.json())
      } catch {} finally { setLoading(false) }
    }
    fetchEvents()
    const t = setInterval(fetchEvents, 10000)
    return () => clearInterval(t)
  }, [id])

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>

  return (
    <div className="p-5 md:p-6 max-w-[800px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Activity Timeline</h1>
        <p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>History of server events</p>
      </div>

      {events.length === 0 ? (
        <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <Clock size={20} strokeWidth={1.5} style={{ color: "var(--brand-muted)", margin: "0 auto" }} />
          <p className="text-[12px] mt-2" style={{ color: "var(--brand-muted)" }}>No activity yet</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[15px] top-0 bottom-0 w-px" style={{ backgroundColor: "var(--brand-border)" }} />
          <div className="space-y-1">
            {events.map((e) => {
              const conf = ICONS[e.type] || { icon: Clock, color: "#888" }
              const Icon = conf.icon
              return (
                <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg relative" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
                  <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 relative z-10" style={{ backgroundColor: "var(--brand-background)", border: `2px solid ${conf.color}` }}>
                    <Icon size={12} strokeWidth={2} style={{ color: conf.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: `${conf.color}20`, color: conf.color }}>
                        {e.type}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--brand-muted)" }}>
                        {new Date(e.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {e.message && (
                      <p className="text-[12px] mt-1" style={{ color: "var(--brand-text)" }}>{e.message}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
