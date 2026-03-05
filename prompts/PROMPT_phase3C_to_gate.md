# TaskArena v2 — Phase 3C: Dashboard + Tasks Pages
# Depends on: Phase 3B complete (AppShell + tools working)

---

## PROMPT — Phase 3C

Phase 3B is complete. AppShell, sidebar, topbar, and all tools work. Now build the first two real pages.

Read `docs/UI_GUIDE.md` sections: "Dashboard Page" and "Tasks Page — Dedicated Workspace" before writing any code.

Build these files:
```
src/pages/DashboardPage.tsx       (replace placeholder)
src/pages/TasksPage.tsx           (replace placeholder)
src/components/shared/TaskCard.tsx
src/components/shared/StatCard.tsx
src/components/shared/DueChip.tsx
src/components/shared/PageHeader.tsx
src/components/shared/EmptyState.tsx
src/components/shared/LoadingSkeleton.tsx
src/hooks/useTasks.ts
src/hooks/useStats.ts
```

---

## `src/hooks/useTasks.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../api/client"
import type { Task, TaskCreate } from "../types"

export function useTasks(filters?: { type?: string; status?: string }) {
  const params = new URLSearchParams()
  if (filters?.type)   params.set("type",   filters.type)
  if (filters?.status) params.set("status", filters.status)
  const qs = params.toString() ? `?${params}` : ""

  return useQuery({
    queryKey: ["tasks", filters],
    queryFn:  () => api.get<Task[]>(`/tasks${qs}`),
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TaskCreate) => api.post<Task>("/tasks", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  })
}

export function useCompleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post<{ task: Task; xp_earned: number; new_total_xp: number }>(`/tasks/${id}/complete`, {}),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tasks"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
      // Show XP toast — import toast from sonner in the component that calls this
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  })
}
```

---

## `src/hooks/useStats.ts`

```typescript
import { useQuery } from "@tanstack/react-query"
import { api } from "../api/client"
import type { OverviewStats, RankingEntry } from "../types"

export function useOverviewStats() {
  return useQuery({
    queryKey: ["stats", "overview"],
    queryFn:  () => api.get<OverviewStats>("/stats/overview"),
    refetchInterval: 60_000, // refresh every minute
  })
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn:  () => api.get<RankingEntry[]>("/leaderboard?limit=3"),
  })
}

export function useWeekEvents() {
  return useQuery({
    queryKey: ["schedule", "week"],
    queryFn:  () => api.get("/schedule/week"),
  })
}
```

---

## `src/components/shared/StatCard.tsx`

```typescript
interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  color?: "blue" | "green" | "amber" | "violet" | "rose"
  trend?: "up" | "down" | "neutral"
}
```

Layout:
```
┌──────────────────────┐
│  LABEL          Icon │   ← 10px mono uppercase + icon in accent color
│                      │
│  42          ↗       │   ← 24px mono bold in accent + trend arrow
│  +8 this week        │   ← 11px tx3
└──────────────────────┘
```

Color mapping for value text and icon:
- blue → `text-blue-400`
- green → `text-emerald-400`
- amber → `text-amber-400`
- violet → `text-violet-400`
- rose → `text-rose-400`

---

## `src/components/shared/DueChip.tsx`

```typescript
interface DueChipProps {
  deadline: string | null
  status: "pending" | "completed"
}

