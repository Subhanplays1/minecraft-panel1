"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { Play, Square, RotateCcw, Send, Loader2, Terminal, Cpu, HardDrive, Globe, Copy, Check } from "lucide-react"

interface ServerInfo { id: string; name: string; status: "RUNNING" | "STOPPED" | "STARTING" | "ERROR"; software: string; mcVersion: string; ram: number; cpu: number; disk: number; port: number; ip: string | null }

export default function ServerConsolePage() {
  const params = useParams()
  const id = params.id as string
  const [server, setServer] = useState<ServerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [consoleLogs, setConsoleLogs] = useState<string[]>([])
  const [command, setCommand] = useState("")
  const consoleRef = useRef<HTMLDivElement>(null)
  const [actionLoading, setActionLoading] = useState("")
  const [copied, setCopied] = useState(false)

  const fetchServer = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setServer(d) }
    } catch {} finally { setLoading(false) }
  }

  const fetchConsole = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/console`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setConsoleLogs(d.logs || []) }
    } catch {}
  }

  const sendAction = async (action: "start" | "stop" | "restart") => {
    setActionLoading(action)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/${action}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) { const d = await res.json(); setConsoleLogs((p) => [...p, `[ERROR] ${d.error || action + " failed"}`]) }
      setTimeout(fetchServer, 2000); setTimeout(fetchConsole, 2500)
    } catch { setConsoleLogs((p) => [...p, `[ERROR] Failed to ${action}`]) } finally { setActionLoading("") }
  }

  const sendCommand = async () => {
    if (!command.trim()) return
    setConsoleLogs((p) => [...p, `> ${command}`])
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/command`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ command }) })
      const d = await res.json()
      if (!res.ok) setConsoleLogs((p) => [...p, `[ERROR] ${d.error || "Failed"}`])
    } catch { setConsoleLogs((p) => [...p, "[ERROR] Failed to send"]) }
    setCommand("")
  }

  const copyLogs = () => { navigator.clipboard.writeText(consoleLogs.join("\n")); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  useEffect(() => { fetchServer() }, [id])
  useEffect(() => { if (server?.status === "RUNNING") fetchConsole() }, [server?.status])
  useEffect(() => { const t = setInterval(fetchConsole, 2000); return () => clearInterval(t) }, [id])
  useEffect(() => { if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight }, [consoleLogs])

  if (loading) return <div className="p-6 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--brand-primary)" }} /></div>
  if (!server) return <div className="p-6 text-center text-sm" style={{ color: "var(--brand-muted)" }}>Server not found</div>

  const st = { RUNNING: { color: "#22c55e", label: "Online" }, STOPPED: { color: "#EF4444", label: "Offline" }, STARTING: { color: "#F59E0B", label: "Starting" }, ERROR: { color: "#EF4444", label: "Error" } }[server.status] || { color: "#6B7280", label: server.status }

  return (
    <div className="p-5 max-w-6xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: st.color }} />
            <span className="text-xs font-semibold" style={{ color: st.color }}>{st.label}</span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-muted)" }}>{server.software} {server.mcVersion}</span>
        </div>
        <div className="flex gap-1.5">
          {server.status !== "RUNNING" && <button onClick={() => sendAction("start")} disabled={!!actionLoading} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover-lift disabled:opacity-50" style={{ backgroundColor: "#22c55e", color: "white" }}>{actionLoading === "start" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Start</button>}
          {server.status === "RUNNING" && <>
            <button onClick={() => sendAction("stop")} disabled={!!actionLoading} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover-lift disabled:opacity-50" style={{ backgroundColor: "#EF4444", color: "white" }}>{actionLoading === "stop" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />} Stop</button>
            <button onClick={() => sendAction("restart")} disabled={!!actionLoading} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover-lift disabled:opacity-50" style={{ backgroundColor: "#F59E0B", color: "white" }}>{actionLoading === "restart" ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} Restart</button>
          </>}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        {[
          { label: "RAM", value: `${(server.ram / 1024).toFixed(0)} GB`, icon: <HardDrive size={14} /> },
          { label: "CPU", value: `${server.cpu}%`, icon: <Cpu size={14} /> },
          { label: "Port", value: String(server.port), icon: <Globe size={14} /> },
          { label: "Address", value: server.ip || "127.0.0.1", icon: <Copy size={14} /> },
        ].map((c, i) => (
          <div key={i} className="p-3 rounded-lg flex items-center gap-2.5" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="p-1.5 rounded" style={{ backgroundColor: "rgba(99,102,241,0.12)", color: "var(--brand-primary)" }}>{c.icon}</div>
            <div>
              <div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{c.label}</div>
              <div className="text-xs font-semibold" style={{ color: "var(--brand-text)" }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Console */}
      <div className="rounded-xl overflow-hidden animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--brand-border)" }}>
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5" style={{ color: "var(--brand-primary)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--brand-text)" }}>Console</span>
            <span className="text-[10px]" style={{ color: "var(--brand-muted)" }}>({consoleLogs.length} lines)</span>
          </div>
          <button onClick={copyLogs} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] hover:bg-white/5" style={{ color: "var(--brand-muted)" }}>
            {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
          </button>
        </div>
        <div ref={consoleRef} className="h-[450px] overflow-y-auto p-3 font-mono text-[11px] leading-relaxed" style={{ backgroundColor: "#0D1117", color: "#C9D1D9" }}>
          {consoleLogs.length === 0 && <p style={{ color: "#484F58" }}>Waiting for server output...</p>}
          {consoleLogs.map((log, i) => (
            <div key={i} className={log.startsWith(">") ? "text-emerald-400" : log.includes("ERROR") || log.includes("error") ? "text-red-400" : log.includes("WARN") ? "text-amber-400" : log.includes("[INFO]") ? "text-sky-400" : ""}>
              {log}
            </div>
          ))}
        </div>
        <div className="p-2.5 flex gap-2" style={{ borderTop: "1px solid var(--brand-border)" }}>
          <input value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendCommand()} placeholder="Type a command..." className="flex-1 px-3 py-1.5 rounded-lg font-mono text-xs outline-none" style={{ backgroundColor: "#0D1117", border: "1px solid #21262D", color: "#C9D1D9" }} />
          <button onClick={sendCommand} className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all hover-lift" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>
            <Send className="w-3 h-3" /> Send
          </button>
        </div>
      </div>
    </div>
  )
}
