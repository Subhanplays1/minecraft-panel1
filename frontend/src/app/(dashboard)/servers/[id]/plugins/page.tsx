"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Puzzle, Search, Download, Loader2, ExternalLink, Check, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

interface Plugin {
  id: string
  slug: string
  name: string
  description: string
  downloads: number
  version: string
  author: string
  icon?: string
  source: "hangar" | "modrinth"
  categories: string[]
  installUrl?: string
}

export default function ServerPluginsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [search, setSearch] = useState("")
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState<string | null>(null)
  const [installed, setInstalled] = useState<string[]>([])
  const [serverInfo, setServerInfo] = useState<{ software: string; status: string; mcVersion: string } | null>(null)
  const [source, setSource] = useState<"modrinth" | "hangar">("modrinth")

  useEffect(() => {
    const token = localStorage.getItem("token")
    fetch(`/api/servers/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => setServerInfo({ software: d.software, status: d.status, mcVersion: d.mcVersion })).catch(() => {})
  }, [id])

  const searchModrinth = async (q: string) => {
    setLoading(true)
    try {
      const loaders = serverInfo?.software === "paper" ? ["paper"] :
                      serverInfo?.software === "spigot" ? ["spigot"] :
                      serverInfo?.software === "purpur" ? ["purpur"] :
                      ["bukkit", "spigot", "paper", "purpur"]
      const facets: string[][] = [["project_type:plugin"]]
      if (loaders.length > 0) {
        facets.push(loaders.map(l => `server_types:${l}`))
      }
      const params = new URLSearchParams({
        query: q,
        limit: "20",
        index: "relevance",
        facets: JSON.stringify(facets),
      })
      const res = await fetch(`https://api.modrinth.com/v2/search?${params}`, {
        headers: { "User-Agent": "Minevo-Panel/1.0" }
      })
      if (res.ok) {
        const data = await res.json()
        const results: Plugin[] = (data.hits || []).map((p: any) => ({
          id: p.slug || p.project_id,
          slug: p.slug || "",
          name: p.title || "",
          description: p.description || "",
          downloads: p.downloads || 0,
          version: p.versions?.[0] || "",
          author: p.author || "",
          icon: p.icon_url || "",
          source: "modrinth" as const,
          categories: [...(p.categories || []), ...(p.project_type ? [p.project_type] : [])],
        }))
        setPlugins(results)
      }
    } catch { setPlugins([]) }
    finally { setLoading(false) }
  }

  const searchHangar = async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`https://hangar.papermc.io/api/v1/projects?q=${encodeURIComponent(q)}&limit=20`, {
        headers: { "User-Agent": "Minevo-Panel/1.0" }
      })
      if (res.ok) {
        const data = await res.json()
        const results: Plugin[] = (data.result || []).map((p: any) => ({
          id: p.namespace?.slug || "",
          slug: p.namespace?.slug || "",
          name: p.name || "",
          description: p.description || "",
          downloads: p.stats?.downloads || 0,
          version: "",
          author: p.namespace?.owner || "",
          icon: p.avatarUrl || "",
          source: "hangar" as const,
          categories: p.tags || [],
        }))
        setPlugins(results)
      }
    } catch { setPlugins([]) }
    finally { setLoading(false) }
  }

  const searchPlugins = async (q: string) => {
    if (!q.trim()) { setPlugins([]); return }
    if (source === "modrinth") await searchModrinth(q)
    else await searchHangar(q)
  }

  const installPlugin = async (plugin: Plugin) => {
    setInstalling(plugin.id)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/install-plugin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slug: plugin.slug, name: plugin.name, owner: plugin.author, source: plugin.source }),
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      setInstalled(prev => [...prev, plugin.id])
      toast.success(`${plugin.name} installed`)
    } catch { toast.error("Install failed") }
    finally { setInstalling(null) }
  }

  useEffect(() => {
    const t = setTimeout(() => { if (search.trim()) searchPlugins(search) }, 500)
    return () => clearTimeout(t)
  }, [search, source, serverInfo])

  const canInstall = serverInfo?.software === "paper" || serverInfo?.software === "spigot" || serverInfo?.software === "purpur"

  return (
    <div className="p-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 animate-fade-in">
        <button onClick={() => router.push(`/servers/${id}`)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--brand-muted)" }}>
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
            <Puzzle size={18} strokeWidth={1.5} /> Plugin Installer
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--brand-muted)" }}>
            Search and install plugins from Modrinth and Hangar
          </p>
        </div>
      </div>

      {!canInstall && (
        <div className="mb-4 p-3 rounded-lg text-[12px]" style={{ backgroundColor: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)", color: "#eab308" }}>
          Plugin management is only available for Paper, Spigot, and Purpur servers.
        </div>
      )}

      {/* Source toggle + Search */}
      <div className="flex gap-3 mb-4 animate-fade-in-up">
        <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--brand-border)" }}>
          <button onClick={() => setSource("modrinth")}
            className="px-3 py-2 text-[11px] font-medium transition-colors"
            style={{
              backgroundColor: source === "modrinth" ? "var(--brand-text)" : "var(--brand-card)",
              color: source === "modrinth" ? "var(--brand-background)" : "var(--brand-muted)",
            }}>Modrinth</button>
          <button onClick={() => setSource("hangar")}
            className="px-3 py-2 text-[11px] font-medium transition-colors"
            style={{
              backgroundColor: source === "hangar" ? "var(--brand-text)" : "var(--brand-card)",
              color: source === "hangar" ? "var(--brand-background)" : "var(--brand-muted)",
            }}>Hangar</button>
        </div>
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--brand-muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${source === "modrinth" ? "Modrinth" : "Hangar"} plugins...`}
            className="input pl-9 pr-3 py-2 text-[12px]" />
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center p-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} /></div>
      ) : plugins.length === 0 ? (
        <div className="text-center py-16 animate-fade-in" style={{ color: "var(--brand-muted)" }}>
          <Puzzle className="w-12 h-12 mx-auto mb-3 opacity-15" />
          <p className="text-[13px] font-medium mb-1">Search for plugins</p>
          <p className="text-[11px]">Type a name above to search from {source === "modrinth" ? "Modrinth" : "Hangar"}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {plugins.map(plugin => (
            <div key={plugin.id} className="p-4 rounded-xl flex items-center gap-4 transition-colors hover:bg-white/[0.02]" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
              {plugin.icon ? (
                <img src={plugin.icon} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)" }}>
                  <Puzzle size={18} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[13px] font-semibold truncate" style={{ color: "var(--brand-text)" }}>{plugin.name}</h3>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{
                    backgroundColor: plugin.source === "modrinth" ? "rgba(23,181,132,0.12)" : "rgba(124,58,237,0.12)",
                    color: plugin.source === "modrinth" ? "#17b584" : "var(--brand-primary)",
                  }}>{plugin.source}</span>
                  {plugin.categories?.slice(0, 2).map(cat => (
                    <span key={cat} className="text-[9px] px-1.5 py-0.5 rounded hidden sm:inline-block" style={{ backgroundColor: "var(--brand-background)", color: "var(--brand-muted)" }}>{cat}</span>
                  ))}
                </div>
                <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: "var(--brand-muted)" }}>{plugin.description}</p>
                <div className="flex items-center gap-3 mt-1 text-[10px]" style={{ color: "var(--brand-muted)" }}>
                  <span>{plugin.author}</span>
                  <span>{plugin.downloads.toLocaleString()} downloads</span>
                  {plugin.version && <span>v{plugin.version}</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {installed.includes(plugin.id) ? (
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
                    <Check size={12} /> Installed
                  </span>
                ) : (
                  <button onClick={() => installPlugin(plugin)} disabled={installing === plugin.id || !canInstall}
                    className="btn-primary text-[11px] py-1.5 px-3 disabled:opacity-40">
                    {installing === plugin.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
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
