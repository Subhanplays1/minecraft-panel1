"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Server, Plus, Search, Cpu, HardDrive, Globe, Play, Square, Trash2, RefreshCw, ChevronRight, Terminal } from "lucide-react"

interface ServerData { id: string; name: string; status: "RUNNING" | "STOPPED" | "STARTING" | "ERROR"; software: string; mcVersion: string; ram: number; cpu: number; ip: string | null; port: number; createdAt: string; node?: { name: string; location: string } }

export default function ServersPage() {
  const router = useRouter()
  const [servers, setServers] = useState<ServerData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const fetchServers = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/servers", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setServers(Array.isArray(d) ? d : []) }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchServers() }, [])

  const statusStyle = (s: string) => {
    switch (s) {
      case "RUNNING": return { bg: "rgba(16,185,129,0.15)", color: "#10b981", label: "Online", dot: "#10b981" }
      case "STOPPED": return { bg: "rgba(239,68,68,0.15)", color: "#EF4444", label: "Offline", dot: "#EF4444" }
      case "STARTING": return { bg: "rgba(245,158,11,0.15)", color: "#F59E0B", label: "Starting", dot: "#F59E0B" }
      default: return { bg: "rgba(239,68,68,0.15)", color: "#EF4444", label: "Error", dot: "#EF4444" }
    }
  }

  const handleAction = async (id: string, action: "start" | "stop" | "restart" | "delete") => {
    if (action === "delete" && !confirm("Delete this server permanently?")) return
    const token = localStorage.getItem("token")
    if (action === "delete") await fetch(`/api/servers/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    else await fetch(`/api/servers/${id}/${action}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
    setTimeout(fetchServers, 1500)
  }

  const filtered = servers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
  const running = servers.filter((s) => s.status === "RUNNING").length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
            <Server size={20} style={{ color: "var(--brand-primary)" }} /> Servers
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--brand-muted)" }}>
            {servers.length} server{servers.length !== 1 ? "s" : ""} &middot; {running} running
          </p>
        </div>
        <button onClick={() => router.push("/servers/new")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity" style={{ backgroundColor: "var(--brand-text)", color: "var(--brand-background)" }}>
          <Plus size={16} /> Create Server
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--brand-muted)" }} />
        <input type="text" placeholder="Search servers..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none focus:ring-2 transition-all" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-text)", "--tw-ring-color": "var(--brand-primary)" } as any} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 rounded-2xl animate-pulse" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
              <div className="h-5 w-32 rounded mb-3" style={{ backgroundColor: "var(--brand-border)" }} />
              <div className="h-3 w-48 rounded mb-2" style={{ backgroundColor: "var(--brand-border)" }} />
              <div className="h-3 w-36 rounded" style={{ backgroundColor: "var(--brand-border)" }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--brand-background)" }}>
            <Server className="w-10 h-10" style={{ color: "var(--brand-muted)", opacity: 0.3 }} />
          </div>
          <p className="text-base font-semibold mb-1" style={{ color: "var(--brand-text)" }}>No servers found</p>
          <p className="text-sm mb-5" style={{ color: "var(--brand-muted)" }}>Create your first Minecraft server to get started</p>
          <button onClick={() => router.push("/servers/new")} className="px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity" style={{ backgroundColor: "var(--brand-text)", color: "var(--brand-background)" }}>
            <Plus size={14} className="inline mr-2 -mt-0.5" /> Create Server
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((server) => {
            const st = statusStyle(server.status)
            return (
              <div key={server.id} className="group p-5 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02]" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }} onClick={() => router.push(`/servers/${server.id}`)}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: st.bg }}>
                        <Server size={20} style={{ color: st.color }} />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ backgroundColor: st.dot, borderColor: "var(--brand-card)" }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold" style={{ color: "var(--brand-text)" }}>{server.name}</h3>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium mt-0.5" style={{ color: st.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.dot }} />
                        {st.label}
                      </span>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleAction(server.id, "delete") }} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all">
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--brand-muted)" }}>
                    <HardDrive size={12} /> {server.software} {server.mcVersion}
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--brand-muted)" }}>
                    <Globe size={12} /> {server.ip || "127.0.0.1"}:{server.port}
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--brand-muted)" }}>
                    <Cpu size={12} /> {server.ram >= 1024 ? `${(server.ram / 1024).toFixed(0)} GB` : `${server.ram} MB`} RAM
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  {server.status === "STOPPED" && (
                    <button onClick={() => handleAction(server.id, "start")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                      <Play size={12} /> Start
                    </button>
                  )}
                  {server.status === "RUNNING" && (
                    <>
                      <button onClick={() => router.push(`/servers/${server.id}`)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
                        <Terminal size={12} /> Console
                      </button>
                      <button onClick={() => handleAction(server.id, "stop")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                        <Square size={12} /> Stop
                      </button>
                    </>
                  )}
                  {(server.status === "STARTING" || server.status === "ERROR") && (
                    <div className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-yellow-500/10 text-yellow-400">
                      <RefreshCw size={12} className="animate-spin" /> {server.status}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
