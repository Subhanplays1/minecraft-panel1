"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Settings, Save, Loader2, Trash2, AlertTriangle, HardDrive, Heart, Edit, RotateCcw, Users, GitCompare, FileCode, CheckCircle, ArrowUp, ArrowDown } from "lucide-react"
import toast from "react-hot-toast"

interface ServerInfo { id: string; name: string; status: string; software: string; mcVersion: string; ram: number; cpu: number; disk: number; port: number; ip: string | null; notes: string | null }

const TABS = [
  { id: "general", label: "General", icon: Settings },
  { id: "health", label: "Health", icon: Heart },
  { id: "editor", label: "File Editor", icon: Edit },
  { id: "auto-restart", label: "Auto-Restart", icon: RotateCcw },
  { id: "players", label: "Players", icon: Users },
  { id: "conflicts", label: "Conflicts", icon: AlertTriangle },
  { id: "config-diff", label: "Config Diff", icon: GitCompare },
]

export default function ServerSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [server, setServer] = useState<ServerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [name, setName] = useState("")
  const [ram, setRam] = useState(2048)
  const [cpu, setCpu] = useState(100)
  const [port, setPort] = useState(25565)
  const [notes, setNotes] = useState("")
  const [tab, setTab] = useState("general")

  useEffect(() => {
    fetch(`/api/servers/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then((r) => r.json())
      .then((d) => { setServer(d); setName(d.name); setRam(d.ram); setCpu(d.cpu); setPort(d.port); setNotes(d.notes || "") })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const saveSettings = async () => {
    setSaving(true)
    try {
      const r = await fetch(`/api/servers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ name, ram, cpu, port, notes }),
      })
      if (r.ok) {
        toast.success("Saved")
      } else {
        toast.error("Failed")
      }
    } catch (e) {
      toast.error("Failed")
    } finally {
      setSaving(false)
    }
  }

  const deleteServer = async () => {
    if (!confirm("Delete this server?")) return
    setDeleting(true)
    try {
      const r = await fetch(`/api/servers/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      if (r.ok) {
        toast.success("Deleted")
        router.push("/servers")
      }
    } catch (e) { /* empty */ } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>
  if (!server) return <div className="p-5 text-center text-[12px]" style={{ color: "var(--brand-muted)" }}>Not found</div>

  return (
    <div className="p-5 md:p-6 max-w-[1000px] mx-auto">
      <h1 className="text-[16px] font-semibold mb-4" style={{ color: "var(--brand-text)" }}>Server Settings</h1>

      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 text-[11px] py-1.5 px-3 rounded-lg whitespace-nowrap ${tab === t.id ? "btn-primary" : "btn-ghost"}`}>
              <Icon size={12} strokeWidth={1.5} /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === "general" && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="text-[12px] font-medium mb-3" style={{ color: "var(--brand-text)" }}>General Settings</div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--brand-muted)" }}>Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-1.5 rounded-lg text-[12px] outline-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--brand-muted)" }}>Software</label>
                  <input value={server.software} disabled className="w-full px-3 py-1.5 rounded-lg text-[12px] opacity-50" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--brand-muted)" }}>Version</label>
                  <input value={server.mcVersion} disabled className="w-full px-3 py-1.5 rounded-lg text-[12px] opacity-50" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--brand-muted)" }}>RAM (MB)</label>
                  <input type="number" value={ram} onChange={(e) => setRam(Number(e.target.value))} className="w-full px-3 py-1.5 rounded-lg text-[12px] outline-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--brand-muted)" }}>CPU (%)</label>
                  <input type="number" value={cpu} onChange={(e) => setCpu(Number(e.target.value))} className="w-full px-3 py-1.5 rounded-lg text-[12px] outline-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--brand-muted)" }}>Port</label>
                  <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} className="w-full px-3 py-1.5 rounded-lg text-[12px] outline-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--brand-muted)" }}>Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-1.5 rounded-lg text-[12px] outline-none resize-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={saveSettings} disabled={saving} className="btn-primary text-[11px] py-2 px-4 disabled:opacity-40">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} /> : <Save className="w-3 h-3" strokeWidth={2} />} Save
            </button>
            <button onClick={async () => {
              if (!confirm("Duplicate?")) return
              const r = await fetch(`/api/servers/${id}/duplicate`, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
              if (r.ok) { const d = await r.json(); router.push(`/servers/${d.id}`) }
            }} className="btn-secondary text-[11px] py-2 px-4">Duplicate</button>
          </div>
          <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] font-medium text-red-400">Delete Server</div>
                <div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>This action cannot be undone</div>
              </div>
              <button onClick={deleteServer} disabled={deleting} className="btn-ghost text-[11px] text-red-400 disabled:opacity-40"><Trash2 size={12} strokeWidth={1.5} /> Delete</button>
            </div>
          </div>
        </div>
      )}

      {tab === "health" && <HealthSection serverId={id} />}
      {tab === "editor" && <EditorSection serverId={id} />}
      {tab === "auto-restart" && <AutoRestartSection serverId={id} />}
      {tab === "players" && <PlayersSection serverId={id} />}
      {tab === "conflicts" && <ConflictsSection serverId={id} />}
      {tab === "config-diff" && <ConfigDiffSection serverId={id} />}
    </div>
  )
}

