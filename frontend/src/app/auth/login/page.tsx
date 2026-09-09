"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useBranding } from "@/components/BrandingProvider"
import { auth } from "@/lib/api"
import toast from "react-hot-toast"
import { Loader2, Eye, EyeOff } from "lucide-react"

declare global {
  interface Window {
    google?: any;
    googleSignIn?: (response: any) => void;
  }
}

export default function LoginPage() {
  const { settings } = useBranding()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState("")
  const [googleClientId, setGoogleClientId] = useState("")
  const [googleLoading, setGoogleLoading] = useState(false)

  const authBranding = settings?.auth as Record<string, string> | undefined
  const panelName = settings?.branding?.panelName || settings?.branding?.shortName || "Minevo"

  useEffect(() => {
    const gSettings = settings?.google as Record<string, string> | undefined
    const clientId = gSettings?.clientId
    if (clientId) {
      setGoogleClientId(clientId)
      const script = document.createElement("script")
      script.src = "https://accounts.google.com/gsi/client"
      script.async = true
      script.defer = true
      document.head.appendChild(script)
      window.googleSignIn = async (response: any) => {
        setGoogleLoading(true)
        try {
          const payload = JSON.parse(atob(response.credential.split(".")[1]))
          const res = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              idToken: response.credential,
              email: payload.email,
              name: payload.name,
              avatar: payload.picture,
              googleId: payload.sub,
            }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error)
          localStorage.setItem("token", data.token)
          localStorage.setItem("user", JSON.stringify(data.user))
          toast.success("Welcome!")
          window.location.href = "/dashboard"
        } catch (e: any) {
          toast.error(e.message || "Google sign-in failed")
        } finally {
          setGoogleLoading(false)
        }
      }
    }
  }, [settings])

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

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: "var(--brand-background)" }}>
      {/* Background glow */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, var(--brand-text), transparent 70%)" }} />
      <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full opacity-[0.02]" style={{ background: "radial-gradient(circle, var(--brand-text), transparent 70%)" }} />

      <div className="w-full max-w-[400px] px-5 relative z-10 animate-fade-in-up">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <img src="/logo.svg" alt={panelName} className="h-8 w-auto" />
          <span className="text-[14px] font-semibold tracking-tight" style={{ color: "var(--brand-text)" }}>{panelName}</span>
        </div>

        {/* Heading */}
        <h1 className="text-[22px] font-bold tracking-tight mb-1" style={{ color: "var(--brand-text)" }}>
          {authBranding?.loginTitle || "Welcome back"}
        </h1>
        <p className="text-[13px] mb-8" style={{ color: "var(--brand-muted)" }}>
          {authBranding?.loginDescription || "Sign in to manage your servers."}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Email */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--brand-muted)" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused("")}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 rounded-lg text-[13px] outline-none transition-all"
              style={{
                backgroundColor: "var(--brand-card)",
                border: `1px solid ${focused === "email" ? "var(--brand-text)" : "var(--brand-border)"}`,
                color: "var(--brand-text)",
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--brand-muted)" }}>Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused("")}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-[13px] outline-none transition-all"
                style={{
                  backgroundColor: "var(--brand-card)",
                  border: `1px solid ${focused === "password" ? "var(--brand-text)" : "var(--brand-border)"}`,
                  color: "var(--brand-text)",
                }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors hover:opacity-70"
                style={{ color: "var(--brand-muted)" }}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2 mt-2"
            style={{ backgroundColor: "var(--brand-text)", color: "var(--brand-background)" }}
          >
            {loading && <Loader2 className="animate-spin" size={15} />}
            {loading ? "Signing in..." : authBranding?.loginButtonText || "Sign In"}
          </button>
        </form>

        {googleClientId && (
          <>
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ backgroundColor: "var(--brand-border)" }} />
              <span className="text-[11px]" style={{ color: "var(--brand-muted)" }}>or</span>
              <div className="flex-1 h-px" style={{ backgroundColor: "var(--brand-border)" }} />
            </div>
            <div
              id="g_id_onload"
              data-client_id={googleClientId}
              data-callback="googleSignIn"
              data-auto_prompt="false"
            />
            <div
              className="g_id_signin"
              data-type="standard"
              data-size="large"
              data-theme="outline"
              data-text="sign_in_with"
              data-shape="rectangular"
              data-logo_alignment="left"
              style={{ width: "100%" }}
            />
            {googleLoading && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--brand-muted)" }} />
                <span className="text-[11px]" style={{ color: "var(--brand-muted)" }}>Signing in with Google...</span>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <p className="text-center text-[12px] mt-6" style={{ color: "var(--brand-muted)" }}>
          Don&apos;t have an account?{" "}
          <a href="/auth/register" className="font-medium hover:underline" style={{ color: "var(--brand-text)" }}>Create one</a>
        </p>

        {authBranding?.loginFooterText && (
          <p className="text-center text-[11px] mt-4" style={{ color: "var(--brand-muted)", opacity: 0.5 }}>
            {authBranding.loginFooterText}
          </p>
        )}
      </div>
    </div>
  )
}
