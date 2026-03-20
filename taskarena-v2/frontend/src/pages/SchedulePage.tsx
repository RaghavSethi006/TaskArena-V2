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
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layout,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react"
import { useMemo, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { useQuery } from "@tanstack/react-query"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import AdjustmentBanner from "@/components/schedule/AdjustmentBanner"
import DailyView from "@/components/schedule/DailyView"
import WeeklyView from "@/components/schedule/WeeklyView"
import TemplateTab from "@/components/schedule/TemplateTab"
import { api } from "@/api/client"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useAcceptSuggestion,
  useCreateEvent,
  useDeleteEvent,
  useMonthEvents,
  useSchedulePreferences,
  useSuggestions,
  useTemplateSlots,
  useUpdateEvent,
} from "@/hooks/useSchedule"
import { cn } from "@/lib/utils"
import type { Course, ScheduleEvent, TemplateSlot } from "@/types"
import { toast } from "sonner"

type MainTab = "calendar" | "template"
type CalendarView = "monthly" | "weekly" | "daily"

interface EventForm {
  title: string
  type: "study" | "assignment" | "exam" | "break" | "other"
  date: string
  start_time: string
  duration: number
  notes: string
  course_id: string
}

const EVENT_TYPE_CONFIG: Record<ScheduleEvent["type"], { leftBorder: string; bg: string }> = {
  study: { leftBorder: "border-l-blue-500", bg: "bg-blue-500/8" },
  assignment: { leftBorder: "border-l-orange-500", bg: "bg-orange-500/8" },
  exam: { leftBorder: "border-l-rose-500", bg: "bg-rose-500/8" },
  break: { leftBorder: "border-l-emerald-500", bg: "bg-emerald-500/8" },
  other: { leftBorder: "border-l-zinc-500", bg: "bg-zinc-500/8" },
}

function eventBarColor(type: ScheduleEvent["type"]) {
  if (type === "study") return "bg-blue-400"
  if (type === "assignment") return "bg-orange-400"
  if (type === "exam") return "bg-rose-400"
  if (type === "break") return "bg-emerald-400"
  return "bg-zinc-400"
}

