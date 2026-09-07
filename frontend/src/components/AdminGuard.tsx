"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (!stored) {
      router.push("/auth/login")
      return
    }
    const user = JSON.parse(stored)
    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      router.push("/dashboard")
      return
    }
    setAllowed(true)
    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} />
      </div>
    )
  }

  if (!allowed) return null
  return <>{children}</>
}
