"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, Activity, ArrowUp, ArrowDown } from "lucide-react"

interface UptimeData {
  uptimePct: number
  totalChecks: number
  upChecks: number
  downChecks: number
  days: number
  daily: Record<string, { up: number; down: number }>
  currentStatus: string
}

export default function UptimePage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<UptimeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    const fetchUptime = async () => {
      try {
        const token = localStorage.getItem("token")
        const res = await fetch(`/api/servers/${id}/uptime?days=${days}`, { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) setData(await res.json())
      } catch {} finally { setLoading(false) }
    }
    fetchUptime()
  }, [id, days])

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>
  if (!data) return <div className="p-5 text-center text-[12px]" style={{ color: "var(--brand-muted)" }}>No data</div>

  const daysList = Object.entries(data.daily).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="p-5 md:p-6 max-w-[900px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Uptime</h1>
          <p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Server availability over time</p>
        </div>
        <div className="flex gap-1">
          {[7, 14, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)} className={`text-[11px] py-1 px-2.5 rounded-lg ${days === d ? "btn-primary" : "btn-ghost"}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[
          { label: "Uptime", value: `${data.uptimePct}%`, icon: <Activity size={13} strokeWidth={1.5} /> },
          { label: "Status", value: data.currentStatus, icon: data.currentStatus === "UP" ? <ArrowUp size={13} strokeWidth={1.5} /> : <ArrowDown size={13} strokeWidth={1.5} />, color: data.currentStatus === "UP" ? "#22c55e" : "#ef4444" },
          { label: "Up Checks", value: String(data.upChecks), color: "#22c55e" },
          { label: "Down Checks", value: String(data.downChecks), color: "#ef4444" },
        ].map((c, i) => (
          <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>{c.label}</div>
            <div className="text-[14px] font-semibold mt-1" style={{ color: c.color || "var(--brand-text)" }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="text-[12px] font-medium mb-3" style={{ color: "var(--brand-text)" }}>Daily Uptime</div>
        {daysList.length === 0 ? (
          <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>No data for this period</p>
        ) : (
          <div className="flex items-end gap-1 h-[120px]">
            {daysList.map(([day, { up, down }]) => {
              const total = up + down || 1
              const pct = (up / total) * 100
              const isDown = pct < 100
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="w-full rounded-sm transition-all" style={{
                    height: `${Math.max(pct, 2)}%`,
                    backgroundColor: isDown ? (pct < 50 ? "#ef4444" : "#f59e0b") : "#22c55e",
                  }} />
                  <span className="text-[8px]" style={{ color: "var(--brand-muted)" }}>{day.slice(5)}</span>
                  <div className="hidden group-hover:block absolute bottom-full mb-1 p-1.5 rounded text-[10px] whitespace-nowrap z-10" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}>
                    {pct.toFixed(1)}% up ({up}/{total})
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
