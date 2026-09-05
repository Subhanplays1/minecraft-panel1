"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Play, Square, RotateCcw, Terminal, Users, FolderOpen, Puzzle, HardDrive,
  Settings, ArrowLeft, Send, Trash2, Download, Upload, FileText, Loader2
} from "lucide-react"

type Tab = "console" | "players" | "files" | "plugins" | "backups" | "settings"

interface ServerInfo {
  id: string
  name: string
  status: "RUNNING" | "STOPPED" | "STARTING" | "ERROR"
  software: string
  mcVersion: string
  ram: number
  cpu: number
  disk: number
  port: number
  ip: string | null
  node?: { id: string; name: string; location: string }
}

interface FileEntry {
  name: string
  isDirectory: boolean
  size: number
  modified: string
}

export default function ServerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [server, setServer] = useState<ServerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("console")
  const [consoleLogs, setConsoleLogs] = useState<string[]>([])
  const [command, setCommand] = useState("")
  const consoleRef = useRef<HTMLDivElement>(null)
  const [actionLoading, setActionLoading] = useState("")
  const [files, setFiles] = useState<FileEntry[]>([])
  const [filePath, setFilePath] = useState("")
  const [fileContent, setFileContent] = useState("")
  const [editingFile, setEditingFile] = useState("")

  const fetchServer = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setServer(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchConsole = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/console`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setConsoleLogs(data.logs || [])
      }
    } catch {}
  }

  const fetchFiles = async (path = "") => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/files?path=${encodeURIComponent(path)}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setFiles(data.files || [])
        setFilePath(data.path || "")
      }
    } catch {}
  }

  const fetchFileContent = async (path: string) => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/file?path=${encodeURIComponent(path)}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setFileContent(data.content || "")
        setEditingFile(path)
      }
    } catch {}
  }

  const sendAction = async (action: "start" | "stop" | "restart") => {
    setActionLoading(action)
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/servers/${id}/${action}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
      setTimeout(fetchServer, 1500)
    } catch (e) {
      console.error(e)
    } finally {
      setActionLoading("")
    }
  }

  const sendCommand = async () => {
    if (!command.trim()) return
    setConsoleLogs((prev) => [...prev, `> ${command}`])
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/servers/${id}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ command }),
      })
    } catch {}
    setCommand("")
  }

  useEffect(() => { fetchServer() }, [id])
  useEffect(() => { if (activeTab === "console") fetchConsole() }, [activeTab])
  useEffect(() => { if (activeTab === "files") fetchFiles() }, [activeTab])
  useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight
  }, [consoleLogs])

  useEffect(() => {
    if (server?.status === "RUNNING") {
      const interval = setInterval(fetchConsole, 5000)
      return () => clearInterval(interval)
    }
  }, [server?.status])

  const statusInfo = (status: string) => {
    switch (status) {
      case "RUNNING": return { color: "var(--brand-success)", bg: "rgba(34,197,94,0.15)", label: "Running", pulse: true }
      case "STOPPED": return { color: "var(--brand-muted)", bg: "rgba(107,114,128,0.15)", label: "Stopped", pulse: false }
      case "STARTING": return { color: "var(--brand-warning)", bg: "rgba(234,179,8,0.15)", label: "Starting...", pulse: true }
      case "ERROR": return { color: "var(--brand-danger)", bg: "rgba(239,68,68,0.15)", label: "Error", pulse: true }
      default: return { color: "var(--brand-muted)", bg: "rgba(107,114,128,0.15)", label: status, pulse: false }
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "console", label: "Console", icon: <Terminal className="w-4 h-4" /> },
    { id: "players", label: "Players", icon: <Users className="w-4 h-4" /> },
    { id: "files", label: "Files", icon: <FolderOpen className="w-4 h-4" /> },
    { id: "plugins", label: "Plugins", icon: <Puzzle className="w-4 h-4" /> },
    { id: "backups", label: "Backups", icon: <HardDrive className="w-4 h-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  ]

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--brand-primary)" }} />
      </div>
    )
  }

  if (!server) {
    return (
      <div className="p-6 text-center">
        <p style={{ color: "var(--brand-muted)" }}>Server not found</p>
      </div>
    )
  }

  const si = statusInfo(server.status)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.push("/servers")}
        className="flex items-center gap-2 mb-4 text-sm hover:opacity-80 transition-opacity animate-fade-in"
        style={{ color: "var(--brand-muted)" }}
      >
        <ArrowLeft className="w-4 h-4" /> Back to Servers
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${si.pulse ? "animate-status-pulse" : ""}`} style={{ backgroundColor: si.color }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-text)" }}>{server.name}</h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: si.bg, color: si.color }}>
            {si.label}
          </span>
          <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-muted)" }}>
            {server.software} {server.mcVersion}
          </span>
        </div>

        <div className="flex gap-2">
          {server.status !== "RUNNING" && (
            <button
              onClick={() => sendAction("start")}
              disabled={!!actionLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover-lift btn-ripple disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-success)", color: "white" }}
            >
              {actionLoading === "start" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Start
            </button>
          )}
          {server.status === "RUNNING" && (
            <>
              <button
                onClick={() => sendAction("stop")}
                disabled={!!actionLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover-lift btn-ripple disabled:opacity-50"
                style={{ backgroundColor: "var(--brand-danger)", color: "white" }}
              >
                {actionLoading === "stop" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                Stop
              </button>
              <button
                onClick={() => sendAction("restart")}
                disabled={!!actionLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover-lift btn-ripple disabled:opacity-50"
                style={{ backgroundColor: "var(--brand-warning)", color: "white" }}
              >
                {actionLoading === "restart" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Restart
              </button>
            </>
          )}
        </div>
      </div>

      {/* Resource bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-fade-in-up delay-100">
        {[
          { label: "RAM", value: `${(server.ram / 1024).toFixed(0)} GB`, icon: <HardDrive className="w-4 h-4" /> },
          { label: "CPU", value: `${server.cpu}%`, icon: <Settings className="w-4 h-4" /> },
          { label: "Disk", value: `${(server.disk / 1024).toFixed(0)} GB`, icon: <FolderOpen className="w-4 h-4" /> },
          { label: "Port", value: String(server.port), icon: <Terminal className="w-4 h-4" /> },
        ].map((item, i) => (
          <div key={i} className="p-3 rounded-lg flex items-center gap-3 card-hover" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(124,58,237,0.15)", color: "var(--brand-primary)" }}>
              {item.icon}
            </div>
            <div>
              <div className="text-xs" style={{ color: "var(--brand-muted)" }}>{item.label}</div>
              <div className="font-semibold text-sm" style={{ color: "var(--brand-text)" }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto animate-fade-in-up delay-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
            style={{
              backgroundColor: activeTab === tab.id ? "var(--brand-primary)" : "var(--brand-card)",
              color: activeTab === tab.id ? "#fff" : "var(--brand-muted)",
              border: `1px solid ${activeTab === tab.id ? "var(--brand-primary)" : "var(--brand-border)"}`,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-xl p-6 animate-fade-in-up delay-300" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        {/* Console */}
        {activeTab === "console" && (
          <div>
            <div
              ref={consoleRef}
              className="h-96 overflow-y-auto p-4 rounded-lg mb-3 font-mono text-sm"
              style={{ backgroundColor: "#0d1117", color: "#c9d1d9" }}
            >
              {consoleLogs.length === 0 && <p style={{ color: "#6e7681" }}>Waiting for server output...</p>}
              {consoleLogs.map((log, i) => (
                <div key={i} className={`leading-relaxed ${log.startsWith(">") ? "text-green-400" : log.includes("ERROR") || log.includes("error") ? "text-red-400" : log.includes("WARN") ? "text-yellow-400" : ""}`}>
                  {log}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendCommand()}
                placeholder="Type a command..."
                className="flex-1 px-3 py-2 rounded-lg font-mono text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                style={{ backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9" }}
              />
              <button
                onClick={sendCommand}
                className="px-4 py-2 rounded-lg transition-all hover-lift btn-ripple"
                style={{ backgroundColor: "var(--brand-primary)", color: "white" }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Players */}
        {activeTab === "players" && (
          <div>
            <h3 className="font-semibold mb-4" style={{ color: "var(--brand-text)" }}>Online Players</h3>
            <div className="text-center py-10" style={{ color: "var(--brand-muted)" }}>
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{server.status === "RUNNING" ? "Connect to server to see players" : "Start the server to see players"}</p>
            </div>
          </div>
        )}

        {/* Files */}
        {activeTab === "files" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: "var(--brand-text)" }}>Server Files</h3>
              <div className="flex gap-2">
                <button className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--brand-muted)" }}>
                  <Upload className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--brand-muted)" }}>
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {editingFile ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => setEditingFile("")} className="text-sm hover:underline" style={{ color: "var(--brand-primary)" }}>
                    Back to files
                  </button>
                  <span className="text-sm" style={{ color: "var(--brand-muted)" }}>{editingFile}</span>
                </div>
                <textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  className="w-full h-96 p-4 rounded-lg font-mono text-sm outline-none resize-none"
                  style={{ backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9" }}
                />
                <button className="mt-3 px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>
                  Save File
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {filePath && (
                  <button
                    onClick={() => {
                      const parts = filePath.split("/").filter(Boolean)
                      parts.pop()
                      fetchFiles(parts.join("/"))
                    }}
                    className="flex items-center gap-2 p-2 rounded hover:bg-white/5 text-sm"
                    style={{ color: "var(--brand-primary)" }}
                  >
                    ..
                  </button>
                )}
                {files.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (f.isDirectory) fetchFiles(`${filePath}/${f.name}`.replace("//", "/"))
                      else fetchFileContent(`${filePath}/${f.name}`.replace("//", "/"))
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors text-left"
                    style={{ color: f.isDirectory ? "var(--brand-primary)" : "var(--brand-text)" }}
                  >
                    {f.isDirectory ? <FolderOpen className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    <span className="flex-1 text-sm">{f.name}</span>
                    {!f.isDirectory && <span className="text-xs" style={{ color: "var(--brand-muted)" }}>{formatSize(f.size)}</span>}
                  </button>
                ))}
                {files.length === 0 && (
                  <div className="text-center py-10" style={{ color: "var(--brand-muted)" }}>
                    <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Empty directory</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Plugins */}
        {activeTab === "plugins" && (
          <div>
            <h3 className="font-semibold mb-4" style={{ color: "var(--brand-text)" }}>Plugins</h3>
            <div className="text-center py-10" style={{ color: "var(--brand-muted)" }}>
              <Puzzle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{server.software === "paper" || server.software === "spigot" || server.software === "purpur"
                ? "Start the server to manage plugins"
                : "Plugin management not available for this software"}</p>
            </div>
          </div>
        )}

        {/* Backups */}
        {activeTab === "backups" && (
          <div>
            <h3 className="font-semibold mb-4" style={{ color: "var(--brand-text)" }}>Backups</h3>
            <div className="text-center py-10" style={{ color: "var(--brand-muted)" }}>
              <HardDrive className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Backup management coming soon</p>
            </div>
          </div>
        )}

        {/* Settings */}
        {activeTab === "settings" && (
          <div className="space-y-4">
            <h3 className="font-semibold" style={{ color: "var(--brand-text)" }}>Server Settings</h3>
            {[
              { label: "Server Name", value: server.name },
              { label: "Software", value: server.software },
              { label: "Version", value: server.mcVersion },
              { label: "RAM (MB)", value: String(server.ram) },
              { label: "Port", value: String(server.port) },
            ].map((field, i) => (
              <div key={i} className="flex items-center gap-4">
                <label className="w-32 text-sm" style={{ color: "var(--brand-muted)" }}>{field.label}</label>
                <input
                  defaultValue={field.value}
                  className="flex-1 px-3 py-2 rounded-lg outline-none text-sm"
                  style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
                />
              </div>
            ))}
            <button className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover-lift" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
