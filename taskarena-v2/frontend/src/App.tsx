import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"
import AppShell from "./components/layout/AppShell"
import OnboardingWizard, { type OnboardingStepId } from "./components/layout/OnboardingWizard"
import StartupScreen from "./components/layout/StartupScreen"
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
import { useUIStore } from "./stores/uiStore"

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

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const setHasSeenOnboarding = useUIStore((state) => state.setHasSeenOnboarding)
  const hasHydrated = useUIStore((state) => state.hasHydrated)
  const showStartupTutorial = useUIStore((state) => state.preferences.showStartupTutorial)
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState<OnboardingStepId>("welcome")

  useEffect(() => {
    if (!hasHydrated || !showStartupTutorial) return
    setWizardStep("welcome")
    setShowWizard(true)
  }, [hasHydrated, showStartupTutorial])

  // Also listen for the "restart-tutorial" custom event fired from ProfilePage
  useEffect(() => {
    const handler = () => {
      setWizardStep("welcome")
      setShowWizard(true)
    }
    window.addEventListener("restart-tutorial", handler)
    return () => window.removeEventListener("restart-tutorial", handler)
  }, [])

  return (
    <>
      {children}
      {showWizard && (
        <OnboardingWizard
          initialStep={wizardStep}
          onClose={() => {
            setHasSeenOnboarding(true)
            setShowWizard(false)
            setWizardStep("welcome")
          }}
        />
      )}
    </>
  )
}

function AppearanceEffect() {
  const colorMode = useUIStore((state) => state.appearance.colorMode)
  const theme = useUIStore((state) => state.appearance.theme)
  const surfaceStyle = useUIStore((state) => state.appearance.surfaceStyle)
  const reducedMotion = useUIStore((state) => state.appearance.reducedMotion)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.colorMode = colorMode
    root.dataset.theme = theme
    root.dataset.surface = surfaceStyle
    root.dataset.motion = reducedMotion ? "reduced" : "full"
  }, [colorMode, theme, surfaceStyle, reducedMotion])

  return null
}

export default function App() {
  const [backendReady, setBackendReady] = useState(false)
  const colorMode = useUIStore((state) => state.appearance.colorMode)

  return (
    <QueryClientProvider client={queryClient}>
      {!backendReady && (
        <StartupScreen onReady={() => setBackendReady(true)} />
      )}
      <BrowserRouter>
        <AppearanceEffect />
        <GlobalTimerEffect />
        {backendReady && (
          <OnboardingGate>
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
          </OnboardingGate>
        )}
        <Toaster position="bottom-right" theme={colorMode === "light" ? "light" : "dark"} richColors />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