function sortScheduleEvents(events: ScheduleEvent[]) {
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

function buildTemplateEvents(
  slots: TemplateSlot[],
  rangeStart: Date,
  rangeEnd: Date
): ScheduleEvent[] {
  const results: ScheduleEvent[] = []
  let current = new Date(rangeStart)
  current.setHours(0, 0, 0, 0)

  const end = new Date(rangeEnd)
  end.setHours(0, 0, 0, 0)

  while (current <= end) {
    const dateKey = format(current, "yyyy-MM-dd")
    const dayOfWeek = (current.getDay() + 6) % 7

    slots.forEach((slot) => {
      if (slot.day_of_week !== dayOfWeek) return

      const stamp = Number(format(current, "yyyyMMdd"))
      results.push({
        id: -(stamp * 10000 + slot.id),
        title: slot.title,
        type: "other",
        course_id: slot.course_id,
        date: dateKey,
        start_time: slot.start_time,
        duration: slot.duration_minutes,
        notes: "Template anchor",
        ai_suggested: false,
        created_at: slot.created_at,
        source: "template",
        display_color: slot.color,
      })
    })

    current = addDays(current, 1)
  }

  return sortScheduleEvents(results)
}

function EventFormFields({
  form,
  setForm,
  courses,
}: {
  form: EventForm
  setForm: Dispatch<SetStateAction<EventForm>>
  courses: Course[]
}) {
  return (
    <div className="space-y-2">
      <input
        value={form.title}
        onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
        placeholder="Title *"
        className="h-9 w-full rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={form.type}
          onChange={(e) =>
            setForm((p) => ({ ...p, type: e.target.value as EventForm["type"] }))
          }
          className="h-9 rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx"
        >
          {(["study", "assignment", "exam", "break", "other"] as const).map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
        <input
          value={form.date}
          type="date"
          onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
          className="h-9 rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={form.start_time}
          type="time"
          onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
          className="h-9 rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none"
        />
        <input
          value={String(form.duration)}
          type="number"
          onChange={(e) =>
            setForm((p) => ({ ...p, duration: Number(e.target.value || 0) }))
          }
          placeholder="Duration (min)"
          className="h-9 rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none"
        />
      </div>
      <select
        value={form.course_id}
        onChange={(e) => setForm((p) => ({ ...p, course_id: e.target.value }))}
        className="h-9 w-full rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx"
      >
        <option value="">No linked course</option>
        {courses.map((c) => (
          <option key={c.id} value={String(c.id)}>
            {c.name}
          </option>
        ))}
      </select>
      <textarea
        value={form.notes}
        onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
        placeholder="Notes"
        className="min-h-[70px] w-full rounded-[7px] border border-b1 bg-s2 px-3 py-2 text-[12px] text-tx outline-none resize-none"
      />
    </div>
  )
}

export default function SchedulePage() {
  const [mainTab, setMainTab] = useState<MainTab>("calendar")
  const [calView, setCalView] = useState<CalendarView>("monthly")
  const [activeDate, setActiveDate] = useState(new Date())

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null)
  const [confirm, setConfirm] = useState<{
    title: string
    description: string
    confirmLabel: string
    onConfirm: () => void
  } | null>(null)

  const blankForm: EventForm = {
    title: "",
    type: "study",
    date: format(new Date(), "yyyy-MM-dd"),
    start_time: "",
    duration: 60,
    notes: "",
    course_id: "",
  }
  const [eventForm, setEventForm] = useState<EventForm>(blankForm)
  const [editForm, setEditForm] = useState<EventForm>(blankForm)

  const [provider, setProvider] = useState<"groq" | "local" | "ollama">("groq")
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([])

  const year = activeDate.getFullYear()
  const month = activeDate.getMonth() + 1

  const monthEventsQuery = useMonthEvents(year, month)
  const templateSlotsQuery = useTemplateSlots()
  const coursesQuery = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.get<Course[]>("/notes/courses"),
  })
  const prefsQuery = useSchedulePreferences()
  const createEvent = useCreateEvent()
  const deleteEvent = useDeleteEvent()
  const updateEvent = useUpdateEvent()
  const suggestionsQuery = useSuggestions(provider)
  const acceptSuggestion = useAcceptSuggestion()

  const courses = coursesQuery.data ?? []

  const monthCells = useMemo(() => {
    const start = startOfWeek(startOfMonth(activeDate), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(activeDate), { weekStartsOn: 0 })
    const cells: Date[] = []
    let cur = start
    while (cur <= end) {
      cells.push(cur)
      cur = addDays(cur, 1)
    }
    while (cells.length < 42) cells.push(addDays(cells[cells.length - 1], 1))
    return cells
  }, [activeDate])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>()
    ;(monthEventsQuery.data ?? []).forEach((ev) => {
      map.set(ev.date, [...(map.get(ev.date) ?? []), { ...ev, source: "calendar" }])
    })
    return map
  }, [monthEventsQuery.data])

  const selectedDayKey = format(activeDate, "yyyy-MM-dd")
  const selectedTemplateEvents = useMemo(
    () => buildTemplateEvents(templateSlotsQuery.data ?? [], activeDate, activeDate),
    [activeDate, templateSlotsQuery.data]
  )
  const selectedDayEvents = useMemo(
    () => sortScheduleEvents([...(eventsByDate.get(selectedDayKey) ?? []), ...selectedTemplateEvents]),
    [eventsByDate, selectedDayKey, selectedTemplateEvents]
  )

  const gridEvents = useMemo(() => {
    const baseEvents = (monthEventsQuery.data ?? []).map((event) => ({
      ...event,
      source: "calendar" as const,
    }))

    if (calView === "monthly") return baseEvents

    const rangeStart = calView === "weekly" ? startOfWeek(activeDate, { weekStartsOn: 1 }) : activeDate
    const rangeEnd = calView === "weekly" ? addDays(rangeStart, 6) : activeDate
    const templateEvents = buildTemplateEvents(templateSlotsQuery.data ?? [], rangeStart, rangeEnd)

    return sortScheduleEvents([...baseEvents, ...templateEvents])
  }, [activeDate, calView, monthEventsQuery.data, templateSlotsQuery.data])

  const visibleSuggestions = useMemo(() => {
    return (suggestionsQuery.data?.suggestions ?? []).filter(
      (s) => !dismissedSuggestions.includes(`${s.title}-${s.date}-${s.start_time}`)
    )
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
      setEventForm(blankForm)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add event")
    }
  }

  const handleDeleteEvent = (id: number, title: string) => {
    setConfirm({
      title: "Delete Event",
      description: `"${title}" will be removed from your schedule.`,
      confirmLabel: "Delete",
      onConfirm: async () => {
        setConfirm(null)
        await deleteEvent.mutateAsync(id)
        toast.success("Event deleted")
      },
    })
  }

  const openEditEvent = (ev: ScheduleEvent) => {
    setEditingEvent(ev)
    setEditForm({
      title: ev.title,
      type: ev.type,
      date: ev.date?.slice(0, 10) ?? "",
      start_time: ev.start_time?.slice(0, 5) ?? "",
      duration: ev.duration ?? 60,
      notes: ev.notes ?? "",
      course_id: ev.course_id ? String(ev.course_id) : "",
    })
  }

  const saveEditEvent = async () => {
    if (!editingEvent) return
    if (!editForm.title.trim()) {
      toast.error("Title is required")
      return
    }
    const normDate = editForm.date.includes("T") ? editForm.date.split("T")[0] : editForm.date
    try {
      await updateEvent.mutateAsync({
        id: editingEvent.id,
        data: {
          title: editForm.title.trim(),
          type: editForm.type,
          date: normDate,
          start_time: editForm.start_time
            ? editForm.start_time.length === 5
              ? `${editForm.start_time}:00`
              : editForm.start_time
            : null,
          duration: editForm.duration > 0 ? editForm.duration : null,
          notes: editForm.notes.trim() || null,
          course_id: editForm.course_id ? Number(editForm.course_id) : null,
        },
      })
      toast.success("Event updated")
      setEditingEvent(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update event")
    }
  }

  const handleSlotClick = (date: string, time: string) => {
    setEventForm((p) => ({ ...p, date, start_time: time }))
    setAddModalOpen(true)
  }

  const handleCalendarEventClick = (ev: ScheduleEvent) => {
    if (ev.source === "template") {
      toast.message("Template anchors are edited from the Weekly Template tab.")
      return
    }
    openEditEvent(ev)
  }

  return (
    <div
      className="animate-fadeUp flex flex-col"
      style={{ height: "calc(100vh - 50px - 2rem)" }}
    >
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h1 className="text-[19px] font-bold tracking-tight">Smart Schedule</h1>
          <p className="text-[12.5px] text-tx2 mt-0.5">Plan your week with AI support.</p>
        </div>

        <div className="flex items-center gap-2">
          {(["calendar", "template"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMainTab(tab)}
              className={cn(
                "h-8 px-3 rounded-[7px] border text-[12px] transition-colors inline-flex items-center gap-1.5",
                mainTab === tab
                  ? "bg-[var(--bd)] border-blue-500/30 text-blue-300"
                  : "bg-s2 border-b1 text-tx2 hover:bg-s3"
              )}
            >
              {tab === "calendar" ? (
                <>
                  <CalendarDays className="w-3.5 h-3.5" /> Calendar
                </>
              ) : (
                <>
                  <Layout className="w-3.5 h-3.5" /> Template
                </>
              )}
            </button>
          ))}

          {mainTab === "calendar" && (
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="h-8 px-3 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Event
            </button>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 mb-3">
        <AdjustmentBanner />
      </div>

      {mainTab === "template" && (
        <div className="flex-1 overflow-y-auto">
          <TemplateTab />
        </div>
      )}

      {mainTab === "calendar" && (
        <>
          <div className="flex gap-1.5 mb-3 flex-shrink-0">
            {(["monthly", "weekly", "daily"] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setCalView(view)}
                className={cn(
                  "h-7 px-3 rounded-[6px] border text-[11px] transition-colors inline-flex items-center gap-1",
                  calView === view
                    ? "bg-s2 border-b2 text-tx"
                    : "bg-s1 border-b1 text-tx3 hover:bg-s2 hover:text-tx2"
                )}
              >
                {view === "monthly" && (
                  <>
                    <Calendar className="w-3 h-3" /> Month
                  </>
                )}
                {view === "weekly" && (
                  <>
                    <CalendarDays className="w-3 h-3" /> Week
                  </>
                )}
                {view === "daily" && (
                  <>
                    <Clock className="w-3 h-3" /> Day
                  </>
                )}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-3 flex-1 min-h-0 overflow-hidden">
            <div className="flex min-h-0 flex-col overflow-hidden">
              {calView === "monthly" && (
                <div className="rounded-[10px] border border-b1 bg-s1 p-3 flex flex-col h-full overflow-hidden">
                  <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveDate(addDays(startOfMonth(activeDate), -1))}
                      className="w-8 h-8 rounded-[7px] border border-b1 bg-s2 hover:bg-s3 flex items-center justify-center"
                    >
                      <ChevronLeft className="w-4 h-4 text-tx3" />
                    </button>
                    <h2 className="text-[14px] font-semibold">{format(activeDate, "MMMM yyyy")}</h2>
                    <button
                      type="button"
                      onClick={() => setActiveDate(addDays(endOfMonth(activeDate), 1))}
                      className="w-8 h-8 rounded-[7px] border border-b1 bg-s2 hover:bg-s3 flex items-center justify-center"
                    >
                      <ChevronRight className="w-4 h-4 text-tx3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 text-[10px] font-mono text-tx3 mb-1 flex-shrink-0">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                      <div key={d} className="px-1 py-1">
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1 flex-1 overflow-hidden">
                    {monthCells.map((cell) => {
                      const key = format(cell, "yyyy-MM-dd")
                      const events = eventsByDate.get(key) ?? []
                      const isSelected = isSameDay(cell, activeDate)
                      const isToday = isSameDay(cell, new Date())
                      const inMonth = isSameMonth(cell, activeDate)
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setActiveDate(cell)}
                          className={cn(
                            "rounded-[7px] border p-1 text-left transition-colors min-h-[56px]",
                            isSelected
                              ? "border-blue-500/40 bg-[var(--bd)]"
                              : isToday
                                ? "border-blue-500/20 bg-s2"
                                : !inMonth
                                  ? "border-transparent opacity-30"
                                  : "border-b1 bg-s1 hover:bg-s2"
                          )}
                        >
                          <span
                            className={cn(
                              "text-[11px] font-mono block mb-1",
                              isToday ? "text-blue-300 font-bold" : "text-tx3"
                            )}
                          >
                            {format(cell, "d")}
                          </span>
                          <div className="space-y-0.5">
                            {events.slice(0, 2).map((ev) => (
                              <div key={ev.id} className={cn("h-1.5 rounded-full", eventBarColor(ev.type))} />
                            ))}
                            {events.length > 2 && (
                              <span className="text-[8px] text-tx3 font-mono">+{events.length - 2}</span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {calView === "weekly" && (
                <div className="flex h-full min-h-0 flex-col">
                  <WeeklyView
                    currentDate={activeDate}
                    events={gridEvents}
                    preferences={prefsQuery.data}
                    onDateChange={setActiveDate}
                    onEventClick={handleCalendarEventClick}
                    onSlotClick={handleSlotClick}
                  />
                </div>
              )}

              {calView === "daily" && (
                <div className="flex h-full min-h-0 flex-col">
                  <DailyView
                    currentDate={activeDate}
                    events={gridEvents}
                    preferences={prefsQuery.data}
                    onDateChange={setActiveDate}
                    onEventClick={handleCalendarEventClick}
                    onSlotClick={handleSlotClick}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto min-h-0">
              <div className="rounded-[10px] border border-b1 bg-s1 p-3 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[13px] font-semibold">{format(activeDate, "EEEE, MMM d")}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setEventForm((p) => ({ ...p, date: selectedDayKey }))
                      setAddModalOpen(true)
                    }}
                    className="h-6 px-2 rounded-[5px] bg-s2 border border-b1 text-[10px] text-tx2 hover:bg-s3 inline-flex items-center gap-1"
                  >
                    <Plus className="w-2.5 h-2.5" /> Add
                  </button>
                </div>

                {selectedDayEvents.length === 0 ? (
                  <p className="text-[11px] text-tx3">Nothing scheduled.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedDayEvents.map((ev) => {
                      const cfg = EVENT_TYPE_CONFIG[ev.type]
                      const isTemplateEvent = ev.source === "template"
                      return (
                        <div
                          key={ev.id}
                          className={cn(
                            "rounded-[7px] border border-b1 border-l-2 px-2.5 py-2",
                            cfg.leftBorder,
                            cfg.bg
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] text-tx font-medium truncate">
                                {ev.title}
                                {isTemplateEvent && (
                                  <span className="ml-1 text-[9px] text-blue-300 font-mono">TEMPLATE</span>
                                )}
                                {ev.ai_suggested && (
                                  <span className="ml-1 text-[9px] text-violet-400 font-mono">AI</span>
                                )}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-tx3">
                                {ev.start_time && <span>Time {ev.start_time.slice(0, 5)}</span>}
                                {ev.duration && <span>{ev.duration}min</span>}
                              </div>
                              {ev.notes && <p className="text-[10px] text-tx3 mt-0.5 truncate">{ev.notes}</p>}
                            </div>
                            {!isTemplateEvent && (
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openEditEvent(ev)}
                                  className="h-6 w-6 rounded-[4px] text-tx3 hover:text-tx hover:bg-s2 flex items-center justify-center transition-colors"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEvent(ev.id, ev.title)}
                                  className="h-6 w-6 rounded-[4px] text-tx3 hover:text-rose-300 hover:bg-rose-500/10 flex items-center justify-center transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-[10px] border border-b1 bg-s1 p-3 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[13px] font-semibold">AI Suggestions</h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value as typeof provider)}
                      className="h-6 rounded-[5px] border border-b1 bg-s2 px-1.5 text-[10px] text-tx"
                    >
                      <option value="groq">Groq</option>
                      <option value="local">Local</option>
                      <option value="ollama">Ollama</option>
                    </select>
                    <button
                      type="button"
                      disabled={suggestionsQuery.isFetching}
                      onClick={() => void suggestionsQuery.refetch()}
                      className="h-6 px-2 rounded-[5px] bg-s2 border border-b1 text-[10px] text-tx2 hover:bg-s3 disabled:opacity-40 inline-flex items-center gap-1"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      {suggestionsQuery.isFetching ? "Loading..." : "Generate"}
                    </button>
                  </div>
                </div>

                {suggestionsQuery.data?.message && visibleSuggestions.length === 0 && (
                  <p className="text-[11px] text-tx3">{suggestionsQuery.data.message}</p>
                )}

                <div className="space-y-2">
                  {visibleSuggestions.map((s) => {
                    const key = `${s.title}-${s.date}-${s.start_time}`
                    return (
                      <div key={key} className="rounded-[7px] border border-b1 bg-s2/40 p-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[12px] text-tx font-medium flex-1 truncate">{s.title}</span>
                          {s.priority && (
                            <span
                              className={cn(
                                "text-[9px] font-mono px-1.5 py-0.5 rounded-[4px]",
                                s.priority === "high"
                                  ? "bg-rose-500/15 text-rose-400"
                                  : s.priority === "medium"
                                    ? "bg-amber-500/15 text-amber-400"
                                    : "bg-emerald-500/15 text-emerald-400"
                              )}
                            >
                              {s.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-tx3 font-mono">
                          {s.date} | {s.start_time} | {s.duration}min
                        </p>
                        <p className="text-[11px] text-tx2 mt-1">{s.reason ?? "AI-generated suggestion"}</p>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            disabled={acceptSuggestion.isPending}
                            onClick={async () => {
                              try {
                                await acceptSuggestion.mutateAsync(s)
                                toast.success("Suggestion scheduled")
                              } catch {
                                toast.error("Failed to schedule")
                              }
                            }}
                            className="h-7 px-2 rounded-[7px] bg-blue-500 text-white text-[11px] hover:bg-blue-600 disabled:opacity-50"
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

              <div className="rounded-[10px] border border-b1 bg-s1 p-3 flex-shrink-0">
                <h3 className="text-[13px] font-semibold mb-2">Upcoming Deadlines</h3>
                <div className="space-y-1">
                  {(monthEventsQuery.data ?? [])
                    .filter((ev) => ev.type === "assignment" || ev.type === "exam")
                    .slice(0, 6)
                    .map((ev) => (
                      <div
                        key={`dl-${ev.id}`}
                        className="rounded-[7px] border border-b1 bg-s2/40 px-2 py-1.5 flex items-center justify-between text-[11px]"
                      >
                        <span className="text-tx2 truncate">{ev.title}</span>
                        <span className="text-tx3 font-mono flex-shrink-0 ml-2">{ev.date}</span>
                      </div>
                    ))}
                  {(monthEventsQuery.data ?? []).filter(
                    (ev) => ev.type === "assignment" || ev.type === "exam"
                  ).length === 0 && <p className="text-[11px] text-tx3">No upcoming deadlines.</p>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="bg-s1 border-b1 rounded-[12px]">
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
          </DialogHeader>
          <EventFormFields form={eventForm} setForm={setEventForm} courses={courses} />
          <DialogFooter>
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-tx2 hover:bg-s3"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void addEvent()}
              className="h-8 px-3 rounded-[7px] bg-blue-500 text-white hover:bg-blue-600"
            >
              Add Event
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editingEvent !== null} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="bg-s1 border-b1 rounded-[12px]">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <EventFormFields form={editForm} setForm={setEditForm} courses={courses} />
          <DialogFooter>
            <button
              type="button"
              onClick={() => setEditingEvent(null)}
              className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-tx2 hover:bg-s3"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={updateEvent.isPending}
              onClick={() => void saveEditEvent()}
              className="h-8 px-3 rounded-[7px] bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40"
            >
              {updateEvent.isPending ? "Saving..." : "Save Changes"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        confirmLabel={confirm?.confirmLabel ?? "Confirm"}
        onConfirm={() => confirm?.onConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
