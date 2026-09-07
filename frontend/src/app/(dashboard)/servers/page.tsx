"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Server, Plus, Search, Cpu, HardDrive, Globe, Play, Square, Trash2, RefreshCw, Loader2 } from "lucide-react"

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
      case "RUNNING": return { bg: "rgba(34,197,94,0.12)", color: "#22c55e", label: "Online" }
      case "STOPPED": return { bg: "rgba(239,68,68,0.12)", color: "#EF4444", label: "Offline" }
      case "STARTING": return { bg: "rgba(245,158,11,0.12)", color: "#F59E0B", label: "Starting" }
      default: return { bg: "rgba(239,68,68,0.12)", color: "#EF4444", label: "Error" }
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
    <div className="p-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
            <Server className="w-5 h-5" style={{ color: "var(--brand-primary)" }} /> My Servers
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--brand-muted)" }}>{servers.length} server{servers.length !== 1 ? "s" : ""} &middot; {running} running</p>
        </div>
        <button onClick={() => router.push("/servers/new")} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all hover-lift btn-ripple" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>
          <Plus className="w-3.5 h-3.5" /> Create Server
        </button>
      </div>

      <div className="relative mb-4 animate-fade-in-up delay-100">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--brand-muted)" }} />
        <input type="text" placeholder="Search servers..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg text-xs outline-none focus:ring-1" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[1, 2, 3].map((i) => <div key={i} className="p-5 rounded-xl skeleton h-36" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl animate-fade-in" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <Server className="w-12 h-12 mx-auto mb-3 animate-float" style={{ color: "var(--brand-primary)", opacity: 0.3 }} />
          <p className="text-sm font-medium" style={{ color: "var(--brand-muted)" }}>No servers found</p>
          <button onClick={() => router.push("/servers/new")} className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>Create Server</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((server, idx) => {
            const st = statusStyle(server.status)
            return (
              <div key={server.id} className="p-4 rounded-xl card-hover cursor-pointer animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", animationDelay: `${idx * 60}ms`, opacity: 0, animationFillMode: "forwards" }} onClick={() => router.push(`/servers/${server.id}`)}>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold truncate" style={{ color: "var(--brand-text)" }}>{server.name}</h3>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                    {server.status === "STOPPED" && <button onClick={() => handleAction(server.id, "start")} className="p-1.5 rounded hover:bg-green-500/10" title="Start"><Play className="w-3 h-3 text-green-400" /></button>}
                    {server.status === "RUNNING" && <button onClick={() => handleAction(server.id, "stop")} className="p-1.5 rounded hover:bg-red-500/10" title="Stop"><Square className="w-3 h-3 text-red-400" /></button>}
                    {(server.status === "RUNNING" || server.status === "STOPPED") && <button onClick={() => handleAction(server.id, "restart")} className="p-1.5 rounded hover:bg-yellow-500/10" title="Restart"><RefreshCw className="w-3 h-3 text-yellow-400" /></button>}
                    <button onClick={() => handleAction(server.id, "delete")} className="p-1.5 rounded hover:bg-red-500/10" title="Delete"><Trash2 className="w-3 h-3 text-red-400" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[11px]" style={{ color: "var(--brand-muted)" }}>
                  <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" /> {server.software} {server.mcVersion}</span>
                  <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> {server.ram >= 1024 ? `${(server.ram / 1024).toFixed(0)}G` : `${server.ram}M`}</span>
                  <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {server.ip || "127.0.0.1"}:{server.port}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
