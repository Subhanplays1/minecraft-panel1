"use client"

import { useParams } from "next/navigation"
import { Link2, Clock, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function SFTPPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  return (
    <div className="p-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 animate-fade-in">
        <button onClick={() => router.push(`/servers/${id}`)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--brand-muted)" }}>
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--brand-text)" }}>
            <Link2 size={20} strokeWidth={1.5} /> SFTP Access
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--brand-muted)" }}>
            Connect via any SFTP client to manage your server files
          </p>
        </div>
      </div>

      {/* Coming Soon Card */}
      <div className="rounded-xl overflow-hidden animate-fade-in-up" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="p-10 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)" }}>
            <Clock size={28} strokeWidth={1.5} style={{ color: "var(--brand-muted)" }} />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--brand-text)" }}>Coming Soon</h2>
          <p className="text-[13px] max-w-md mx-auto leading-relaxed" style={{ color: "var(--brand-muted)" }}>
            SFTP access is currently under development. You&apos;ll soon be able to connect with FileZilla, WinSCP, Cyberduck, or any SFTP client to manage your server files directly.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="px-3 py-1.5 rounded-lg text-[11px] font-medium" style={{ backgroundColor: "var(--brand-background)", color: "var(--brand-muted)", border: "1px solid var(--brand-border)" }}>
              File Manager is available in the Files tab
            </div>
          </div>
        </div>
      </div>

      {/* Feature Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 animate-fade-in-up delay-100">
        {[
          { title: "Remote File Access", desc: "Connect from any SFTP client" },
          { title: "Full File Control", desc: "Upload, download, edit, delete" },
          { title: "Secure Connection", desc: "SSH encrypted transfer" },
        ].map((feature) => (
          <div key={feature.title} className="p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="text-[12px] font-semibold mb-1" style={{ color: "var(--brand-text)" }}>{feature.title}</div>
            <div className="text-[11px]" style={{ color: "var(--brand-muted)" }}>{feature.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
