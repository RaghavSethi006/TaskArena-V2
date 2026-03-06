import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "../api/client"
import type { Task, TaskCreate } from "../types"

interface TaskFilters {
  type?: string
  status?: string
  course_id?: string
}

export function useTasks(filters?: TaskFilters) {
  const params = new URLSearchParams()
  if (filters?.type) params.set("type", filters.type)
  if (filters?.status) params.set("status", filters.status)
  const qs = params.toString() ? `?${params.toString()}` : ""

  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => api.get<Task[]>(`/tasks${qs}`),
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TaskCreate) => api.post<Task>("/tasks", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  })
}

export function useCompleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api.post<{ task: Task; xp_earned: number; new_total_xp: number }>(`/tasks/${id}/complete`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  })
}
