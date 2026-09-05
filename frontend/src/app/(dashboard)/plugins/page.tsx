"use client"

import { useState } from "react"
import { useBranding } from "@/components/BrandingProvider"
import { Puzzle, Search, Download, Trash2, Check } from "lucide-react"

interface Plugin {
  id: string
  name: string
  version: string
  author: string
  description: string
  category: string
  installed: boolean
}

const CATEGORIES = ["All", "Economy", "Fun", "Admin", "Protection", "World", "Chat"]

const ALL_PLUGINS: Plugin[] = [
  { id: "1", name: "EssentialsX", version: "2.20.1", author: "EssentialsX", description: "Essential commands, items, and features for Minecraft servers", category: "Admin", installed: true },
  { id: "2", name: "Vault", version: "1.7.3", author: "MilkBowl", description: "Economy/Permission/Chat API for Bukkit plugins", category: "Admin", installed: true },
  { id: "3", name: "WorldEdit", version: "7.2.18", author: "sk89q", description: "In-game map editor for Minecraft", category: "World", installed: true },
  { id: "4", name: "LuckPerms", version: "5.4.121", author: "Luck", description: "Advanced permissions system", category: "Admin", installed: true },
  { id: "5", name: "ChestShop", version: "3.17", author: "Acrobot", description: "Player-run shops via chests", category: "Economy", installed: false },
  { id: "6", name: "mcMMO", version: "2.1.231", author: "nossr50", description: "RPG-style skills and leveling system", category: "Fun", installed: false },
  { id: "7", name: "GriefPrevention", version: "16.18.1", author: "RoboMWM", description: "Land claim and anti-grief protection", category: "Protection", installed: false },
  { id: "8", name: "Dynmap", version: "3.7-beta-1", author: "mikeprimm", description: "Dynamic web-based map for your server", category: "World", installed: false },
  { id: "9", name: "WorldGuard", version: "7.0.9", author: "sk89q", description: "Protect regions from damage and changes", category: "Protection", installed: false },
  { id: "10", name: "TAB", version: "4.0.3", author: "NEZNAMY", description: "Tab list and name tag customization", category: "Chat", installed: false },
  { id: "11", name: "CosmeticsCore", version: "2.9.2", author: "CosmeticsX", description: "Wearable cosmetics and accessories", category: "Fun", installed: false },
  { id: "12", name: "Jobs Reborn", version: "4.17.2", author: "Zelic", description: "Job system for earning money", category: "Economy", installed: false },
]

export default function PluginsPage() {
  const branding = useBranding()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")
  const [plugins, setPlugins] = useState(ALL_PLUGINS)

  const filtered = plugins.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = category === "All" || p.category === category
    return matchesSearch && matchesCategory
  })

  const togglePlugin = (id: string) => {
    setPlugins(prev => prev.map(p => p.id === id ? { ...p, installed: !p.installed } : p))
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "var(--brand-bg)", color: "var(--brand-text)" }}>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
          <Puzzle className="w-6 h-6" style={{ color: "var(--brand-primary)" }} />
          Plugins
        </h1>

        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--brand-text)", opacity: 0.5 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search plugins..."
              className="w-full pl-10 pr-4 py-2 rounded-lg outline-none"
              style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
            />
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap"
              style={{
                backgroundColor: category === cat ? "var(--brand-primary)" : "var(--brand-card)",
                color: category === cat ? "#fff" : "var(--brand-text)",
                border: `1px solid ${category === cat ? "var(--brand-primary)" : "var(--brand-border)"}`,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(plugin => (
            <div
              key={plugin.id}
              className="p-5 rounded-xl"
              style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold" style={{ color: "var(--brand-text)" }}>{plugin.name}</h3>
                  <p className="text-xs" style={{ color: "var(--brand-text)", opacity: 0.5 }}>v{plugin.version} by {plugin.author}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--brand-bg)", color: "var(--brand-text)", opacity: 0.7 }}>
                  {plugin.category}
                </span>
              </div>
              <p className="text-sm mb-4" style={{ color: "var(--brand-text)", opacity: 0.7 }}>{plugin.description}</p>
              <button
                onClick={() => togglePlugin(plugin.id)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: plugin.installed ? "var(--brand-bg)" : "var(--brand-primary)",
                  color: plugin.installed ? "var(--brand-text)" : "#fff",
                  border: plugin.installed ? "1px solid var(--brand-border)" : "none",
                }}
              >
                {plugin.installed ? (
                  <>
                    <Check className="w-4 h-4" />
                    Installed
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Install
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
