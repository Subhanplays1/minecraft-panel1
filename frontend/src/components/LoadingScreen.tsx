"use client"

import { useEffect, useState } from "react"

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0)
  const [dots, setDots] = useState("")

  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(t); return 100 }
        return p + Math.random() * 12 + 3
      })
    }, 120)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      setDots((d) => d.length >= 3 ? "" : d + ".")
    }, 400)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: "#080808" }}>
      <div className="flex flex-col items-center">
        <img src="/logo.svg" alt="Minevo" className="h-8 w-auto mb-5" style={{ opacity: 0.9 }} />
        <div className="text-[11px] font-medium tracking-widest uppercase" style={{ color: "#333" }}>
          Loading{dots}
        </div>
        <div className="mt-5 w-32 h-[2px] rounded-full overflow-hidden" style={{ backgroundColor: "#1a1a1a" }}>
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: "#333",
            }}
          />
        </div>
      </div>
    </div>
  )
}
