import { useEffect, useMemo, useState } from "react"
import { BookOpen } from "lucide-react"
import PageHeader from "@/components/shared/PageHeader"
import { useAIConfig, useProfile, useUpdateAIConfig, useUpdateProfile } from "@/hooks/useProfile"
import { getLevel, getNextThreshold, getPrevThreshold } from "@/lib/xp"
import { api } from "@/api/client"
import { useUIStore } from "@/stores/uiStore"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

export default function ProfilePage() {
  const profileQuery = useProfile()
  const aiConfigQuery = useAIConfig()
  const updateProfile = useUpdateProfile()
  const updateAI = useUpdateAIConfig()
  const { preferences, setPreference } = useUIStore()

  const meQuery = useQuery({
    queryKey: ["leaderboard", "me"],
    queryFn: () => api.get<{
      streak: number; tasks_completed: number; quizzes_taken: number; avg_quiz_score: number | null
    }>("/leaderboard/me"),
  })
  const me = meQuery.data

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [provider, setProvider] = useState("groq")
  const [model, setModel] = useState("")
  const [groqKey, setGroqKey] = useState("")
  const [ollamaUrl, setOllamaUrl] = useState("")

  useEffect(() => {
    if (!profileQuery.data) return
    setName(profileQuery.data.name)
    setEmail(profileQuery.data.email ?? "")
  }, [profileQuery.data])

  useEffect(() => {
    if (!aiConfigQuery.data) return
    setProvider(aiConfigQuery.data.provider)
    setModel(aiConfigQuery.data.model)
    setOllamaUrl(aiConfigQuery.data.ollama_url)
  }, [aiConfigQuery.data])

  const xp = profileQuery.data?.xp ?? 0
  const level = useMemo(() => getLevel(xp), [xp])
  const maxXp = useMemo(() => getNextThreshold(level), [level])
  const minXp = useMemo(() => getPrevThreshold(level), [level])
  const progress = ((xp - minXp) / Math.max(1, maxXp - minXp)) * 100

  return (
    <div className="animate-fadeUp">
      <PageHeader title="Profile" subtitle="Manage account, AI settings, and preferences." />
      <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-3">
        <aside className="rounded-[10px] border border-b1 bg-s1 p-4">
          <div className="w-[68px] h-[68px] rounded-[12px] bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <span className="text-[22px] font-bold text-white font-mono">{(name || "RS").slice(0, 2).toUpperCase()}</span>
          </div>
          <h3 className="mt-3 text-[16px] font-semibold">{name || "User"}</h3>
          <p className="text-[12px] text-tx2">{email || "No email set"}</p>

          <div className="mt-4">
            <p className="text-[12px] text-tx2">Lv.{level}</p>
            <div className="mt-1 h-2 rounded-full bg-s2 border border-b1 overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-tx3 font-mono">{xp} / {maxXp} XP</p>
          </div>

          {(() => {
            const badges: Array<{ label: string; earned: boolean; desc: string }> = [
              {
                label: "🔥 Streak",
                earned: (me?.streak ?? 0) >= 3,
                desc: me?.streak ?? 0 >= 3 ? `${me?.streak}d streak` : "Reach 3-day streak",
              },
              {
                label: "✅ Taskmaster",
                earned: (me?.tasks_completed ?? 0) >= 10,
                desc: me?.tasks_completed ?? 0 >= 10 ? `${me?.tasks_completed} done` : "Complete 10 tasks",
              },
              {
                label: "🧠 Scholar",
                earned: (me?.quizzes_taken ?? 0) >= 5,
                desc: me?.quizzes_taken ?? 0 >= 5 ? `${me?.quizzes_taken} quizzes` : "Take 5 quizzes",
              },
            ]

            return (
              <div className="mt-4 space-y-1.5">
                {badges.map((badge) => (
                  <div
                    key={badge.label}
                    className={`rounded-[7px] border px-2.5 py-1.5 flex items-center justify-between ${
                      badge.earned
                        ? "border-amber-500/25 bg-amber-500/10"
                        : "border-b1 bg-s2/30 opacity-40"
                    }`}
                  >
                    <span className="text-[11px] font-medium text-tx">{badge.label}</span>
                    <span className="text-[10px] text-tx3 font-mono">{badge.desc}</span>
                  </div>
                ))}
              </div>
            )
          })()}
        </aside>

        <section className="space-y-3">
          <div className="rounded-[10px] border border-b1 bg-s1 p-4">
            <h3 className="text-[13px] font-semibold mb-2">Personal Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="h-9 rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="h-9 rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none" />
            </div>
            <button
              type="button"
              onClick={async () => {
                await updateProfile.mutateAsync({ name, email: email || null })
                toast.success("Profile updated")
              }}
              className="mt-3 h-8 px-3 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600"
            >
              Save
            </button>
          </div>

          <div className="rounded-[10px] border border-b1 bg-s1 p-4">
            <h3 className="text-[13px] font-semibold mb-2">AI Model Settings</h3>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {["local", "groq", "ollama"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setProvider(opt)}
                  className={`h-8 rounded-[7px] border text-[11px] capitalize ${provider === opt ? "bg-[var(--bd)] border-blue-500/30 text-blue-300" : "bg-s2 border-b1 text-tx2 hover:bg-s3"}`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Model" className="h-9 rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none" />
              <input value={provider === "groq" ? groqKey : ollamaUrl} onChange={(e) => provider === "groq" ? setGroqKey(e.target.value) : setOllamaUrl(e.target.value)} placeholder={provider === "groq" ? "Groq API key" : "Ollama URL"} className="h-9 rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none" />
            </div>
            <button
              type="button"
              onClick={async () => {
                await updateAI.mutateAsync({ provider, model, groq_api_key: groqKey || undefined, ollama_url: ollamaUrl || undefined })
                toast.success("AI settings saved")
              }}
              className="mt-3 h-8 px-3 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600"
            >
              Save AI Settings
            </button>
            {aiConfigQuery.data ? (
              <p className="mt-2 text-[11px] text-tx3">
                Groq key: {aiConfigQuery.data.groq_key_set ? "set" : "missing"} · Local model: {aiConfigQuery.data.local_model_exists ? "found" : "missing"} · Ollama: {aiConfigQuery.data.ollama_available ? "available" : "offline"}
              </p>
            ) : null}
          </div>

          <div className="rounded-[10px] border border-b1 bg-s1 p-4">
            <h3 className="text-[13px] font-semibold mb-3">Preferences</h3>
            <div className="space-y-3">
              {([
                { key: "notifications" as const, label: "Notifications", desc: "Desktop alerts for deadlines" },
                { key: "soundEffects" as const, label: "Sound Effects", desc: "Audio feedback on actions" },
                { key: "autoIndexFiles" as const, label: "Auto-index Files", desc: "Index new files automatically on upload" },
              ]).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] text-tx font-medium">{label}</p>
                    <p className="text-[10px] text-tx3">{desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreference(key, !preferences[key])}
                    className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
                      preferences[key] ? "bg-blue-500" : "bg-s3 border border-b1"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-1 ${
                        preferences[key] ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[10px] border border-b1 bg-s1 p-4">
            <h3 className="text-[13px] font-semibold mb-1">Help & Onboarding</h3>
            <p className="text-[11px] text-tx3 mb-3">
              Replay the setup wizard and feature tour at any time.
            </p>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("restart-tutorial"))}
              className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-[12px] text-tx2 hover:bg-s3 transition-colors inline-flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Restart Tutorial
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
