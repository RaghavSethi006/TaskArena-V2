import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { ChevronLeft, ChevronRight, Plus, Sparkles } from "lucide-react"
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import EmptyState from "@/components/shared/EmptyState"
import { api } from "@/api/client"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAcceptSuggestion, useCreateEvent, useMonthEvents, useSuggestions } from "@/hooks/useSchedule"
import { cn } from "@/lib/utils"
import type { Course, ScheduleEvent } from "@/types"
import { toast } from "sonner"

interface EventForm {
  title: string
  type: "study" | "assignment" | "exam" | "break" | "other"
  date: string
  start_time: string
  duration: number
  notes: string
  course_id: string
}

function eventBarColor(type: ScheduleEvent["type"]) {
  if (type === "study") return "bg-blue-400"
  if (type === "assignment") return "bg-orange-400"
  if (type === "exam") return "bg-rose-400"
  if (type === "break") return "bg-emerald-400"
  return "bg-zinc-400"
}

export default function SchedulePage() {
  const [cursorDate, setCursorDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [provider, setProvider] = useState<"groq" | "local" | "ollama">("groq")
  const [eventForm, setEventForm] = useState<EventForm>({
    title: "",
    type: "study",
    date: format(new Date(), "yyyy-MM-dd"),
    start_time: "",
    duration: 60,
    notes: "",
    course_id: "",
  })
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([])

  const year = cursorDate.getFullYear()
  const month = cursorDate.getMonth() + 1
  const monthEventsQuery = useMonthEvents(year, month)
  const coursesQuery = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.get<Course[]>("/notes/courses"),
  })
  const createEvent = useCreateEvent()
  const suggestionsQuery = useSuggestions(provider)
  const acceptSuggestion = useAcceptSuggestion()

  const monthCells = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursorDate), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(cursorDate), { weekStartsOn: 0 })
    const cells: Date[] = []
    let current = start
    while (current <= end) {
      cells.push(current)
      current = addDays(current, 1)
    }
    while (cells.length < 42) {
      cells.push(addDays(cells[cells.length - 1], 1))
    }
    return cells
  }, [cursorDate])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>()
    ;(monthEventsQuery.data ?? []).forEach((event) => {
      const key = event.date
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    })
    return map
  }, [monthEventsQuery.data])

  const selectedDayKey = format(selectedDate, "yyyy-MM-dd")
  const selectedDayEvents = eventsByDate.get(selectedDayKey) ?? []

  const visibleSuggestions = useMemo(() => {
    const list = suggestionsQuery.data?.suggestions ?? []
    return list.filter((s) => !dismissedSuggestions.includes(`${s.title}-${s.date}-${s.start_time}`))
  }, [dismissedSuggestions, suggestionsQuery.data?.suggestions])

  const addEvent = async () => {
    if (!eventForm.title.trim()) {
      toast.error("Title is required")
      return
    }
    try {
      await createEvent.mutateAsync({
        title: eventForm.title.trim(),
        type: eventForm.type,
        date: eventForm.date,
        start_time: eventForm.start_time || undefined,
        duration: eventForm.duration || undefined,
        notes: eventForm.notes || undefined,
        course_id: eventForm.course_id ? Number(eventForm.course_id) : undefined,
      })
      toast.success("Event added")
      setAddModalOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add event"
      toast.error(message)
    }
  }

  return (
    <div className="animate-fadeUp">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[19px] font-bold tracking-tight">Smart Schedule</h1>
          <p className="text-[12.5px] text-tx2 mt-1">Plan your week with AI support.</p>
        </div>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="h-8 px-3 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Event
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-3">
        <div className="rounded-[10px] border border-b1 bg-s1 p-3">
          <div className="flex items-center justify-between mb-3">
            <button type="button" className="w-8 h-8 rounded-[7px] border border-b1 bg-s2 text-tx3 hover:bg-s3" onClick={() => setCursorDate(addDays(startOfMonth(cursorDate), -1))}>
              <ChevronLeft className="w-4 h-4 mx-auto" />
            </button>
            <h2 className="text-[14px] font-semibold">{format(cursorDate, "MMMM yyyy")}</h2>
            <button type="button" className="w-8 h-8 rounded-[7px] border border-b1 bg-s2 text-tx3 hover:bg-s3" onClick={() => setCursorDate(addDays(endOfMonth(cursorDate), 1))}>
              <ChevronRight className="w-4 h-4 mx-auto" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-[10px] font-mono text-tx3 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="px-1 py-1">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((cell) => {
              const key = format(cell, "yyyy-MM-dd")
              const events = eventsByDate.get(key) ?? []
              const selected = isSameDay(cell, selectedDate)
              const today = isSameDay(cell, new Date())
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(cell)}
                  className={cn(
                    "h-[70px] rounded-[7px] border p-1 text-left transition-colors duration-[120ms]",
                    selected ? "border-blue-500/40 bg-[var(--bd)]" : "border-b1 bg-s2/30 hover:bg-s2/70",
                    !isSameMonth(cell, cursorDate) && "opacity-30"
                  )}
                >
                  <span className={cn("text-[10px] font-mono", today ? "text-blue-300" : "text-tx2")}>{format(cell, "d")}</span>
                  <div className="mt-1 space-y-0.5">
                    {events.slice(0, 2).map((event) => (
                      <div key={event.id} className={cn("h-1 rounded-full", eventBarColor(event.type))} />
                    ))}
                    {events.length > 2 ? <p className="text-[9px] text-tx3">+{events.length - 2}</p> : null}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-3 rounded-[10px] border border-b1 bg-s2/40 p-3">
            <h3 className="text-[13px] font-semibold mb-2">{format(selectedDate, "EEEE, MMM d")}</h3>
            {selectedDayEvents.length === 0 ? (
              <EmptyState title="No events" description="This day has no scheduled events." />
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((event) => (
                  <div key={event.id} className="rounded-[7px] border border-b1 bg-s1 p-2 flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", eventBarColor(event.type))} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-tx truncate">{event.title}</p>
                      <p className="text-[10px] text-tx3 font-mono">
                        {event.start_time ?? "--:--"} · {event.duration ? `${event.duration}m` : "no duration"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[10px] border border-b1 bg-s1 p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-300" />
                AI Suggestions
              </h3>
              <select value={provider} onChange={(e) => setProvider(e.target.value as "groq" | "local" | "ollama")} className="h-7 rounded-[7px] border border-b1 bg-s2 px-2 text-[11px] text-tx">
                <option value="groq">Groq</option>
                <option value="local">Local</option>
                <option value="ollama">Ollama</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => void suggestionsQuery.refetch()}
              className="h-8 px-3 rounded-[7px] bg-violet-500 text-white text-[12px] hover:bg-violet-600"
            >
              Get AI Suggestions
            </button>
            <div className="mt-3 space-y-2">
              {visibleSuggestions.map((suggestion) => {
                const key = `${suggestion.title}-${suggestion.date}-${suggestion.start_time}`
                return (
                  <div key={key} className="rounded-[7px] border border-b1 bg-s2/40 p-2">
                    <p className="text-[12px] text-tx">{suggestion.title}</p>
                    <p className="text-[10px] text-tx3 font-mono">
                      {suggestion.date} {suggestion.start_time}
                    </p>
                    <p className="text-[11px] text-tx2 mt-1">{suggestion.reason ?? "AI-generated suggestion"}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await acceptSuggestion.mutateAsync(suggestion)
                          toast.success("Suggestion scheduled")
                        }}
                        className="h-7 px-2 rounded-[7px] bg-blue-500 text-white text-[11px] hover:bg-blue-600"
                      >
                        Schedule it
                      </button>
                      <button
                        type="button"
                        onClick={() => setDismissedSuggestions((prev) => [...prev, key])}
                        className="h-7 px-2 rounded-[7px] border border-b1 bg-s2 text-tx2 text-[11px] hover:bg-s3"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-[10px] border border-b1 bg-s1 p-3">
            <h3 className="text-[13px] font-semibold mb-2">Upcoming Deadlines</h3>
            <div className="space-y-1">
              {(monthEventsQuery.data ?? [])
                .filter((event) => event.type === "assignment" || event.type === "exam")
                .slice(0, 6)
                .map((event) => (
                  <div key={`deadline-${event.id}`} className="rounded-[7px] border border-b1 bg-s2/40 px-2 py-1.5 text-[11px] text-tx2">
                    {event.title} · <span className="font-mono text-tx3">{event.date}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="bg-s1 border-b1 rounded-[12px]">
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <input value={eventForm.title} onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))} placeholder="Title *" className="h-9 w-full rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none" />
            <div className="grid grid-cols-2 gap-2">
              <select value={eventForm.type} onChange={(e) => setEventForm((p) => ({ ...p, type: e.target.value as EventForm["type"] }))} className="h-9 rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx">
                <option value="study">Study</option>
                <option value="assignment">Assignment</option>
                <option value="exam">Exam</option>
                <option value="break">Break</option>
                <option value="other">Other</option>
              </select>
              <input value={eventForm.date} type="date" onChange={(e) => setEventForm((p) => ({ ...p, date: e.target.value }))} className="h-9 rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={eventForm.start_time} type="time" onChange={(e) => setEventForm((p) => ({ ...p, start_time: e.target.value }))} className="h-9 rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none" />
              <input value={String(eventForm.duration)} type="number" onChange={(e) => setEventForm((p) => ({ ...p, duration: Number(e.target.value || 0) }))} placeholder="Duration (min)" className="h-9 rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none" />
            </div>
            <select value={eventForm.course_id} onChange={(e) => setEventForm((p) => ({ ...p, course_id: e.target.value }))} className="h-9 rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx">
              <option value="">No linked course</option>
              {(coursesQuery.data ?? []).map((course) => (
                <option key={course.id} value={String(course.id)}>{course.name}</option>
              ))}
            </select>
            <textarea value={eventForm.notes} onChange={(e) => setEventForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" className="min-h-[80px] w-full rounded-[7px] border border-b1 bg-s2 px-3 py-2 text-[12px] text-tx outline-none resize-none" />
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setAddModalOpen(false)} className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-tx2 hover:bg-s3">Cancel</button>
            <button type="button" onClick={() => void addEvent()} className="h-8 px-3 rounded-[7px] bg-blue-500 text-white hover:bg-blue-600">Add Event</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
