import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { api } from "../api/client"
import type { OverviewStats, RankingEntry, ScheduleEvent } from "../types"

export function useOverviewStats() {
  return useQuery({
    queryKey: ["stats", "overview"],
    queryFn: () => api.get<OverviewStats>("/stats/overview"),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => api.get<RankingEntry[]>("/leaderboard?limit=3"),
  })
}

export function useWeekEvents() {
  return useQuery({
    queryKey: ["schedule", "week"],
    queryFn: () => api.get<ScheduleEvent[]>("/schedule/week"),
  })
}
