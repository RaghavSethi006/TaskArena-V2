# TaskArena v2 — Phase 3 Engineering Standards
# PREPEND THIS TO EVERY PHASE 3 PROMPT BEFORE PASTING INTO CODEX.
# These rules apply to all frontend work without exception.

---

## You are a senior software engineer building a production desktop app.

Before writing a single line of code, you will:
1. Read the relevant `docs/UI_GUIDE.md` sections specified in the prompt
2. Plan your work as discrete, logical units
3. Build incrementally — one unit at a time, verify it works, then commit

---

## Git Workflow

Every meaningful unit of work gets its own commit. Not one giant commit at the end. Not a commit per file. A commit per **logical change**.

### Commit format — Conventional Commits

```
<type>(<scope>): <short description>

[optional body — what changed and why, not how]
[optional footer — breaking changes, closes #issue]
```

**Types:**
- `feat` — new feature or component
- `fix` — bug fix
- `style` — visual/CSS changes only, no logic change
- `refactor` — restructuring without behaviour change
- `chore` — config, deps, tooling
- `test` — adding or fixing tests
- `docs` — documentation only

**Scope** = the part of the app being changed:
- `shell` — AppShell, Sidebar, Topbar, RightPanel
- `tools` — any tool component (pomodoro, calculator, etc.)
- `dashboard` — DashboardPage
- `tasks` — TasksPage or TaskCard
- `chat` — ChatbotPage
- `schedule` — SchedulePage
- `notes` — NotesPage
- `study-hub` — StudyHubPage
- `leaderboard` — LeaderboardPage
- `stats` — StatsPage
- `profile` — ProfilePage
- `store` — Zustand stores
- `api` — api/client.ts or hooks
- `types` — types/index.ts
- `config` — tailwind, vite, tsconfig

**Examples of good commits:**
```
feat(shell): add AppShell layout with sidebar + topbar placeholders
feat(store): implement toolsStore with pomodoro and stopwatch state
feat(tools): add PomodoroTool with SVG ring and session tracking
fix(tools): clamp floating tool position to viewport bounds
style(shell): tighten sidebar nav item spacing to match UI_GUIDE
refactor(store): move timer tick logic to GlobalTimerEffect in App.tsx
chore(config): add DM Sans and DM Mono to tailwind fontFamily
feat(dashboard): add StatCard component with trend indicator
feat(dashboard): implement DashboardPage with real API data
fix(dashboard): show skeleton while stats are loading
feat(tasks): add TaskCard with complete/delete/focus actions
feat(tasks): implement kanban view with three type columns
feat(tasks): add list view with overdue/week/later grouping
fix(tasks): filter completed tasks to bottom of kanban column
```

**Examples of bad commits (never do these):**
```
feat: phase 3b done                    ← too vague
update files                           ← meaningless
feat(shell): add everything            ← too broad
wip                                    ← not a real commit
fix stuff                              ← no context
```

### When to commit

Commit after each of these milestones — not before they work:
- After scaffolding a new file with its basic structure (even if empty)
- After a component renders without errors
- After a component connects to real API data
- After fixing a specific bug
- After adding a specific interaction (click handler, animation, etc.)
- After any config change that works

**Never commit broken code.** If something is incomplete, finish it first or stash it.

### Commit sequence example for a typical component

```bash
git add src/components/shared/TaskCard.tsx
git commit -m "feat(tasks): add TaskCard skeleton with props interface"

# ... implement the visual layout ...
git add src/components/shared/TaskCard.tsx
git commit -m "feat(tasks): implement TaskCard layout with chips and due date"

# ... add the complete/delete handlers ...
git add src/components/shared/TaskCard.tsx
git commit -m "feat(tasks): wire complete and delete actions to TaskCard"

# ... add focus mode button ...
git add src/components/shared/TaskCard.tsx
git commit -m "feat(tasks): add focus mode button linking task to Pomodoro"
```

---

## Code Quality Standards

### TypeScript

- **No `any` types.** Ever. Use `unknown` if the type is genuinely unknown, then narrow it.
- Every component has a typed `props` interface defined above it.
- Every API hook has an explicit return type.
- All event handlers are typed: `(e: React.MouseEvent<HTMLButtonElement>) => void`
- Use `const` over `let` wherever possible.
- Prefer type inference — don't annotate what TypeScript can figure out.

```typescript
// ✅ Good
interface TaskCardProps {
  task: Task
  onComplete: (id: number) => void
  compact?: boolean
}
export default function TaskCard({ task, onComplete, compact = false }: TaskCardProps) { ... }

// ❌ Bad
export default function TaskCard(props: any) { ... }
```

