import { create } from "zustand"
import { persist } from "zustand/middleware"

type ToolId = "pomodoro" | "stopwatch" | "calculator" | "notes" | "todo" | "links"
type ToolState = "closed" | "docked" | "floating"

interface ToolEntry {
  state: ToolState
  position: { x: number; y: number }
}

interface PomodoroState {
  mode: "focus" | "short" | "long"
  secondsLeft: number
  running: boolean
  session: number
  linkedTaskId: number | null
  linkedTaskTitle: string | null
}

interface StopwatchState {
  running: boolean
  startedAt: number | null
  elapsed: number
  laps: number[]
}

interface ToolsStore {
  tools: Record<ToolId, ToolEntry>
  pomodoro: PomodoroState
  stopwatch: StopwatchState

  openTool: (id: ToolId, as?: "docked" | "floating") => void
  closeTool: (id: ToolId) => void
  popOut: (id: ToolId) => void
  dock: (id: ToolId) => void
  setPosition: (id: ToolId, x: number, y: number) => void

  pomodoroTick: () => void
  pomodoroToggle: () => void
  pomodoroReset: () => void
  pomodoroSetMode: (mode: "focus" | "short" | "long") => void
  pomodoroLink: (taskId: number, title: string) => void

  stopwatchToggle: () => void
  stopwatchLap: () => void
  stopwatchReset: () => void
  stopwatchTick: () => void
}

const POMODORO_DURATIONS = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 }

const defaultTool = (state: ToolState = "closed"): ToolEntry => ({
  state,
  position: { x: window.innerWidth - 320, y: window.innerHeight - 400 },
})

export const useToolsStore = create<ToolsStore>()(
  persist(
    (set) => ({
      tools: {
        pomodoro: defaultTool(),
        stopwatch: defaultTool(),
        calculator: defaultTool(),
        notes: defaultTool(),
        todo: defaultTool(),
        links: defaultTool(),
      },
      pomodoro: {
        mode: "focus",
        secondsLeft: POMODORO_DURATIONS.focus,
        running: false,
        session: 1,
        linkedTaskId: null,
        linkedTaskTitle: null,
      },
      stopwatch: { running: false, startedAt: null, elapsed: 0, laps: [] },

      openTool: (id, as = "docked") =>
        set((s) => ({ tools: { ...s.tools, [id]: { ...s.tools[id], state: as } } })),

      closeTool: (id) =>
        set((s) => ({ tools: { ...s.tools, [id]: { ...s.tools[id], state: "closed" } } })),

      popOut: (id) =>
        set((s) => ({ tools: { ...s.tools, [id]: { ...s.tools[id], state: "floating" } } })),

      dock: (id) =>
        set((s) => ({ tools: { ...s.tools, [id]: { ...s.tools[id], state: "docked" } } })),

      setPosition: (id, x, y) =>
        set((s) => ({ tools: { ...s.tools, [id]: { ...s.tools[id], position: { x, y } } } })),

      pomodoroTick: () =>
        set((s) => {
          const p = s.pomodoro
          if (!p.running) return s
          if (p.secondsLeft <= 1) {
            const nextSession = p.mode === "focus" ? p.session + 1 : p.session
            const nextMode = p.mode === "focus"
              ? (nextSession % 4 === 0 ? "long" : "short")
              : "focus"
            return {
              pomodoro: {
                ...p,
                running: false,
                mode: nextMode,
                session: nextSession > 4 ? 1 : nextSession,
                secondsLeft: POMODORO_DURATIONS[nextMode],
              },
            }
          }
          return { pomodoro: { ...p, secondsLeft: p.secondsLeft - 1 } }
        }),

      pomodoroToggle: () =>
        set((s) => ({ pomodoro: { ...s.pomodoro, running: !s.pomodoro.running } })),

      pomodoroReset: () =>
        set((s) => ({
          pomodoro: {
            ...s.pomodoro,
            running: false,
            secondsLeft: POMODORO_DURATIONS[s.pomodoro.mode],
          },
        })),

      pomodoroSetMode: (mode) =>
        set((s) => ({
          pomodoro: {
            ...s.pomodoro,
            mode,
            running: false,
            secondsLeft: POMODORO_DURATIONS[mode],
          },
        })),

      pomodoroLink: (taskId, title) =>
        set((s) => ({
          pomodoro: { ...s.pomodoro, linkedTaskId: taskId, linkedTaskTitle: title },
        })),

      stopwatchToggle: () =>
        set((s) => {
          const sw = s.stopwatch
          if (sw.running) {
            return {
              stopwatch: {
                ...sw,
                running: false,
                elapsed: sw.elapsed + (Date.now() - (sw.startedAt ?? Date.now())),
              },
            }
          }
          return { stopwatch: { ...sw, running: true, startedAt: Date.now() } }
        }),

      stopwatchLap: () =>
        set((s) => {
          const sw = s.stopwatch
          const current = sw.elapsed + (sw.running ? Date.now() - (sw.startedAt ?? Date.now()) : 0)
          return { stopwatch: { ...sw, laps: [...sw.laps, current] } }
        }),

      stopwatchReset: () =>
        set(() => ({
          stopwatch: { running: false, startedAt: null, elapsed: 0, laps: [] },
        })),

      stopwatchTick: () => set((s) => s),
    }),
    {
      name: "taskarena-tools",
      partialize: (s) => ({
        tools: s.tools,
        pomodoro: { ...s.pomodoro, running: false },
        stopwatch: { ...s.stopwatch, running: false },
      }),
    }
  )
)
