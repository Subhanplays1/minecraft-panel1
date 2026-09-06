"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { Wifi, Copy, Check, ExternalLink, Play, Square, RotateCcw, Loader2, Terminal } from "lucide-react"
import toast from "react-hot-toast"

interface TunnelInfo {
  status: string
  claimLink: string | null
  logs: string
  hasSecret?: boolean
}

export default function TunnelPage() {
  const params = useParams()
  const id = params.id as string
  const [tunnel, setTunnel] = useState<TunnelInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState("")
  const [copied, setCopied] = useState(false)
  const [serverName, setServerName] = useState("")
  const logsRef = useRef<HTMLDivElement>(null)

  const fetchTunnel = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/playit`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setTunnel(await res.json())
    } catch {} finally { setLoading(false) }
  }

  const fetchServer = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setServerName(d.name) }
    } catch {}
  }

  useEffect(() => { fetchServer(); fetchTunnel() }, [id])

  useEffect(() => {
    if (tunnel?.status !== "running") return
    const interval = setInterval(fetchTunnel, 3000)
    return () => clearInterval(interval)
  }, [tunnel?.status])

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [tunnel?.logs])

  const handleAction = async (action: "start" | "stop" | "reset") => {
    setActionLoading(action)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/playit/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        toast.success(action === "start" ? "Tunnel starting..." : action === "stop" ? "Tunnel stopped" : "Tunnel reset")
        setTimeout(fetchTunnel, 2000)
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed")
      }
    } catch { toast.error("Failed") }
    finally { setActionLoading("") }
  }

  const copyAddress = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "transparent" }}><div className="animate-pulse" style={{ color: "var(--brand-muted)" }}>Loading...</div></div>

  const isRunning = tunnel?.status === "running"
  const connectAddress = tunnel?.claimLink
    ? tunnel.claimLink.replace("https://playit.gg/claim/", "") + ".playit.gg"
    : `${serverName.toLowerCase().replace(/\s+/g, "-")}.playit.gg`

  return (
    <div className="p-6" style={{ backgroundColor: "transparent" }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--brand-text)" }}><Wifi size={24} /> Playit Tunnel</h1>
          <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>Expose your server to the internet using playit.gg</p>
        </div>

        {/* Status Card */}
        <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: isRunning ? "var(--brand-success)" + "20" : "var(--brand-background)", border: `1px solid ${isRunning ? "var(--brand-success)" : "var(--brand-border)"}` }}>
                <Wifi size={24} style={{ color: isRunning ? "var(--brand-success)" : "var(--brand-muted)" }} />
              </div>
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>Tunnel Status</div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isRunning ? "var(--brand-success)" : "var(--brand-danger)" }} />
                  <span className="text-xs" style={{ color: isRunning ? "var(--brand-success)" : "var(--brand-muted)" }}>{isRunning ? "Running" : "Stopped"}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {!isRunning ? (
                <button onClick={() => handleAction("start")} disabled={actionLoading === "start"} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50" style={{ backgroundColor: "var(--brand-success)" }}>
                  {actionLoading === "start" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Start
                </button>
              ) : (
                <button onClick={() => handleAction("stop")} disabled={actionLoading === "stop"} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50" style={{ backgroundColor: "var(--brand-danger)" }}>
                  {actionLoading === "stop" ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />} Stop
                </button>
              )}
              <button onClick={() => handleAction("reset")} disabled={actionLoading === "reset"} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm disabled:opacity-50" style={{ backgroundColor: "var(--brand-background)", color: "var(--brand-muted)", border: "1px solid var(--brand-border)" }}>
                {actionLoading === "reset" ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Reset
              </button>
            </div>
          </div>

          {/* Connection Address */}
          {isRunning && (
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)" }}>
              <span className="text-sm" style={{ color: "var(--brand-muted)" }}>Address:</span>
              <code className="flex-1 text-sm font-mono" style={{ color: "var(--brand-text)" }}>{connectAddress}</code>
              <button onClick={() => copyAddress(connectAddress)} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: copied ? "var(--brand-success)" : "var(--brand-muted)" }}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          )}

          {/* Claim Link */}
          {tunnel?.claimLink && (
            <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: "var(--brand-primary)" + "10", border: `1px solid var(--brand-primary)` + "30" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium" style={{ color: "var(--brand-primary)" }}>Claim this tunnel:</div>
                  <a href={tunnel.claimLink} target="_blank" rel="noopener noreferrer" className="text-xs font-mono hover:underline" style={{ color: "var(--brand-primary)" }}>{tunnel.claimLink}</a>
                </div>
                <a href={tunnel.claimLink} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "var(--brand-primary)" }}>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Logs */}
        {tunnel?.logs && (
          <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Terminal size={16} style={{ color: "var(--brand-primary)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>Agent Logs</span>
            </div>
            <div ref={logsRef} className="max-h-64 overflow-y-auto p-3 rounded-lg font-mono text-xs whitespace-pre-wrap" style={{ backgroundColor: "var(--brand-background)", color: "var(--brand-muted)" }}>
              {tunnel.logs || "No logs yet..."}
            </div>
          </div>
        )}

        {/* Setup Info */}
        {!isRunning && !tunnel?.hasSecret && (
          <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: "var(--brand-text)" }}>How it works</h3>
            <ol className="space-y-3 text-sm" style={{ color: "var(--brand-muted)" }}>
              <li className="flex gap-3"><span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>1</span>Click Start to launch the playit agent</li>
              <li className="flex gap-3"><span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>2</span>Copy the claim link and open it in your browser</li>
              <li className="flex gap-3"><span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>3</span>Follow the instructions to claim the tunnel</li>
              <li className="flex gap-3"><span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>4</span>Share the address with your players!</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