// Logic:
// completed → green "✓ Done"
// deadline null → neutral "No deadline"
// days < 0 → rose "Overdue"
// days === 0 → amber "Due today"
// days <= 2 → amber "{n}d left"
// days > 2 → green "{n}d left"
```

Use shadcn `Badge` with the custom variants from `docs/UI_GUIDE.md` shadcn section.

---

## `src/components/shared/TaskCard.tsx`

```typescript
interface TaskCardProps {
  task: Task
  onComplete: (id: number) => void
  onDelete: (id: number) => void
  onFocus?: (task: Task) => void  // opens Pomodoro linked to this task
  compact?: boolean               // list view vs kanban card
}
```

Kanban card layout:
```
┌──────────────────────────────────────┐
│  ○  Essay on Renaissance Art   [···] │  ← checkbox + title + kebab menu
│                                      │
│  [assignment] [Art] [2d left] [+15]  │  ← chips row
│                                      │
│  [▶ Focus]                           │  ← focus button (ghost, small)
└──────────────────────────────────────┘
```

- Checkbox: `w-[18px] h-[18px] rounded-[4px] border-2 border-b2` — clicking calls `onComplete`
- Completed: `opacity-50`, title `line-through`, checkbox filled green
- Kebab menu (···): shadcn `DropdownMenu` with Edit / Delete options
- Type chip color: assignment=orange, study=blue, productivity=green
- Subject chip: neutral badge
- Focus button: only on pending tasks, ghost variant, small size
- On focus click: calls `useToolsStore.getState().pomodoroLink(task.id, task.title)` then opens pomodoro

List view (compact=true): single row, no focus button, tighter padding.

---

## `DashboardPage.tsx`

```typescript
/**
 * Read-only morning briefing.
 * NO task editing. Clicking tasks navigates to /tasks.
 * Data: useOverviewStats, useTasks({status:"pending"}), useWeekEvents, useLeaderboard
 */
```

Greeting:
```typescript
const hour = new Date().getHours()
const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
const name = "Raghav" // hardcoded for v2 — comes from profile in v2.1
```

Layout per `docs/UI_GUIDE.md` Dashboard section. Key points:
- Stat cards: XP Today, Streak, Tasks Done Today, Rank — use `useOverviewStats`
- Due Today: filter pending tasks where `deadline === today's date` — max 4 shown, "See all →" link to /tasks
- This Week Schedule: `useWeekEvents` — show as compact event list with day labels
- XP Progress bar: `user.xp / nextLevelXP * 100` — show current level and XP to next
- Weekly Leaderboard: top 3 from `useLeaderboard` — show name, XP, rank
- Daily Digest: static placeholder for now ("AI digest coming soon") — generate in v2.1

Loading state: show `LoadingSkeleton` cards while data fetches.
Error state: show `EmptyState` with retry button if `/api/stats/overview` fails (backend not running).

---

## `TasksPage.tsx`

```typescript
/**
 * Full task workspace.
 * View toggle: Kanban | List (stored in uiStore or local state)
 * Filters: type, status, course, due date
 * Add task: inline (quick) + modal (full)
 */
```

**State:**
```typescript
const [view, setView] = useState<"kanban" | "list">("kanban")
const [filters, setFilters] = useState({ type: "", status: "pending", course_id: "" })
const [filterOpen, setFilterOpen] = useState(false)
const [addModalOpen, setAddModalOpen] = useState(false)
const { data: tasks, isLoading } = useTasks(filters)
const completeTask = useCompleteTask()
const deleteTask = useDeleteTask()
```

**Kanban view:**
- Three columns: Assignment | Study | Productivity
- Each column renders filtered tasks of that type
- Column header: colored dot + title + `(N pending)` count + `+` button
- `+ Add task` row at bottom of each column (inline form: title input + Enter to add)
- Inline add only sets title + type — rest uses defaults

**List view:**
- Grouped by: `Overdue` / `Due Today` / `This Week` / `Later` / `Completed`
- Each group is collapsible (show/hide)
- Each row: checkbox + title + chips + right-aligned date
- Sort bar above list: "Sort by: Due date | XP | Created"

**Add task modal (full):**
```
Title *
Type * [Assignment | Study | Productivity]
Subject
Deadline [date picker]
Points [number, default 5]
Link to course [select dropdown from courses API]
[Cancel] [Add Task]
```

**On complete task:**
```typescript
const onComplete = async (id: number) => {
  const result = await completeTask.mutateAsync(id)
  toast.success(`✓ Task complete! +${result.xp_earned} XP`)
}
```

