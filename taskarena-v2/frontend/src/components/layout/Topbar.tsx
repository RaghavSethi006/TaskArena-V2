import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  User,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { TOOL_DEFINITIONS } from "@/components/layout/toolRegistry"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useProfile } from "@/hooks/useProfile"
import { cn } from "@/lib/utils"
import type { ToolId } from "@/stores/toolsStore"
import { useToolsStore } from "@/stores/toolsStore"
import { useUIStore } from "@/stores/uiStore"

interface ToolIconProps {
  id: ToolId
  icon: LucideIcon
  label: string
}

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/tasks": "Tasks",
  "/chat": "AI Tutor",
  "/schedule": "Schedule",
  "/notes": "Library",
  "/study-hub": "Study Hub",
  "/leaderboard": "Leaderboard",
  "/stats": "Statistics",
  "/profile": "Profile",
}

function ToolIcon({ id, icon: Icon, label }: ToolIconProps) {
  const { tools, openTool, closeTool } = useToolsStore()
  const pomodoroRunning = useToolsStore((s) => s.pomodoro.running)
  const stopwatchRunning = useToolsStore((s) => s.stopwatch.running)
  const state = tools[id].state
  const isRunning = (id === "pomodoro" && pomodoroRunning) || (id === "stopwatch" && stopwatchRunning)

  const handleClick = () => {
    if (state === "closed") openTool(id, "docked")
    else closeTool(id)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleClick}
          className={cn(
            "w-[30px] h-[30px] rounded-[6px] flex items-center justify-center relative transition-colors duration-[120ms]",
            "hover:bg-s2",
            state === "docked" && "text-blue-400",
            state === "floating" && "text-violet-400",
            state === "closed" && "text-tx3"
          )}
          type="button"
        >
          <Icon className="w-[14px] h-[14px]" />
          {state !== "closed" && (
            <span
              className={cn(
                "absolute bottom-[3px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                state === "docked" && "bg-blue-400",
                state === "floating" && "bg-violet-400"
              )}
            />
          )}
          {isRunning && state === "closed" && (
            <span className="absolute inset-0 rounded-[6px] border border-amber-400/40 animate-ping" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-[11px]">
        {label} {state !== "closed" ? `(${state})` : ""}
      </TooltipContent>
    </Tooltip>
  )
}

export default function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { toggleSidebar } = useUIStore()
  const profileQuery = useProfile()
  const initials = (profileQuery.data?.name ?? "??").slice(0, 2).toUpperCase()

  const title = useMemo(() => {
    if (location.pathname.startsWith("/chat")) return "AI Tutor"
    return TITLES[location.pathname] ?? "TaskArena"
  }, [location.pathname])

  return (
    <header className="h-[50px] bg-s1 border-b border-b1 flex items-center px-3 md:px-4 gap-2">
      <button
        onClick={toggleSidebar}
        className="w-[30px] h-[30px] rounded-[6px] border border-b1 text-tx3 hover:bg-s2 transition-colors md:hidden"
        type="button"
      >
        <Menu className="w-[14px] h-[14px] mx-auto" />
      </button>

      <div className="min-w-[120px]">
        <h1 className="text-[13.5px] font-semibold text-tx tracking-tight">{title}</h1>
      </div>

      <div className="flex-1 flex justify-center">
        <div
          onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
          className="hidden md:flex items-center gap-2 bg-s2 border border-b1 rounded-[7px] px-3 py-1.5 w-[200px] cursor-pointer hover:border-b2 hover:bg-s3 transition-all duration-200"
        >
          <Search className="w-3 h-3 text-tx3 flex-shrink-0" />
          <span className="text-[12.5px] text-tx3 flex-1 select-none">Search…</span>
          <span className="text-[10px] text-tx3 font-mono flex-shrink-0 bg-s1 border border-b1 px-1 rounded">⌘K</span>
        </div>
      </div>

      <TooltipProvider delayDuration={80}>
        <div className="flex items-center gap-1">
          {TOOL_DEFINITIONS.map((tool) => (
            <ToolIcon key={tool.id} id={tool.id} icon={tool.icon} label={tool.label} />
          ))}
        </div>
      </TooltipProvider>

      <TooltipProvider delayDuration={80}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="w-[30px] h-[30px] rounded-[6px] border border-b1 flex items-center justify-center text-tx3 hover:bg-s2 transition-colors opacity-40 cursor-not-allowed"
              type="button"
            >
              <Bell className="w-[14px] h-[14px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[11px]">
            Notifications coming soon
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-2 py-1 rounded-[7px] hover:bg-s2 transition-colors" type="button">
            <div className="w-6 h-6 rounded-[5px] bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <span className="text-[9px] font-bold text-white font-mono">{initials}</span>
            </div>
            <ChevronDown className="w-3 h-3 text-tx3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-s1 border-b1 w-48">
          <DropdownMenuItem onClick={() => navigate("/profile")}> 
            <User className="w-3.5 h-3.5 mr-2" /> Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-b1" />
          <DropdownMenuItem className="text-tx3 text-[11px] font-mono cursor-default">
            v2.0.0
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

