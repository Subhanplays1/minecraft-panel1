"use client"

import React, { useState } from "react"
import { useBranding } from "@/components/BrandingProvider"
import { auth } from "@/lib/api"
import toast from "react-hot-toast"
import { Loader2, Eye, EyeOff, Mail, Lock, User, ArrowRight, Check } from "lucide-react"

export default function RegisterPage() {
  const { settings } = useBranding()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const authBranding = settings?.auth as Record<string, string> | undefined

  if (authBranding?.registerEnabled === "false") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--brand-background)" }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--brand-text)" }}>Registration Disabled</h1>
          <p style={{ color: "var(--brand-muted)" }}>Account registration is currently disabled.</p>
          <a href="/auth/login" className="mt-4 inline-block text-sm hover:underline" style={{ color: "var(--brand-text)" }}>Go to Login</a>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { token, user } = await auth.register({ email, password, name })
      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(user))
      toast.success(authBranding?.registerSuccessMessage || "Account created!")
      window.location.href = "/dashboard"
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const panelName = settings?.branding?.panelName || settings?.branding?.shortName || "Minevo"
  const passwordChecks = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains a number", met: /\d/.test(password) },
    { label: "Contains a letter", met: /[a-zA-Z]/.test(password) },
  ]

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--brand-background)" }}>
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center" style={{ backgroundColor: "var(--brand-card)" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.03) 0%, transparent 70%)" }} />
        <div className="relative z-10 max-w-md px-12">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8" style={{ backgroundColor: "var(--brand-background)", border: "1px solid var(--brand-border)" }}>
            <span className="text-xl font-bold" style={{ color: "var(--brand-text)" }}>{panelName[0]}</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight mb-4" style={{ color: "var(--brand-text)" }}>
            {authBranding?.registerTitle || "Create an account"}
          </h1>
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--brand-muted)" }}>
            {authBranding?.registerDescription || "Get started with your server."}
          </p>
          <div className="mt-10 space-y-3">
            {["Instant server setup", "Full file manager access", "Plugin installer built-in", "24/7 server uptime"].map((feature) => (
              <div key={feature} className="flex items-center gap-2.5 text-[13px]" style={{ color: "var(--brand-muted)" }}>
                <Check size={14} strokeWidth={2} style={{ color: "var(--brand-text)" }} />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[380px] animate-fade-in-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
              <span className="text-sm font-bold" style={{ color: "var(--brand-text)" }}>{panelName[0]}</span>
            </div>
            <span className="text-[15px] font-semibold" style={{ color: "var(--brand-text)" }}>{panelName}</span>
          </div>

          <h2 className="text-xl font-bold mb-1" style={{ color: "var(--brand-text)" }}>
            {authBranding?.registerTitle || "Create an account"}
          </h2>
          <p className="text-[13px] mb-7" style={{ color: "var(--brand-muted)" }}>
            {authBranding?.registerDescription || "Get started with your server."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--brand-muted)", opacity: 0.5 }} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="input pl-10 py-2.5 text-[13px]"
                  placeholder="John Doe"
                  autoComplete="name"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--brand-muted)", opacity: 0.5 }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input pl-10 py-2.5 text-[13px]"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--brand-muted)", opacity: 0.5 }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="input pl-10 pr-10 py-2.5 text-[13px]"
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors hover:bg-white/5"
                  style={{ color: "var(--brand-muted)" }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {passwordChecks.map((check) => (
                    <div key={check.label} className="flex items-center gap-1.5 text-[10px]" style={{ color: check.met ? "#22C55E" : "var(--brand-muted)", opacity: check.met ? 1 : 0.5 }}>
                      <div className="w-1 h-1 rounded-full" style={{ backgroundColor: check.met ? "#22C55E" : "var(--brand-muted)" }} />
                      {check.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-medium text-[13px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-5"
              style={{ backgroundColor: "var(--brand-text)", color: "var(--brand-background)" }}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
              {loading ? "Creating account..." : authBranding?.registerButtonText || "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-[12px]" style={{ color: "var(--brand-muted)" }}>Already have an account? </span>
            <a href="/auth/login" className="text-[12px] font-medium hover:underline" style={{ color: "var(--brand-text)" }}>
              Sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