**Focus mode integration:**
```typescript
const onFocus = (task: Task) => {
  const store = useToolsStore.getState()
  store.pomodoroLink(task.id, task.title)
  store.pomodoroSetMode("focus")
  if (store.tools.pomodoro.state === "closed") store.openTool("pomodoro", "docked")
  store.pomodoroToggle()
  toast(`▶ Focusing on: ${task.title}`, { icon: "🍅" })
}
```

---

## Verification

```bash
npm run dev
```

- [ ] Dashboard loads with real data from backend (stat cards show actual numbers)
- [ ] Dashboard stat cards match `GET /api/stats/overview` values
- [ ] Due Today section shows correct tasks (deadline = today)
- [ ] Clicking a task on dashboard navigates to /tasks
- [ ] Tasks page loads with all tasks
- [ ] Kanban view shows 3 columns with tasks in correct columns
- [ ] Completing a task shows XP toast and removes task from pending
- [ ] List view toggle works, groups render correctly
- [ ] Add task modal opens, submits, new task appears
- [ ] Focus button on TaskCard opens Pomodoro and links task name
- [ ] Filter bar filters tasks correctly
- [ ] Loading skeleton shows before data arrives
- [ ] Empty state shows when no tasks match filter

---
---

# TaskArena v2 — Phase 3D: Chatbot + Schedule Pages
# Depends on: Phase 3C complete

---

## PROMPT — Phase 3D

Phase 3C is complete. Build the Chatbot and Schedule pages.

Read `docs/UI_GUIDE.md` sections: "AI Tutor Page" and "Smart Schedule Page".

Build:
```
src/pages/ChatbotPage.tsx      (replace placeholder)
src/pages/SchedulePage.tsx     (replace placeholder)
src/components/shared/MessageBubble.tsx
src/components/shared/ProviderBadge.tsx
src/hooks/useChat.ts
src/hooks/useSchedule.ts
```

---

## `src/hooks/useChat.ts`

```typescript
export function useConversations() { /* GET /chat/conversations */ }
export function useMessages(convId: number) { /* GET /chat/conversations/{id}/messages */ }
export function useCreateConversation() { /* POST /chat/conversations */ }
export function useDeleteConversation() { /* DELETE /chat/conversations/{id} */ }
export function useUpdateContext() { /* PATCH /chat/conversations/{id}/context */ }
```

SSE streaming is handled directly in `ChatbotPage` — not in a hook, because hooks can't easily manage streaming state.

---

## `ChatbotPage.tsx`

**Layout** per `docs/UI_GUIDE.md` AI Tutor section:
```
┌──────────────────┬─────────────────────────────────────┐
│ Conversations    │ [Title] [Course context] [Provider] │
│ sidebar (230px)  ├─────────────────────────────────────┤
│                  │ Message thread (scroll area)        │
│ [+ New]          │                                     │
│ ──────────────── │                                     │
│ Conversation list│                                     │
│                  ├─────────────────────────────────────┤
│                  │ [📎] [textarea]          [Send →]   │
└──────────────────┴─────────────────────────────────────┘
```

