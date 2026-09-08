"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, GitBranch, Plus, Trash2, RefreshCw, X } from "lucide-react"

interface GitRepo { id: string; repoUrl: string; branch: string; lastCommit: string | null; lastPullAt: string | null; autoPull: boolean }

export default function GitPage() {
  const params = useParams(); const id = params.id as string
  const [repos, setRepos] = useState<GitRepo[]>([]); const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false); const [form, setForm] = useState({ repoUrl: "", branch: "main" })
  const [pulling, setPulling] = useState(false)

  const fetchRepos = async () => {
    try { const r = await fetch(`/api/servers/${id}/git`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); if (r.ok) setRepos(await r.json()) } catch {} finally { setLoading(false) }
  }
  useEffect(() => { fetchRepos() }, [id])

  const addRepo = async () => {
    const r = await fetch(`/api/servers/${id}/git`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify(form) })
    if (r.ok) { setShowCreate(false); fetchRepos() }
  }
  const pullRepo = async () => {
    setPulling(true)
    try { await fetch(`/api/servers/${id}/git/pull`, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }) } catch {} finally { setPulling(false); fetchRepos() }
  }
  const deleteRepo = async (rid: string) => { await fetch(`/api/servers/${id}/git/${rid}`, { method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); fetchRepos() }

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>

  return (
    <div className="p-5 md:p-6 max-w-[800px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Git Integration</h1>
          <p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Pull code from GitHub repos</p></div>
        <div className="flex gap-1">
          {repos.length > 0 && <button onClick={pullRepo} disabled={pulling} className="btn-secondary text-[11px] py-1.5 px-3 disabled:opacity-40"><RefreshCw className={`w-3 h-3 ${pulling ? "animate-spin" : ""}`} strokeWidth={2} /> Pull</button>}
          <button onClick={() => setShowCreate(true)} className="btn-primary text-[11px] py-1.5 px-3"><Plus className="w-3 h-3" strokeWidth={2} /> Add Repo</button>
        </div>
      </div>
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="w-[380px] p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3"><span className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>Add Git Repo</span><button onClick={() => setShowCreate(false)}><X size={14} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} /></button></div>
            <div className="space-y-2">
              <div><label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--brand-muted)" }}>Repo URL</label><input value={form.repoUrl} onChange={e => setForm({ ...form, repoUrl: e.target.value })} placeholder="https://github.com/user/repo.git" className="w-full px-3 py-1.5 rounded-lg text-[12px] outline-none font-mono" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} /></div>
              <div><label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--brand-muted)" }}>Branch</label><input value={form.branch} onChange={e => setForm({ ...form, branch: e.target.value })} className="w-full px-3 py-1.5 rounded-lg text-[12px] outline-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} /></div>
              <button onClick={addRepo} className="w-full btn-primary text-[11px] py-2">Add</button>
            </div>
          </div>
        </div>
      )}
      {repos.length === 0 ? (
        <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}><GitBranch size={20} strokeWidth={1.5} style={{ color: "var(--brand-muted)", margin: "0 auto" }} /><p className="text-[12px] mt-2" style={{ color: "var(--brand-muted)" }}>No repos configured</p></div>
      ) : (
        <div className="space-y-2">{repos.map(r => (
          <div key={r.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div><div className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>{r.repoUrl}</div>
              <div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>Branch: {r.branch} {r.lastCommit && `— Last: ${r.lastCommit}`} {r.lastPullAt && `— Pulled: ${new Date(r.lastPullAt).toLocaleString()}`}</div></div>
            <button onClick={() => deleteRepo(r.id)} className="btn-ghost text-[10px] text-red-400"><Trash2 size={11} strokeWidth={1.5} /></button>
          </div>
        ))}</div>
      )}
    </div>
  )
}
