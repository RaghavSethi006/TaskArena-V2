import {
  BookOpen,
  Brain,
  Calendar,
  Check,
  CheckSquare,
  ChevronRight,
  Cpu,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useCreateCourse } from "@/hooks/useNotes"
import { useCreateTask } from "@/hooks/useTasks"
import { useUpdateProfile, useUpdateAIConfig } from "@/hooks/useProfile"
import { useUIStore } from "@/stores/uiStore"
import AppLogo from "@/components/branding/AppLogo"
import { cn } from "@/lib/utils"

const COURSE_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f97316",
  "#10b981", "#eab308", "#ef4444", "#06b6d4",
]

// ─── Step definitions ──────────────────────────────────────────────────────

const STEPS = [
  { id: "welcome", title: "Welcome to TaskArena" },
  { id: "profile", title: "What's your name?" },
  { id: "ai", title: "Set up your AI" },
  { id: "course", title: "Create your first course" },
  { id: "task", title: "Add your first task" },
  { id: "tour", title: "Quick tour" },
  { id: "done", title: "You're all set!" },
] as const

export type OnboardingStepId = typeof STEPS[number]["id"]

// ─── Tour slide content ────────────────────────────────────────────────────

const TOUR_SLIDES = [
  {
    icon: <CheckSquare className="w-6 h-6 text-blue-400" />,
    title: "Tasks",
    desc: "Add assignments, study sessions, and productivity tasks. Complete them to earn XP and level up.",
    path: "/tasks",
  },
  {
    icon: <Calendar className="w-6 h-6 text-emerald-400" />,
    title: "Smart Schedule",
    desc: "See your week at a glance. The AI can suggest study blocks around your deadlines automatically.",
    path: "/schedule",
  },
  {
    icon: <BookOpen className="w-6 h-6 text-violet-400" />,
    title: "Study Library",
    desc: "Upload your PDFs, notes, and lecture slides. Index them so the AI can search your actual content.",
    path: "/notes",
  },
  {
    icon: <MessageSquare className="w-6 h-6 text-rose-400" />,
    title: "AI Tutor",
    desc: "Ask questions and get answers grounded in your own indexed notes — not just generic AI responses.",
    path: "/chat",
  },
  {
    icon: <Brain className="w-6 h-6 text-amber-400" />,
    title: "Study Hub",
    desc: "Generate quizzes, study notes, formula sheets, and practice exams directly from your course files.",
    path: "/study-hub",
  },
  {
    icon: <Trophy className="w-6 h-6 text-yellow-400" />,
    title: "Leaderboard & Lobbies",
    desc: "Compete with friends by creating a lobby and sharing the join code. Completely optional.",
    path: "/leaderboard",
  },
]

// ─── Main component ────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  onClose: () => void
  initialStep?: OnboardingStepId
}

