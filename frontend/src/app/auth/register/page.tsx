"use client"

import React, { useState, useEffect } from "react"
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

export default function RegisterPage() {
  const { settings } = useBranding()
  const [name, setName] = useState("")
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

  if (authBranding?.registerEnabled === "false") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--brand-background)" }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--brand-text)" }}>Registration Disabled</h1>
          <p style={{ color: "var(--brand-muted)" }}>Account registration is currently disabled.</p>
          <a href="/auth/login" className="mt-4 inline-block text-[13px] font-medium hover:underline" style={{ color: "var(--brand-text)" }}>Go to Login</a>
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

  const pw = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "A number", met: /\d/.test(password) },
    { label: "A letter", met: /[a-zA-Z]/.test(password) },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: "var(--brand-background)" }}>
      {/* Background glow */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, var(--brand-text), transparent 70%)" }} />
      <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full opacity-[0.02]" style={{ background: "radial-gradient(circle, var(--brand-text), transparent 70%)" }} />

      <div className="w-full max-w-[400px] px-5 relative z-10 animate-fade-in-up">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <img src="/logo.svg" alt={panelName} className="h-8 w-auto" />
          <span className="text-[14px] font-semibold tracking-tight" style={{ color: "var(--brand-text)" }}>{panelName}</span>
        </div>

        {/* Heading */}
        <h1 className="text-[22px] font-bold tracking-tight mb-1" style={{ color: "var(--brand-text)" }}>
          {authBranding?.registerTitle || "Create an account"}
        </h1>
        <p className="text-[13px] mb-8" style={{ color: "var(--brand-muted)" }}>
          {authBranding?.registerDescription || "Get started with your server."}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--brand-muted)" }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocused("name")}
              onBlur={() => setFocused("")}
              required
              autoComplete="name"
              placeholder="Your name"
              className="w-full px-3.5 py-2.5 rounded-lg text-[13px] outline-none transition-all"
              style={{
                backgroundColor: "var(--brand-card)",
                border: `1px solid ${focused === "name" ? "var(--brand-text)" : "var(--brand-border)"}`,
                color: "var(--brand-text)",
              }}
            />
          </div>

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
                minLength={8}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
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
            {password.length > 0 && (
              <div className="flex gap-3 mt-2">
                {pw.map((c) => (
                  <div key={c.label} className="flex items-center gap-1 text-[10px]" style={{ color: c.met ? "#22C55E" : "var(--brand-muted)", opacity: c.met ? 1 : 0.4 }}>
                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: c.met ? "#22C55E" : "var(--brand-muted)" }} />
                    {c.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2 mt-2"
            style={{ backgroundColor: "var(--brand-text)", color: "var(--brand-background)" }}
          >
            {loading && <Loader2 className="animate-spin" size={15} />}
            {loading ? "Creating account..." : authBranding?.registerButtonText || "Create Account"}
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
              data-text="sign_up_with"
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
          Already have an account?{" "}
          <a href="/auth/login" className="font-medium hover:underline" style={{ color: "var(--brand-text)" }}>Sign in</a>
        </p>
      </div>
    </div>
  )
}
