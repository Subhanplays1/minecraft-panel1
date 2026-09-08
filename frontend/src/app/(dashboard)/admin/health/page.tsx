"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Cpu, HardDrive, Activity, Clock, Server, MemoryStick,
  Globe, Loader2, RefreshCw, Thermometer,
} from "lucide-react"

interface SystemHealth {
  cpu: { usage: number }
  memory: { used: number; total: number; free: number }
  disk: { used: number; total: number; free: number }
  uptime: number
  system: {
    platform: string
    arch: string
    hostname: string
    nodeVersion: string
    panelVersion: string
    loadAvg: number[]
  }
}

interface ServerResource {
  serverId: string
  serverName: string
  status: string
  cpu: number
  memory: { used: number; limit: number }
  disk: { used: number; limit: number }
  network: { rx: number; tx: number }
  uptime: number
  pid: number | null
}

function StatCard({ label, icon, children, index }: {
  label: string; icon: React.ReactNode; children: React.ReactNode; index: number;
}) {
  return (
    <div
      className="p-4 rounded-xl card-hover animate-fade-in-up"
      style={{
        backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)",
        animationDelay: `${index * 60}ms`, opacity: 0, animationFillMode: "forwards",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--brand-primary)20", color: "var(--brand-primary)" }}>
          {icon}
        </div>
        <span className="text-xs font-medium" style={{ color: "var(--brand-muted)" }}>{label}</span>
      </div>
      {children}
    </div>
  )
}

function ProgressBar({ value, color = "var(--brand-primary)" }: { value: number; color?: string }) {
  const pct = Math.min(Math.max(value, 0), 100)
  const barColor = pct > 80 ? "var(--brand-danger)" : color
  return (
    <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--brand-border)" }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: barColor }}
      />
    </div>
  )
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hrs = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hrs}h ${mins}m`
  if (hrs > 0) return `${hrs}h ${mins}m`
  return `${mins}m`
}

function formatBytes(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb.toFixed(0)} MB`
}

