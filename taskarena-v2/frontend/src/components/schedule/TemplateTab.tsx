import { Calendar, Edit2, RefreshCw, Sparkles, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { addDays, format, startOfWeek } from "date-fns"
import { getBaseApiUrl } from "@/api/client"
import {
  useApplyWeek,
  useDeleteSlot,
  useSchedulePreferences,
  useTemplateSlots,
  useTemplateStatus,
} from "@/hooks/useSchedule"
import type { GeneratedEvent, TemplateSlot } from "@/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import TemplateSetupWizard from "./TemplateSetupWizard"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

function toMinutes(startTime: string): number {
  const [h, m] = startTime.split(":").map(Number)
  return h * 60 + m
}

function TemplateWeekGrid({ slots }: { slots: TemplateSlot[] }) {
  const START = 7 * 60
  const END = 23 * 60
  const ROW_H = 18
  const rows = (END - START) / 30

  return (
    <div className="rounded-[10px] border border-b1 bg-s1 overflow-hidden">
      <div className="grid grid-cols-[40px_repeat(7,1fr)]">
        <div className="h-8 border-b border-b1 bg-s2/40" />
        {DAYS.map((day) => (
          <div
            key={day}
            className="h-8 border-b border-l border-b1 bg-s2/40 flex items-center justify-center"
          >
            <span className="text-[10px] font-mono text-tx3 uppercase">{day}</span>
          </div>
        ))}

        {Array.from({ length: rows }, (_, i) => {
          const mins = START + i * 30
          const timeLabel = i % 2 === 0 ? `${String(Math.floor(mins / 60)).padStart(2, "0")}:00` : ""

          return (
            <div key={`row-${i}`} className="contents">
              <div
                style={{ height: ROW_H }}
                className="border-b border-b1/30 flex items-start justify-end pr-1"
              >
                <span className="text-[8px] font-mono text-tx3 -mt-1">{timeLabel}</span>
              </div>
              {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
                const daySlots = slots.filter((s) => {
                  const slotMins = toMinutes(s.start_time)
                  return (
                    s.day_of_week === dow &&
                    slotMins <= mins &&
                    slotMins + s.duration_minutes > mins
                  )
                })

                return (
                  <div
                    key={`cell-${dow}-${i}`}
                    style={{ height: ROW_H }}
                    className="border-b border-l border-b1/30 relative"
                  >
                    {daySlots.map((slot) => {
                      const slotStartMins = toMinutes(slot.start_time)
                      if (slotStartMins !== mins) return null
                      const slotRows = Math.ceil(slot.duration_minutes / 30)
                      return (
                        <div
                          key={slot.id}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 1,
                            right: 1,
                            height: slotRows * ROW_H - 1,
                            backgroundColor: `${slot.color}33`,
                            borderLeft: `2px solid ${slot.color}`,
                            zIndex: 1,
                          }}
                          className="rounded-[3px] overflow-hidden"
                        >
                          <p
                            className="text-[8px] px-1 font-medium truncate leading-tight mt-0.5"
                            style={{ color: slot.color }}
                          >
                            {slot.title}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GenerationPreview({
  events,
  onApply,
  onDiscard,
  applying,
}: {
  events: GeneratedEvent[]
  onApply: (selected: GeneratedEvent[]) => void
  onDiscard: () => void
  applying: boolean
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set(events.map((_, i) => i)))

  const toggle = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const byDate = events.reduce<Record<string, Array<{ event: GeneratedEvent; idx: number }>>>(
    (acc, event, idx) => {
      acc[event.date] = [...(acc[event.date] ?? []), { event, idx }]
      return acc
    },
    {}
  )

  const TYPE_COLORS: Record<string, string> = {
    study: "text-blue-300",
    assignment: "text-orange-300",
    exam: "text-rose-300",
    break: "text-emerald-300",
    other: "text-zinc-300",
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-tx">Generated Schedule - {events.length} events</p>
          <p className="text-[11px] text-tx3">{selected.size} selected - Uncheck any you don't want</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDiscard}
            className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-[12px] text-tx2 hover:bg-s3"
          >
            Discard
          </button>
          <button
            type="button"
            disabled={applying || selected.size === 0}
            onClick={() => onApply(events.filter((_, i) => selected.has(i)))}
            className="h-8 px-3 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 disabled:opacity-40 inline-flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            {applying ? "Applying..." : `Apply ${selected.size} events`}
          </button>
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {Object.entries(byDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([dateStr, items]) => (
            <div key={dateStr}>
              <p className="text-[11px] font-semibold text-tx3 font-mono mb-1.5">
                {format(new Date(`${dateStr}T00:00:00`), "EEEE, MMM d")}
              </p>
              <div className="space-y-1">
                {items.map(({ event, idx }) => (
                  <label
                    key={idx}
                    className={cn(
                      "flex items-center gap-3 rounded-[7px] border px-3 py-2 cursor-pointer transition-colors",
                      selected.has(idx)
                        ? "border-blue-500/30 bg-[var(--bd)]"
                        : "border-b1 bg-s2/30 opacity-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(idx)}
                      onChange={() => toggle(idx)}
                      className="accent-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[12px] font-medium truncate", TYPE_COLORS[event.type])}>
                        {event.title}
                      </p>
                      <p className="text-[10px] text-tx3 font-mono">
                        {event.start_time} - {event.duration}min
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

export default function TemplateTab() {
  const statusQuery = useTemplateStatus()
  const slotsQuery = useTemplateSlots()
  const prefsQuery = useSchedulePreferences()
  const deleteSlot = useDeleteSlot()
  const applyWeek = useApplyWeek()

  const [showWizard, setShowWizard] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genSteps, setGenSteps] = useState<string[]>([])
  const [generatedEvents, setGeneratedEvents] = useState<GeneratedEvent[] | null>(null)
  const [applying, setApplying] = useState(false)
  const [targetWeek, setTargetWeek] = useState<"current" | "next">("current")

  const hasTemplate = statusQuery.data?.has_template ?? false

  useEffect(() => {
    if (statusQuery.data && !hasTemplate) {
      setShowWizard(true)
    }
  }, [statusQuery.data, hasTemplate])

  const getWeekStart = (): string => {
    const now = new Date()
    const monday = startOfWeek(targetWeek === "next" ? addDays(now, 7) : now, {
      weekStartsOn: 1,
    })
    return format(monday, "yyyy-MM-dd")
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setGenSteps([])
    setGeneratedEvents(null)

    try {
      const base = await getBaseApiUrl()
      const res = await fetch(`${base}/schedule/template/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week_start: getWeekStart(),
          provider: "groq",
        }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = JSON.parse(line.slice(6)) as {
            step?: string
            progress?: number
            total?: number
            done?: boolean
            events?: GeneratedEvent[]
            error?: string
          }

          if (typeof data.step === "string") {
            const stepText = data.step
            setGenSteps((prev) => [...prev, stepText])
          }
          if (data.done && data.events) {
            setGeneratedEvents(data.events)
          }
          if (data.error) {
            toast.error(data.error)
          }
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setGenerating(false)
    }
  }

  const handleApply = async (events: GeneratedEvent[]) => {
    setApplying(true)
    try {
      const result = await applyWeek.mutateAsync(events)
      toast.success(`${result.created} events added to your calendar`)
      setGeneratedEvents(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply")
    } finally {
      setApplying(false)
    }
  }

  if (statusQuery.isLoading) {
    return <p className="text-[12px] text-tx3 p-4">Loading...</p>
  }

  if (showWizard) {
    return (
      <TemplateSetupWizard
        onComplete={() => {
          setShowWizard(false)
          void statusQuery.refetch()
          void slotsQuery.refetch()
          void prefsQuery.refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-tx">Weekly Template</h2>
          <p className="text-[11px] text-tx3 mt-0.5">
            Your recurring schedule. The AI uses this to fill your weeks intelligently.
          </p>
          {prefsQuery.data && (
            <p className="text-[10px] text-tx3 font-mono mt-1">
              Wake/Sleep: {prefsQuery.data.wake_time.slice(0, 5)} - {prefsQuery.data.sleep_time.slice(0, 5)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowWizard(true)}
            className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-[12px] text-tx2 hover:bg-s3 inline-flex items-center gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Reconfigure
          </button>
        </div>
      </div>

      {(slotsQuery.data ?? []).length > 0 && <TemplateWeekGrid slots={slotsQuery.data ?? []} />}

      {(slotsQuery.data ?? []).length > 0 && (
        <div className="rounded-[10px] border border-b1 bg-s1 overflow-hidden">
          <div className="px-3 py-2 border-b border-b1 text-[11px] font-mono text-tx3 uppercase tracking-wide">
            Anchor Events ({slotsQuery.data?.length ?? 0})
          </div>
          <div className="divide-y divide-b1">
            {(slotsQuery.data ?? []).map((slot) => (
              <div key={slot.id} className="flex items-center gap-3 px-3 py-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: slot.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-tx truncate">{slot.title}</p>
                  <p className="text-[10px] text-tx3 font-mono">
                    {DAY_FULL[slot.day_of_week]} - {slot.start_time.slice(0, 5)} -{" "}
                    {slot.duration_minutes}min - {slot.category}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteSlot.mutateAsync(slot.id)
                    toast.success("Slot removed")
                  }}
                  className="text-tx3 hover:text-rose-300 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!generatedEvents ? (
        <div className="rounded-[10px] border border-b1 bg-s1 p-4">
          <p className="text-[13px] font-semibold text-tx mb-1">Generate This Week</p>
          <p className="text-[11px] text-tx3 mb-3">
            AI will fill your free time with study blocks, assignment sessions, and breaks - working
            around your anchor events and upcoming deadlines.
          </p>

          <div className="flex gap-2 mb-3">
            {(["current", "next"] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setTargetWeek(w)}
                className={cn(
                  "flex-1 h-8 rounded-[7px] border text-[11px] transition-colors",
                  targetWeek === w
                    ? "bg-[var(--bd)] border-blue-500/30 text-blue-300"
                    : "bg-s2 border-b1 text-tx2 hover:bg-s3"
                )}
              >
                {w === "current" ? "This week" : "Next week"}
              </button>
            ))}
          </div>

          {genSteps.length > 0 && (
            <div className="rounded-[7px] border border-b1 bg-s2/40 p-2 mb-3 space-y-0.5">
              {genSteps.map((step, i) => (
                <p key={`${step}-${i}`} className="text-[11px] text-tx2 font-mono">
                  {step}
                </p>
              ))}
              {generating && <p className="text-[11px] text-tx3 font-mono animate-pulse">Working...</p>}
            </div>
          )}

          <button
            type="button"
            disabled={generating}
            onClick={() => void handleGenerate()}
            className="w-full h-9 rounded-[8px] bg-gradient-to-r from-blue-500 to-violet-600 text-white text-[12px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity inline-flex items-center justify-center gap-2"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "Generating your week..." : "Generate Schedule"}
          </button>
        </div>
      ) : (
        <div className="rounded-[10px] border border-b1 bg-s1 p-4">
          <GenerationPreview
            events={generatedEvents}
            onApply={(selected) => void handleApply(selected)}
            onDiscard={() => setGeneratedEvents(null)}
            applying={applying}
          />
        </div>
      )}
    </div>
  )
}
