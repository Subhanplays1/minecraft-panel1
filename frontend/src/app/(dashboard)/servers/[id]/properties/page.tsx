"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Save, Loader2, FileText, RefreshCw, Search, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

interface ServerInfo {
  id: string; name: string; port: number; ram: number; cpu: number;
  mcVersion: string; software: string; status: string
}

const PROP_CATEGORIES: Record<string, { keys: string[]; icon: string }> = {
  "Gameplay": { keys: ["gamemode", "difficulty", "pvp", "hardcore", "force-gamemode", "allow-flight", "max-tick-time", "spawn-protection", "max-world-size"], icon: "🎮" },
  "World": { keys: ["level-name", "level-seed", "level-type", "generate-structures", "allow-nether", "spawn-monsters", "spawn-animals", "spawn-npcs", "world-container"], icon: "🌍" },
  "Server": { keys: ["server-port", "server-ip", "motd", "max-players", "online-mode", "white-list", "enable-status", "hide-online-players", "rate-limit", "network-compression-threshold"], icon: "🖥" },
  "Performance": { keys: ["view-distance", "simulation-distance", "sync-chunk-writes", "entity-broadcast-range-percentage"], icon: "⚡" },
  "Commands": { keys: ["enable-command-block", "op-permission-level", "function-permission-level"], icon: "⌨" },
  "Other": { keys: [], icon: "⚙" },
}

const BOOLEAN_KEYS = ["pvp", "online-mode", "white-list", "allow-nether", "spawn-monsters", "spawn-animals", "spawn-npcs", "generate-structures", "allow-flight", "force-gamemode", "hardcore", "enable-status", "hide-online-players", "sync-chunk-writes", "enable-command-block"]

const DESCRIPTIONS: Record<string, string> = {
  "gamemode": "Default gamemode for new players (survival/creative/adventure/spectator)",
  "difficulty": "Server difficulty (peaceful/easy/normal/hard)",
  "pvp": "Allow player vs player combat",
  "hardcore": "Hardcore mode — players are banned on death",
  "force-gamemode": "Force gamemode on every login",
  "allow-flight": "Allow flying in survival mode",
  "level-name": "Name of the world folder",
  "level-seed": "Seed for world generation",
  "generate-structures": "Generate villages, temples, etc.",
  "allow-nether": "Allow Nether dimension",
  "spawn-monsters": "Allow hostile mobs to spawn",
  "spawn-animals": "Allow passive mobs to spawn",
  "spawn-npcs": "Allow villager NPCs",
  "server-port": "Network port for the Minecraft server",
  "motd": "Message shown in the server list",
  "max-players": "Maximum player slots",
  "online-mode": "Verify players with Mojang servers",
  "white-list": "Only allow whitelisted players",
  "enable-status": "Show server in server list",
  "hide-online-players": "Hide the player list from status",
  "view-distance": "Server render distance (chunks)",
  "simulation-distance": "Distance where entities are ticked",
  "sync-chunk-writes": "Synchronously write chunks to disk",
  "entity-broadcast-range-percentage": "Entity render range percentage",
  "network-compression-threshold": "Packet compression threshold",
  "rate-limit": "Max packets per second per IP",
  "max-tick-time": "MS before Watchdog kills server (60000 = off)",
  "spawn-protection": "Protected radius around spawn",
  "max-world-size": "Max world radius in blocks",
  "enable-command-block": "Allow command blocks",
  "op-permission-level": "Default operator permission level (1-4)",
  "function-permission-level": "Permission level for function commands",
  "level-type": "World type (default/amplified/flat/largebiomes)",
  "world-container": "Directory for world storage",
}

const DEFAULT_PROPERTIES: Record<string, string> = {
  "server-port": "25565", "max-players": "20", "motd": "A Minecraft Server",
  "level-name": "world", "gamemode": "survival", "difficulty": "normal",
  "pvp": "true", "online-mode": "true", "view-distance": "10",
  "simulation-distance": "10", "white-list": "false", "spawn-protection": "16",
  "max-world-size": "29999984", "allow-nether": "true", "spawn-monsters": "true",
  "spawn-animals": "true", "spawn-npcs": "true", "generate-structures": "true",
  "allow-flight": "false", "max-tick-time": "60000", "network-compression-threshold": "256",
  "rate-limit": "0", "entity-broadcast-range-percentage": "100",
  "sync-chunk-writes": "true", "enable-command-block": "false",
  "force-gamemode": "false", "hardcore": "false", "enable-status": "true",
  "hide-online-players": "false",
}

