"use client"

import { useState, useEffect } from "react"
import { User, Mail, Lock, Save, Loader2, Check, Shield, Calendar } from "lucide-react"

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
        if (d.user) {
          setUser(d.user)
          setName(d.user.name)
          setEmail(d.user.email)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const saveProfile = async () => {
    setSavingProfile(true)
    setProfileMsg("")
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, email }),
      })
      const data = await res.json()
      if (res.ok) {
        setProfileMsg("Profile updated")
        if (data.user) {
          setUser(data.user)
          localStorage.setItem("user", JSON.stringify(data.user))
        }
      } else {
        setProfileMsg(data.error || "Failed to update")
      }
    } catch { setProfileMsg("Network error") }
    finally { setSavingProfile(false); setTimeout(() => setProfileMsg(""), 3000) }
  }

  const savePassword = async () => {
    if (newPassword !== confirmPassword) { setPasswordMsg("Passwords don't match"); return }
    setSavingPassword(true)
    setPasswordMsg("")
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setPasswordMsg("Password updated")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        setPasswordMsg(data.error || "Failed to update")
      }
    } catch { setPasswordMsg("Network error") }
    finally { setSavingPassword(false); setTimeout(() => setPasswordMsg(""), 3000) }
  }

  if (loading) return <div className="p-6 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--brand-primary)" }} /></div>

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6 animate-fade-in">
        <h1 className="text-xl font-bold" style={{ color: "var(--brand-text)" }}>Profile Settings</h1>
        <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>Manage your account information</p>
      </div>

      {/* Profile Card */}
      <div className="rounded-xl p-6 mb-6 animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <div className="font-semibold text-lg" style={{ color: "var(--brand-text)" }}>{user?.name}</div>
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--brand-muted)" }}>
              <Shield className="w-3.5 h-3.5" /> {user?.role}
              <span className="mx-1">|</span>
              <Calendar className="w-3.5 h-3.5" /> Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Display Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--brand-muted)" }} />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/40"
                style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--brand-muted)" }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/40"
                style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={saveProfile} disabled={savingProfile} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover-lift disabled:opacity-50" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Profile
            </button>
            {profileMsg && (
              <span className={`text-sm flex items-center gap-1 ${profileMsg.includes("updated") ? "text-green-400" : "text-red-400"}`}>
                {profileMsg.includes("updated") && <Check className="w-3.5 h-3.5" />} {profileMsg}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Password Card */}
      <div className="rounded-xl p-6 animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
          <h2 className="font-semibold" style={{ color: "var(--brand-text)" }}>Change Password</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/40"
              style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/40"
              style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/40"
              style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
            />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={savePassword} disabled={savingPassword} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover-lift disabled:opacity-50" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>
              {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Update Password
            </button>
            {passwordMsg && (
              <span className={`text-sm flex items-center gap-1 ${passwordMsg.includes("updated") ? "text-green-400" : "text-red-400"}`}>
                {passwordMsg.includes("updated") && <Check className="w-3.5 h-3.5" />} {passwordMsg}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
