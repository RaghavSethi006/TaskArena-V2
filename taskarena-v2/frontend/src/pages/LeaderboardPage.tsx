import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import PageHeader from "@/components/shared/PageHeader"
import { api } from "@/api/client"
import type { RankingEntry } from "@/types"

interface MeStats {
  rank: number
  xp: number
  level: number
  tasks_completed: number
  streak: number
  weekly_xp: number
  quizzes_taken: number
  avg_quiz_score: number | null
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"alltime" | "weekly">("alltime")
  const rankingsQuery = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () => api.get<RankingEntry[]>(`/leaderboard?period=${period}&limit=50`),
  })
  const meQuery = useQuery({
    queryKey: ["leaderboard", "me"],
    queryFn: () => api.get<MeStats>("/leaderboard/me"),
  })

  return (
    <div className="animate-fadeUp">
      <PageHeader
        title="Leaderboard"
        subtitle="See how you stack up this week and all time."
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPeriod("alltime")}
              className={`h-8 px-3 rounded-[7px] border text-[12px] ${period === "alltime" ? "bg-[var(--bd)] border-blue-500/30 text-blue-300" : "bg-s2 border-b1 text-tx2 hover:bg-s3"}`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setPeriod("weekly")}
              className={`h-8 px-3 rounded-[7px] border text-[12px] ${period === "weekly" ? "bg-[var(--bd)] border-blue-500/30 text-blue-300" : "bg-s2 border-b1 text-tx2 hover:bg-s3"}`}
            >
              This Week
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-3">
        <div className="rounded-[10px] border border-b1 bg-s1 overflow-hidden">
          <div className="grid grid-cols-[70px_1fr_100px_80px_80px_90px] px-3 py-2 text-[10px] text-tx3 font-mono uppercase tracking-[0.8px] border-b border-b1">
            <span>Rank</span><span>Name</span><span>XP</span><span>Tasks</span><span>Streak</span><span>Weekly</span>
          </div>
          <div className="divide-y divide-b1">
            {(rankingsQuery.data ?? []).map((entry) => {
              const isMe = meQuery.data?.rank === entry.rank
              return (
                <div key={`${entry.user_id}-${entry.rank}`} className={`grid grid-cols-[70px_1fr_100px_80px_80px_90px] px-3 py-2 text-[12px] ${isMe ? "bg-[var(--bd)]" : "hover:bg-s2/40"}`}>
                  <span className="text-tx2 font-mono">{entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}</span>
                  <span className="text-tx truncate">{entry.name}{isMe ? " ← YOU" : ""}</span>
                  <span className="text-blue-300 font-mono">{entry.xp.toLocaleString()}</span>
                  <span className="text-tx2 font-mono">{entry.tasks_completed}</span>
                  <span className="text-amber-300 font-mono">{entry.streak}</span>
                  <span className="text-violet-300 font-mono">{entry.weekly_xp}</span>
                </div>
              )
            })}
          </div>
        </div>

        <aside className="rounded-[10px] border border-b1 bg-s1 p-3">
          <h3 className="text-[13px] font-semibold mb-2">Your Stats</h3>
          {meQuery.data ? (
            <div className="space-y-2 text-[12px]">
              <div className="rounded-[7px] border border-b1 bg-s2/40 p-2">Rank: #{meQuery.data.rank}</div>
              <div className="rounded-[7px] border border-b1 bg-s2/40 p-2">XP: {meQuery.data.xp.toLocaleString()}</div>
              <div className="rounded-[7px] border border-b1 bg-s2/40 p-2">Level: {meQuery.data.level}</div>
              <div className="rounded-[7px] border border-b1 bg-s2/40 p-2">Tasks: {meQuery.data.tasks_completed}</div>
              <div className="rounded-[7px] border border-b1 bg-s2/40 p-2">Streak: {meQuery.data.streak}</div>
              <div className="rounded-[7px] border border-b1 bg-s2/40 p-2">Weekly XP: {meQuery.data.weekly_xp}</div>
              <div className="rounded-[7px] border border-b1 bg-s2/40 p-2">Quiz attempts: {meQuery.data.quizzes_taken}</div>
              <div className="rounded-[7px] border border-b1 bg-s2/40 p-2">Avg score: {meQuery.data.avg_quiz_score ?? "N/A"}</div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
