"use client"

import { useEffect, useState, useRef } from "react"

const AD_BLOCKER_CHECK_URL = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"

export function AdBlockerProvider({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const script = document.createElement("script")
    script.src = AD_BLOCKER_CHECK_URL
    script.async = true
    script.onerror = () => { setBlocked(true); setChecking(false) }
    script.onload = () => { setBlocked(false); setChecking(false) }
    document.head.appendChild(script)

    const bait = document.createElement("div")
    bait.className = "adssense"
    bait.style.cssText = "position:absolute;top:-10px;left:-10px;width:1px;height:1px;"
    document.body.appendChild(bait)
    setTimeout(() => {
      if (bait.offsetHeight === 0 || getComputedStyle(bait).display === "none") {
        setBlocked(true)
      }
      bait.remove()
      setChecking(false)
    }, 1500)

    return () => { script.remove() }
  }, [])

  if (checking) return <>{children}</>

  if (blocked) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: "#0f0f0f" }}>
        <div className="max-w-md w-full mx-4 p-8 rounded-2xl text-center" style={{ backgroundColor: "#1a1a2e", border: "1px solid #e74c3c" }}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(231,76,60,0.15)" }}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#e74c3c" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Ad Blocker Detected</h2>
          <p className="text-gray-400 text-sm mb-6">
            This panel is supported by ads. Please disable your ad blocker to continue using the service for free.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ backgroundColor: "#e74c3c", color: "white" }}
          >
            Reload Page
          </button>
          <p className="text-xs text-gray-500 mt-4">
            We use non-intrusive ads to keep the service free.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export function AdBanner({ slot, format = "auto", className = "" }: { slot: string; format?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const pushed = useRef(false)

  useEffect(() => {
    if (ref.current && !pushed.current) {
      try {
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
        pushed.current = true
      } catch {}
    }
  }, [])

  return (
    <div className={`overflow-hidden ${className}`} ref={ref}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-XXXXXXXXXX"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}
