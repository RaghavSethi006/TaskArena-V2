# TaskArena v2 — Phase 3B: AppShell + Tools System
# Depends on: Phase 3A complete (routing works, placeholder pages render)
# Goal: Full sidebar, topbar, right panel, and all 6 tools working
#       independently (dock/float/close). Timer persists across pages.

---

## PROMPT

---

Phase 3A is complete. Routing works. Now build the full app shell and tools system.

Before writing any code read:
1. `docs/UI_GUIDE.md` — AppShell layout, Sidebar specs, Topbar specs, Tools System section (VSCode-style panels)
2. `docs/CONVENTIONS.md` — component structure rules

Build exactly these files:

```
src/components/layout/AppShell.tsx      (replace placeholder)
src/components/layout/Sidebar.tsx       (replace placeholder)
src/components/layout/Topbar.tsx        (replace placeholder)
src/components/layout/RightPanel.tsx    (replace placeholder)
src/components/layout/FloatingTool.tsx  (new)
src/components/tools/PomodoroTool.tsx
src/components/tools/StopwatchTool.tsx
src/components/tools/CalculatorTool.tsx
src/components/tools/StickyNotesTool.tsx
src/components/tools/QuickTodoTool.tsx
src/components/tools/QuickLinksTool.tsx
src/stores/uiStore.ts
```

---

## `src/stores/uiStore.ts`

```typescript
import { create } from "zustand"
import { persist } from "zustand/middleware"

interface UIStore {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
    }),
    { name: "taskarena-ui" }
  )
)
```

---

## `src/components/layout/AppShell.tsx`

```typescript
/**
 * Root layout. Three columns: Sidebar | Main | RightPanel (auto)
 * Right panel auto-shows when any tool is docked.
 * All panels animate on open/close.
 */
```

Structure:
```
<div className="flex h-screen w-screen overflow-hidden bg-bg">
  <Sidebar />
  <div className="flex flex-col flex-1 overflow-hidden min-w-0">
    <Topbar />
    <main className="flex-1 overflow-y-auto bg-bg p-6">
      {children}
    </main>
  </div>
  <RightPanel />
  {/* Floating tools rendered at root level — above everything */}
  <FloatingToolsLayer />
</div>
```

`FloatingToolsLayer` renders all 6 tools conditionally when state === "floating". It lives at the AppShell level so floating tools sit above all page content.

---

## `src/components/layout/Sidebar.tsx`

Implement exactly per `docs/UI_GUIDE.md` Sidebar section.

**Key specs:**
- Width: `220px` expanded, `56px` collapsed
- Transition: `width 0.2s ease, min-width 0.2s ease`
- Background: `bg-s1 border-r border-b1`
- Height: `100vh`, `overflow-y: auto`, `overflow-x: hidden`

**Nav item component:**
```typescript
interface NavItemProps {
  icon: LucideIcon
  label: string
  path: string
  collapsed: boolean
}

function NavItem({ icon: Icon, label, path, collapsed }: NavItemProps) {
  const isActive = useMatch(path) !== null  // react-router useMatch

  return (
    <NavLink to={path}>
      <div className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-[7px] border transition-all duration-[120ms] cursor-pointer mx-2",
        "border-transparent text-tx2",
        "hover:bg-s2 hover:text-tx hover:border-b1",
        isActive && "bg-[var(--bd)] text-blue-400 border-blue-500/20",
        collapsed && "justify-center px-0 mx-2"
      )}>
        <Icon className={cn("w-[15px] h-[15px] flex-shrink-0", isActive && "text-blue-400")} />
        {!collapsed && <span className="text-[12.5px] font-medium truncate">{label}</span>}
      </div>
    </NavLink>
  )
}
```

**Section labels** (hidden when collapsed):
```typescript
{!collapsed && (
  <div className="px-5 pt-4 pb-1">
    <span className="text-[10px] font-bold font-mono uppercase tracking-[0.8px] text-tx3">
      {section}
    </span>
  </div>
)}
```

