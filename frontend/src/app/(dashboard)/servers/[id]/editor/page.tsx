"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, Save, Copy, Check, FileCode } from "lucide-react"

export default function EditorPage() {
  const params = useParams(); const id = params.id as string
  const [filePath, setFilePath] = useState("server.properties")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const loadFile = async () => {
    setLoading(true); setSaved(false)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/files/read?path=${encodeURIComponent(filePath)}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setContent(d.content) }
      else { const d = await res.json(); setContent(`# Error: ${d.error}`) }
    } catch { setContent("# Failed to load file") }
    finally { setLoading(false) }
  }

  const saveFile = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/files/write`, {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filePath, content }),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    } catch {} finally { setSaving(false) }
  }

  useEffect(() => { if (filePath) loadFile() }, [id])

  return (
    <div className="p-5 md:p-6 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>File Editor</h1>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <input value={filePath} onChange={(e) => setFilePath(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadFile()}
          className="flex-1 px-3 py-1.5 rounded-lg font-mono text-[12px] outline-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
        <button onClick={loadFile} className="btn-secondary text-[11px] py-1.5 px-3">Load</button>
        <button onClick={saveFile} disabled={saving} className="btn-primary text-[11px] py-1.5 px-3 disabled:opacity-40">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} /> : saved ? <Check className="w-3 h-3" strokeWidth={2} /> : <Save className="w-3 h-3" strokeWidth={2} />} {saved ? "Saved" : "Save"}
        </button>
      </div>
      {loading ? (
        <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            className="w-full h-[500px] p-4 font-mono text-[11px] leading-relaxed outline-none resize-none" style={{ backgroundColor: "#0a0a0a", color: "#b0b0b0" }} />
        </div>
      )}
    </div>
  )
}
