"use client";

import { useState, useEffect } from "react";
import {
  Webhook,
  Plus,
  Trash2,
  Play,
  Loader2,
  ExternalLink,
  Check,
  X,
} from "lucide-react";

interface WebhookItem {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  secret?: string;
}

const AVAILABLE_EVENTS = [
  "server.start",
  "server.stop",
  "server.crash",
  "server.create",
  "server.delete",
];

const eventBadgeColor = (event: string) => {
  switch (event) {
    case "server.start":
      return { bg: "rgba(34,197,94,0.12)", text: "#22c55e" };
    case "server.stop":
      return { bg: "rgba(239,68,68,0.12)", text: "#ef4444" };
    case "server.crash":
      return { bg: "rgba(249,115,22,0.12)", text: "#f97316" };
    case "server.create":
      return { bg: "rgba(59,130,246,0.12)", text: "#3b82f6" };
    case "server.delete":
      return { bg: "rgba(168,85,247,0.12)", text: "#a855f7" };
    default:
      return { bg: "rgba(148,163,184,0.12)", text: "#94a3b8" };
  }
};

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    url: "",
    events: [] as string[],
    secret: "",
    enabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    id: string;
    ok: boolean;
  } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(
    null
  );

  const getAuthHeaders = () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token")
        : null;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.admin && !d.isAdmin) {
          window.location.href = "/dashboard";
          return;
        }
        fetchWebhooks();
      })
      .catch(() => {
        window.location.href = "/login";
      });
  }, []);

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/webhooks", {
        headers: getAuthHeaders(),
      });
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      setWebhooks(Array.isArray(data) ? data : data.webhooks ?? []);
    } catch {
      setWebhooks([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ url: "", events: [], secret: "", enabled: true });
    setShowModal(true);
  };

  const openEdit = (wh: WebhookItem) => {
    setEditingId(wh.id);
    setForm({
      url: wh.url,
      events: [...wh.events],
      secret: wh.secret ?? "",
      enabled: wh.enabled,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm({ url: "", events: [], secret: "", enabled: true });
  };

  const toggleEvent = (event: string) => {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const handleSubmit = async () => {
    if (!form.url || form.events.length === 0) return;
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `/api/webhooks/${editingId}`
        : "/api/webhooks";
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });
      if (res.ok) {
        closeModal();
        fetchWebhooks();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/webhooks/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      setDeleteConfirmId(null);
      fetchWebhooks();
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await fetch(`/api/webhooks/${id}/test`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      setTestResult({ id, ok: res.ok });
      setTimeout(() => setTestResult(null), 4000);
    } catch {
      setTestResult({ id, ok: false });
      setTimeout(() => setTestResult(null), 4000);
    } finally {
      setTestingId(null);
    }
  };

  const truncateUrl = (url: string) =>
    url.length > 50 ? url.slice(0, 47) + "..." : url;

  return (
    <div
      style={{
        background: "var(--brand-background)",
        minHeight: "100vh",
        color: "var(--brand-text)",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "2rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Webhook size={28} />
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                margin: 0,
                color: "var(--brand-text)",
              }}
            >
              Webhooks
            </h1>
          </div>
          <button
            onClick={openCreate}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid var(--brand-border)",
              background: "var(--brand-card)",
              color: "var(--brand-text)",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            <Plus size={16} /> New Webhook
          </button>
        </div>

        {/* Webhook list */}
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "4rem 0",
            }}
          >
            <Loader2
              size={32}
              className="animate-spin"
              style={{ color: "var(--brand-muted)" }}
            />
          </div>
        ) : webhooks.length === 0 ? (
          <div
            style={{
              background: "var(--brand-card)",
              border: "1px solid var(--brand-border)",
              borderRadius: 12,
              padding: "3rem 2rem",
              textAlign: "center",
              color: "var(--brand-muted)",
            }}
          >
            <Webhook size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
            <p style={{ margin: 0 }}>No webhooks configured yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                style={{
                  background: "var(--brand-card)",
                  border: "1px solid var(--brand-border)",
                  borderRadius: 12,
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {/* Top row: URL + enabled toggle */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <span
                      title={wh.url}
                      style={{
                        fontFamily: "monospace",
                        fontSize: 14,
                        color: "var(--brand-text)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {truncateUrl(wh.url)}
                    </span>
                    <a
                      href={wh.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--brand-muted)", flexShrink: 0 }}
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        background: wh.enabled
                          ? "rgba(34,197,94,0.15)"
                          : "rgba(239,68,68,0.15)",
                        color: wh.enabled ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {wh.enabled ? (
                        <Check size={12} />
                      ) : (
                        <X size={12} />
                      )}
                      {wh.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>

                {/* Events badges */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {wh.events.map((evt) => {
                    const c = eventBadgeColor(evt);
                    return (
                      <span
                        key={evt}
                        style={{
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          fontFamily: "monospace",
                          background: c.bg,
                          color: c.text,
                        }}
                      >
                        {evt}
                      </span>
                    );
                  })}
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <button
                    onClick={() => handleTest(wh.id)}
                    disabled={testingId === wh.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 6,
                      border: "1px solid var(--brand-border)",
                      background: "transparent",
                      color: "var(--brand-text)",
                      cursor:
                        testingId === wh.id ? "not-allowed" : "pointer",
                      fontSize: 13,
                      opacity: testingId === wh.id ? 0.6 : 1,
                    }}
                  >
                    {testingId === wh.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Play size={14} />
                    )}
                    Test
                  </button>

                  {testResult && testResult.id === wh.id && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: testResult.ok ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {testResult.ok ? "Success" : "Failed"}
                    </span>
                  )}

                  <button
                    onClick={() => openEdit(wh)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 6,
                      border: "1px solid var(--brand-border)",
                      background: "transparent",
                      color: "var(--brand-text)",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    Edit
                  </button>

                  {deleteConfirmId === wh.id ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span style={{ fontSize: 12, color: "#ef4444" }}>
                        Delete?
                      </span>
                      <button
                        onClick={() => handleDelete(wh.id)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 4,
                          border: "none",
                          background: "#ef4444",
                          color: "#fff",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 4,
                          border: "1px solid var(--brand-border)",
                          background: "transparent",
                          color: "var(--brand-text)",
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(wh.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 14px",
                        borderRadius: 6,
                        border: "1px solid rgba(239,68,68,0.3)",
                        background: "transparent",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            style={{
              background: "var(--brand-card)",
              border: "1px solid var(--brand-border)",
              borderRadius: 12,
              padding: "1.5rem",
              width: "100%",
              maxWidth: 520,
              maxHeight: "90vh",
              overflow: "auto",
              color: "var(--brand-text)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.25rem",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.25rem",
                  fontWeight: 700,
                }}
              >
                {editingId ? "Edit Webhook" : "New Webhook"}
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--brand-muted)",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* URL */}
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--brand-muted)",
              }}
            >
              Webhook URL
            </label>
            <input
              type="text"
              value={form.url}
              onChange={(e) =>
                setForm((p) => ({ ...p, url: e.target.value }))
              }
              placeholder="https://example.com/webhook"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--brand-border)",
                background: "var(--brand-background)",
                color: "var(--brand-text)",
                fontSize: 14,
                outline: "none",
                marginBottom: 20,
                boxSizing: "border-box",
              }}
            />

            {/* Events */}
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--brand-muted)",
              }}
            >
              Events
            </label>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 20,
              }}
            >
              {AVAILABLE_EVENTS.map((evt) => (
                <label
                  key={evt}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.events.includes(evt)}
                    onChange={() => toggleEvent(evt)}
                    style={{
                      accentColor: "#8b5cf6",
                      width: 16,
                      height: 16,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "monospace",
                      color: "var(--brand-text)",
                    }}
                  >
                    {evt}
                  </span>
                </label>
              ))}
            </div>

            {/* Secret */}
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--brand-muted)",
              }}
            >
              Secret{" "}
              <span style={{ fontWeight: 400, opacity: 0.6 }}>
                (optional, for HMAC signing)
              </span>
            </label>
            <input
              type="text"
              value={form.secret}
              onChange={(e) =>
                setForm((p) => ({ ...p, secret: e.target.value }))
              }
              placeholder="your-secret-key"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--brand-border)",
                background: "var(--brand-background)",
                color: "var(--brand-text)",
                fontSize: 14,
                outline: "none",
                marginBottom: 20,
                boxSizing: "border-box",
              }}
            />

            {/* Enabled */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                marginBottom: 24,
                fontSize: 14,
              }}
            >
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    enabled: e.target.checked,
                  }))
                }
                style={{
                  accentColor: "#8b5cf6",
                  width: 16,
                  height: 16,
                }}
              />
              <span style={{ color: "var(--brand-text)" }}>Enabled</span>
            </label>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                onClick={closeModal}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "1px solid var(--brand-border)",
                  background: "transparent",
                  color: "var(--brand-text)",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  saving || !form.url || form.events.length === 0
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: "#8b5cf6",
                  color: "#fff",
                  cursor:
                    saving || !form.url || form.events.length === 0
                      ? "not-allowed"
                      : "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  opacity:
                    saving || !form.url || form.events.length === 0
                      ? 0.5
                      : 1,
                }}
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editingId ? "Save Changes" : "Create Webhook"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
