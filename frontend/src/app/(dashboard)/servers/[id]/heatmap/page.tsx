"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, Grid } from "lucide-react"

export default function HeatmapPage() {
  const params = useParams(); const id = params.id as string
  const [data, setData] = useState<any>(null); const [loading, setLoading] = useState(true); const [days, setDays] = useState(7)

  useEffect(() => {
    fetch(`/api/servers/${id}/heatmap?days=${days}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(r => r.ok ? r.json() : null).then(d => setData(d)).catch(() => {}).finally(() => setLoading(false))
  }, [id, days])

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>
  if (!data) return <div className="p-5 text-center text-[12px]" style={{ color: "var(--brand-muted)" }}>No data</div>

  const maxVal = Math.max(1, ...Object.values(data.heatmap).flatMap((d: any) => Object.values(d).map(Number)))
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const daysList = Object.keys(data.heatmap).sort()

  const getColor = (val: number) => {
    const intensity = val / maxVal
    if (intensity === 0) return "var(--brand-card)"
    if (intensity < 0.25) return "#1a3a1a"
    if (intensity < 0.5) return "#22c55e40"
    if (intensity < 0.75) return "#22c55e80"
    return "#22c55e"
  }

  return (
    <div className="p-5 md:p-6 max-w-[900px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Usage Heatmap</h1>
          <p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Activity by hour of day</p></div>
        <div className="flex gap-1">
          {[7, 14, 30].map(d => <button key={d} onClick={() => setDays(d)} className={`text-[11px] py-1 px-2.5 rounded-lg ${days === d ? "btn-primary" : "btn-ghost"}`}>{d}d</button>)}
        </div>
      </div>
      <div className="p-4 rounded-xl overflow-x-auto" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="flex gap-0.5 min-w-[600px]">
          <div className="flex flex-col gap-0.5 mr-1">
            {hours.map(h => <div key={h} className="h-[18px] flex items-center text-[8px]" style={{ color: "var(--brand-muted)" }}>{h}</div>)}
          </div>
          {daysList.map(day => (
            <div key={day} className="flex flex-col gap-0.5">
              <div className="text-[8px] text-center mb-0.5" style={{ color: "var(--brand-muted)" }}>{day.slice(5)}</div>
              {hours.map(h => (
                <div key={h} className="w-[18px] h-[18px] rounded-sm relative group cursor-default" style={{ backgroundColor: getColor(data.heatmap[day]?.[h] || 0) }}>
                  <div className="hidden group-hover:block absolute bottom-full mb-1 p-1 rounded text-[9px] whitespace-nowrap z-10" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}>
                    {data.heatmap[day]?.[h] || 0} events
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