export default function PropertiesPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [server, setServer] = useState<ServerInfo | null>(null)
  const [properties, setProperties] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const [unsaved, setUnsaved] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    fetch(`/api/servers/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setServer(data)
        setProperties({ ...DEFAULT_PROPERTIES, "server-port": String(data.port || 25565) })
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/properties`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(properties),
      })
      if (res.ok) { toast.success("Properties saved"); setUnsaved(false) }
      else toast.error("Failed to save")
    } catch { toast.error("Failed to save") }
    finally { setSaving(false) }
  }

  const updateProp = (key: string, value: string) => {
    setProperties(prev => ({ ...prev, [key]: value }))
    setUnsaved(true)
  }

  const toggleBoolean = (key: string) => {
    updateProp(key, properties[key] === "true" ? "false" : "true")
  }

  const categorizedKeys = Object.keys(properties).filter(([k]) => {
    const matchFilter = !filter || k.toLowerCase().includes(filter.toLowerCase())
    if (activeCategory === "All") return matchFilter
    const cat = PROP_CATEGORIES[activeCategory]
    if (!cat) return matchFilter
    return cat.keys.includes(k) && matchFilter
  })

  const uncategorized = Object.keys(properties).filter(k => {
    return !Object.values(PROP_CATEGORIES).some(cat => cat.keys.includes(k))
  })

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "transparent" }}><div className="animate-pulse" style={{ color: "var(--brand-muted)" }}>Loading...</div></div>

  return (
    <div className="p-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/servers/${id}`)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--brand-muted)" }}>
            <ArrowLeft size={16} strokeWidth={1.5} />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
              <FileText size={18} strokeWidth={1.5} /> Server Properties
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--brand-muted)" }}>
              Configure your server.properties
              {unsaved && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: "rgba(234,179,8,0.15)", color: "#eab308" }}>Unsaved</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setProperties({ ...DEFAULT_PROPERTIES, "server-port": String(server?.port || 25565) }); setUnsaved(true); toast.success("Reset to defaults") }}
            className="btn-ghost text-[11px]"><RefreshCw size={12} /> Reset</button>
          <button onClick={handleSave} disabled={saving || !unsaved}
            className="btn-primary text-[12px] disabled:opacity-40">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--brand-muted)" }} />
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search properties..."
          className="input pl-9 pr-3 py-2 text-[12px]" />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        <button onClick={() => setActiveCategory("All")}
          className="px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all"
          style={{
            backgroundColor: activeCategory === "All" ? "var(--brand-text)" : "var(--brand-card)",
            color: activeCategory === "All" ? "var(--brand-background)" : "var(--brand-muted)",
            border: `1px solid ${activeCategory === "All" ? "var(--brand-text)" : "var(--brand-border)"}`,
          }}>All ({Object.keys(properties).length})</button>
        {Object.entries(PROP_CATEGORIES).map(([name, cat]) => {
          const count = Object.keys(properties).filter(k => cat.keys.includes(k)).length
          if (count === 0) return null
          return (
            <button key={name} onClick={() => setActiveCategory(name)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all"
              style={{
                backgroundColor: activeCategory === name ? "var(--brand-text)" : "var(--brand-card)",
                color: activeCategory === name ? "var(--brand-background)" : "var(--brand-muted)",
                border: `1px solid ${activeCategory === name ? "var(--brand-text)" : "var(--brand-border)"}`,
              }}>{cat.icon} {name} ({count})</button>
          )
        })}
      </div>

      {/* Properties list */}
      <div className="space-y-1.5">
        {categorizedKeys.map(key => {
          const isBool = BOOLEAN_KEYS.includes(key)
          const desc = DESCRIPTIONS[key]

          return (
            <div key={key} className="rounded-xl p-4 transition-colors hover:bg-white/[0.02]" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-mono font-medium" style={{ color: "var(--brand-text)" }}>{key}</span>
                    {isBool && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--brand-background)", color: "var(--brand-muted)" }}>toggle</span>
                    )}
                  </div>
                  {desc && <p className="text-[11px] mt-1" style={{ color: "var(--brand-muted)" }}>{desc}</p>}
                </div>
                <div className="flex-shrink-0">
                  {isBool ? (
                    <button onClick={() => toggleBoolean(key)}
                      className="relative w-10 h-5 rounded-full transition-colors"
                      style={{ backgroundColor: properties[key] === "true" ? "var(--brand-text)" : "var(--brand-background)", border: "1px solid var(--brand-border)" }}>
                      <span className="absolute top-0.5 w-3.5 h-3.5 rounded-full transition-transform"
                        style={{
                          backgroundColor: properties[key] === "true" ? "var(--brand-background)" : "var(--brand-muted)",
                          left: properties[key] === "true" ? "22px" : "3px",
                        }} />
                    </button>
                  ) : (
                    <input value={properties[key]} onChange={e => updateProp(key, e.target.value)}
                      className="input w-[180px] text-[12px] py-1.5 font-mono" />
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {categorizedKeys.length === 0 && (
          <div className="text-center py-12" style={{ color: "var(--brand-muted)" }}>
            <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-[13px]">No properties found</p>
          </div>
        )}
      </div>
    </div>
  )
}
