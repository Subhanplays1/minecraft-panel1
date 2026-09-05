"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Server, Plus, Search, Cpu, HardDrive, Globe, Loader2, Play, Square, Trash2, RefreshCw } from "lucide-react"

interface ServerData {
  id: string
  name: string
  status: "RUNNING" | "STOPPED" | "STARTING" | "ERROR"
  software: string
  mcVersion: string
  ram: number
  cpu: number
  ip: string | null
  port: number
  createdAt: string
  node?: { name: string; location: string }
}

export default function ServersPage() {
  const router = useRouter()
  const [servers, setServers] = useState<ServerData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const fetchServers = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/servers", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setServers(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchServers() }, [])

  const statusColor = (status: string) => {
    switch (status) {
      case "RUNNING": return { bg: "rgba(34,197,94,0.15)", dot: "bg-green-500", text: "text-green-400", border: "border-green-500/30" }
      case "STOPPED": return { bg: "rgba(107,114,128,0.15)", dot: "bg-gray-400", text: "text-gray-400", border: "border-gray-500/30" }
      case "STARTING": return { bg: "rgba(234,179,8,0.15)", dot: "bg-yellow-500 animate-pulse", text: "text-yellow-400", border: "border-yellow-500/30" }
      case "ERROR": return { bg: "rgba(239,68,68,0.15)", dot: "bg-red-500 animate-pulse", text: "text-red-400", border: "border-red-500/30" }
      default: return { bg: "rgba(107,114,128,0.15)", dot: "bg-gray-400", text: "text-gray-400", border: "border-gray-500/30" }
    }
  }

  const handleAction = async (id: string, action: "start" | "stop" | "restart" | "delete") => {
    if (action === "delete" && !confirm("Delete this server?")) return
    const token = localStorage.getItem("token")
    if (action === "delete") {
      await fetch(`/api/servers/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    } else {
      await fetch(`/api/servers/${id}/${action}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
    }
    setTimeout(fetchServers, 1000)
  }

  const filtered = servers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
  const runningCount = servers.filter((s) => s.status === "RUNNING").length
  const stoppedCount = servers.filter((s) => s.status === "STOPPED").length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
            <Server className="w-6 h-6" style={{ color: "var(--brand-primary)" }} />
            My Servers
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>
            Manage your Minecraft servers
          </p>
        </div>
        <button
          onClick={() => router.push("/servers/new")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all hover-lift btn-ripple"
          style={{ backgroundColor: "var(--brand-primary)", color: "white" }}
        >
          <Plus className="w-4 h-4" />
          Create Server
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 mb-6 animate-fade-in-up delay-100">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-status-pulse" />
          <span className="text-sm" style={{ color: "var(--brand-muted)" }}>
            <span className="font-semibold" style={{ color: "var(--brand-text)" }}>{runningCount}</span> Running
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="w-2 h-2 rounded-full bg-gray-400" />
          <span className="text-sm" style={{ color: "var(--brand-muted)" }}>
            <span className="font-semibold" style={{ color: "var(--brand-text)" }}>{stoppedCount}</span> Stopped
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 animate-fade-in-up delay-200">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--brand-muted)" }} />
        <input
          type="text"
          placeholder="Search servers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
        />
      </div>

      {/* Server list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 rounded-xl skeleton h-40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 rounded-xl animate-fade-in" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <Server className="w-16 h-16 mx-auto mb-4 animate-float" style={{ color: "var(--brand-primary)", opacity: 0.3 }} />
          <p className="text-lg font-medium" style={{ color: "var(--brand-muted)" }}>No servers found</p>
          <p className="text-sm mt-1" style={{ color: "var(--brand-muted)", opacity: 0.6 }}>Create your first server to get started</p>
          <button
            onClick={() => router.push("/servers/new")}
            className="mt-4 px-4 py-2 rounded-lg font-medium transition-all hover-lift"
            style={{ backgroundColor: "var(--brand-primary)", color: "white" }}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Create Server
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((server, idx) => {
            const status = statusColor(server.status)
            return (
              <div
                key={server.id}
                className="p-5 rounded-xl card-hover cursor-pointer animate-fade-in-up"
                style={{
                  backgroundColor: "var(--brand-card)",
                  border: `1px solid var(--brand-border)`,
                  animationDelay: `${idx * 80}ms`,
                  opacity: 0,
                  animationFillMode: "forwards",
                }}
                onClick={() => router.push(`/servers/${server.id}`)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate" style={{ color: "var(--brand-text)" }}>{server.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.text}`} style={{ backgroundColor: status.bg }}>
                      {server.status}
                    </span>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {server.status === "STOPPED" && (
                      <button onClick={() => handleAction(server.id, "start")} className="p-1.5 rounded-lg hover:bg-green-500/10 transition-colors" title="Start">
                        <Play className="w-3.5 h-3.5 text-green-400" />
                      </button>
                    )}
                    {server.status === "RUNNING" && (
                      <button onClick={() => handleAction(server.id, "stop")} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" title="Stop">
                        <Square className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    )}
                    {(server.status === "RUNNING" || server.status === "STOPPED") && (
                      <button onClick={() => handleAction(server.id, "restart")} className="p-1.5 rounded-lg hover:bg-yellow-500/10 transition-colors" title="Restart">
                        <RefreshCw className="w-3.5 h-3.5 text-yellow-400" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-sm" style={{ color: "var(--brand-muted)" }}>
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>{server.software} {server.mcVersion}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>{server.ram >= 1024 ? `${(server.ram / 1024).toFixed(0)} GB` : `${server.ram} MB`} RAM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{server.ip || "127.0.0.1"}:{server.port}</span>
                  </div>
                </div>

                {server.node && (
                  <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--brand-border)" }}>
                    <span className="text-xs" style={{ color: "var(--brand-muted)" }}>
                      {server.node.name} • {server.node.location}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
