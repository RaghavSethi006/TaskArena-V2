import { useEffect, useState } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { getBaseApiUrl } from "@/api/client"

type StartupStatus = "waiting" | "ready"

interface StartupScreenProps {
  onReady: () => void
}

export default function StartupScreen({ onReady }: StartupScreenProps) {
  const [status, setStatus] = useState<StartupStatus>("waiting")
  const [dots, setDots] = useState("")
  const [attempt, setAttempt] = useState(0)
  const SLOW_START_ATTEMPT = 60
  const RETRY_BUTTON_ATTEMPT = 120

  // Show the window once React has mounted (prevents white flash)
  useEffect(() => {
    void getCurrentWindow().show().catch(() => {
      // Ignore browser/dev fallback environments where no native window exists.
    })
  }, [])

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."))
    }, 400)
    return () => clearInterval(interval)
  }, [])

  // Poll the backend health endpoint until it comes up.
  useEffect(() => {
    if (status !== "waiting") return

    let cancelled = false

    const poll = async () => {
      try {
        const base = await getBaseApiUrl()
        const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) })
        if (res.ok) {
          setStatus("ready")
          // Small delay so the "ready" state is visible for a moment
          setTimeout(onReady, 600)
          return
        }
      } catch {
        // Not ready yet
      }

      if (cancelled) return

      setAttempt((a) => a + 1)
      window.setTimeout(() => {
        if (!cancelled) {
          void poll()
        }
      }, 500)
    }

    void poll()
    return () => {
      cancelled = true
    }
  }, [status, onReady])

  if (status === "ready") {
    return (
      <div className="fixed inset-0 z-[99999] bg-bg flex flex-col items-center justify-center animate-fadeUp">
        <div className="w-14 h-14 rounded-[14px] bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-4">
          <span className="text-[20px] font-bold text-white font-mono">TA</span>
        </div>
        <div className="w-5 h-5 rounded-full border-2 border-emerald-400 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
        </div>
      </div>
    )
  }

  // Waiting state
  const loadingPercent = Math.min(95, Math.max(10, attempt * 2))
  const isSlowStart = attempt >= SLOW_START_ATTEMPT
  const showRetryButton = attempt >= RETRY_BUTTON_ATTEMPT

  return (
    <div className="fixed inset-0 z-[99999] bg-bg flex flex-col items-center justify-center">
      <div className="w-14 h-14 rounded-[14px] bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-6">
        <span className="text-[20px] font-bold text-white font-mono">TA</span>
      </div>
      <p className="text-[14px] font-semibold text-tx mb-1">TaskArena</p>
      <p className="text-[12px] text-tx3 mb-3">Starting up{dots}</p>
      {isSlowStart && (
        <p className="text-[11px] text-tx3 text-center max-w-[320px] leading-relaxed mb-3">
          Starting local services. This can take a little longer on some launches.
        </p>
      )}

      {/* Loading bar */}
      <div className="w-[200px] h-1 rounded-full bg-s2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
          style={{ width: `${loadingPercent}%` }}
        />
      </div>

      <p className="text-[10px] text-tx3 font-mono mt-3">
        {attempt < 5 ? "Loading..." : attempt < 15 ? "Starting services..." : isSlowStart ? "Finishing setup..." : "Almost ready..."}
      </p>
      {showRetryButton && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 h-9 px-5 rounded-[8px] border border-b1 bg-s1 text-tx text-[12px] hover:bg-s2 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  )
}
