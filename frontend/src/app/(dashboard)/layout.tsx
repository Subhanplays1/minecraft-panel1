"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useBranding } from "@/components/BrandingProvider";
import type { PublicSettings } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Server, Users, Network, Settings, LogOut, ChevronLeft, ChevronRight,
  Bell, Search, Terminal, FileText, Link2, UserPlus, Puzzle, Archive, Wifi,
  User, Activity, HelpCircle, Sliders, FolderOpen, ArrowLeft, X, Check, AlertTriangle, Info
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={18} />, Server: <Server size={18} />, Users: <Users size={18} />,
  Network: <Network size={18} />, Settings: <Settings size={18} />, User: <User size={18} />,
  Activity: <Activity size={18} />, HelpCircle: <HelpCircle size={18} />, Sliders: <Sliders size={18} />,
};

interface ServerInfo { id: string; name: string; status: string; software: string; mcVersion: string }
interface Notif { id: string; title: string; message: string; type: string; read: boolean; createdAt: string }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { settings } = useBranding();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>([]);

  const serverMatch = pathname.match(/^\/servers\/([a-f0-9-]+)/);
  const serverId = serverMatch ? serverMatch[1] : null;
  const [currentServer, setCurrentServer] = useState<ServerInfo | null>(null);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/auth/login"); return; }
    setUser(JSON.parse(stored));
  }, [router]);

  useEffect(() => {
    if (!serverId) { setCurrentServer(null); return; }
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`/api/servers/${serverId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => { if (d && !d.error) setCurrentServer(d); }).catch(() => {});
  }, [serverId]);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setNotifications(Array.isArray(d) ? d : d.notifications || []); }
    } catch {}
  }, []);

  useEffect(() => { if (mounted) fetchNotifications(); }, [mounted, fetchNotifications]);
  useEffect(() => { if (mounted) { const t = setInterval(fetchNotifications, 30000); return () => clearInterval(t); } }, [mounted, fetchNotifications]);

  if (!mounted || !user || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--brand-background)" }}>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center animate-pulse" style={{ background: "linear-gradient(135deg, var(--brand-primary), var(--brand-accent))" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
          </div>
          <div className="mt-3 text-sm font-medium" style={{ color: "var(--brand-text)" }}>Minevo</div>
          <div className="w-32 h-1 mx-auto mt-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--brand-border)" }}>
            <div className="h-full rounded-full animate-pulse" style={{ background: "linear-gradient(90deg, var(--brand-primary), var(--brand-accent))", width: "60%" }} />
          </div>
        </div>
      </div>
    );
  }

  const mainNav = settings.navigation.filter((n) => n.section === "main" && n.isVisible) as Array<PublicSettings["navigation"][number] & { openNewTab?: boolean }>;
  const adminNav = settings.navigation.filter((n) => n.section === "admin" && n.isVisible && (user.role === "ADMIN" || user.role === "STAFF")) as Array<PublicSettings["navigation"][number] & { openNewTab?: boolean }>;

  const handleLogout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); router.push("/auth/login"); };
  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  const serverNavItems = [
    { id: "console", name: "Console", icon: <Terminal size={18} />, url: `/servers/${serverId}` },
    { id: "files", name: "Files", icon: <FolderOpen size={18} />, url: `/servers/${serverId}/files` },
    { id: "plugins", name: "Plugins", icon: <Puzzle size={18} />, url: `/servers/${serverId}/plugins` },
    { id: "properties", name: "Properties", icon: <FileText size={18} />, url: `/servers/${serverId}/properties` },
    { id: "backups", name: "Backups", icon: <Archive size={18} />, url: `/servers/${serverId}/backups` },
    { id: "users", name: "Users", icon: <UserPlus size={18} />, url: `/servers/${serverId}/users` },
    { id: "sftp", name: "SFTP", icon: <Link2 size={18} />, url: `/servers/${serverId}/sftp` },
    { id: "tunnel", name: "Playit", icon: <Wifi size={18} />, url: `/servers/${serverId}/tunnel` },
    { id: "settings", name: "Settings", icon: <Settings size={18} />, url: `/servers/${serverId}/settings` },
  ];

  const statusColor = (s: string) => s === "RUNNING" ? "#22c55e" : s === "STOPPED" ? "#EF4444" : s === "STARTING" ? "#F59E0B" : "#6B7280";
  const sw = sidebarCollapsed ? "64px" : "240px";
  const unread = notifications.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    const token = localStorage.getItem("token");
    await fetch(`/api/notifications/${id}/read`, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--brand-background)" }}>
      <aside className="fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-200" style={{ width: sw, backgroundColor: "var(--brand-sidebar)", borderRight: "1px solid var(--brand-border)" }}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 gap-3" style={{ borderBottom: "1px solid var(--brand-border)" }}>
          {serverId && currentServer ? (
            <>
              <button onClick={() => router.push("/servers")} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--brand-primary)" }}>
                <ArrowLeft size={18} />
              </button>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: "var(--brand-text)" }}>{currentServer.name}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor(currentServer.status) }} />
                    <span className="text-[11px]" style={{ color: "var(--brand-muted)" }}>{currentServer.status}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: "linear-gradient(135deg, var(--brand-primary), var(--brand-accent))", color: "white" }}>M</div>
              {!sidebarCollapsed && <span className="text-sm font-bold tracking-wide" style={{ color: "var(--brand-text)" }}>Minevo</span>}
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {serverId && currentServer ? (
            <div className="space-y-0.5">
              {serverNavItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <a key={item.id} href={item.url} className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all sidebar-item" style={{ backgroundColor: active ? "var(--brand-primary)" + "18" : "transparent", color: active ? "var(--brand-primary)" : "var(--brand-muted)", fontWeight: active ? 600 : 400 }}>
                    {item.icon}
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </a>
                );
              })}
              {!sidebarCollapsed && (
                <div className="mt-4 mx-1 p-3 rounded-lg" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
                  <div className="text-[11px] font-medium mb-1" style={{ color: "var(--brand-muted)" }}>Info</div>
                  <div className="text-[11px] space-y-0.5" style={{ color: "var(--brand-muted)" }}>
                    <div>{currentServer.software} {currentServer.mcVersion}</div>
                    <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor(currentServer.status) }} />{currentServer.status}</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-0.5">
                {mainNav.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <a key={item.id} href={item.url} className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all sidebar-item" style={{ backgroundColor: active ? "var(--brand-primary)" + "18" : "transparent", color: active ? "var(--brand-primary)" : "var(--brand-muted)", fontWeight: active ? 600 : 400 }}>
                      {item.icon && iconMap[item.icon]}
                      {!sidebarCollapsed && <span>{item.name}</span>}
                    </a>
                  );
                })}
              </div>
              {adminNav.length > 0 && (
                <div className="mt-5">
                  <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--brand-muted)", opacity: 0.5 }}>{sidebarCollapsed ? "—" : "Admin"}</div>
                  <div className="space-y-0.5">
                    {adminNav.map((item) => {
                      const active = isActive(item.url);
                      return (
                        <a key={item.id} href={item.url} className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all sidebar-item" style={{ backgroundColor: active ? "var(--brand-primary)" + "18" : "transparent", color: active ? "var(--brand-primary)" : "var(--brand-muted)", fontWeight: active ? 600 : 400 }}>
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

        {/* Bottom */}
        <div style={{ borderTop: "1px solid var(--brand-border)" }}>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="w-full h-9 flex items-center justify-center hover:bg-white/5 transition-colors" style={{ color: "var(--brand-muted)" }}>
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <div className="px-3 py-2.5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>{user.name[0].toUpperCase()}</div>
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate" style={{ color: "var(--brand-text)" }}>{user.name}</div>
                  <div className="text-[10px] truncate" style={{ color: "var(--brand-muted)" }}>{user.role}</div>
                </div>
                <button onClick={handleLogout} className="p-1 rounded hover:bg-white/5" style={{ color: "var(--brand-muted)" }}><LogOut size={14} /></button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 transition-all duration-200" style={{ marginLeft: sw }}>
        <header className="h-14 flex items-center justify-between px-5 sticky top-0 z-40" style={{ backgroundColor: "color-mix(in srgb, var(--brand-background) 85%, transparent)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--brand-border)" }}>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--brand-muted)" }} />
            <input type="text" placeholder="Search..." className="pl-9 pr-3 py-1.5 rounded-lg text-xs w-56 focus:outline-none focus:ring-1" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
          </div>
          <div className="flex items-center gap-2 relative">
            <button onClick={() => setShowNotif(!showNotif)} className="p-1.5 rounded-lg hover:bg-white/5 relative" style={{ color: "var(--brand-muted)" }}>
              <Bell size={16} />
              {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-bold" style={{ backgroundColor: "var(--brand-danger)", color: "white" }}>{unread}</span>}
            </button>
            {/* Notification dropdown */}
            {showNotif && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 rounded-xl z-50 animate-fade-in-down" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
                  <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--brand-border)" }}>
                    <span className="text-xs font-semibold" style={{ color: "var(--brand-text)" }}>Notifications</span>
                    <button onClick={() => setShowNotif(false)} className="p-0.5 rounded hover:bg-white/5"><X size={14} style={{ color: "var(--brand-muted)" }} /></button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center" style={{ color: "var(--brand-muted)" }}>
                        <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">No notifications</p>
                      </div>
                    ) : notifications.slice(0, 10).map((n) => (
                      <div key={n.id} onClick={() => markRead(n.id)} className="px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer" style={{ borderBottom: "1px solid var(--brand-border)", opacity: n.read ? 0.6 : 1 }}>
                        <div className="flex items-center gap-2 mb-0.5">
                          {n.type === "success" && <Check size={12} className="text-green-400" />}
                          {n.type === "warning" && <AlertTriangle size={12} className="text-yellow-400" />}
                          {n.type === "error" && <X size={12} className="text-red-400" />}
                          {(!n.type || n.type === "info") && <Info size={12} className="text-blue-400" />}
                          <span className="text-xs font-medium" style={{ color: "var(--brand-text)" }}>{n.title}</span>
                        </div>
                        <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>{n.message}</p>
                        <span className="text-[10px] mt-0.5 block" style={{ color: "var(--brand-muted)", opacity: 0.6 }}>{new Date(n.createdAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {children}

        {!serverId && (
          <div className="px-5 py-3">
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--brand-border)" }}>
              <ins className="adsbygoogle" style={{ display: "block" }} data-ad-client="ca-pub-XXXXXXXXXX" data-ad-slot="XXXXXXXXXX" data-ad-format="auto" data-full-width-responsive="true" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
