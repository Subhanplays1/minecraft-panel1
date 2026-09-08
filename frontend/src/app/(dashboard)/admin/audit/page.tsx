"use client"
import { useState, useEffect } from "react"
import { Loader2, Shield, Search } from "lucide-react"

interface AuditEntry { id: string; action: string; targetType: string | null; targetId: string | null; details: string | null; ip: string | null; createdAt: string; user: { name: string; email: string } | null }

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]); const [loading, setLoading] = useState(true); const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/admin/audit?limit=200", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(r => r.ok ? r.json() : { logs: [] }).then(d => setLogs(d.logs || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>

  const filtered = logs.filter(l => !search || l.action.toLowerCase().includes(search.toLowerCase()) || l.details?.toLowerCase().includes(search.toLowerCase()) || l.user?.email?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-5 md:p-6 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Audit Log</h1><p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Track all admin actions</p></div>
        <div className="relative"><Search size={13} strokeWidth={1.5} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--brand-muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-8 pr-3 py-1.5 rounded-lg text-[11px] outline-none w-[200px]" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} /></div>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr style={{ borderBottom: "1px solid var(--brand-border)" }}>
              <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--brand-muted)" }}>Time</th>
              <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--brand-muted)" }}>User</th>
              <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--brand-muted)" }}>Action</th>
              <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--brand-muted)" }}>Target</th>
              <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--brand-muted)" }}>Details</th>
            </tr></thead>
            <tbody>{filtered.map(l => (
              <tr key={l.id} style={{ borderBottom: "1px solid var(--brand-border)" }}>
                <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--brand-muted)" }}>{new Date(l.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2" style={{ color: "var(--brand-text)" }}>{l.user?.name || "System"}</td>
                <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: "#1a1a1a", color: "var(--brand-text)" }}>{l.action}</span></td>
                <td className="px-3 py-2" style={{ color: "var(--brand-muted)" }}>{l.targetType} {l.targetId?.substring(0, 8)}</td>
                <td className="px-3 py-2 max-w-[200px] truncate" style={{ color: "var(--brand-muted)" }}>{l.details || "-"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
