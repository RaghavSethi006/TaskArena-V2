import { Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface MessageBubbleProps {
  role: "user" | "assistant"
  content: string
  sources?: string[]
  isStreaming?: boolean
}

export default function MessageBubble({ role, content, sources = [], isStreaming = false }: MessageBubbleProps) {
  const user = role === "user"

  return (
    <div className={cn("flex gap-2", user ? "justify-end" : "justify-start")}>
      {!user ? (
        <div className="w-6 h-6 rounded-[6px] bg-s2 border border-b1 flex items-center justify-center mt-0.5">
          <Bot className="w-3.5 h-3.5 text-violet-300" />
        </div>
      ) : null}

      <div className={cn("max-w-[78%] rounded-[10px] border px-3 py-2", user ? "bg-blue-500 border-blue-500 text-white" : "bg-s1 border-b1 text-tx")}>
        <p className="text-[12.5px] whitespace-pre-wrap break-words">
          {content}
          {isStreaming ? <span className="inline-block w-1.5 h-4 ml-0.5 align-middle bg-tx3 animate-pulse" /> : null}
        </p>
        {!user && sources.length > 0 ? (
          <div className="mt-2 space-y-0.5">
            {sources.map((source) => (
              <p key={source} className="text-[10px] text-tx3 font-mono">Source: {source}</p>
            ))}
          </div>
        ) : null}
      </div>

      {user ? (
        <div className="w-6 h-6 rounded-[6px] bg-blue-500/20 border border-blue-500/20 flex items-center justify-center mt-0.5">
          <User className="w-3.5 h-3.5 text-blue-200" />
        </div>
      ) : null}
    </div>
  )
}
