"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Clock, Plus, Trash2, Play, Pause, Loader2, Calendar, Terminal, RotateCcw, Square } from "lucide-react"
import toast from "react-hot-toast"

interface Schedule {
  id: string
  name: string
  type: "RESTART" | "STOP" | "START" | "COMMAND" | "BACKUP"
  command?: string
  cron: string
  enabled: boolean
  lastRun?: string
  nextRun?: string
}

type TaskForm = Omit<Schedule, "id" | "lastRun" | "nextRun">

const defaultForm: TaskForm = { name: "", type: "RESTART", command: "", cron: "0 4 * * *", enabled: true }

const typeIcons: Record<string, any> = { RESTART: RotateCcw, STOP: Square, START: Play, COMMAND: Terminal, BACKUP: RotateCcw }

const cronPresets = [
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Daily at 4am", value: "0 4 * * *" },
  { label: "Daily at midnight", value: "0 0 * * *" },
  { label: "Weekly (Sunday)", value: "0 0 * * 0" },
  { label: "Monthly (1st)", value: "0 0 1 * *" },
]

export default function SchedulerPage() {
  const params = useParams()
  const id = params.id as string
  const [tasks, setTasks] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TaskForm>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/schedules`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setTasks(Array.isArray(data) ? data : data.schedules || [])
      }
    } catch {} finally { setLoading(false) }
  }

  const openCreate = () => { setEditingId(null); setForm(defaultForm); setModalOpen(true) }

  const openEdit = (task: Schedule) => {
    setEditingId(task.id)
    setForm({ name: task.name, type: task.type, command: task.command || "", cron: task.cron, enabled: task.enabled })
    setModalOpen(true)
  }

  const saveTask = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return }
    if (!form.cron.trim()) { toast.error("Schedule is required"); return }
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const url = editingId ? `/api/servers/${id}/schedules/${editingId}` : `/api/servers/${id}/schedules`
      const method = editingId ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      if (res.ok) { toast.success(editingId ? "Task updated" : "Task created"); setModalOpen(false); fetchTasks() } else { toast.error("Failed to save task") }
    } catch { toast.error("Failed to save task") } finally { setSaving(false) }
  }

  const deleteTask = async (taskId: string) => {
    setDeletingId(taskId)
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/servers/${id}/schedules/${taskId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      toast.success("Task deleted"); fetchTasks()
    } catch { toast.error("Failed to delete task") } finally { setDeletingId(null) }
  }

  const runTask = async (taskId: string) => {
    setRunningId(taskId)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/servers/${id}/schedules/${taskId}/run`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { toast.success("Task triggered") } else { toast.error("Failed to run task") }
    } catch { toast.error("Failed to run task") } finally { setRunningId(null) }
  }

  const toggleEnabled = async (task: Schedule) => {
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/servers/${id}/schedules/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...task, enabled: !task.enabled }),
      })
      fetchTasks()
    } catch {}
  }

  useEffect(() => { fetchTasks() }, [id])

  const formatCron = (cron: string) => {
    const parts = cron.split(" ")
    if (parts.length !== 5) return cron
    const [, , , , dayOfWeek] = parts
    if (dayOfWeek !== "*") {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      return `${cron} (${days[parseInt(dayOfWeek)] || dayOfWeek})`
    }
    return cron
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--brand-text)" }}>Scheduler</h1>
          <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>Manage scheduled tasks for your server</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover-lift disabled:opacity-50" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      <div className="rounded-xl overflow-hidden animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        {loading ? (
          <div className="p-10 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--brand-primary)" }} /></div>
        ) : tasks.length === 0 ? (
          <div className="p-10 text-center" style={{ color: "var(--brand-muted)" }}>
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-medium mb-1">No scheduled tasks</p>
            <p className="text-sm">Create your first scheduled task to automate server management</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--brand-border)" }}>
                  <th className="px-4 py-3 text-xs font-medium" style={{ color: "var(--brand-muted)" }}>Name</th>
                  <th className="px-4 py-3 text-xs font-medium" style={{ color: "var(--brand-muted)" }}>Type</th>
                  <th className="px-4 py-3 text-xs font-medium" style={{ color: "var(--brand-muted)" }}>Schedule</th>
                  <th className="px-4 py-3 text-xs font-medium" style={{ color: "var(--brand-muted)" }}>Enabled</th>
                  <th className="px-4 py-3 text-xs font-medium" style={{ color: "var(--brand-muted)" }}>Last Run</th>
                  <th className="px-4 py-3 text-xs font-medium text-right" style={{ color: "var(--brand-muted)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, i) => {
                  const TypeIcon = typeIcons[task.type] || Clock
                  return (
                    <tr key={task.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: i < tasks.length - 1 ? "1px solid var(--brand-border)" : undefined }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(124,58,237,0.12)" }}>
                            <TypeIcon className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
                          </div>
                          <span className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>{task.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-md font-medium" style={{ backgroundColor: "var(--brand-background)", color: "var(--brand-muted)" }}>{task.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono" style={{ color: "var(--brand-text)" }}>{formatCron(task.cron)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleEnabled(task)} className="flex items-center gap-2 cursor-pointer" title={task.enabled ? "Disable" : "Enable"}>
                          <div className={`status-dot ${task.enabled ? "running" : "stopped"}`} />
                          <span className="text-xs" style={{ color: task.enabled ? "var(--brand-text)" : "var(--brand-muted)" }}>{task.enabled ? "On" : "Off"}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: "var(--brand-muted)" }}>
                          {task.lastRun ? new Date(task.lastRun).toLocaleString() : "Never"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => runTask(task.id)} disabled={runningId === task.id} className="p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50" style={{ color: "var(--brand-text)" }} title="Run now">
                            {runningId === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                          </button>
                          <button onClick={() => openEdit(task)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--brand-muted)" }} title="Edit">
                            <Clock className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteTask(task.id)} disabled={deletingId === task.id} className="p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50" style={{ color: "var(--brand-danger)" }} title="Delete">
                            {deletingId === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }} onClick={() => setModalOpen(false)}>
          <div className="rounded-xl w-full max-w-md mx-4 p-6 animate-scale-in" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: "var(--brand-text)" }}>{editingId ? "Edit Task" : "New Task"}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--brand-muted)" }}>
                <Square className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Daily Restart" className="input" />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as TaskForm["type"] })} className="input" style={{ backgroundColor: "var(--brand-card)", color: "var(--brand-text)", cursor: "pointer" }}>
                  <option value="RESTART">Restart</option>
                  <option value="STOP">Stop</option>
                  <option value="START">Start</option>
                  <option value="COMMAND">Send Command</option>
                  <option value="BACKUP">Backup</option>
                </select>
              </div>

              {form.type === "COMMAND" && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Command</label>
                  <input value={form.command} onChange={e => setForm({ ...form, command: e.target.value })} placeholder="e.g. say Hello World" className="input font-mono" />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Schedule (Cron)</label>
                <input value={form.cron} onChange={e => setForm({ ...form, cron: e.target.value })} placeholder="0 4 * * *" className="input font-mono" />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {cronPresets.map(preset => (
                    <button key={preset.value} onClick={() => setForm({ ...form, cron: preset.value })} className="btn-ghost text-[10px] py-1 px-2" style={{ backgroundColor: form.cron === preset.value ? "rgba(255,255,255,0.08)" : undefined }}>
                      {preset.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] mt-2" style={{ color: "var(--brand-muted)" }}>Format: minute hour day month weekday — <span className="font-mono">0 4 * * *</span> = daily at 4am</p>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ color: "var(--brand-muted)" }}>Enabled</label>
                <button onClick={() => setForm({ ...form, enabled: !form.enabled })} className="flex items-center gap-2 cursor-pointer">
                  <div className={`status-dot ${form.enabled ? "running" : "stopped"}`} />
                  <span className="text-xs" style={{ color: form.enabled ? "var(--brand-text)" : "var(--brand-muted)" }}>{form.enabled ? "On" : "Off"}</span>
                </button>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={saveTask} disabled={saving || !form.name.trim()} className="btn-primary flex-1 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}