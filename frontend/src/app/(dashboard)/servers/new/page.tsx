"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useBranding } from "@/components/BrandingProvider"
import { discord } from "@/lib/api"
import {
  Server, ArrowLeft, Download, Cpu, HardDrive, Globe, FolderOpen,
  Settings, Play, ChevronRight, Check, Zap, Shield, Gamepad2,
  AlertCircle, MessageSquare
} from "lucide-react"

interface NodeData {
  id: string
  name: string
  displayName: string
  location: string
  isOnline: boolean
  totalRam: number
  totalDisk: number
  allocatedRam: number
  allocatedDisk: number
  maxServers: number
}

const SOFTWARE_OPTIONS = [
  { id: "paper", name: "Paper", desc: "High-performance Minecraft server with plugin support", category: "Minecraft" },
  { id: "purpur", name: "Purpur", desc: "Fork of Paper with extra configuration options", category: "Minecraft" },
  { id: "spigot", name: "Spigot", desc: "CraftBukkit fork with plugin support", category: "Minecraft" },
  { id: "fabric", name: "Fabric", desc: "Lightweight mod loader for Minecraft", category: "Modded" },
  { id: "forge", name: "Forge", desc: "Most popular mod loader for Minecraft", category: "Modded" },
  { id: "velocity", name: "Velocity Proxy", desc: "Modern Minecraft proxy for network setups", category: "Proxy" },
  { id: "waterfall", name: "Waterfall", desc: "BungeeCord fork by PaperMC", category: "Proxy" },
  { id: "nodejs", name: "Node.js", desc: "JavaScript/TypeScript application runtime", category: "Application" },
  { id: "python", name: "Python", desc: "Python application runtime", category: "Application" },
]

const RAM_PRESETS = [
  { label: "1 GB", value: 1024 },
  { label: "2 GB", value: 2048 },
  { label: "4 GB", value: 4096 },
  { label: "6 GB", value: 6144 },
  { label: "8 GB", value: 8192 },
  { label: "12 GB", value: 12288 },
  { label: "16 GB", value: 16384 },
]

