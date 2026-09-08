"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, DollarSign, Cpu, HardDrive, Zap } from "lucide-react"

interface CostData { breakdown: { ram: any; disk: any; cpu: any }; totalMonthly: number; usagePct: number; estimatedMonthly: number; uptimeHours: number }

export default function CostPage() {
  const params = useParams(); const id = params.id as string
  const [data, setData] = useState<CostData | null>(null); const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/servers/${id}/cost`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(r => r.ok ? r.json() : null).then(d => setData(d)).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-5 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} strokeWidth={1.5} /></div>
  if (!data) return <div className="p-5 text-center text-[12px]" style={{ color: "var(--brand-muted)" }}>No data</div>

  const items = [
    { label: "RAM", icon: <HardDrive size={13} strokeWidth={1.5} />, amount: data.breakdown.ram.amount, cost: data.breakdown.ram.cost, rate: `$${data.breakdown.ram.costPerGB}/GB` },
    { label: "Disk", icon: <HardDrive size={13} strokeWidth={1.5} />, amount: data.breakdown.disk.amount, cost: data.breakdown.disk.cost, rate: `$${data.breakdown.disk.costPerGB}/GB` },
    { label: "CPU", icon: <Cpu size={13} strokeWidth={1.5} />, amount: data.breakdown.cpu.amount, cost: data.breakdown.cpu.cost, rate: `$${data.breakdown.cpu.costPerCore}/core` },
  ]

  return (
    <div className="p-5 md:p-6 max-w-[600px] mx-auto">
      <div className="mb-5"><h1 className="text-[16px] font-semibold" style={{ color: "var(--brand-text)" }}>Resource Cost Calculator</h1>
        <p className="text-[12px] mt-1" style={{ color: "var(--brand-muted)" }}>Estimated monthly costs based on allocation</p></div>

      <div className="space-y-2 mb-4">
        {items.map((item, i) => (
          <div key={i} className="p-3 rounded-xl flex items-center justify-between" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
            <div className="flex items-center gap-2.5"><span style={{ color: "var(--brand-muted)", opacity: 0.5 }}>{item.icon}</span>
              <div><div className="text-[11px] font-medium" style={{ color: "var(--brand-text)" }}>{item.label}</div><div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{item.amount} @ {item.rate}</div></div>
            </div>
            <div className="text-[13px] font-semibold" style={{ color: "var(--brand-text)" }}>${item.cost.toFixed(2)}</div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <div className="flex items-center justify-between mb-2"><span className="text-[12px] font-medium" style={{ color: "var(--brand-text)" }}>Total Monthly (allocated)</span>
          <span className="text-[16px] font-bold" style={{ color: "var(--brand-text)" }}>${data.totalMonthly.toFixed(2)}</span></div>
        <div className="flex items-center justify-between"><span className="text-[11px]" style={{ color: "var(--brand-muted)" }}>Usage: {data.usagePct}% | Uptime: {data.uptimeHours}h</span>
          <span className="text-[12px] font-medium text-green-500">Est: ${data.estimatedMonthly.toFixed(2)}</span></div>
      </div>

      <div className="p-3 rounded-xl" style={{ backgroundColor: "var(--brand-card)", border: "1px solid var(--brand-border)" }}>
        <p className="text-[10px]" style={{ color: "var(--brand-muted)" }}>Costs based on standard pricing. Actual costs may vary by provider.</p>
      </div>
    </div>
  )
}