**SSE streaming implementation:**
```typescript
const sendMessage = async (content: string) => {
  if (!activeConvId || !content.trim() || isStreaming) return

  // Add user message to local state immediately (optimistic)
  setMessages(prev => [...prev, {
    id: Date.now(),
    role: "user",
    content,
    sources: [],
    created_at: new Date().toISOString(),
  }])

  setIsStreaming(true)
  setStreamingContent("")

  try {
    const response = await fetch(`${BASE_API}/chat/conversations/${activeConvId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, provider: activeProvider, model: activeModel }),
    })

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue
        const data = JSON.parse(line.slice(6))

        if (data.token) {
          setStreamingContent(prev => prev + data.token)
        }
        if (data.done) {
          // Streaming complete — add final message, clear streaming state
          setMessages(prev => [...prev, {
            id: data.message_id,
            role: "assistant",
            content: streamingContentRef.current,
            sources: data.sources ?? [],
            created_at: new Date().toISOString(),
          }])
          setStreamingContent("")
          setIsStreaming(false)
          refetchMessages()
        }
        if (data.error) {
          toast.error(`AI error: ${data.error}`)
          setIsStreaming(false)
        }
      }
    }
  } catch (err) {
    toast.error("Failed to send message")
    setIsStreaming(false)
  }
}
```

**Streaming bubble** (shows while streaming):
```typescript
{isStreaming && (
  <MessageBubble
    role="assistant"
    content={streamingContent}
    isStreaming={true}  // shows blinking cursor at end
  />
)}
```

**Typing indicator** (before first token):
```typescript
{isStreaming && streamingContent === "" && (
  <div className="flex items-center gap-1.5 px-4 py-2">
    <div className="w-1.5 h-1.5 rounded-full bg-tx3 animate-tdot1" />
    <div className="w-1.5 h-1.5 rounded-full bg-tx3 animate-tdot2" />
    <div className="w-1.5 h-1.5 rounded-full bg-tx3 animate-tdot3" />
  </div>
)}
```

**Context selector** (new conversation):
```typescript
// shadcn Dialog with 4 options:
// [1] Whole course → course select dropdown
// [2] Specific folder → course → folder dropdowns
// [3] Specific file → course → folder → file dropdowns
// [4] No context
```

**Provider badge** (in conversation header):
```typescript
// ⚡ Groq · llama-3.3-70b  or  💻 Local · Qwen2.5  or  🦙 Ollama · qwen2.5:7b
// Clicking opens provider selector dropdown
```

**Input area:**
- shadcn `Textarea` — auto-grows (max 5 lines, `resize: none`)
- Send on Enter, newline on Shift+Enter
- Disabled while streaming
- Attach button (📎) — placeholder for now, "File upload coming in v2.1"

---

## `SchedulePage.tsx`

**Layout** per `docs/UI_GUIDE.md` Smart Schedule section:
```
┌──────────────────────────────┬────────────────────────┐
│ Calendar (60%)               │ Sidebar (40%)          │
│ Month grid                   │ Week strip             │
│ Day timeline below           │ AI Suggestions panel   │
│                              │ Upcoming Deadlines     │
└──────────────────────────────┴────────────────────────┘
```

**Calendar month grid:**
```typescript
// Generate 6 weeks × 7 days grid
// Each cell shows: date number + up to 2 event colored bars
// Today: date in blue filled circle
// Selected: blue border
// Other month: 30% opacity
// Event bar: 4px height, rounded, colored by type
// Colors: study=blue, assignment=orange, exam=rose, break=green
```

**Day timeline** (shows when a date is selected):
```typescript
// Vertical timeline for selected day's events
// Format: HH:MM • [colored dot] • Event title • duration
// Click event → edit modal
```

**AI Suggestions panel:**
```typescript
// Button: "✦ Get AI Suggestions" → calls GET /schedule/suggestions
// Shows loading state during fetch (may take 10-30s)
// Each suggestion: priority badge + title + date/time + reason
// [Schedule it] → POST /schedule/suggestions/accept
// [Dismiss] → removes from list locally
```

**Add event modal:**
```
Title *
Type * [Study | Assignment | Exam | Break | Other]
Date * [date input]
Start time [time input, optional]
Duration [number, minutes, optional]
Link to course [select, optional]
Notes [textarea, optional]
[Cancel] [Add Event]
```

Event type colors applied to modal border and type selector.

---

## Verification 3D

- [ ] Chatbot page loads, conversation list shows
- [ ] Creating new conversation opens chat
- [ ] Sending message streams tokens (watch them appear word by word)
- [ ] Sources appear below assistant message after streaming ends
- [ ] Context selector works — course/folder/file options available
- [ ] Provider badge shows current provider, clicking opens switcher
- [ ] Schedule page loads with calendar
- [ ] Today highlighted in blue
- [ ] Clicking a date shows day timeline
- [ ] Events from seed data appear as colored bars
- [ ] Add event modal works, new event appears on calendar
- [ ] AI suggestions fetch and display (requires GROQ_API_KEY)
- [ ] Accepting a suggestion adds it to calendar

---
---

# TaskArena v2 — Phase 3E: Notes + Study Hub Pages
# Depends on: Phase 3D complete

---

## PROMPT — Phase 3E

Phase 3D is complete. Build the Notes Library and Study Hub pages.

Read `docs/UI_GUIDE.md` sections: "Study Library Page" and "Study Hub Page".

Build:
```
src/pages/NotesPage.tsx        (replace placeholder)
src/pages/StudyHubPage.tsx     (replace placeholder)
src/hooks/useNotes.ts
src/hooks/useStudyHub.ts
```

---

## `NotesPage.tsx`

Two-level navigation: course grid → course view (folders + files).

**Course grid:**
- Each course card: colored top bar + name + code + folder count + file count
- Color from `course.color`
- Click → navigate into course view

**Course view (in-page navigation, not a new route):**
```typescript
const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
// Breadcrumb: Library > Physics 201 > Chapter 3
```

**File list:**
- Shows: name, size formatted (KB/MB), indexed status chip, chunk count
- Shows original_path as dim secondary line below name
- Status chips: `✓ indexed (N chunks)` green | `○ not indexed` neutral | `⟳ indexing...` amber
- Actions: [Index] [Delete]

**Add file flow:**
```typescript
// Tauri file dialog:
import { open } from "@tauri-apps/plugin-dialog"