export default function OnboardingWizard({ onClose, initialStep }: OnboardingWizardProps) {
  const navigate = useNavigate()
  const { setHasSeenOnboarding } = useUIStore()

  const [step, setStep] = useState<OnboardingStepId>(initialStep ?? "welcome")
  const [saving, setSaving] = useState(false)
  // Step state
  const [name, setName] = useState("")
  const [provider, setProvider] = useState<"groq" | "local" | "ollama">("groq")
  const [groqKey, setGroqKey] = useState("")
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434")
  const [courseName, setCourseName] = useState("")
  const [courseCode, setCourseCode] = useState("")
  const [courseColor, setCourseColor] = useState("#3b82f6")
  const [taskTitle, setTaskTitle] = useState("")
  const [taskDeadline, setTaskDeadline] = useState("")

  const updateProfile = useUpdateProfile()
  const updateAIConfig = useUpdateAIConfig()
  const createCourse = useCreateCourse()
  const createTask = useCreateTask()

  const nameInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (step === "profile") setTimeout(() => nameInputRef.current?.focus(), 80)
  }, [step])

  useEffect(() => {
    if (initialStep) setStep(initialStep)
  }, [initialStep])

  const finish = () => {
    setHasSeenOnboarding(true)
    onClose()
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step)
  const progress = (stepIndex / (STEPS.length - 1)) * 100

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleProfileNext = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await updateProfile.mutateAsync({ name: name.trim() })
      setStep("ai")
    } finally {
      setSaving(false)
    }
  }

  const handleAINext = async () => {
    setSaving(true)
    try {
      if (provider === "groq" && groqKey.trim()) {
        await updateAIConfig.mutateAsync({
          provider: "groq",
          model: "llama-3.3-70b-versatile",
          groq_api_key: groqKey.trim(),
        })
      } else if (provider === "ollama") {
        await updateAIConfig.mutateAsync({
          provider: "ollama",
          model: "qwen2.5:7b",
          ollama_url: ollamaUrl.trim(),
        })
      } else if (provider === "local") {
        await updateAIConfig.mutateAsync({
          provider: "local",
          model: "qwen2.5-7b",
        })
      }
      setStep("course")
    } finally {
      setSaving(false)
    }
  }

  const handleCourseNext = async () => {
    if (!courseName.trim()) {
      setStep("task")
      return
    }
    setSaving(true)
    try {
      await createCourse.mutateAsync({
        name: courseName.trim(),
        code: courseCode.trim() || undefined,
        color: courseColor,
      })
      setStep("task")
    } finally {
      setSaving(false)
    }
  }

  const handleTaskNext = async () => {
    if (!taskTitle.trim()) {
      setStep("tour")
      return
    }
    setSaving(true)
    try {
      await createTask.mutateAsync({
        title: taskTitle.trim(),
        type: "assignment",
        deadline: taskDeadline || undefined,
        points: 10,
      })
      setStep("tour")
    } finally {
      setSaving(false)
    }
  }

  const handleTourNavigate = (path: string) => {
    finish()
    navigate(path)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-[3px]">
      <div className="w-full max-w-[480px] mx-4 rounded-[16px] border border-b2 bg-s1 shadow-[0_32px_80px_rgba(0,0,0,.9)] overflow-hidden animate-fadeUp">

        {/* Progress bar */}
        {step !== "welcome" && step !== "done" && (
          <div className="h-0.5 bg-s2">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* ── WELCOME ── */}
        {step === "welcome" && (
          <div className="p-8 text-center">
              <AppLogo className="mx-auto mb-5 h-16 w-16" imageClassName="p-2" />
            <h1 className="text-[22px] font-bold text-tx mb-2">Welcome to TaskArena</h1>
            <p className="text-[13px] text-tx2 leading-relaxed mb-2">
              Your personal study OS. Manage tasks, index your notes, chat with an AI tutor that
              actually knows your material, and compete with friends.
            </p>
            <p className="text-[12px] text-tx3 mb-6">
              Takes about 2 minutes to set up.
            </p>
            <button
              type="button"
              onClick={() => setStep("profile")}
              className="w-full h-10 rounded-[9px] bg-blue-500 text-white text-[13px] font-medium hover:bg-blue-600 transition-colors inline-flex items-center justify-center gap-2"
            >
              Get started <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={finish}
              className="mt-2 w-full h-8 text-[11px] text-tx3 hover:text-tx2 transition-colors"
            >
              Skip setup — I'll configure it myself
            </button>
          </div>
        )}

        {/* ── PROFILE ── */}
        {step === "profile" && (
          <div className="p-6">
            <StepHeader step={2} total={5} title="What should we call you?" />
            <p className="text-[12px] text-tx3 mb-4">
              This shows on your dashboard, profile, and leaderboard.
            </p>
            <input
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) void handleProfileNext()
              }}
              placeholder="Your name"
              className="h-10 w-full rounded-[8px] border border-b1 bg-s2 px-3 text-[13px] text-tx outline-none focus:border-blue-500/50 transition-colors"
            />
            <StepFooter
              onBack={() => setStep("welcome")}
              onNext={() => void handleProfileNext()}
              nextDisabled={!name.trim() || saving}
              saving={saving}
              nextLabel="Continue"
            />
          </div>
        )}

        {/* ── AI SETUP ── */}
        {step === "ai" && (
          <div className="p-6">
            <StepHeader step={3} total={5} title="Set up your AI provider" />
            <p className="text-[12px] text-tx3 mb-4">
              TaskArena uses AI for tutoring, quizzes, and schedule suggestions.
              You can change this any time in Profile.
            </p>

            <div className="flex gap-2 mb-4">
              {([
                { id: "groq", label: "Groq", sub: "Free API · Recommended", icon: <Zap className="w-4 h-4" /> },
                { id: "local", label: "Local", sub: "Built-in model", icon: <Cpu className="w-4 h-4" /> },
                { id: "ollama", label: "Ollama", sub: "Self-hosted", icon: <Cpu className="w-4 h-4" /> },
              ] as const).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setProvider(opt.id)}
                  className={cn(
                    "flex-1 rounded-[8px] border p-2.5 text-left transition-colors",
                    provider === opt.id
                      ? "border-blue-500/40 bg-[var(--bd)]"
                      : "border-b1 bg-s2 hover:bg-s3"
                  )}
                >
                  <div className={cn("mb-1", provider === opt.id ? "text-blue-300" : "text-tx3")}>
                    {opt.icon}
                  </div>
                  <p className="text-[12px] font-medium text-tx">{opt.label}</p>
                  <p className="text-[10px] text-tx3">{opt.sub}</p>
                </button>
              ))}
            </div>

            {provider === "groq" && (
              <div className="space-y-2">
                <div className="rounded-[8px] border border-amber-500/20 bg-amber-500/8 px-3 py-2.5">
                  <p className="text-[11px] text-amber-300 font-medium">Get your free Groq API key</p>
                  <p className="text-[10px] text-tx3 mt-0.5">
                    Visit{" "}
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 underline inline-flex items-center gap-0.5"
                    >
                      console.groq.com/keys <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    {" "}— free tier is more than enough for daily use.
                  </p>
                </div>
                <input
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  type="password"
                  className="h-9 w-full rounded-[8px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none font-mono focus:border-blue-500/50 transition-colors"
                />
                <p className="text-[10px] text-tx3">
                  Stored locally on your device. Never sent anywhere except Groq's API.
                </p>
              </div>
            )}

            {provider === "ollama" && (
              <div className="space-y-2">
                <p className="text-[11px] text-tx3">Ollama server URL:</p>
                <input
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="h-9 w-full rounded-[8px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none font-mono"
                />
              </div>
            )}

            {provider === "local" && (
              <div className="rounded-[8px] border border-b1 bg-s2/40 px-3 py-2.5">
                <p className="text-[11px] text-tx2">Uses the bundled local model.</p>
                <p className="text-[10px] text-tx3 mt-0.5">No internet needed. Slower than Groq but fully private.</p>
              </div>
            )}

            <StepFooter
              onBack={() => setStep("profile")}
              onNext={() => void handleAINext()}
              nextDisabled={saving || (provider === "groq" && !groqKey.trim())}
              saving={saving}
              nextLabel="Save & Continue"
              skipLabel="Skip for now"
              onSkip={() => setStep("course")}
            />
          </div>
        )}

        {/* ── COURSE ── */}
        {step === "course" && (
          <div className="p-6">
            <StepHeader step={4} total={5} title="Create your first course" />
            <p className="text-[12px] text-tx3 mb-4">
              Courses group your notes and files. You can always add more later.
            </p>

            <div className="space-y-2">
              <input
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="e.g. Organic Chemistry"
                className="h-9 w-full rounded-[8px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none focus:border-blue-500/50 transition-colors"
              />
              <input
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="Course code (optional, e.g. CHEM201)"
                className="h-9 w-full rounded-[8px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none focus:border-blue-500/50 transition-colors"
              />
              <div>
                <p className="text-[11px] text-tx3 mb-1.5">Pick a colour</p>
                <div className="flex gap-2 flex-wrap">
                  {COURSE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCourseColor(color)}
                      className={cn(
                        "w-7 h-7 rounded-full transition-transform",
                        courseColor === color && "ring-2 ring-offset-2 ring-offset-s1 ring-white scale-110"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <StepFooter
              onBack={() => setStep("ai")}
              onNext={() => void handleCourseNext()}
              nextDisabled={saving}
              saving={saving}
              nextLabel={courseName.trim() ? "Create & Continue" : "Skip"}
              skipLabel="Skip"
              onSkip={() => setStep("task")}
            />
          </div>
        )}

        {/* ── TASK ── */}
        {step === "task" && (
          <div className="p-6">
            <StepHeader step={5} total={5} title="Add your first task" />
            <p className="text-[12px] text-tx3 mb-4">
              Tasks earn you XP when completed. Start with something due soon.
            </p>

            <div className="space-y-2">
              <input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Submit lab report"
                className="h-9 w-full rounded-[8px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none focus:border-blue-500/50 transition-colors"
              />
              <div>
                <p className="text-[11px] text-tx3 mb-1">Deadline (optional)</p>
                <input
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                  type="date"
                  className="h-9 w-full rounded-[8px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
            </div>

            <StepFooter
              onBack={() => setStep("course")}
              onNext={() => void handleTaskNext()}
              nextDisabled={saving}
              saving={saving}
              nextLabel={taskTitle.trim() ? "Add & Continue" : "Skip"}
              skipLabel="Skip"
              onSkip={() => setStep("tour")}
            />
          </div>
        )}

        {/* ── TOUR ── */}
        {step === "tour" && (
          <div className="p-6">
            <p className="text-[11px] font-mono text-tx3 uppercase tracking-wide mb-3">Quick Tour</p>
            <div className="space-y-2">
              {TOUR_SLIDES.map((slide) => (
                <button
                  key={slide.path}
                  type="button"
                  onClick={() => handleTourNavigate(slide.path)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-[9px] border px-3 py-2.5 text-left transition-colors",
                    "border-b1 bg-s2/40 hover:bg-s2 hover:border-b2 group"
                  )}
                >
                  <div className="w-9 h-9 rounded-[8px] bg-s1 border border-b1 flex items-center justify-center flex-shrink-0 group-hover:border-b2 transition-colors">
                    {slide.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-tx">{slide.title}</p>
                    <p className="text-[10px] text-tx3 leading-snug mt-0.5">{slide.desc}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-tx3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep("done")}
              className="mt-4 w-full h-9 rounded-[8px] bg-blue-500 text-white text-[12px] font-medium hover:bg-blue-600 transition-colors"
            >
              Continue to Dashboard →
            </button>
          </div>
        )}

        {/* ── DONE ── */}
        {step === "done" && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-5">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-[20px] font-bold text-tx mb-2">You're all set!</h2>
            <p className="text-[12px] text-tx3 leading-relaxed mb-1">
              {name ? `Welcome aboard, ${name.split(" ")[0]}.` : "Welcome aboard."} Here's a quick reminder:
            </p>
            <div className="mt-4 space-y-1.5 text-left mb-6">
              {[
                "Upload notes in Library → index them → AI Tutor uses them",
                "Complete tasks to earn XP and level up",
                "Generate quizzes from your files in Study Hub",
                "Find this guide again in Profile → Restart Tutorial",
              ].map((tip) => (
                <div key={tip} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-tx2">{tip}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={finish}
              className="w-full h-10 rounded-[9px] bg-gradient-to-r from-blue-500 to-violet-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Start using TaskArena
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Shared sub-components ─────────────────────────────────────────────────

function StepHeader({ step, total, title }: { step: number; total: number; title: string }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-mono text-tx3 uppercase tracking-wide mb-1">
        Step {step} of {total}
      </p>
      <h2 className="text-[16px] font-bold text-tx">{title}</h2>
    </div>
  )
}

function StepFooter({
  onBack,
  onNext,
  nextDisabled,
  saving,
  nextLabel,
  skipLabel,
  onSkip,
}: {
  onBack?: () => void
  onNext: () => void
  nextDisabled?: boolean
  saving?: boolean
  nextLabel: string
  skipLabel?: string
  onSkip?: () => void
}) {
  return (
    <div className="mt-5 flex items-center gap-2">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="h-9 px-3 rounded-[8px] border border-b1 bg-s2 text-[12px] text-tx2 hover:bg-s3 transition-colors"
        >
          Back
        </button>
      )}
      <div className="flex-1" />
      {skipLabel && onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="h-9 px-3 text-[12px] text-tx3 hover:text-tx2 transition-colors"
        >
          {skipLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="h-9 px-4 rounded-[8px] bg-blue-500 text-white text-[12px] font-medium hover:bg-blue-600 disabled:opacity-40 transition-colors inline-flex items-center gap-1.5"
      >
        {saving ? "Saving…" : nextLabel}
        {!saving && <ChevronRight className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}
