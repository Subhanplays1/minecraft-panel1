"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useBranding } from "@/components/BrandingProvider"
import {
  FolderOpen, File, Upload, Trash2, Plus, ChevronRight, Download, Search, Server,
} from "lucide-react"

interface FileNode {
  name: string
  type: "file" | "folder"
  size?: string
  modified?: string
}

export default function FilesPage() {
  const router = useRouter()
  const branding = useBranding()
  const [selectedServer, setSelectedServer] = useState<string | null>(null)
  const [servers, setServers] = useState<{ id: string; name: string }[]>([])
  const [path, setPath] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const mockFiles: FileNode[] = [
    { name: "plugins", type: "folder" },
    { name: "world", type: "folder" },
    { name: "logs", type: "folder" },
    { name: "world_nether", type: "folder" },
    { name: "world_the_end", type: "folder" },
    { name: "server.properties", type: "file", size: "1.2 KB", modified: "2024-01-15" },
    { name: "bukkit.yml", type: "file", size: "3.4 KB", modified: "2024-01-14" },
    { name: "spigot.yml", type: "file", size: "5.1 KB", modified: "2024-01-14" },
    { name: "eula.txt", type: "file", size: "12 B", modified: "2024-01-01" },
  ]

  const filteredFiles = mockFiles.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "var(--brand-bg)", color: "var(--brand-text)" }}>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
          <FolderOpen className="w-6 h-6" style={{ color: "var(--brand-primary)" }} />
          File Manager
        </h1>

        {!selectedServer ? (
          <div className="rounded-xl p-8" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="text-center">
              <Server className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--brand-text)", opacity: 0.3 }} />
              <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--brand-text)" }}>Select a Server</h2>
              <p className="mb-4" style={{ color: "var(--brand-text)", opacity: 0.7 }}>Choose a server to manage its files</p>
              <button
                onClick={() => setSelectedServer("demo-server")}
                className="px-4 py-2 rounded-lg font-medium"
                style={{ backgroundColor: "var(--brand-primary)", color: "#fff" }}
              >
                Use Demo Server
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--brand-border)" }}>
              <div className="flex items-center gap-1 text-sm">
                <span className="cursor-pointer hover:underline" style={{ color: "var(--brand-primary)" }} onClick={() => setPath([])}>
                  /
                </span>
                {path.map((seg, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" style={{ color: "var(--brand-text)", opacity: 0.4 }} />
                    <span
                      className="cursor-pointer hover:underline"
                      style={{ color: "var(--brand-primary)" }}
                      onClick={() => setPath(path.slice(0, i + 1))}
                    >
                      {seg}
                    </span>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2" style={{ color: "var(--brand-text)", opacity: 0.4 }} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="pl-8 pr-3 py-1.5 rounded-lg text-sm outline-none w-40"
                    style={{ backgroundColor: "var(--brand-bg)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
                  />
                </div>
                <button className="p-2 rounded-lg" style={{ backgroundColor: "var(--brand-bg)", border: "1px solid var(--brand-border)" }} title="Upload">
                  <Upload className="w-4 h-4" style={{ color: "var(--brand-text)" }} />
                </button>
                <button className="p-2 rounded-lg" style={{ backgroundColor: "var(--brand-bg)", border: "1px solid var(--brand-border)" }} title="New Folder">
                  <Plus className="w-4 h-4" style={{ color: "var(--brand-text)" }} />
                </button>
                <button className="p-2 rounded-lg bg-red-600/20" title="Delete">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>

            <div className="flex">
              <div className="flex-1 p-3">
                <div className="space-y-1">
                  {filteredFiles.map((f, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedFile === f.name ? "bg-white/10" : "hover:bg-white/5"
                      }`}
                      onClick={() => f.type === "folder" ? setPath([...path, f.name]) : setSelectedFile(f.name)}
                    >
                      <div className="flex items-center gap-2">
                        {f.type === "folder" ? (
                          <FolderOpen className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
                        ) : (
                          <File className="w-4 h-4" style={{ color: "var(--brand-text)", opacity: 0.5 }} />
                        )}
                        <span className="text-sm">{f.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs" style={{ color: "var(--brand-text)", opacity: 0.5 }}>
                        {f.size && <span>{f.size}</span>}
                        {f.modified && <span>{f.modified}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedFile && (
                <div className="w-96 border-l p-4" style={{ borderColor: "var(--brand-border)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-sm truncate">{selectedFile}</h3>
                    <button className="p-1.5 rounded" style={{ backgroundColor: "var(--brand-bg)" }}>
                      <Download className="w-3.5 h-3.5" style={{ color: "var(--brand-text)" }} />
                    </button>
                  </div>
                  <textarea
                    readOnly
                    placeholder="File content preview..."
                    className="w-full h-64 p-3 rounded-lg font-mono text-xs outline-none resize-none"
                    style={{ backgroundColor: "var(--brand-bg)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
