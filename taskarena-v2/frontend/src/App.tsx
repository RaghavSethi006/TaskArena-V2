import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"
import { api } from "./api/client"
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

type AIConfig = {
  provider: string
  groq_key_set: boolean
  local_model_exists: boolean
  ollama_available: boolean
}

function needsAISetup(config: AIConfig): boolean {
  if (config.provider === "groq") return !config.groq_key_set
  if (config.provider === "local") return !config.local_model_exists
  if (config.provider === "ollama") return !config.ollama_available
  return true
}

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { hasSeenOnboarding, setHasSeenOnboarding, hasHydrated } = useUIStore()
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState<OnboardingStepId>("welcome")
  const [aiPrompted, setAiPrompted] = useState(false)

  useEffect(() => {
    if (!hasHydrated || hasSeenOnboarding) return
    setWizardStep("welcome")
    setShowWizard(true)
  }, [hasHydrated, hasSeenOnboarding])

  useEffect(() => {
    if (!hasHydrated) return

    let active = true
    const checkAISetup = async () => {
      try {
        const config = await api.get<AIConfig>("/profile/ai-config")
        if (!active) return
        if (hasSeenOnboarding && !aiPrompted && needsAISetup(config)) {
          setWizardStep("ai")
          setShowWizard(true)
          setAiPrompted(true)
        }
      } catch {
        // Ignore AI detection failures during startup
      }
    }

    void checkAISetup()
    return () => {
      active = false
    }
  }, [hasHydrated, hasSeenOnboarding, aiPrompted])

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
            setAiPrompted(true)
          }}
        />
      )}
    </>
  )
}

export default function App() {
  const [backendReady, setBackendReady] = useState(false)

  return (
    <QueryClientProvider client={queryClient}>
      {!backendReady && (
        <StartupScreen onReady={() => setBackendReady(true)} />
      )}
      <BrowserRouter>
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
        <Toaster position="bottom-right" theme="dark" richColors />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
