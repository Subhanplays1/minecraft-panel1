"use client"
import { useState, useEffect } from "react"
import { Loader2, Users, Server, TrendingUp, Activity, HardDrive, Network } from "lucide-react"

interface RevenueData { totalUsers: number; totalServers: number; activeServers: number; totalNodes: number; newUsers30d: number; newUsers7d: number; newServers30d: number; dailySignups: Record<string, number>; dailyServers: Record<string, number>; totalRamMB: number; totalDiskMB: number }

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null); const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/revenue", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(r => r.ok ? r.json() : null).then(d => setData(d)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>
  if (!data) return null

  const cards = [
    { label: "Total Users", value: data.totalUsers, icon: <Users size={15} strokeWidth={1.5} />, color: "#3b82f6" },
    { label: "Total Servers", value: data.totalServers, icon: <Server size={15} strokeWidth={1.5} />, color: "#22c55e" },
    { label: "Active Servers", value: data.activeServers, icon: <Activity size={15} strokeWidth={1.5} />, color: "#a855f7" },
    { label: "Total Nodes", value: data.totalNodes, icon: <Network size={15} strokeWidth={1.5} />, color: "#f59e0b" },
    { label: "New Users (30d)", value: data.newUsers30d, icon: <TrendingUp size={15} strokeWidth={1.5} />, color: "#06b6d4" },
    { label: "New Users (7d)", value: data.newUsers7d, icon: <TrendingUp size={15} strokeWidth={1.5} />, color: "#ec4899" },
    { label: "New Servers (30d)", value: data.newServers30d, icon: <Server size={15} strokeWidth={1.5} />, color: "#22c55e" },
    { label: "Total RAM", value: `${(data.totalRamMB / 1024).toFixed(1)} GB`, icon: <HardDrive size={15} strokeWidth={1.5} />, color: "#ef4444" },
  ]

  const signups = Object.entries(data.dailySignups).sort(([a], [b]) => a.localeCompare(b))
  const maxSignups = Math.max(1, ...signups.map(([, v]) => v))

  return (
    <div className="p-5 md:p-6 max-w-[1000px] mx-auto">
      <div className="mb-5"><h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Revenue Dashboard</h1>
        <p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Platform overview and growth metrics</p></div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {cards.map((c, i) => (
          <div key={i} className="p-3 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="flex items-center gap-2 mb-2"><span style={{ color: c.color }}>{c.icon}</span>
              <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>{c.label}</span></div>
            <div className="text-[18px] font-bold" style={{ color: "var(--brand-text)" }}>{c.value}</div>
          </div>
        ))}
      </div>

      {signups.length > 0 && (
        <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="text-[12px] font-medium mb-3" style={{ color: "var(--brand-text)" }}>Daily Signups (30 days)</div>
          <div className="flex items-end gap-1 h-[100px]">
            {signups.map(([day, count]) => (
              <div key={day} className="flex-1 flex flex-col items-center group relative">
                <div className="w-full rounded-sm" style={{ height: `${(count / maxSignups) * 100}%`, backgroundColor: "#3b82f6" }} />
                <span className="text-[7px] mt-1" style={{ color: "var(--brand-muted)" }}>{day.slice(5)}</span>
                <div className="hidden group-hover:block absolute bottom-full mb-1 p-1 rounded text-[9px] whitespace-nowrap z-10" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}>{count} signups</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
