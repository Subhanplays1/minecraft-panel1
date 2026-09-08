"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, Download, Copy, Check, FileCode } from "lucide-react"

interface DockerData { compose: string; dockerfile: string; serverName: string }

export default function ExportPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<DockerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState("")
  const [tab, setTab] = useState<"compose" | "dockerfile">("compose")

  useEffect(() => {
    const fetchDocker = async () => {
      try {
        const token = localStorage.getItem("token")
        const res = await fetch(`/api/servers/${id}/docker`, { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) setData(await res.json())
      } catch {} finally { setLoading(false) }
    }
    fetchDocker()
  }, [id])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(""), 2000)
  }

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>
  if (!data) return <div className="p-5 text-center text-[12px]" style={{ color: "var(--brand-muted)" }}>No data</div>

  const content = tab === "compose" ? data.compose : data.dockerfile
  const filename = tab === "compose" ? "docker-compose.yml" : "Dockerfile"

  return (
    <div className="p-5 md:p-6 max-w-[900px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Export as Docker</h1>
          <p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Generate Docker config for {data.serverName}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => downloadFile(content, filename)} className="btn-primary text-[11px] py-1.5 px-3">
            <Download className="w-3 h-3" strokeWidth={2} /> Download
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {(["compose", "dockerfile"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`text-[11px] py-1.5 px-3 rounded-lg ${tab === t ? "btn-primary" : "btn-ghost"}`}>
            {t === "compose" ? "docker-compose.yml" : "Dockerfile"}
          </button>
        ))}
      </div>

      {/* Code */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="px-3.5 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid var(--brand-border)" }}>
          <div className="flex items-center gap-2">
            <FileCode size={13} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
            <span className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>{filename}</span>
          </div>
          <button onClick={() => copyToClipboard(content, tab)} className="btn-ghost text-[10px]">
            {copied === tab ? <><Check className="w-3 h-3" strokeWidth={2} /> Copied</> : <><Copy className="w-3 h-3" strokeWidth={2} /> Copy</>}
          </button>
        </div>
        <pre className="p-4 font-mono text-[11px] leading-relaxed overflow-x-auto" style={{ backgroundColor: "#0a0a0a", color: "#b0b0b0" }}>
          {content}
        </pre>
      </div>

      <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>
          Run with: <code className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: "#1a1a1a", color: "var(--brand-text)" }}>docker compose up -d</code>
        </p>
      </div>
    </div>
  )
}