const pickFile = async () => {
  const path = await open({
    multiple: false,
    filters: [{ name: "Documents", extensions: ["pdf", "docx", "txt", "md"] }]
  })
  if (path) {
    const name = path.split(/[\\/]/).pop() ?? "file"
    await api.post(`/notes/folders/${folderId}/files`, { name, path })
    refetchFiles()
  }
}
```

**Indexing with progress:**
```typescript
const indexFile = async (fileId: number) => {
  setIndexingId(fileId)
  try {
    const result = await api.post(`/notes/files/${fileId}/index`, {})
    toast.success(`✓ Indexed ${result.chunks_created} chunks`)
    refetchFiles()
  } finally {
    setIndexingId(null)
  }
}
```

**Semantic search:**
```typescript
// Search input at top of course view
// Calls GET /notes/courses/{id}/search?q={query}&folder_id={optional}
// Results show as cards: score badge + file name + chunk preview (120 chars)
```

---

## `StudyHubPage.tsx`

Course grid → Course view with material type tabs.

**Course grid:** same as NotesPage but shows counts per material type.

**Material tabs:** Quizzes | Study Notes | Revision | Formula Sheet | Q&A | Practice Exams

**Quizzes tab:**
- Grid of quiz cards per `docs/UI_GUIDE.md` Quiz Hub section
- Each card: title, difficulty badge, question count, best score progress bar, attempt count
- Actions: [▶ Start] [🗑 Delete]
- [+ Generate New Quiz] button → generate modal

**Generate modal** (shared across material types):
```typescript
// Scope: Whole course | Specific folder [dropdown] | Specific file [dropdown]
// Provider: Groq | Local | Ollama
// Type-specific options (quiz: difficulty + n_questions)
```

**Quiz generation SSE:**
```typescript
// Same ReadableStream approach as chatbot
// Show progress steps: Searching → Building prompt → Generating → Saving
// After done: navigate to quiz OR show it inline
```

**Taking a quiz (in-page, full-screen overlay):**
```typescript
// Covers the page content area with:
// Progress bar at top (Q N of total)
// Question + 4 options (radio buttons styled as large option cards)
// Selected: blue border + blue dim background
// After answering: show correct/incorrect feedback + explanation
// [Next Question] button
// Final results: score, XP earned, per-question breakdown
```

**Other material tabs (Study Notes, Revision, Formula Sheet, Q&A):**
- List of generated items with: title, date, course
- Click → view content in a modal or inline panel (markdown rendered)
- [+ Generate] button for each tab
- For v2 Phase 3E: show "Coming soon" placeholder for non-quiz tabs
- Add the generation infrastructure but leave display as placeholder

---

## Verification 3E

- [ ] Notes page loads course grid
- [ ] Clicking course shows folder list
- [ ] Clicking folder shows file list with indexed status
- [ ] Add file: Tauri file picker opens (in Tauri mode) or path input (browser mode)
- [ ] Index file: status changes to indexing then indexed with chunk count
- [ ] Semantic search returns results with scores
- [ ] Study Hub loads course grid with material counts
- [ ] Quizzes tab shows generated quizzes from Phase 1E
- [ ] Start quiz → question flow works → results show XP earned
- [ ] Generate new quiz → SSE progress shows → quiz appears in list

---
---

# TaskArena v2 — Phase 3F: Leaderboard + Stats + Profile
# Depends on: Phase 3E complete

---

## PROMPT — Phase 3F

Phase 3E is complete. Build the final three pages.

Read `docs/UI_GUIDE.md` sections: Leaderboard, Statistics, Profile pages.

Build:
```
src/pages/LeaderboardPage.tsx  (replace placeholder)
src/pages/StatsPage.tsx        (replace placeholder)
src/pages/ProfilePage.tsx      (replace placeholder)
src/hooks/useProfile.ts
```

---

## `LeaderboardPage.tsx`

Per `docs/UI_GUIDE.md` Leaderboard section.

**Layout:**
```
Period selector: [All Time] [This Week]
Rankings table (flex-1) | Your Stats sidebar (280px)
```

**Rankings table:**
- Columns: Rank · Name (avatar + name + level) · XP · Tasks · Streak · Weekly XP
- 🥇🥈🥉 for top 3, `#N` after
- Current user row: `bg-[var(--bd)]` highlight + `← YOU` suffix
- Hover: `bg-s2`
- XP formatted with commas: `2,345`

