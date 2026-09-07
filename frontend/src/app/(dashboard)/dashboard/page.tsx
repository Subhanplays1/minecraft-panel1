"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Server, Users, Activity, HardDrive, Cpu, Play, Square, Clock, Plus,
  ArrowRight, Monitor, ChevronRight
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

  return (
    <div className="p-5 md:p-6 max-w-[1200px] mx-auto">
      {/* Welcome */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#1a1a1a", border: "1px solid #222" }}>
          <Monitor size={16} strokeWidth={1.5} style={{ color: "#888" }} />
        </div>
        <div>
          <h1 className="text-[17px] font-semibold" style={{ color: "var(--brand-text)" }}>Welcome back, {user.name}</h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--brand-muted)" }}>Here&apos;s what&apos;s happening with your servers today.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Servers", value: myServers.length, sub: "Servers", icon: <Server size={16} strokeWidth={1.5} /> },
          { label: "Running", value: running, sub: "Currently online", icon: <Play size={16} strokeWidth={1.5} /> },
          { label: "Stopped", value: stopped, sub: "Currently offline", icon: <Square size={16} strokeWidth={1.5} /> },
          { label: "Total RAM", value: `${(totalRam / 1024).toFixed(1)} GB`, sub: "Allocated", icon: <Cpu size={16} strokeWidth={1.5} /> },
        ].map((c, i) => (
          <div
            key={i}
            className="group p-4 rounded-xl cursor-default transition-all duration-200 hover:translate-y-[-1px]"
            style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>{c.label}</span>
              <span style={{ color: "var(--brand-muted)", opacity: 0.5 }}>{c.icon}</span>
            </div>
            <div className="text-[26px] font-bold leading-none tracking-tight" style={{ color: "var(--brand-text)" }}>
              {loading ? <span className="inline-block w-12 h-6 skeleton" /> : c.value}
            </div>
            <div className="text-[11px] mt-1.5" style={{ color: "var(--brand-muted)" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Admin Overview */}
      {user.role === "ADMIN" && stats && (
        <div className="mb-6">
          <h2 className="text-[11px] font-medium uppercase tracking-wider mb-3" style={{ color: "var(--brand-muted)" }}>Admin Overview</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Users", value: stats.userCount, icon: <Users size={14} strokeWidth={1.5} /> },
              { label: "Servers", value: stats.serverCount, icon: <Server size={14} strokeWidth={1.5} /> },
              { label: "Nodes", value: `${stats.onlineNodes}/${stats.nodeCount}`, icon: <Activity size={14} strokeWidth={1.5} /> },
              { label: "Disk Used", value: `${(stats.totalDisk / 1024).toFixed(0)} GB`, icon: <HardDrive size={14} strokeWidth={1.5} /> },
            ].map((c, i) => (
              <div key={i} className="p-3 rounded-xl flex items-center gap-3" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
                <span style={{ color: "var(--brand-muted)", opacity: 0.5 }}>{c.icon}</span>
                <div>
                  <div className="text-[17px] font-bold leading-none" style={{ color: "var(--brand-text)" }}>{c.value}</div>
                  <div className="text-[10px] mt-1" style={{ color: "var(--brand-muted)" }}>{c.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Servers */}
        <div className="lg:col-span-2 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--brand-border)" }}>
            <div className="flex items-center gap-2">
              <Server size={14} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
              <h2 className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>My Servers</h2>
            </div>
            <button onClick={() => router.push("/servers")} className="text-[11px] font-medium flex items-center gap-1 transition-opacity hover:opacity-70" style={{ color: "var(--brand-muted)" }}>
              View all <ArrowRight size={11} strokeWidth={1.5} />
            </button>
          </div>
          <div className="p-2">
            {myServers.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#1a1a1a", border: "1px solid #222" }}>
                  <Server className="w-5 h-5" style={{ color: "var(--brand-muted)", opacity: 0.3 }} strokeWidth={1.5} />
                </div>
                <p className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>No servers yet</p>
                <p className="text-[11px] mt-1 mb-4" style={{ color: "var(--brand-muted)" }}>Create your first server to get started</p>
                <button onClick={() => router.push("/servers/new")} className="btn-primary text-[12px] py-2 px-4">
                  <Plus size={13} strokeWidth={2} /> Create Server
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {myServers.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    onClick={() => router.push(`/servers/${s.id}`)}
                    className="group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-150 hover:bg-white/[0.03]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: "#1a1a1a", border: "1px solid #222" }}>
                        <Server size={14} strokeWidth={1.5} style={{ color: "#888" }} />
                      </div>
                      <div>
                        <div className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>{s.name}</div>
                        <div className="text-[11px] mt-0.5" style={{ color: "var(--brand-muted)" }}>
                          {s.software} {s.mcVersion} &middot; {s.port}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`status-dot ${s.status === "RUNNING" ? "running" : s.status === "STOPPED" ? "stopped" : "starting"}`} />
                        <span className="text-[11px] font-medium" style={{ color: "var(--brand-muted)" }}>{s.status.toLowerCase()}</span>
                      </div>
                      <ChevronRight size={14} strokeWidth={1.5} className="opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: "var(--brand-muted)" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-5">
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <h2 className="text-[13px] font-medium mb-3" style={{ color: "var(--brand-text)" }}>Quick Actions</h2>
            <div className="space-y-1">
              {[
                { label: "Create Server", icon: <Plus size={14} strokeWidth={1.5} />, url: "/servers/new" },
                { label: "All Servers", icon: <Server size={14} strokeWidth={1.5} />, url: "/servers" },
                { label: "Profile", icon: <Users size={14} strokeWidth={1.5} />, url: "/profile" },
                { label: "Activity", icon: <Activity size={14} strokeWidth={1.5} />, url: "/activity" },
                { label: "Support", icon: <Monitor size={14} strokeWidth={1.5} />, url: "/support" },
              ].map((a, i) => (
                <button
                  key={i}
                  onClick={() => router.push(a.url)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg text-[12px] transition-all duration-150 text-left hover:bg-white/[0.04]"
                  style={{ color: "var(--brand-text)" }}
                >
                  <span style={{ color: "var(--brand-muted)" }}>{a.icon}</span>
                  <span className="font-medium">{a.label}</span>
                  <ChevronRight size={12} strokeWidth={1.5} className="ml-auto" style={{ color: "var(--brand-muted)", opacity: 0.4 }} />
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>Server Status</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: "var(--brand-muted)" }}>Running</span>
                <span className="text-[12px] font-semibold" style={{ color: "var(--brand-text)" }}>{running}</span>
              </div>
              <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: "#1a1a1a" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ backgroundColor: "#fff", width: myServers.length > 0 ? `${(running / myServers.length) * 100}%` : "0%" }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: "var(--brand-muted)" }}>Stopped</span>
                <span className="text-[12px] font-semibold" style={{ color: "var(--brand-text)" }}>{stopped}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Recent */}
      {user.role === "ADMIN" && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
          <div className="rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--brand-border)" }}>
              <Clock size={13} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
              <h2 className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>Recent Servers</h2>
            </div>
            <div className="p-2">
              {stats.recentServers.length === 0 ? (
                <p className="text-[11px] text-center py-6" style={{ color: "var(--brand-muted)" }}>No servers yet</p>
              ) : stats.recentServers.map((s) => (
                <div key={s.id} onClick={() => router.push(`/servers/${s.id}`)} className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-2">
                    <span className={`status-dot ${s.status === "RUNNING" ? "running" : "stopped"}`} />
                    <span className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>{s.name}</span>
                  </div>
                  <span className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{new Date(s.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--brand-border)" }}>
              <Users size={13} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
              <h2 className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>Recent Users</h2>
            </div>
            <div className="p-2">
              {stats.recentUsers.length === 0 ? (
                <p className="text-[11px] text-center py-6" style={{ color: "var(--brand-muted)" }}>No users yet</p>
              ) : stats.recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-2.5 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: "#1a1a1a", border: "1px solid #222", color: "#888" }}>
                      {u.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>{u.name}</div>
                      <div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{u.email}</div>
                    </div>
                  </div>
                  <span className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
