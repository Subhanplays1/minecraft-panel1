"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Copy, Check, Link2, Terminal, RefreshCw, Info } from "lucide-react"
import toast from "react-hot-toast"

interface SFTPInfo {
  host: string
  port: number
  username: string
  password: string
  serverPath: string
  note: string
}

export default function SFTPPage() {
  const params = useParams()
  const id = params.id as string
  const [sftp, setSftp] = useState<SFTPInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState("")

  const fetchSftp = () => {
    setLoading(true)
    const token = localStorage.getItem("token")
    fetch(`/api/servers/${id}/sftp`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.error) { toast.error(data.error); return }
        setSftp(data)
      })
      .catch(() => toast.error("Failed to load SFTP info"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchSftp() }, [id])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(""), 2000)
    toast.success(`Copied ${field}`)
  }

  const copyConnectionString = () => {
    if (!sftp) return
    const conn = `${sftp.username}@${sftp.host}`
    navigator.clipboard.writeText(conn)
    setCopied("connection")
    setTimeout(() => setCopied(""), 2000)
    toast.success("Copied connection string")
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "transparent" }}>
      <div className="text-center">
        <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin" style={{ color: "var(--brand-muted)" }} />
        <p className="text-xs" style={{ color: "var(--brand-muted)" }}>Loading SFTP details...</p>
      </div>
    </div>
  )

  return (
    <div className="p-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
            <Link2 size={20} strokeWidth={1.5} /> SFTP Access
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--brand-muted)" }}>
            Connect via any SFTP client to manage your server files
          </p>
        </div>
        <button onClick={fetchSftp} className="btn-ghost text-[11px]">
          <RefreshCw size={13} strokeWidth={1.5} /> Refresh
        </button>
      </div>

      {/* Connection Details */}
      <div className="rounded-xl p-5 mb-4 animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="flex items-center gap-2 mb-4" style={{ color: "var(--brand-text)" }}>
          <Terminal size={16} strokeWidth={1.5} />
          <span className="text-[13px] font-semibold">Connection Details</span>
        </div>

        {sftp && (
          <div className="space-y-3">
            {[
              { label: "Host", value: sftp.host, field: "host", desc: "Server address" },
              { label: "Port", value: String(sftp.port), field: "port", desc: "SFTP port" },
              { label: "Username", value: sftp.username, field: "username", desc: "Your panel email" },
              { label: "Password", value: "Your panel password", field: "password", desc: "Same as your login" },
            ].map(({ label, value, field, desc }) => (
              <div key={field} className="flex items-center gap-3">
                <span className="text-xs min-w-[70px]" style={{ color: "var(--brand-muted)" }}>{label}</span>
                <div className="flex-1 flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg text-[13px] font-mono truncate" style={{ backgroundColor: "var(--brand-background)", color: "var(--brand-text)", border: "1px solid var(--brand-border)" }}>
                    {value}
                  </code>
                  <button
                    onClick={() => copyToClipboard(value, field)}
                    className="p-2 rounded-lg transition-colors hover:bg-white/5"
                    style={{ color: copied === field ? "#22C55E" : "var(--brand-muted)" }}
                  >
                    {copied === field ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Connect String */}
      {sftp && (
        <div className="rounded-xl p-4 mb-4 animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>Quick Connect</span>
            <button onClick={copyConnectionString} className="btn-ghost text-[11px]">
              {copied === "connection" ? <Check size={12} /> : <Copy size={12} />} Copy
            </button>
          </div>
          <code className="block px-3 py-2 rounded-lg text-[12px] font-mono" style={{ backgroundColor: "var(--brand-background)", color: "var(--brand-muted)", border: "1px solid var(--brand-border)" }}>
            sftp {sftp.username}@{sftp.host} -P {sftp.port}
          </code>
        </div>
      )}

      {/* Info Banner */}
      <div className="rounded-xl p-4 mb-4 animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="flex items-start gap-3">
          <Info size={16} className="mt-0.5 flex-shrink-0" style={{ color: "var(--brand-muted)" }} />
          <div className="text-[12px] leading-relaxed" style={{ color: "var(--brand-muted)" }}>
            <p className="mb-1"><strong style={{ color: "var(--brand-text)" }}>How it works:</strong> Use your panel email and password to log in. Your files are accessible from the server root directory.</p>
            <p>You can use any SFTP client — FileZilla, WinSCP, Cyberduck, or the command line.</p>
          </div>
        </div>
      </div>

      {/* Supported Clients */}
      <div className="rounded-xl p-4 animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <h3 className="text-[13px] font-semibold mb-3" style={{ color: "var(--brand-text)" }}>Supported SFTP Clients</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { name: "FileZilla", desc: "Most popular, free", url: "https://filezilla-project.org" },
            { name: "WinSCP", desc: "Windows native", url: "https://winscp.net" },
            { name: "Cyberduck", desc: "macOS & Windows", url: "https://cyberduck.io" },
            { name: "VS Code", desc: "Remote - SSH extension", url: "https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh" },
          ].map((client) => (
            <a
              key={client.name}
              href={client.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-white/[0.03]"
              style={{ border: "1px solid var(--brand-border)" }}
            >
              <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--brand-background)" }}>
                <Terminal size={14} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
              </div>
              <div>
                <div className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>{client.name}</div>
                <div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{client.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Setup Instructions for FileZilla */}
      <div className="rounded-xl p-4 mt-4 animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <h3 className="text-[13px] font-semibold mb-3" style={{ color: "var(--brand-text)" }}>FileZilla Setup</h3>
        <ol className="space-y-2 text-[12px] list-decimal list-inside" style={{ color: "var(--brand-muted)" }}>
          <li>Open FileZilla and go to <code className="px-1.5 py-0.5 rounded text-[11px]" style={{ backgroundColor: "var(--brand-background)", color: "var(--brand-text)" }}>File &gt; Site Manager</code></li>
          <li>Click <strong style={{ color: "var(--brand-text)" }}>New Site</strong> and name it &quot;Minevo&quot;</li>
          <li>Set Protocol to <strong style={{ color: "var(--brand-text)" }}>SFTP</strong></li>
          <li>Enter the Host and Port from above</li>
          <li>Set Logon Type to <strong style={{ color: "var(--brand-text)" }}>Normal</strong></li>
          <li>Enter your panel email as Username and your panel password</li>
          <li>Click <strong style={{ color: "var(--brand-text)" }}>Connect</strong></li>
        </ol>
      </div>
    </div>
  )
}
