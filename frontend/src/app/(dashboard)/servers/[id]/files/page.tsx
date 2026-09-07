"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { FolderOpen, FileText, ArrowLeft, Loader2, Download, Upload, Trash2, Plus, FolderPlus, FilePlus, Pencil, X, Check } from "lucide-react"

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
  const [showCreate, setShowCreate] = useState<false | "file" | "folder">(false)
  const [createName, setCreateName] = useState("")
  const [renaming, setRenaming] = useState("")
  const [renameValue, setRenameValue] = useState("")
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchFiles = async (p = "") => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/files?path=${encodeURIComponent(p)}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setFiles(d.files || []); setFilePath(d.path || "") }
    } catch {} finally { setLoading(false); setSelected(new Set()) }
  }

  const fetchFileContent = async (p: string) => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/file?path=${encodeURIComponent(p)}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setFileContent(d.content || ""); setEditingFile(p) }
    } catch {}
  }

  const saveFile = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/servers/${id}/file`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ path: editingFile, content: fileContent }) })
      setEditingFile("")
    } catch {} finally { setSaving(false) }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const sel = e.target.files
    if (!sel || sel.length === 0) return
    setUploading(true)
    try {
      const token = localStorage.getItem("token")
      const fd = new FormData()
      for (let i = 0; i < sel.length; i++) fd.append("files", sel[i])
      await fetch(`/api/servers/${id}/upload?path=${encodeURIComponent(filePath)}`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd })
      await fetchFiles(filePath)
    } catch {} finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = "" }
  }

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return
    const fp = `${filePath}/${fileName}`.replace("//", "/")
    setDeleting(fileName)
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/servers/${id}/file?path=${encodeURIComponent(fp)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      await fetchFiles(filePath)
    } catch {} finally { setDeleting("") }
  }

  const handleDeleteSelected = async () => {
    if (selected.size === 0 || !confirm(`Delete ${selected.size} item(s)?`)) return
    const token = localStorage.getItem("token")
    const names = Array.from(selected).map((i) => files[i]?.name).filter(Boolean)
    for (const name of names) {
      const fp = `${filePath}/${name}`.replace("//", "/")
      await fetch(`/api/servers/${id}/file?path=${encodeURIComponent(fp)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    }
    await fetchFiles(filePath)
  }

  const handleDownload = (fileName: string) => {
    const fp = `${filePath}/${fileName}`.replace("//", "/")
    const token = localStorage.getItem("token")
    fetch(`/api/servers/${id}/download?path=${encodeURIComponent(fp)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob()).then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a"); a.href = url; a.download = fileName
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
      })
  }

  const handleCreate = async () => {
    if (!createName.trim()) return
    const fp = `${filePath}/${createName}`.replace("//", "/")
    const token = localStorage.getItem("token")
    if (showCreate === "folder") {
      await fetch(`/api/servers/${id}/file`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ path: fp + "/.placeholder", content: "" }) })
    } else {
      await fetch(`/api/servers/${id}/file`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ path: fp, content: "" }) })
    }
    setShowCreate(false); setCreateName("")
    await fetchFiles(filePath)
  }

  const handleRename = async (oldName: string) => {
    if (!renameValue.trim() || renameValue === oldName) { setRenaming(""); return }
    const token = localStorage.getItem("token")
    const oldPath = `${filePath}/${oldName}`.replace("//", "/")
    const newPath = `${filePath}/${renameValue}`.replace("//", "/")
    const isDir = files.find((f) => f.name === oldName)?.isDirectory
    if (isDir) {
      const res = await fetch(`/api/servers/${id}/files?path=${encodeURIComponent(oldPath)}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const d = await res.json()
        for (const f of d.files || []) {
          const innerRes = await fetch(`/api/servers/${id}/file?path=${encodeURIComponent(`${oldPath}/${f.name}`)}`, { headers: { Authorization: `Bearer ${token}` } })
          if (innerRes.ok) {
            const inner = await innerRes.json()
            await fetch(`/api/servers/${id}/file`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ path: `${newPath}/${f.name}`, content: inner.content }) })
            await fetch(`/api/servers/${id}/file?path=${encodeURIComponent(`${oldPath}/${f.name}`)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
          }
        }
      }
    } else {
      const res = await fetch(`/api/servers/${id}/file?path=${encodeURIComponent(oldPath)}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const d = await res.json()
        await fetch(`/api/servers/${id}/file`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ path: newPath, content: d.content }) })
        await fetch(`/api/servers/${id}/file?path=${encodeURIComponent(oldPath)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      }
    }
    setRenaming("")
    await fetchFiles(filePath)
  }

  useEffect(() => { fetchFiles() }, [id])

  const toggleSelect = (i: number) => {
    setSelected((prev) => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next })
  }

  const formatSize = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : b < 1073741824 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1073741824).toFixed(2)} GB`

  const pathParts = filePath.split("/").filter(Boolean)

  return (
    <div className="p-5 max-w-6xl mx-auto">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--brand-text)" }}>File Manager</h1>
          <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: "var(--brand-muted)" }}>
            <button onClick={() => fetchFiles("")} className="hover:underline" style={{ color: "var(--brand-primary)" }}>root</button>
            {pathParts.map((part, i) => (
              <span key={i}> / <button onClick={() => fetchFiles(pathParts.slice(0, i + 1).join("/"))} className="hover:underline" style={{ color: "var(--brand-primary)" }}>{part}</button></span>
            ))}
          </div>
        </div>
        <div className="flex gap-1.5">
          {selected.size > 0 && (
            <button onClick={handleDeleteSelected} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all" style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#EF4444" }}>
              <Trash2 className="w-3 h-3" /> Delete ({selected.size})
            </button>
          )}
          <button onClick={() => setShowCreate("folder")} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-muted)" }}>
            <FolderPlus className="w-3 h-3" /> Folder
          </button>
          <button onClick={() => setShowCreate("file")} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-muted)" }}>
            <FilePlus className="w-3 h-3" /> File
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-50" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload
          </button>
        </div>
      </div>

      {/* Create input */}
      {showCreate && (
        <div className="mb-3 p-3 rounded-lg flex items-center gap-2 animate-fade-in-down" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <input autoFocus value={createName} onChange={(e) => setCreateName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate()} placeholder={showCreate === "folder" ? "Folder name..." : "File name..."} className="flex-1 px-3 py-1.5 rounded text-xs outline-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
          <button onClick={handleCreate} className="p-1.5 rounded hover:bg-green-500/10"><Check className="w-3.5 h-3.5 text-green-400" /></button>
          <button onClick={() => { setShowCreate(false); setCreateName("") }} className="p-1.5 rounded hover:bg-red-500/10"><X className="w-3.5 h-3.5 text-red-400" /></button>
        </div>
      )}

      {/* File content editor */}
      {editingFile ? (
        <div className="rounded-xl p-4 animate-fade-in" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setEditingFile("")} className="p-1 rounded hover:bg-white/5"><ArrowLeft className="w-4 h-4" style={{ color: "var(--brand-primary)" }} /></button>
            <span className="text-xs font-mono" style={{ color: "var(--brand-muted)" }}>{editingFile}</span>
          </div>
          <textarea value={fileContent} onChange={(e) => setFileContent(e.target.value)} className="w-full h-[500px] p-4 rounded-lg font-mono text-xs outline-none resize-none" style={{ backgroundColor: "#0D1117", border: "1px solid #21262D", color: "#C9D1D9" }} />
          <button onClick={saveFile} disabled={saving} className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover-lift disabled:opacity-50" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null} Save File
          </button>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          {loading ? (
            <div className="p-10 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-primary)" }} /></div>
          ) : files.length === 0 ? (
            <div className="p-10 text-center" style={{ color: "var(--brand-muted)" }}>
              <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-20" /> Empty directory
            </div>
          ) : (
            <>
              {pathParts.length > 0 && (
                <button onClick={() => { const p = [...pathParts]; p.pop(); fetchFiles(p.join("/")) }} className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-white/5 transition-colors" style={{ color: "var(--brand-primary)", borderBottom: "1px solid var(--brand-border)" }}>
                  <ArrowLeft className="w-3 h-3" /> Parent Directory
                </button>
              )}
              {files.map((f, i) => {
                const fp = `${filePath}/${f.name}`.replace("//", "/")
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors group" style={{ borderBottom: "1px solid var(--brand-border)" }}>
                    <input type="checkbox" checked={selected.has(i)} onChange={() => toggleSelect(i)} className="w-3.5 h-3.5 rounded accent-[var(--brand-primary)]" style={{ opacity: selected.has(i) ? 1 : 0.3 }} />
                    <button className="flex-1 flex items-center gap-2.5 text-left min-w-0" onClick={() => f.isDirectory ? fetchFiles(fp) : fetchFileContent(fp)}>
                      {f.isDirectory ? <FolderOpen className="w-4 h-4 flex-shrink-0" style={{ color: "var(--brand-primary)" }} /> : <FileText className="w-4 h-4 flex-shrink-0" style={{ color: "var(--brand-muted)" }} />}
                      {renaming === f.name ? (
                        <input autoFocus defaultValue={f.name} onChange={(e) => setRenameValue(e.target.value)} onBlur={() => handleRename(f.name)} onKeyDown={(e) => e.key === "Enter" && handleRename(f.name)} onClick={(e) => e.stopPropagation()} className="flex-1 px-2 py-0.5 rounded text-xs outline-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-primary)", color: "var(--brand-text)" }} />
                      ) : (
                        <span className="text-xs truncate" style={{ color: "var(--brand-text)" }}>{f.name}</span>
                      )}
                    </button>
                    {!f.isDirectory && <span className="text-[10px] flex-shrink-0" style={{ color: "var(--brand-muted)" }}>{formatSize(f.size)}</span>}
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); setRenaming(f.name); setRenameValue(f.name) }} className="p-1 rounded hover:bg-white/10" title="Rename"><Pencil className="w-3 h-3" style={{ color: "var(--brand-muted)" }} /></button>
                      {!f.isDirectory && <button onClick={(e) => { e.stopPropagation(); handleDownload(f.name) }} className="p-1 rounded hover:bg-white/10" title="Download"><Download className="w-3 h-3" style={{ color: "var(--brand-muted)" }} /></button>}
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(f.name) }} disabled={deleting === f.name} className="p-1 rounded hover:bg-red-500/10 disabled:opacity-50" title="Delete">
                        {deleting === f.name ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: "var(--brand-muted)" }} /> : <Trash2 className="w-3 h-3" style={{ color: "#EF4444" }} />}
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
