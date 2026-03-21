import { useEffect, useState } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { getBaseApiUrl } from "@/api/client"

type StartupStatus = "waiting" | "ready" | "failed"

interface StartupScreenProps {
  onReady: () => void
}

export default function StartupScreen({ onReady }: StartupScreenProps) {
  const [status, setStatus] = useState<StartupStatus>("waiting")
  const [dots, setDots] = useState("")
  const [attempt, setAttempt] = useState(0)
  const MAX_ATTEMPTS = 30 // 15 seconds total

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

  // Poll the backend health endpoint
  useEffect(() => {
    if (status !== "waiting") return

    const poll = async () => {
      try {
        const base = await getBaseApiUrl()
        const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(2000) })
        if (res.ok) {
          setStatus("ready")
          // Small delay so the "ready" state is visible for a moment
          setTimeout(onReady, 600)
          return
        }
      } catch {
        // Not ready yet
      }
      setAttempt((a) => {
        const next = a + 1
        if (next >= MAX_ATTEMPTS) setStatus("failed")
        return next
      })
    }

    const interval = setInterval(() => void poll(), 500)
    return () => clearInterval(interval)
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

  if (status === "failed") {
    return (
      <div className="fixed inset-0 z-[99999] bg-bg flex flex-col items-center justify-center p-8">
        <div className="w-14 h-14 rounded-[14px] bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center mb-5">
          <span className="text-[20px] font-bold text-white font-mono">TA</span>
        </div>
        <h2 className="text-[18px] font-bold text-tx mb-2">Backend did not start</h2>
        <p className="text-[12px] text-tx3 text-center max-w-[320px] leading-relaxed mb-6">
          The TaskArena backend took too long to start. This usually means the app
          bundled incorrectly or an antivirus is blocking the sidecar process.
        </p>
        <div className="rounded-[10px] border border-b1 bg-s1 p-4 max-w-[360px] w-full space-y-2 mb-5">
          {[
            "Check that your antivirus is not blocking TaskArena",
            "Try closing and reopening the app",
            "If the problem persists, reinstall from the latest release",
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] text-tx2">
              <span className="text-tx3 font-mono flex-shrink-0 mt-0.5">{i + 1}.</span>
              {tip}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-9 px-5 rounded-[8px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  // Waiting state
  const loadingPercent = Math.min(95, (attempt / MAX_ATTEMPTS) * 100)

  return (
    <div className="fixed inset-0 z-[99999] bg-bg flex flex-col items-center justify-center">
      <div className="w-14 h-14 rounded-[14px] bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-6">
        <span className="text-[20px] font-bold text-white font-mono">TA</span>
      </div>
      <p className="text-[14px] font-semibold text-tx mb-1">TaskArena</p>
      <p className="text-[12px] text-tx3 mb-6">Starting up{dots}</p>

      {/* Loading bar */}
      <div className="w-[200px] h-1 rounded-full bg-s2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
          style={{ width: `${loadingPercent}%` }}
        />
      </div>

      <p className="text-[10px] text-tx3 font-mono mt-3">
        {attempt < 5 ? "Loading..." : attempt < 15 ? "Starting services..." : "Almost ready..."}
      </p>
    </div>
  )
}
