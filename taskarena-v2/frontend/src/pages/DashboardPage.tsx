import { Award, CalendarDays, Flame, ListChecks, TrendingUp } from "lucide-react"
import { format, isToday, parseISO } from "date-fns"
import { useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import EmptyState from "@/components/shared/EmptyState"
import LoadingSkeleton from "@/components/shared/LoadingSkeleton"
import PageHeader from "@/components/shared/PageHeader"
import StatCard from "@/components/shared/StatCard"
import TaskCard from "@/components/shared/TaskCard"
import { Progress } from "@/components/ui/progress"
import { useOverviewStats, useLeaderboard, useWeekEvents } from "@/hooks/useStats"
import { useTasks } from "@/hooks/useTasks"

const NEXT_LEVEL_XP = 5000

export default function DashboardPage() {
  const navigate = useNavigate()
  const statsQuery = useOverviewStats()
  const tasksQuery = useTasks({ status: "pending" })
  const weekEventsQuery = useWeekEvents()
  const leaderboardQuery = useLeaderboard()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const name = "Raghav"

  const dueToday = useMemo(
    () => (tasksQuery.data ?? []).filter((task) => task.deadline && isToday(parseISO(task.deadline))).slice(0, 4),
    [tasksQuery.data]
  )

  if (statsQuery.isLoading) {
    return (
      <div className="animate-fadeUp space-y-4">
        <LoadingSkeleton rows={3} />
        <LoadingSkeleton rows={6} />
      </div>
    )
  }

  if (statsQuery.error || !statsQuery.data) {
    const message = statsQuery.error instanceof Error ? statsQuery.error.message : "Stats are unavailable."
    return (
      <div className="animate-fadeUp">
        <EmptyState
          title="Failed to load dashboard"
          description={message}
          actionLabel="Retry"
          onAction={() => void statsQuery.refetch()}
        />
      </div>
    )
  }

  const stats = statsQuery.data
  const xpProgress = Math.min(100, (stats.total_xp / NEXT_LEVEL_XP) * 100)
  const xpToNext = Math.max(0, NEXT_LEVEL_XP - stats.total_xp)

  return (
    <div className="animate-fadeUp">
      <PageHeader
        title={`${greeting}, ${name}`}
        subtitle="Here is your morning briefing."
        actions={
          <Link
            to="/tasks"
            className="h-8 px-3 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 transition-colors duration-[120ms] inline-flex items-center"
          >
            See tasks
          </Link>
        }
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="XP Today" value={stats.xp_this_week} sub="+ this week" icon={TrendingUp} color="blue" trend="up" />
        <StatCard label="Streak" value={`${stats.current_streak}d`} sub="Keep it alive" icon={Flame} color="amber" />
        <StatCard label="Done Today" value={stats.tasks_this_week} sub="This week" icon={ListChecks} color="green" />
        <StatCard label="Rank" value={`#${stats.rank}`} sub="Leaderboard" icon={Award} color="violet" />
      </section>

      <section className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div className="xl:col-span-2 space-y-3">
          <div className="rounded-[10px] border border-b1 bg-s1 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-semibold">Due Today</h2>
              <Link to="/tasks" className="text-[12px] text-blue-300 hover:text-blue-200 transition-colors duration-[120ms]">
                See all →
              </Link>
            </div>
            {tasksQuery.isLoading ? (
              <LoadingSkeleton rows={3} card={false} />
            ) : dueToday.length === 0 ? (
              <EmptyState title="No tasks due today" description="You are clear for now." />
            ) : (
              <div className="space-y-2">
                {dueToday.map((task) => (
                  <div key={task.id} onClick={() => navigate("/tasks")} className="cursor-pointer">
                    <TaskCard task={task} onComplete={() => {}} onDelete={() => {}} compact />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[10px] border border-b1 bg-s1 p-4">
            <h2 className="text-[15px] font-semibold mb-3">This Week Schedule</h2>
            {weekEventsQuery.isLoading ? (
              <LoadingSkeleton rows={4} card={false} />
            ) : (weekEventsQuery.data ?? []).length === 0 ? (
              <EmptyState title="No events scheduled" description="Add events from the Schedule page." />
            ) : (
              <div className="space-y-2">
                {(weekEventsQuery.data ?? []).slice(0, 6).map((event) => (
                  <div key={event.id} className="rounded-[7px] border border-b1 bg-s2/50 px-3 py-2 flex items-center justify-between">
                    <div>
                      <p className="text-[12px] text-tx">{event.title}</p>
                      <p className="text-[10px] text-tx3 font-mono">{format(parseISO(event.date), "EEE, MMM d")}</p>
                    </div>
                    <CalendarDays className="w-3.5 h-3.5 text-tx3" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[10px] border border-b1 bg-s1 p-4">
            <h2 className="text-[15px] font-semibold mb-2">XP Progress</h2>
            <p className="text-[12px] text-tx2 mb-2">Level {stats.level}</p>
            <Progress value={xpProgress} className="h-2 bg-s2 border border-b1" />
            <p className="mt-2 text-[11px] text-tx3 font-mono">{xpToNext} XP to next level</p>
          </div>

          <div className="rounded-[10px] border border-b1 bg-s1 p-4">
            <h2 className="text-[15px] font-semibold mb-3">Weekly Leaderboard</h2>
            <div className="space-y-2">
              {(leaderboardQuery.data ?? []).map((entry) => (
                <div key={entry.user_id} className="flex items-center justify-between rounded-[7px] border border-b1 bg-s2/40 px-3 py-2">
                  <div>
                    <p className="text-[12px] text-tx">{entry.rank}. {entry.name}</p>
                    <p className="text-[10px] text-tx3 font-mono">Lv.{entry.level}</p>
                  </div>
                  <p className="text-[12px] text-blue-300 font-mono">{entry.xp}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[10px] border border-b1 bg-s1 p-4">
            <h2 className="text-[15px] font-semibold mb-1">Daily Digest</h2>
            <p className="text-[12px] text-tx2">AI digest coming soon.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
