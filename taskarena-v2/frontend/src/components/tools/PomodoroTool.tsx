import { Pause, Play, RotateCcw } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useToolsStore } from "@/stores/toolsStore"

const POMODORO_DURATIONS = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 }

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

export default function PomodoroTool() {
  const {
    pomodoro,
    pomodoroToggle,
    pomodoroReset,
    pomodoroSetMode,
  } = useToolsStore()
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false)
  const [seenCompletionKey, setSeenCompletionKey] = useState<string | null>(null)
  const prevRunning = useRef(pomodoro.running)

  const total = POMODORO_DURATIONS[pomodoro.mode]
  const progress = 1 - pomodoro.secondsLeft / total
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)

  const modeColor = useMemo(() => {
    if (pomodoro.mode === "focus") return "text-rose-400"
    if (pomodoro.mode === "short") return "text-green-400"
    return "text-blue-400"
  }, [pomodoro.mode])

  useEffect(() => {
    const completionKey = `${pomodoro.linkedTaskId ?? "none"}-${pomodoro.session}-${pomodoro.mode}`
    const completedNow = prevRunning.current && !pomodoro.running && pomodoro.secondsLeft === total

    if (completedNow && pomodoro.linkedTaskId && seenCompletionKey !== completionKey) {
      setSessionDialogOpen(true)
      setSeenCompletionKey(completionKey)
    }

    prevRunning.current = pomodoro.running
  }, [pomodoro.linkedTaskId, pomodoro.mode, pomodoro.running, pomodoro.secondsLeft, pomodoro.session, seenCompletionKey, total])

  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        <div className="relative w-[120px] h-[120px]">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r={radius} className="stroke-b1 fill-none" strokeWidth="7" />
            <circle
              cx="50"
              cy="50"
              r={radius}
              className={cn("fill-none transition-all duration-300", modeColor.replace("text", "stroke"))}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-[22px] font-semibold text-tx">{formatTime(pomodoro.secondsLeft)}</span>
            <span className="text-[10px] text-tx3 uppercase tracking-[0.7px] font-mono">
              {pomodoro.mode}
            </span>
          </div>
        </div>
      </div>

      <Tabs value={pomodoro.mode} onValueChange={(value) => pomodoroSetMode(value as "focus" | "short" | "long")}> 
        <TabsList className="w-full grid grid-cols-3 bg-s2 border border-b1 rounded-[7px] p-1">
          <TabsTrigger value="focus" className="text-[11px] rounded-[6px] data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-300">Focus</TabsTrigger>
          <TabsTrigger value="short" className="text-[11px] rounded-[6px] data-[state=active]:bg-green-500/20 data-[state=active]:text-green-300">Short</TabsTrigger>
          <TabsTrigger value="long" className="text-[11px] rounded-[6px] data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300">Long</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center justify-center gap-2">
        <button
          onClick={pomodoroToggle}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors duration-[120ms]",
            pomodoro.mode === "focus" && "bg-rose-500 hover:bg-rose-600",
            pomodoro.mode === "short" && "bg-green-500 hover:bg-green-600",
            pomodoro.mode === "long" && "bg-blue-500 hover:bg-blue-600"
          )}
          type="button"
        >
          {pomodoro.running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <button
          onClick={pomodoroReset}
          className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-tx2 hover:text-tx hover:bg-s3 transition-colors duration-[120ms]"
          type="button"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex justify-center gap-1">
        {[0, 1, 2, 3].map((idx) => (
          <span
            key={idx}
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              idx < Math.min(pomodoro.session, 4) ? "bg-blue-400" : "bg-b1"
            )}
          />
        ))}
      </div>

      {pomodoro.linkedTaskTitle && (
        <div className="text-[11px] text-tx3 font-mono truncate text-center">
          Linked: {pomodoro.linkedTaskTitle}
        </div>
      )}

      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent className="bg-s1 border-b1 rounded-[12px]">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-semibold text-tx">Session complete</DialogTitle>
          </DialogHeader>
          <p className="text-[12px] text-tx2">
            Mark &quot;{pomodoro.linkedTaskTitle ?? "this task"}&quot; as done?
          </p>
          <DialogFooter className="flex gap-2">
            <button
              onClick={() => setSessionDialogOpen(false)}
              className="h-8 px-3 rounded-[7px] bg-s2 border border-b1 text-tx2 hover:text-tx transition-colors duration-[120ms]"
              type="button"
            >
              Not yet
            </button>
            <button
              onClick={() => setSessionDialogOpen(false)}
              className="h-8 px-3 rounded-[7px] bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-[120ms]"
              type="button"
            >
              Complete it
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

