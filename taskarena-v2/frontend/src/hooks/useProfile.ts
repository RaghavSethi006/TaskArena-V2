import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { AIConfig, User } from "@/types"

interface ProfileUpdate {
  name?: string
  email?: string | null
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<User>("/profile"),
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProfileUpdate) => api.patch<User>("/profile", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  })
}

export function useAIConfig() {
  return useQuery({
    queryKey: ["profile", "ai-config"],
    queryFn: () => api.get<AIConfig>("/profile/ai-config"),
  })
}

export function useUpdateAIConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { provider: string; model: string; groq_api_key?: string; ollama_url?: string }) =>
      api.patch<AIConfig>("/profile/ai-config", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", "ai-config"] }),
  })
}
