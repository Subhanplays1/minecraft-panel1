"use client";

import React, { useEffect, useState, useCallback } from "react";
import { branding as brandingApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon?: string;
  isVisible: boolean;
  sortOrder: number;
  locations: string[];
}

const PLATFORMS = ["Discord", "YouTube", "X", "Instagram", "Facebook", "TikTok", "GitHub", "Website"];

export default function SocialLinksPage() {
  const router = useRouter();
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SocialLink | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [form, setForm] = useState({ platform: "Discord", url: "", isVisible: true, locations: ["footer"] });

  useEffect(() => {
    const t = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!t || !user) { router.push("/auth/login"); return; }
    if (JSON.parse(user).role !== "ADMIN") { router.push("/dashboard"); return; }
    setToken(t);
  }, [router]);

  const load = useCallback(async () => {
    if (!token) return;
    try { setLinks(await brandingApi.getSocialLinks(token) as SocialLink[]); }
    catch { toast.error("Failed"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { if (token) load(); }, [token, load]);

  const handleSave = async () => {
    if (!token) return;
    try {
      if (editing) {
        await brandingApi.updateSocialLink(editing.id, form, token);
      } else {
        await brandingApi.createSocialLink({ ...form, sortOrder: links.length }, token);
      }
      toast.success("Saved");
      setShowForm(false);
      setEditing(null);
      load();
    } catch { toast.error("Failed"); }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm("Delete?")) return;
    try { await brandingApi.deleteSocialLink(id, token); load(); toast.success("Deleted"); }
    catch { toast.error("Failed"); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--brand-background)" }}><div className="animate-pulse" style={{ color: "var(--brand-muted)" }}>Loading...</div></div>;

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "var(--brand-background)" }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-text)" }}>Social Links</h1>
          <button onClick={() => { setShowForm(true); setEditing(null); setForm({ platform: "Discord", url: "", isVisible: true, locations: ["footer"] }); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: "var(--brand-primary)" }}>
            <Plus size={16} /> Add Link
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-4 rounded-xl space-y-3" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>{editing ? "Edit" : "Add"} Social Link</h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }} style={{ color: "var(--brand-muted)" }}><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}>
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="URL" className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm" style={{ color: "var(--brand-muted)" }}>
                <input type="checkbox" checked={form.isVisible} onChange={(e) => setForm({ ...form, isVisible: e.target.checked })} className="w-4 h-4 rounded" /> Visible
              </label>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: "var(--brand-primary)" }}><Save size={14} className="inline mr-1" /> Save</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {links.map((link) => (
            <div key={link.id} className="p-4 rounded-xl flex items-center justify-between" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>{link.platform}</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--brand-background)", color: "var(--brand-muted)" }}>{link.url}</span>
                {!link.isVisible && <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--brand-danger)20", color: "var(--brand-danger)" }}>Hidden</span>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setForm({ platform: link.platform, url: link.url, isVisible: link.isVisible, locations: link.locations }); setEditing(link); setShowForm(true); }} className="p-1.5 rounded hover:bg-white/5" style={{ color: "var(--brand-muted)" }}><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(link.id)} className="p-1.5 rounded hover:bg-white/5" style={{ color: "var(--brand-danger)" }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {links.length === 0 && <p className="text-center py-10" style={{ color: "var(--brand-muted)" }}>No social links configured</p>}
        </div>
      </div>
    </div>
  );
}
