"use client"

import { useState } from "react"
import { HelpCircle, Send, Loader2, ChevronDown } from "lucide-react"

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
    <div className="p-5 md:p-6 max-w-[800px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[17px] font-semibold" style={{ color: "var(--brand-text)" }}>Support</h1>
        <p className="text-[12px] mt-0.5" style={{ color: "var(--brand-muted)" }}>Get help with your servers</p>
      </div>

      {/* FAQs */}
      <div className="rounded-xl mb-5" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--brand-border)" }}>
          <HelpCircle size={14} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
          <h2 className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>FAQ</h2>
        </div>
        <div>
          {faqs.map((faq, i) => (
            <details key={i} className="group" style={{ borderBottom: i < faqs.length - 1 ? "1px solid var(--brand-border)" : undefined }}>
              <summary className="px-4 py-3 cursor-pointer text-[12px] font-medium list-none flex items-center justify-between hover:bg-white/[0.02] transition-colors" style={{ color: "var(--brand-text)" }}>
                {faq.q}
                <ChevronDown size={14} strokeWidth={1.5} className="transition-transform group-open:rotate-180" style={{ color: "var(--brand-muted)" }} />
              </summary>
              <p className="px-4 pb-3 text-[12px] leading-relaxed" style={{ color: "var(--brand-muted)" }}>{faq.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--brand-border)" }}>
          <Send size={14} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
          <h2 className="text-[13px] font-medium" style={{ color: "var(--brand-text)" }}>Contact Support</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--brand-muted)" }}>Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input text-[13px]" placeholder="How can we help?" required />
          </div>
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--brand-muted)" }}>Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="input text-[13px] min-h-[100px] resize-none" placeholder="Describe your issue..." required />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={sending} className="btn-primary text-[12px] disabled:opacity-40">
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} /> : <Send className="w-3.5 h-3.5" strokeWidth={2} />} Send Message
            </button>
            {sent && <span className="text-[11px] font-medium" style={{ color: "var(--brand-text)" }}>Message sent!</span>}
          </div>
        </form>
      </div>
    </div>
  )
}
