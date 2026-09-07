"use client"

import { useState } from "react"
import { HelpCircle, MessageSquare, ExternalLink, Send, Loader2, Check } from "lucide-react"

export default function SupportPage() {
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const faqs = [
    { q: "How do I start my server?", a: "Go to Servers, select your server, and click the Start button." },
    { q: "How do I install plugins?", a: "Open your server, go to Plugins tab, search and click Install." },
    { q: "How do I upload files?", a: "Open your server, go to File Manager, and click the Upload button." },
    { q: "How do I change server settings?", a: "Open your server, go to Properties to edit server.properties, or Settings for panel settings." },
    { q: "How do I connect via SFTP?", a: "Open your server, go to SFTP Details for connection info. Use an SFTP client like FileZilla." },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setTimeout(() => { setSending(false); setSent(true); setSubject(""); setMessage(""); setTimeout(() => setSent(false), 3000) }, 1000)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 animate-fade-in">
        <h1 className="text-xl font-bold" style={{ color: "var(--brand-text)" }}>Support</h1>
        <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>Get help with your servers</p>
      </div>

      {/* FAQs */}
      <div className="rounded-xl p-6 mb-6 animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
          <h2 className="font-semibold" style={{ color: "var(--brand-text)" }}>Frequently Asked Questions</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <details key={i} className="group" style={{ borderBottom: i < faqs.length - 1 ? "1px solid var(--brand-border)" : undefined }}>
              <summary className="py-3 cursor-pointer text-sm font-medium list-none flex items-center justify-between" style={{ color: "var(--brand-text)" }}>
                {faq.q}
                <span className="text-xs" style={{ color: "var(--brand-muted)" }}>+</span>
              </summary>
              <p className="pb-3 text-sm" style={{ color: "var(--brand-muted)" }}>{faq.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Contact Form */}
      <div className="rounded-xl p-6 animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
          <h2 className="font-semibold" style={{ color: "var(--brand-text)" }}>Contact Support</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              placeholder="How can we help?"
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/40"
              style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
              placeholder="Describe your issue..."
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
              style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
            />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={sending} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover-lift disabled:opacity-50" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Message
            </button>
            {sent && <span className="text-sm text-green-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Message sent</span>}
          </div>
        </form>
      </div>
    </div>
  )
}
