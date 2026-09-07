"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Server, Users, Activity, HardDrive, Globe, Cpu, Play, Square, Clock, Plus, ArrowRight } from "lucide-react"

interface UserServer { id: string; name: string; status: string; software: string; mcVersion: string; ram: number; port: number }
interface AdminStats { userCount: number; serverCount: number; runningServers: number; stoppedServers: number; errorServers: number; nodeCount: number; onlineNodes: number; totalRam: number; totalDisk: number; recentServers: { id: string; name: string; status: string; createdAt: string }[]; recentUsers: { id: string; name: string; email: string; createdAt: string }[] }

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [myServers, setMyServers] = useState<UserServer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (stored) setUser(JSON.parse(stored))
    const token = localStorage.getItem("token")
    if (!token) return
    Promise.all([
      fetch("/api/servers", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      stored && JSON.parse(stored).role === "ADMIN" ? fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).catch(() => null) : Promise.resolve(null),
    ]).then(([servers, adminStats]) => {
      setMyServers(Array.isArray(servers) ? servers : [])
      if (adminStats && !adminStats.error) setStats(adminStats)
    }).finally(() => setLoading(false))
  }, [])

  if (!user) return null

  const running = myServers.filter((s) => s.status === "RUNNING").length
  const stopped = myServers.filter((s) => s.status === "STOPPED").length
  const totalRam = myServers.reduce((a, s) => a + s.ram, 0)

  return (
    <div className="p-5 max-w-6xl mx-auto">
      {/* Welcome */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold" style={{ color: "var(--brand-text)" }}>Welcome back, {user.name}</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--brand-muted)" }}>Manage your Minecraft servers</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Servers", value: myServers.length, icon: <Server size={18} />, color: "var(--brand-primary)", bg: "rgba(99,102,241,0.12)" },
          { label: "Running", value: running, icon: <Play size={18} />, color: "var(--brand-success)", bg: "rgba(34,197,94,0.12)" },
          { label: "Stopped", value: stopped, icon: <Square size={18} />, color: "var(--brand-muted)", bg: "rgba(139,146,165,0.12)" },
          { label: "RAM Used", value: `${(totalRam / 1024).toFixed(0)} GB`, icon: <Cpu size={18} />, color: "var(--brand-info)", bg: "rgba(59,130,246,0.12)" },
        ].map((c, i) => (
          <div key={i} className="p-4 rounded-xl card-hover animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", animationDelay: `${i * 60}ms`, opacity: 0, animationFillMode: "forwards" }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: c.bg, color: c.color }}>{c.icon}</div>
              <div>
                <div className="text-xl font-bold" style={{ color: "var(--brand-text)" }}>{loading ? "—" : c.value}</div>
                <div className="text-[11px]" style={{ color: "var(--brand-muted)" }}>{c.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Admin Stats */}
      {user.role === "ADMIN" && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Users", value: stats.userCount, color: "var(--brand-accent)" },
            { label: "Total Servers", value: stats.serverCount, color: "var(--brand-primary)" },
            { label: "Online Nodes", value: `${stats.onlineNodes}/${stats.nodeCount}`, color: "var(--brand-success)" },
            { label: "Total Disk", value: `${(stats.totalDisk / 1024).toFixed(0)} GB`, color: "var(--brand-warning)" },
          ].map((c, i) => (
            <div key={i} className="p-4 rounded-xl animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", animationDelay: `${(i + 4) * 60}ms`, opacity: 0, animationFillMode: "forwards" }}>
              <div className="text-xl font-bold" style={{ color: c.color }}>{c.value}</div>
              <div className="text-[11px] mt-0.5" style={{ color: "var(--brand-muted)" }}>{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Servers + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-xl animate-fade-in-up delay-300" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--brand-border)" }}>
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
              <Server size={15} style={{ color: "var(--brand-primary)" }} /> My Servers
            </h2>
            <button onClick={() => router.push("/servers")} className="text-[11px] flex items-center gap-1 hover:underline" style={{ color: "var(--brand-primary)" }}>
              View All <ArrowRight size={12} />
            </button>
          </div>
          <div className="p-3">
            {myServers.length === 0 ? (
              <div className="text-center py-10" style={{ color: "var(--brand-muted)" }}>
                <Server className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No servers yet</p>
                <button onClick={() => router.push("/servers/new")} className="mt-2 text-xs hover:underline" style={{ color: "var(--brand-primary)" }}>Create your first server</button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {myServers.slice(0, 5).map((s) => (
                  <div key={s.id} onClick={() => router.push(`/servers/${s.id}`)} className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-white/5 transition-all" style={{ backgroundColor: "transparent" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.status === "RUNNING" ? "var(--brand-success)" : s.status === "STARTING" ? "var(--brand-warning)" : "var(--brand-muted)" }} />
                      <div>
                        <div className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>{s.name}</div>
                        <div className="text-[11px]" style={{ color: "var(--brand-muted)" }}>{s.software} {s.mcVersion}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px]" style={{ color: s.status === "RUNNING" ? "var(--brand-success)" : "var(--brand-muted)" }}>{s.status}</div>
                      <div className="text-[11px]" style={{ color: "var(--brand-muted)" }}>{s.port}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl p-5 animate-fade-in-up delay-400" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--brand-text)" }}>Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: "Create Server", icon: <Plus size={16} />, url: "/servers/new", color: "var(--brand-primary)" },
              { label: "All Servers", icon: <Server size={16} />, url: "/servers", color: "var(--brand-info)" },
              { label: "Profile", icon: <Users size={16} />, url: "/profile", color: "var(--brand-accent)" },
              { label: "Activity", icon: <Activity size={16} />, url: "/activity", color: "var(--brand-success)" },
              { label: "Support", icon: <HardDrive size={16} />, url: "/support", color: "var(--brand-warning)" },
            ].map((a, i) => (
              <button key={i} onClick={() => router.push(a.url)} className="w-full flex items-center gap-3 p-2.5 rounded-lg text-sm hover:bg-white/5 transition-all text-left" style={{ color: "var(--brand-text)" }}>
                <span style={{ color: a.color }}>{a.icon}</span> {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Admin: Recent */}
      {user.role === "ADMIN" && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
          <div className="rounded-xl animate-fade-in-up delay-500" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="px-5 py-3.5" style={{ borderBottom: "1px solid var(--brand-border)" }}>
              <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--brand-text)" }}><Clock size={14} /> Recent Servers</h2>
            </div>
            <div className="p-3">
              {stats.recentServers.length === 0 ? <p className="text-xs text-center py-6" style={{ color: "var(--brand-muted)" }}>No servers yet</p> : stats.recentServers.map((s) => (
                <div key={s.id} onClick={() => router.push(`/servers/${s.id}`)} className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.status === "RUNNING" ? "var(--brand-success)" : "var(--brand-muted)" }} />
                    <span className="text-sm" style={{ color: "var(--brand-text)" }}>{s.name}</span>
                  </div>
                  <span className="text-[11px]" style={{ color: "var(--brand-muted)" }}>{new Date(s.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl animate-fade-in-up delay-600" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="px-5 py-3.5" style={{ borderBottom: "1px solid var(--brand-border)" }}>
              <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--brand-text)" }}><Users size={14} /> Recent Users</h2>
            </div>
            <div className="p-3">
              {stats.recentUsers.length === 0 ? <p className="text-xs text-center py-6" style={{ color: "var(--brand-muted)" }}>No users yet</p> : stats.recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-2.5 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>{u.name[0].toUpperCase()}</div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>{u.name}</div>
                      <div className="text-[11px]" style={{ color: "var(--brand-muted)" }}>{u.email}</div>
                    </div>
                  </div>
                  <span className="text-[11px]" style={{ color: "var(--brand-muted)" }}>{new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
