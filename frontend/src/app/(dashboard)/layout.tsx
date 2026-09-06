"use client";

import React, { useEffect, useState } from "react";
import { useBranding } from "@/components/BrandingProvider";
import type { PublicSettings } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Server, ShoppingBag, FolderOpen, Puzzle, Archive,
  Users, Network, Settings, LogOut, ChevronLeft, ChevronRight, Bell, Search,
  Terminal, Play, Square, RotateCcw, HardDrive, ArrowLeft, ExternalLink,
  Cpu, Shield, Globe, FileText, Link2, UserPlus, Wifi
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={20} />,
  Server: <Server size={20} />,
  ShoppingBag: <ShoppingBag size={20} />,
  FolderOpen: <FolderOpen size={20} />,
  Puzzle: <Puzzle size={20} />,
  Archive: <Archive size={20} />,
  Users: <Users size={20} />,
  Network: <Network size={20} />,
  Settings: <Settings size={20} />,
};

interface ServerInfo {
  id: string;
  name: string;
  status: string;
  software: string;
  mcVersion: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { settings } = useBranding();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);

  // Server context
  const serverMatch = pathname.match(/^\/servers\/([a-f0-9-]+)/);
  const serverId = serverMatch ? serverMatch[1] : null;
  const [currentServer, setCurrentServer] = useState<ServerInfo | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/auth/login");
      return;
    }
    setUser(JSON.parse(stored));
  }, [router]);

  useEffect(() => {
    if (!serverId) { setCurrentServer(null); return; }
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`/api/servers/${serverId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (data && !data.error) setCurrentServer(data); })
      .catch(() => {});
  }, [serverId]);

  if (!user || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "transparent" }}>
        <div className="animate-pulse text-lg" style={{ color: "var(--brand-muted)" }}>Loading...</div>
      </div>
    );
  }

  const mainNav = settings.navigation.filter((n) => n.section === "main" && n.isVisible) as Array<PublicSettings["navigation"][number] & { openNewTab?: boolean }>;
  const adminNav = settings.navigation.filter((n) => n.section === "admin" && n.isVisible && (user.role === "ADMIN" || user.role === "STAFF")) as Array<PublicSettings["navigation"][number] & { openNewTab?: boolean }>;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/auth/login");
  };

  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  const serverNavItems = [
    { id: "console", name: "Terminal", icon: <Terminal size={20} />, url: `/servers/${serverId}` },
    { id: "properties", name: "Properties", icon: <FileText size={20} />, url: `/servers/${serverId}/properties` },
    { id: "files", name: "File Manager", icon: <FolderOpen size={20} />, url: `/servers/${serverId}/files` },
    { id: "sftp", name: "SFTP Details", icon: <Link2 size={20} />, url: `/servers/${serverId}/sftp` },
    { id: "users", name: "Sub-Users", icon: <UserPlus size={20} />, url: `/servers/${serverId}/users` },
    { id: "plugins", name: "Plugins", icon: <Puzzle size={20} />, url: `/servers/${serverId}/plugins` },
    { id: "settings", name: "Settings", icon: <Settings size={20} />, url: `/servers/${serverId}/settings` },
    { id: "backups", name: "Backup", icon: <Archive size={20} />, url: `/servers/${serverId}/backups` },
    { id: "tunnel", name: "Playit Tunnel", icon: <Wifi size={20} />, url: `/servers/${serverId}/tunnel` },
  ];

  const statusColor = (s: string) => {
    if (s === "RUNNING") return "#22c55e";
    if (s === "STOPPED") return "#ef4444";
    if (s === "STARTING") return "#eab308";
    return "#6b7280";
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "transparent" }}>
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 animate-slide-in-left"
        style={{
          width: sidebarCollapsed ? "72px" : "260px",
          backgroundColor: "var(--brand-sidebar)",
          borderRight: "1px solid var(--brand-border)",
        }}
      >
        {/* Logo / Server Header */}
        <div className="h-16 flex items-center px-4 gap-3" style={{ borderBottom: "1px solid var(--brand-border)" }}>
          {serverId && currentServer && !sidebarCollapsed ? (
            <>
              <button onClick={() => router.push("/servers")} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: "var(--brand-primary)" }}>
                <ArrowLeft size={18} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: "var(--brand-text)" }}>{currentServer.name}</div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor(currentServer.status) }} />
                  <span className="text-xs" style={{ color: "var(--brand-muted)" }}>{currentServer.status}</span>
                </div>
              </div>
            </>
          ) : serverId && currentServer && sidebarCollapsed ? (
            <button onClick={() => router.push("/servers")} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10" style={{ color: "var(--brand-primary)" }}>
              <ArrowLeft size={18} />
            </button>
          ) : (
            <>
              {settings.branding.mainLogo ? (
                <img
                  src={`/${sidebarCollapsed ? settings.branding.smallLogo || settings.branding.mainLogo : settings.branding.mainLogo}`}
                  alt="Logo"
                  className="h-8 object-contain"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 animate-glow"
                  style={{ backgroundColor: "var(--brand-primary)", color: "white" }}
                >
                  {(settings.branding.shortName || settings.branding.panelName || "MC")[0]}
                </div>
              )}
              {!sidebarCollapsed && (
                <span className="text-sm font-semibold truncate" style={{ color: "var(--brand-text)" }}>
                  {settings.branding.shortName || settings.branding.panelName}
                </span>
              )}
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {serverId && currentServer ? (
            /* Server-specific navigation */
            <div className="space-y-1">
              <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--brand-muted)", opacity: 0.5 }}>
                {sidebarCollapsed ? "—" : "Server Management"}
              </div>
              {serverNavItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <a
                    key={item.id}
                    href={item.url}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all sidebar-item"
                    style={{
                      backgroundColor: active ? "var(--brand-primary)" + "15" : "transparent",
                      color: active ? "var(--brand-primary)" : "var(--brand-muted)",
                      borderRight: active ? "3px solid var(--brand-primary)" : "3px solid transparent",
                    }}
                  >
                    {item.icon}
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </a>
                );
              })}

              {!sidebarCollapsed && (
                <div className="mt-4 px-3 py-3 rounded-lg" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
                  <div className="text-xs font-medium mb-1" style={{ color: "var(--brand-muted)" }}>Server Info</div>
                  <div className="text-xs space-y-1" style={{ color: "var(--brand-muted)" }}>
                    <div>{currentServer.software} {currentServer.mcVersion}</div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor(currentServer.status) }} />
                      {currentServer.status}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Normal navigation */
            <>
              <div className="space-y-1">
                {mainNav.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <a
                      key={item.id}
                      href={item.url}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all sidebar-item"
                      style={{
                        backgroundColor: active ? "var(--brand-primary)" + "15" : "transparent",
                        color: active ? "var(--brand-primary)" : "var(--brand-muted)",
                        borderRight: active ? "3px solid var(--brand-primary)" : "3px solid transparent",
                      }}
                      target={item.openNewTab ? "_blank" : undefined}
                      rel={item.openNewTab ? "noopener noreferrer" : undefined}
                    >
                      {item.icon && iconMap[item.icon]}
                      {!sidebarCollapsed && <span>{item.name}</span>}
                    </a>
                  );
                })}
              </div>

              {adminNav.length > 0 && (
                <div className="mt-6">
                  <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--brand-muted)", opacity: 0.5 }}>
                    {sidebarCollapsed ? "—" : "Admin"}
                  </div>
                  <div className="space-y-1">
                    {adminNav.map((item) => {
                      const active = isActive(item.url);
                      return (
                        <a
                          key={item.id}
                          href={item.url}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all sidebar-item"
                          style={{
                            backgroundColor: active ? "var(--brand-primary)" + "15" : "transparent",
                            color: active ? "var(--brand-primary)" : "var(--brand-muted)",
                            borderRight: active ? "3px solid var(--brand-primary)" : "3px solid transparent",
                          }}
                        >
                          {item.icon && iconMap[item.icon]}
                          {!sidebarCollapsed && <span>{item.name}</span>}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </nav>

        {/* Sidebar toggle + User */}
        <div style={{ borderTop: "1px solid var(--brand-border)" }}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full h-10 flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{ color: "var(--brand-muted)" }}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <div className="px-3 py-3 flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: "var(--brand-accent)", color: "white" }}
            >
              {user.name[0].toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: "var(--brand-text)" }}>{user.name}</div>
                <div className="text-xs truncate" style={{ color: "var(--brand-muted)" }}>{user.role}</div>
              </div>
            )}
            {!sidebarCollapsed && (
              <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "var(--brand-muted)" }}>
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? "72px" : "260px" }}
      >
        {/* Top bar */}
        <header
          className="h-16 flex items-center justify-between px-6 sticky top-0 z-40"
          style={{
            backgroundColor: "color-mix(in srgb, var(--brand-background) 80%, transparent)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--brand-border)",
          }}
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--brand-muted)" }} />
              <input
                type="text"
                placeholder="Search..."
                className="pl-9 pr-4 py-2 rounded-lg text-sm w-64 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: "var(--brand-card)",
                  border: "1px solid var(--brand-border)",
                  color: "var(--brand-text)",
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg hover:bg-white/5 relative" style={{ color: "var(--brand-muted)" }}>
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: "var(--brand-danger)" }} />
            </button>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
