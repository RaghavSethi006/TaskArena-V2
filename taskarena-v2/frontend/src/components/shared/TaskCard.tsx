import { CheckCircle2, Circle, MoreHorizontal, Play } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import DueChip from "@/components/shared/DueChip"
import { cn } from "@/lib/utils"
import type { Task } from "@/types"

interface TaskCardProps {
  task: Task
  onComplete: (id: number) => void
  onDelete: (id: number) => void
  onFocus?: (task: Task) => void
  compact?: boolean
}

function typeChipClass(type: Task["type"]) {
  if (type === "assignment") return "bg-[var(--od)] text-orange-300 border-orange-500/25"
  if (type === "study") return "bg-[var(--bd)] text-blue-300 border-blue-500/25"
  return "bg-[var(--gd)] text-emerald-300 border-emerald-500/25"
}

export default function TaskCard({ task, onComplete, onDelete, onFocus, compact = false }: TaskCardProps) {
  const completed = task.status === "completed"

  return (
    <div
      className={cn(
        "rounded-[10px] border border-b1 bg-s1",
        compact ? "px-3 py-2" : "p-3",
        completed && "opacity-50"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onComplete(task.id)}
          title={task.status === "completed" ? "Mark as pending" : "Mark as complete"}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            task.status === "completed"
              ? "border-emerald-400 bg-emerald-400/20 text-emerald-400 hover:bg-rose-400/10 hover:border-rose-400 hover:text-rose-400"
              : "border-b2 hover:border-emerald-400 hover:text-emerald-400 text-transparent"
          }`}
        >
          {task.status === "completed" ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <Circle className="w-3 h-3" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className={cn("text-[13px] text-tx font-medium leading-snug", completed && "line-through")}>{task.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge className={cn("text-[10px] font-mono uppercase rounded-[5px] border px-2 py-0.5", typeChipClass(task.type))}>
              {task.type}
            </Badge>
            {task.subject ? (
              <Badge className="text-[10px] font-mono uppercase rounded-[5px] border px-2 py-0.5 bg-s2 text-tx3 border-b1">
                {task.subject}
              </Badge>
            ) : null}
            <DueChip deadline={task.deadline} status={task.status} />
            <Badge className="text-[10px] font-mono uppercase rounded-[5px] border px-2 py-0.5 bg-s2 text-tx2 border-b1">
              +{task.points} XP
            </Badge>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-7 h-7 rounded-[6px] text-tx3 hover:text-tx hover:bg-s2 transition-colors duration-[120ms] flex items-center justify-center"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-s1 border-b1">
            <DropdownMenuItem className="text-[12px] text-tx2 cursor-default">Edit (v2.1)</DropdownMenuItem>
            <DropdownMenuItem className="text-[12px] text-rose-300" onClick={() => onDelete(task.id)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!compact && !completed && onFocus ? (
        <button
          type="button"
          onClick={() => onFocus(task)}
          className="mt-3 h-7 px-2.5 rounded-[7px] border border-b1 bg-transparent text-tx2 text-[11px] hover:bg-s2 hover:text-tx transition-colors duration-[120ms] inline-flex items-center gap-1"
        >
          <Play className="w-3 h-3" />
          Focus
        </button>
      ) : null}
    </div>
  )
}
