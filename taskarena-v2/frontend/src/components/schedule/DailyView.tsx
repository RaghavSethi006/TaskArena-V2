import { addDays, format, isSameDay } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { ScheduleEvent, SchedulePreferences } from "@/types"
import TimeGrid, { normalizeVisibleHours } from "./TimeGrid"

interface DailyViewProps {
  currentDate: Date
  events: ScheduleEvent[]
  preferences: SchedulePreferences | undefined
  onDateChange: (d: Date) => void
  onEventClick: (event: ScheduleEvent) => void
  onSlotClick: (date: string, time: string) => void
}

export default function DailyView({
  currentDate,
  events,
  preferences,
  onDateChange,
  onEventClick,
  onSlotClick,
}: DailyViewProps) {
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimerRef = useRef<number | null>(null)
  const dateKey = format(currentDate, "yyyy-MM-dd")
  const dayEvents = events.filter((e) => e.date === dateKey)
  const allDayCount = dayEvents.filter((e) => !e.start_time).length
  const aiCount = dayEvents.filter((e) => e.ai_suggested).length

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

  const column = {
    label: `${format(currentDate, "EEE")} ${format(currentDate, "d")}`,
    date: dateKey,
    events: dayEvents,
    isToday: isSameDay(currentDate, new Date()),
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-[10px] border border-b1 bg-s1 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-b1 flex-shrink-0">
        <button
          type="button"
          onClick={() => onDateChange(addDays(currentDate, -1))}
          className="w-7 h-7 rounded-[6px] border border-b1 bg-s2 hover:bg-s3 flex items-center justify-center"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-tx3" />
        </button>
        <div className="text-center">
          <p className="text-[13px] font-semibold text-tx">{format(currentDate, "EEEE")}</p>
          <p className="text-[11px] text-tx3 font-mono">{format(currentDate, "MMMM d, yyyy")}</p>
        </div>
        <button
          type="button"
          onClick={() => onDateChange(addDays(currentDate, 1))}
          className="w-7 h-7 rounded-[6px] border border-b1 bg-s2 hover:bg-s3 flex items-center justify-center"
        >
          <ChevronRight className="w-3.5 h-3.5 text-tx3" />
        </button>
      </div>

      <div className="px-3 py-1.5 border-b border-b1 flex-shrink-0">
        <p className="text-[11px] text-tx3">
          {dayEvents.length === 0
            ? "Nothing scheduled"
            : `${dayEvents.length} event${dayEvents.length > 1 ? "s" : ""}${
                allDayCount > 0 ? ` - ${allDayCount} all-day` : ""
              } - ${aiCount} AI-generated`}
        </p>
      </div>

      <div
        onScroll={handleScroll}
        className={cn("h-0 flex-1 overflow-auto scrollbar-stealth", isScrolling && "is-scrolling")}
      >
        <TimeGrid
          columns={[column]}
          wakeMins={wakeMins}
          sleepMins={sleepMins}
          onEventClick={onEventClick}
          onSlotClick={onSlotClick}
        />
      </div>
    </div>
  )
}
