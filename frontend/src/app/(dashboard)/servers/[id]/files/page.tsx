"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { FolderOpen, FileText, ArrowLeft, Loader2, Download, Upload, Trash2, Plus } from "lucide-react"

interface FileEntry { name: string; isDirectory: boolean; size: number }

export default function ServerFilesPage() {
  const params = useParams()
  const id = params.id as string
  const [files, setFiles] = useState<FileEntry[]>([])
  const [filePath, setFilePath] = useState("")
  const [fileContent, setFileContent] = useState("")
  const [editingFile, setEditingFile] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchFiles = async (p = "") => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/files?path=${encodeURIComponent(p)}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const data = await res.json(); setFiles(data.files || []); setFilePath(data.path || "") }
    } catch {} finally { setLoading(false) }
  }

  const fetchFileContent = async (p: string) => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/file?path=${encodeURIComponent(p)}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const data = await res.json(); setFileContent(data.content || ""); setEditingFile(p) }
    } catch {}
  }

  const saveFile = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/servers/${id}/file`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ path: editingFile, content: fileContent }),
      })
      setEditingFile("")
    } catch {} finally { setSaving(false) }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected || selected.length === 0) return
    setUploading(true)
    try {
      const token = localStorage.getItem("token")
      const formData = new FormData()
      for (let i = 0; i < selected.length; i++) {
        formData.append("files", selected[i])
      }
      await fetch(`/api/servers/${id}/upload?path=${encodeURIComponent(filePath)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      await fetchFiles(filePath)
    } catch {} finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return
    const fullPath = `${filePath}/${fileName}`.replace("//", "/")
    setDeleting(fileName)
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/servers/${id}/file?path=${encodeURIComponent(fullPath)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      await fetchFiles(filePath)
    } catch {} finally { setDeleting("") }
  }

  const handleDownload = (fileName: string) => {
    const fullPath = `${filePath}/${fileName}`.replace("//", "/")
    const token = localStorage.getItem("token")
    const a = document.createElement("a")
    a.href = `/api/servers/${id}/download?path=${encodeURIComponent(fullPath)}`
    a.setAttribute("download", fileName)
    const linkEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
    })
    Object.defineProperty(a, "headers", { value: new Headers({ Authorization: `Bearer ${token}` }) })
    fetch(`/api/servers/${id}/download?path=${encodeURIComponent(fullPath)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => res.blob()).then(blob => {
      const url = URL.createObjectURL(blob)
      const a2 = document.createElement("a")
      a2.href = url
      a2.download = fileName
      document.body.appendChild(a2)
      a2.click()
      document.body.removeChild(a2)
      URL.revokeObjectURL(url)
    })
  }

  useEffect(() => { fetchFiles() }, [id])

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />

      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--brand-text)" }}>File Manager</h1>
          <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>{filePath || "/"}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
            style={{ color: "var(--brand-muted)", border: "1px solid var(--brand-border)" }}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span className="text-xs">Upload</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        {loading ? (
          <div className="p-10 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--brand-primary)" }} /></div>
        ) : editingFile ? (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => setEditingFile("")} className="flex items-center gap-1 text-sm hover:underline" style={{ color: "var(--brand-primary)" }}>
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
              <span className="text-sm font-mono" style={{ color: "var(--brand-muted)" }}>{editingFile}</span>
            </div>
            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              className="w-full h-[500px] p-4 rounded-lg font-mono text-sm outline-none resize-none"
              style={{ backgroundColor: "#0a0e14", border: "1px solid #1e293b", color: "#c5cdd9" }}
            />
            <button onClick={saveFile} disabled={saving} className="mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-all hover-lift disabled:opacity-50" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Save File"}
            </button>
          </div>
        ) : (
          <div>
            {filePath && (
              <button
                onClick={() => { const p = filePath.split("/").filter(Boolean); p.pop(); fetchFiles(p.join("/")) }}
                className="w-full flex items-center gap-2 p-3 text-sm hover:bg-white/5 transition-colors" style={{ color: "var(--brand-primary)", borderBottom: "1px solid var(--brand-border)" }}
              >
                <ArrowLeft className="w-4 h-4" /> Parent Directory
              </button>
            )}
            {files.length === 0 ? (
              <div className="p-10 text-center" style={{ color: "var(--brand-muted)" }}>
                <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" /> Empty directory
              </div>
            ) : (
              files.map((f, i) => {
                const fullPath = `${filePath}/${f.name}`.replace("//", "/")
                return (
                  <div
                    key={i}
                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors group"
                    style={{ borderBottom: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
                  >
                    <button
                      className="flex-1 flex items-center gap-3 text-left"
                      onClick={() => {
                        if (f.isDirectory) fetchFiles(fullPath)
                        else fetchFileContent(fullPath)
                      }}
                    >
                      {f.isDirectory ? <FolderOpen className="w-4 h-4" style={{ color: "var(--brand-primary)" }} /> : <FileText className="w-4 h-4" style={{ color: "var(--brand-muted)" }} />}
                      <span className="text-sm">{f.name}</span>
                    </button>
                    {!f.isDirectory && <span className="text-xs" style={{ color: "var(--brand-muted)" }}>{formatSize(f.size)}</span>}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!f.isDirectory && (
                        <button onClick={() => handleDownload(f.name)} className="p-1.5 rounded hover:bg-white/10 transition-colors" style={{ color: "var(--brand-muted)" }}>
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(f.name)}
                        disabled={deleting === f.name}
                        className="p-1.5 rounded hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        style={{ color: deleting === f.name ? "var(--brand-muted)" : "#ef4444" }}
                      >
                        {deleting === f.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
