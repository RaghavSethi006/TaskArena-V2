import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface DueChipProps {
  deadline: string | null
  status: "pending" | "completed"
}

function chipClass(variant: "neutral" | "green" | "amber" | "rose") {
  return cn(
    "text-[10px] font-mono uppercase tracking-[0.5px] rounded-[5px] px-2 py-0.5 border",
    variant === "neutral" && "bg-s2 text-tx3 border-b1",
    variant === "green" && "bg-[var(--gd)] text-emerald-300 border-emerald-500/25",
    variant === "amber" && "bg-[var(--ad)] text-amber-300 border-amber-500/25",
    variant === "rose" && "bg-[var(--rd)] text-rose-300 border-rose-500/25"
  )
}

export default function DueChip({ deadline, status }: DueChipProps) {
  if (status === "completed") {
    return <Badge className={chipClass("green")}>Done</Badge>
  }

  if (!deadline) {
    return <Badge className={chipClass("neutral")}>No deadline</Badge>
  }

  const days = differenceInCalendarDays(startOfDay(parseISO(deadline)), startOfDay(new Date()))
  if (days < 0) return <Badge className={chipClass("rose")}>Overdue</Badge>
  if (days === 0) return <Badge className={chipClass("amber")}>Due today</Badge>
  if (days <= 2) return <Badge className={chipClass("amber")}>{days}d left</Badge>
  return <Badge className={chipClass("green")}>{days}d left</Badge>
}
