"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react"

interface Conflict { plugin: string; issue: string; severity: string }

export default function ConflictsPage() {
  const params = useParams(); const id = params.id as string
  const [data, setData] = useState<{ conflicts: Conflict[]; total: number } | null>(null); const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/servers/${id}/plugin-conflicts`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(r => r.ok ? r.json() : null).then(d => setData(d)).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>
  if (!data) return <div className="p-5 text-center text-[12px]" style={{ color: "var(--brand-muted)" }}>No data</div>

  const severityColor: Record<string, string> = { CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#f59e0b", LOW: "#22c55e" }

  return (
    <div className="p-5 md:p-6 max-w-[800px] mx-auto">
      <div className="mb-5"><h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Plugin Conflicts</h1>
        <p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Detected issues from server logs</p></div>
      {data.conflicts.length === 0 ? (
        <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <CheckCircle size={20} strokeWidth={1.5} className="text-green-500 mx-auto" />
          <p className="text-[12px] mt-2" style={{ color: "var(--brand-muted)" }}>No conflicts detected</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.conflicts.map((c, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
              <div className="flex items-center gap-3">
                <AlertTriangle size={13} strokeWidth={1.5} style={{ color: severityColor[c.severity] || "#888" }} />
                <div>
                  <div className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>{c.plugin}</div>
                  <div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{c.issue}</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: `${severityColor[c.severity]}20`, color: severityColor[c.severity] }}>{c.severity}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
