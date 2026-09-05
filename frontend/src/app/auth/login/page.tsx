"use client";

import React, { useState } from "react";
import { useBranding } from "@/components/BrandingProvider";
import { auth } from "@/lib/api";
import toast from "react-hot-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { settings } = useBranding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const authBranding = settings?.auth as Record<string, string> | undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { token, user } = await auth.login(email, password);
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      toast.success("Welcome back!");
      window.location.href = "/dashboard";
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const bgStyle: React.CSSProperties = {};

  if (authBranding?.loginBgType === "gradient") {
    bgStyle.background = authBranding.loginBgGradient || `linear-gradient(135deg, ${settings?.branding.primaryColor}, ${settings?.branding.accentColor})`;
  } else if (authBranding?.loginBgType === "image" && authBranding?.loginBgImage) {
    bgStyle.backgroundImage = `url(/${authBranding.loginBgImage})`;
    bgStyle.backgroundSize = "cover";
    bgStyle.backgroundPosition = "center";
  } else {
    bgStyle.backgroundColor = authBranding?.loginBgColor || settings?.branding.backgroundColor || "#09090B";
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={bgStyle}>
      <div className="w-full max-w-md">
        <div
          className="rounded-2xl p-8 shadow-2xl backdrop-blur-sm animate-scale-in"
          style={{
            backgroundColor: "color-mix(in srgb, var(--brand-card) 90%, transparent)",
            border: "1px solid var(--brand-border)",
          }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-6">
            {authBranding?.loginLogo || settings?.branding.mainLogo ? (
              <img
                src={`/${authBranding?.loginLogo || settings?.branding.mainLogo}`}
                alt="Logo"
                className="h-12 object-contain"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold animate-float"
                style={{ backgroundColor: "var(--brand-primary)", color: "white" }}
              >
                {(settings?.branding.shortName || settings?.branding.panelName || "MC")[0]}
              </div>
            )}
          </div>

          {/* Title */}
          <h1
            className="text-2xl font-bold text-center mb-2"
            style={{ color: "var(--brand-text)", fontFamily: "var(--font-heading)" }}
          >
            {authBranding?.loginTitle || "Welcome back!"}
          </h1>
          <p className="text-center mb-6" style={{ color: "var(--brand-muted)" }}>
            {authBranding?.loginDescription || "Sign in to manage your servers."}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors"
                style={{
                  backgroundColor: "var(--brand-background)",
                  border: "1px solid var(--brand-border)",
                  color: "var(--brand-text)",
                }}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-10 rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors"
                  style={{
                    backgroundColor: "var(--brand-background)",
                    border: "1px solid var(--brand-border)",
                    color: "var(--brand-text)",
                  }}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--brand-muted)" }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-medium text-white text-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : null}
              {authBranding?.loginButtonText || "Sign In"}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: "var(--brand-muted)" }}>
              {authBranding?.loginFooterText || ""}
            </p>
          </div>

          {/* Register link */}
          <div className="mt-4 text-center">
            <a
              href="/auth/register"
              className="text-sm hover:underline"
              style={{ color: "var(--brand-primary)" }}
            >
              Don&apos;t have an account? Sign up
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
