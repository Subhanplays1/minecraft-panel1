"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Wifi, Copy, Check, ExternalLink, Loader2, Settings } from "lucide-react"
import toast from "react-hot-toast"

interface TunnelInfo {
  enabled: boolean
  address: string
  port: number
  status: string
  claimUrl: string
}

export default function TunnelPage() {
  const params = useParams()
  const id = params.id as string
  const [tunnel, setTunnel] = useState<TunnelInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    fetch(`/api/servers/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setTunnel({
          enabled: false,
          address: `mc-${data.name?.toLowerCase().replace(/\s+/g, "-") || "server"}.playit.gg`,
          port: data.port || 25565,
          status: "Not configured",
          claimUrl: "https://playit.gg",
        })
      })
      .finally(() => setLoading(false))
  }, [id])

  const copyAddress = () => {
    if (tunnel?.address) {
      navigator.clipboard.writeText(tunnel.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "transparent" }}><div className="animate-pulse" style={{ color: "var(--brand-muted)" }}>Loading...</div></div>

  return (
    <div className="p-6" style={{ backgroundColor: "transparent" }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--brand-text)" }}><Wifi size={24} /> Playit Tunnel</h1>
          <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>Expose your server to the internet using Playit.gg tunnel</p>
        </div>

        <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: tunnel?.enabled ? "var(--brand-success)" + "20" : "var(--brand-card)", border: `1px solid ${tunnel?.enabled ? "var(--brand-success)" : "var(--brand-border)"}` }}>
                <Wifi size={24} style={{ color: tunnel?.enabled ? "var(--brand-success)" : "var(--brand-muted)" }} />
              </div>
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>Tunnel Status</div>
                <div className="text-xs" style={{ color: tunnel?.enabled ? "var(--brand-success)" : "var(--brand-muted)" }}>{tunnel?.status}</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm min-w-[80px]" style={{ color: "var(--brand-muted)" }}>Address</span>
              <code className="flex-1 px-3 py-2 rounded-lg text-sm font-mono" style={{ backgroundColor: "var(--brand-background)", color: "var(--brand-text)" }}>{tunnel?.address}</code>
              <button onClick={copyAddress} className="p-2 rounded-lg hover:bg-white/5" style={{ color: copied ? "var(--brand-success)" : "var(--brand-muted)" }}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm min-w-[80px]" style={{ color: "var(--brand-muted)" }}>Port</span>
              <code className="px-3 py-2 rounded-lg text-sm font-mono" style={{ backgroundColor: "var(--brand-background)", color: "var(--brand-text)" }}>{tunnel?.port}</code>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <h3 className="text-sm font-medium mb-3" style={{ color: "var(--brand-text)" }}>Setup Instructions</h3>
          <ol className="space-y-3 text-sm" style={{ color: "var(--brand-muted)" }}>
            <li className="flex gap-3"><span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>1</span>Download and install Playit.gg agent on your server</li>
            <li className="flex gap-3"><span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>2</span>Run the agent and claim your tunnel</li>
            <li className="flex gap-3"><span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>3</span>Configure the tunnel to forward to port {tunnel?.port}</li>
            <li className="flex gap-3"><span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>4</span>Share the address with your players!</li>
          </ol>
        </div>

        <a href="https://playit.gg/download" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>
          <ExternalLink size={16} /> Get Playit.gg
        </a>
      </div>
    </div>
  )
}
