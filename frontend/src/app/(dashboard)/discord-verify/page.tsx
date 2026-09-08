"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, CheckCircle, AlertCircle, MessageSquare, Copy, Check, Clock } from "lucide-react";
import { discord } from "@/lib/api";
import { useBranding } from "@/components/BrandingProvider";
import toast from "react-hot-toast";

export default function DiscordVerifyPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { settings } = useBranding();
  const [step, setStep] = useState<"loading" | "generate" | "verify" | "success">("loading");
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [checking, setChecking] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);

  const panelName = settings?.branding?.panelName || "Minevo";
  const primaryColor = settings?.branding?.primaryColor || "#6366F1";

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  const checkVerificationStatus = async () => {
    try {
      const res = await discord.checkVerification();
      if (res.verified) {
        setAlreadyVerified(true);
        setStep("success");
        setTimeout(() => {
          const redirect = new URLSearchParams(window.location.search).get("redirect");
          router.push(redirect || "/servers");
        }, 2000);
        return;
      }
      setStep("generate");
    } catch {
      setStep("generate");
    }
  };

  const generateCode = async () => {
    try {
      const res = await discord.generateVerification();
      if (res.alreadyVerified) {
        setAlreadyVerified(true);
        setStep("success");
        return;
      }
      setCode(res.code);
      setExpiresAt(res.expiresAt);
      setCountdown(Math.floor((new Date(res.expiresAt).getTime() - Date.now()) / 1000));
      setStep("verify");
      await discord.sendVerificationDM();
      toast.success("Verification code sent to your Discord DM!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate code");
    }
  };

  const checkCode = async () => {
    setChecking(true);
    try {
      const res = await discord.checkVerification();
      if (res.verified) {
        setAlreadyVerified(true);
        setStep("success");
        toast.success("Verification successful!");
        setTimeout(() => {
          const redirect = new URLSearchParams(window.location.search).get("redirect");
          router.push(redirect || "/servers");
        }, 2000);
      } else {
        toast.error("Not verified yet. Use !verify CODE in Discord DM.");
      }
    } catch {
      toast.error("Failed to check verification");
    } finally {
      setChecking(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--brand-background)" }}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: primaryColor }} />
          <p style={{ color: "var(--brand-muted)" }}>Checking verification status...</p>
        </div>
      </div>
    );
  }

  if (alreadyVerified || step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--brand-background)" }}>
        <div className="max-w-md w-full mx-4 p-8 rounded-2xl text-center" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
          <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(34,197,94,0.15)" }}>
            <CheckCircle className="w-8 h-8" style={{ color: "#22C55E" }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--brand-text)" }}>Verification Complete</h2>
          <p className="text-sm mb-6" style={{ color: "var(--brand-muted)" }}>
            Your Discord account is linked. Redirecting...
          </p>
          <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: primaryColor }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--brand-background)" }}>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(99,102,241,0.15)" }}>
            <MessageSquare className="w-7 h-7" style={{ color: primaryColor }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--brand-text)" }}>Discord Verification</h1>
          <p className="text-sm" style={{ color: "var(--brand-muted)" }}>
            Verify your Discord account to create servers on {panelName}
          </p>
        </div>

        {step === "generate" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
              <p className="text-sm mb-3" style={{ color: "var(--brand-muted)" }}>
                Click below to generate a one-time verification code
              </p>
              <button
                onClick={generateCode}
                className="w-full py-3 rounded-lg font-medium transition-all"
                style={{ backgroundColor: primaryColor, color: "#080808" }}
              >
                Generate Verification Code
              </button>
            </div>
            <p className="text-xs text-center" style={{ color: "var(--brand-muted)" }}>
              You'll receive the code via Discord DM from the Minevo bot
            </p>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium" style={{ color: "var(--brand-muted)" }}>Your Code</span>
                <span className="text-xs font-mono" style={{ color: primaryColor }}>
                  {formatTime(countdown)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 text-center py-4 rounded-lg font-mono text-2xl tracking-widest" style={{
                  backgroundColor: "var(--brand-background)",
                  border: "2px solid",
                  borderColor: primaryColor,
                  color: primaryColor
                }}>
                  {code.match(/.{1,2}/g)?.join(" ") || code}
                </div>
                <button onClick={copyCode} className="p-2 rounded-lg transition-colors" style={{
                  backgroundColor: "var(--brand-background)",
                  border: "1px solid var(--brand-border)",
                  color: "var(--brand-muted)"
                }} title="Copy">
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl" style={{ backgroundColor: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)" }}>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4" style={{ color: primaryColor }} />
                <span className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>How to verify</span>
              </div>
              <ol className="text-sm space-y-1" style={{ color: "var(--brand-muted)" }}>
                <li className="flex items-center gap-2"><span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: primaryColor, color: "#080808" }}>1</span> Open Discord and check your DMs from Minevo bot</li>
                <li className="flex items-center gap-2"><span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: primaryColor, color: "#080808" }}>2</span> Type <code className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: "var(--brand-background)" }}>`!verify {code}`</code></li>
                <li className="flex items-center gap-2"><span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: primaryColor, color: "#080808" }}>3</span> Click "Check Verification" below</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <button
                onClick={checkCode}
                disabled={checking}
                className="flex-1 py-3 rounded-lg font-medium transition-all disabled:opacity-50"
                style={{ backgroundColor: primaryColor, color: "#080808" }}
              >
                {checking ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Check Verification"}
              </button>
              <button
                onClick={generateCode}
                className="px-4 py-3 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
              >
                New Code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}