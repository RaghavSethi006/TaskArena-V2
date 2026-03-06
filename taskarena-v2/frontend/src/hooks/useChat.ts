import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { Conversation, Message } from "@/types"

export function useConversations() {
  return useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: () => api.get<Conversation[]>("/chat/conversations"),
  })
}

export function useMessages(convId: number | null) {
  return useQuery({
    queryKey: ["chat", "messages", convId],
    queryFn: () => api.get<Message[]>(`/chat/conversations/${convId}/messages`),
    enabled: convId !== null,
  })
}

export function useCreateConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<Conversation>("/chat/conversations", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat", "conversations"] }),
  })
}

export function useDeleteConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/chat/conversations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] })
      qc.invalidateQueries({ queryKey: ["chat", "messages"] })
    },
  })
}

export function useUpdateContext() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      id: number
      context_course_id?: number | null
      context_folder_id?: number | null
      context_file_id?: number | null
    }) =>
      api.patch<Conversation>(`/chat/conversations/${payload.id}/context`, {
        context_course_id: payload.context_course_id ?? null,
        context_folder_id: payload.context_folder_id ?? null,
        context_file_id: payload.context_file_id ?? null,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat", "conversations"] }),
  })
}
