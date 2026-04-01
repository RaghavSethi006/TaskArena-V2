import {
  BarChart2,
  BookOpen,
  Brain,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  Home,
  MessageSquare,
  Trophy,
  User,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { NavLink, useMatch } from "react-router-dom"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import AppLogo from "@/components/branding/AppLogo"
import { useProfile } from "@/hooks/useProfile"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/stores/uiStore"

interface NavItemConfig {
  icon: LucideIcon
  label: string
  path: string
}

interface NavSection {
  section: string
  items: NavItemConfig[]
}

interface NavItemProps {
  icon: LucideIcon
  label: string
  path: string
  collapsed: boolean
}

const NAV: NavSection[] = [
  {
    section: "MAIN",
    items: [
      { label: "Dashboard", icon: Home, path: "/" },
      { label: "Schedule", icon: CalendarDays, path: "/schedule" },
      { label: "Tasks", icon: CheckSquare, path: "/tasks" },
    ],
  },
  {
    section: "STUDY",
    items: [
      { label: "AI Tutor", icon: MessageSquare, path: "/chat" },
      { label: "Library", icon: BookOpen, path: "/notes" },
      { label: "Study Hub", icon: Brain, path: "/study-hub" },
    ],
  },
  {
    section: "STATS",
    items: [
      { label: "Statistics", icon: BarChart2, path: "/stats" },
      { label: "Leaderboard", icon: Trophy, path: "/leaderboard" },
    ],
  },
  {
    section: "OTHER",
    items: [{ label: "Profile", icon: User, path: "/profile" }],
  },
]

function NavItem({ icon: Icon, label, path, collapsed }: NavItemProps) {
  const isActive = useMatch(path) !== null

  return (
    <NavLink to={path}>
      <div
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-[7px] border transition-all duration-[120ms] cursor-pointer mx-2",
          "border-transparent text-tx2",
          "hover:bg-s2 hover:text-tx hover:border-b1",
          isActive && "bg-[var(--bd)] text-blue-400 border-blue-500/20",
          collapsed && "justify-center px-0 mx-2"
        )}
      >
        <Icon className={cn("w-[15px] h-[15px] flex-shrink-0", isActive && "text-blue-400")} />
        {!collapsed && <span className="text-[12.5px] font-medium truncate">{label}</span>}
      </div>
    </NavLink>
  )
}

export default function Sidebar() {
  const collapsed = useUIStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)
  const sidebarStyle = useUIStore((state) => state.appearance.sidebarStyle)
  const profileQuery = useProfile()
  const profileName = profileQuery.data?.name ?? "—"
  const profileXp = profileQuery.data?.xp ?? 0
  const profileLevel = profileQuery.data?.level ?? 1
  const initials = profileName.slice(0, 2).toUpperCase()

  return (
    <aside
      className={cn(
        "relative h-screen overflow-y-auto",
        "transition-[width,min-width] duration-200 ease-in-out",
        sidebarStyle === "frosted"
          ? "border-r border-[color:var(--sidebar-edge)] bg-[color:var(--sidebar-bg)] supports-[backdrop-filter]:bg-[color:var(--sidebar-bg-strong)] supports-[backdrop-filter]:backdrop-blur-2xl shadow-[0_12px_40px_var(--sidebar-shadow)]"
          : "bg-s1 border-r border-b1",
        collapsed ? "w-[56px] min-w-[56px]" : "w-[220px] min-w-[220px]"
      )}
    >
      {sidebarStyle === "frosted" ? (
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.03)_32%,rgba(255,255,255,0.05))]" />
      ) : null}
      <div className="relative flex h-full flex-col">
        <div className={cn("h-[50px] flex items-center border-b border-b1", collapsed ? "justify-center" : "px-4")}> 
          <AppLogo className="h-6 w-6 flex-shrink-0" />
          {!collapsed && <span className="ml-2 text-[13px] font-semibold tracking-tight text-tx">TaskArena</span>}
        </div>

        <TooltipProvider delayDuration={80}>
          <div className="py-2">
            {NAV.map((group) => (
              <div key={group.section}>
                {!collapsed && (
                  <div className="px-5 pt-4 pb-1">
                    <span className="text-[10px] font-bold font-mono uppercase tracking-[0.8px] text-tx3">
                      {group.section}
                    </span>
                  </div>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const node = (
                      <NavItem
                        key={item.path}
                        icon={item.icon}
                        label={item.label}
                        path={item.path}
                        collapsed={collapsed}
                      />
                    )

                    if (!collapsed) return node

                    return (
                      <Tooltip key={item.path}>
                        <TooltipTrigger asChild>{node}</TooltipTrigger>
                        <TooltipContent side="right" className="text-[11px]">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </TooltipProvider>

        <div className="mt-auto border-t border-b1">
          <button
            onClick={toggleSidebar}
            type="button"
            className={cn(
              "w-full flex items-center gap-2.5 py-2.5 text-tx3 hover:text-tx hover:bg-s2 transition-colors duration-[120ms]",
              collapsed ? "justify-center px-0" : "px-4"
            )}
          >
            <ChevronRight
              className={cn(
                "w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200",
                !collapsed && "rotate-180"
              )}
            />
            {!collapsed ? <span className="text-[11px] font-medium">Collapse</span> : null}
          </button>

          <div className={cn("flex items-center gap-2.5 px-3 py-2.5", collapsed && "justify-center")}>
            <div className="w-7 h-7 rounded-[7px] bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white font-mono">{initials}</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-tx truncate">{profileName}</div>
                <div className="text-[10px] text-tx3 font-mono">Lv.{profileLevel} · {profileXp.toLocaleString()} XP</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}

