"use client"

import { useState, useEffect } from "react"
import { User, Mail, Lock, Save, Loader2, Check } from "lucide-react"

export default function ProfilePage() {
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string; createdAt: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [profileMsg, setProfileMsg] = useState("")
  const [passwordMsg, setPasswordMsg] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("token")
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.user) { setUser(d.user); setName(d.user.name); setEmail(d.user.email); }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const saveProfile = async () => {
    setSavingProfile(true); setProfileMsg("")
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/auth/profile", {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, email }),
      })
      const data = await res.json()
      if (res.ok) { setProfileMsg("Profile updated"); if (data.user) { setUser(data.user); localStorage.setItem("user", JSON.stringify(data.user)); } }
      else setProfileMsg(data.error || "Failed to update")
    } catch { setProfileMsg("Failed to update") } finally { setSavingProfile(false) }
  }

  const savePassword = async () => {
    if (newPassword !== confirmPassword) { setPasswordMsg("Passwords don't match"); return }
    if (newPassword.length < 6) { setPasswordMsg("Password must be at least 6 characters"); return }
    setSavingPassword(true); setPasswordMsg("")
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/auth/password", {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (res.ok) { setPasswordMsg("Password updated"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
      else setPasswordMsg(data.error || "Failed to update")
    } catch { setPasswordMsg("Failed to update") } finally { setSavingPassword(false) }
  }

  if (loading) return <div className="p-6 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>
  if (!user) return null

  return (
    <div className="p-5 md:p-6 max-w-[600px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[17px] font-semibold" style={{ color: "var(--brand-text)" }}>Profile</h1>
        <p className="text-[12px] mt-0.5" style={{ color: "var(--brand-muted)" }}>Manage your account settings</p>
      </div>

      {/* Profile info */}
      <div className="rounded-xl mb-4" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--brand-border)" }}>
          <User size={14} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
          <h2 className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>Account</h2>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--brand-muted)" }}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input text-[13px]" />
          </div>
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--brand-muted)" }}>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="input text-[13px]" type="email" />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <div className="text-[11px]" style={{ color: "var(--brand-muted)" }}>Role: <span className="font-medium" style={{ color: "var(--brand-text)" }}>{user.role}</span></div>
            <div className="text-[11px]" style={{ color: "var(--brand-muted)" }}>Joined: <span className="font-medium" style={{ color: "var(--brand-text)" }}>{new Date(user.createdAt).toLocaleDateString()}</span></div>
          </div>
        </div>
        <div className="px-4 py-3 flex items-center gap-3" style={{ borderTop: "1px solid var(--brand-border)" }}>
          <button onClick={saveProfile} disabled={savingProfile} className="btn-primary text-[12px] disabled:opacity-40">
            {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} /> : <Save className="w-3.5 h-3.5" strokeWidth={2} />} Save
          </button>
          {profileMsg && <span className="text-[11px]" style={{ color: "var(--brand-text)" }}>{profileMsg}</span>}
        </div>
      </div>

      {/* Password */}
      <div className="rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--brand-border)" }}>
          <Lock size={14} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
          <h2 className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>Password</h2>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--brand-muted)" }}>Current Password</label>
            <input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input text-[13px]" type="password" />
          </div>
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--brand-muted)" }}>New Password</label>
            <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input text-[13px]" type="password" />
          </div>
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--brand-muted)" }}>Confirm Password</label>
            <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input text-[13px]" type="password" />
          </div>
        </div>
        <div className="px-4 py-3 flex items-center gap-3" style={{ borderTop: "1px solid var(--brand-border)" }}>
          <button onClick={savePassword} disabled={savingPassword} className="btn-primary text-[12px] disabled:opacity-40">
            {savingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} /> : <Lock className="w-3.5 h-3.5" strokeWidth={2} />} Update Password
          </button>
          {passwordMsg && <span className="text-[11px]" style={{ color: "var(--brand-text)" }}>{passwordMsg}</span>}
        </div>
      </div>
    </div>
  )
}
