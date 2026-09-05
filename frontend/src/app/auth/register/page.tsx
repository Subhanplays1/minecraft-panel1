"use client";

import React, { useState } from "react";
import { useBranding } from "@/components/BrandingProvider";
import { auth } from "@/lib/api";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const { settings } = useBranding();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const authBranding = settings?.auth as Record<string, string> | undefined;

  if (authBranding?.registerEnabled === "false") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--brand-background)" }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--brand-text)" }}>Registration Disabled</h1>
          <p style={{ color: "var(--brand-muted)" }}>Account registration is currently disabled.</p>
          <a href="/auth/login" className="mt-4 inline-block text-sm hover:underline" style={{ color: "var(--brand-primary)" }}>
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  const bgStyle: React.CSSProperties = {};

  if (authBranding?.registerBgType === "gradient") {
    bgStyle.background = authBranding.registerBgGradient || `linear-gradient(135deg, ${settings?.branding.primaryColor}, ${settings?.branding.accentColor})`;
  } else if (authBranding?.registerBgType === "image" && authBranding?.registerBgImage) {
    bgStyle.backgroundImage = `url(/${authBranding.registerBgImage})`;
    bgStyle.backgroundSize = "cover";
    bgStyle.backgroundPosition = "center";
  } else {
    bgStyle.backgroundColor = authBranding?.registerBgColor || settings?.branding.backgroundColor || "#09090B";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { token, user } = await auth.register({ email, password, name });
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      toast.success(authBranding?.registerSuccessMessage || "Account created!");
      window.location.href = "/dashboard";
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

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
            {authBranding?.registerLogo || settings?.branding.mainLogo ? (
              <img
                src={`/${authBranding?.registerLogo || settings?.branding.mainLogo}`}
                alt="Logo"
                className="h-12 object-contain"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
                style={{ backgroundColor: "var(--brand-primary)", color: "white" }}
              >
                {(settings?.branding.shortName || settings?.branding.panelName || "MC")[0]}
              </div>
            )}
          </div>

          <h1
            className="text-2xl font-bold text-center mb-2"
            style={{ color: "var(--brand-text)", fontFamily: "var(--font-heading)" }}
          >
            {authBranding?.registerTitle || "Create an account"}
          </h1>
          <p className="text-center mb-6" style={{ color: "var(--brand-muted)" }}>
            {authBranding?.registerDescription || "Get started with your server."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors"
                style={{
                  backgroundColor: "var(--brand-background)",
                  border: "1px solid var(--brand-border)",
                  color: "var(--brand-text)",
                }}
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Email</label>
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
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--brand-muted)" }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors"
                style={{
                  backgroundColor: "var(--brand-background)",
                  border: "1px solid var(--brand-border)",
                  color: "var(--brand-text)",
                }}
                placeholder="Min. 8 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-medium text-white text-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              {authBranding?.registerButtonText || "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/auth/login" className="text-sm hover:underline" style={{ color: "var(--brand-primary)" }}>
              Already have an account? Sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
