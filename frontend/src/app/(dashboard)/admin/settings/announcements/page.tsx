"use client";

import React, { useEffect, useState, useCallback } from "react";
import { branding as brandingApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  locations: string[];
  isVisible: boolean;
  isDismissible: boolean;
  startDate?: string;
  endDate?: string;
}

export default function AnnouncementsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [form, setForm] = useState({ title: "", content: "", type: "INFO", locations: ["dashboard"], isDismissible: true, isVisible: true });

  useEffect(() => {
    const t = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!t || !user) { router.push("/auth/login"); return; }
    if (JSON.parse(user).role !== "ADMIN") { router.push("/dashboard"); return; }
    setToken(t);
  }, [router]);

  const load = useCallback(async () => {
    if (!token) return;
    try { setItems((await brandingApi.getAnnouncements(token)) as unknown as Announcement[]); }
    catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { if (token) load(); }, [token, load]);

  const handleSave = async () => {
    if (!token) return;
    try {
      if (editing) {
        await brandingApi.updateAnnouncement(editing.id, form, token);
      } else {
        await brandingApi.createAnnouncement(form, token);
      }
      toast.success("Saved");
      setShowForm(false);
      setEditing(null);
      load();
    } catch { toast.error("Failed to save"); }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm("Delete?")) return;
    try { await brandingApi.deleteAnnouncement(id, token); load(); toast.success("Deleted"); }
    catch { toast.error("Failed"); }
  };

  const startEdit = (item: Announcement) => {
    setForm({ title: item.title, content: item.content, type: item.type, locations: item.locations, isDismissible: item.isDismissible, isVisible: item.isVisible });
    setEditing(item);
    setShowForm(true);
  };

  const TYPE_COLORS: Record<string, string> = { INFO: "var(--brand-info)", SUCCESS: "var(--brand-success)", WARNING: "var(--brand-warning)", MAINTENANCE: "var(--brand-danger)", PROMOTION: "var(--brand-accent)" };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--brand-background)" }}><div className="animate-pulse" style={{ color: "var(--brand-muted)" }}>Loading...</div></div>;

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "var(--brand-background)" }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-text)" }}>Announcements</h1>
          <button onClick={() => { setShowForm(true); setEditing(null); setForm({ title: "", content: "", type: "INFO", locations: ["dashboard"], isDismissible: true, isVisible: true }); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: "var(--brand-primary)" }}>
            <Plus size={16} /> New
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-4 rounded-xl space-y-3" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>{editing ? "Edit" : "New"} Announcement</h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }} style={{ color: "var(--brand-muted)" }}><X size={16} /></button>
            </div>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Content" className="w-full px-3 py-2 rounded-lg text-sm h-20 resize-none" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
            <div className="flex gap-3">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}>
                {["INFO", "SUCCESS", "WARNING", "MAINTENANCE", "PROMOTION"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: "var(--brand-primary)" }}>
                <Save size={14} className="inline mr-1" /> Save
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[item.type] + "20", color: TYPE_COLORS[item.type] }}>{item.type}</span>
                    <span className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>{item.title}</span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--brand-muted)" }}>{item.content}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(item)} className="p-1.5 rounded hover:bg-white/5" style={{ color: "var(--brand-muted)" }}><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-white/5" style={{ color: "var(--brand-danger)" }}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-center py-10" style={{ color: "var(--brand-muted)" }}>No announcements yet</p>}
        </div>
      </div>
    </div>
  );
}
