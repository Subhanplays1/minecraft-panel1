"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { Cpu, HardDrive, Activity, Clock, Loader2, TrendingUp, Server } from "lucide-react"

interface ServerInfo {
  id: string; name: string; status: string; software: string; mcVersion: string
  ram: number; cpu: number; disk: number; port: number; ip: string | null
  javaVersion?: string; node?: string
}

interface ResourceData {
  cpu: number
  memory: { used: number; total: number }
  disk: { used: number; total: number }
  uptime: number
}

const MAX_HISTORY = 30

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(" ")
}

function getBarColor(pct: number): string {
  if (pct > 80) return "#666"
  if (pct > 60) return "#888"
  return "#fff"
}

export default function ServerResourcesPage() {
  const params = useParams()
  const id = params.id as string
  const [server, setServer] = useState<ServerInfo | null>(null)
  const [resources, setResources] = useState<ResourceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [cpuHistory, setCpuHistory] = useState<number[]>([])
  const [memHistory, setMemHistory] = useState<number[]>([])
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchResources = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/resources`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data: ResourceData = await res.json()
        setResources(data)
        setLastRefresh(new Date())
        setCpuHistory((prev) => {
          const next = [...prev, data.cpu]
          return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next
        })
        setMemHistory((prev) => {
          const pct = data.memory.total > 0 ? (data.memory.used / data.memory.total) * 100 : 0
          const next = [...prev, pct]
          return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next
        })
      }
    } catch {}
  }, [id])

  const fetchServer = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) { const d = await res.json(); setServer(d) }
    } catch {}
  }, [id])

  useEffect(() => {
    fetchServer()
    fetchResources()
  }, [fetchServer, fetchResources])

  useEffect(() => {
    const t = setInterval(fetchResources, 5000)
    return () => clearInterval(t)
  }, [fetchResources])

  if (loading) {
    return (
      <div className="p-5 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} />
      </div>
    )
  }

  if (!server || !resources) {
    return <div className="p-5 text-center text-[12px]" style={{ color: "var(--brand-muted)" }}>Server not found</div>
  }

  const memPct = resources.memory.total > 0 ? (resources.memory.used / resources.memory.total) * 100 : 0
  const diskPct = resources.disk.total > 0 ? (resources.disk.used / resources.disk.total) * 100 : 0

  const statCards = [
    {
      label: "CPU Usage",
      value: `${resources.cpu.toFixed(1)}%`,
      pct: resources.cpu,
      icon: <Cpu className="w-4 h-4" strokeWidth={1.5} />,
      detail: `${resources.cpu.toFixed(1)}%`
    },
    {
      label: "RAM Usage",
      value: `${resources.memory.used}MB / ${resources.memory.total}MB`,
      pct: memPct,
      icon: <HardDrive className="w-4 h-4" strokeWidth={1.5} />,
      detail: `${memPct.toFixed(1)}%`
    },
    {
      label: "Disk Usage",
      value: `${resources.disk.used}MB / ${resources.disk.total}MB`,
      pct: diskPct,
      icon: <Activity className="w-4 h-4" strokeWidth={1.5} />,
      detail: `${diskPct.toFixed(1)}%`
    },
    {
      label: "Uptime",
      value: formatUptime(resources.uptime),
      pct: null,
      icon: <Clock className="w-4 h-4" strokeWidth={1.5} />,
      detail: "Server uptime"
    }
  ]

  const maxCpu = Math.max(...cpuHistory, 1)
  const maxMem = Math.max(...memHistory, 1)

  return (
    <div className="p-5 md:p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="w-4 h-4" strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
          <h1 className="text-lg font-bold" style={{ color: "var(--brand-text)" }}>Resource Monitor</h1>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--brand-muted)" }}>
          <Activity className="w-3 h-3 animate-pulse" strokeWidth={1.5} />
          <span>Auto-refresh 5s</span>
          <span className="opacity-50">•</span>
          <span>{lastRefresh.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="p-4 rounded-xl"
            style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>
                {card.label}
              </span>
              <span style={{ color: "var(--brand-muted)", opacity: 0.5 }}>{card.icon}</span>
            </div>
            <div className="text-[14px] font-semibold mb-3" style={{ color: "var(--brand-text)" }}>
              {card.value}
            </div>
            {card.pct !== null && (
              <div
                className="w-full rounded-full overflow-hidden"
                style={{ height: "4px", backgroundColor: "#1a1a1a" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(card.pct, 100)}%`,
                    backgroundColor: getBarColor(card.pct)
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chart Section */}
      <div
        className="rounded-xl p-4 mb-5"
        style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
            <span className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>
              Usage History (Last 30 readings)
            </span>
          </div>
          <span className="text-[10px]" style={{ color: "var(--brand-muted)" }}>
            {cpuHistory.length} data points
          </span>
        </div>

        <div className="flex gap-6">
          {/* CPU Chart */}
          <div className="flex-1">
            <div className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: "var(--brand-muted)" }}>
              CPU (%)
            </div>
            <div className="flex items-end gap-[2px]" style={{ height: "80px" }}>
              {cpuHistory.length === 0 && (
                <div className="w-full h-full flex items-center justify-center text-[10px]" style={{ color: "var(--brand-muted)" }}>
                  Collecting data...
                </div>
              )}
              {cpuHistory.map((val, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t transition-all duration-300"
                  style={{
                    height: `${Math.max((val / maxCpu) * 100, 2)}%`,
                    backgroundColor: getBarColor(val),
                    opacity: 0.3 + (i / Math.max(cpuHistory.length, 1)) * 0.7
                  }}
                  title={`${val.toFixed(1)}%`}
                />
              ))}
            </div>
          </div>

          {/* Memory Chart */}
          <div className="flex-1">
            <div className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: "var(--brand-muted)" }}>
              Memory (%)
            </div>
            <div className="flex items-end gap-[2px]" style={{ height: "80px" }}>
              {memHistory.length === 0 && (
                <div className="w-full h-full flex items-center justify-center text-[10px]" style={{ color: "var(--brand-muted)" }}>
                  Collecting data...
                </div>
              )}
              {memHistory.map((val, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t transition-all duration-300"
                  style={{
                    height: `${Math.max((val / maxMem) * 100, 2)}%`,
                    backgroundColor: getBarColor(val),
                    opacity: 0.3 + (i / Math.max(memHistory.length, 1)) * 0.7
                  }}
                  title={`${val.toFixed(1)}%`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Server Info */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
          <span className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>Server Info</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Software", value: server.software },
            { label: "MC Version", value: server.mcVersion },
            { label: "Java Version", value: server.javaVersion || "—" },
            { label: "Port", value: String(server.port) },
            { label: "Node", value: server.node || "—" }
          ].map((item, i) => (
            <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)" }}>
              <div className="text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: "var(--brand-muted)" }}>
                {item.label}
              </div>
              <div className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
