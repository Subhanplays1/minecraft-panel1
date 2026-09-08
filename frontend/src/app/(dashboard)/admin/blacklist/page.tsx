"use client"
import { useState, useEffect } from "react"
import { Loader2, Ban, Plus, Trash2, X } from "lucide-react"

interface BlacklistItem { id: string; name: string; reason: string | null; addedBy: string | null; createdAt: string }

export default function BlacklistPage() {
  const [items, setItems] = useState<BlacklistItem[]>([]); const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false); const [name, setName] = useState(""); const [reason, setReason] = useState("")

  const fetchItems = async () => { try { const r = await fetch("/api/admin/plugin-blacklist", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); if (r.ok) setItems(await r.json()) } catch {} finally { setLoading(false) } }
  useEffect(() => { fetchItems() }, [])

  const addItem = async () => { await fetch("/api/admin/plugin-blacklist", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ name, reason }) }); setShowCreate(false); setName(""); setReason(""); fetchItems() }
  const removeItem = async (id: string) => { await fetch(`/api/admin/plugin-blacklist/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); fetchItems() }

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>

  return (
    <div className="p-5 md:p-6 max-w-[600px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Plugin Blacklist</h1><p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Block specific plugins from being installed</p></div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-[11px] py-1.5 px-3"><Plus className="w-3 h-3" strokeWidth={2} /> Add</button>
      </div>
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="w-[340px] p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3"><span className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>Blacklist Plugin</span><button onClick={() => setShowCreate(false)}><X size={14} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} /></button></div>
            <div className="space-y-2">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Plugin name" className="w-full px-3 py-1.5 rounded-lg text-[12px] outline-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (optional)" className="w-full px-3 py-1.5 rounded-lg text-[12px] outline-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
              <button onClick={addItem} className="w-full btn-primary text-[11px] py-2">Blacklist</button>
            </div>
          </div>
        </div>
      )}
      {items.length === 0 ? (
        <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}><Ban size={20} strokeWidth={1.5} style={{ color: "var(--brand-muted)", margin: "0 auto" }} /><p className="text-[12px] mt-2" style={{ color: "var(--brand-muted)" }}>No blacklisted plugins</p></div>
      ) : (
        <div className="space-y-2">{items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div><div className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>{item.name}</div>{item.reason && <div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{item.reason}</div>}</div>
            <button onClick={() => removeItem(item.id)} className="btn-ghost text-[10px] text-red-400"><Trash2 size={11} strokeWidth={1.5} /></button>
          </div>
        ))}</div>
      )}
    </div>
  )
}
