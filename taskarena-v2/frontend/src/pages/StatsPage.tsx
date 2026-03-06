import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts"
import PageHeader from "@/components/shared/PageHeader"
import StatCard from "@/components/shared/StatCard"
import { api } from "@/api/client"
import type { OverviewStats } from "@/types"

interface ActivityPoint {
  date: string
  tasks_completed: number
  xp_earned: number
}

interface Breakdown {
  by_type: Record<string, { completed: number; pending: number }>
}

export default function StatsPage() {
  const [period, setPeriod] = useState<"week" | "month" | "all">("week")
  const days = period === "week" ? 7 : period === "month" ? 30 : 90

  const overviewQuery = useQuery({
    queryKey: ["stats", "overview"],
    queryFn: () => api.get<OverviewStats>("/stats/overview"),
  })
  const activityQuery = useQuery({
    queryKey: ["stats", "activity", days],
    queryFn: () => api.get<ActivityPoint[]>(`/stats/activity?days=${days}`),
  })
  const breakdownQuery = useQuery({
    queryKey: ["stats", "breakdown"],
    queryFn: () => api.get<Breakdown>("/stats/breakdown"),
  })

  const activity = activityQuery.data ?? []
  const breakdown = breakdownQuery.data?.by_type ?? {}

  return (
    <div className="animate-fadeUp">
      <PageHeader
        title="Statistics"
        subtitle="Track consistency, completion, and XP velocity."
        actions={
          <div className="flex gap-2">
            {(["week", "month", "all"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`h-8 px-3 rounded-[7px] border text-[12px] ${
                  period === p ? "bg-[var(--bd)] border-blue-500/30 text-blue-300" : "bg-s2 border-b1 text-tx2 hover:bg-s3"
                }`}
              >
                {p === "week" ? "Week" : p === "month" ? "Month" : "All Time"}
              </button>
            ))}
          </div>
        }
      />

      {overviewQuery.data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <StatCard label="Completed" value={overviewQuery.data.tasks_completed} color="green" />
          <StatCard label="Pending" value={overviewQuery.data.tasks_pending} color="amber" />
          <StatCard label="XP Total" value={overviewQuery.data.total_xp} color="blue" />
          <StatCard label="Completion" value={`${overviewQuery.data.completion_rate}%`} color="violet" />
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="rounded-[10px] border border-b1 bg-s1 p-3">
          <h3 className="text-[13px] font-semibold mb-2">Tasks Completed</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip contentStyle={{ background: "#111113", border: "1px solid #27272a", borderRadius: 8 }} />
                <Area dataKey="tasks_completed" stroke="#3b82f6" fill="url(#blueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-[10px] border border-b1 bg-s1 p-3">
          <h3 className="text-[13px] font-semibold mb-2">XP Earned</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity}>
                <defs>
                  <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip contentStyle={{ background: "#111113", border: "1px solid #27272a", borderRadius: 8 }} />
                <Area dataKey="xp_earned" stroke="#10b981" fill="url(#greenGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="rounded-[10px] border border-b1 bg-s1 p-3">
          <h3 className="text-[13px] font-semibold mb-2">Task Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(breakdown).map(([type, values]) => {
              const total = values.completed + values.pending
              const pct = total > 0 ? (values.completed / total) * 100 : 0
              return (
                <div key={type}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="capitalize">{type}</span>
                    <span className="text-tx3">{values.completed}/{total}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-s2 border border-b1 overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="rounded-[10px] border border-b1 bg-s1 p-3">
          <h3 className="text-[13px] font-semibold mb-2">Activity Heatmap</h3>
          <div className="grid grid-cols-7 gap-1">
            {activity.slice(-28).map((point) => {
              const intensity = point.tasks_completed
              const color = intensity === 0 ? "bg-s2" : intensity <= 1 ? "bg-[#1a3a2a]" : intensity <= 3 ? "bg-[#065f46]" : "bg-[#10b981]"
              return (
                <div key={point.date} className={`h-6 rounded-[4px] ${color}`} title={`${point.date}: ${point.tasks_completed} tasks, +${point.xp_earned} XP`} />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
