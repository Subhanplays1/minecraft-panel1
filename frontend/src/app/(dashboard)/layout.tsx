"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useBranding } from "@/components/BrandingProvider";
import type { PublicSettings } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Server, Users, Network, Settings, LogOut, ChevronLeft, ChevronRight,
  Bell, Search, Terminal, FileText, Link2, UserPlus, Puzzle, Archive, Wifi,
  User, Activity, HelpCircle, Sliders, FolderOpen, ArrowLeft, X,
  Moon, Sun, Loader2
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={16} strokeWidth={1.5} />,
  Server: <Server size={16} strokeWidth={1.5} />,
  Users: <Users size={16} strokeWidth={1.5} />,
  Network: <Network size={16} strokeWidth={1.5} />,
  Settings: <Settings size={16} strokeWidth={1.5} />,
  User: <User size={16} strokeWidth={1.5} />,
  Activity: <Activity size={16} strokeWidth={1.5} />,
  HelpCircle: <HelpCircle size={16} strokeWidth={1.5} />,
  Sliders: <Sliders size={16} strokeWidth={1.5} />,
};

interface ServerInfo { id: string; name: string; status: string; software: string; mcVersion: string }
interface Notif { id: string; title: string; message: string; type: string; read: boolean; createdAt: string }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { settings, theme, toggleTheme } = useBranding();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [showMobile, setShowMobile] = useState(false);

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
          <div className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center animate-pulse-slow" style={{ backgroundColor: "#1a1a1a", border: "1px solid #222" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
          </div>
          <div className="mt-3 text-xs font-medium tracking-wide" style={{ color: "#666" }}>MINEVO</div>
        </div>
      </div>
    );
  }

  const mainNav = settings.navigation.filter((n) => n.section === "main" && n.isVisible) as Array<PublicSettings["navigation"][number] & { openNewTab?: boolean }>;
  const adminNav = settings.navigation.filter((n) => n.section === "admin" && n.isVisible && (user.role === "ADMIN" || user.role === "STAFF")) as Array<PublicSettings["navigation"][number] & { openNewTab?: boolean }>;

  const handleLogout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); router.push("/auth/login"); };
  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  const serverNavItems = [
    { id: "console", name: "Console", icon: <Terminal size={16} strokeWidth={1.5} />, url: `/servers/${serverId}` },
    { id: "files", name: "Files", icon: <FolderOpen size={16} strokeWidth={1.5} />, url: `/servers/${serverId}/files` },
    { id: "plugins", name: "Plugins", icon: <Puzzle size={16} strokeWidth={1.5} />, url: `/servers/${serverId}/plugins` },
    { id: "properties", name: "Properties", icon: <FileText size={16} strokeWidth={1.5} />, url: `/servers/${serverId}/properties` },
    { id: "backups", name: "Backups", icon: <Archive size={16} strokeWidth={1.5} />, url: `/servers/${serverId}/backups` },
    { id: "users", name: "Users", icon: <UserPlus size={16} strokeWidth={1.5} />, url: `/servers/${serverId}/users` },
    { id: "sftp", name: "SFTP", icon: <Link2 size={16} strokeWidth={1.5} />, url: `/servers/${serverId}/sftp` },
    { id: "tunnel", name: "Playit", icon: <Wifi size={16} strokeWidth={1.5} />, url: `/servers/${serverId}/tunnel` },
    { id: "settings", name: "Settings", icon: <Settings size={16} strokeWidth={1.5} />, url: `/servers/${serverId}/settings` },
  ];

  const sw = collapsed ? "56px" : "220px";
  const unread = notifications.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    const token = localStorage.getItem("token");
    await fetch(`/api/notifications/${id}/read`, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const NavLink = ({ item, url, name, icon }: { item?: any; url: string; name: string; icon: React.ReactNode }) => {
    const active = isActive(url);
    return (
      <a
        href={item?.openNewTab ? url : undefined}
        target={item?.openNewTab ? "_blank" : undefined}
        rel={item?.openNewTab ? "noopener noreferrer" : undefined}
        onClick={(e) => { if (!item?.openNewTab) { e.preventDefault(); router.push(url); } setShowMobile(false); }}
        className="sidebar-item flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-normal relative group"
        style={{
          color: active ? "var(--brand-text)" : "var(--brand-muted)",
          backgroundColor: active ? "rgba(255,255,255,0.06)" : "transparent",
          fontWeight: active ? 500 : 400,
        }}
      >
        {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3.5 rounded-r-full" style={{ backgroundColor: "var(--brand-text)" }} />}
        <span className="flex-shrink-0">{icon}</span>
        {!collapsed && <span className="truncate">{name}</span>}
      </a>
    );
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--brand-background)" }}>
      {/* Mobile overlay */}
      {showMobile && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setShowMobile(false)} />}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-200 ease-out ${showMobile ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{ width: sw, backgroundColor: "var(--brand-sidebar)", borderRight: "1px solid var(--brand-border)" }}
      >
        {/* Logo */}
        <div className="h-12 flex items-center px-3.5 gap-2.5 flex-shrink-0" style={{ borderBottom: "1px solid var(--brand-border)" }}>
          {serverId && currentServer ? (
            <>
              <button onClick={() => { router.push("/servers"); setShowMobile(false); }} className="p-1 rounded-md hover:bg-white/5 transition-colors" style={{ color: "var(--brand-muted)" }}>
                <ArrowLeft size={16} strokeWidth={1.5} />
              </button>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate" style={{ color: "var(--brand-text)" }}>{currentServer.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`status-dot ${currentServer.status === "RUNNING" ? "running" : currentServer.status === "STOPPED" ? "stopped" : "starting"}`} />
                    <span className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{currentServer.status.toLowerCase()}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#1a1a1a", border: "1px solid #222" }}>
                <span className="text-[11px] font-bold" style={{ color: "#999" }}>M</span>
              </div>
              {!collapsed && <span className="text-[13px] font-semibold tracking-tight" style={{ color: "var(--brand-text)" }}>Minevo</span>}
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2.5 px-2">
          {serverId && currentServer ? (
            <div className="space-y-0.5">
              {serverNavItems.map((item) => <NavLink key={item.id} item={item} url={item.url} name={item.name} icon={item.icon} />)}
              {!collapsed && (
                <div className="mt-3 mx-0.5 p-2.5 rounded-md" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
                  <div className="text-[10px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--brand-muted)" }}>Server Info</div>
                  <div className="text-[11px] space-y-1" style={{ color: "var(--brand-muted)" }}>
                    <div>{currentServer.software} {currentServer.mcVersion}</div>
                    <div className="flex items-center gap-1.5">
                      <span className={`status-dot ${currentServer.status === "RUNNING" ? "running" : currentServer.status === "STOPPED" ? "stopped" : "starting"}`} />
                      {currentServer.status.toLowerCase()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-0.5">
                {mainNav.map((item) => <NavLink key={item.id} item={item} url={item.url} name={item.name} icon={item.icon && iconMap[item.icon]} />)}
              </div>
              {adminNav.length > 0 && (
                <div className="mt-4">
                  <div className="px-2.5 mb-1.5 text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--brand-muted)", opacity: 0.6 }}>{collapsed ? "—" : "Admin"}</div>
                  <div className="space-y-0.5">
                    {adminNav.map((item) => <NavLink key={item.id} item={item} url={item.url} name={item.name} icon={item.icon && iconMap[item.icon]} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </nav>

        {/* Bottom */}
        <div className="flex-shrink-0" style={{ borderTop: "1px solid var(--brand-border)" }}>
          <button onClick={() => setCollapsed(!collapsed)} className="w-full h-8 flex items-center justify-center hover:bg-white/5 transition-colors hidden lg:flex" style={{ color: "var(--brand-muted)" }}>
            {collapsed ? <ChevronRight size={14} strokeWidth={1.5} /> : <ChevronLeft size={14} strokeWidth={1.5} />}
          </button>
          <div className="px-2.5 py-2 flex items-center gap-2">
            <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: "#1a1a1a", border: "1px solid #222", color: "#999" }}>
              {user.name[0].toUpperCase()}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium truncate" style={{ color: "var(--brand-text)" }}>{user.name}</div>
                  <div className="text-[10px] truncate" style={{ color: "var(--brand-muted)" }}>{user.email}</div>
                </div>
                <button onClick={handleLogout} className="p-1 rounded hover:bg-white/5 transition-colors" style={{ color: "var(--brand-muted)" }}>
                  <LogOut size={13} strokeWidth={1.5} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-screen transition-all duration-200" style={{ marginLeft: typeof window !== "undefined" && window.innerWidth >= 1024 ? sw : 0 }}>
        {/* Top bar */}
        <header className="h-12 flex items-center justify-between px-4 sticky top-0 z-30" style={{ backgroundColor: "color-mix(in srgb, var(--brand-background) 80%, transparent)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid var(--brand-border)" }}>
          {/* Mobile menu */}
          <button onClick={() => setShowMobile(true)} className="p-1.5 rounded-md lg:hidden" style={{ color: "var(--brand-muted)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>

          {/* Search */}
          <div className="relative hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--brand-muted)" }} />
            <input
              type="text"
              placeholder="Search servers, users, settings..."
              className="input pl-9 pr-3 py-[7px] text-[12px]"
              style={{ width: "320px" }}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={toggleTheme} className="p-1.5 rounded-md hover:bg-white/5 transition-colors" style={{ color: "var(--brand-muted)" }} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
              {theme === "dark" ? <Sun size={15} strokeWidth={1.5} /> : <Moon size={15} strokeWidth={1.5} />}
            </button>

            <div className="relative">
              <button onClick={() => setShowNotif(!showNotif)} className="p-1.5 rounded-md hover:bg-white/5 transition-colors relative" style={{ color: "var(--brand-muted)" }}>
                <Bell size={15} strokeWidth={1.5} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-bold" style={{ backgroundColor: "var(--brand-text)", color: "var(--brand-background)" }}>
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>

              {showNotif && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 rounded-lg z-50 animate-fade-in-down overflow-hidden" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", boxShadow: "0 16px 32px rgba(0,0,0,0.4)" }}>
                    <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--brand-border)" }}>
                      <span className="text-[12px] font-semibold" style={{ color: "var(--brand-text)" }}>Notifications</span>
                      <button onClick={() => setShowNotif(false)} className="p-0.5 rounded hover:bg-white/5"><X size={13} style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center">
                          <Bell className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--brand-muted)", opacity: 0.3 }} strokeWidth={1.5} />
                          <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>No notifications</p>
                        </div>
                      ) : notifications.slice(0, 8).map((n) => (
                        <div key={n.id} onClick={() => markRead(n.id)} className="px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer" style={{ borderBottom: "1px solid var(--brand-border)", opacity: n.read ? 0.5 : 1 }}>
                          <div className="text-[12px] font-medium mb-0.5" style={{ color: "var(--brand-text)" }}>{n.title}</div>
                          <p className="text-[11px] leading-relaxed" style={{ color: "var(--brand-muted)" }}>{n.message}</p>
                          <span className="text-[10px] mt-1 block" style={{ color: "var(--brand-muted)", opacity: 0.5 }}>{new Date(n.createdAt).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="lg:hidden" style={{ marginLeft: 0 }}>
          {children}
        </div>
        <div className="hidden lg:block">
          {children}
        </div>

        {/* Ad slot */}
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
