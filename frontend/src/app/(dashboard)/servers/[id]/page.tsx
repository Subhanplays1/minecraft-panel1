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

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>
  if (!server) return <div className="p-5 text-center text-[12px]" style={{ color: "var(--brand-muted)" }}>Server not found</div>

  const statusLabel = { RUNNING: "Running", STOPPED: "Stopped", STARTING: "Starting", ERROR: "Error" }[server.status] || server.status

  return (
    <div className="p-5 md:p-6 max-w-[1200px] mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`status-dot ${server.status === "RUNNING" ? "running" : server.status === "STOPPED" ? "stopped" : "starting"}`} />
            <span className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>{statusLabel}</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "#1a1a1a", border: "1px solid #222", color: "var(--brand-muted)" }}>
            {server.software} {server.mcVersion}
          </span>
        </div>
        <div className="flex gap-1.5">
          {server.status !== "RUNNING" && (
            <button onClick={() => sendAction("start")} disabled={!!actionLoading} className="btn-primary text-[11px] py-1.5 px-3 disabled:opacity-40">
              {actionLoading === "start" ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} /> : <Play className="w-3 h-3" strokeWidth={2} />} Start
            </button>
          )}
          {server.status === "RUNNING" && (
            <>
              <button onClick={() => sendAction("stop")} disabled={!!actionLoading} className="btn-secondary text-[11px] py-1.5 px-3 disabled:opacity-40">
                {actionLoading === "stop" ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} /> : <Square className="w-3 h-3" strokeWidth={2} />} Stop
              </button>
              <button onClick={() => sendAction("restart")} disabled={!!actionLoading} className="btn-secondary text-[11px] py-1.5 px-3 disabled:opacity-40">
                {actionLoading === "restart" ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} /> : <RotateCcw className="w-3 h-3" strokeWidth={2} />} Restart
              </button>
            </>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[
          { label: "RAM", value: `${(server.ram / 1024).toFixed(0)} GB`, icon: <HardDrive size={13} strokeWidth={1.5} /> },
          { label: "CPU", value: `${server.cpu}%`, icon: <Cpu size={13} strokeWidth={1.5} /> },
          { label: "Port", value: String(server.port), icon: <Globe size={13} strokeWidth={1.5} /> },
          { label: "Address", value: server.ip || "127.0.0.1", icon: <Copy size={13} strokeWidth={1.5} /> },
        ].map((c, i) => (
          <div key={i} className="p-3 rounded-lg flex items-center gap-2.5" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <span style={{ color: "var(--brand-muted)", opacity: 0.5 }}>{c.icon}</span>
            <div>
              <div className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>{c.label}</div>
              <div className="text-[12px] font-medium mt-0.5" style={{ color: "var(--brand-text)" }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Console */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="px-3.5 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid var(--brand-border)" }}>
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
            <span className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>Console</span>
            <span className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{consoleLogs.length} lines</span>
          </div>
          <button onClick={copyLogs} className="btn-ghost text-[10px]">
            {copied ? <><Check className="w-3 h-3" strokeWidth={2} /> Copied</> : <><Copy className="w-3 h-3" strokeWidth={2} /> Copy</>}
          </button>
        </div>
        <div ref={consoleRef} className="h-[420px] overflow-y-auto p-3 font-mono text-[11px] leading-relaxed" style={{ backgroundColor: "#0a0a0a", color: "#b0b0b0" }}>
          {consoleLogs.length === 0 && <p style={{ color: "#444" }}>Waiting for server output...</p>}
          {consoleLogs.map((log, i) => (
            <div key={i} className={log.startsWith(">") ? "text-white" : log.includes("ERROR") || log.includes("error") ? "text-[#888]" : log.includes("WARN") ? "text-[#777]" : log.includes("[INFO]") ? "text-[#999]" : ""}>
              {log}
            </div>
          ))}
        </div>
        <div className="p-2.5 flex gap-2" style={{ borderTop: "1px solid var(--brand-border)" }}>
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendCommand()}
            placeholder="Type a command..."
            className="flex-1 px-3 py-1.5 rounded-lg font-mono text-[11px] outline-none"
            style={{ backgroundColor: "#0a0a0a", border: "1px solid #1a1a1a", color: "var(--brand-text)" }}
          />
          <button onClick={sendCommand} className="btn-primary text-[11px] py-1.5 px-3">
            <Send className="w-3 h-3" strokeWidth={2} /> Send
          </button>
        </div>
      </div>
    </div>
  )
}
