"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Plus, Trash2, UserPlus, Shield, Edit2, X } from "lucide-react"
import toast from "react-hot-toast"

interface SubUser {
  id: string
  email: string
  name: string
  role: string
  permissions: string[]
}

const PERMISSIONS = ["console.read", "console.write", "files.read", "files.write", "files.delete", "plugins.manage", "backups.manage", "settings.manage", "users.manage", "start", "stop", "restart"]

export default function SubUsersPage() {
  const params = useParams()
  const id = params.id as string
  const [users, setUsers] = useState<SubUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: "", name: "", permissions: ["console.read"] })

  useEffect(() => {
    const token = localStorage.getItem("token")
    fetch(`/api/servers/${id}/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [id])

  const handleAdd = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success("User added")
        setShowForm(false)
        setForm({ email: "", name: "", permissions: ["console.read"] })
        const data = await fetch(`/api/servers/${id}/users`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : [])
        setUsers(Array.isArray(data) ? data : [])
      } else {
        toast.error("Failed to add user")
      }
    } catch { toast.error("Failed") }
  }

  const handleRemove = async (userId: string) => {
    if (!confirm("Remove this user?")) return
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/servers/${id}/users/${userId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      setUsers(prev => prev.filter(u => u.id !== userId))
      toast.success("Removed")
    } catch { toast.error("Failed") }
  }

  const togglePermission = (perm: string) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm],
    }))
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "transparent" }}><div className="animate-pulse" style={{ color: "var(--brand-muted)" }}>Loading...</div></div>

  return (
    <div className="p-6" style={{ backgroundColor: "transparent" }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--brand-text)" }}><UserPlus size={24} /> Sub-Users</h1>
            <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>Manage who has access to this server</p>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: "var(--brand-primary)" }}><Plus size={16} /> Add User</button>
        </div>

        {showForm && (
          <div className="mb-6 p-4 rounded-xl space-y-3" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>Add Sub-User</h3>
              <button onClick={() => setShowForm(false)} style={{ color: "var(--brand-muted)" }}><X size={16} /></button>
            </div>
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--brand-muted)" }}>Permissions</label>
              <div className="grid grid-cols-3 gap-2">
                {PERMISSIONS.map(perm => (
                  <button key={perm} onClick={() => togglePermission(perm)} className="px-3 py-1.5 rounded-lg text-xs text-left" style={{ backgroundColor: form.permissions.includes(perm) ? "var(--brand-primary)20" : "var(--brand-background)", color: form.permissions.includes(perm) ? "var(--brand-primary)" : "var(--brand-muted)", border: `1px solid ${form.permissions.includes(perm) ? "var(--brand-primary)" : "var(--brand-border)"}` }}>{perm}</button>
                ))}
              </div>
            </div>
            <button onClick={handleAdd} className="px-4 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: "var(--brand-primary)" }}>Add User</button>
          </div>
        )}

        <div className="space-y-2">
          {users.length === 0 && (
            <div className="text-center py-10" style={{ color: "var(--brand-muted)" }}>
              <UserPlus size={32} className="mx-auto mb-2 opacity-50" />
              <p>No sub-users configured</p>
              <p className="text-xs mt-1">Add users to give them access to this server</p>
            </div>
          )}
          {users.map(user => (
            <div key={user.id} className="p-4 rounded-xl flex items-center justify-between" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>{user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}</div>
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>{user.name || user.email}</div>
                  <div className="text-xs" style={{ color: "var(--brand-muted)" }}>{user.email}</div>
                  <div className="flex gap-1 mt-1 flex-wrap">{user.permissions?.map(p => <span key={p} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--brand-primary)15", color: "var(--brand-primary)" }}>{p}</span>)}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded hover:bg-white/5" style={{ color: "var(--brand-muted)" }}><Edit2 size={14} /></button>
                <button onClick={() => handleRemove(user.id)} className="p-1.5 rounded hover:bg-white/5" style={{ color: "var(--brand-danger)" }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
