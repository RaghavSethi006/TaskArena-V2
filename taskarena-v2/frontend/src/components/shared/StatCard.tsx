import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  color?: "blue" | "green" | "amber" | "violet" | "rose"
  trend?: "up" | "down" | "neutral"
}

const COLOR_MAP: Record<NonNullable<StatCardProps["color"]>, string> = {
  blue: "text-blue-400",
  green: "text-emerald-400",
  amber: "text-amber-400",
  violet: "text-violet-400",
  rose: "text-rose-400",
}

export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "blue",
  trend = "neutral",
}: StatCardProps) {
  return (
    <div className="rounded-[10px] border border-b1 bg-s1 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.8px] text-tx3">{label}</span>
        {Icon ? <Icon className={cn("w-3.5 h-3.5", COLOR_MAP[color])} /> : null}
      </div>

      <div className="mt-2 flex items-end justify-between">
        <span className={cn("font-mono text-[24px] font-bold leading-none", COLOR_MAP[color])}>{value}</span>
        {trend === "up" ? (
          <ArrowUpRight className={cn("w-4 h-4", COLOR_MAP[color])} />
        ) : trend === "down" ? (
          <ArrowDownRight className={cn("w-4 h-4", COLOR_MAP[color])} />
        ) : (
          <Minus className="w-4 h-4 text-tx3" />
        )}
      </div>

      <p className="mt-1 text-[11px] text-tx3">{sub ?? " "}</p>
    </div>
  )
}
