import { useEffect, useMemo, useState } from "react"
import PageHeader from "@/components/shared/PageHeader"
import { useAIConfig, useProfile, useUpdateAIConfig, useUpdateProfile } from "@/hooks/useProfile"
import { toast } from "sonner"

const THRESHOLDS = [0, 100, 250, 500, 850, 1300, 1900, 2700, 3700, 5000]

function getLevel(xp: number) {
  for (let i = THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (xp >= THRESHOLDS[i]) return i + 1
  }
  return 1
}

function nextThreshold(level: number) {
  return level <= 9 ? THRESHOLDS[level] : THRESHOLDS[9] + (level - 9) * 700
}

export default function ProfilePage() {
  const profileQuery = useProfile()
  const aiConfigQuery = useAIConfig()
  const updateProfile = useUpdateProfile()
  const updateAI = useUpdateAIConfig()

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
  const maxXp = useMemo(() => nextThreshold(level), [level])
  const minXp = useMemo(() => THRESHOLDS[Math.max(0, level - 1)] ?? 0, [level])
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

          <div className="mt-4 grid grid-cols-3 gap-1">
            {["FOCUS", "STREAK", "QUIZ"].map((badge) => (
              <div key={badge} className="h-8 rounded-[7px] border border-b1 bg-s2/40 text-[9px] text-tx3 font-mono flex items-center justify-center">
                {badge}
              </div>
            ))}
          </div>
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
            <h3 className="text-[13px] font-semibold mb-2">Preferences</h3>
            <div className="space-y-2 text-[12px] text-tx2">
              <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Notifications</label>
              <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Sound effects</label>
              <label className="flex items-center gap-2"><input type="checkbox" /> Auto-index files</label>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
