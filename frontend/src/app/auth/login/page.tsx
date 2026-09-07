"use client"

import React, { useState } from "react"
import { useBranding } from "@/components/BrandingProvider"
import { auth } from "@/lib/api"
import toast from "react-hot-toast"
import { Loader2, Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react"

export default function LoginPage() {
  const { settings } = useBranding()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const authBranding = settings?.auth as Record<string, string> | undefined

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { token, user } = await auth.login(email, password)
      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(user))
      toast.success("Welcome back!")
      window.location.href = "/dashboard"
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const panelName = settings?.branding?.panelName || settings?.branding?.shortName || "Minevo"

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
            {authBranding?.loginTitle || "Welcome back"}
          </h1>
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--brand-muted)" }}>
            {authBranding?.loginDescription || "Sign in to manage your Minecraft servers, monitor performance, and configure everything from one place."}
          </p>
          <div className="mt-10 flex items-center gap-6 text-[12px]" style={{ color: "var(--brand-muted)" }}>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#22C55E" }} />
              All systems operational
            </div>
            <div>{settings?.branding?.copyrightText || `&copy; ${new Date().getFullYear()} ${panelName}`}</div>
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

          <h2 className="text-xl font-bold mb-1" style={{ color: "var(--brand-text)" }}>Sign in</h2>
          <p className="text-[13px] mb-7" style={{ color: "var(--brand-muted)" }}>Enter your credentials to access your account</p>

          <form onSubmit={handleSubmit} className="space-y-3.5">
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
                  className="input pl-10 pr-10 py-2.5 text-[13px]"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors hover:bg-white/5"
                  style={{ color: "var(--brand-muted)" }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-medium text-[13px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-5"
              style={{ backgroundColor: "var(--brand-text)", color: "var(--brand-background)" }}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
              {loading ? "Signing in..." : authBranding?.loginButtonText || "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-[12px]" style={{ color: "var(--brand-muted)" }}>Don&apos;t have an account? </span>
            <a href="/auth/register" className="text-[12px] font-medium hover:underline" style={{ color: "var(--brand-text)" }}>
              Create account
            </a>
          </div>

          {authBranding?.loginFooterText && (
            <p className="text-center text-[11px] mt-4" style={{ color: "var(--brand-muted)", opacity: 0.6 }}>
              {authBranding.loginFooterText}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
