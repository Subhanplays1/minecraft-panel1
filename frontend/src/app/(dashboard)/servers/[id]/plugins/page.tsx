"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Puzzle, Search, Download, Loader2, ExternalLink, Check, Filter } from "lucide-react"

interface HangarPlugin {
  slug: string
  name: string
  description: string
  downloads: number
  tags: string[]
  owners: Array<{ name: string }>
  createdAt: string
  updatedAt: string
  category: string
  icon?: { url: string }
}

export default function ServerPluginsPage() {
  const params = useParams()
  const id = params.id as string
  const [search, setSearch] = useState("")
  const [plugins, setPlugins] = useState<HangarPlugin[]>([])
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState<string | null>(null)
  const [installed, setInstalled] = useState<string[]>([])
  const [category, setCategory] = useState("ALL")
  const [serverInfo, setServerInfo] = useState<{ software: string; status: string } | null>(null)

  const CATEGORIES = ["ALL", "ADMIN", "FUN", "ECONOMY", "PROTECTION", "WORLD", "CHAT", "CONFIG", "DEV", "MECHANICS", "MISC", "ROLEPLAY", "TECHNOLOGY", "TOOLS", "RENDERING"]

  useEffect(() => {
    const token = localStorage.getItem("token")
    fetch(`/api/servers/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => setServerInfo({ software: d.software, status: d.status })).catch(() => {})
  }, [id])

  const searchPlugins = async (q: string) => {
    if (!q.trim()) { setPlugins([]); return }
    setLoading(true)
    try {
      const categoryParam = category !== "ALL" ? `&category=${category}` : ""
      const res = await fetch(`https://hangar.papermc.io/api/v1/search?query=${encodeURIComponent(q)}&limit=20${categoryParam}`)
      if (res.ok) {
        const data = await res.json()
        setPlugins(data.result || [])
      }
    } catch {
      setPlugins([])
    } finally { setLoading(false) }
  }

  const installPlugin = async (plugin: HangarPlugin) => {
    setInstalling(plugin.slug)
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/servers/${id}/install-plugin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slug: plugin.slug, name: plugin.name }),
      })
      setInstalled((prev) => [...prev, plugin.slug])
    } catch {} finally { setInstalling(null) }
  }

  useEffect(() => {
    const t = setTimeout(() => { if (search.trim()) searchPlugins(search) }, 500)
    return () => clearTimeout(t)
  }, [search, category])

  const canInstall = serverInfo?.software === "paper" || serverInfo?.software === "spigot" || serverInfo?.software === "purpur"

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 animate-fade-in">
        <h1 className="text-xl font-bold" style={{ color: "var(--brand-text)" }}>Plugin Installer</h1>
        <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>Search and install plugins from Hangar</p>
      </div>

      {!canInstall && (
        <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.3)" }}>
          <p className="text-sm" style={{ color: "#eab308" }}>Plugin management is only available for Paper, Spigot, and Purpur servers.</p>
        </div>
      )}

      {/* Search bar */}
      <div className="flex gap-3 mb-4 animate-fade-in-up">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--brand-muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plugins..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
            style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
          />
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 animate-fade-in-up delay-100">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
            style={{
              backgroundColor: category === cat ? "var(--brand-primary)" : "var(--brand-card)",
              color: category === cat ? "white" : "var(--brand-muted)",
              border: `1px solid ${category === cat ? "var(--brand-primary)" : "var(--brand-border)"}`,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center p-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--brand-primary)" }} /></div>
      ) : plugins.length === 0 ? (
        <div className="text-center py-20 animate-fade-in" style={{ color: "var(--brand-muted)" }}>
          <Puzzle className="w-14 h-14 mx-auto mb-3 opacity-20" />
          <p className="text-lg font-medium mb-1">Search for plugins</p>
          <p className="text-sm">Type a plugin name above to search Hangar</p>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in-up delay-200">
          {plugins.map((plugin) => (
            <div key={plugin.slug} className="p-4 rounded-xl flex items-start gap-4 card-hover" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
              {plugin.icon?.url ? (
                <img src={plugin.icon.url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(124,58,237,0.12)" }}>
                  <Puzzle className="w-6 h-6" style={{ color: "var(--brand-primary)" }} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm" style={{ color: "var(--brand-text)" }}>{plugin.name}</h3>
                  {plugin.tags?.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(124,58,237,0.12)", color: "var(--brand-primary)" }}>{tag}</span>
                  ))}
                </div>
                <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--brand-muted)" }}>{plugin.description}</p>
                <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color: "var(--brand-muted)" }}>
                  <span>by {plugin.owners?.map((o) => o.name).join(", ")}</span>
                  <span>{plugin.downloads.toLocaleString()} downloads</span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {installed.includes(plugin.slug) ? (
                  <span className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
                    <Check className="w-3 h-3" /> Installed
                  </span>
                ) : (
                  <button
                    onClick={() => installPlugin(plugin)}
                    disabled={installing === plugin.slug || !canInstall}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all hover-lift disabled:opacity-50"
                    style={{ backgroundColor: "var(--brand-primary)", color: "white" }}
                  >
                    {installing === plugin.slug ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    Install
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
