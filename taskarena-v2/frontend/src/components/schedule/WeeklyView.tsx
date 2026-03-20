import { addDays, format, isSameDay, startOfWeek } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { ScheduleEvent, SchedulePreferences } from "@/types"
import TimeGrid, { normalizeVisibleHours } from "./TimeGrid"

interface WeeklyViewProps {
  currentDate: Date
  events: ScheduleEvent[]
  preferences: SchedulePreferences | undefined
  onDateChange: (d: Date) => void
  onEventClick: (event: ScheduleEvent) => void
  onSlotClick: (date: string, time: string) => void
}

export default function WeeklyView({
  currentDate,
  events,
  preferences,
  onDateChange,
  onEventClick,
  onSlotClick,
}: WeeklyViewProps) {
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimerRef = useRef<number | null>(null)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>()
    events.forEach((e) => {
      const key = e.date
      map.set(key, [...(map.get(key) ?? []), e])
    })
    return map
  }, [events])

  const { wakeMins, sleepMins } = normalizeVisibleHours(
    preferences?.wake_time,
    preferences?.sleep_time
  )

  const handleScroll = () => {
    setIsScrolling(true)
    if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = window.setTimeout(() => {
      setIsScrolling(false)
      scrollTimerRef.current = null
    }, 700)
  }

  const columns = days.map((day) => {
    const key = format(day, "yyyy-MM-dd")
    return {
      label: `${format(day, "EEE")} ${format(day, "d")}`,
      date: key,
      events: eventsByDate.get(key) ?? [],
      isToday: isSameDay(day, new Date()),
    }
  })

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-[10px] border border-b1 bg-s1 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-b1 flex-shrink-0">
        <button
          type="button"
          onClick={() => onDateChange(addDays(weekStart, -7))}
          className="w-7 h-7 rounded-[6px] border border-b1 bg-s2 hover:bg-s3 flex items-center justify-center"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-tx3" />
        </button>
        <span className="text-[13px] font-semibold text-tx">
          {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
        </span>
        <button
          type="button"
          onClick={() => onDateChange(addDays(weekStart, 7))}
          className="w-7 h-7 rounded-[6px] border border-b1 bg-s2 hover:bg-s3 flex items-center justify-center"
        >
          <ChevronRight className="w-3.5 h-3.5 text-tx3" />
        </button>
      </div>

      <div
        onScroll={handleScroll}
        className={cn("h-0 flex-1 overflow-auto scrollbar-stealth", isScrolling && "is-scrolling")}
      >
        <TimeGrid
          columns={columns}
          wakeMins={wakeMins}
          sleepMins={sleepMins}
          onEventClick={onEventClick}
          onSlotClick={onSlotClick}
        />
      </div>
    </div>
  )
}
