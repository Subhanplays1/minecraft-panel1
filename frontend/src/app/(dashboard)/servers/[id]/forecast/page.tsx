"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, TrendingUp, TrendingDown, Minus, Clock, Cpu, HardDrive } from "lucide-react"

interface Forecast { trend: string; daysUntilLimit: number | null; currentResponseMs: number | null; avgResponseMs: number | null; dataPoints: number; memory: { usedMB: number; totalMB: number; pct: number } }

export default function ForecastPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<Forecast | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const token = localStorage.getItem("token")
        const res = await fetch(`/api/servers/${id}/forecast`, { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) setData(await res.json())
      } catch {} finally { setLoading(false) }
    }
    fetchForecast()
  }, [id])

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>
  if (!data) return <div className="p-5 text-center text-[12px]" style={{ color: "var(--brand-muted)" }}>No data</div>

  const TrendIcon = data.trend === "INCREASING" ? TrendingUp : data.trend === "DECREASING" ? TrendingDown : Minus
  const trendColor = data.trend === "INCREASING" ? "#ef4444" : data.trend === "DECREASING" ? "#22c55e" : "#888"

  return (
    <div className="p-5 md:p-6 max-w-[800px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Resource Forecast</h1>
        <p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Predict resource trends and potential limits</p>
      </div>

      {/* Trend */}
      <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-[36px] h-[36px] rounded-lg flex items-center justify-center" style={{ backgroundColor: `${trendColor}20`, border: `1px solid ${trendColor}40` }}>
            <TrendIcon size={18} strokeWidth={1.5} style={{ color: trendColor }} />
          </div>
          <div>
            <div className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>Performance Trend</div>
            <div className="text-[11px]" style={{ color: trendColor }}>{data.trend}</div>
          </div>
        </div>
        {data.daysUntilLimit && (
          <div className="p-2.5 rounded-lg" style={{ backgroundColor: "#1a0a0a", border: "1px solid #3a1515" }}>
            <div className="flex items-center gap-2">
              <Clock size={12} strokeWidth={1.5} className="text-red-400" />
              <span className="text-[11px] text-red-400">
                At current trend, response times may hit critical levels in ~{data.daysUntilLimit} days
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-3 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Cpu size={13} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
            <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>Response Time</span>
          </div>
          <div className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>
            {data.currentResponseMs !== null ? `${data.currentResponseMs}ms` : "N/A"}
          </div>
          {data.avgResponseMs !== null && (
            <div className="text-[10px] mt-1" style={{ color: "var(--brand-muted)" }}>Avg: {data.avgResponseMs}ms</div>
          )}
        </div>
        <div className="p-3 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <HardDrive size={13} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
            <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>Memory</span>
          </div>
          <div className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>{data.memory.pct}%</div>
          <div className="text-[10px] mt-1" style={{ color: "var(--brand-muted)" }}>{data.memory.usedMB}MB / {data.memory.totalMB}MB</div>
        </div>
      </div>

      {/* Memory bar */}
      <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="text-[12px] font-medium mb-2" style={{ color: "var(--brand-text)" }}>Memory Usage</div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: "#1a1a1a" }}>
          <div className="h-full rounded-full transition-all" style={{
            width: `${data.memory.pct}%`,
            backgroundColor: data.memory.pct > 90 ? "#ef4444" : data.memory.pct > 70 ? "#f59e0b" : "#22c55e",
          }} />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px]" style={{ color: "var(--brand-muted)" }}>
          <span>{data.memory.usedMB}MB used</span>
          <span>{data.memory.totalMB}MB total</span>
        </div>
      </div>

      <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <p className="text-[10px]" style={{ color: "var(--brand-muted)" }}>
          Based on {data.dataPoints} data points. Forecast accuracy improves with more uptime data.
        </p>
      </div>
    </div>
  )
}
