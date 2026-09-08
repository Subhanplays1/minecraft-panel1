"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { discord } from "@/lib/api"
import toast from "react-hot-toast"
import {
  Save, Gamepad2, CheckCircle, XCircle, ExternalLink,
  Copy, RefreshCw, Bot, Server, Hash, MessageSquare
} from "lucide-react"

interface DiscordSettings {
  isEnabled: boolean
  botToken: string
  clientId: string
  clientSecret: string
  guildId: string
  verificationChannelId: string
  logChannelId: string
  inviteUrl: string
}

export default function AdminDiscordPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [settings, setSettings] = useState<DiscordSettings>({
    isEnabled: false,
    botToken: "",
    clientId: "",
    clientSecret: "",
    guildId: "",
    verificationChannelId: "",
    logChannelId: "",
    inviteUrl: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [botReady, setBotReady] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem("token")
    const user = localStorage.getItem("user")
    if (!t || !user) { router.push("/auth/login"); return }
    const parsed = JSON.parse(user)
    if (parsed.role !== "ADMIN") { router.push("/dashboard"); return }
    setToken(t)
  }, [router])

  const loadSettings = useCallback(async () => {
    if (!token) return
    try {
      const data = await discord.getSettings(token)
      setSettings({
        isEnabled: data.isEnabled || false,
        botToken: data.botToken || "",
        clientId: data.clientId || "",
        clientSecret: data.clientSecret || "",
        guildId: data.guildId || "",
        verificationChannelId: data.verificationChannelId || "",
        logChannelId: data.logChannelId || "",
        inviteUrl: data.inviteUrl || "",
      })
      setBotReady(data.botReady || false)
    } catch {
      toast.error("Failed to load Discord settings")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { if (token) loadSettings() }, [token, loadSettings])

  const handleSave = async () => {
    if (!token) return
    setSaving(true)
    try {
      await discord.updateSettings(settings, token)
      toast.success("Discord settings saved!")
      loadSettings()
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const generateInviteUrl = () => {
    if (!settings.clientId) { toast.error("Enter Client ID first"); return }
    const url = `https://discord.com/api/oauth2/authorize?client_id=${settings.clientId}&permissions=274877991936&scope=bot`
    setSettings({ ...settings, inviteUrl: url })
    toast.success("Invite URL generated")
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  const inputStyle = {
    backgroundColor: "var(--brand-background)",
    border: "1px solid var(--brand-border)",
    color: "var(--brand-text)",
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-sm" style={{ color: "var(--brand-muted)" }}>Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(88,101,242,0.15)" }}>
            <Gamepad2 className="w-5 h-5" style={{ color: "#5865F2" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--brand-text)" }}>Discord Integration</h1>
            <p className="text-sm" style={{ color: "var(--brand-muted)" }}>Configure bot connection and user verification</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full" style={{
            backgroundColor: botReady ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            color: botReady ? "#22C55E" : "#EF4444",
          }}>
            {botReady ? "Bot Connected" : "Bot Offline"}
          </span>
        </div>
      </div>

      {/* Enable/Disable */}
      <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>Enable Discord Bot</p>
            <p className="text-xs mt-1" style={{ color: "var(--brand-muted)" }}>Allow users to link their Discord accounts for verification</p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, isEnabled: !settings.isEnabled })}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ backgroundColor: settings.isEnabled ? "var(--brand-primary)" : "var(--brand-border)" }}
          >
            <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform" style={{ transform: settings.isEnabled ? "translateX(20px)" : "translateX(0)" }} />
          </button>
        </div>
      </div>

      {/* Bot Credentials */}
      <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
          <Bot className="w-4 h-4" /> Bot Credentials
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Bot Token</label>
            <div className="flex gap-2">
              <input
                type={showToken ? "text" : "password"}
                value={settings.botToken}
                onChange={(e) => setSettings({ ...settings, botToken: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                style={inputStyle}
                placeholder="Bot token from Discord Developer Portal"
              />
              <button onClick={() => setShowToken(!showToken)} className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-muted)" }}>
                {showToken ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Client ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.clientId}
                onChange={(e) => setSettings({ ...settings, clientId: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                style={inputStyle}
                placeholder="Application Client ID"
              />
              <button onClick={() => copyToClipboard(settings.clientId, "Client ID")} className="p-2 rounded-lg" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-muted)" }}>
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Client Secret</label>
            <div className="flex gap-2">
              <input
                type={showSecret ? "text" : "password"}
                value={settings.clientSecret}
                onChange={(e) => setSettings({ ...settings, clientSecret: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                style={inputStyle}
                placeholder="Client Secret"
              />
              <button onClick={() => setShowSecret(!showSecret)} className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-muted)" }}>
                {showSecret ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Server & Channels */}
      <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
          <Server className="w-4 h-4" /> Server & Channels
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Guild (Server) ID</label>
            <input
              type="text"
              value={settings.guildId}
              onChange={(e) => setSettings({ ...settings, guildId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
              style={inputStyle}
              placeholder="Your Discord server ID"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Verification Channel ID</label>
            <input
              type="text"
              value={settings.verificationChannelId}
              onChange={(e) => setSettings({ ...settings, verificationChannelId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
              style={inputStyle}
              placeholder="Channel where users can run !verify"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Log Channel ID</label>
            <input
              type="text"
              value={settings.logChannelId}
              onChange={(e) => setSettings({ ...settings, logChannelId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
              style={inputStyle}
              placeholder="Channel for verification log messages"
            />
          </div>
        </div>
      </div>

      {/* Invite URL */}
      <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
          <ExternalLink className="w-4 h-4" /> Bot Invite
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={settings.inviteUrl}
            onChange={(e) => setSettings({ ...settings, inviteUrl: e.target.value })}
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
            placeholder="Bot invite URL"
          />
          <button
            onClick={generateInviteUrl}
            className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5"
            style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Generate
          </button>
          {settings.inviteUrl && (
            <a href={settings.inviteUrl} target="_blank" rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5"
              style={{ backgroundColor: "#5865F2", color: "#fff" }}
            >
              <ExternalLink className="w-3.5 h-3.5" /> Invite
            </a>
          )}
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--brand-muted)" }}>
          After adding the bot, enable <strong>Message Content Intent</strong> in Discord Developer Portal → Bot → Privileged Gateway Intents
        </p>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
          style={{ backgroundColor: "var(--brand-primary)", color: "#fff", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  )
}
