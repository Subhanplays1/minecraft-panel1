"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, Heart, TrendingUp, AlertTriangle, Cpu, HardDrive } from "lucide-react"

interface HealthData { score: number; grade: string; uptimePct: number; crashes: number; ramPct: number; history: any[]; status: string }

export default function HealthPage() {
  const params = useParams(); const id = params.id as string
  const [data, setData] = useState<HealthData | null>(null); const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/servers/${id}/health`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(r => r.ok ? r.json() : null).then(d => setData(d)).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>
  if (!data) return <div className="p-5 text-center text-[12px]" style={{ color: "var(--brand-muted)" }}>No data</div>

  const scoreColor = data.score >= 90 ? "#22c55e" : data.score >= 70 ? "#f59e0b" : "#ef4444"
  const gradeColor = { A: "#22c55e", B: "#3b82f6", C: "#f59e0b", D: "#f97316", F: "#ef4444" }[data.grade] || "#888"

  return (
    <div className="p-5 md:p-6 max-w-[800px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Server Health</h1>
        <p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Overall health score based on uptime, crashes, and resources</p>
      </div>

      {/* Score */}
      <div className="p-6 rounded-xl mb-4 text-center" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="text-[48px] font-bold" style={{ color: scoreColor }}>{data.score}</div>
        <div className="text-[14px] font-medium mt-1" style={{ color: gradeColor }}>Grade: {data.grade}</div>
        <div className="text-[11px] mt-1" style={{ color: "var(--brand-muted)" }}>{data.status}</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "Uptime", value: `${data.uptimePct}%`, icon: <TrendingUp size={13} strokeWidth={1.5} />, color: data.uptimePct > 99 ? "#22c55e" : data.uptimePct > 95 ? "#f59e0b" : "#ef4444" },
          { label: "Crashes", value: String(data.crashes), icon: <AlertTriangle size={13} strokeWidth={1.5} />, color: data.crashes === 0 ? "#22c55e" : data.crashes < 5 ? "#f59e0b" : "#ef4444" },
          { label: "Memory", value: `${data.ramPct}%`, icon: <HardDrive size={13} strokeWidth={1.5} />, color: data.ramPct > 90 ? "#ef4444" : data.ramPct > 70 ? "#f59e0b" : "#22c55e" },
        ].map((c, i) => (
          <div key={i} className="p-3 rounded-xl text-center" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="flex justify-center mb-1" style={{ color: "var(--brand-muted)" }}>{c.icon}</div>
            <div className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>{c.label}</div>
            <div className="text-[16px] font-semibold mt-1" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* History chart */}
      {data.history.length > 0 && (
        <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="text-[12px] font-medium mb-3" style={{ color: "var(--brand-text)" }}>Health History</div>
          <div className="flex items-end gap-1 h-[80px]">
            {data.history.reverse().map((h: any, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className="w-full rounded-sm" style={{ height: `${h.score}%`, backgroundColor: h.score >= 90 ? "#22c55e" : h.score >= 70 ? "#f59e0b" : "#ef4444" }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