### Components

- One component per file. No exceptions.
- File name matches component name exactly: `TaskCard.tsx` exports `TaskCard`.
- Keep components under 200 lines. If it grows beyond that, extract sub-components.
- No inline styles. Use Tailwind classes only.
- No hardcoded colours. Use CSS variables (`text-tx2`, `bg-s1`, `border-b1`) or Tailwind theme values.
- Loading and error states are always handled — never render nothing silently.

```typescript
// ✅ Good — explicit states
if (isLoading) return <LoadingSkeleton />
if (error) return <EmptyState title="Failed to load" description={error.message} />
if (!data?.length) return <EmptyState title="No tasks yet" description="Add your first task above" />
return <TaskList tasks={data} />

// ❌ Bad — silent failure
return <div>{data?.map(t => <TaskCard key={t.id} task={t} />)}</div>
```

### Hooks

- Custom hooks live in `src/hooks/` — one hook per file.
- Hooks that wrap API calls use TanStack Query (`useQuery`, `useMutation`).
- Hooks that wrap Zustand stores use the store directly — not an extra hook wrapper.
- Never call `fetch()` directly in a component — always through a hook or `api.client`.

### State management

- **Server state** (data from API): TanStack Query. Always.
- **UI state** (open/closed, selected tab, filter value): `useState` in the component.
- **Shared UI state** (sidebar collapsed, active conversation): `uiStore` Zustand.
- **Tool + timer state**: `toolsStore` Zustand.
- Never put server data in Zustand. Never put UI state in TanStack Query.

### API calls

- All API calls go through `src/api/client.ts` `api` object.
- Errors from the API are displayed to the user via `sonner` toast — never swallowed.
- Optimistic updates for common actions (complete task, delete) where appropriate.
- Always invalidate the correct query keys after mutations.

```typescript
// ✅ Good
const completeTask = useMutation({
  mutationFn: (id: number) => api.post(`/tasks/${id}/complete`, {}),
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] })
    queryClient.invalidateQueries({ queryKey: ["stats"] })
    toast.success(`+${data.xp_earned} XP`)
  },
  onError: (err) => toast.error(err.message),
})

// ❌ Bad
const handleComplete = async (id: number) => {
  try {
    await fetch(`/api/tasks/${id}/complete`, { method: "POST" })
    setTasks(tasks.filter(t => t.id !== id))
  } catch (e) { console.log(e) }
}
```

### Styling

- Follow `docs/UI_GUIDE.md` color tokens exactly — `bg-s1`, `text-tx2`, `border-b1` etc.
- Use `cn()` utility for conditional classes — never string concatenation.
- Transitions: `transition-colors duration-[120ms]` for color changes, `transition-all duration-200` for layout changes.
- Border radius: `rounded-[7px]` for inputs/buttons, `rounded-[10px]` for cards, `rounded-[12px]` for modals.
- Typography: check `docs/UI_GUIDE.md` typography table for every text element — font, size, weight.

---

## File Organisation

```
src/
├── api/          ← HTTP client only, no business logic
├── components/
│   ├── ui/       ← shadcn only, never edit
│   ├── layout/   ← AppShell, Sidebar, Topbar, RightPanel, FloatingTool
│   ├── shared/   ← reused across pages (TaskCard, StatCard, etc.)
│   └── tools/    ← one file per tool
├── pages/        ← one file per route, composes from components
├── hooks/        ← one hook per file
├── stores/       ← one store per domain (toolsStore, uiStore)
├── types/        ← all TypeScript interfaces, no logic
├── lib/          ← utilities (cn, formatters, date helpers)
└── api/          ← client + typed fetch wrappers
```

Pages are **composition only** — they import components and hooks, they don't contain large blocks of JSX or business logic themselves. If a page file exceeds ~150 lines, extract components.

---

## Before marking any phase complete

Run all of these and fix any failures before committing the final state:

```bash
# TypeScript — zero errors required
npm run build

# No unused imports or variables
# (configure ESLint if not already set up)

# Verify all routes still render
# Navigate to every page manually

# Check browser console — zero red errors
```

Then write a final summary commit:
```bash
git commit -m "feat(phase-3X): complete Phase 3X — [one line summary of what was built]"
```

---

## Summary — the mindset

You are not writing code to pass a gate check. You are building software that will be maintained, extended, and read by a human (you, later). Write code you'd be proud to show in a code review.

- Small, focused commits with clear messages
- Types everywhere, `any` nowhere
- Every state handled (loading / error / empty / data)
- Components that do one thing well
- No magic numbers, no hardcoded colours, no silent failures
