import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface MessageBubbleProps {
  role: "user" | "assistant"
  content: string
  sources?: string[]
  isStreaming?: boolean
}

export default function MessageBubble({
  role,
  content,
  sources = [],
  isStreaming = false,
}: MessageBubbleProps) {
  const user = role === "user"

  return (
    <div className={cn("flex gap-2", user ? "justify-end" : "justify-start")}>
      {!user ? (
        <div className="w-6 h-6 rounded-[6px] bg-s2 border border-b1 flex items-center justify-center mt-0.5 flex-shrink-0">
          <Bot className="w-3.5 h-3.5 text-violet-300" />
        </div>
      ) : null}

      <div
        className={cn(
          "max-w-[78%] rounded-[10px] border px-3 py-2",
          user ? "bg-blue-500 border-blue-500 text-white" : "bg-s1 border-b1 text-tx"
        )}
      >
        {user ? (
          <p className="text-[12.5px] whitespace-pre-wrap break-words">{content}</p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none text-[12.5px] break-words
            [&_p]:leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0
            [&_h1]:text-[15px] [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1
            [&_h2]:text-[14px] [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1
            [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1
            [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_ul]:space-y-0.5
            [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2 [&_ol]:space-y-0.5
            [&_li]:leading-relaxed
            [&_code]:font-mono [&_code]:text-[11px] [&_code]:bg-s2 [&_code]:border [&_code]:border-b1 [&_code]:rounded-[4px] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-violet-300
            [&_pre]:bg-s2 [&_pre]:border [&_pre]:border-b1 [&_pre]:rounded-[8px] [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:mb-2
            [&_pre_code]:bg-transparent [&_pre_code]:border-0 [&_pre_code]:p-0 [&_pre_code]:text-tx2
            [&_blockquote]:border-l-2 [&_blockquote]:border-blue-500/40 [&_blockquote]:pl-3 [&_blockquote]:text-tx3 [&_blockquote]:italic [&_blockquote]:mb-2
            [&_strong]:font-semibold [&_strong]:text-tx
            [&_em]:italic [&_em]:text-tx2
            [&_a]:text-blue-400 [&_a]:underline [&_a]:underline-offset-2
            [&_hr]:border-b1 [&_hr]:my-3
            [&_table]:w-full [&_table]:text-[11px] [&_table]:border-collapse [&_table]:mb-2
            [&_th]:border [&_th]:border-b1 [&_th]:bg-s2 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold
            [&_td]:border [&_td]:border-b1 [&_td]:px-2 [&_td]:py-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            {isStreaming ? (
              <span className="inline-block w-1.5 h-4 ml-0.5 align-middle bg-tx3 animate-pulse" />
            ) : null}
          </div>
        )}

        {!user && sources.length > 0 ? (
          <div className="mt-2 space-y-0.5 border-t border-b1 pt-2">
            {sources.map((source) => (
              <p key={source} className="text-[10px] text-tx3 font-mono">
                Source: {source}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      {user ? (
        <div className="w-6 h-6 rounded-[6px] bg-blue-500/20 border border-blue-500/20 flex items-center justify-center mt-0.5 flex-shrink-0">
          <User className="w-3.5 h-3.5 text-blue-200" />
        </div>
      ) : null}
    </div>
  )
}
