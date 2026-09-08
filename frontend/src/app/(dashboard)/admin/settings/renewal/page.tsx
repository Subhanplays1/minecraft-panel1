"use client"

import { useState, useEffect } from "react"
import { Clock, AlertTriangle, Save, Loader2, RefreshCw, Users, Server, ArrowRight } from "lucide-react"

interface RenewalData {
  renewalDays: number
  expiredServers: { id: string; name: string; status: string; renewalAt: string; userId: string; userName: string; userEmail: string }[]
  expiringSoon: { id: string; name: string; status: string; renewalAt: string; userId: string; userName: string; userEmail: string }[]
  totalServers: number
}

export default function RenewalSettingsPage() {
  const [data, setData] = useState<RenewalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(3)
  const [saving, setSaving] = useState(false)
  const [extendLoading, setExtendLoading] = useState("")

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/admin/renewal", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const d = await res.json()
        setData(d)
        setDays(d.renewalDays)
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const saveDays = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/admin/renewal", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ days }),
      })
      if (res.ok) fetchData()
    } catch {} finally { setSaving(false) }
  }

  const extendUser = async (userId: string, extendDays: number) => {
    setExtendLoading(userId)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/admin/renewal/extend/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ days: extendDays }),
      })
      if (res.ok) fetchData()
    } catch {} finally { setExtendLoading("") }
  }

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>
  if (!data) return <div className="p-5 text-center text-[12px]" style={{ color: "var(--brand-muted)" }}>Failed to load</div>

  return (
    <div className="p-5 md:p-6 max-w-[900px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Renewal Settings</h1>
        <p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Manage server renewal periods and extend user servers</p>
      </div>

      {/* Renewal period */}
      <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={15} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
            <span className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>Default Renewal Period</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded" style={{ backgroundColor: "#1a1a1a", border: "1px solid #222", color: "var(--brand-muted)" }}>
            {data.totalServers} servers
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 1)}
              className="w-20 px-3 py-1.5 rounded-lg text-[13px] font-medium outline-none text-center"
              style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
            />
            <span className="text-[12px]" style={{ color: "var(--brand-muted)" }}>days</span>
          </div>
          <button onClick={saveDays} disabled={saving || days < 1} className="btn-primary text-[11px] py-1.5 px-3 disabled:opacity-40">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} /> : <><Save className="w-3 h-3" strokeWidth={2} /> Save</>}
          </button>
        </div>
        <p className="text-[10px] mt-2" style={{ color: "var(--brand-muted)" }}>New servers will have this many days before renewal is required. Servers past their renewal date are automatically stopped.</p>
      </div>

      {/* Expiring soon */}
      {data.expiringSoon.length > 0 && (
        <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: "#1a1a0a", border: "1px solid #3a3515" }}>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={15} strokeWidth={1.5} className="text-yellow-500" />
            <span className="text-[13px] font-medium text-yellow-400">Expiring Soon ({data.expiringSoon.length})</span>
          </div>
          <div className="space-y-2">
            {data.expiringSoon.map((s) => {
              const daysLeft = Math.max(0, Math.ceil((new Date(s.renewalAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
              return (
                <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg" style={{ backgroundColor: "#0a0a05", border: "1px solid #2a2515" }}>
                  <div className="flex items-center gap-3">
                    <Server size={13} strokeWidth={1.5} className="text-yellow-500" />
                    <div>
                      <div className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>{s.name}</div>
                      <div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{s.userName} — expires in {daysLeft}d</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => extendUser(s.userId, 3)} disabled={extendLoading === s.userId} className="btn-ghost text-[10px]">
                      {extendLoading === s.userId ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} /> : "+3d"}
                    </button>
                    <button onClick={() => extendUser(s.userId, 7)} disabled={extendLoading === s.userId} className="btn-ghost text-[10px]">
                      +7d
                    </button>
                    <button onClick={() => extendUser(s.userId, 30)} disabled={extendLoading === s.userId} className="btn-ghost text-[10px]">
                      +30d
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Expired servers */}
      {data.expiredServers.length > 0 && (
        <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: "#1a0a0a", border: "1px solid #3a1515" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} strokeWidth={1.5} className="text-red-500" />
            <span className="text-[13px] font-medium text-red-400">Expired ({data.expiredServers.length})</span>
          </div>
          <div className="space-y-2">
            {data.expiredServers.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg" style={{ backgroundColor: "#0a0505", border: "1px solid #2a1515" }}>
                <div className="flex items-center gap-3">
                  <Server size={13} strokeWidth={1.5} className="text-red-500" />
                  <div>
                    <div className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>{s.name}</div>
                    <div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{s.userName} — expired {new Date(s.renewalAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => extendUser(s.userId, 3)} disabled={extendLoading === s.userId} className="btn-ghost text-[10px]">
                    {extendLoading === s.userId ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} /> : "+3d"}
                  </button>
                  <button onClick={() => extendUser(s.userId, 7)} disabled={extendLoading === s.userId} className="btn-ghost text-[10px]">
                    +7d
                  </button>
                  <button onClick={() => extendUser(s.userId, 30)} disabled={extendLoading === s.userId} className="btn-ghost text-[10px]">
                    +30d
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.expiredServers.length === 0 && data.expiringSoon.length === 0 && (
        <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <Clock size={20} strokeWidth={1.5} style={{ color: "var(--brand-muted)", margin: "0 auto" }} />
          <p className="text-[12px] mt-2" style={{ color: "var(--brand-muted)" }}>No servers expiring or expired</p>
        </div>
      )}
    </div>
  )
}
