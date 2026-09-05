"use client"

import React, { useEffect, useState } from "react"
import { useBranding } from "@/components/BrandingProvider"
import { useRouter } from "next/navigation"
import {
  Server, Users, Activity, HardDrive, Globe, Cpu, Zap,
  ArrowUpRight, Clock, TrendingUp, Shield, Play, Square
} from "lucide-react"

interface AdminStats {
  userCount: number
  serverCount: number
  runningServers: number
  stoppedServers: number
  errorServers: number
  nodeCount: number
  onlineNodes: number
  totalRam: number
  totalDisk: number
  recentServers: { id: string; name: string; status: string; createdAt: string }[]
  recentUsers: { id: string; name: string; email: string; createdAt: string }[]
}

interface UserServer {
  id: string
  name: string
  status: string
  software: string
  mcVersion: string
  ram: number
  port: number
  ip: string | null
}

export default function DashboardPage() {
  const { settings } = useBranding()
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [myServers, setMyServers] = useState<UserServer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (stored) setUser(JSON.parse(stored))
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token")
        const headers = { Authorization: `Bearer ${token}` }

        // Fetch my servers
        const serversRes = await fetch("/api/servers", { headers })
        if (serversRes.ok) {
          const serversData = await serversRes.json()
          setMyServers(Array.isArray(serversData) ? serversData : [])
        }

        // Fetch admin stats if admin
        const storedUser = localStorage.getItem("user")
        if (storedUser) {
          const parsed = JSON.parse(storedUser)
          if (parsed.role === "ADMIN") {
            const statsRes = await fetch("/api/admin/stats", { headers })
            if (statsRes.ok) {
              setStats(await statsRes.json())
            }
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (!user || !settings) return null

  const runningCount = myServers.filter((s) => s.status === "RUNNING").length
  const stoppedCount = myServers.filter((s) => s.status === "STOPPED").length
  const totalRam = myServers.reduce((acc, s) => acc + s.ram, 0)

  const statCards = [
    {
      label: "My Servers",
      value: myServers.length,
      icon: <Server className="w-5 h-5" />,
      color: "var(--brand-primary)",
      bg: "rgba(124,58,237,0.15)",
    },
    {
      label: "Running",
      value: runningCount,
      icon: <Play className="w-5 h-5" />,
      color: "var(--brand-success)",
      bg: "rgba(34,197,94,0.15)",
    },
    {
      label: "Stopped",
      value: stoppedCount,
      icon: <Square className="w-5 h-5" />,
      color: "var(--brand-muted)",
      bg: "rgba(107,114,128,0.15)",
    },
    {
      label: "Total RAM",
      value: `${(totalRam / 1024).toFixed(0)} GB`,
      icon: <Cpu className="w-5 h-5" />,
      color: "var(--brand-info)",
      bg: "rgba(59,130,246,0.15)",
    },
  ]

  if (user.role === "ADMIN" && stats) {
    statCards.push(
      {
        label: "Total Users",
        value: stats.userCount,
        icon: <Users className="w-5 h-5" />,
        color: "var(--brand-accent)",
        bg: "rgba(168,85,247,0.15)",
      },
      {
        label: "Total Servers",
        value: stats.serverCount,
        icon: <Server className="w-5 h-5" />,
        color: "var(--brand-primary)",
        bg: "rgba(124,58,237,0.15)",
      },
      {
        label: "Online Nodes",
        value: `${stats.onlineNodes}/${stats.nodeCount}`,
        icon: <Globe className="w-5 h-5" />,
        color: "var(--brand-success)",
        bg: "rgba(34,197,94,0.15)",
      },
      {
        label: "Allocating",
        value: `${(stats.totalRam / 1024).toFixed(0)} GB RAM`,
        icon: <HardDrive className="w-5 h-5" />,
        color: "var(--brand-warning)",
        bg: "rgba(234,179,8,0.15)",
      }
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold" style={{ color: "var(--brand-text)" }}>
          Welcome back, {user.name}
        </h1>
        <p className="mt-1" style={{ color: "var(--brand-muted)" }}>
          Manage your Minecraft servers from {settings.branding.panelName || "the panel"}
        </p>
      </div>

      {/* Announcements */}
      {settings.announcements.length > 0 && (
        <div className="mb-6 space-y-3">
          {settings.announcements.map((ann, i) => (
            <div
              key={ann.id}
              className="p-4 rounded-xl animate-fade-in-up"
              style={{
                animationDelay: `${i * 100}ms`,
                opacity: 0,
                animationFillMode: "forwards",
                backgroundColor: ann.type === "WARNING"
                  ? "color-mix(in srgb, var(--brand-warning) 15%, var(--brand-card))"
                  : ann.type === "SUCCESS"
                  ? "color-mix(in srgb, var(--brand-success) 15%, var(--brand-card))"
                  : "color-mix(in srgb, var(--brand-info) 15%, var(--brand-card))",
                border: `1px solid ${
                  ann.type === "WARNING" ? "var(--brand-warning)" :
                  ann.type === "SUCCESS" ? "var(--brand-success)" : "var(--brand-info)"
                }30`,
              }}
            >
              <h3 className="font-medium mb-1" style={{ color: "var(--brand-text)" }}>{ann.title}</h3>
              <p className="text-sm" style={{ color: "var(--brand-muted)" }}>{ann.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="p-5 rounded-xl card-hover animate-fade-in-up"
            style={{
              backgroundColor: "var(--brand-card)",
              border: "1px solid var(--brand-border)",
              animationDelay: `${i * 80}ms`,
              opacity: 0,
              animationFillMode: "forwards",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: card.bg, color: card.color }}>
                {card.icon}
              </div>
              <ArrowUpRight className="w-4 h-4" style={{ color: "var(--brand-muted)", opacity: 0.3 }} />
            </div>
            <div className="text-2xl font-bold animate-count" style={{ color: "var(--brand-text)" }}>
              {loading ? "—" : card.value}
            </div>
            <div className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* My Servers quick view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Server list */}
        <div className="lg:col-span-2 rounded-xl p-5 animate-fade-in-up delay-300" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
              <Server className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
              My Servers
            </h2>
            <button
              onClick={() => router.push("/servers")}
              className="text-sm hover:underline"
              style={{ color: "var(--brand-primary)" }}
            >
              View All
            </button>
          </div>

          {myServers.length === 0 ? (
            <div className="text-center py-8" style={{ color: "var(--brand-muted)" }}>
              <Server className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No servers yet</p>
              <button
                onClick={() => router.push("/servers/new")}
                className="mt-2 text-sm hover:underline"
                style={{ color: "var(--brand-primary)" }}
              >
                Create your first server
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {myServers.slice(0, 5).map((server) => {
                const isRunning = server.status === "RUNNING"
                return (
                  <div
                    key={server.id}
                    onClick={() => router.push(`/servers/${server.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-white/5 transition-all"
                    style={{ backgroundColor: "var(--brand-background)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-green-500 animate-status-pulse" : "bg-gray-400"}`} />
                      <div>
                        <div className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>{server.name}</div>
                        <div className="text-xs" style={{ color: "var(--brand-muted)" }}>{server.software} {server.mcVersion}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs" style={{ color: isRunning ? "var(--brand-success)" : "var(--brand-muted)" }}>
                        {isRunning ? "Running" : "Stopped"}
                      </div>
                      <div className="text-xs" style={{ color: "var(--brand-muted)" }}>{server.port}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Activity / Admin panel */}
        <div className="rounded-xl p-5 animate-fade-in-up delay-400" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
            <Activity className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
            {user.role === "ADMIN" ? "Admin Overview" : "Quick Actions"}
          </h2>

          {user.role === "ADMIN" && stats ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--brand-background)" }}>
                <span className="text-sm" style={{ color: "var(--brand-muted)" }}>Users</span>
                <span className="font-semibold" style={{ color: "var(--brand-text)" }}>{stats.userCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--brand-background)" }}>
                <span className="text-sm" style={{ color: "var(--brand-muted)" }}>Servers</span>
                <span className="font-semibold" style={{ color: "var(--brand-text)" }}>{stats.serverCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--brand-background)" }}>
                <span className="text-sm" style={{ color: "var(--brand-muted)" }}>Running</span>
                <span className="font-semibold" style={{ color: "var(--brand-success)" }}>{stats.runningServers}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--brand-background)" }}>
                <span className="text-sm" style={{ color: "var(--brand-muted)" }}>Errors</span>
                <span className="font-semibold" style={{ color: "var(--brand-danger)" }}>{stats.errorServers}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--brand-background)" }}>
                <span className="text-sm" style={{ color: "var(--brand-muted)" }}>Nodes</span>
                <span className="font-semibold" style={{ color: "var(--brand-text)" }}>{stats.onlineNodes}/{stats.nodeCount}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => router.push("/servers/new")}
                className="w-full p-3 rounded-lg text-left text-sm flex items-center gap-3 hover:bg-white/5 transition-all"
                style={{ backgroundColor: "var(--brand-background)" }}
              >
                <Server className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
                <span style={{ color: "var(--brand-text)" }}>Create New Server</span>
              </button>
              <button
                onClick={() => router.push("/servers")}
                className="w-full p-3 rounded-lg text-left text-sm flex items-center gap-3 hover:bg-white/5 transition-all"
                style={{ backgroundColor: "var(--brand-background)" }}
              >
                <Globe className="w-4 h-4" style={{ color: "var(--brand-success)" }} />
                <span style={{ color: "var(--brand-text)" }}>View All Servers</span>
              </button>
              <button
                onClick={() => router.push("/files")}
                className="w-full p-3 rounded-lg text-left text-sm flex items-center gap-3 hover:bg-white/5 transition-all"
                style={{ backgroundColor: "var(--brand-background)" }}
              >
                <HardDrive className="w-4 h-4" style={{ color: "var(--brand-warning)" }} />
                <span style={{ color: "var(--brand-text)" }}>File Manager</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Admin: Recent activity */}
      {user.role === "ADMIN" && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent servers */}
          <div className="rounded-xl p-5 animate-fade-in-up delay-500" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
              <Clock className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
              Recent Servers
            </h2>
            <div className="space-y-2">
              {stats.recentServers.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: "var(--brand-muted)" }}>No servers yet</p>
              ) : (
                stats.recentServers.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => router.push(`/servers/${s.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-white/5 transition-all"
                    style={{ backgroundColor: "var(--brand-background)" }}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${s.status === "RUNNING" ? "bg-green-500" : s.status === "ERROR" ? "bg-red-500" : "bg-gray-400"}`} />
                      <span className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>{s.name}</span>
                    </div>
                    <span className="text-xs" style={{ color: "var(--brand-muted)" }}>
                      {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent users */}
          <div className="rounded-xl p-5 animate-fade-in-up delay-600" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
              <Users className="w-4 h-4" style={{ color: "var(--brand-accent)" }} />
              Recent Users
            </h2>
            <div className="space-y-2">
              {stats.recentUsers.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: "var(--brand-muted)" }}>No users yet</p>
              ) : (
                stats.recentUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: "var(--brand-background)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>
                        {u.name[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>{u.name}</div>
                        <div className="text-xs" style={{ color: "var(--brand-muted)" }}>{u.email}</div>
                      </div>
                    </div>
                    <span className="text-xs" style={{ color: "var(--brand-muted)" }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
