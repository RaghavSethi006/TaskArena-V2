# TaskArena v2 — Phase 3A: Frontend Setup
# Depends on: Phase 2 gate PASSED (backend running on port 8765)
# Goal: Tauri + React + Vite + shadcn scaffolded, routing working,
#       backend connection verified. No real pages yet — skeleton only.

---

## PROMPT

---

You are continuing to build TaskArena v2. The FastAPI backend is complete and running on port 8765. Phase 3 builds the Tauri desktop frontend.

Before writing any code read:
1. `docs/UI_GUIDE.md` — the full design system, color tokens, typography, shadcn overrides
2. `docs/TECH_STACK.md` — frontend dependencies and versions
3. `docs/CONVENTIONS.md` — TypeScript conventions, file naming, state management rules

Your job is **Phase 3A only** — scaffold the entire frontend project. No real page content yet. Just the skeleton that everything else will be built on top of.

---

## Step 1 — Scaffold Tauri + React + Vite

From the project root:

```bash
cd frontend
npm create tauri-app@latest . -- --template react-ts --manager npm
# When prompted: use existing directory → yes
npm install
```

---

## Step 2 — Install all dependencies

```bash
# shadcn + styling
npm install tailwindcss@latest postcss autoprefixer
npm install class-variance-authority clsx tailwind-merge
npm install tailwindcss-animate

# shadcn CLI init
npx shadcn@latest init
# When prompted:
#   Style: Default
#   Base color: Zinc
#   CSS variables: Yes

# Install all shadcn components needed
npx shadcn@latest add button card input label textarea select
npx shadcn@latest add dialog sheet tabs badge separator
npx shadcn@latest add skeleton tooltip progress switch
npx shadcn@latest add dropdown-menu popover command scroll-area
npx shadcn@latest add sonner

# Routing + state + data fetching
npm install react-router-dom@latest
npm install @tanstack/react-query@latest
npm install zustand@latest

# Animation
npm install framer-motion@latest

# Icons
npm install lucide-react@latest

# Charts (for Stats page)
npm install recharts@latest

# Utilities
npm install date-fns@latest
npm install sonner@latest
```

---

## Step 3 — Replace `globals.css` entirely

Replace `src/index.css` with exactly this — do not keep any of the Vite/Tauri defaults:

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background:         240 10% 3.9%;
    --foreground:         0 0% 98%;
    --card:               240 10% 6.7%;
    --card-foreground:    0 0% 98%;
    --popover:            240 10% 6.7%;
    --popover-foreground: 0 0% 98%;
    --primary:            217 91% 60%;
    --primary-foreground: 0 0% 100%;
    --secondary:          240 5% 10.8%;
    --secondary-foreground: 0 0% 98%;
    --muted:              240 3.7% 15.9%;
    --muted-foreground:   240 5% 44.9%;
    --accent:             240 3.7% 15.9%;
    --accent-foreground:  0 0% 98%;
    --destructive:        347 77% 50%;
    --destructive-foreground: 0 0% 100%;
    --border:             240 3.7% 15.9%;
    --input:              240 5% 10.8%;
    --ring:               217 91% 60%;
    --radius:             0.5rem;

    --bg:     #09090b;
    --s1:     #111113;
    --s2:     #18181b;
    --s3:     #1c1c20;
    --b1:     #27272a;
    --b2:     #3f3f46;
    --tx:     #fafafa;
    --tx2:    #a1a1aa;
    --tx3:    #71717a;

    --blue:   #3b82f6;   --bd: rgba(59,130,246,.12);
    --green:  #10b981;   --gd: rgba(16,185,129,.12);
    --amber:  #f59e0b;   --ad: rgba(245,158,11,.12);
    --rose:   #f43f5e;   --rd: rgba(244,63,94,.12);
    --orange: #f97316;   --od: rgba(249,115,22,.12);
    --violet: #8b5cf6;   --vd: rgba(139,92,246,.12);
  }
}

