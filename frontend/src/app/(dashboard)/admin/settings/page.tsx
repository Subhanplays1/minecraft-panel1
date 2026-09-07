"use client"

import Link from "next/link"
import { Palette, Navigation, Flag, Mail, Bell, Wrench, MessageCircle, ChevronRight } from "lucide-react"

const sections = [
  { href: "/admin/settings/branding", label: "Branding", desc: "Customize panel colors, fonts, logo, and appearance", icon: <Palette size={16} strokeWidth={1.5} /> },
  { href: "/admin/settings/navigation", label: "Navigation", desc: "Manage sidebar navigation items and order", icon: <Navigation size={16} strokeWidth={1.5} /> },
  { href: "/admin/settings/features", label: "Features", desc: "Enable or disable panel features and modules", icon: <Flag size={16} strokeWidth={1.5} /> },
  { href: "/admin/settings/email", label: "Email", desc: "Configure email SMTP settings and templates", icon: <Mail size={16} strokeWidth={1.5} /> },
  { href: "/admin/settings/announcements", label: "Announcements", desc: "Create and manage user-facing announcements", icon: <Bell size={16} strokeWidth={1.5} /> },
  { href: "/admin/settings/social", label: "Social Links", desc: "Add social media links to the panel", icon: <MessageCircle size={16} strokeWidth={1.5} /> },
  { href: "/admin/settings/maintenance", label: "Maintenance", desc: "Put the panel in maintenance mode", icon: <Wrench size={16} strokeWidth={1.5} /> },
]

export default function AdminSettingsPage() {
  return (
    <div className="p-5 md:p-6 max-w-[800px]">
      <div className="mb-5">
        <h1 className="text-[17px] font-semibold" style={{ color: "var(--brand-text)" }}>Settings</h1>
        <p className="text-[12px] mt-0.5" style={{ color: "var(--brand-muted)" }}>Configure your panel settings</p>
      </div>

      <div className="space-y-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="flex items-center justify-between p-4 rounded-xl transition-all duration-150 hover:bg-white/[0.03]"
            style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}
          >
            <div className="flex items-center gap-3">
              <span style={{ color: "var(--brand-muted)" }}>{section.icon}</span>
              <div>
                <div className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>{section.label}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--brand-muted)" }}>{section.desc}</div>
              </div>
            </div>
            <ChevronRight size={14} strokeWidth={1.5} style={{ color: "var(--brand-muted)", opacity: 0.4 }} />
          </Link>
        ))}
      </div>
    </div>
  )
}
