"use client"
import { useState, useEffect } from "react"
import { Loader2, Shield, Users, Server, Settings } from "lucide-react"

const ROLES = [
  { name: "ADMIN", desc: "Full access to everything", color: "#ef4444", icon: <Shield size={16} strokeWidth={1.5} />, perms: ["All permissions", "Manage users", "Manage servers", "System settings", "Audit log"] },
  { name: "MODERATOR", desc: "Can manage users and servers", color: "#f59e0b", icon: <Users size={16} strokeWidth={1.5} />, perms: ["View users", "Manage servers", "View audit log", "Ban users"] },
  { name: "CUSTOMER", desc: "Standard user with server access", color: "#3b82f6", icon: <Server size={16} strokeWidth={1.5} />, perms: ["Create servers", "Manage own servers", "View own billing"] },
]

export default function RolesPage() {
  return (
    <div className="p-5 md:p-6 max-w-[800px] mx-auto">
      <div className="mb-5"><h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Roles & Permissions</h1>
        <p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Overview of available roles in the system</p></div>
      <div className="space-y-3">{ROLES.map(r => (
        <div key={r.name} className="p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-[36px] h-[36px] rounded-lg flex items-center justify-center" style={{ backgroundColor: `${r.color}20`, border: `1px solid ${r.color}40` }}><span style={{ color: r.color }}>{r.icon}</span></div>
            <div><div className="text-[13px] font-medium" style={{ color: r.color }}>{r.name}</div><div className="text-[11px]" style={{ color: "var(--brand-muted)" }}>{r.desc}</div></div>
          </div>
          <div className="flex flex-wrap gap-1.5">{r.perms.map(p => (
            <span key={p} className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: `${r.color}15`, color: r.color }}>{p}</span>
          ))}</div>
        </div>
      ))}</div>
    </div>
  )
}
