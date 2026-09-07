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
      <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: "#080808" }}>
        <div className="max-w-sm w-full mx-4 p-10 rounded-2xl text-center" style={{ backgroundColor: "#111111", border: "1px solid #1C1C1C" }}>
          <div className="w-14 h-14 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#1a1a1a", border: "1px solid #222" }}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#FAFAFA" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold mb-2" style={{ color: "#FAFAFA" }}>Ad Blocker Detected</h2>
          <p className="text-[13px] leading-relaxed mb-8" style={{ color: "#666666" }}>
            Please disable your ad blocker to support this free service.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 rounded-lg text-[13px] font-medium transition-all hover:opacity-80"
            style={{ backgroundColor: "#FAFAFA", color: "#080808" }}
          >
            Reload Page
          </button>
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
