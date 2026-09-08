"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, Network, Plus, Trash2, X } from "lucide-react"

interface Port { id: string; internalPort: number; externalPort: number; protocol: string; description: string | null; enabled: boolean }

export default function PortsPage() {
  const params = useParams(); const id = params.id as string
  const [ports, setPorts] = useState<Port[]>([]); const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false); const [form, setForm] = useState({ internalPort: "25565", externalPort: "25565", protocol: "TCP", description: "" })

  const fetchPorts = async () => {
    try { const r = await fetch(`/api/servers/${id}/ports`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); if (r.ok) setPorts(await r.json()) } catch {} finally { setLoading(false) }
  }
  useEffect(() => { fetchPorts() }, [id])

  const createPort = async () => {
    const r = await fetch(`/api/servers/${id}/ports`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ ...form, internalPort: parseInt(form.internalPort), externalPort: parseInt(form.externalPort) }) })
    if (r.ok) { setShowCreate(false); fetchPorts() }
  }
  const deletePort = async (pid: string) => { await fetch(`/api/servers/${id}/ports/${pid}`, { method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); fetchPorts() }

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>

  return (
    <div className="p-5 md:p-6 max-w-[800px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Port Forwarding</h1>
          <p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Map external ports to your server</p></div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-[11px] py-1.5 px-3"><Plus className="w-3 h-3" strokeWidth={2} /> Add Port</button>
      </div>
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="w-[360px] p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3"><span className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>Add Port Forward</span><button onClick={() => setShowCreate(false)}><X size={14} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} /></button></div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--brand-muted)" }}>Internal</label><input value={form.internalPort} onChange={e => setForm({ ...form, internalPort: e.target.value })} className="w-full px-3 py-1.5 rounded-lg text-[12px] outline-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} /></div>
                <div><label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--brand-muted)" }}>External</label><input value={form.externalPort} onChange={e => setForm({ ...form, externalPort: e.target.value })} className="w-full px-3 py-1.5 rounded-lg text-[12px] outline-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} /></div>
              </div>
              <div><label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--brand-muted)" }}>Protocol</label>
                <select value={form.protocol} onChange={e => setForm({ ...form, protocol: e.target.value })} className="w-full px-3 py-1.5 rounded-lg text-[12px] outline-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}><option>TCP</option><option>UDP</option><option>TCP/UDP</option></select></div>
              <div><label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--brand-muted)" }}>Description</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-1.5 rounded-lg text-[12px] outline-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} /></div>
              <button onClick={createPort} className="w-full btn-primary text-[11px] py-2">Create</button>
            </div>
          </div>
        </div>
      )}
      {ports.length === 0 ? (
        <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}><Network size={20} strokeWidth={1.5} style={{ color: "var(--brand-muted)", margin: "0 auto" }} /><p className="text-[12px] mt-2" style={{ color: "var(--brand-muted)" }}>No port forwards</p></div>
      ) : (
        <div className="space-y-2">{ports.map(p => (
          <div key={p.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div><div className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>{p.externalPort} → {p.internalPort}</div>
              <div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{p.protocol} {p.description && `— ${p.description}`}</div></div>
            <button onClick={() => deletePort(p.id)} className="btn-ghost text-[10px] text-red-400"><Trash2 size={11} strokeWidth={1.5} /></button>
          </div>
        ))}</div>
      )}
    </div>
  )
}
