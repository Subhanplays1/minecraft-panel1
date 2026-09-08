"use client"
import { useState, useEffect } from "react"
import { Loader2, Key, Plus, Trash2, Copy, Check } from "lucide-react"

interface ApiKey { id: string; name: string; key: string; lastUsed: string | null; expiresAt: string | null; createdAt: string; user: { name: string; email: string } }

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]); const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false); const [name, setName] = useState(""); const [copied, setCopied] = useState("")

  const fetchKeys = async () => { try { const r = await fetch("/api/admin/api-keys", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); if (r.ok) setKeys(await r.json()) } catch {} finally { setLoading(false) } }
  useEffect(() => { fetchKeys() }, [])

  const createKey = async () => { await fetch("/api/admin/api-keys", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ name }) }); setShowCreate(false); setName(""); fetchKeys() }
  const deleteKey = async (id: string) => { await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); fetchKeys() }
  const copyKey = (key: string) => { navigator.clipboard.writeText(key); setCopied(key); setTimeout(() => setCopied(""), 2000) }

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>

  return (
    <div className="p-5 md:p-6 max-w-[800px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>API Keys</h1><p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Manage API access keys</p></div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-[11px] py-1.5 px-3"><Plus className="w-3 h-3" strokeWidth={2} /> Create Key</button>
      </div>
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="w-[340px] p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3"><span className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>Create API Key</span></div>
            <div className="space-y-2"><input value={name} onChange={e => setName(e.target.value)} placeholder="Key name" className="w-full px-3 py-1.5 rounded-lg text-[12px] outline-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
              <button onClick={createKey} className="w-full btn-primary text-[11px] py-2">Create</button></div>
          </div>
        </div>
      )}
      <div className="space-y-2">{keys.map(k => (
        <div key={k.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div><div className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>{k.name}</div>
            <div className="flex items-center gap-2"><code className="text-[10px] font-mono" style={{ color: "var(--brand-muted)" }}>{k.key.substring(0, 12)}...{k.key.substring(k.key.length - 4)}</code>
              <button onClick={() => copyKey(k.key)} className="btn-ghost text-[9px]">{copied === k.key ? <Check size={10} strokeWidth={2} /> : <Copy size={10} strokeWidth={2} />}</button></div>
            <div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>Created {new Date(k.createdAt).toLocaleDateString()} by {k.user.name}</div></div>
          <button onClick={() => deleteKey(k.id)} className="btn-ghost text-[10px] text-red-400"><Trash2 size={11} strokeWidth={1.5} /></button>
        </div>
      ))}</div>
    </div>
  )
}
