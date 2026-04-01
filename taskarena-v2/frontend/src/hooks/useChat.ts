import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { ChatGroup, Conversation, Message } from "@/types"

export function useConversations() {
  return useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: () => api.get<Conversation[]>("/chat/conversations"),
    placeholderData: keepPreviousData,
  })
}

export function useMessages(convId: number | null) {
  return useQuery({
    queryKey: ["chat", "messages", convId],
    queryFn: () => api.get<Message[]>(`/chat/conversations/${convId}/messages`),
    enabled: convId !== null,
  })
}

export function useChatGroups() {
  return useQuery({
    queryKey: ["chat", "groups"],
    queryFn: () => api.get<ChatGroup[]>("/chat/groups"),
    placeholderData: keepPreviousData,
  })
}

export function useCreateConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload?: { group_id?: number | null; title?: string | null }) =>
      api.post<Conversation>("/chat/conversations", {
        group_id: payload?.group_id ?? null,
        title: payload?.title ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] })
      qc.invalidateQueries({ queryKey: ["chat", "groups"] })
    },
  })
}

export function useDeleteConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/chat/conversations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] })
      qc.invalidateQueries({ queryKey: ["chat", "groups"] })
      qc.invalidateQueries({ queryKey: ["chat", "messages"] })
    },
  })
}

export function useUpdateConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: number; title?: string | null; group_id?: number | null }) =>
      api.patch<Conversation>(`/chat/conversations/${payload.id}`, {
        title: payload.title ?? null,
        group_id: payload.group_id ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] })
      qc.invalidateQueries({ queryKey: ["chat", "groups"] })
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

export function useCreateChatGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string }) =>
      api.post<ChatGroup>("/chat/groups", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat", "groups"] }),
  })
}

export function useUpdateChatGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: number; name: string }) =>
      api.patch<ChatGroup>(`/chat/groups/${payload.id}`, { name: payload.name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat", "groups"] }),
  })
}

export function useDeleteChatGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/chat/groups/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] })
      qc.invalidateQueries({ queryKey: ["chat", "groups"] })
    },
  })
}
