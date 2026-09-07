"use client"

import { useEffect, useState } from "react"

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(t); return 100 }
        return p + Math.random() * 15 + 5
      })
    }, 100)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="loading-screen">
      <div className="loading-logo">
        <img src="/logo.svg" alt="Minevo" width="40" height="40" />
      </div>
      <div className="mt-6 text-lg font-semibold" style={{ color: "var(--brand-text)" }}>Minevo</div>
      <div className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>Loading your panel...</div>
      <div className="loading-bar mt-4">
        <div className="loading-bar-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
    </div>
  )
}