**Your Stats sidebar:**
- Rank, XP, Level, Tasks, Streak, Weekly XP
- Quiz stats: attempts + avg score

Data: `GET /leaderboard?period=alltime` and `GET /leaderboard?period=weekly` and `GET /leaderboard/me`

---

## `StatsPage.tsx`

Per `docs/UI_GUIDE.md` Statistics section.

**Period selector:** Week | Month | All Time — changes data range.

**Layout:**
```
Stat cards (4 columns)
Charts row: Tasks Completed area chart | XP Earned area chart
Bottom row: Task Breakdown | Activity Heatmap
```

**Charts:** Use Recharts `AreaChart`.
```typescript
// Gradient fill:
<defs>
  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
  </linearGradient>
</defs>
<Area dataKey="tasks_completed" stroke="#3b82f6" fill="url(#blueGrad)" />
```
No grid lines. Custom tooltip with dark background.

**Activity heatmap:**
```typescript
// 28 cells (4 weeks), today on right
// Intensity: 0=s2, low=#1a3a2a, med=#065f46, high=#10b981
// Tooltip on hover: "Mar 4: 3 tasks, +30 XP"
```

**Task breakdown:** Progress bars per type showing completed/pending ratio.

---

## `ProfilePage.tsx`

Per `docs/UI_GUIDE.md` Profile section.

**Layout:** Profile card (260px) | Settings cards (flex-1)

**Profile card:**
- Large avatar: 68px, gradient bg, initials
- Name, email
- XP progress bar: `Lv.N · Title` + `{xp} / {nextLevelXP} XP`
- Badge grid (placeholder badges for now)

**XP thresholds for level display:**
```typescript
const THRESHOLDS = [0, 100, 250, 500, 850, 1300, 1900, 2700, 3700, 5000]
const getLevel = (xp: number) => {
  for (let i = THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= THRESHOLDS[i]) return i + 1
  }
  return 1
}
const nextThreshold = (level: number) => level <= 9 ? THRESHOLDS[level] : THRESHOLDS[9] + (level - 9) * 700
```

**Settings cards:**
- Personal Info: name + email inputs + Save button
- AI Model Settings: provider selector cards (Local | Groq | Ollama) + API key input (masked) + model dropdown
- Preferences: toggles (placeholder — "Notifications", "Sound effects", "Auto-index files")

**AI config:**
```typescript
// GET /profile/ai-config → show which providers are available
// Local: shows path + exists/missing status
// Groq: shows key set/missing + model selector
// Ollama: shows URL + available/unavailable status
```

