"use client"

import { useBranding } from "@/components/BrandingProvider"
import { ShoppingCart, Check, Star, Zap, Crown } from "lucide-react"

interface Plan {
  id: string
  name: string
  price: number
  period: string
  features: string[]
  badge?: string
  badgeColor?: string
  recommended?: boolean
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 2.99,
    period: "/mo",
    features: [
      "1 GB RAM",
      "10 GB SSD Storage",
      "10 Player Slots",
      "Shared CPU",
      "Basic DDoS Protection",
      "Automatic Backups",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 5.99,
    period: "/mo",
    features: [
      "4 GB RAM",
      "40 GB SSD Storage",
      "50 Player Slots",
      "Dedicated CPU Core",
      "Advanced DDoS Protection",
      "Daily Backups",
      "Priority Support",
      "Custom JAR Upload",
    ],
    badge: "Popular",
    badgeColor: "bg-blue-500",
    recommended: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 9.99,
    period: "/mo",
    features: [
      "16 GB RAM",
      "100 GB NVMe Storage",
      "Unlimited Player Slots",
      "4 Dedicated CPU Cores",
      "Enterprise DDoS Protection",
      "Hourly Backups",
      "24/7 Priority Support",
      "Custom JAR Upload",
      "Dedicated IP Address",
      "MySQL Database",
    ],
    badge: "Best Value",
    badgeColor: "bg-purple-500",
  },
]

export default function StorePage() {
  const branding = useBranding()

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "var(--brand-bg)", color: "var(--brand-text)" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2" style={{ color: "var(--brand-text)" }}>
            <ShoppingCart className="w-8 h-8" style={{ color: "var(--brand-primary)" }} />
            Server Hosting
          </h1>
          <p style={{ color: "var(--brand-text)", opacity: 0.7 }}>Choose the perfect plan for your Minecraft server</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className="rounded-xl p-6 relative flex flex-col"
              style={{
                backgroundColor: "var(--brand-card)",
                border: plan.recommended ? `2px solid var(--brand-primary)` : `1px solid var(--brand-border)`,
              }}
            >
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white ${plan.badgeColor}`}>
                  {plan.badge}
                </div>
              )}

              <div className="text-center mb-6">
                {plan.recommended ? (
                  <Crown className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--brand-primary)" }} />
                ) : plan.id === "enterprise" ? (
                  <Zap className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--brand-primary)" }} />
                ) : (
                  <Star className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--brand-primary)" }} />
                )}
                <h2 className="text-xl font-bold" style={{ color: "var(--brand-text)" }}>{plan.name}</h2>
                <div className="mt-2">
                  <span className="text-3xl font-bold" style={{ color: "var(--brand-text)" }}>${plan.price}</span>
                  <span className="text-sm" style={{ color: "var(--brand-text)", opacity: 0.5 }}>{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--brand-primary)" }} />
                    <span style={{ color: "var(--brand-text)", opacity: 0.8 }}>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className="w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                style={{
                  backgroundColor: plan.recommended ? "var(--brand-primary)" : "transparent",
                  color: plan.recommended ? "#fff" : "var(--brand-text)",
                  border: plan.recommended ? "none" : "1px solid var(--brand-border)",
                }}
              >
                Order Now
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
