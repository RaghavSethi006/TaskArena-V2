import {
  BarChart2,
  BookOpen,
  Brain,
  CalendarDays,
  CheckSquare,
  Home,
  MessageSquare,
  Search,
  Trophy,
  User,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"

interface Command {
  label: string
  path: string
  icon: React.ReactNode
  keywords: string[]
}

const COMMANDS: Command[] = [
  { label: "Dashboard",   path: "/",           icon: <Home className="w-4 h-4" />,        keywords: ["home", "overview"] },
  { label: "Tasks",       path: "/tasks",       icon: <CheckSquare className="w-4 h-4" />, keywords: ["todo", "assignment", "work"] },
  { label: "Schedule",    path: "/schedule",    icon: <CalendarDays className="w-4 h-4" />,keywords: ["calendar", "events", "plan"] },
  { label: "AI Tutor",    path: "/chat",        icon: <MessageSquare className="w-4 h-4" />,keywords: ["chat", "ai", "ask", "tutor"] },
  { label: "Library",     path: "/notes",       icon: <BookOpen className="w-4 h-4" />,    keywords: ["notes", "files", "courses"] },
  { label: "Study Hub",   path: "/study-hub",   icon: <Brain className="w-4 h-4" />,       keywords: ["quiz", "flashcard", "study"] },
  { label: "Statistics",  path: "/stats",       icon: <BarChart2 className="w-4 h-4" />,   keywords: ["stats", "analytics", "progress"] },
  { label: "Leaderboard", path: "/leaderboard", icon: <Trophy className="w-4 h-4" />,      keywords: ["rank", "compete", "lobby"] },
  { label: "Profile",     path: "/profile",     icon: <User className="w-4 h-4" />,        keywords: ["settings", "account"] },
]

const RECENT_KEY = "taskarena.recentPages"
const MAX_RECENTS = 5
const COMMAND_MAP = new Map(COMMANDS.map((cmd) => [cmd.path, cmd]))

const normalizePath = (path: string) => (path.startsWith("/chat") ? "/chat" : path)

const readRecentPaths = () => {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((p) => typeof p === "string")
  } catch {
    return []
  }
}

const writeRecentPaths = (paths: string[]) => {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(paths))
  } catch {
    // no-op
  }
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("")
  const [activeIdx, setActiveIdx] = useState(0)
  const [recentPaths, setRecentPaths] = useState<string[]>([])
  const navigate = useNavigate()
  const location = useLocation()
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query.trim()
    ? COMMANDS.filter((cmd) => {
        const q = query.toLowerCase()
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.keywords.some((k) => k.includes(q))
        )
      })
    : COMMANDS

  const recentCommands = recentPaths
    .map((path) => COMMAND_MAP.get(path))
    .filter((cmd): cmd is Command => Boolean(cmd))
  const recentSet = new Set(recentCommands.map((cmd) => cmd.path))
  const displayCommands = query.trim()
    ? filtered
    : recentCommands.length > 0
      ? [...recentCommands, ...COMMANDS.filter((cmd) => !recentSet.has(cmd.path))]
      : COMMANDS

  useEffect(() => {
    setActiveIdx(0)
  }, [query, recentPaths])

  useEffect(() => {
    if (open) {
      setQuery("")
      setTimeout(() => inputRef.current?.focus(), 10)
      setRecentPaths(readRecentPaths())
    }
  }, [open])

  useEffect(() => {
    const path = normalizePath(location.pathname)
    if (!COMMAND_MAP.has(path)) return
    const current = readRecentPaths()
    const next = [path, ...current.filter((p) => p !== path)].slice(0, MAX_RECENTS)
    writeRecentPaths(next)
    setRecentPaths(next)
  }, [location.pathname])

  const go = (path: string) => {
    navigate(path)
    onClose()
    setQuery("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, displayCommands.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      const cmd = displayCommands[activeIdx]
      if (cmd) go(cmd.path)
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      <div
        className="relative w-full max-w-[480px] mx-4 rounded-[12px] border border-b2 bg-s1 shadow-[0_24px_64px_rgba(0,0,0,.8)] overflow-hidden animate-fadeUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-b1">
          <Search className="w-4 h-4 text-tx3 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Go to page…"
            className="flex-1 bg-transparent text-[13px] text-tx placeholder:text-tx3 outline-none"
          />
          <kbd className="text-[10px] font-mono text-tx3 bg-s2 border border-b1 rounded-[4px] px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        <div className="py-1.5 max-h-[320px] overflow-y-auto">
          {displayCommands.length === 0 ? (
            <p className="text-[12px] text-tx3 text-center py-6">No results for "{query}"</p>
          ) : (
            displayCommands.map((cmd, idx) => (
              <button
                key={cmd.path}
                type="button"
                onClick={() => go(cmd.path)}
                onMouseEnter={() => setActiveIdx(idx)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                  idx === activeIdx ? "bg-s2 text-tx" : "text-tx2 hover:bg-s2/50"
                )}
              >
                <span className={cn(
                  "w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0",
                  idx === activeIdx ? "bg-blue-500/20 text-blue-300" : "bg-s2 text-tx3"
                )}>
                  {cmd.icon}
                </span>
                <span className="text-[13px] font-medium">{cmd.label}</span>
                {idx === activeIdx && (
                  <kbd className="ml-auto text-[10px] font-mono text-tx3 bg-s1 border border-b1 rounded-[4px] px-1.5 py-0.5">
                    ↵
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-b1 flex items-center gap-3 text-[10px] text-tx3 font-mono">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>ESC close</span>
        </div>
      </div>
    </div>
  )
}
