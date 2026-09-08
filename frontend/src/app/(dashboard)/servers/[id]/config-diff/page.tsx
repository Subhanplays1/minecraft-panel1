"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, GitCompare } from "lucide-react"

interface Diff { file: string; current: string; backup: string | null; changed: boolean }

export default function ConfigDiffPage() {
  const params = useParams(); const id = params.id as string
  const [data, setData] = useState<{ diffs: Diff[]; total: number } | null>(null); const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/servers/${id}/config-diff`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(r => r.ok ? r.json() : null).then(d => setData(d)).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>
  if (!data) return <div className="p-5 text-center text-[12px]" style={{ color: "var(--brand-muted)" }}>No data</div>

  return (
    <div className="p-5 md:p-6 max-w-[900px] mx-auto">
      <div className="mb-5"><h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Config Diff Viewer</h1>
        <p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Compare current config with backup</p></div>
      {data.diffs.length === 0 ? (
        <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <GitCompare size={20} strokeWidth={1.5} style={{ color: "var(--brand-muted)", margin: "0 auto" }} />
          <p className="text-[12px] mt-2" style={{ color: "var(--brand-muted)" }}>No config changes detected</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.diffs.map(d => (
            <div key={d.file} className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
              <div className="px-3.5 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid var(--brand-border)" }}>
                <GitCompare size={12} strokeWidth={1.5} className="text-yellow-500" />
                <span className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>{d.file}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500">Modified</span>
              </div>
              <div className="grid grid-cols-2 divide-x" style={{ borderColor: "var(--brand-border)" }}>
                <div className="p-3">
                  <div className="text-[9px] font-medium uppercase tracking-wider mb-2" style={{ color: "var(--brand-muted)" }}>Backup</div>
                  <pre className="font-mono text-[10px] leading-relaxed overflow-x-auto max-h-[200px]" style={{ color: "#b0b0b0" }}>{d.backup || "No backup"}</pre>
                </div>
                <div className="p-3">
                  <div className="text-[9px] font-medium uppercase tracking-wider mb-2" style={{ color: "var(--brand-muted)" }}>Current</div>
                  <pre className="font-mono text-[10px] leading-relaxed overflow-x-auto max-h-[200px]" style={{ color: "#b0b0b0" }}>{d.current}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
