import { cn } from "@/lib/utils"
import type { ScheduleEvent } from "@/types"

export const EVENT_COLORS: Record<
  ScheduleEvent["type"],
  { bg: string; border: string; text: string }
> = {
  study: { bg: "bg-blue-500/20", border: "border-blue-500/40", text: "text-blue-300" },
  assignment: {
    bg: "bg-orange-500/20",
    border: "border-orange-500/40",
    text: "text-orange-300",
  },
  exam: { bg: "bg-rose-500/20", border: "border-rose-500/40", text: "text-rose-300" },
  break: {
    bg: "bg-emerald-500/20",
    border: "border-emerald-500/40",
    text: "text-emerald-300",
  },
  other: { bg: "bg-zinc-500/20", border: "border-zinc-500/40", text: "text-zinc-300" },
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

export function normalizeVisibleHours(
  wakeTime?: string | null,
  sleepTime?: string | null
): { wakeMins: number; sleepMins: number } {
  const DEFAULT_WAKE = 7 * 60
  const DEFAULT_SLEEP = 23 * 60

  const wakeCandidate = wakeTime ? timeToMinutes(wakeTime) : DEFAULT_WAKE
  const sleepCandidate = sleepTime ? timeToMinutes(sleepTime) : DEFAULT_SLEEP

  const wakeMins =
    Number.isFinite(wakeCandidate) && wakeCandidate >= 0 && wakeCandidate < 24 * 60
      ? wakeCandidate
      : DEFAULT_WAKE

  let sleepMins =
    Number.isFinite(sleepCandidate) && sleepCandidate >= 0 && sleepCandidate < 24 * 60
      ? sleepCandidate
      : DEFAULT_SLEEP

  // If sleep is after midnight, keep the calendar usable by showing the day through midnight.
  if (sleepMins <= wakeMins) {
    sleepMins = 24 * 60
  }

  return { wakeMins, sleepMins }
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function generateTimeSlots(startMins: number, endMins: number): string[] {
  const slots: string[] = []
  for (let m = startMins; m < endMins; m += 30) {
    slots.push(minutesToTime(m))
  }
  return slots
}

function sortDisplayEvents(events: ScheduleEvent[]) {
  return [...events].sort((a, b) => {
    const aAllDay = !a.start_time
    const bAllDay = !b.start_time
    if (aAllDay !== bAllDay) return aAllDay ? -1 : 1

    const aTime = a.start_time ?? "99:99"
    const bTime = b.start_time ?? "99:99"
    if (aTime !== bTime) return aTime.localeCompare(bTime)

    if ((a.source ?? "calendar") !== (b.source ?? "calendar")) {
      return (a.source ?? "calendar") === "calendar" ? -1 : 1
    }

    return a.title.localeCompare(b.title)
  })
}

interface TimeGridColumn {
  label: string
  date: string
  events: ScheduleEvent[]
  isToday: boolean
}

interface TimeGridProps {
  columns: TimeGridColumn[]
  wakeMins: number
  sleepMins: number
  onEventClick: (event: ScheduleEvent) => void
  onSlotClick: (date: string, time: string) => void
}

export default function TimeGrid({
  columns,
  wakeMins,
  sleepMins,
  onEventClick,
  onSlotClick,
}: TimeGridProps) {
  const HEADER_HEIGHT = 44
  const ROW_HEIGHT = 28
  const ALL_DAY_ROW_HEIGHT = 18
  const gridEndMins = sleepMins > wakeMins ? sleepMins : wakeMins + 30
  const slots = generateTimeSlots(wakeMins, gridEndMins)

  const splitEvents = columns.map((col) => {
    const allDay: ScheduleEvent[] = []
    const timed: ScheduleEvent[] = []
    sortDisplayEvents(col.events).forEach((event) => {
      if (!event.start_time) allDay.push(event)
      else timed.push(event)
    })
    return { allDay, timed }
  })

  const maxAllDayRows = splitEvents.reduce(
    (max, parts) => Math.max(max, parts.allDay.length),
    0
  )
  const allDaySectionHeight = maxAllDayRows > 0 ? maxAllDayRows * ALL_DAY_ROW_HEIGHT + 6 : 0
  const gridBodyHeight = slots.length * ROW_HEIGHT
  const totalGridHeight = HEADER_HEIGHT + allDaySectionHeight + gridBodyHeight

  return (
    <div style={{ minHeight: totalGridHeight }} className="flex min-w-full">
      <div className="w-16 flex-shrink-0 border-r border-b1/70 bg-s1">
        <div style={{ height: HEADER_HEIGHT }} className="border-b border-b1" />
        {allDaySectionHeight > 0 && (
          <div
            style={{ height: allDaySectionHeight }}
            className="border-b border-b1/40 px-2 py-1 flex items-start justify-end"
          >
            <span className="text-[8px] font-mono text-tx3 uppercase tracking-wide">All day</span>
          </div>
        )}
        {slots.map((slot, idx) => (
          <div
            key={slot}
            style={{ height: ROW_HEIGHT }}
            className="flex items-start justify-end pr-2.5 border-b border-b1/25"
          >
            {idx % 2 === 0 && (
              <span className="text-[9px] font-mono text-tx3/90 -translate-y-1.5">{slot}</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-1 min-w-0 overflow-x-auto">
        {columns.map((col, colIdx) => {
          const { allDay, timed } = splitEvents[colIdx]
          const colKey = col.date
          const labelParts = col.label.split(" ")
          const labelA = labelParts[0] ?? ""
          const labelB = labelParts[1] ?? ""

          return (
            <div
              key={colKey}
              style={{ minHeight: totalGridHeight }}
              className="flex-1 min-w-[118px] border-r border-b1/60 last:border-r-0 relative bg-s1/40"
            >
              <div
                className={cn(
                  "border-b border-b1/70 flex flex-col items-center justify-center sticky top-0 z-10 backdrop-blur-sm",
                  col.isToday ? "bg-blue-500/12" : "bg-s1/95"
                )}
                style={{ height: HEADER_HEIGHT }}
              >
                <span
                  className={cn(
                    "text-[10px] font-mono uppercase tracking-wide",
                    col.isToday ? "text-blue-300" : "text-tx3/90"
                  )}
                >
                  {labelA}
                </span>
                <span
                  className={cn(
                    "text-[13px] font-bold",
                    col.isToday ? "text-blue-300" : "text-tx"
                  )}
                >
                  {labelB}
                </span>
              </div>

              {allDaySectionHeight > 0 && (
                <div
                  style={{ height: allDaySectionHeight }}
                  className="border-b border-b1/20 px-1.5 py-1 space-y-1 overflow-hidden bg-s1/75"
                >
                  {allDay.map((event) => {
                    const colors = EVENT_COLORS[event.type]
                    const isTemplateEvent = event.source === "template"
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => onEventClick(event)}
                        className={cn(
                          "w-full h-[16px] rounded-full border px-2 text-left overflow-hidden transition-all",
                          isTemplateEvent
                            ? "bg-s2/70 border-b1/60 hover:bg-s2"
                            : cn("hover:brightness-110", colors.bg, colors.border)
                        )}
                        style={
                          isTemplateEvent && event.display_color
                            ? { boxShadow: `inset 2px 0 0 ${event.display_color}` }
                            : undefined
                        }
                      >
                        <span
                          className={cn(
                            "text-[8px] font-semibold truncate block leading-[14px]",
                            isTemplateEvent ? "text-tx2" : colors.text
                          )}
                        >
                          {event.title}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {slots.map((slot) => (
                <div
                  key={slot}
                  style={{ height: ROW_HEIGHT }}
                  className="border-b border-b1/15 hover:bg-s2/18 cursor-pointer transition-colors"
                  onClick={() => onSlotClick(col.date, slot)}
                />
              ))}

              {timed.map((event) => {
                const originalStartMins = event.start_time ? timeToMinutes(event.start_time) : null
                let startMinsAbs = originalStartMins ?? wakeMins
                if (startMinsAbs < wakeMins) startMinsAbs = wakeMins
                if (startMinsAbs >= gridEndMins) startMinsAbs = Math.max(wakeMins, gridEndMins - 30)

                const rawDuration = event.duration ?? 30
                const durationMins = Math.max(rawDuration, 30)
                const maxDuration = Math.max(gridEndMins - startMinsAbs, 30)
                const clampedDuration = Math.min(durationMins, maxDuration)
                const topPx = ((startMinsAbs - wakeMins) / 30) * ROW_HEIGHT
                const heightPx = Math.max((clampedDuration / 30) * ROW_HEIGHT, ROW_HEIGHT)

                const colors = EVENT_COLORS[event.type]
                const timeLabel = event.start_time ? event.start_time.slice(0, 5) : "Time TBD"
                const isTemplateEvent = event.source === "template"

                return (
                  <div
                    key={event.id}
                    style={{
                      position: "absolute",
                      top: HEADER_HEIGHT + allDaySectionHeight + topPx,
                      left: 4,
                      right: 4,
                      height: heightPx - 2,
                      ...(isTemplateEvent && event.display_color
                        ? { borderLeft: `3px solid ${event.display_color}` }
                        : {}),
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventClick(event)
                    }}
                    className={cn(
                      "rounded-[8px] border px-2 py-1.5 cursor-pointer overflow-hidden transition-all shadow-[0_1px_0_rgba(0,0,0,0.12)]",
                      isTemplateEvent
                        ? "bg-s2/78 border-b1/70 hover:bg-s2/95"
                        : cn("hover:brightness-110", colors.bg, colors.border)
                    )}
                  >
                    <p
                      className={cn(
                        "text-[10px] font-semibold leading-tight truncate",
                        isTemplateEvent ? "text-tx" : colors.text
                      )}
                    >
                      {event.title}
                    </p>
                    {heightPx > 62 && (
                      <p className="text-[8px] text-tx3 font-mono uppercase tracking-wide">
                        {timeLabel} - {durationMins}min
                      </p>
                    )}
                    {isTemplateEvent && heightPx > 82 && (
                      <span className="text-[8px] text-tx3 font-mono">Template</span>
                    )}
                    {event.ai_suggested && heightPx > 82 && (
                      <span className="text-[8px] text-violet-400 font-mono">AI</span>
                    )}
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