export default function AdminHealthPage() {
  const router = useRouter()
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [serverResources, setServerResources] = useState<ServerResource[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchHealth = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return
      const res = await fetch("/api/system/health", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setHealth(data)
        setLastRefresh(new Date())
      }
    } catch {}
  }, [])

  const fetchServerResources = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return
      const serverRes = await fetch("/api/servers", { headers: { Authorization: `Bearer ${token}` } })
      if (!serverRes.ok) return
      const servers = await serverRes.json()
      const serverList = Array.isArray(servers) ? servers : servers.servers || []
      const resources = await Promise.all(
        serverList.map(async (s: { id: string; name: string; status: string }) => {
          try {
            const r = await fetch(`/api/servers/${s.id}/resources`, { headers: { Authorization: `Bearer ${token}` } })
            if (!r.ok) return null
            const d = await r.json()
            return { ...d, serverId: s.id, serverName: s.name, status: s.status }
          } catch { return null }
        })
      )
      setServerResources(resources.filter(Boolean) as ServerResource[])
    } catch {}
  }, [])

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchHealth(), fetchServerResources()])
    setLoading(false)
  }, [fetchHealth, fetchServerResources])

  useEffect(() => {
    const token = localStorage.getItem("token")
    const user = localStorage.getItem("user")
    if (!token || !user) { router.push("/auth/login"); return }
    const parsed = JSON.parse(user)
    if (parsed.role !== "ADMIN") { router.push("/dashboard"); return }
    fetchAll()
  }, [router, fetchAll])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (autoRefresh) {
      intervalRef.current = setInterval(() => { fetchHealth(); fetchServerResources() }, 10000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh, fetchHealth, fetchServerResources])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--brand-primary)" }} />
      </div>
    )
  }

  const cpuPct = health?.cpu?.usage ?? 0
  const memUsed = health?.memory?.used ?? 0
  const memTotal = health?.memory?.total ?? 1
  const memPct = memTotal > 0 ? (memUsed / memTotal) * 100 : 0
  const diskUsed = health?.disk?.used ?? 0
  const diskTotal = health?.disk?.total ?? 1
  const diskPct = diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0
  const uptime = health?.uptime ?? 0

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
            <Activity className="w-6 h-6" style={{ color: "var(--brand-primary)" }} />
            System Health
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>
            {lastRefresh ? `Last updated ${lastRefresh.toLocaleTimeString()}` : "Loading..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchHealth(); fetchServerResources() }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5"
            style={{ border: "1px solid var(--brand-border)", color: "var(--brand-muted)" }}
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
            style={{
              border: `1px solid ${autoRefresh ? "var(--brand-primary)" : "var(--brand-border)"}`,
              color: autoRefresh ? "var(--brand-primary)" : "var(--brand-muted)",
              backgroundColor: autoRefresh ? "color-mix(in srgb, var(--brand-primary) 10%, transparent)" : "transparent",
            }}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? "animate-pulse" : ""}`} style={{ backgroundColor: autoRefresh ? "var(--brand-primary)" : "var(--brand-muted)" }} />
            Auto-refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="CPU Usage" icon={<Cpu size={14} strokeWidth={1.5} />} index={0}>
          <div className="text-2xl font-bold mb-2" style={{ color: "var(--brand-text)" }}>
            {cpuPct.toFixed(1)}%
          </div>
          <ProgressBar value={cpuPct} color="var(--brand-primary)" />
          {health?.system?.loadAvg && (
            <div className="mt-2 text-[10px] font-mono" style={{ color: "var(--brand-muted)" }}>
              Load: {health.system.loadAvg.map(l => l.toFixed(2)).join(" / ")}
            </div>
          )}
        </StatCard>

        <StatCard label="Memory" icon={<MemoryStick size={14} strokeWidth={1.5} />} index={1}>
          <div className="text-2xl font-bold mb-2" style={{ color: "var(--brand-text)" }}>
            {formatBytes(memUsed)} <span className="text-sm font-normal" style={{ color: "var(--brand-muted)" }}>/ {formatBytes(memTotal)}</span>
          </div>
          <ProgressBar value={memPct} color="var(--brand-info)" />
          <div className="mt-2 text-[10px] font-mono" style={{ color: "var(--brand-muted)" }}>
            Free: {formatBytes(health?.memory?.free ?? 0)} ({(100 - memPct).toFixed(1)}%)
          </div>
        </StatCard>

        <StatCard label="Disk" icon={<HardDrive size={14} strokeWidth={1.5} />} index={2}>
          <div className="text-2xl font-bold mb-2" style={{ color: "var(--brand-text)" }}>
            {formatBytes(diskUsed)} <span className="text-sm font-normal" style={{ color: "var(--brand-muted)" }}>/ {formatBytes(diskTotal)}</span>
          </div>
          <ProgressBar value={diskPct} color="var(--brand-accent)" />
          <div className="mt-2 text-[10px] font-mono" style={{ color: "var(--brand-muted)" }}>
            Free: {formatBytes(health?.disk?.free ?? 0)} ({(100 - diskPct).toFixed(1)}%)
          </div>
        </StatCard>

        <StatCard label="Uptime" icon={<Clock size={14} strokeWidth={1.5} />} index={3}>
          <div className="text-2xl font-bold mb-2" style={{ color: "var(--brand-text)" }}>
            {formatUptime(uptime)}
          </div>
          <div className="mt-2 text-[10px] font-mono" style={{ color: "var(--brand-muted)" }}>
            Started: {new Date(Date.now() - uptime * 1000).toLocaleDateString()}
          </div>
        </StatCard>
      </div>

      {/* System Info */}
      {health?.system && (
        <div
          className="rounded-xl overflow-hidden mb-8 animate-fade-in-up"
          style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", animationDelay: "300ms", opacity: 0, animationFillMode: "forwards" }}
        >
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--brand-border)" }}>
            <Server size={14} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
            <h2 className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>System Information</h2>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: "Platform", value: health.system.platform, icon: <Globe size={13} strokeWidth={1.5} /> },
              { label: "Architecture", value: health.system.arch, icon: <Cpu size={13} strokeWidth={1.5} /> },
              { label: "Hostname", value: health.system.hostname, icon: <Server size={13} strokeWidth={1.5} /> },
              { label: "Node.js", value: health.system.nodeVersion, icon: <Activity size={13} strokeWidth={1.5} /> },
              { label: "Panel Version", value: health.system.panelVersion, icon: <Thermometer size={13} strokeWidth={1.5} /> },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span style={{ color: "var(--brand-muted)", opacity: 0.5 }}>{item.icon}</span>
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>{item.label}</span>
                </div>
                <div className="text-[13px] font-medium font-mono" style={{ color: "var(--brand-text)" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Server Resources */}
      <div
        className="rounded-xl overflow-hidden animate-fade-in-up"
        style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", animationDelay: "400ms", opacity: 0, animationFillMode: "forwards" }}
      >
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--brand-border)" }}>
          <div className="flex items-center gap-2">
            <HardDrive size={14} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
            <h2 className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>Server Resources</h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--brand-card)", color: "var(--brand-muted)", border: "1px solid var(--brand-border)" }}>
              {serverResources.length} server{serverResources.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {serverResources.length === 0 ? (
          <div className="p-8 text-center">
            <Server size={32} className="mx-auto mb-3 animate-float" style={{ color: "var(--brand-primary)", opacity: 0.3 }} />
            <p className="text-sm" style={{ color: "var(--brand-muted)" }}>No servers running</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--brand-border)" }}>
                  {["Server", "Status", "CPU", "Memory", "Disk", "Network", "Uptime"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {serverResources.map((sr) => (
                  <tr key={sr.serverId} style={{ borderBottom: "1px solid var(--brand-border)" }}>
                    <td className="px-5 py-3">
                      <span className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>{sr.serverName}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{
                        backgroundColor: sr.status === "RUNNING" ? "rgba(34,197,94,0.15)" : sr.status === "STOPPED" ? "rgba(239,68,68,0.15)" : "rgba(234,179,8,0.15)",
                        color: sr.status === "RUNNING" ? "var(--brand-success)" : sr.status === "STOPPED" ? "var(--brand-danger)" : "var(--brand-warning)",
                      }}>
                        {sr.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <span className="text-[11px] font-mono w-10" style={{ color: "var(--brand-text)" }}>{sr.cpu.toFixed(1)}%</span>
                        <div className="flex-1">
                          <ProgressBar value={sr.cpu} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 min-w-[160px]">
                        <span className="text-[11px] font-mono w-20" style={{ color: "var(--brand-text)" }}>
                          {formatBytes(sr.memory.used)} / {formatBytes(sr.memory.limit)}
                        </span>
                        <div className="flex-1">
                          <ProgressBar value={sr.memory.limit > 0 ? (sr.memory.used / sr.memory.limit) * 100 : 0} color="var(--brand-info)" />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 min-w-[160px]">
                        <span className="text-[11px] font-mono w-20" style={{ color: "var(--brand-text)" }}>
                          {formatBytes(sr.disk.used)} / {formatBytes(sr.disk.limit)}
                        </span>
                        <div className="flex-1">
                          <ProgressBar value={sr.disk.limit > 0 ? (sr.disk.used / sr.disk.limit) * 100 : 0} color="var(--brand-accent)" />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono" style={{ color: "var(--brand-muted)" }}>
                          {formatBytes(sr.network.rx)} / {formatBytes(sr.network.tx)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[11px] font-mono" style={{ color: "var(--brand-text)" }}>
                        {formatUptime(sr.uptime)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
