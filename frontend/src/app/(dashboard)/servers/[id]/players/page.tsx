"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, Users, ArrowUp, ArrowDown } from "lucide-react"

interface PlayerEvent { id: string; playerName: string; action: string; ip: string | null; createdAt: string }

export default function PlayersPage() {
  const params = useParams(); const id = params.id as string
  const [events, setEvents] = useState<PlayerEvent[]>([]); const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/servers/${id}/players/history?limit=200`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(r => r.ok ? r.json() : []).then(d => setEvents(d)).catch(() => {}).finally(() => setLoading(false))
    const t = setInterval(() => {
      fetch(`/api/servers/${id}/players/history?limit=200`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
        .then(r => r.ok ? r.json() : []).then(d => setEvents(d)).catch(() => {})
    }, 10000)
    return () => clearInterval(t)
  }, [id])

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>

  const joins = events.filter(e => e.action === "JOIN")
  const leaves = events.filter(e => e.action === "LEAVE")

  return (
    <div className="p-5 md:p-6 max-w-[800px] mx-auto">
      <div className="mb-5"><h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Player History</h1>
        <p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Who joined and when</p></div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-3 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>Joins</div>
          <div className="text-[16px] font-semibold text-green-500 mt-1">{joins.length}</div>
        </div>
        <div className="p-3 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>Leaves</div>
          <div className="text-[16px] font-semibold text-red-400 mt-1">{leaves.length}</div>
        </div>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="p-3.5 flex items-center gap-2" style={{ borderBottom: "1px solid var(--brand-border)" }}>
          <Users size={13} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
          <span className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>Recent Activity</span>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {events.length === 0 ? <p className="p-4 text-[11px]" style={{ color: "var(--brand-muted)" }}>No player history yet</p> :
            events.map(e => (
              <div key={e.id} className="px-4 py-2 flex items-center justify-between text-[11px]" style={{ borderBottom: "1px solid var(--brand-border)" }}>
                <div className="flex items-center gap-2">
                  {e.action === "JOIN" ? <ArrowUp size={11} strokeWidth={2} className="text-green-500" /> : <ArrowDown size={11} strokeWidth={2} className="text-red-400" />}
                  <span className="font-medium" style={{ color: "var(--brand-text)" }}>{e.playerName}</span>
                  <span style={{ color: e.action === "JOIN" ? "#22c55e" : "#f87171" }}>{e.action.toLowerCase()}</span>
                </div>
                <span style={{ color: "var(--brand-muted)" }}>{new Date(e.createdAt).toLocaleString()}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
