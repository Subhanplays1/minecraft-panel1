"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Server, Plus, Search, HardDrive, Globe, Play, Square, Trash2, RefreshCw, Terminal } from "lucide-react"

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
    <div className="p-5 md:p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[17px] font-semibold flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
            Servers
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--brand-muted)" }}>
            {servers.length} server{servers.length !== 1 ? "s" : ""} &middot; {running} running
          </p>
        </div>
        <button onClick={() => router.push("/servers/new")} className="btn-primary text-[12px]">
          <Plus size={14} strokeWidth={2} /> Create Server
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--brand-muted)" }} />
        <input
          type="text"
          placeholder="Search servers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9 pr-3 py-2 text-[12px]"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl skeleton h-[140px]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#1a1a1a", border: "1px solid #222" }}>
            <Server className="w-5 h-5" style={{ color: "var(--brand-muted)", opacity: 0.3 }} strokeWidth={1.5} />
          </div>
          <p className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>No servers found</p>
          <p className="text-[11px] mt-1 mb-4" style={{ color: "var(--brand-muted)" }}>Create your first server to get started</p>
          <button onClick={() => router.push("/servers/new")} className="btn-primary text-[12px]">
            <Plus size={13} strokeWidth={2} /> Create Server
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((server) => (
            <div
              key={server.id}
              className="group flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-150 hover:bg-white/[0.02]"
              style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}
              onClick={() => router.push(`/servers/${server.id}`)}
            >
              {/* Left */}
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#1a1a1a", border: "1px solid #222" }}>
                  <Server size={15} strokeWidth={1.5} style={{ color: "#888" }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>{server.name}</h3>
                    <span className="flex items-center gap-1">
                      <span className={`status-dot ${server.status === "RUNNING" ? "running" : server.status === "STOPPED" ? "stopped" : "starting"}`} />
                      <span className="text-[10px] font-medium" style={{ color: "var(--brand-muted)" }}>{server.status.toLowerCase()}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: "var(--brand-muted)" }}>
                    <span className="flex items-center gap-1"><HardDrive size={10} strokeWidth={1.5} /> {server.software} {server.mcVersion}</span>
                    <span className="flex items-center gap-1"><Globe size={10} strokeWidth={1.5} /> {server.ip || "127.0.0.1"}:{server.port}</span>
                    <span className="hidden sm:flex items-center gap-1">RAM {server.ram >= 1024 ? `${(server.ram / 1024).toFixed(0)} GB` : `${server.ram} MB`}</span>
                  </div>
                </div>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                {server.status === "STOPPED" && (
                  <button onClick={() => handleAction(server.id, "start")} className="btn-ghost text-[11px]">
                    <Play size={12} strokeWidth={1.5} /> Start
                  </button>
                )}
                {server.status === "RUNNING" && (
                  <>
                    <button onClick={() => router.push(`/servers/${server.id}`)} className="btn-ghost text-[11px]">
                      <Terminal size={12} strokeWidth={1.5} /> Console
                    </button>
                    <button onClick={() => handleAction(server.id, "stop")} className="btn-ghost text-[11px]">
                      <Square size={12} strokeWidth={1.5} /> Stop
                    </button>
                  </>
                )}
                {(server.status === "STARTING" || server.status === "ERROR") && (
                  <span className="flex items-center gap-1.5 px-2 py-1 text-[11px]" style={{ color: "var(--brand-muted)" }}>
                    <RefreshCw size={11} strokeWidth={1.5} className="animate-spin" /> {server.status.toLowerCase()}
                  </span>
                )}
                <button onClick={() => handleAction(server.id, "delete")} className="btn-ghost text-[11px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--brand-muted)" }}>
                  <Trash2 size={12} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