function HealthSection({ serverId }: { serverId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/servers/${serverId}/health`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [serverId])

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>
  if (!data) return <div className="p-5 text-[12px]" style={{ color: "var(--brand-muted)" }}>No data</div>

  const scoreColor = data.score >= 90 ? "#22c55e" : data.score >= 70 ? "#f59e0b" : "#ef4444"

  return (
    <div className="space-y-3">
      <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="text-[40px] font-bold" style={{ color: scoreColor }}>{data.score}</div>
        <div className="text-[12px] font-medium" style={{ color: "var(--brand-muted)" }}>Grade: {data.grade}</div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Uptime", value: `${data.uptimePct}%`, color: data.uptimePct > 99 ? "#22c55e" : "#f59e0b" },
          { label: "Crashes", value: String(data.crashes), color: data.crashes === 0 ? "#22c55e" : "#ef4444" },
          { label: "Memory", value: `${data.ramPct}%`, color: data.ramPct > 90 ? "#ef4444" : "#22c55e" },
        ].map((c, i) => (
          <div key={i} className="p-3 rounded-xl text-center" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>{c.label}</div>
            <div className="text-[14px] font-semibold mt-1" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>
      {data.history && data.history.length > 0 && (
        <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="text-[11px] font-medium mb-2" style={{ color: "var(--brand-text)" }}>History</div>
          <div className="flex items-end gap-1 h-[60px]">
            {data.history.reverse().map((h: any, i: number) => (
              <div key={i} className="flex-1 rounded-sm" style={{ height: `${h.score}%`, backgroundColor: h.score >= 90 ? "#22c55e" : h.score >= 70 ? "#f59e0b" : "#ef4444" }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EditorSection({ serverId }: { serverId: string }) {
  const [filePath, setFilePath] = useState("server.properties")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const loadFile = async () => {
    setLoading(true)
    setSaved(false)
    try {
      const r = await fetch(`/api/servers/${serverId}/files/read?path=${encodeURIComponent(filePath)}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      if (r.ok) {
        const d = await r.json()
        setContent(d.content)
      } else {
        const d = await r.json()
        setContent(`# Error: ${d.error}`)
      }
    } catch (e) {
      setContent("# Failed")
    } finally {
      setLoading(false)
    }
  }

  const saveFile = async () => {
    setSaving(true)
    try {
      const r = await fetch(`/api/servers/${serverId}/files/write`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ filePath, content }),
      })
      if (r.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (e) { /* empty */ } finally {
      setSaving(false)
    }
  }

  useEffect(() => { loadFile() }, [])

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={filePath} onChange={(e) => setFilePath(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadFile()} className="flex-1 px-3 py-1.5 rounded-lg font-mono text-[11px] outline-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
        <button onClick={loadFile} className="btn-secondary text-[11px] py-1.5 px-3">Load</button>
        <button onClick={saveFile} disabled={saving} className="btn-primary text-[11px] py-1.5 px-3 disabled:opacity-40">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} /> : saved ? <CheckCircle className="w-3 h-3" strokeWidth={2} /> : <Save className="w-3 h-3" strokeWidth={2} />} {saved ? "Saved" : "Save"}
        </button>
      </div>
      {loading ? (
        <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full h-[400px] p-4 font-mono text-[11px] leading-relaxed outline-none resize-none" style={{ backgroundColor: "#0a0a0a", color: "#b0b0b0" }} />
        </div>
      )}
    </div>
  )
}

