"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Palette, Navigation, Flag, Mail, Bell, Wrench,
  MessageCircle, Settings
} from "lucide-react";

const SETTINGS_NAV = [
  { href: "/admin/settings/branding", label: "Branding", icon: <Palette size={18} /> },
  { href: "/admin/settings/navigation", label: "Navigation", icon: <Navigation size={18} /> },
  { href: "/admin/settings/features", label: "Features", icon: <Flag size={18} /> },
  { href: "/admin/settings/email", label: "Email", icon: <Mail size={18} /> },
  { href: "/admin/settings/announcements", label: "Announcements", icon: <Bell size={18} /> },
  { href: "/admin/settings/social", label: "Social Links", icon: <MessageCircle size={18} /> },
  { href: "/admin/settings/maintenance", label: "Maintenance", icon: <Wrench size={18} /> },
];

export default function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex">
      {/* Settings sub-sidebar */}
      <aside
        className="w-56 flex-shrink-0"
        style={{ borderRight: "1px solid var(--brand-border)" }}
      >
        <div className="px-4 py-4" style={{ borderBottom: "1px solid var(--brand-border)" }}>
          <div className="flex items-center gap-2">
            <Settings size={16} style={{ color: "var(--brand-primary)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>Settings</span>
          </div>
        </div>
        <nav className="py-2">
          {SETTINGS_NAV.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-4 py-2 text-sm transition-colors"
                style={{
                  backgroundColor: isActive ? "var(--brand-primary)" + "15" : "transparent",
                  color: isActive ? "var(--brand-primary)" : "var(--brand-muted)",
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
