"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")

  useEffect(() => {
    if (!token) { setStatus("error"); return }
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then((r) => { setStatus(r.ok ? "success" : "error") }).catch(() => setStatus("error"))
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--brand-background)" }}>
      <div className="w-[380px] p-6 rounded-xl text-center" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        {status === "loading" && <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} />}
        {status === "success" && (
          <>
            <CheckCircle className="w-10 h-10 mx-auto text-green-500" strokeWidth={1.5} />
            <h1 className="text-[16px] font-semibold mt-3" style={{ color: "var(--brand-text)" }}>Email Verified</h1>
            <p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Your email has been verified successfully.</p>
            <Link href="/login" className="btn-primary text-[11px] py-2 px-4 inline-block mt-4">Go to Login</Link>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-10 h-10 mx-auto text-red-400" strokeWidth={1.5} />
            <h1 className="text-[16px] font-semibold mt-3" style={{ color: "var(--brand-text)" }}>Verification Failed</h1>
            <p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>This link is invalid or has expired.</p>
            <Link href="/login" className="btn-ghost text-[11px] py-2 px-4 inline-block mt-4">Go to Login</Link>
          </>
        )}
      </div>
    </div>
  )
}