function AutoRestartSection({ serverId }: { serverId: string }) {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/servers/${serverId}/auto-restart`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then((r) => r.json())
      .then((d) => setEnabled(d.enabled))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [serverId])

  const toggle = async () => {
    setSaving(true)
    try {
      await fetch(`/api/servers/${serverId}/auto-restart`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ enabled: !enabled }),
      })
      setEnabled(!enabled)
    } catch (e) { /* empty */ } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>

  return (
    <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RotateCcw size={16} strokeWidth={1.5} style={{ color: enabled ? "#22c55e" : "var(--brand-muted)" }} />
          <div>
            <div className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>Auto-Restart</div>
            <div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{enabled ? "Enabled" : "Disabled"}</div>
          </div>
        </div>
        <button onClick={toggle} disabled={saving} className={`text-[11px] py-1 px-3 rounded-lg ${enabled ? "btn-primary" : "btn-ghost"} disabled:opacity-40`}>
          {enabled ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  )
}

function PlayersSection({ serverId }: { serverId: string }) {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = () => {
      fetch(`/api/servers/${serverId}/players/history?limit=100`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
        .then((r) => r.ok ? r.json() : [])
        .then((d) => setEvents(d))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
    fetchData()
    const t = setInterval(fetchData, 10000)
    return () => clearInterval(t)
  }, [serverId])

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>

  const joins = events.filter((e) => e.action === "JOIN").length
  const leaves = events.filter((e) => e.action === "LEAVE").length

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>Joins</div>
          <div className="text-[14px] font-semibold text-green-500 mt-1">{joins}</div>
        </div>
        <div className="p-3 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>Leaves</div>
          <div className="text-[14px] font-semibold text-red-400 mt-1">{leaves}</div>
        </div>
      </div>
      <div className="rounded-xl overflow-hidden max-h-[300px] overflow-y-auto" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        {events.length === 0 ? (
          <p className="p-4 text-[11px]" style={{ color: "var(--brand-muted)" }}>No player history</p>
        ) : (
          events.map((e) => (
            <div key={e.id} className="px-3 py-2 flex items-center justify-between text-[11px]" style={{ borderBottom: "1px solid var(--brand-border)" }}>
              <div className="flex items-center gap-2">
                {e.action === "JOIN" ? <ArrowUp size={10} strokeWidth={2} className="text-green-500" /> : <ArrowDown size={10} strokeWidth={2} className="text-red-400" />}
                <span className="font-medium" style={{ color: "var(--brand-text)" }}>{e.playerName}</span>
                <span style={{ color: e.action === "JOIN" ? "#22c55e" : "#f87171" }}>{e.action.toLowerCase()}</span>
              </div>
              <span style={{ color: "var(--brand-muted)" }}>{new Date(e.createdAt).toLocaleTimeString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ConflictsSection({ serverId }: { serverId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/servers/${serverId}/plugin-conflicts`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [serverId])

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>
  if (!data) return null

  const sevColor: Record<string, string> = { CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#f59e0b", LOW: "#22c55e" }

  return (
    <div className="space-y-2">
      {data.conflicts.length === 0 ? (
        <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <CheckCircle size={18} strokeWidth={1.5} className="text-green-500 mx-auto" />
          <p className="text-[11px] mt-2" style={{ color: "var(--brand-muted)" }}>No conflicts detected</p>
        </div>
      ) : (
        data.conflicts.map((c: any, i: number) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="flex items-center gap-3">
              <AlertTriangle size={12} strokeWidth={1.5} style={{ color: sevColor[c.severity] || "#888" }} />
              <div>
                <div className="text-[11px] font-medium" style={{ color: "var(--brand-text)" }}>{c.plugin}</div>
                <div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{c.issue}</div>
              </div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${sevColor[c.severity]}20`, color: sevColor[c.severity] }}>{c.severity}</span>
          </div>
        ))
      )}
    </div>
  )
}

function ConfigDiffSection({ serverId }: { serverId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/servers/${serverId}/config-diff`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [serverId])

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>
  if (!data) return null

  return (
    <div className="space-y-3">
      {data.diffs.length === 0 ? (
        <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <GitCompare size={18} strokeWidth={1.5} style={{ color: "var(--brand-muted)", margin: "0 auto" }} />
          <p className="text-[11px] mt-2" style={{ color: "var(--brand-muted)" }}>No config changes</p>
        </div>
      ) : (
        data.diffs.map((d: any) => (
          <div key={d.file} className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid var(--brand-border)" }}>
              <GitCompare size={11} strokeWidth={1.5} className="text-yellow-500" />
              <span className="text-[11px] font-medium" style={{ color: "var(--brand-text)" }}>{d.file}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500">Modified</span>
            </div>
            <div className="grid grid-cols-2 divide-x" style={{ borderColor: "var(--brand-border)" }}>
              <div className="p-3">
                <div className="text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: "var(--brand-muted)" }}>Backup</div>
                <pre className="font-mono text-[10px] leading-relaxed overflow-x-auto max-h-[150px]" style={{ color: "#b0b0b0" }}>{d.backup || "None"}</pre>
              </div>
              <div className="p-3">
                <div className="text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: "var(--brand-muted)" }}>Current</div>
                <pre className="font-mono text-[10px] leading-relaxed overflow-x-auto max-h-[150px]" style={{ color: "#b0b0b0" }}>{d.current}</pre>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
