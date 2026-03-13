import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "../api/client"
import type { Task, TaskCreate } from "../types"

export interface TaskUpdate {
  title?: string
  type?: "assignment" | "study" | "productivity"
  subject?: string | null
  deadline?: string | null
  points?: number
  course_id?: number | null
}

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
    placeholderData: keepPreviousData,
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
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snapshots = qc.getQueriesData<Task[]>({ queryKey: ["tasks"] })
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((task) =>
          task.id === id
            ? { ...task, status: "completed", completed_at: new Date().toISOString() }
            : task
        )
      )
      return { snapshots }
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
    },
  })
}

export function useUncompleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.patch<Task>(`/tasks/${id}`, { status: "pending" }),
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snapshots = qc.getQueriesData<Task[]>({ queryKey: ["tasks"] })
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((task) =>
          task.id === id
            ? { ...task, status: "pending", completed_at: null }
            : task
        )
      )
      return { snapshots }
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
    },
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
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tasks"] })
      await qc.invalidateQueries({ queryKey: ["schedule"] })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TaskUpdate }) =>
      api.patch<Task>(`/tasks/${id}`, data),
    onSuccess: (updatedTask) => {
      const entries = qc.getQueriesData<Task[]>({ queryKey: ["tasks"] })
      entries.forEach(([key, data]) => {
        if (!data) return

        const filters = (Array.isArray(key) ? key[1] : undefined) as
          | { type?: string; status?: string }
          | undefined
        const matchesType = !filters?.type || updatedTask.type === filters.type
        const matchesStatus = !filters?.status || updatedTask.status === filters.status
        const matchesFilters = matchesType && matchesStatus
        const existing = data.find((task) => task.id === updatedTask.id)

        let next = data
        if (existing) {
          if (matchesFilters) {
            next = data.map((task) =>
              task.id === updatedTask.id ? { ...task, ...updatedTask } : task
            )
          } else {
            next = data.filter((task) => task.id !== updatedTask.id)
          }
        } else if (matchesFilters) {
          next = [...data, updatedTask]
        }

        if (next !== data) {
          qc.setQueryData(key, next)
        }
      })

      qc.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}
