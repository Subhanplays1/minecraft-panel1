"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import { FileText, Search, Download, RefreshCw, Loader2, Filter } from "lucide-react"

interface LogFile { name: string; size: number; lastModified: string }

export default function ServerLogsPage() {
  const params = useParams()
  const id = params.id as string
  const [logFiles, setLogFiles] = useState<LogFile[]>([])
  const [selectedFile, setSelectedFile] = useState("")
  const [logContent, setLogContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [fetchingContent, setFetchingContent] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [autoScroll, setAutoScroll] = useState(true)
  const logRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token")
    return { Authorization: `Bearer ${token}` }
  }

  const fetchLogFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/servers/${id}/logs`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setLogFiles(data.files || data.logFiles || [])
        return data.files || data.logFiles || []
      }
    } catch {}
    return []
  }, [id])

  const fetchLogContent = useCallback(async (filename: string) => {
    if (!filename) return
    setFetchingContent(true)
    try {
      const res = await fetch(`/api/servers/${id}/logs/${filename}?tail=500`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setLogContent(data.content || data.lines?.join("\n") || "")
      }
    } catch {} finally { setFetchingContent(false) }
  }, [id])

  const handleRefresh = useCallback(() => {
    if (selectedFile) fetchLogContent(selectedFile)
  }, [selectedFile, fetchLogContent])

  const handleDownload = () => {
    if (!selectedFile || !logContent) return
    const blob = new Blob([logContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = selectedFile
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleSelectFile = (filename: string) => {
    setSelectedFile(filename)
    setSearchQuery("")
    fetchLogContent(filename)
  }

  const highlightLine = (line: string): { className: string; text: string }[] => {
    if (!searchQuery.trim()) return [{ className: "", text: line }]
    const query = searchQuery.toLowerCase()
    const parts: { className: string; text: string }[] = []
    let lastIndex = 0
    const lowerLine = line.toLowerCase()
    let idx = lowerLine.indexOf(query)

    while (idx !== -1) {
      if (idx > lastIndex) parts.push({ className: "", text: line.slice(lastIndex, idx) })
      parts.push({ className: "bg-yellow-500/30 text-yellow-200", text: line.slice(idx, idx + query.length) })
      lastIndex = idx + query.length
      idx = lowerLine.indexOf(query, lastIndex)
    }
    if (lastIndex < line.length) parts.push({ className: "", text: line.slice(lastIndex) })
    return parts
  }

  const getLineColor = (line: string): string => {
    const upper = line.toUpperCase()
    if (upper.includes("ERROR") || upper.includes("EXCEPTION") || upper.includes("FATAL")) return "#ff6b6b"
    if (upper.includes("WARN") || upper.includes("WARNING")) return "#ffd93d"
    if (upper.includes("[INFO]")) return "#999"
    if (upper.includes("DEBUG")) return "#6b7280"
    return "#b0b0b0"
  }

  const filteredLines = logContent.split("\n")

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  useEffect(() => {
    (async () => {
      setLoading(true)
      const files = await fetchLogFiles()
      if (files.length > 0) {
        const defaultFile = files.find((f: LogFile) => f.name === "panel.log") || files[0]
        setSelectedFile(defaultFile.name)
        await fetchLogContent(defaultFile.name)
      }
      setLoading(false)
    })()
  }, [fetchLogFiles, fetchLogContent])

  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedFile) fetchLogContent(selectedFile)
    }, 5000)
    return () => clearInterval(interval)
  }, [selectedFile, fetchLogContent])

  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logContent, autoScroll])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const currentFile = logFiles.find((f) => f.name === selectedFile)

  return (
    <div className="p-5 md:p-6 max-w-[1400px] mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} />
          <h1 className="text-xl font-bold" style={{ color: "var(--brand-text)" }}>Server Logs</h1>
          {selectedFile && (
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "#1a1a1a", border: "1px solid #222", color: "var(--brand-muted)" }}>
              {selectedFile}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Log file selector */}
          <div className="relative">
            <select
              value={selectedFile}
              onChange={(e) => handleSelectFile(e.target.value)}
              className="appearance-none px-3 py-1.5 pr-7 rounded-lg text-[11px] font-medium outline-none cursor-pointer"
              style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
            >
              {logFiles.length === 0 && <option value="">No log files</option>}
              {logFiles.map((f) => (
                <option key={f.name} value={f.name}>{f.name} ({formatSize(f.size)})</option>
              ))}
            </select>
            <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--brand-muted)" }} />
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "var(--brand-muted)" }} />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="pl-7 pr-3 py-1.5 rounded-lg text-[11px] font-medium outline-none w-44"
              style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] hover:opacity-70" style={{ color: "var(--brand-muted)" }}>✕</button>
            )}
          </div>

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
            style={{ backgroundColor: autoScroll ? "var(--brand-card)" : "transparent", border: `1px solid ${autoScroll ? "var(--brand-primary)" : "var(--brand-border)"}`, color: autoScroll ? "var(--brand-primary)" : "var(--brand-muted)" }}
          >
            Auto
          </button>

          {/* Refresh */}
          <button onClick={handleRefresh} disabled={!selectedFile || fetchingContent} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-40" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-muted)" }}>
            {fetchingContent ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </button>

          {/* Download */}
          <button onClick={handleDownload} disabled={!selectedFile || !logContent} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-40" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-muted)" }}>
            <Download className="w-3 h-3" /> Download
          </button>
        </div>
      </div>

      {/* Log viewer */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        {/* Log header */}
        <div className="px-3.5 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid var(--brand-border)" }}>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>Log Viewer</span>
            {searchQuery && (
              <span className="text-[10px]" style={{ color: "var(--brand-muted)" }}>
                {filteredLines.filter((l) => l.toLowerCase().includes(searchQuery.toLowerCase())).length} matches
              </span>
            )}
          </div>
          {currentFile && (
            <span className="text-[10px]" style={{ color: "var(--brand-muted)" }}>
              {filteredLines.length} lines &middot; {formatSize(currentFile.size)}
            </span>
          )}
        </div>

        {/* Log content */}
        <div
          ref={logRef}
          className="h-[600px] overflow-y-auto overflow-x-hidden"
          style={{ backgroundColor: "#0a0a0a" }}
        >
          {loading ? (
            <div className="p-10 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} />
            </div>
          ) : filteredLines.length === 0 || !selectedFile ? (
            <div className="p-10 text-center" style={{ color: "#444" }}>
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-[12px]">No log content to display</p>
            </div>
          ) : (
            <div className="p-3 font-mono text-[11px] leading-[1.7]">
              {filteredLines.map((line, i) => {
                const parts = highlightLine(line)
                return (
                  <div
                    key={i}
                    className="flex hover:bg-white/[0.03]"
                    style={{ borderLeft: searchQuery && line.toLowerCase().includes(searchQuery.toLowerCase()) ? "2px solid #ffd93d" : "2px solid transparent" }}
                  >
                    <span className="select-none pr-4 text-right flex-shrink-0 w-10" style={{ color: "#333" }}>
                      {i + 1}
                    </span>
                    <span className="flex-1" style={{ color: getLineColor(line) }}>
                      {parts.map((p, j) => (
                        <span key={j} className={p.className}>{p.text}</span>
                      ))}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3.5 py-2 flex items-center justify-between text-[10px]" style={{ borderTop: "1px solid var(--brand-border)", color: "var(--brand-muted)" }}>
          <span>{filteredLines.length} lines &middot; {currentFile ? formatSize(currentFile.size) : "0 B"}</span>
          <span className="flex items-center gap-2">
            {autoScroll && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Auto-scroll</span>}
            {searchQuery && <span>&quot;{searchQuery}&quot;</span>}
          </span>
        </div>
      </div>
    </div>
  )
}
