"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Network, Server, Cpu, HardDrive, Plus, Edit3, Trash2,
  Globe, Wifi, WifiOff, Activity, Loader2, RefreshCw,
} from "lucide-react"

interface NodeData {
  id: string
  name: string
  displayName: string
  description: string | null
  hostname: string
  port: number
  scheme: string
  location: string
  isOnline: boolean
  isVisible: boolean
  maxServers: number
  allocatedRam: number
  allocatedDisk: number
  totalRam: number
  totalDisk: number
  cpuUsage: number
  createdAt: string
  _count?: { servers: number }
}

function UsageBar({ label, used, total, unit, color }: {
  label: string; used: number; total: number; unit: string; color: string;
}) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium" style={{ color: "var(--brand-muted)" }}>{label}</span>
        <span className="text-xs font-mono" style={{ color: "var(--brand-text)" }}>
          {(used / (unit === "GB" ? 1024 : 1)).toFixed(1)} / {total / (unit === "GB" ? 1024 : 1)} {unit}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--brand-border)" }}>
        <div
          className="h-full rounded-full transition-all duration-500 animate-progress"
          style={{ width: `${pct}%`, backgroundColor: pct > 80 ? "var(--brand-danger)" : color }}
        />
      </div>
      <div className="text-right mt-1">
        <span className="text-xs font-mono" style={{ color: pct > 80 ? "var(--brand-danger)" : "var(--brand-muted)" }}>
          {pct.toFixed(0)}%
        </span>
      </div>
    </div>
  )
}

export default function AdminNodesPage() {
  const router = useRouter()
  const [nodes, setNodes] = useState<NodeData[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [user, setUser] = useState<{ role: string } | null>(null)

  useEffect(() => {
    const t = localStorage.getItem("token")
    const u = localStorage.getItem("user")
    if (!t || !u) { router.push("/auth/login"); return }
    const parsed = JSON.parse(u)
    setUser(parsed)
    if (parsed.role !== "ADMIN") { router.push("/dashboard"); return }
    fetchNodes()
  }, [router])

  const fetchNodes = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/nodes", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setNodes(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this node?")) return
    setActionLoading(id)
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/nodes/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      setNodes((prev) => prev.filter((n) => n.id !== id))
    } catch {}
    setActionLoading(null)
  }

  const formatGB = (mb: number) => (mb / 1024).toFixed(0)
  const formatDisk = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(0)} GB` : `${mb} MB`

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--brand-primary)" }} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
            <Network className="w-6 h-6" style={{ color: "var(--brand-primary)" }} />
            Node Management
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>
            {nodes.length} node{nodes.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchNodes}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5"
            style={{ border: "1px solid var(--brand-border)", color: "var(--brand-muted)" }}
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={() => router.push("/admin/nodes/new")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white font-medium transition-all hover-lift btn-ripple"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            <Plus className="w-4 h-4" /> Add Node
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Nodes", value: nodes.length, icon: <Network size={18} />, color: "var(--brand-primary)" },
          { label: "Online", value: nodes.filter((n) => n.isOnline).length, icon: <Wifi size={18} />, color: "var(--brand-success)" },
          { label: "Total RAM", value: `${formatGB(nodes.reduce((a, n) => a + n.totalRam, 0))} GB`, icon: <Cpu size={18} />, color: "var(--brand-info)" },
          { label: "Total Disk", value: formatDisk(nodes.reduce((a, n) => a + n.totalDisk, 0)), icon: <HardDrive size={18} />, color: "var(--brand-warning)" },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="p-4 rounded-xl card-hover animate-fade-in-up"
            style={{
              backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)",
              animationDelay: `${i * 80}ms`, opacity: 0, animationFillMode: "forwards",
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: stat.color + "20", color: stat.color }}>
                {stat.icon}
              </div>
              <span className="text-xs font-medium" style={{ color: "var(--brand-muted)" }}>{stat.label}</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: "var(--brand-text)" }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Node Cards */}
      {nodes.length === 0 ? (
        <div className="text-center py-16 rounded-xl animate-fade-in" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <Network size={48} className="mx-auto mb-4 animate-float" style={{ color: "var(--brand-primary)", opacity: 0.3 }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--brand-text)" }}>No nodes found</h3>
          <p className="text-sm mb-4" style={{ color: "var(--brand-muted)" }}>Nodes are auto-created when the panel starts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {nodes.map((node, idx) => (
            <div
              key={node.id}
              className="rounded-xl overflow-hidden card-hover animate-fade-in-up"
              style={{
                backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)",
                animationDelay: `${idx * 100}ms`, opacity: 0, animationFillMode: "forwards",
              }}
            >
              {/* Header */}
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--brand-border)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                    backgroundColor: node.isOnline ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                  }}>
                    <Globe size={20} style={{ color: node.isOnline ? "var(--brand-success)" : "var(--brand-danger)" }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: "var(--brand-text)" }}>{node.displayName}</h3>
                    <p className="text-xs" style={{ color: "var(--brand-muted)" }}>{node.location}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{
                  backgroundColor: node.isOnline ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                  color: node.isOnline ? "var(--brand-success)" : "var(--brand-danger)",
                }}>
                  {node.isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                  {node.isOnline ? "Online" : "Offline"}
                </span>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-4">
                <UsageBar label="RAM" used={node.allocatedRam} total={node.totalRam} unit="GB" color="var(--brand-info)" />
                <UsageBar label="Disk" used={node.allocatedDisk} total={node.totalDisk} unit="GB" color="var(--brand-accent)" />
              </div>

              {/* Footer */}
              <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--brand-border)" }}>
                <span className="text-xs font-mono" style={{ color: "var(--brand-muted)" }}>
                  {node.hostname}:{node.port}
                </span>
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-lg transition-colors hover:bg-white/5" style={{ color: "var(--brand-muted)" }}>
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(node.id)}
                    disabled={actionLoading === node.id}
                    className="p-2 rounded-lg transition-colors hover:bg-white/5 disabled:opacity-50"
                    style={{ color: "var(--brand-danger)" }}
                  >
                    {actionLoading === node.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
