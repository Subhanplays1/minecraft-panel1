"use client"
import { useState, useEffect } from "react"
import { Loader2, History, CheckCircle, XCircle } from "lucide-react"

interface LoginEntry { id: string; ip: string | null; userAgent: string | null; success: boolean; createdAt: string; user: { name: string; email: string } }

export default function LoginHistoryPage() {
  const [logs, setLogs] = useState<LoginEntry[]>([]); const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/login-history", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(r => r.ok ? r.json() : []).then(d => setLogs(d)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>

  return (
    <div className="p-5 md:p-6 max-w-[800px] mx-auto">
      <div className="mb-5"><h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Login History</h1><p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>All login attempts across all users</p></div>
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr style={{ borderBottom: "1px solid var(--brand-border)" }}>
              {["Time", "User", "IP", "Status", "Device"].map(h => <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: "var(--brand-muted)" }}>{h}</th>)}
            </tr></thead>
            <tbody>{logs.map(l => (
              <tr key={l.id} style={{ borderBottom: "1px solid var(--brand-border)" }}>
                <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--brand-muted)" }}>{new Date(l.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2"><div className="font-medium" style={{ color: "var(--brand-text)" }}>{l.user.name}</div><div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{l.user.email}</div></td>
                <td className="px-3 py-2 font-mono" style={{ color: "var(--brand-muted)" }}>{l.ip || "-"}</td>
                <td className="px-3 py-2">{l.success ? <CheckCircle size={12} strokeWidth={1.5} className="text-green-500" /> : <XCircle size={12} strokeWidth={1.5} className="text-red-400" />}</td>
                <td className="px-3 py-2 max-w-[200px] truncate" style={{ color: "var(--brand-muted)" }}>{l.userAgent?.substring(0, 40) || "-"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
