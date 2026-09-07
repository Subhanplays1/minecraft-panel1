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
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      </div>
      <div className="mt-6 text-lg font-semibold" style={{ color: "var(--brand-text)" }}>Minevo</div>
      <div className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>Loading your panel...</div>
      <div className="loading-bar mt-4">
        <div className="loading-bar-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
    </div>
  )
}
