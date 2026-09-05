"use client";

import React, { useEffect, useState, useCallback } from "react";
import { branding as brandingApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Trash2, GripVertical, Edit2, Save, ArrowUp, ArrowDown } from "lucide-react";

interface NavItem {
  id: string;
  name: string;
  icon?: string;
  url: string;
  permission?: string;
  openNewTab: boolean;
  section: string;
  sortOrder: number;
  isVisible: boolean;
  isCustom: boolean;
}

const ICON_OPTIONS = ["LayoutDashboard", "Server", "ShoppingBag", "FolderOpen", "Puzzle", "Archive", "Users", "Network", "Settings", "Globe", "BookOpen", "MessageCircle", "ExternalLink"];

export default function NavigationPage() {
  const router = useRouter();
  const [items, setItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!t || !user) { router.push("/auth/login"); return; }
    if (JSON.parse(user).role !== "ADMIN") { router.push("/dashboard"); return; }
    setToken(t);
  }, [router]);

  const loadNav = useCallback(async () => {
    if (!token) return;
    try {
      const data = await brandingApi.getNavigation(token) as NavItem[];
      setItems(data);
    } catch {
      toast.error("Failed to load navigation");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (token) loadNav(); }, [token, loadNav]);

  const handleSave = async (item: NavItem) => {
    if (!token) return;
    try {
      await brandingApi.updateNavigation(item.id, item, token);
      toast.success("Saved");
      setEditing(null);
    } catch { toast.error("Failed to save"); }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm("Delete this navigation item?")) return;
    try {
      await brandingApi.deleteNavigation(id, token);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const handleAdd = async () => {
    if (!token) return;
    try {
      const newItem = await brandingApi.createNavigation({
        name: "New Item",
        url: "/new",
        icon: "Globe",
        section: "main",
        sortOrder: items.length,
        isCustom: true,
        isVisible: true,
        openNewTab: false,
      }, token) as NavItem;
      setItems((prev) => [...prev, newItem]);
      setEditing(newItem.id);
    } catch { toast.error("Failed to add"); }
  };

  const handleMove = async (id: string, direction: "up" | "down") => {
    if (!token) return;
    const idx = items.findIndex((i) => i.id === id);
    if ((direction === "up" && idx === 0) || (direction === "down" && idx === items.length - 1)) return;

    const newItems = [...items];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newItems[idx].sortOrder, newItems[swapIdx].sortOrder] = [newItems[swapIdx].sortOrder, newItems[idx].sortOrder];
    [newItems[idx], newItems[swapIdx]] = [newItems[swapIdx], newItems[idx]];

    setItems(newItems);
    try {
      await brandingApi.reorderNavigation(
        newItems.map((i, idx) => ({ id: i.id, sortOrder: idx })),
        token
      );
    } catch { toast.error("Failed to reorder"); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--brand-background)" }}><div className="animate-pulse" style={{ color: "var(--brand-muted)" }}>Loading...</div></div>;

  const mainItems = items.filter((i) => i.section === "main");
  const adminItems = items.filter((i) => i.section === "admin");

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "var(--brand-background)" }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-text)" }}>Navigation Editor</h1>
          <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: "var(--brand-primary)" }}>
            <Plus size={16} /> Add Item
          </button>
        </div>

        <Section title="Main Navigation">
          {mainItems.map((item, idx) => (
            <NavRow key={item.id} item={item} editing={editing === item.id} onEdit={() => setEditing(editing === item.id ? null : item.id)} onSave={() => handleSave(item)} onDelete={() => handleDelete(item.id)} onMove={handleMove} onUpdate={(data) => setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, ...data } : i))} canMoveUp={idx > 0} canMoveDown={idx < mainItems.length - 1} />
          ))}
        </Section>

        <Section title="Admin Navigation">
          {adminItems.map((item, idx) => (
            <NavRow key={item.id} item={item} editing={editing === item.id} onEdit={() => setEditing(editing === item.id ? null : item.id)} onSave={() => handleSave(item)} onDelete={() => handleDelete(item.id)} onMove={handleMove} onUpdate={(data) => setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, ...data } : i))} canMoveUp={idx > 0} canMoveDown={idx < adminItems.length - 1} />
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--brand-muted)" }}>{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function NavRow({ item, editing, onEdit, onSave, onDelete, onMove, onUpdate, canMoveUp, canMoveDown }: {
  item: NavItem; editing: boolean; onEdit: () => void; onSave: () => void; onDelete: () => void;
  onMove: (id: string, dir: "up" | "down") => void; onUpdate: (data: Partial<NavItem>) => void;
  canMoveUp: boolean; canMoveDown: boolean;
}) {
  return (
    <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
      <div className="flex items-center gap-3">
        <GripVertical size={16} style={{ color: "var(--brand-muted)" }} />
        <div className="flex-1">
          {editing ? (
            <div className="grid grid-cols-4 gap-2">
              <input value={item.name} onChange={(e) => onUpdate({ name: e.target.value })} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} placeholder="Name" />
              <input value={item.url} onChange={(e) => onUpdate({ url: e.target.value })} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }} placeholder="URL" />
              <select value={item.icon || ""} onChange={(e) => onUpdate({ icon: e.target.value })} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}>
                {ICON_OPTIONS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
              </select>
              <select value={item.section} onChange={(e) => onUpdate({ section: e.target.value })} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}>
                <option value="main">Main</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>{item.name}</span>
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--brand-background)", color: "var(--brand-muted)" }}>{item.url}</span>
              {item.icon && <span className="text-xs" style={{ color: "var(--brand-muted)" }}>{item.icon}</span>}
              <span className="text-xs px-2 py-0.5 rounded capitalize" style={{ backgroundColor: "var(--brand-primary)20", color: "var(--brand-primary)" }}>{item.section}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!editing && (
            <>
              <button onClick={() => onMove(item.id, "up")} disabled={!canMoveUp} className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30" style={{ color: "var(--brand-muted)" }}><ArrowUp size={14} /></button>
              <button onClick={() => onMove(item.id, "down")} disabled={!canMoveDown} className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30" style={{ color: "var(--brand-muted)" }}><ArrowDown size={14} /></button>
            </>
          )}
          <button onClick={editing ? onSave : onEdit} className="p-1.5 rounded hover:bg-white/5" style={{ color: editing ? "var(--brand-success)" : "var(--brand-muted)" }}>
            {editing ? <Save size={14} /> : <Edit2 size={14} />}
          </button>
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-white/5" style={{ color: "var(--brand-danger)" }}><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}
