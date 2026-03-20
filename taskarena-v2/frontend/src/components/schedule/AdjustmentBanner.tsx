import { format, parseISO } from "date-fns"
import { Sparkles, X } from "lucide-react"
import { useState } from "react"
import { getBaseApiUrl } from "@/api/client"
import { useApplyWeek } from "@/hooks/useSchedule"
import { cn } from "@/lib/utils"
import { useScheduleStore } from "@/stores/scheduleStore"
import type { GeneratedEvent } from "@/types"
import { toast } from "sonner"

export default function AdjustmentBanner() {
  const { pendingAdjustment, dismissAdjustment } = useScheduleStore()
  const applyWeek = useApplyWeek()

  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<GeneratedEvent[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [applying, setApplying] = useState(false)

  if (!pendingAdjustment) return null

  const daysUntil = Math.ceil(
    (new Date(pendingAdjustment.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  const isUrgent = daysUntil <= 2

  const fetchAdjustments = async () => {
    setLoading(true)
    setExpanded(true)
    try {
      const base = await getBaseApiUrl()
      const res = await fetch(`${base}/schedule/template/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week_start: format(new Date(), "yyyy-MM-dd"),
          provider: "groq",
        }),
      })
      if (!res.ok || !res.body) throw new Error("Failed to get suggestions")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let events: GeneratedEvent[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = JSON.parse(line.slice(6)) as {
            done?: boolean
            events?: GeneratedEvent[]
            error?: string
          }
          if (data.done && data.events) events = data.events
          if (data.error) throw new Error(data.error)
        }
      }
      setSuggestions(events)
      setSelected(new Set(events.map((_, i) => i)))
    } catch {
      toast.error("Failed to get schedule adjustments")
      setExpanded(false)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!suggestions) return
    setApplying(true)
    try {
      const toApply = suggestions.filter((_, i) => selected.has(i))
      const result = await applyWeek.mutateAsync(toApply)
      toast.success(`${result.created} schedule adjustments applied`)
      dismissAdjustment()
    } catch {
      toast.error("Failed to apply adjustments")
    } finally {
      setApplying(false)
    }
  }

  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  return (
    <div
      className={cn(
        "rounded-[10px] border bg-s1 overflow-hidden",
        isUrgent ? "border-rose-500/30" : "border-amber-500/30"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2.5",
          isUrgent ? "bg-rose-500/8" : "bg-amber-500/8"
        )}
      >
        <Sparkles
          className={cn("w-4 h-4 flex-shrink-0", isUrgent ? "text-rose-400" : "text-amber-400")}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-tx">New task: "{pendingAdjustment.taskTitle}"</p>
          <p className="text-[10px] text-tx3">
            Due in {daysUntil} day{daysUntil !== 1 ? "s" : ""} - AI can adjust this week's schedule
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!expanded && (
            <button
              type="button"
              disabled={loading}
              onClick={() => void fetchAdjustments()}
              className={cn(
                "h-7 px-2.5 rounded-[6px] text-[11px] font-medium transition-colors disabled:opacity-40",
                isUrgent
                  ? "bg-rose-500 text-white hover:bg-rose-600"
                  : "bg-amber-500 text-white hover:bg-amber-600"
              )}
            >
              {loading ? "Loading..." : "Review Adjustments"}
            </button>
          )}
          <button
            type="button"
            onClick={dismissAdjustment}
            className="text-tx3 hover:text-tx transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && suggestions && (
        <div className="px-3 pt-2 pb-3 border-t border-b1 space-y-2">
          <p className="text-[11px] text-tx3">
            Suggested additions for this week - uncheck any you don't want:
          </p>
          <div className="space-y-1 max-h-[200px] overflow-y-auto pr-0.5">
            {suggestions.slice(0, 8).map((ev, idx) => (
              <label
                key={idx}
                className={cn(
                  "flex items-center gap-2.5 rounded-[7px] border px-2.5 py-1.5 cursor-pointer transition-colors",
                  selected.has(idx)
                    ? "border-blue-500/30 bg-[var(--bd)]"
                    : "border-b1 bg-s2/30 opacity-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(idx)}
                  onChange={() => toggleSelect(idx)}
                  className="accent-blue-500 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-tx font-medium truncate">{ev.title}</p>
                  <p className="text-[10px] text-tx3 font-mono">
                    {format(parseISO(`${ev.date}T00:00:00`), "EEE MMM d")} - {ev.start_time} -{" "}
                    {ev.duration}min
                  </p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setExpanded(false)
                setSuggestions(null)
              }}
              className="h-7 px-2.5 rounded-[6px] border border-b1 bg-s2 text-[11px] text-tx2 hover:bg-s3"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={applying || selected.size === 0}
              onClick={() => void handleApply()}
              className="h-7 px-2.5 rounded-[6px] bg-blue-500 text-white text-[11px] hover:bg-blue-600 disabled:opacity-40"
            >
              {applying ? "Applying..." : `Apply ${selected.size} change${selected.size !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