**User row at bottom:**
```typescript
// Pinned to bottom: mt-auto
<div className="mt-auto p-3 border-t border-b1">
  <div className={cn("flex items-center gap-2.5 px-2 py-2 rounded-[7px]", collapsed && "justify-center")}>
    {/* Avatar: 28px square, border-radius 7px, gradient bg, initials */}
    <div className="w-7 h-7 rounded-[7px] bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
      <span className="text-[10px] font-bold text-white font-mono">RS</span>
    </div>
    {!collapsed && (
      <div className="min-w-0">
        <div className="text-[12px] font-semibold text-tx truncate">Raghav Sethi</div>
        <div className="text-[10px] text-tx3 font-mono">Lv.14 · 2340 XP</div>
      </div>
    )}
  </div>
</div>
```

**Collapse toggle button:**
```typescript
// Absolutely positioned at bottom-right of sidebar
<button
  onClick={toggleSidebar}
  className="absolute bottom-[70px] -right-3 w-6 h-6 rounded-full bg-s2 border border-b1 flex items-center justify-center hover:bg-s3 transition-colors"
>
  <ChevronRight className={cn("w-3 h-3 text-tx3 transition-transform duration-200", !collapsed && "rotate-180")} />
</button>
```

**Tooltip on collapsed nav items:**
Wrap each NavItem in shadcn `<Tooltip>` when `collapsed === true`. Show the label. Tooltip side: "right".

---

## `src/components/layout/Topbar.tsx`

Height: `50px`. Background: `bg-s1 border-b border-b1`.

```
[≡ hamburger (mobile)] [Page title]    [Search pill]    [🍅][⏱][🔢][📝][✓][🔗]  [🔔] [RS▼]
```

**Search pill:**
```typescript
<div className="hidden md:flex items-center gap-2 bg-s2 border border-b1 rounded-[7px] px-3 py-1.5 w-[200px] hover:w-[280px] focus-within:w-[280px] transition-all duration-200 cursor-text">
  <Search className="w-3 h-3 text-tx3 flex-shrink-0" />
  <input
    placeholder="Search..."
    className="bg-transparent text-[12.5px] text-tx placeholder:text-tx3 outline-none w-full"
  />
  <span className="text-[10px] text-tx3 font-mono flex-shrink-0">⌘K</span>
</div>
```

**Tool icons row** — 6 icons, each with state indicator:
```typescript
const TOOL_ICONS: { id: ToolId; icon: LucideIcon; label: string }[] = [
  { id: "pomodoro",   icon: Timer,      label: "Pomodoro" },
  { id: "stopwatch",  icon: Stopwatch,  label: "Stopwatch" },
  { id: "calculator", icon: Calculator, label: "Calculator" },
  { id: "notes",      icon: StickyNote, label: "Sticky Notes" },
  { id: "todo",       icon: ListChecks, label: "Quick Todo" },
  { id: "links",      icon: Link,       label: "Quick Links" },
]

function ToolIcon({ id, icon: Icon, label }: { id: ToolId; icon: LucideIcon; label: string }) {
  const { tools, openTool, closeTool } = useToolsStore()
  const state = tools[id].state
  const isRunning = id === "pomodoro" && useToolsStore(s => s.pomodoro.running)

  const handleClick = () => {
    if (state === "closed") openTool(id, "docked")
    else if (state === "docked") closeTool(id)
    else if (state === "floating") closeTool(id)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleClick}
          className={cn(
            "w-[30px] h-[30px] rounded-[6px] flex items-center justify-center relative transition-colors duration-[120ms]",
            "hover:bg-s2",
            state === "docked"    && "text-blue-400",
            state === "floating"  && "text-violet-400",
            state === "closed"    && "text-tx3",
          )}
        >
          <Icon className="w-[14px] h-[14px]" />
          {/* State dot */}
          {state !== "closed" && (
            <span className={cn(
              "absolute bottom-[3px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
              state === "docked"   && "bg-blue-400",
              state === "floating" && "bg-violet-400",
            )} />
          )}
          {/* Pulse ring when timer running but tool closed */}
          {isRunning && state === "closed" && (
            <span className="absolute inset-0 rounded-[6px] border border-amber-400/40 animate-ping" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-[11px]">
        {label} {state !== "closed" ? `(${state})` : ""}
      </TooltipContent>
    </Tooltip>
  )
}
```