@layer base {
  * { @apply border-border; box-sizing: border-box; }
  body {
    @apply bg-background text-foreground;
    font-family: 'DM Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
    overflow: hidden; /* Tauri window — no body scroll */
  }

  * { scrollbar-width: thin; scrollbar-color: #3f3f46 transparent; }
  *::-webkit-scrollbar { width: 4px; height: 4px; }
  *::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
  *::-webkit-scrollbar-track { background: transparent; }
}

@layer utilities {
  .font-mono { font-family: 'DM Mono', monospace; }
}

/* Page transition */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fadeUp { animation: fadeUp 0.18s ease both; }

/* Typing dots */
@keyframes tdot {
  0%,60%,100% { transform: translateY(0); opacity: 0.4; }
  30%         { transform: translateY(-5px); opacity: 1; }
}
.animate-tdot1 { animation: tdot 1.4s infinite; }
.animate-tdot2 { animation: tdot 1.4s 0.2s infinite; }
.animate-tdot3 { animation: tdot 1.4s 0.4s infinite; }
```

---

## Step 4 — Replace `tailwind.config.ts` entirely

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:    "var(--bg)",
        s1:    "var(--s1)",
        s2:    "var(--s2)",
        s3:    "var(--s3)",
        b1:    "var(--b1)",
        b2:    "var(--b2)",
        tx:    "var(--tx)",
        tx2:   "var(--tx2)",
        tx3:   "var(--tx3)",
        border:      "hsl(var(--border))",
        input:       "hsl(var(--input))",
        ring:        "hsl(var(--ring))",
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

---

## Step 5 — File structure to create

```
src/
├── api/
│   └── client.ts          ← axios/fetch base client pointing to localhost:8765
├── components/
│   ├── ui/                ← shadcn components (already generated, don't touch)
│   ├── layout/
│   │   ├── AppShell.tsx   ← placeholder for Phase 3B
│   │   ├── Sidebar.tsx    ← placeholder
│   │   ├── Topbar.tsx     ← placeholder
│   │   └── RightPanel.tsx ← placeholder
│   └── shared/            ← empty for now, filled in Phase 3B
├── pages/
│   ├── DashboardPage.tsx  ← placeholder
│   ├── TasksPage.tsx      ← placeholder
│   ├── ChatbotPage.tsx    ← placeholder
│   ├── SchedulePage.tsx   ← placeholder
│   ├── NotesPage.tsx      ← placeholder
│   ├── StudyHubPage.tsx   ← placeholder
│   ├── LeaderboardPage.tsx← placeholder
│   ├── StatsPage.tsx      ← placeholder
│   └── ProfilePage.tsx    ← placeholder
├── stores/
│   ├── toolsStore.ts      ← Zustand tools + timer state (full implementation)
│   └── uiStore.ts         ← sidebar collapsed, search open etc
├── lib/
│   └── utils.ts           ← cn() utility (shadcn generates this)
├── hooks/
│   └── useApi.ts          ← TanStack Query wrappers (placeholder)
├── types/
│   └── index.ts           ← all TypeScript interfaces matching backend schemas
└── App.tsx                ← router + QueryClient + global timer effect
```

---

## Step 6 — `src/api/client.ts`

```typescript
const BASE_URL = "http://localhost:8765/api"

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(error.detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  get:    <T>(path: string) => apiFetch<T>(path),
  post:   <T>(path: string, body: unknown) => apiFetch<T>(path, { method: "POST",   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown) => apiFetch<T>(path, { method: "PATCH",  body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
}

export const BASE_API = "http://localhost:8765/api"
// Used for SSE: new EventSource(`${BASE_API}/chat/conversations/1/messages`)
// Note: SSE with POST needs fetch + ReadableStream, not EventSource
// See ChatbotPage implementation in Phase 3D
```

---

## Step 7 — `src/types/index.ts`

Define TypeScript interfaces matching every backend schema:

```typescript
// Users
export interface User {
  id: number
  name: string
  email: string | null
  level: number
  xp: number
  streak: number
  last_active: string | null
  created_at: string
}

// Tasks
export interface Task {
  id: number
  title: string
  subject: string | null
  type: "assignment" | "study" | "productivity"
  status: "pending" | "completed"
  deadline: string | null
  points: number
  course_id: number | null
  created_at: string
  completed_at: string | null
}

export interface TaskCreate {
  title: string
  type: "assignment" | "study" | "productivity"
  subject?: string
  deadline?: string
  points?: number
  course_id?: number
}

// Courses / Notes
export interface Course {
  id: number
  name: string
  code: string
  color: string
  user_id: number
  created_at: string
}

export interface Folder {
  id: number
  course_id: number
  name: string
  order_index: number
}

export interface File {
  id: number
  folder_id: number
  name: string
  path: string
  original_path: string | null
  size: number | null
  indexed: boolean
  indexed_at: string | null
  chunk_count: number
}

// Chat
export interface Conversation {
  id: number
  title: string | null
  context_course_id: number | null
  context_folder_id: number | null
  context_file_id: number | null
  created_at: string
  updated_at: string
  message_count: number
}

export interface Message {
  id: number
  conversation_id: number
  role: "user" | "assistant"
  content: string
  sources: string[]
  model_used: string | null
  created_at: string
}

// Schedule
export interface ScheduleEvent {
  id: number
  title: string
  type: "study" | "assignment" | "exam" | "break" | "other"
  course_id: number | null
  date: string
  start_time: string | null
  duration: number | null
  notes: string | null
  ai_suggested: boolean
  created_at: string
}

// Quiz
export interface Quiz {
  id: number
  title: string
  course_id: number
  difficulty: "easy" | "medium" | "hard"
  created_at: string
  question_count: number
  best_score: number | null
  attempt_count: number
}

export interface QuizQuestion {
  id: number
  quiz_id: number
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct: "a" | "b" | "c" | "d"
  explanation: string | null
  order_index: number | null
}

// Stats
export interface OverviewStats {
  tasks_completed: number
  tasks_pending: number
  tasks_total: number
  completion_rate: number
  total_xp: number
  current_streak: number
  quizzes_taken: number
  avg_quiz_score: number | null
  best_quiz_score: number | null
  rank: number
  level: number
  xp_this_week: number
  tasks_this_week: number
}

// Leaderboard
export interface RankingEntry {
  rank: number
  user_id: number
  name: string
  level: number
  xp: number
  tasks_completed: number
  streak: number
  weekly_xp: number
}

// AI config
export interface AIConfig {
  provider: string
  model: string
  groq_key_set: boolean
  local_model_exists: boolean
  ollama_available: boolean
  ollama_url: string
}
```

---

## Step 8 — `src/stores/toolsStore.ts`

Full Zustand implementation — all tools state + timer logic:

```typescript
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

  openTool:    (id: ToolId, as?: "docked" | "floating") => void
  closeTool:   (id: ToolId) => void
  popOut:      (id: ToolId) => void
  dock:        (id: ToolId) => void
  setPosition: (id: ToolId, x: number, y: number) => void

  pomodoroTick:    () => void
  pomodoroToggle:  () => void
  pomodoroReset:   () => void
  pomodoroSetMode: (mode: "focus" | "short" | "long") => void
  pomodoroLink:    (taskId: number, title: string) => void

  stopwatchToggle: () => void
  stopwatchLap:    () => void
  stopwatchReset:  () => void
  stopwatchTick:   () => void
}

const POMODORO_DURATIONS = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 }

const defaultTool = (state: ToolState = "closed"): ToolEntry => ({
  state,
  position: { x: window.innerWidth - 320, y: window.innerHeight - 400 },
})

export const useToolsStore = create<ToolsStore>()(
  persist(
    (set, get) => ({
      tools: {
        pomodoro:   defaultTool(),
        stopwatch:  defaultTool(),
        calculator: defaultTool(),
        notes:      defaultTool(),
        todo:       defaultTool(),
        links:      defaultTool(),
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
        set(s => ({ tools: { ...s.tools, [id]: { ...s.tools[id], state: as } } })),

      closeTool: (id) =>
        set(s => ({ tools: { ...s.tools, [id]: { ...s.tools[id], state: "closed" } } })),

      popOut: (id) =>
        set(s => ({ tools: { ...s.tools, [id]: { ...s.tools[id], state: "floating" } } })),

      dock: (id) =>
        set(s => ({ tools: { ...s.tools, [id]: { ...s.tools[id], state: "docked" } } })),

      setPosition: (id, x, y) =>
        set(s => ({ tools: { ...s.tools, [id]: { ...s.tools[id], position: { x, y } } } })),

      pomodoroTick: () => set(s => {
        const p = s.pomodoro
        if (!p.running) return s
        if (p.secondsLeft <= 1) {
          // Session complete — auto-advance
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
            }
          }
        }
        return { pomodoro: { ...p, secondsLeft: p.secondsLeft - 1 } }
      }),

      pomodoroToggle: () => set(s => ({
        pomodoro: { ...s.pomodoro, running: !s.pomodoro.running }
      })),

      pomodoroReset: () => set(s => ({
        pomodoro: {
          ...s.pomodoro,
          running: false,
          secondsLeft: POMODORO_DURATIONS[s.pomodoro.mode],
        }
      })),

      pomodoroSetMode: (mode) => set(s => ({
        pomodoro: { ...s.pomodoro, mode, running: false, secondsLeft: POMODORO_DURATIONS[mode] }
      })),

      pomodoroLink: (taskId, title) => set(s => ({
        pomodoro: { ...s.pomodoro, linkedTaskId: taskId, linkedTaskTitle: title }
      })),

      stopwatchToggle: () => set(s => {
        const sw = s.stopwatch
        if (sw.running) {
          return { stopwatch: { ...sw, running: false, elapsed: sw.elapsed + (Date.now() - (sw.startedAt ?? Date.now())) } }
        }
        return { stopwatch: { ...sw, running: true, startedAt: Date.now() } }
      }),

      stopwatchLap: () => set(s => {
        const sw = s.stopwatch
        const current = sw.elapsed + (sw.running ? Date.now() - (sw.startedAt ?? Date.now()) : 0)
        return { stopwatch: { ...sw, laps: [...sw.laps, current] } }
      }),

      stopwatchReset: () => set(s => ({
        stopwatch: { running: false, startedAt: null, elapsed: 0, laps: [] }
      })),

      stopwatchTick: () => set(s => s), // triggers re-render for stopwatch display
    }),
    {
      name: "taskarena-tools",
      partialize: (s) => ({
        tools: s.tools,
        pomodoro: { ...s.pomodoro, running: false }, // don't persist running state
        stopwatch: { ...s.stopwatch, running: false },
      }),
    }
  )
)
```

---

## Step 9 — `src/App.tsx`

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Toaster } from "sonner"
import { useEffect } from "react"
import { useToolsStore } from "./stores/toolsStore"
import AppShell from "./components/layout/AppShell"
import DashboardPage  from "./pages/DashboardPage"
import TasksPage      from "./pages/TasksPage"
import ChatbotPage    from "./pages/ChatbotPage"
import SchedulePage   from "./pages/SchedulePage"
import NotesPage      from "./pages/NotesPage"
import StudyHubPage   from "./pages/StudyHubPage"
import LeaderboardPage from "./pages/LeaderboardPage"
import StatsPage      from "./pages/StatsPage"
import ProfilePage    from "./pages/ProfilePage"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function GlobalTimerEffect() {
  const { pomodoro, stopwatch, pomodoroTick, stopwatchTick } = useToolsStore()
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useToolsStore.getState()
      if (state.pomodoro.running)  state.pomodoroTick()
      if (state.stopwatch.running) state.stopwatchTick()
    }, 1000)
    return () => clearInterval(interval)
  }, [])
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <GlobalTimerEffect />
        <AppShell>
          <Routes>
            <Route path="/"            element={<DashboardPage />} />
            <Route path="/tasks"       element={<TasksPage />} />
            <Route path="/chat"        element={<ChatbotPage />} />
            <Route path="/chat/:id"    element={<ChatbotPage />} />
            <Route path="/schedule"    element={<SchedulePage />} />
            <Route path="/notes"       element={<NotesPage />} />
            <Route path="/study-hub"   element={<StudyHubPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/stats"       element={<StatsPage />} />
            <Route path="/profile"     element={<ProfilePage />} />
          </Routes>
        </AppShell>
        <Toaster position="bottom-right" theme="dark" richColors />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
```

---

## Step 10 — Placeholder pages

Every page file should export a minimal placeholder so routing works:

```typescript
// Example — repeat for all 9 pages with their own name
export default function DashboardPage() {
  return (
    <div className="p-6 animate-fadeUp">
      <h1 className="text-[19px] font-bold tracking-tight">Dashboard</h1>
      <p className="text-[12.5px] text-tx2 mt-1">Coming in Phase 3C</p>
    </div>
  )
}
```

---

## Step 11 — AppShell placeholder

```typescript
// src/components/layout/AppShell.tsx
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg">
      {/* Sidebar — Phase 3B */}
      <div className="w-[220px] min-w-[220px] bg-s1 border-r border-b1 flex-shrink-0">
        <div className="p-4 text-tx3 text-xs font-mono">Sidebar — Phase 3B</div>
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar — Phase 3B */}
        <div className="h-[50px] bg-s1 border-b border-b1 flex items-center px-4 text-tx3 text-xs font-mono flex-shrink-0">
          Topbar — Phase 3B
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-bg">
          {children}
        </main>
      </div>

      {/* Right panel — Phase 3B */}
    </div>
  )
}
```

---

## Verification

```bash
# Start Vite dev server
cd frontend
npm run dev
# Expected: Vite server running on http://localhost:1420 (or similar)

# In browser or Tauri window:
# / → shows "Dashboard — Coming in Phase 3C"
# /tasks → shows "Tasks — Coming in Phase 3C"
# All routes work (no 404s)

# Backend connection test — open browser console:
fetch("http://localhost:8765/health").then(r => r.json()).then(console.log)
# Expected: {status: "ok", version: "2.0.0"}
# If CORS error: backend middleware.py CORS config needs localhost:1420 added

# Check Zustand store loads:
# Open React DevTools → stores → toolsStore should be visible

# TypeScript compiles clean:
npm run build
# Expected: no TypeScript errors
```

---

## Rules

1. Do not build any real page content — placeholders only
2. Do not modify any shadcn component files in `src/components/ui/`
3. The `GlobalTimerEffect` in App.tsx must be a separate component (not inside App directly) — hooks rules
4. `api/client.ts` uses native `fetch` not axios — keeps bundle lean
5. All TypeScript interfaces in `types/index.ts` must exactly match backend Pydantic schema field names
6. Do not add `"dark"` class to `<html>` — CSS variables are always dark, no class toggle needed

---

## Done when

- [ ] `npm run dev` starts without errors
- [ ] All 9 routes render placeholder content
- [ ] No TypeScript errors (`npm run build` clean)
- [ ] `fetch("http://localhost:8765/health")` from browser console returns 200
- [ ] `useToolsStore` visible in React DevTools with correct initial state
- [ ] DM Sans + DM Mono fonts load (check Network tab — Google Fonts requests)
