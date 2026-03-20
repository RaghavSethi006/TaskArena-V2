import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type {
  GeneratedEvent,
  ScheduleEvent,
  SchedulePreferences,
  TemplateSlot,
} from "@/types"

interface ScheduleSuggestion {
  title: string
  type: "study" | "assignment" | "exam" | "break" | "other"
  date: string
  start_time: string
  duration: number
  reason?: string
  priority?: "high" | "medium" | "low"
}

interface SuggestionsResponse {
  suggestions: ScheduleSuggestion[]
  message: string
}

interface CreateEventInput {
  title: string
  type: "study" | "assignment" | "exam" | "break" | "other"
  date: string
  start_time?: string
  duration?: number
  notes?: string
  course_id?: number
}

export function useMonthEvents(year: number, month: number) {
  return useQuery({
    queryKey: ["schedule", "month", year, month],
    queryFn: () => api.get<ScheduleEvent[]>(`/schedule/month?year=${year}&month=${month}`),
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateEventInput) =>
      api.post<ScheduleEvent>("/schedule", {
        title: payload.title,
        type: payload.type,
        date: payload.date,
        start_time: payload.start_time ?? null,
        duration: payload.duration ?? null,
        notes: payload.notes ?? null,
        course_id: payload.course_id ?? null,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule"] }),
  })
}

export function useSuggestions(provider: "groq" | "local" | "ollama" = "groq") {
  return useQuery({
    queryKey: ["schedule", "suggestions", provider],
    queryFn: () => api.get<SuggestionsResponse>(`/schedule/suggestions?provider=${provider}`),
    enabled: false,
    retry: false,
  })
}

export function useAcceptSuggestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (suggestion: ScheduleSuggestion) => api.post<ScheduleEvent>("/schedule/suggestions/accept", suggestion),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule"] }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (eventId: number) => api.delete<void>(`/schedule/${eventId}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["schedule"] })
      await qc.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

interface UpdateEventInput {
  title?: string
  type?: "study" | "assignment" | "exam" | "break" | "other"
  date?: string
  start_time?: string | null
  duration?: number | null
  notes?: string | null
  course_id?: number | null
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEventInput }) =>
      api.patch<ScheduleEvent>(`/schedule/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule"] }),
  })
}

export function useTemplateStatus() {
  return useQuery({
    queryKey: ["schedule", "template", "status"],
    queryFn: () => api.get<{ has_template: boolean }>("/schedule/template/status"),
  })
}

export function useTemplateSlots() {
  return useQuery({
    queryKey: ["schedule", "template", "slots"],
    queryFn: () => api.get<TemplateSlot[]>("/schedule/template/slots"),
  })
}

export function useCreateSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<TemplateSlot, "id" | "user_id" | "created_at">) =>
      api.post<TemplateSlot>("/schedule/template/slots", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule", "template"] }),
  })
}

export function useUpdateSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TemplateSlot> }) =>
      api.patch<TemplateSlot>(`/schedule/template/slots/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule", "template"] }),
  })
}

export function useDeleteSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/schedule/template/slots/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule", "template"] }),
  })
}

export function useSchedulePreferences() {
  return useQuery({
    queryKey: ["schedule", "template", "preferences"],
    queryFn: () => api.get<SchedulePreferences>("/schedule/template/preferences"),
  })
}

export function useUpdateSchedulePreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<SchedulePreferences>) =>
      api.patch<SchedulePreferences>("/schedule/template/preferences", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule", "template"] }),
  })
}

export function useApplyWeek() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (events: GeneratedEvent[]) =>
      api.post<{ created: number }>("/schedule/template/apply", { events }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule"] }),
  })
}
