"use client"
import { useState, useEffect } from "react"
import { Loader2, Users, Plus, Trash2, Shield, Ban, CheckCircle, UserMinus, UserPlus, X, Search, LogIn } from "lucide-react"

interface UserData { id: string; email: string; name: string; role: string; banned: boolean; banReason: string | null; lastLoginAt: string | null; loginCount: number; createdAt: string; discordVerified: boolean; avatar: string | null; _count: { servers: number } }

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]); const [loading, setLoading] = useState(true); const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false); const [form, setForm] = useState({ email: "", name: "", password: "", role: "CUSTOMER" })
  const [creating, setCreating] = useState(false)

  const fetchUsers = async () => {
    try { const r = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); if (r.ok) setUsers(await r.json()) } catch {} finally { setLoading(false) }
  }
  useEffect(() => { fetchUsers() }, [])

  const createUser = async () => {
    setCreating(true)
    try { const r = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify(form) }); if (r.ok) { setShowCreate(false); setForm({ email: "", name: "", password: "", role: "CUSTOMER" }); fetchUsers() } } catch {} finally { setCreating(false) }
  }
  const changeRole = async (userId: string, role: string) => {
    await fetch(`/api/admin/users/${userId}/role`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ role }) })
    fetchUsers()
  }
  const toggleBan = async (userId: string, banned: boolean) => {
    await fetch(`/api/admin/users/${userId}/ban`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ banned, reason: banned ? "Suspended by admin" : "" }) })
    fetchUsers()
  }
  const deleteUser = async (userId: string) => {
    if (!confirm("Delete this user?")) return
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
    fetchUsers()
  }
  const impersonate = async (userId: string) => {
    const r = await fetch(`/api/admin/users/${userId}/impersonate`, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
    if (r.ok) { const d = await r.json(); localStorage.setItem("token", d.token); window.location.href = "/servers" }
  }

  const filtered = users.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>

  return (
    <div className="p-5 md:p-6 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>User Management</h1><p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>{users.length} users</p></div>
        <div className="flex gap-2 items-center">
          <div className="relative"><Search size={13} strokeWidth={1.5} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--brand-muted)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-8 pr-3 py-1.5 rounded-lg text-[11px] outline-none w-[180px]" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} /></div>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-[11px] py-1.5 px-3"><Plus className="w-3 h-3" strokeWidth={2} /> Add User</button>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="w-[380px] p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3"><span className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>Create User</span><button onClick={() => setShowCreate(false)}><X size={14} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} /></button></div>
            <div className="space-y-2">
              {[{ label: "Email", key: "email" }, { label: "Name", key: "name" }, { label: "Password", key: "password" }].map(f => (
                <div key={f.key}><label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--brand-muted)" }}>{f.label}</label>
                  <input type={f.key === "password" ? "password" : "text"} value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} className="w-full px-3 py-1.5 rounded-lg text-[12px] outline-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} /></div>
              ))}
              <div><label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--brand-muted)" }}>Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-1.5 rounded-lg text-[12px] outline-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}>
                  <option value="CUSTOMER">Customer</option><option value="MODERATOR">Moderator</option><option value="ADMIN">Admin</option></select></div>
              <button onClick={createUser} disabled={creating} className="w-full btn-primary text-[11px] py-2 disabled:opacity-40">{creating ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} /> : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr style={{ borderBottom: "1px solid var(--brand-border)" }}>
              {["User", "Role", "Servers", "Joined", "Actions"].map(h => <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: "var(--brand-muted)" }}>{h}</th>)}
            </tr></thead>
            <tbody>{filtered.map(u => (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--brand-border)" }} className={u.banned ? "opacity-50" : ""}>
                <td className="px-3 py-2"><div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium" style={{ backgroundColor: "#1a1a1a", color: "var(--brand-muted)" }}>{u.avatar ? <img src={u.avatar} className="w-7 h-7 rounded-full" /> : u.name.charAt(0).toUpperCase()}</div>
                  <div><div className="font-medium" style={{ color: "var(--brand-text)" }}>{u.name}</div><div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{u.email}</div></div>
                </div></td>
                <td className="px-3 py-2">
                  <select value={u.role} onChange={e => changeRole(u.id, e.target.value)} className="px-2 py-0.5 rounded text-[10px] outline-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: u.role === "ADMIN" ? "#ef4444" : u.role === "MODERATOR" ? "#f59e0b" : "var(--brand-text)" }}>
                    <option value="CUSTOMER">Customer</option><option value="MODERATOR">Moderator</option><option value="ADMIN">Admin</option></select>
                </td>
                <td className="px-3 py-2" style={{ color: "var(--brand-muted)" }}>{u._count.servers}</td>
                <td className="px-3 py-2" style={{ color: "var(--brand-muted)" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2"><div className="flex items-center gap-1">
                  <button onClick={() => impersonate(u.id)} className="btn-ghost text-[10px]" title="Login as user"><LogIn size={11} strokeWidth={1.5} /></button>
                  <button onClick={() => toggleBan(u.id, !u.banned)} className={`btn-ghost text-[10px] ${u.banned ? "text-green-400" : "text-yellow-400"}`} title={u.banned ? "Unban" : "Ban"}>
                    {u.banned ? <CheckCircle size={11} strokeWidth={1.5} /> : <Ban size={11} strokeWidth={1.5} />}</button>
                  <button onClick={() => deleteUser(u.id)} className="btn-ghost text-[10px] text-red-400" title="Delete"><Trash2 size={11} strokeWidth={1.5} /></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
