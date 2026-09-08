"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Palette, Navigation, Flag, Mail, Bell, Wrench,
  MessageCircle, Settings, Gamepad2, Activity, Webhook, Clock,
  Shield, Users, DollarSign, Database, Ban, Key, History, UserMinus, Scroll
} from "lucide-react";

const SETTINGS_NAV = [
  { href: "/admin/revenue", label: "Revenue", icon: <DollarSign size={15} strokeWidth={1.5} /> },
  { href: "/admin/users", label: "Users", icon: <Users size={15} strokeWidth={1.5} /> },
  { href: "/admin/roles", label: "Roles", icon: <Shield size={15} strokeWidth={1.5} /> },
  { href: "/admin/quotas", label: "Quotas", icon: <Database size={15} strokeWidth={1.5} /> },
  { href: "/admin/audit", label: "Audit Log", icon: <Scroll size={15} strokeWidth={1.5} /> },
  { href: "/admin/login-history", label: "Login History", icon: <History size={15} strokeWidth={1.5} /> },
  { href: "/admin/suspensions", label: "Suspensions", icon: <UserMinus size={15} strokeWidth={1.5} /> },
  { href: "/admin/blacklist", label: "Plugin Blacklist", icon: <Ban size={15} strokeWidth={1.5} /> },
  { href: "/admin/api-keys", label: "API Keys", icon: <Key size={15} strokeWidth={1.5} /> },
  { href: "/admin/maintenance", label: "Maintenance", icon: <Wrench size={15} strokeWidth={1.5} /> },
  { href: "/admin/settings/branding", label: "Branding", icon: <Palette size={15} strokeWidth={1.5} /> },
  { href: "/admin/settings/navigation", label: "Navigation", icon: <Navigation size={15} strokeWidth={1.5} /> },
  { href: "/admin/settings/features", label: "Features", icon: <Flag size={15} strokeWidth={1.5} /> },
  { href: "/admin/settings/renewal", label: "Renewal", icon: <Clock size={15} strokeWidth={1.5} /> },
  { href: "/admin/settings/discord", label: "Discord", icon: <Gamepad2 size={15} strokeWidth={1.5} /> },
  { href: "/admin/settings/email", label: "Email", icon: <Mail size={15} strokeWidth={1.5} /> },
  { href: "/admin/settings/announcements", label: "Announcements", icon: <Bell size={15} strokeWidth={1.5} /> },
  { href: "/admin/settings/social", label: "Social Links", icon: <MessageCircle size={15} strokeWidth={1.5} /> },
  { href: "/admin/health", label: "System Health", icon: <Activity size={15} strokeWidth={1.5} /> },
  { href: "/admin/webhooks", label: "Webhooks", icon: <Webhook size={15} strokeWidth={1.5} /> },
];

export default function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-48px)]">
      {/* Settings sub-sidebar */}
      <aside
        className="w-52 flex-shrink-0 hidden md:block"
        style={{ borderRight: "1px solid var(--brand-border)" }}
      >
        <div className="px-3.5 py-3" style={{ borderBottom: "1px solid var(--brand-border)" }}>
          <div className="flex items-center gap-2">
            <Settings size={14} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
            <span className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>Settings</span>
          </div>
        </div>
        <nav className="py-1.5 px-1.5">
          {SETTINGS_NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-2.5 py-[7px] rounded-md text-[12px] transition-all duration-150"
                style={{
                  backgroundColor: active ? "rgba(255,255,255,0.06)" : "transparent",
                  color: active ? "var(--brand-text)" : "var(--brand-muted)",
                  fontWeight: active ? 500 : 400,
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
