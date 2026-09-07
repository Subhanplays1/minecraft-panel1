"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Server, Users, Activity, HardDrive, Globe, Cpu, Play, Square, Clock, Plus,
  ArrowRight, Zap, Shield, Wifi, Monitor, ChevronRight, TrendingUp, AlertTriangle
} from "lucide-react"

interface UserServer {
  id: string; name: string; status: string; software: string; mcVersion: string;
  ram: number; port: number; allocatedRam: number; allocatedDisk: number;
}
interface AdminStats {
  userCount: number; serverCount: number; runningServers: number; stoppedServers: number;
  errorServers: number; nodeCount: number; onlineNodes: number; totalRam: number;
  totalDisk: number;
  recentServers: { id: string; name: string; status: string; createdAt: string }[];
  recentUsers: { id: string; name: string; email: string; createdAt: string }[];
}

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
  const totalRam = myServers.reduce((a, s) => a + (s.allocatedRam || s.ram || 0), 0)
  const totalDisk = myServers.reduce((a, s) => a + (s.allocatedDisk || 0), 0)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--brand-primary), var(--brand-accent))" }}>
            <Monitor size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--brand-text)" }}>Welcome back, {user.name}</h1>
            <p className="text-sm" style={{ color: "var(--brand-muted)" }}>Here&apos;s what&apos;s happening with your servers</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Servers", value: myServers.length, icon: <Server size={20} />, color: "var(--brand-primary)" },
          { label: "Running", value: running, icon: <Play size={20} />, color: "var(--brand-success)" },
          { label: "Stopped", value: stopped, icon: <Square size={20} />, color: "var(--brand-danger)" },
          { label: "Total RAM", value: `${(totalRam / 1024).toFixed(1)} GB`, icon: <Cpu size={20} />, color: "var(--brand-info)" },
        ].map((c, i) => (
          <div key={i} className="group p-5 rounded-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--brand-muted)" }}>{c.label}</p>
                <p className="text-2xl font-bold" style={{ color: "var(--brand-text)" }}>{loading ? "—" : c.value}</p>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: `color-mix(in srgb, ${c.color} 12%, transparent)`, color: c.color }}>
                {c.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Admin Stats */}
      {user.role === "ADMIN" && stats && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--brand-muted)" }}>Admin Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Users", value: stats.userCount, icon: <Users size={18} />, color: "var(--brand-primary)" },
              { label: "Servers", value: stats.serverCount, icon: <Server size={18} />, color: "var(--brand-info)" },
              { label: "Nodes", value: `${stats.onlineNodes}/${stats.nodeCount}`, icon: <Wifi size={18} />, color: "var(--brand-success)" },
              { label: "Disk Used", value: `${(stats.totalDisk / 1024).toFixed(0)} GB`, icon: <HardDrive size={18} />, color: "var(--brand-warning)" },
            ].map((c, i) => (
              <div key={i} className="p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `color-mix(in srgb, ${c.color} 15%, transparent)`, color: c.color }}>{c.icon}</div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: "var(--brand-text)" }}>{c.value}</p>
                    <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>{c.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Servers */}
        <div className="lg:col-span-2 rounded-2xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--brand-border)" }}>
            <div className="flex items-center gap-2">
              <Server size={16} style={{ color: "var(--brand-primary)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--brand-text)" }}>My Servers</h2>
            </div>
            <button onClick={() => router.push("/servers")} className="text-[11px] font-medium flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: "var(--brand-primary)" }}>
              View All <ArrowRight size={12} />
            </button>
          </div>
          <div className="p-3">
            {myServers.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--brand-background)" }}>
                  <Server className="w-8 h-8" style={{ color: "var(--brand-muted)", opacity: 0.3 }} />
                </div>
                <p className="text-sm font-medium mb-1" style={{ color: "var(--brand-text)" }}>No servers yet</p>
                <p className="text-xs mb-4" style={{ color: "var(--brand-muted)" }}>Create your first Minecraft server to get started</p>
                <button onClick={() => router.push("/servers/new")} className="px-4 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--brand-text)", color: "var(--brand-background)" }}>
                  <Plus size={14} className="inline mr-1.5 -mt-0.5" /> Create Server
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {myServers.slice(0, 5).map((s) => {
                  const statusColors: Record<string, string> = { RUNNING: "#22c55e", STOPPED: "#EF4444", STARTING: "#F59E0B", RESTARTING: "#F59E0B" }
                  return (
                    <div key={s.id} onClick={() => router.push(`/servers/${s.id}`)} className="group flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.01]" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)" }}>
                      <div className="flex items-center gap-3.5">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, ${statusColors[s.status] || "var(--brand-muted)"} 15%, transparent)` }}>
                            <Server size={18} style={{ color: statusColors[s.status] || "var(--brand-muted)" }} />
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ backgroundColor: statusColors[s.status] || "var(--brand-muted)", borderColor: "var(--brand-background)" }} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold" style={{ color: "var(--brand-text)" }}>{s.name}</div>
                          <div className="text-[11px] mt-0.5" style={{ color: "var(--brand-muted)" }}>{s.software} {s.mcVersion} &middot; {s.port}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium" style={{ backgroundColor: `color-mix(in srgb, ${statusColors[s.status] || "var(--brand-muted)"} 15%, transparent)`, color: statusColors[s.status] || "var(--brand-muted)" }}>
                            {s.status}
                          </span>
                        </div>
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--brand-muted)" }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-5">
          <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--brand-text)" }}>Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: "Create Server", icon: <Plus size={16} />, url: "/servers/new", color: "var(--brand-primary)" },
                { label: "All Servers", icon: <Server size={16} />, url: "/servers", color: "var(--brand-info)" },
                { label: "Profile", icon: <Users size={16} />, url: "/profile", color: "var(--brand-accent)" },
                { label: "Activity", icon: <Activity size={16} />, url: "/activity", color: "var(--brand-success)" },
                { label: "Support", icon: <Shield size={16} />, url: "/support", color: "var(--brand-warning)" },
              ].map((a, i) => (
                <button key={i} onClick={() => router.push(a.url)} className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm hover:scale-[1.02] transition-all duration-200 text-left" style={{ backgroundColor: "var(--brand-background)", color: "var(--brand-text)", border: "1px solid var(--brand-border)" }}>
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: `color-mix(in srgb, ${a.color} 15%, transparent)`, color: a.color }}>{a.icon}</div>
                  <span className="font-medium">{a.label}</span>
                  <ChevronRight size={14} className="ml-auto" style={{ color: "var(--brand-muted)" }} />
                </button>
              ))}
            </div>
          </div>

          {/* Status Card */}
          <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} style={{ color: "var(--brand-text)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--brand-text)" }}>Server Status</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--brand-muted)" }}>Running</span>
                <span className="text-xs font-bold" style={{ color: "var(--brand-success)" }}>{running}</span>
              </div>
              <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: "var(--brand-border)" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ backgroundColor: "var(--brand-success)", width: myServers.length > 0 ? `${(running / myServers.length) * 100}%` : "0%" }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--brand-muted)" }}>Stopped</span>
                <span className="text-xs font-bold" style={{ color: "var(--brand-danger)" }}>{stopped}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Recent */}
      {user.role === "ADMIN" && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="rounded-2xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--brand-border)" }}>
              <div className="flex items-center gap-2">
                <Clock size={14} style={{ color: "var(--brand-primary)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--brand-text)" }}>Recent Servers</h2>
              </div>
            </div>
            <div className="p-3">
              {stats.recentServers.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: "var(--brand-muted)" }}>No servers yet</p>
              ) : stats.recentServers.map((s) => (
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
          <div className="rounded-2xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--brand-border)" }}>
              <div className="flex items-center gap-2">
                <Users size={14} style={{ color: "var(--brand-primary)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--brand-text)" }}>Recent Users</h2>
              </div>
            </div>
            <div className="p-3">
              {stats.recentUsers.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: "var(--brand-muted)" }}>No users yet</p>
              ) : stats.recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-2.5 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: "var(--brand-text)", color: "var(--brand-background)" }}>{u.name[0].toUpperCase()}</div>
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