export default function NewServerPage() {
  const router = useRouter()
  const { settings } = useBranding()
  const [step, setStep] = useState(1)
  const [nodes, setNodes] = useState<NodeData[]>([])
  const [creating, setCreating] = useState(false)
  const [serverName, setServerName] = useState("")
  const [software, setSoftware] = useState("paper")
  const [mcVersion, setMcVersion] = useState("latest")
  const [availableVersions, setAvailableVersions] = useState<string[]>(["latest"])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [ram, setRam] = useState(2048)
  const [disk, setDisk] = useState(10240)
  const [cpu, setCpu] = useState(100)
  const [port, setPort] = useState(25565)
  const [selectedNode, setSelectedNode] = useState("")
  const [gamemode, setGamemode] = useState("survival")
  const [difficulty, setDifficulty] = useState("normal")
  const [maxPlayers, setMaxPlayers] = useState(20)
  const [pvp, setPvp] = useState(true)
  const [onlineMode, setOnlineMode] = useState(true)
  const [autoStart, setAutoStart] = useState(false)
  const [limits, setLimits] = useState({ maxServers: 5, maxRamPerServer: 4096, maxDiskPerServer: 20480, maxCpuPerServer: 100, maxTotalRam: 16384, maxTotalDisk: 102400 })
  const [userServerCount, setUserServerCount] = useState(0)
  const [userTotalRam, setUserTotalRam] = useState(0)
  const [userTotalDisk, setUserTotalDisk] = useState(0)
  const [error, setError] = useState("")
  const [discordRequired, setDiscordRequired] = useState(false)
  const [discordVerified, setDiscordVerified] = useState(false)
  const [checkingDiscord, setCheckingDiscord] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    // Fetch limits
    fetch("/api/admin/limits", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d && !d.error) setLimits(d) })
      .catch(() => {})
    // Fetch user servers for usage
    fetch("/api/servers", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setUserServerCount(d.length)
          setUserTotalRam(d.reduce((sum: number, s: any) => sum + (s.ram || 0), 0))
          setUserTotalDisk(d.reduce((sum: number, s: any) => sum + (s.disk || 0), 0))
        }
      })
      .catch(() => {})
    // Check Discord verification requirement
    checkDiscordVerification()
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("token")
    fetch("/api/nodes", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : []
        setNodes(arr)
        if (arr.length > 0) setSelectedNode(arr[0].id)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setVersionsLoading(true)
    const token = localStorage.getItem("token")
    fetch(`/api/versions/${software}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const vers = Array.isArray(data.versions) ? data.versions : ["latest"]
        setAvailableVersions(vers)
        if (!vers.includes(mcVersion)) setMcVersion(vers[0] || "latest")
      })
      .catch(() => { setAvailableVersions(["latest"]); setMcVersion("latest"); })
      .finally(() => setVersionsLoading(false))
  }, [software])

  const checkDiscordVerification = async () => {
    try {
      const res = await discord.getStatus()
      setDiscordRequired(res.botReady && settings?.branding?.discordRequired !== false)
      setDiscordVerified(res.discord?.discordVerified || false)
    } catch {
      setDiscordRequired(false)
    } finally {
      setCheckingDiscord(false)
    }
  }

  const selectedSoftware = SOFTWARE_OPTIONS.find((s) => s.id === software)
  const selectedNodeData = nodes.find((n) => n.id === selectedNode)

  const availableRam = selectedNodeData ? selectedNodeData.totalRam - selectedNodeData.allocatedRam : 0
  const availableDisk = selectedNodeData ? selectedNodeData.totalDisk - selectedNodeData.allocatedDisk : 0

  const canProceed = (step: number) => {
    if (step === 1) return serverName.trim().length >= 3
    if (step === 2) return software && mcVersion
    if (step === 3) return ram > 0 && disk > 0 && port > 0
    return true
  }

  const handleCreate = async () => {
    if (discordRequired && !discordVerified) {
      router.push(`/discord-verify?redirect=${encodeURIComponent("/servers/new")}`)
      return
    }
    setCreating(true)
    setError("")
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: serverName,
          software,
          mcVersion,
          ram,
          disk,
          cpu,
          port,
          nodeId: selectedNode,
          autoStart,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push(`/servers/${data.id}`)
      } else {
        setError(data.error || "Failed to create server")
      }
    } catch (e) {
      setError("Failed to create server")
    } finally {
      setCreating(false)
    }
  }

  const inputStyle = {
    backgroundColor: "var(--brand-background)",
    border: "1px solid var(--brand-border)",
    color: "var(--brand-text)",
  }

  const steps = [
    { num: 1, label: "Name", icon: Server },
    { num: 2, label: "Software", icon: Download },
    { num: 3, label: "Resources", icon: Cpu },
    { num: 4, label: "Config", icon: Settings },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 animate-fade-in">
        <button
          onClick={() => router.push("/servers")}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: "var(--brand-muted)" }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
            <Gamepad2 className="w-6 h-6" style={{ color: "var(--brand-primary)" }} />
            Create New Server
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>
            Set up a new Minecraft server in minutes
          </p>
        </div>
      </div>

      {/* Step indicator */}
      {discordRequired && !discordVerified && !checkingDiscord && (
        <div className="mb-6 p-4 rounded-xl flex items-start gap-3 animate-fade-in" style={{ backgroundColor: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)" }}>
          <MessageSquare className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "var(--brand-primary)" }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium mb-1" style={{ color: "var(--brand-text)" }}>Discord Verification Required</p>
            <p className="text-sm" style={{ color: "var(--brand-muted)" }}>
              You must verify your Discord account before creating a server. 
              <button
                onClick={() => router.push(`/discord-verify?redirect=${encodeURIComponent("/servers/new")}`)}
                className="text-sm font-medium underline"
                style={{ color: "var(--brand-primary)" }}
              >
                Verify now
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 animate-fade-in-up delay-100">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <button
              onClick={() => s.num <= step && setStep(s.num)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                step === s.num
                  ? "text-white"
                  : step > s.num
                  ? "text-white/70 hover:text-white"
                  : "text-white/30"
              }`}
              style={{
                backgroundColor: step === s.num ? "var(--brand-primary)" : step > s.num ? "rgba(124,58,237,0.2)" : "transparent",
                border: `1px solid ${step >= s.num ? "var(--brand-primary)" : "var(--brand-border)"}`,
              }}
            >
              {step > s.num ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <ChevronRight className="w-4 h-4 mx-1" style={{ color: "var(--brand-muted)", opacity: 0.3 }} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-xl p-6 animate-fade-in-up delay-200" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        {/* Step 1: Name */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
              <Server className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
              Server Name
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--brand-muted)" }}>
              Choose a name for your server. This will be used as the directory name and in server.properties.
            </p>
            <input
              type="text"
              placeholder="my-minecraft-server"
              value={serverName}
              onChange={(e) => setServerName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              className="w-full px-4 py-3 rounded-lg text-lg outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              style={inputStyle}
              autoFocus
            />
            <p className="text-xs mt-2" style={{ color: "var(--brand-muted)" }}>
              Only lowercase letters, numbers, and hyphens. 3-64 characters.
            </p>
          </div>
        )}

        {/* Step 2: Software */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
              <Download className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
              Select Software
            </h2>
            <div className="space-y-4 mb-6">
              {(["Minecraft", "Modded", "Proxy", "Application"] as const).map((cat) => (
                <div key={cat}>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: "var(--brand-muted)" }}>{cat}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SOFTWARE_OPTIONS.filter((s) => s.category === cat).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSoftware(s.id)}
                        className="p-3 rounded-lg text-left transition-all"
                        style={{
                          backgroundColor: software === s.id ? "rgba(124,58,237,0.15)" : "var(--brand-background)",
                          border: `1px solid ${software === s.id ? "var(--brand-primary)" : "var(--brand-border)"}`,
                        }}
                      >
                        <div className="font-medium text-sm" style={{ color: "var(--brand-text)" }}>{s.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--brand-muted)" }}>{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-medium mb-2" style={{ color: "var(--brand-text)" }}>Version</h3>
            {versionsLoading ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--brand-muted)" }}>
                <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "var(--brand-primary)", borderRightColor: "transparent" }}></div>
                Loading versions...
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                {availableVersions.map((v) => (
                  <button
                    key={v}
                    onClick={() => setMcVersion(v)}
                    className="px-3 py-1.5 rounded-lg text-sm transition-all"
                    style={{
                      backgroundColor: mcVersion === v ? "var(--brand-primary)" : "var(--brand-background)",
                      border: `1px solid ${mcVersion === v ? "var(--brand-primary)" : "var(--brand-border)"}`,
                      color: mcVersion === v ? "white" : "var(--brand-text)",
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Resources */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
              <Cpu className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
              Resources
            </h2>

            {/* Node selection */}
            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block" style={{ color: "var(--brand-text)" }}>Node</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {nodes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setSelectedNode(n.id)}
                    className="p-3 rounded-lg text-left transition-all"
                    style={{
                      backgroundColor: selectedNode === n.id ? "rgba(124,58,237,0.15)" : "var(--brand-background)",
                      border: `1px solid ${selectedNode === n.id ? "var(--brand-primary)" : "var(--brand-border)"}`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${n.isOnline ? "bg-green-500 animate-status-pulse" : "bg-gray-400"}`} />
                      <span className="font-medium text-sm" style={{ color: "var(--brand-text)" }}>{n.displayName}</span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: "var(--brand-muted)" }}>
                      {n.location} • {Math.round((n.totalRam - n.allocatedRam) / 1024)}GB free
                    </div>
                  </button>
                ))}
                {nodes.length === 0 && (
                  <div className="col-span-2 p-4 text-center rounded-lg" style={{ backgroundColor: "var(--brand-background)", border: "1px dashed var(--brand-border)" }}>
                    <p className="text-sm" style={{ color: "var(--brand-muted)" }}>No nodes available. A local node will be auto-created.</p>
                  </div>
                )}
              </div>
            </div>

            {/* RAM */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>
                  RAM: {Math.floor(ram / 1024)} GB ({ram} MB)
                </label>
                <span className="text-[11px]" style={{ color: "var(--brand-muted)" }}>
                  Limit: {limits.maxRamPerServer / 1024}GB per server &middot; {(limits.maxTotalRam - userTotalRam) / 1024}GB remaining
                </span>
              </div>
              <input
                type="range"
                min={512}
                max={Math.min(limits.maxRamPerServer, availableRam || limits.maxRamPerServer)}
                step={256}
                value={ram}
                onChange={(e) => setRam(parseInt(e.target.value))}
                className="w-full accent-white"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {RAM_PRESETS.filter((p) => p.value <= limits.maxRamPerServer && p.value <= (availableRam || limits.maxRamPerServer)).map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setRam(p.value)}
                    className="px-3 py-1 rounded text-xs transition-all"
                    style={{
                      backgroundColor: ram === p.value ? "var(--brand-text)" : "var(--brand-background)",
                      border: `1px solid ${ram === p.value ? "var(--brand-text)" : "var(--brand-border)"}`,
                      color: ram === p.value ? "var(--brand-background)" : "var(--brand-muted)",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Disk */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>
                  Disk: {Math.floor(disk / 1024)} GB ({disk} MB)
                </label>
                <span className="text-[11px]" style={{ color: "var(--brand-muted)" }}>
                  Limit: {limits.maxDiskPerServer / 1024}GB per server &middot; {(limits.maxTotalDisk - userTotalDisk) / 1024}GB remaining
                </span>
              </div>
              <input
                type="range"
                min={1024}
                max={Math.min(limits.maxDiskPerServer, availableDisk || limits.maxDiskPerServer)}
                step={1024}
                value={disk}
                onChange={(e) => setDisk(parseInt(e.target.value))}
                className="w-full accent-white"
              />
            </div>

            {/* CPU */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>
                  CPU: {cpu}%
                </label>
                <span className="text-[11px]" style={{ color: "var(--brand-muted)" }}>
                  Limit: {limits.maxCpuPerServer}% per server
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={limits.maxCpuPerServer}
                step={10}
                value={cpu}
                onChange={(e) => setCpu(parseInt(e.target.value))}
                className="w-full accent-white"
              />
            </div>

            {/* Server count limit */}
            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)" }}>
              <div className="flex items-center justify-between text-[12px]">
                <span style={{ color: "var(--brand-muted)" }}>Servers: {userServerCount} / {limits.maxServers}</span>
                <span style={{ color: "var(--brand-muted)" }}>Total RAM: {(userTotalRam / 1024).toFixed(1)} / {(limits.maxTotalRam / 1024).toFixed(0)} GB</span>
                <span style={{ color: "var(--brand-muted)" }}>Total Disk: {(userTotalDisk / 1024).toFixed(0)} / {(limits.maxTotalDisk / 1024).toFixed(0)} GB</span>
              </div>
            </div>

            {/* Port */}
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: "var(--brand-text)" }}>Port</label>
              <input
                type="number"
                min={1024}
                max={65535}
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value) || 25565)}
                className="w-full px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                style={inputStyle}
              />
              <p className="text-xs mt-1" style={{ color: "var(--brand-muted)" }}>
                Minecraft default: 25565. Each server needs a unique port.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Config */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
              <Settings className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
              Server Configuration
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "var(--brand-text)" }}>Gamemode</label>
                <select
                  value={gamemode}
                  onChange={(e) => setGamemode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg outline-none"
                  style={inputStyle}
                >
                  <option value="survival">Survival</option>
                  <option value="creative">Creative</option>
                  <option value="adventure">Adventure</option>
                  <option value="spectator">Spectator</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "var(--brand-text)" }}>Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg outline-none"
                  style={inputStyle}
                >
                  <option value="peaceful">Peaceful</option>
                  <option value="easy">Easy</option>
                  <option value="normal">Normal</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block" style={{ color: "var(--brand-text)" }}>Max Players: {maxPlayers}</label>
              <input
                type="range"
                min={1}
                max={100}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>

            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-white/5" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)" }}>
                <input type="checkbox" checked={pvp} onChange={(e) => setPvp(e.target.checked)} className="w-4 h-4 accent-purple-500" />
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>PvP</div>
                  <div className="text-xs" style={{ color: "var(--brand-muted)" }}>Allow player vs player combat</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-white/5" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)" }}>
                <input type="checkbox" checked={onlineMode} onChange={(e) => setOnlineMode(e.target.checked)} className="w-4 h-4 accent-purple-500" />
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>Online Mode</div>
                  <div className="text-xs" style={{ color: "var(--brand-muted)" }}>Require premium Minecraft accounts</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-white/5" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)" }}>
                <input type="checkbox" checked={autoStart} onChange={(e) => setAutoStart(e.target.checked)} className="w-4 h-4 accent-purple-500" />
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>Auto-Start</div>
                  <div className="text-xs" style={{ color: "var(--brand-muted)" }}>Start server when panel boots</div>
                </div>
              </label>
            </div>

            {/* Summary */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)" }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--brand-text)" }}>Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div style={{ color: "var(--brand-muted)" }}>Name:</div>
                <div style={{ color: "var(--brand-text)" }}>{serverName}</div>
                <div style={{ color: "var(--brand-muted)" }}>Software:</div>
                <div style={{ color: "var(--brand-text)" }}>{selectedSoftware?.name} {mcVersion}</div>
                <div style={{ color: "var(--brand-muted)" }}>RAM:</div>
                <div style={{ color: "var(--brand-text)" }}>{Math.floor(ram / 1024)} GB</div>
                <div style={{ color: "var(--brand-muted)" }}>Disk:</div>
                <div style={{ color: "var(--brand-text)" }}>{Math.floor(disk / 1024)} GB</div>
                <div style={{ color: "var(--brand-muted)" }}>Port:</div>
                <div style={{ color: "var(--brand-text)" }}>{port}</div>
                <div style={{ color: "var(--brand-muted)" }}>Gamemode:</div>
                <div style={{ color: "var(--brand-text)" }}>{gamemode}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-6 animate-fade-in-up delay-300">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : router.push("/servers")}
          className="px-6 py-2.5 rounded-lg font-medium transition-all hover:bg-white/5"
          style={{ border: "1px solid var(--brand-border)", color: "var(--brand-muted)" }}
        >
          {step === 1 ? "Cancel" : "Back"}
        </button>
        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed(step)}
            className="px-6 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--brand-primary)", color: "white" }}
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-primary)", color: "white" }}
          >
            {error && (
              <div className="mb-3 p-3 rounded-lg text-[12px]" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}>
                {error}
              </div>
            )}
            {creating ? (
              <>
                <div className="spinner" />
                Creating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Create Server
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