**User dropdown:**
```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button className="flex items-center gap-2 px-2 py-1 rounded-[7px] hover:bg-s2 transition-colors">
      <div className="w-6 h-6 rounded-[5px] bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
        <span className="text-[9px] font-bold text-white font-mono">RS</span>
      </div>
      <ChevronDown className="w-3 h-3 text-tx3" />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="bg-s1 border-b1 w-48">
    <DropdownMenuItem onClick={() => navigate("/profile")}>
      <User className="w-3.5 h-3.5 mr-2" /> Profile
    </DropdownMenuItem>
    <DropdownMenuSeparator className="bg-b1" />
    <DropdownMenuItem className="text-tx3 text-[11px] font-mono cursor-default">
      v2.0.0
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## `src/components/layout/RightPanel.tsx`

Auto-shows when any tool is docked. Slides in from right.

```typescript
export default function RightPanel() {
  const { tools } = useToolsStore()
  const anyDocked = Object.entries(tools).some(([_, t]) => t.state === "docked")

  return (
    <div className={cn(
      "flex-shrink-0 bg-s1 border-l border-b1 overflow-y-auto transition-all duration-200",
      anyDocked ? "w-[280px]" : "w-0 border-0 overflow-hidden"
    )}>
      {anyDocked && (
        <div className="flex flex-col">
          {TOOL_DEFINITIONS.map(({ id, label, icon: Icon, component: ToolComponent }) =>
            tools[id].state === "docked" && (
              <DockedToolSection key={id} id={id} label={label} icon={Icon}>
                <ToolComponent />
              </DockedToolSection>
            )
          )}
        </div>
      )}
    </div>
  )
}

