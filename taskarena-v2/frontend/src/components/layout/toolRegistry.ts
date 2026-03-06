import type { LucideIcon } from "lucide-react"
import {
  Calculator,
  Link,
  ListChecks,
  StickyNote,
  TimerReset,
  Timer,
} from "lucide-react"
import CalculatorTool from "@/components/tools/CalculatorTool"
import PomodoroTool from "@/components/tools/PomodoroTool"
import QuickLinksTool from "@/components/tools/QuickLinksTool"
import QuickTodoTool from "@/components/tools/QuickTodoTool"
import StickyNotesTool from "@/components/tools/StickyNotesTool"
import StopwatchTool from "@/components/tools/StopwatchTool"
import type { ComponentType } from "react"
import type { ToolId } from "@/stores/toolsStore"

export interface ToolDefinition {
  id: ToolId
  icon: LucideIcon
  label: string
  component: ComponentType
  minWidth?: number
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  { id: "pomodoro", icon: Timer, label: "Pomodoro", component: PomodoroTool, minWidth: 260 },
  { id: "stopwatch", icon: TimerReset, label: "Stopwatch", component: StopwatchTool, minWidth: 250 },
  { id: "calculator", icon: Calculator, label: "Calculator", component: CalculatorTool, minWidth: 260 },
  { id: "notes", icon: StickyNote, label: "Sticky Notes", component: StickyNotesTool, minWidth: 300 },
  { id: "todo", icon: ListChecks, label: "Quick Todo", component: QuickTodoTool, minWidth: 280 },
  { id: "links", icon: Link, label: "Quick Links", component: QuickLinksTool, minWidth: 300 },
]

