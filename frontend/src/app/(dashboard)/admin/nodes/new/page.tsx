"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Network, ArrowLeft, Globe, Cpu, HardDrive, Shield, Server,
  ChevronRight, Check, Loader2, Wifi, MapPin
} from "lucide-react"

const LOCATION_PRESETS = [
  { name: "Local", country: "Local Machine", code: "LC" },
  { name: "New York, USA", country: "United States", code: "US" },
  { name: "Amsterdam, Netherlands", country: "Europe", code: "NL" },
  { name: "London, UK", country: "United Kingdom", code: "GB" },
  { name: "Frankfurt, Germany", country: "Europe", code: "DE" },
  { name: "Singapore", country: "Asia", code: "SG" },
  { name: "Tokyo, Japan", country: "Asia", code: "JP" },
  { name: "Sydney, Australia", country: "Oceania", code: "AU" },
  { name: "São Paulo, Brazil", country: "South America", code: "BR" },
]

export default function NewNodePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [description, setDescription] = useState("")
  const [hostname, setHostname] = useState("127.0.0.1")
  const [port, setPort] = useState(8080)
  const [scheme, setScheme] = useState("http")
  const [location, setLocation] = useState("Local")
  const [token, setToken] = useState("")
  const [maxServers, setMaxServers] = useState(50)
  const [totalRam, setTotalRam] = useState(32768)
  const [totalDisk, setTotalDisk] = useState(512000)
  const [autoDetect, setAutoDetect] = useState(true)

  const canProceed = (s: number) => {
    if (s === 1) return name.trim().length >= 2 && displayName.trim().length >= 2
    if (s === 2) return hostname.trim().length > 0 && port > 0
    return true
  }

  const handleCreate = async () => {
    setCreating(true)
    setError("")
    try {
      const resToken = localStorage.getItem("token")
      const res = await fetch("/api/nodes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resToken}`,
        },
        body: JSON.stringify({
          name,
          displayName,
          description,
          hostname,
          port,
          scheme,
          location,
          token: token || undefined,
          maxServers,
          totalRam,
          totalDisk,
          isVisible: true,
          isOnline: true,
        }),
      })
      if (res.ok) {
        router.push("/admin/nodes")
      } else {
        const data = await res.json().catch(() => ({ error: "Failed to create node" }))
        setError(data.error || "Failed to create node")
      }
    } catch (e) {
      console.error(e)
      setError("Network error. Is the backend running?")
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
    { num: 1, label: "Identity", icon: Network },
    { num: 2, label: "Connection", icon: Globe },
    { num: 3, label: "Resources", icon: Cpu },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 animate-fade-in">
        <button
          onClick={() => router.push("/admin/nodes")}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: "var(--brand-muted)" }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
            <Network className="w-6 h-6" style={{ color: "var(--brand-primary)" }} />
            Create New Node
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>
            Add a new node to host Minecraft servers
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8 animate-fade-in-up delay-100">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <button
              onClick={() => s.num <= step && setStep(s.num)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: step === s.num ? "var(--brand-primary)" : step > s.num ? "rgba(124,58,237,0.2)" : "transparent",
                color: step === s.num ? "white" : step > s.num ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)",
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

        {/* Step 1: Identity */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
              <Network className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
              Node Identity
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--brand-muted)" }}>
              Give your node a name and description. The name is used internally (lowercase, no spaces).
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--brand-text)" }}>Node Name *</label>
                <input
                  type="text"
                  placeholder="e.g. us-east-1"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                    if (!displayName) setDisplayName(e.target.value)
                  }}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  style={inputStyle}
                  autoFocus
                />
                <p className="text-xs mt-1.5" style={{ color: "var(--brand-muted)" }}>
                  Lowercase alphanumeric and hyphens only. Used in URLs and identification.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--brand-text)" }}>Display Name *</label>
                <input
                  type="text"
                  placeholder="e.g. US East Server 1"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  style={inputStyle}
                />
                <p className="text-xs mt-1.5" style={{ color: "var(--brand-muted)" }}>
                  Human-readable name shown in the panel.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--brand-text)" }}>Description</label>
                <textarea
                  placeholder="Optional description for this node..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--brand-text)" }}>Location</label>
                <div className="grid grid-cols-3 gap-2">
                  {LOCATION_PRESETS.map((loc) => (
                    <button
                      key={loc.name}
                      onClick={() => setLocation(loc.name)}
                      className="p-3 rounded-lg text-left transition-all"
                      style={{
                        backgroundColor: location === loc.name ? "rgba(124,58,237,0.15)" : "var(--brand-background)",
                        border: `1px solid ${location === loc.name ? "var(--brand-primary)" : "var(--brand-border)"}`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" style={{ color: location === loc.name ? "var(--brand-primary)" : "var(--brand-muted)" }} />
                        <span className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>{loc.name}</span>
                      </div>
                      <span className="text-xs" style={{ color: "var(--brand-muted)" }}>{loc.country}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Connection */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
              <Globe className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
              Connection Settings
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--brand-muted)" }}>
              Configure how the panel connects to this node. Make sure the daemon is running on the node.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--brand-text)" }}>Scheme</label>
                <div className="flex gap-3">
                  {["http", "https"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setScheme(s)}
                      className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all"
                      style={{
                        backgroundColor: scheme === s ? "rgba(124,58,237,0.15)" : "var(--brand-background)",
                        border: `1px solid ${scheme === s ? "var(--brand-primary)" : "var(--brand-border)"}`,
                        color: scheme === s ? "var(--brand-primary)" : "var(--brand-muted)",
                      }}
                    >
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--brand-text)" }}>Hostname / IP *</label>
                <input
                  type="text"
                  placeholder="127.0.0.1"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono"
                  style={inputStyle}
                />
                <p className="text-xs mt-1.5" style={{ color: "var(--brand-muted)" }}>
                  IP address or domain of the node. Use 127.0.0.1 for local nodes.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--brand-text)" }}>Port *</label>
                <input
                  type="number"
                  min={1}
                  max={65535}
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value) || 8080)}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono"
                  style={inputStyle}
                />
                <p className="text-xs mt-1.5" style={{ color: "var(--brand-muted)" }}>
                  Port the node daemon listens on. Default: 8080
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--brand-text)" }}>Daemon Token</label>
                <input
                  type="password"
                  placeholder="Leave empty to auto-generate"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono"
                  style={inputStyle}
                />
                <p className="text-xs mt-1.5" style={{ color: "var(--brand-muted)" }}>
                  Authentication token for the node daemon. A random token will be generated if left empty.
                </p>
              </div>

              {/* Connection preview */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)" }}>
                <div className="text-xs font-medium mb-2" style={{ color: "var(--brand-muted)" }}>Connection URL</div>
                <div className="font-mono text-sm" style={{ color: "var(--brand-primary)" }}>
                  {scheme}://{hostname}:{port}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Resources */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
              <Cpu className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
              Resource Limits
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--brand-muted)" }}>
              Set the maximum resources this node can allocate to servers.
            </p>

            <div className="space-y-6">
              {/* Max Servers */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "var(--brand-text)" }}>
                  Max Servers: {maxServers}
                </label>
                <input
                  type="range"
                  min={1}
                  max={200}
                  value={maxServers}
                  onChange={(e) => setMaxServers(parseInt(e.target.value))}
                  className="w-full accent-purple-500"
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: "var(--brand-muted)" }}>
                  <span>1</span>
                  <span>200</span>
                </div>
              </div>

              {/* Total RAM */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "var(--brand-text)" }}>
                  Total RAM: {(totalRam / 1024).toFixed(0)} GB ({totalRam} MB)
                </label>
                <input
                  type="range"
                  min={1024}
                  max={131072}
                  step={1024}
                  value={totalRam}
                  onChange={(e) => setTotalRam(parseInt(e.target.value))}
                  className="w-full accent-purple-500"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {[4096, 8192, 16384, 32768, 65536].map((gb) => (
                    <button
                      key={gb}
                      onClick={() => setTotalRam(gb)}
                      className="px-3 py-1 rounded text-xs transition-all"
                      style={{
                        backgroundColor: totalRam === gb ? "var(--brand-primary)" : "var(--brand-background)",
                        border: `1px solid ${totalRam === gb ? "var(--brand-primary)" : "var(--brand-border)"}`,
                        color: totalRam === gb ? "white" : "var(--brand-muted)",
                      }}
                    >
                      {(gb / 1024).toFixed(0)} GB
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Disk */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "var(--brand-text)" }}>
                  Total Disk: {(totalDisk / 1024).toFixed(0)} GB ({totalDisk} MB)
                </label>
                <input
                  type="range"
                  min={10240}
                  max={2048000}
                  step={10240}
                  value={totalDisk}
                  onChange={(e) => setTotalDisk(parseInt(e.target.value))}
                  className="w-full accent-purple-500"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {[51200, 102400, 204800, 512000, 1024000].map((gb) => (
                    <button
                      key={gb}
                      onClick={() => setTotalDisk(gb)}
                      className="px-3 py-1 rounded text-xs transition-all"
                      style={{
                        backgroundColor: totalDisk === gb ? "var(--brand-primary)" : "var(--brand-background)",
                        border: `1px solid ${totalDisk === gb ? "var(--brand-primary)" : "var(--brand-border)"}`,
                        color: totalDisk === gb ? "white" : "var(--brand-muted)",
                      }}
                    >
                      {(gb / 1024).toFixed(0)} GB
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)" }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--brand-text)" }}>Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div style={{ color: "var(--brand-muted)" }}>Name:</div>
                  <div style={{ color: "var(--brand-text)" }}>{displayName || name}</div>
                  <div style={{ color: "var(--brand-muted)" }}>Location:</div>
                  <div style={{ color: "var(--brand-text)" }}>{location}</div>
                  <div style={{ color: "var(--brand-muted)" }}>Address:</div>
                  <div className="font-mono" style={{ color: "var(--brand-primary)" }}>{scheme}://{hostname}:{port}</div>
                  <div style={{ color: "var(--brand-muted)" }}>Max Servers:</div>
                  <div style={{ color: "var(--brand-text)" }}>{maxServers}</div>
                  <div style={{ color: "var(--brand-muted)" }}>Total RAM:</div>
                  <div style={{ color: "var(--brand-text)" }}>{(totalRam / 1024).toFixed(0)} GB</div>
                  <div style={{ color: "var(--brand-muted)" }}>Total Disk:</div>
                  <div style={{ color: "var(--brand-text)" }}>{(totalDisk / 1024).toFixed(0)} GB</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm animate-fade-in" style={{ backgroundColor: "rgba(239,68,68,0.15)", border: "1px solid var(--brand-danger)", color: "var(--brand-danger)" }}>
          {error}
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-between mt-6 animate-fade-in-up delay-300">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : router.push("/admin/nodes")}
          className="px-6 py-2.5 rounded-lg font-medium transition-all hover:bg-white/5"
          style={{ border: "1px solid var(--brand-border)", color: "var(--brand-muted)" }}
        >
          {step === 1 ? "Cancel" : "Back"}
        </button>
        {step < 3 ? (
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
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Network className="w-4 h-4" />
                Create Node
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
