"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Save, Loader2, FileText, RefreshCw } from "lucide-react"

interface ServerInfo {
  id: string
  name: string
  port: number
  ram: number
  cpu: number
  mcVersion: string
  software: string
  status: string
}

const DEFAULT_PROPERTIES: Record<string, string> = {
  "server-port": "25565",
  "max-players": "20",
  "motd": "A Minecraft Server",
  "level-name": "world",
  "gamemode": "survival",
  "difficulty": "normal",
  "pvp": "true",
  "online-mode": "true",
  "view-distance": "10",
  "simulation-distance": "10",
  "white-list": "false",
  "spawn-protection": "16",
  "max-world-size": "29999984",
  "allow-nether": "true",
  "spawn-monsters": "true",
  "spawn-animals": "true",
  "spawn-npcs": "true",
  "generate-structures": "true",
  "allow-flight": "false",
  "max-tick-time": "60000",
  "network-compression-threshold": "256",
  "rate-limit": "0",
  "entity-broadcast-range-percentage": "100",
  "sync-chunk-writes": "true",
  "enable-command-block": "false",
  "force-gamemode": "false",
  "hardcore": "false",
  "enable-status": "true",
  "hide-online-players": "false",
}

export default function PropertiesPage() {
  const params = useParams()
  const id = params.id as string
  const [server, setServer] = useState<ServerInfo | null>(null)
  const [properties, setProperties] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    fetch(`/api/servers/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setServer(data)
        setProperties({
          ...DEFAULT_PROPERTIES,
          "server-port": String(data.port || 25565),
        })
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/servers/${id}/properties`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(properties),
      })
    } catch {} finally { setSaving(false) }
  }

  const updateProp = (key: string, value: string) => {
    setProperties(prev => ({ ...prev, [key]: value }))
  }

  const filtered = Object.entries(properties).filter(([k]) =>
    !filter || k.toLowerCase().includes(filter.toLowerCase())
  )

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "transparent" }}><div className="animate-pulse" style={{ color: "var(--brand-muted)" }}>Loading...</div></div>

  return (
    <div className="p-6" style={{ backgroundColor: "transparent" }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--brand-text)" }}><FileText size={24} /> Server Properties</h1>
            <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>Edit your server.properties configuration</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setProperties({ ...DEFAULT_PROPERTIES, "server-port": String(server?.port || 25565) })} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--brand-card)", color: "var(--brand-muted)", border: "1px solid var(--brand-border)" }}><RefreshCw size={14} /> Reset</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50" style={{ backgroundColor: "var(--brand-primary)" }}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save</button>
          </div>
        </div>

        <div className="mb-4">
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter properties..." className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
        </div>

        <div className="space-y-2">
          {filtered.map(([key, value]) => (
            <div key={key} className="p-3 rounded-xl flex items-center gap-4" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
              <span className="text-sm font-mono min-w-[220px] flex-shrink-0" style={{ color: "var(--brand-primary)" }}>{key}</span>
              <input value={value} onChange={e => updateProp(key, e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
