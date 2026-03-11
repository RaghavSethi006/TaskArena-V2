import { Pause, Play, RotateCcw, Settings, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useToolsStore } from "@/stores/toolsStore"

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
    pomodoroSetDurations,
    pomodoroSavePreset,
    pomodoroLoadPreset,
    pomodoroDeletePreset,
  } = useToolsStore()

  const [sessionDialogOpen, setSessionDialogOpen] = useState(false)
  const [seenCompletionKey, setSeenCompletionKey] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [draft, setDraft] = useState(pomodoro.customDurations)
  const [presetName, setPresetName] = useState("")
  const prevRunning = useRef(pomodoro.running)

  // Keep draft in sync when settings panel is opened
  const handleOpenSettings = () => {
    setDraft({ ...pomodoro.customDurations })
    setSettingsOpen((v) => !v)
  }

  const applyDurations = () => {
    pomodoroSetDurations(draft)
  }

  const radius = 42
  const circumference = 2 * Math.PI * radius
  const total = pomodoro.customDurations[pomodoro.mode] * 60
  const progress = total > 0 ? 1 - pomodoro.secondsLeft / total : 0
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
      {/* Ring timer */}
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

      {/* Mode tabs */}
      <Tabs value={pomodoro.mode} onValueChange={(value) => pomodoroSetMode(value as "focus" | "short" | "long")}>
        <TabsList className="w-full grid grid-cols-3 bg-s2 border border-b1 rounded-[7px] p-1">
          <TabsTrigger value="focus" className="text-[11px] rounded-[6px] data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-300">
            Focus <span className="ml-1 opacity-50 font-mono">{pomodoro.customDurations.focus}m</span>
          </TabsTrigger>
          <TabsTrigger value="short" className="text-[11px] rounded-[6px] data-[state=active]:bg-green-500/20 data-[state=active]:text-green-300">
            Short <span className="ml-1 opacity-50 font-mono">{pomodoro.customDurations.short}m</span>
          </TabsTrigger>
          <TabsTrigger value="long" className="text-[11px] rounded-[6px] data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300">
            Long <span className="ml-1 opacity-50 font-mono">{pomodoro.customDurations.long}m</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Controls row */}
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
          className="h-8 px-2.5 rounded-[7px] border border-b1 bg-s2 text-tx2 hover:text-tx hover:bg-s3 transition-colors duration-[120ms]"
          type="button"
          title="Reset"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleOpenSettings}
          className={cn(
            "h-8 px-2.5 rounded-[7px] border border-b1 bg-s2 text-tx2 hover:text-tx hover:bg-s3 transition-colors duration-[120ms]",
            settingsOpen && "bg-s3 text-tx border-b2"
          )}
          type="button"
          title="Customize durations"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Session dots */}
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

      {/* Linked task */}
      {pomodoro.linkedTaskTitle && (
        <div className="text-[11px] text-tx3 font-mono truncate text-center">
          Linked: {pomodoro.linkedTaskTitle}
        </div>
      )}

      {/* -- Settings panel (inline, collapsible) -- */}
      {settingsOpen && (
        <div className="rounded-[9px] border border-b1 bg-s2/50 p-3 space-y-3">

          {/* Duration sliders */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-mono text-tx3 uppercase tracking-wide">Durations</p>

            {(["focus", "short", "long"] as const).map((key) => {
              const max = key === "focus" ? 90 : key === "long" ? 45 : 15
              const min = key === "focus" ? 5 : 1
              const color =
                key === "focus" ? "accent-rose-500"
                : key === "short" ? "accent-green-500"
                : "accent-blue-500"
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-tx2 capitalize">{key}</span>
                    <span className="text-[11px] font-mono text-tx font-semibold">
                      {draft[key]}m
                    </span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={1}
                    value={draft[key]}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                    }
                    className={`w-full h-1.5 rounded-full ${color}`}
                  />
                  <div className="flex justify-between text-[9px] font-mono text-tx3 mt-0.5">
                    <span>{min}m</span>
                    <span>{max}m</span>
                  </div>
                </div>
              )
            })}

            <button
              type="button"
              onClick={applyDurations}
              className="w-full h-7 rounded-[6px] bg-blue-500 text-white text-[11px] hover:bg-blue-600 transition-colors"
            >
              Apply
            </button>
          </div>

          {/* Save as preset */}
          <div>
            <p className="text-[10px] font-mono text-tx3 uppercase tracking-wide mb-1.5">
              Save as Preset
            </p>
            <div className="flex gap-1.5">
              <input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && presetName.trim()) {
                    pomodoroSavePreset(presetName)
                    setPresetName("")
                  }
                }}
                placeholder="Preset name…"
                className="flex-1 h-7 rounded-[6px] border border-b1 bg-s1 px-2 text-[11px] text-tx outline-none placeholder:text-tx3"
              />
              <button
                type="button"
                disabled={!presetName.trim()}
                onClick={() => {
                  pomodoroSavePreset(presetName)
                  setPresetName("")
                }}
                className="h-7 px-2.5 rounded-[6px] bg-s1 border border-b1 text-[11px] text-tx2 hover:bg-s2 disabled:opacity-40 transition-colors"
              >
                Save
              </button>
            </div>
          </div>

          {/* Presets list */}
          {pomodoro.presets.length > 0 && (
            <div>
              <p className="text-[10px] font-mono text-tx3 uppercase tracking-wide mb-1.5">
                Saved Presets
              </p>
              <div className="space-y-1 max-h-[140px] overflow-y-auto pr-0.5">
                {pomodoro.presets.map((preset, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 rounded-[6px] border border-b1 bg-s1 px-2 py-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        pomodoroLoadPreset(idx)
                        setDraft(pomodoro.presets[idx])
                      }}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="text-[11px] text-tx truncate">{preset.name}</p>
                      <p className="text-[9px] font-mono text-tx3">
                        {preset.focus}m / {preset.short}m / {preset.long}m
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => pomodoroDeletePreset(idx)}
                      className="text-tx3 hover:text-rose-300 transition-colors flex-shrink-0"
                      title="Delete preset"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Session complete dialog — UNCHANGED */}
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