---

## Verification 3F

- [ ] Leaderboard shows rankings with Raghav at rank 1
- [ ] Period toggle switches between all-time and weekly
- [ ] Your Stats sidebar shows accurate numbers
- [ ] Stats page loads all 4 sections
- [ ] Area charts render with gradient fill
- [ ] Heatmap shows 28 cells with correct intensity
- [ ] Profile page loads user data
- [ ] XP progress bar shows correct level and progress
- [ ] AI config section shows correct provider availability
- [ ] Saving profile name/email calls PATCH /profile

---
---

# TaskArena v2 — Phase 3 Gate Check
# Run after Phase 3F is complete

---

## PROMPT — Phase 3 Gate

Phase 3F is complete. Run the full frontend verification. Both the backend (port 8765) and frontend dev server must be running.

**Every check must pass. Report each one individually.**

---

### Check 1 — Build passes clean
```bash
cd frontend && npm run build
```
✅ PASS if: zero TypeScript errors, zero build errors
❌ FAIL if: any error or warning that stops the build

---

### Check 2 — All routes render without crashing
Visit each route, confirm it renders without a white screen or console error:
- [ ] `/` — Dashboard
- [ ] `/tasks` — Tasks
- [ ] `/chat` — Chatbot
- [ ] `/schedule` — Schedule
- [ ] `/notes` — Notes
- [ ] `/study-hub` — Study Hub
- [ ] `/leaderboard` — Leaderboard
- [ ] `/stats` — Stats
- [ ] `/profile` — Profile

---

### Check 3 — Real data displays
- [ ] Dashboard stat cards show non-zero numbers (XP, streak, tasks)
- [ ] Tasks page shows tasks from DB (not empty)
- [ ] Notes page shows 3+ courses from DB
- [ ] Leaderboard shows Raghav Sethi at rank 1
- [ ] Stats overview numbers match `curl http://localhost:8765/api/stats/overview`

---

### Check 4 — Tools system
- [ ] All 6 tool icons visible in topbar
- [ ] Clicking any icon opens it docked in right panel
- [ ] Right panel appears/disappears correctly
- [ ] Pop-out button makes tool float as draggable card
- [ ] Dragging floating tool moves it, position persists on navigation
- [ ] Dock button snaps floating tool back to panel
- [ ] Pomodoro timer counts down correctly
- [ ] Timer keeps running when navigating between pages
- [ ] Topbar icon pulses when timer runs with tool closed
- [ ] Calculator computes correctly (test: 2+2=4, sin(0)=0)

---

### Check 5 — Core interactions
- [ ] Complete a task → XP toast appears → task moves to completed
- [ ] Add a new task via modal → appears in correct Kanban column
- [ ] Focus button on task → Pomodoro opens linked to task name
- [ ] Send chat message → tokens stream in real time
- [ ] Accept AI schedule suggestion → event appears on calendar
- [ ] Start quiz → answer questions → see score and XP earned

---

### Check 6 — Sidebar
- [ ] Collapse toggle shrinks sidebar to icons-only
- [ ] Tooltips show on collapsed hover
- [ ] Active route highlighted correctly on all pages
- [ ] Collapse state persists on page refresh

---

### Check 7 — No console errors
Open browser DevTools → Console tab. Navigate through all pages.
✅ PASS if: no red errors (warnings are ok)
❌ FAIL if: any uncaught error, failed API call (4xx/5xx), or React error boundary triggered

---

### Check 8 — Responsive (basic)
Resize browser window to 900px wide:
- [ ] Layout doesn't break
- [ ] Sidebar collapses automatically or content stays usable
- [ ] No horizontal overflow

---

## Pass criteria

All 8 checks passing = Phase 3 complete = v2.0 ready.

Report:
```
✅ Phase 3 Gate: PASSED
All 9 pages render without errors.
Real data displays from backend.
Tools system fully functional.
Core interactions verified.
Build compiles clean.
TaskArena v2.0 is ready.
```
