import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"
import AppShell from "./components/layout/AppShell"
import ChatbotPage from "./pages/ChatbotPage"
import DashboardPage from "./pages/DashboardPage"
import LeaderboardPage from "./pages/LeaderboardPage"
import NotesPage from "./pages/NotesPage"
import ProfilePage from "./pages/ProfilePage"
import SchedulePage from "./pages/SchedulePage"
import StatsPage from "./pages/StatsPage"
import StudyHubPage from "./pages/StudyHubPage"
import TasksPage from "./pages/TasksPage"
import { useToolsStore } from "./stores/toolsStore"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
})

function GlobalTimerEffect() {
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useToolsStore.getState()
      if (state.pomodoro.running) state.pomodoroTick()
      if (state.stopwatch.running) state.stopwatchTick()
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <GlobalTimerEffect />
        <AppShell>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/chat" element={<ChatbotPage />} />
            <Route path="/chat/:id" element={<ChatbotPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/study-hub" element={<StudyHubPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </AppShell>
        <Toaster position="bottom-right" theme="dark" richColors />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
