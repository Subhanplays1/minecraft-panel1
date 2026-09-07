"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { Play, Square, RotateCcw, Send, Loader2, Terminal, HardDrive, Cpu, FolderOpen, Hash } from "lucide-react"

interface ServerInfo {
  id: string
  name: string
  status: "RUNNING" | "STOPPED" | "STARTING" | "ERROR"
  software: string
  mcVersion: string
  ram: number
  cpu: number
  disk: number
  port: number
}

export default function ServerConsolePage() {
  const params = useParams()
  const id = params.id as string
  const [server, setServer] = useState<ServerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [consoleLogs, setConsoleLogs] = useState<string[]>([])
  const [command, setCommand] = useState("")
  const consoleRef = useRef<HTMLDivElement>(null)
  const [actionLoading, setActionLoading] = useState("")

  const fetchServer = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const data = await res.json(); setServer(data) }
    } catch {} finally { setLoading(false) }
  }

  const fetchConsole = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/console`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const data = await res.json(); setConsoleLogs(data.logs || []) }
    } catch {}
  }

  const sendAction = async (action: "start" | "stop" | "restart") => {
    setActionLoading(action)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/${action}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        const data = await res.json()
        setConsoleLogs((prev) => [...prev, `[ERROR] ${data.error || action + " failed"}`])
      }
      setTimeout(fetchServer, 2000)
      setTimeout(fetchConsole, 2500)
    } catch { setConsoleLogs((prev) => [...prev, `[ERROR] Failed to ${action} server`]) } finally { setActionLoading("") }
  }

  const sendCommand = async () => {
    if (!command.trim()) return
    setConsoleLogs((prev) => [...prev, `> ${command}`])
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ command }),
      })
      const data = await res.json()
      if (!res.ok) {
        setConsoleLogs((prev) => [...prev, `[ERROR] ${data.error || "Command failed"}`])
      }
    } catch {
      setConsoleLogs((prev) => [...prev, "[ERROR] Failed to send command"])
    }
    setCommand("")
  }

  useEffect(() => { fetchServer() }, [id])
  useEffect(() => { if (server?.status === "RUNNING") fetchConsole() }, [server?.status])
  useEffect(() => { const t = setInterval(fetchConsole, 3000); return () => clearInterval(t) }, [id])
  useEffect(() => { if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight }, [consoleLogs])

  const statusInfo = (status: string) => {
    switch (status) {
      case "RUNNING": return { color: "#22c55e", bg: "rgba(34,197,94,0.12)", label: "Online", dot: true }
      case "STOPPED": return { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "Offline", dot: true }
      case "STARTING": return { color: "#eab308", bg: "rgba(234,179,8,0.12)", label: "Starting", dot: true }
      default: return { color: "#6b7280", bg: "rgba(107,114,128,0.12)", label: status, dot: false }
    }
  }

  if (loading) return <div className="p-6 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--brand-primary)" }} /></div>
  if (!server) return <div className="p-6 text-center" style={{ color: "var(--brand-muted)" }}>Server not found</div>

  const si = statusInfo(server.status)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Status bar */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: si.color }} />
            <span className="text-sm font-semibold" style={{ color: si.color }}>{si.label}</span>
          </div>
          <span className="text-xs px-2 py-1 rounded-md" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-muted)" }}>
            {server.software} {server.mcVersion}
          </span>
        </div>
        <div className="flex gap-2">
          {server.status !== "RUNNING" && (
            <button onClick={() => sendAction("start")} disabled={!!actionLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover-lift disabled:opacity-50" style={{ backgroundColor: "#22c55e", color: "white" }}>
              {actionLoading === "start" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Start
            </button>
          )}
          {server.status === "RUNNING" && (
            <>
              <button onClick={() => sendAction("stop")} disabled={!!actionLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover-lift disabled:opacity-50" style={{ backgroundColor: "#ef4444", color: "white" }}>
                {actionLoading === "stop" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />} Stop
              </button>
              <button onClick={() => sendAction("restart")} disabled={!!actionLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover-lift disabled:opacity-50" style={{ backgroundColor: "#eab308", color: "white" }}>
                {actionLoading === "restart" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Restart
              </button>
            </>
          )}
        </div>
      </div>

      {/* Resource cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-fade-in-up">
        {[
          { label: "RAM", value: `${(server.ram / 1024).toFixed(0)} GB`, icon: <HardDrive className="w-4 h-4" /> },
          { label: "CPU", value: `${server.cpu}%`, icon: <Cpu className="w-4 h-4" /> },
          { label: "Disk", value: `${(server.disk / 1024).toFixed(0)} GB`, icon: <FolderOpen className="w-4 h-4" /> },
          { label: "Port", value: String(server.port), icon: <Hash className="w-4 h-4" /> },
        ].map((item, i) => (
          <div key={i} className="p-3 rounded-lg flex items-center gap-3 card-hover" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(124,58,237,0.12)", color: "var(--brand-primary)" }}>{item.icon}</div>
            <div>
              <div className="text-xs" style={{ color: "var(--brand-muted)" }}>{item.label}</div>
              <div className="font-semibold text-sm" style={{ color: "var(--brand-text)" }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Console */}
      <div className="rounded-xl overflow-hidden animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--brand-border)" }}>
          <Terminal className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>Console</span>
        </div>
        <div
          ref={consoleRef}
          className="h-[500px] overflow-y-auto p-4 font-mono text-sm leading-relaxed"
          style={{ backgroundColor: "#0a0e14", color: "#c5cdd9" }}
        >
          {consoleLogs.length === 0 && <p style={{ color: "#4a5568" }}>Waiting for server output...</p>}
          {consoleLogs.map((log, i) => (
            <div key={i} className={
              log.startsWith(">") ? "text-emerald-400" :
              log.includes("ERROR") || log.includes("error") ? "text-red-400" :
              log.includes("WARN") ? "text-amber-400" :
              log.includes("[INFO]") ? "text-sky-400" : ""
            }>
              {log}
            </div>
          ))}
        </div>
        <div className="p-3 flex gap-2" style={{ borderTop: "1px solid var(--brand-border)" }}>
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendCommand()}
            placeholder="Type a command..."
            className="flex-1 px-3 py-2 rounded-lg font-mono text-sm outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
            style={{ backgroundColor: "#0a0e14", border: "1px solid #1e293b", color: "#c5cdd9" }}
          />
          <button onClick={sendCommand} className="px-4 py-2 rounded-lg transition-all hover-lift btn-ripple flex items-center gap-2" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>
            <Send className="w-4 h-4" /> Send
          </button>
        </div>
      </div>
    </div>
  )
}
