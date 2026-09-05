"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useBranding } from "@/components/BrandingProvider";
import {
  Users, Search, Shield, Ban, CheckCircle, ChevronDown,
  RefreshCw, UserX, UserCheck, Clock, Mail, CalendarDays,
} from "lucide-react";
import toast from "react-hot-toast";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF" | "CUSTOMER";
  status: "ACTIVE" | "BANNED";
  createdAt: string;
  lastLoginAt: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const ROLE_STYLES: Record<string, { bg: string; text: string }> = {
  ADMIN: { bg: "color-mix(in srgb, var(--brand-primary) 20%, transparent)", text: "var(--brand-primary)" },
  STAFF: { bg: "color-mix(in srgb, var(--brand-info) 20%, transparent)", text: "var(--brand-info)" },
  CUSTOMER: { bg: "color-mix(in srgb, var(--brand-muted) 20%, transparent)", text: "var(--brand-muted)" },
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { settings } = useBranding();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!t || !user) {
      router.push("/auth/login");
      return;
    }
    const parsed = JSON.parse(user);
    if (parsed.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
    setToken(t);
  }, [router]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/servers/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users || data || []);
    } catch (error) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchUsers();
  }, [token, fetchUsers]);

  const handleBanToggle = async (userId: string, currentStatus: string) => {
    if (!token) return;
    setActionLoading(userId);
    try {
      const endpoint = currentStatus === "BANNED"
        ? `${API_BASE}/api/servers/admin/users/${userId}/unban`
        : `${API_BASE}/api/servers/admin/users/${userId}/ban`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Action failed");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, status: currentStatus === "BANNED" ? "ACTIVE" : "BANNED" }
            : u
        )
      );
      toast.success(currentStatus === "BANNED" ? "User unbanned" : "User banned");
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!token) return;
    setActionLoading(userId);
    try {
      const res = await fetch(`${API_BASE}/api/servers/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error("Role change failed");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole as UserData["role"] } : u))
      );
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--brand-background)" }}>
        <div className="animate-pulse text-lg" style={{ color: "var(--brand-muted)" }}>Loading users...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6 animate-fade-in">
        <Users size={20} style={{ color: "var(--brand-primary)" }} />
        <h1 className="text-2xl font-bold" style={{ color: "var(--brand-text)" }}>
          User Management
        </h1>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "var(--brand-card)", color: "var(--brand-muted)", border: "1px solid var(--brand-border)" }}
        >
          {filteredUsers.length} users
        </span>
      </div>

      <div className="animate-fade-in-up delay-100">
        {/* Search */}
        <div className="mb-6">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl max-w-md"
            style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}
          >
            <Search size={18} style={{ color: "var(--brand-muted)" }} />
            <input
              type="text"
              placeholder="Search users by name, email, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm focus:outline-none"
              style={{ color: "var(--brand-text)" }}
            />
          </div>
        </div>

        {/* Users Table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--brand-border)" }}>
                <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>Name</th>
                <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>Email</th>
                <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>Role</th>
                <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>Status</th>
                <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>Joined</th>
                <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>Last Login</th>
                <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--brand-muted)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12" style={{ color: "var(--brand-muted)" }}>
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleStyle = ROLE_STYLES[user.role] || ROLE_STYLES.CUSTOMER;
                  return (
                    <tr
                      key={user.id}
                      className="transition-colors"
                      style={{ borderBottom: "1px solid var(--brand-border)" }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: roleStyle.bg, color: roleStyle.text }}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>
                            {user.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Mail size={14} style={{ color: "var(--brand-muted)" }} />
                          <span className="text-sm" style={{ color: "var(--brand-muted)" }}>{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            disabled={actionLoading === user.id}
                            className="appearance-none px-3 py-1.5 pr-8 rounded-lg text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 disabled:opacity-50"
                            style={{
                              backgroundColor: roleStyle.bg,
                              color: roleStyle.text,
                              border: `1px solid ${roleStyle.text}30`,
                            }}
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="STAFF">STAFF</option>
                            <option value="CUSTOMER">CUSTOMER</option>
                          </select>
                          <ChevronDown
                            size={12}
                            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ color: roleStyle.text }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.status === "BANNED" ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: "color-mix(in srgb, var(--brand-danger) 20%, transparent)",
                              color: "var(--brand-danger)",
                            }}
                          >
                            <Ban size={12} />
                            Banned
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: "color-mix(in srgb, var(--brand-success) 20%, transparent)",
                              color: "var(--brand-success)",
                            }}
                          >
                            <CheckCircle size={12} />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <CalendarDays size={14} style={{ color: "var(--brand-muted)" }} />
                          <span className="text-sm" style={{ color: "var(--brand-muted)" }}>
                            {formatDate(user.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Clock size={14} style={{ color: "var(--brand-muted)" }} />
                          <span className="text-sm" style={{ color: "var(--brand-muted)" }}>
                            {formatDate(user.lastLoginAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleBanToggle(user.id, user.status)}
                          disabled={actionLoading === user.id}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                          style={{
                            backgroundColor: user.status === "BANNED"
                              ? "color-mix(in srgb, var(--brand-success) 20%, transparent)"
                              : "color-mix(in srgb, var(--brand-danger) 20%, transparent)",
                            color: user.status === "BANNED" ? "var(--brand-success)" : "var(--brand-danger)",
                            border: `1px solid ${user.status === "BANNED" ? "var(--brand-success)" : "var(--brand-danger)"}30`,
                          }}
                        >
                          {user.status === "BANNED" ? <UserCheck size={14} /> : <UserX size={14} />}
                          {user.status === "BANNED" ? "Unban" : "Ban"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
