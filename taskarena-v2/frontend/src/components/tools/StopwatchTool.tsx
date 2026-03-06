import { Pause, Play, RotateCcw } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useToolsStore } from "@/stores/toolsStore"

function formatStopwatch(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const centiseconds = Math.floor((ms % 1000) / 10)
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${centiseconds
    .toString()
    .padStart(2, "0")}`
}

export default function StopwatchTool() {
  const { stopwatch, stopwatchToggle, stopwatchLap, stopwatchReset } = useToolsStore()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!stopwatch.running) return
    const interval = setInterval(() => setNow(Date.now()), 50)
    return () => clearInterval(interval)
  }, [stopwatch.running])

  const elapsed = useMemo(() => {
    if (!stopwatch.running) return stopwatch.elapsed
    return stopwatch.elapsed + (now - (stopwatch.startedAt ?? now))
  }, [now, stopwatch.elapsed, stopwatch.running, stopwatch.startedAt])

  return (
    <div className="space-y-3">
      <div className="font-mono text-[24px] font-semibold text-tx text-center tracking-tight">
        {formatStopwatch(elapsed)}
      </div>

      <div className="flex items-center justify-center gap-2">
        <button
          onClick={stopwatchToggle}
          className="h-8 px-3 rounded-[7px] bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-[120ms] flex items-center gap-1.5"
          type="button"
        >
          {stopwatch.running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />} 
          <span className="text-[11px]">{stopwatch.running ? "Stop" : "Start"}</span>
        </button>
        <button
          onClick={stopwatchLap}
          disabled={!stopwatch.running}
          className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-tx2 hover:text-tx hover:bg-s3 transition-colors duration-[120ms] disabled:opacity-40 disabled:cursor-not-allowed text-[11px]"
          type="button"
        >
          Lap
        </button>
        <button
          onClick={stopwatchReset}
          className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-tx2 hover:text-tx hover:bg-s3 transition-colors duration-[120ms]"
          type="button"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-h-[80px] overflow-y-auto rounded-[7px] border border-b1 bg-s2/40 p-2 space-y-1">
        {stopwatch.laps.length === 0 && <p className="text-[11px] text-tx3">No laps yet.</p>}
        {stopwatch.laps.map((lap, index) => (
          <div key={`${lap}-${index}`} className="flex justify-between text-[11px] font-mono text-tx2">
            <span>Lap {index + 1}</span>
            <span>{formatStopwatch(lap)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

