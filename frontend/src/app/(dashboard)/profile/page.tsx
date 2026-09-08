"use client"

import { useState, useEffect } from "react"
import { useBranding } from "@/components/BrandingProvider"
import { discord } from "@/lib/api"
import { useRouter } from "next/navigation"
import {
  User, Mail, Lock, Save, Loader2, Check, Gamepad2,
  ExternalLink, Shield, Calendar
} from "lucide-react"

interface UserData {
  id: string
  name: string
  email: string
  role: string
  avatar: string | null
  createdAt: string
  discordId: string | null
  discordUsername: string | null
  discordDisplayName: string | null
  discordAvatar: string | null
  discordVerified: boolean
  discordVerifiedAt: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const { settings } = useBranding()
  const [user, setUser] = useState<UserData | null>(null)
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
  const [discordStatus, setDiscordStatus] = useState<any>(null)

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

  useEffect(() => {
    discord.getStatus().then(setDiscordStatus).catch(() => {})
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

  const displayAvatar = user.discordAvatar || user.avatar
  const displayName = user.discordDisplayName || user.name

  return (
    <div className="p-5 md:p-6 max-w-[600px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[17px] font-semibold" style={{ color: "var(--brand-text)" }}>Profile</h1>
        <p className="text-[12px] mt-0.5" style={{ color: "var(--brand-muted)" }}>Manage your account settings</p>
      </div>

      {/* Discord Verification Card */}
      <div className="rounded-xl mb-4 overflow-hidden" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--brand-border)" }}>
          <Gamepad2 size={14} strokeWidth={1.5} style={{ color: "#5865F2" }} />
          <h2 className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>Discord</h2>
          {user.discordVerified && (
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22C55E" }}>
              Verified
            </span>
          )}
        </div>

        {user.discordVerified ? (
          <div className="p-4">
            <div className="flex items-center gap-4 mb-4">
              {displayAvatar && (
                <img src={displayAvatar} alt="Discord Avatar" className="w-16 h-16 rounded-full" style={{ border: "2px solid var(--brand-border)" }} />
              )}
              <div>
                <div className="text-[14px] font-semibold" style={{ color: "var(--brand-text)" }}>{displayName}</div>
                <div className="text-[12px]" style={{ color: "var(--brand-muted)" }}>@{user.discordUsername}</div>
                <div className="flex items-center gap-1 mt-1">
                  <Shield size={10} style={{ color: "#22C55E" }} />
                  <span className="text-[10px]" style={{ color: "#22C55E" }}>Fully Verified</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg" style={{ backgroundColor: "var(--brand-background)" }}>
                <div className="text-[10px] mb-0.5" style={{ color: "var(--brand-muted)" }}>Discord ID</div>
                <div className="text-[12px] font-mono" style={{ color: "var(--brand-text)" }}>{user.discordId}</div>
              </div>
              <div className="p-2.5 rounded-lg" style={{ backgroundColor: "var(--brand-background)" }}>
                <div className="text-[10px] mb-0.5" style={{ color: "var(--brand-muted)" }}>Verified On</div>
                <div className="text-[12px]" style={{ color: "var(--brand-text)" }}>
                  {user.discordVerifiedAt ? new Date(user.discordVerifiedAt).toLocaleDateString() : "N/A"}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center">
            <p className="text-[12px] mb-3" style={{ color: "var(--brand-muted)" }}>
              Link your Discord account to verify your identity and auto-sync your profile.
            </p>
            {discordStatus?.botReady ? (
              <button
                onClick={() => router.push("/discord-verify")}
                className="px-4 py-2 rounded-lg text-[12px] font-medium flex items-center gap-2 mx-auto"
                style={{ backgroundColor: "#5865F2", color: "#fff" }}
              >
                <Gamepad2 className="w-3.5 h-3.5" /> Verify with Discord
              </button>
            ) : (
              <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>Discord bot is not configured yet.</p>
            )}
          </div>
        )}
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