function DockedToolSection({ id, label, icon: Icon, children }) {
  const { popOut, closeTool } = useToolsStore()
  return (
    <div className="border-b border-b1">
      <div className="flex items-center justify-between px-3 py-2 bg-s2/50">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-tx3" />
          <span className="text-[11px] font-semibold text-tx2">{label}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => popOut(id)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-s3 text-tx3 hover:text-tx transition-colors" title="Pop out">
            <ExternalLink className="w-3 h-3" />
          </button>
          <button onClick={() => closeTool(id)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-s3 text-tx3 hover:text-tx transition-colors" title="Close">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}
```

---

## `src/components/layout/FloatingTool.tsx`

Draggable wrapper for floating tools.

```typescript
interface FloatingToolProps {
  id: ToolId
  label: string
  icon: LucideIcon
  children: React.ReactNode
  minWidth?: number
}

export default function FloatingTool({ id, label, icon: Icon, children, minWidth = 240 }: FloatingToolProps) {
  const { tools, dock, closeTool, setPosition } = useToolsStore()
  const pos = tools[id].position
  const [dragging, setDragging] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true)
    setOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y })
    e.preventDefault()
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      const x = Math.max(0, Math.min(window.innerWidth - minWidth, e.clientX - offset.x))
      const y = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - offset.y))
      setPosition(id, x, y)
    }
    const onUp = () => setDragging(false)
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp) }
  }, [dragging, offset])

  return (
    <div
      style={{ left: pos.x, top: pos.y, minWidth, zIndex: 9999, position: "fixed" }}
      className="bg-s1 border border-b2 rounded-[10px] shadow-[0_8px_32px_rgba(0,0,0,.6)] overflow-hidden"
    >
      {/* Drag handle header */}
      <div
        onMouseDown={onMouseDown}
        className="flex items-center justify-between px-3 py-2 bg-s2/60 border-b border-b1 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-tx3" />
          <span className="text-[11px] font-semibold text-tx2">{label}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => dock(id)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-s3 text-tx3 hover:text-tx transition-colors" title="Dock">
            <PanelRight className="w-3 h-3" />
          </button>
          <button onClick={() => closeTool(id)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-s3 text-tx3 hover:text-rose-400 transition-colors" title="Close">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}
```

---

## Tool Components

### `PomodoroTool.tsx`
```typescript
/**
 * Shows circular SVG timer ring + digital time + mode tabs + play/pause/reset
 * Reads/writes from useToolsStore pomodoro state
 * When session ends and linkedTaskId is set → show completion Dialog
 */
```

Key implementation:
- SVG ring: `r=42`, `cx=50`, `cy=50`, `viewBox="0 0 100 100"`, stroke-dasharray based on secondsLeft/total
- Mode tabs: Focus (rose) | Short (green) | Long (blue) — shadcn Tabs, pill style
- Play button: 40px circle, filled with mode color
- Session dots: 4 dots below, filled up to current session count
- Time format: `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

### `StopwatchTool.tsx`
```typescript
/**
 * Shows MM:SS.cs display (centiseconds)
 * Lap list below (max-h-[80px] overflow-y-auto)
 * Start/Stop · Lap · Reset buttons
 */
```
Centiseconds: `Math.floor((elapsed % 1000) / 10)`

### `CalculatorTool.tsx`
```typescript
/**
 * Full scientific calculator
 * Expression display (small, tx3) + result display (large, tx, font-mono)
 * Buttons: sin cos tan log ln √ ^ ( ) π e
 *          7 8 9 × ÷
 *          4 5 6 + −
 *          1 2 3 . =
 *          0     ⌫ C
 * Use eval() with math parsing — or better: mathjs if available
 * Color coding: functions=blue dim, operators=amber, equals=blue solid, C/⌫=rose text
 */
```

### `StickyNotesTool.tsx`
```typescript
/**
 * 2-column grid of sticky notes
 * Each note: colored background, textarea, color picker (6 dots)
 * Notes persisted in localStorage (useLocalStorage hook or directly)
 * "+" button adds new note with random color from palette
 * Colors: #fef08a (yellow) #86efac (green) #93c5fd (blue) #f9a8d4 (pink) #fca5a5 (red) #d8b4fe (violet)
 */
```

### `QuickTodoTool.tsx`
```typescript
/**
 * Lightweight checklist — NOT connected to main tasks DB
 * Input + Add button at top
 * List of items with checkbox + delete button
 * Persisted in localStorage
 * Completed items shown with line-through, moved to bottom
 */
```

### `QuickLinksTool.tsx`
```typescript
/**
 * Saved URL shortcuts
 * Name + URL input row + Add button
 * List of saved links — clicking opens in default browser via Tauri's open()
 * import { open } from "@tauri-apps/plugin-shell"
 * Persisted in localStorage
 * Delete button per link
 */
```

---

## Verification

```bash
npm run dev
```

Then test every interaction:

**Sidebar:**
- [ ] Collapse toggle shrinks sidebar to 56px
- [ ] Expand toggle restores to 220px
- [ ] Active route highlighted in blue on correct nav item
- [ ] Tooltips show on collapsed sidebar hover
- [ ] User row visible at bottom
- [ ] Collapse state persists on page refresh (Zustand persist)

**Topbar:**
- [ ] All 6 tool icons visible
- [ ] Clicking Pomodoro icon opens it docked in right panel
- [ ] Right panel appears with 280px width
- [ ] Blue dot appears under Pomodoro icon when docked
- [ ] Clicking icon again closes it, right panel collapses

**Tool dock/float/close cycle:**
- [ ] Open Pomodoro docked → pop out → it floats as draggable card
- [ ] Drag floating card to new position → position persists
- [ ] Dock button on floating card → returns to right panel
- [ ] Close button → tool disappears, right panel auto-collapses if no others docked
- [ ] Open two tools docked simultaneously → both appear in right panel stacked

**Pomodoro:**
- [ ] Play button starts countdown
- [ ] Timer counts down (1 second per second)
- [ ] Navigate to /tasks — timer keeps running in background
- [ ] Topbar icon pulses when tool closed but timer running
- [ ] Session dot fills after each focus session

**Calculator:**
- [ ] Basic arithmetic works
- [ ] Scientific functions (sin, cos, log) work
- [ ] Expression shown above result
- [ ] C clears, ⌫ deletes last character

**Stopwatch:**
- [ ] Starts, stops, lap records current elapsed time
- [ ] Centiseconds update live
- [ ] Reset clears laps

**Sticky Notes:**
- [ ] Add note → appears in grid
- [ ] Color picker changes note background
- [ ] Content persists on page refresh

**Quick Todo:**
- [ ] Add items, check them off
- [ ] Persists on refresh

**Quick Links:**
- [ ] Add link → appears in list
- [ ] Click opens browser (Tauri only — in browser dev just logs)
```
