"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Copy, Check, Link2, Terminal } from "lucide-react"

interface SFTPInfo {
  host: string
  port: number
  username: string
  password: string
  path: string
}

export default function SFTPPage() {
  const params = useParams()
  const id = params.id as string
  const [sftp, setSftp] = useState<SFTPInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("token")
    fetch(`/api/servers/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setSftp({
          host: "127.0.0.1",
          port: 22,
          username: data.sftpUser || data.name?.toLowerCase().replace(/\s+/g, "-") || "server",
          password: "Use your panel password",
          path: "/home/container",
        })
      })
      .finally(() => setLoading(false))
  }, [id])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(""), 2000)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "transparent" }}><div className="animate-pulse" style={{ color: "var(--brand-muted)" }}>Loading...</div></div>

  return (
    <div className="p-6" style={{ backgroundColor: "transparent" }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--brand-text)" }}><Link2 size={24} /> SFTP Details</h1>
          <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>Connect via SFTP to manage your server files</p>
        </div>

        <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="flex items-center gap-2 mb-3" style={{ color: "var(--brand-primary)" }}>
            <Terminal size={16} />
            <span className="text-sm font-medium">Connection Details</span>
          </div>
          <div className="space-y-3">
            {sftp && [
              { label: "Host", value: sftp.host, field: "host" },
              { label: "Port", value: String(sftp.port), field: "port" },
              { label: "Username", value: sftp.username, field: "username" },
              { label: "Password", value: sftp.password, field: "password" },
              { label: "Path", value: sftp.path, field: "path" },
            ].map(({ label, value, field }) => (
              <div key={field} className="flex items-center gap-3">
                <span className="text-sm min-w-[80px]" style={{ color: "var(--brand-muted)" }}>{label}</span>
                <div className="flex-1 flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg text-sm font-mono" style={{ backgroundColor: "var(--brand-background)", color: "var(--brand-text)" }}>{value}</code>
                  <button onClick={() => copyToClipboard(value, field)} className="p-2 rounded-lg hover:bg-white/5" style={{ color: copied === field ? "var(--brand-success)" : "var(--brand-muted)" }}>
                    {copied === field ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <h3 className="text-sm font-medium mb-2" style={{ color: "var(--brand-text)" }}>Recommended SFTP Clients</h3>
          <div className="space-y-2">
            {["FileZilla", "WinSCP", "Cyberduck", "VS Code (Remote - SSH)"].map(client => (
              <div key={client} className="flex items-center gap-2 text-sm" style={{ color: "var(--brand-muted)" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--brand-primary)" }} />
                {client}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
