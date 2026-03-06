import { Bolt, Cpu, Shell } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProviderBadgeProps {
  provider: "groq" | "local" | "ollama"
  model: string
}

export default function ProviderBadge({ provider, model }: ProviderBadgeProps) {
  const Icon = provider === "groq" ? Bolt : provider === "local" ? Cpu : Shell
  const label = provider === "groq" ? "Groq" : provider === "local" ? "Local" : "Ollama"

  return (
    <div
      className={cn(
        "h-7 px-2.5 rounded-[7px] border text-[11px] font-mono inline-flex items-center gap-1.5",
        provider === "groq" && "bg-blue-500/10 border-blue-500/20 text-blue-300",
        provider === "local" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
        provider === "ollama" && "bg-violet-500/10 border-violet-500/20 text-violet-300"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label} · {model}
    </div>
  )
}
