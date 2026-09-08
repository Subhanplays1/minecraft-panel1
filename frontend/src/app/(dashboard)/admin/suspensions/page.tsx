"use client"
import { useState, useEffect } from "react"
import { Loader2, UserMinus } from "lucide-react"

interface Suspension { id: string; reason: string; active: boolean; expiresAt: string | null; createdAt: string; user: { name: string; email: string } }

export default function SuspensionsPage() {
  const [items, setItems] = useState<Suspension[]>([]); const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/suspensions", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(r => r.ok ? r.json() : []).then(d => setItems(d)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>

  return (
    <div className="p-5 md:p-6 max-w-[800px] mx-auto">
      <div className="mb-5"><h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Suspended Users</h1><p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Currently suspended user accounts</p></div>
      {items.length === 0 ? (
        <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}><UserMinus size={20} strokeWidth={1.5} style={{ color: "var(--brand-muted)", margin: "0 auto" }} /><p className="text-[12px] mt-2" style={{ color: "var(--brand-muted)" }}>No active suspensions</p></div>
      ) : (
        <div className="space-y-2">{items.map(s => (
          <div key={s.id} className="p-3 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="flex items-center justify-between">
              <div><div className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>{s.user.name} ({s.user.email})</div>
                <div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>Reason: {s.reason}</div>
                {s.expiresAt && <div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>Expires: {new Date(s.expiresAt).toLocaleDateString()}</div>}
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: s.active ? "#ef444420" : "#22c55e20", color: s.active ? "#ef4444" : "#22c55e" }}>{s.active ? "Active" : "Expired"}</span>
            </div>
          </div>
        ))}</div>
      )}
    </div>
  )
}
