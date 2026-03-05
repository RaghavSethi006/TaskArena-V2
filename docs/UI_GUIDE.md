# TaskArena v2 — UI Guide

> This document defines every visual and interaction detail of the app.
> When building Phase 3, this is the reference for every component, layout, spacing, color, and animation decision.
> No guessing. No "looks about right". Follow this.

---

## Design Principles

1. **Dark by default** — deep zinc/neutral dark theme. Not "hacker dark", professional dark like Linear or Vercel.
2. **Information-dense but not cluttered** — pack content efficiently, use clear visual hierarchy to guide the eye
3. **Monospace for data, sans-serif for everything else** — numbers, timestamps, IDs, code → DM Mono. All other text → DM Sans.
4. **Color communicates state** — blue = interactive/primary, green = success/complete, amber = warning/in-progress, rose = danger/overdue, violet = AI/special
5. **Micro-interactions everywhere** — every button, card, and toggle has a hover/active state. Nothing feels static.
6. **Consistent spacing** — everything uses multiples of 4px. Never arbitrary pixel values.

---

## Typography

```css
/* Import in index.css */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');
```

| Use case | Font | Size | Weight | Notes |
|---|---|---|---|---|
| Page title | DM Sans | 19px | 700 | Letter-spacing: -0.3px |
| Section title | DM Sans | 15px | 600 | |
| Card title | DM Sans | 13.5px | 600 | |
| Body text | DM Sans | 13px | 400 | Line-height: 1.6 |
| Small label | DM Sans | 12px | 500 | |
| Tiny label | DM Sans | 11px | 500 | |
| Stat value (large) | DM Mono | 24px | 700 | Letter-spacing: -0.5px |
| Stat value (small) | DM Mono | 16px | 600 | |
| Section label (caps) | DM Mono | 10px | 700 | Uppercase, letter-spacing: 1px |
| Chip/badge text | DM Mono | 10px | 600 | Uppercase |
| Timestamp | DM Mono | 10px | 400 | color: tx3 |
| Code/monospace | DM Mono | 12px | 400 | |

---

## Color System

### CSS Variables (index.css)

```css
:root {
  /* Backgrounds */
  --bg:    #09090b;   /* page background */
  --s1:    #111113;   /* card / sidebar */
  --s2:    #18181b;   /* input / secondary surface */
  --s3:    #1c1c20;   /* tertiary surface / hover */

  /* Borders */
  --b1:    #27272a;   /* default border */
  --b2:    #3f3f46;   /* hover border */

  /* Text */
  --tx:    #fafafa;   /* primary text */
  --tx2:   #a1a1aa;   /* secondary text */
  --tx3:   #71717a;   /* muted / placeholder */

  /* Accent colors — each has a full and dim (12% opacity) variant */
  --blue:  #3b82f6;   --bd:  rgba(59,130,246,.12);
  --green: #10b981;   --gd:  rgba(16,185,129,.12);
  --amber: #f59e0b;   --ad:  rgba(245,158,11,.12);
  --rose:  #f43f5e;   --rd:  rgba(244,63,94,.12);
  --orange:#f97316;   --od:  rgba(249,115,22,.12);
  --violet:#8b5cf6;   --vd:  rgba(139,92,246,.12);

  /* Semantic */
  --mono: 'DM Mono', monospace;
  --radius: 8px;
}
```

### Color Usage Rules

| Color | Use for |
|---|---|
| `--blue` | Primary actions, links, active nav item, focus rings, study events |
| `--green` | Completed tasks, success states, indexed files, break events |
| `--amber` | Warnings, due-soon chips, medium difficulty, in-progress states |
| `--rose` | Overdue tasks, danger actions, hard difficulty, exam events |
| `--orange` | Assignment tasks, assignment events |
| `--violet` | AI features, Groq badge, level/prestige tags, special UI |
| `--tx3` | Placeholders, timestamps, muted labels — never for important content |

### Tailwind Config Extension

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        bg:     '#09090b',
        s1:     '#111113',
        s2:     '#18181b',
        s3:     '#1c1c20',
        b1:     '#27272a',
        b2:     '#3f3f46',
        tx:     '#fafafa',
        tx2:    '#a1a1aa',
        tx3:    '#71717a',
      },
      fontFamily: {
        sans:  ['DM Sans', 'sans-serif'],
        mono:  ['DM Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
}
```

---

## Spacing Scale

Always use multiples of 4px. Tailwind spacing units map directly (1 unit = 4px):

| Tailwind | px | Use |
|---|---|---|
| `p-1` | 4px | Icon padding, tight chips |
| `p-2` | 8px | Small button padding |
| `p-3` | 12px | Card padding (compact) |
| `p-4` | 16px | Card padding (standard) |
| `p-5` | 20px | Page padding (mobile) |
| `p-6` | 24px | Page padding (desktop) |
| `gap-1` | 4px | Between icon and label |
| `gap-2` | 8px | Between chips, tight rows |
| `gap-3` | 12px | Between cards (compact) |
| `gap-4` | 16px | Between cards (standard) |
| `gap-6` | 24px | Between sections |

---

## Layout

### App Shell

```
┌──────────────────────────────────────────────────────────────┐
│  Topbar (50px height, full width)                            │
├───────────┬──────────────────────────────────────────────────┤
│           │                                                  │
│  Sidebar  │  Page content                                    │
│           │  (.page-wrap — overflow-y: auto)                 │
│  220px    │                                                  │
│  (or 56px │                                                  │
│ collapsed)│                                                  │
│           │                                                  │
└───────────┴──────────────────────────────────────────────────┘
```

**Sidebar width:** 220px expanded · 56px collapsed  
**Topbar height:** 50px  
**Min window size:** 900px × 600px  
**Page padding:** 22px desktop · 14px tablet · 10px mobile  
**Sidebar transition:** `width 0.2s ease, min-width 0.2s ease`

### Responsive Breakpoints

| Breakpoint | Width | Changes |
|---|---|---|
| Mobile | < 600px | Single column layouts, page padding → 10px |
| Tablet | 600–900px | Two column → one column on most grids |
| Desktop | 900px+ | Full layout as designed |

---

## Sidebar

### Expanded state (220px)

```
┌─────────────────────┐
│ ◆ TaskArena    [◄]  │  ← logo + collapse toggle
├─────────────────────┤
│                     │
│  MAIN               │  ← section label (mono 10px uppercase)
│  ⊞  Dashboard       │  ← nav item
│  📅 Schedule        │
│  ✓  Tasks           │  ← active item: blue bg + border
│  ─────────────────  │  ← divider
│  STUDY              │
│  💬 AI Tutor        │
│  📚 Library         │
│  🧩 Quiz Hub        │
│  ─────────────────  │
│  STATS              │
│  📊 Statistics      │
│  🏆 Leaderboard     │
│  ─────────────────  │
│  OTHER              │
│  🔧 Tools           │
│  ⚙  Profile        │
│                     │
├─────────────────────┤
│ [RS] Raghav Sethi   │  ← user row at bottom
│      Lv.14 · 2340xp │
└─────────────────────┘
```

### Collapsed state (56px)

- Only icons visible, centered
- Logo mark (◆) only, no text
- Section labels hidden (opacity: 0, height: 0)
- User row shows avatar only
- Tooltip on hover showing item name
- Collapse toggle rotates 180°

### Nav item states

```css
/* Default */
color: var(--tx2); background: transparent; border: 1px solid transparent;

/* Hover */
color: var(--tx); background: var(--s2); border-color: var(--b1);

/* Active */
color: var(--blue); background: var(--bd); border-color: rgba(59,130,246,.2);
icon: color: var(--blue);
```

### Nav structure

```typescript
const NAV = [
  {
    section: "MAIN",
    items: [
      { label: "Dashboard",   icon: Home,        path: "/" },
      { label: "Schedule",    icon: CalendarDays, path: "/schedule" },
    ]
  },
  {
    section: "STUDY",
    items: [
      { label: "AI Tutor",    icon: MessageSquare, path: "/chat",      badge: null },
      { label: "Library",     icon: BookOpen,       path: "/notes" },
      { label: "Quiz Hub",    icon: Brain,          path: "/quiz" },
    ]
  },
  {
    section: "STATS",
    items: [
      { label: "Statistics",  icon: BarChart2, path: "/stats" },
      { label: "Leaderboard", icon: Trophy,    path: "/leaderboard" },
    ]
  },
  {
    section: "OTHER",
    items: [
      { label: "Tools",       icon: Wrench,   path: "/tools" },
      { label: "Profile",     icon: User,     path: "/profile" },
    ]
  }
];
```

---

## Topbar

```
┌──────────────────────────────────────────────────────────────┐
│ [≡] Page Title      [🔍 Search...]      [🔔] [⚙]  [RS ▼]   │
└──────────────────────────────────────────────────────────────┘
```

- **Left:** Mobile hamburger (hidden on desktop) + current page title
- **Center:** Search pill (hidden on mobile <700px)
- **Right:** Bell icon · Settings icon · User avatar dropdown

**Search pill:**
```
[🔍 Search tasks, notes...        ⌘K]
bg: var(--s2), border: var(--b1), border-radius: 7px, padding: 5px 10px
width: 200px → expands to 300px on focus
```

**Icon buttons (bell, settings):**
```
30px × 30px, border-radius: 6px, border: 1px solid var(--b1)
hover: bg var(--s2)
```

---

## Cards

### Base card
```css
background: var(--s1);
border: 1px solid var(--b1);
border-radius: 10px;
overflow: hidden;
```

### Clickable card (hover effect)
```css
transition: border-color 0.12s;
cursor: pointer;
&:hover { border-color: var(--b2); }
```

### Highlighted card (e.g. active AI generating)
```css
border-color: rgba(59,130,246,.4);
background: var(--bd);
```

### Standard card padding
- Default: `16px` all sides
- Compact: `12px` all sides
- Section header inside card: `12px 16px`, border-bottom: `1px solid var(--b1)`

---

## Buttons

### Variants

```
Primary (btn-p):
  bg: var(--blue), color: #fff
  hover: bg #2563eb
  
Secondary (btn-s):
  bg: var(--s2), color: var(--tx), border: 1px solid var(--b1)
  hover: bg var(--s3)

Ghost (btn-g):
  bg: transparent, color: var(--tx2)
  hover: bg var(--s2), color: var(--tx)

Danger (btn-d):
  bg: transparent, color: var(--rose), border: 1px solid rgba(244,63,94,.3)
  hover: bg var(--rd)
```

### Sizes

```
Default:  padding: 7px 13px, font-size: 12.5px, border-radius: 7px
Small:    padding: 5px 10px,  font-size: 11.5px, border-radius: 6px
Icon-only: 30px × 30px,       border-radius: 6px
```

### Rules
- Always include an icon + text label (not icon-only unless it's a toolbar)
- Icon size: 13px (default), 11px (small)
- `transition: all 0.12s`
- `disabled` state: `opacity: 0.4; cursor: not-allowed`

---

## Chips / Badges

```
Base: font-size: 10px, font-weight: 600, padding: 2px 7px, border-radius: 5px,
      font-family: var(--mono), display: inline-flex, align-items: center, gap: 3px

Neutral:  bg var(--s2),  color var(--tx3),  border 1px solid var(--b1)
Blue:     bg var(--bd),  color var(--blue), border 1px solid rgba(59,130,246,.25)
Green:    bg var(--gd),  color var(--green)
Amber:    bg var(--ad),  color var(--amber)
Rose:     bg var(--rd),  color var(--rose)
Violet:   bg var(--vd),  color var(--violet)
```

### Due date chip logic
```typescript
const DueChip = ({ deadline, status }) => {
  if (status === "completed") return <Chip variant="blue">✓ Done</Chip>
  const days = diffInDays(deadline, today)
  if (days < 0)  return <Chip variant="rose">Overdue</Chip>
  if (days === 0) return <Chip variant="amber">Due today</Chip>
  if (days <= 2)  return <Chip variant="amber">{days}d left</Chip>
  return          <Chip variant="green">{days}d left</Chip>
}
```

---

## Forms & Inputs

```css
/* Base input */
background: var(--s2);
border: 1px solid var(--b1);
border-radius: 7px;
padding: 8px 11px;
color: var(--tx);
font-size: 13px;
font-family: 'DM Sans';
outline: none;
transition: border-color 0.12s;
width: 100%;

/* Focus */
border-color: var(--blue);

/* Placeholder */
color: var(--tx3);
```

### Form field layout
```tsx
<div className="flex flex-col gap-1.5 mb-3">
  <label className="text-[10.5px] font-semibold text-tx3 uppercase tracking-[0.5px] font-mono">
    Field Label
  </label>
  <input className="..." />
  {/* Optional helper text */}
  <span className="text-[11px] text-tx3">Helper text</span>
</div>
```

### Select / Dropdown
Same styles as input. Use shadcn `Select` component.

---

## Modals / Dialogs

Use shadcn `Dialog` for everything. Never `alert()` or `confirm()`.

### Standard modal anatomy
```
┌──────────────────────────────────────────┐
│  Modal Title                        [×]  │  ← header: 14px 700 + close button
├──────────────────────────────────────────┤
│                                          │
│  Form fields / content                   │  ← body: 18px padding
│                                          │
├──────────────────────────────────────────┤
│                  [Cancel]  [Primary CTA]  │  ← footer: right-aligned buttons
└──────────────────────────────────────────┘
```

### Specs
```css
max-width: 400px;
background: var(--s1);
border: 1px solid var(--b1);
border-radius: 12px;
box-shadow: 0 24px 64px rgba(0,0,0,.6);

/* Overlay */
background: rgba(0,0,0,.6);
backdrop-filter: blur(4px);

/* Animation */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
animation: slideUp 0.18s ease;
```

---

## Stat Cards

```
┌──────────────────────┐
│  COMPLETED  ✓        │  ← label: mono 10px uppercase + icon
│                      │
│  42         ↗        │  ← value: mono 24px 700 in accent color
│  +8 vs last week     │  ← sub: 11px tx3 with up/down arrow
└──────────────────────┘
```

### Grid
- Desktop: 4 columns
- Tablet (< 900px): 2 columns
- Mobile (< 500px): 2 columns

---

## Page Header Pattern

Every page starts with this:

```tsx
<div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
  <div>
    <h1 className="text-[19px] font-bold tracking-tight">Page Title</h1>
    <p className="text-[12.5px] text-tx2 mt-1">Subtitle / description</p>
  </div>
  <div className="flex gap-2 items-center flex-wrap">
    {/* Action buttons */}
  </div>
</div>
```

---

## Page Transition Animation

Every page component wraps its content in a `motion.div`:

```tsx
import { motion } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.18, ease: "easeOut" }
};

// Usage on every page:
<motion.div {...pageVariants}>
  {/* page content */}
</motion.div>
```

---

## Scrollbars

```css
* {
  scrollbar-width: thin;
  scrollbar-color: var(--b2) transparent;
}
*::-webkit-scrollbar { width: 4px; height: 4px; }
*::-webkit-scrollbar-thumb {
  background: var(--b2);
  border-radius: 4px;
}
*::-webkit-scrollbar-track { background: transparent; }
```

---

## Loading States

Use shadcn `Skeleton` component for all loading states. Never show a spinner alone.

```tsx
// Task card skeleton
<div className="flex flex-col gap-2 p-4 rounded-xl bg-s1 border border-b1 animate-pulse">
  <Skeleton className="h-4 w-3/4 bg-s2" />
  <Skeleton className="h-3 w-1/2 bg-s2" />
  <div className="flex gap-2 mt-1">
    <Skeleton className="h-4 w-16 rounded-full bg-s2" />
    <Skeleton className="h-4 w-12 rounded-full bg-s2" />
  </div>
</div>
```

---

## Empty States

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <Icon className="w-10 h-10 text-tx3 opacity-30 mb-3" />
  <h3 className="text-[14px] font-semibold text-tx2 mb-1">No tasks yet</h3>
  <p className="text-[12px] text-tx3 mb-4">Add your first task to get started</p>
  <Button variant="outline" size="sm" onClick={onAdd}>
    <Plus className="w-3 h-3" /> Add task
  </Button>
</div>
```

---

## Toast Notifications

Use Sonner. Positioning: bottom-right.

```typescript
import { toast } from "sonner";

// Usage
toast.success("Task completed! +15 XP");
toast.error("Failed to save event");
toast.info("Quiz generation started...");
toast(
  <div className="flex items-center gap-2">
    <Zap className="text-blue-400 w-4 h-4" />
    <span>Level up! You're now Level 15</span>
  </div>
);
```

---

## Pages — Detailed Specs

---

### Dashboard Page

**Layout:**
```
Page header (title + "New Task" button)
Stat cards row (4 columns)
Task board (3 Kanban columns: Assignments | Study | Productivity)
```

**Stat cards:** Tasks Done/Total · XP Earned · Day Streak · Current Rank

**Kanban columns:**
- Each column has a colored dot + title + pending count badge + "+" button
- Tasks are `TaskCard` components
- Bottom of each column: dashed "Add task" row (always visible)
- Column colors: Assignments = orange, Study = green, Productivity = blue

**TaskCard:**
```
┌──────────────────────────────────────┐
│  Essay on Renaissance Art      [ ✓ ] │  ← title + checkbox
│  [Art History] [2d left] [+15 xp]    │  ← chips row
└──────────────────────────────────────┘
```
- Checkbox: 18px, border-radius 5px, on-click triggers complete
- Completed tasks: 50% opacity, title gets `line-through`
- Checkbox checked state: green background + white checkmark

---

### AI Tutor Page (Chatbot)

**Layout:**
```
┌──────────────────┬───────────────────────────────────────┐
│  Conversations   │  [Conversation title]   [Course ▼]    │
│  sidebar (230px) ├───────────────────────────────────────┤
│                  │                                       │
│  [+ New]         │  Message thread                       │
│  ─────────────── │  (scroll area, flex-col gap-4)        │
│  Newtonian...    │                                       │
│  Organic chem    │                                       │
│  Study plan      │                                       │
│                  ├───────────────────────────────────────┤
│                  │  [📎] [textarea...]          [Send →]  │
└──────────────────┴───────────────────────────────────────┘
```
On mobile: conversation sidebar hidden.

**Message bubbles:**
- User messages: right-aligned, blue background (`var(--blue)`), white text
- Assistant messages: left-aligned, card background, normal text, with avatar
- Avatar: 26px rounded square — Brain icon for AI, User icon for user
- Source citation: tiny text below AI message: `📄 Physics Ch4.pdf`

**Typing indicator:** Three animated dots before first token arrives
```css
@keyframes bounce { 0%,60%,100% { transform: translateY(0) } 30% { transform: translateY(-5px) } }
.dot { width: 5px; height: 5px; border-radius: 50%; background: var(--tx3); animation: bounce 1.4s infinite; }
.dot:nth-child(2) { animation-delay: 0.2s }
.dot:nth-child(3) { animation-delay: 0.4s }
```

**AI provider badge** (shown in header):
```
[⚡ Groq · llama-3.3-70b]   or   [💻 Local · Qwen2.5]
```
Clicking opens a dropdown to switch providers.

**Input area:**
- `textarea` that auto-grows (max 5 lines)
- Send on `Enter`, newline on `Shift+Enter`
- Send button disabled while streaming

---

### Smart Schedule Page

**Layout:**
```
┌──────────────────────────────┬──────────────────────────────┐
│  Calendar (left, 60%)        │  Sidebar (right, 40%)        │
│  ┌────────────────────────┐  │  ┌─────────────────────────┐ │
│  │  March 2026    [< >]   │  │  │  Week strip             │ │
│  │  Su Mo Tu We Th Fr Sa  │  │  │  Sun Mon Tue Wed Thu    │ │
│  │  ...calendar grid...  │  │  └─────────────────────────┘ │
│  └────────────────────────┘  │  ┌─────────────────────────┐ │
│  ┌────────────────────────┐  │  │  ✦ AI Schedule Advisor  │ │
│  │  Monday, March 2       │  │  │  ─────────────────────  │ │
│  │  │ 09:00 Study: Thermo │  │  │  [HIGH] Cram Physics    │ │
│  │  │ 14:00 Essay draft   │  │  │  [Schedule it] [Dismiss]│ │
│  └────────────────────────┘  │  └─────────────────────────┘ │
│                              │  ┌─────────────────────────┐ │
│                              │  │  Upcoming Deadlines     │ │
│                              │  │  • Physics Midterm  2d  │ │
│                              │  └─────────────────────────┘ │
└──────────────────────────────┴──────────────────────────────┘
```
On mobile: sidebar moves below calendar.

**Calendar cell:**
```
┌─────────┐
│ 04      │  ← date number (10.5px mono)
│ ─       │  ← event bar (4px height, colored)
│ ─       │
└─────────┘
```
- Today: date number in blue filled circle
- Selected: blue border on cell
- Other month: 30% opacity
- Max 2 event bars visible, "+N" label if more

**Event type colors:**
| Type | Bar color | Background | Border |
|---|---|---|---|
| study | `#3b82f6` | `var(--bd)` | `var(--blue)` |
| assignment | `#f97316` | `var(--od)` | `var(--orange)` |
| exam | `#f43f5e` | `var(--rd)` | `var(--rose)` |
| break | `#10b981` | `var(--gd)` | `var(--green)` |

**Day timeline:**
- Vertical line on left side (1px var(--b1))
- Time label (9px mono) · colored dot · event block
- Event block: rounded-lg, colored left-border, 2px solid
- Shows title + course + duration

**AI Suggestions panel:**
```
┌──────────────────────────────────────┐
│  ✦ AI Schedule Advisor               │  ← violet header
│                                      │
│  ┌──────────────────────────────┐    │
│  │ [HIGH] Cram Physics Midterm  │    │
│  │ 2 days left — 2hr tonight    │    │
│  │ + 1.5hr tomorrow morning     │    │
│  │ [Physics 201]                │    │
│  │ [Schedule it ▶] [Dismiss]    │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```
Priority chip colors: HIGH = rose, MEDIUM = amber, LOW = green.

---

### Study Library Page (Notes)

**Default view — Course Grid:**
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ ══════════       │  │ ══════════       │  │ ══════════       │
│ Physics 201      │  │ Organic Chem     │  │ Art History      │
│ PHYS201          │  │ CHEM301          │  │ ARTH102          │
│ 📁 4  📄 12      │  │ 📁 3  📄 8       │  │ 📁 2  📄 6       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```
- Colored bar at top of each card (matches course color)
- Click opens course view

**Course view (after clicking a course):**
```
← Library  [◆] Physics 201  [PHYS201]

┌──────────────────┬───────────────────────────────────────────┐
│  Folders (190px) │  Files in "Chapter 3 — Thermodynamics"    │
│  ─────────────   │  ─────────────────────────────────────────│
│  📁 Chapter 1    │  📄 Lecture Notes Week 3.pdf  [synced ✓]  │
│  📁 Chapter 2    │  📄 Lab Manual.pdf            [synced ✓]  │
│  📁 Chapter 3 ←  │  📄 Problem Set 1.docx        [indexing…] │
│  📁 Assignments  │                                           │
│                  │                                           │
│  [+ New Folder]  │                             [+ Add File]  │
└──────────────────┴───────────────────────────────────────────┘
```

**File status badges:**
- `synced` = green chip
- `indexing...` = amber chip + spinner
- `failed` = rose chip + retry button
- `not indexed` = neutral chip

---

### Quiz Hub Page

**Layout:**
```
Page header + "Generate Quiz" button
Stat cards (4 columns)
[Generating progress bar — only shows when active]
Quiz grid (auto-fill, min 240px per card)
```

**Quiz card:**
```
┌──────────────────────────────┐
│  [🧠]                  [🗑]  │
│                              │
│  Classical Mechanics Prep    │
│  Physics 201                 │
│                              │
│  [hard] [15q] [▶ 2] [✓ 73%] │  ← chips
│                              │
│  Best ──────────────── 73%   │  ← progress bar
│                              │
│  [▶ Start Quiz          ]    │  ← full-width button
└──────────────────────────────┘
```

**Quiz generation progress** (SSE stream):
```
┌───────────────────────────────────────────────────────┐
│  ··· Generating with AI   [Local · Qwen2.5]  ~60-90s │
│                                                       │
│  [✓ Reading materials] [✓ Extracting] [⟳ Building] [ ] │
└───────────────────────────────────────────────────────┘
```
Steps animate through: ✓ done (green) → ⟳ active (blue pulse) → ○ waiting (neutral).

**Taking a quiz (modal or full page):**
```
┌──────────────────────────────────────────────────────────┐
│  Question 3 of 10                 [███████──────] 70%    │
│                                                          │
│  What does Newton's third law state about forces?        │
│                                                          │
│  ○  A) Forces cause acceleration                         │
│  ○  B) Every action has an equal and opposite reaction   │
│  ○  C) Objects at rest stay at rest                      │
│  ○  D) Force equals mass times velocity                  │
│                                                          │
│                                       [Next Question →]  │
└──────────────────────────────────────────────────────────┘
```
After selecting: chosen option turns blue, correct = green ✓, wrong = rose ✗, explanation shown.

---

### Leaderboard Page

**Layout:**
```
Page header + "Season: April 2025" label

┌───────────────────────────┬──────────────────────────┐
│  Rankings table (flex 1)  │  Sidebar (280px)         │
│  ─────────────────────────│  ┌────────────────────┐  │
│  #  Student  Pts  Tasks   │  │ Your Stats         │  │
│  ─────────────────────────│  │ ─────────────────  │  │
│  🥇 Raghav  2340  87  12d │  │ Rank    #1         │  │
│  🥈 Priya   2180  82  9d  │  │ Points  2,340      │  │
│  🥉 Arjun   1960  75  7d  │  │ Tasks   87         │  │
│  #4 ...                   │  │ Streak  12 days    │  │
│  [YOU] highlighted        │  └────────────────────┘  │
└───────────────────────────┴──────────────────────────┘
```

**Table row:**
- Rank: gold/silver/bronze trophy emoji for top 3, `#N` after
- User: avatar (28px) + name + level + prestige tag
- Columns: Points (blue mono) · Tasks · Streak (fire icon)
- Current user row: `background: var(--bd)` highlight
- Hover: `background: var(--s2)`

**Prestige tag:** `[Scholar]` `[Achiever]` — violet tiny chip in monospace

---

### Statistics Page

**Layout:**
```
Page header + time period selector (week/month/all time)
Stat cards (4 columns)

┌─────────────────────────┬─────────────────────────┐
│  Tasks Completed chart  │  XP Earned chart        │
│  (AreaChart, blue)      │  (AreaChart, green)     │
├─────────────────────────┼─────────────────────────┤
│  Task Breakdown         │  Activity Heatmap       │
│  (progress bars)        │  (28-cell grid)         │
└─────────────────────────┴─────────────────────────┘
```

**Charts:** Recharts AreaChart with gradient fill, no grid lines, custom tooltip.

**Heatmap:** 28 cells (4 weeks), 4-level green intensity:
- 0 activity: `var(--s2)`
- Low: `#1a3a2a`
- Medium: `#065f46`
- High: `#10b981`

---

### Tools Page

**Layout:** 2×2 grid (stacks to 1 column on mobile)

```
┌──────────────────────┬──────────────────────┐
│  Pomodoro Timer      │  Stopwatch & Alarms  │
│                      │                      │
├──────────────────────┼──────────────────────┤
│  Quick Utils         │  Sticky Notes        │
│  (Calc/Scratch/Links)│                      │
└──────────────────────┴──────────────────────┘
```

**Pomodoro:**
- 3 mode tabs: Focus (25m, rose) · Short Break (5m, green) · Long Break (15m, blue)
- SVG progress ring (150px, 68px radius, 6px stroke width, smooth stroke-dashoffset)
- Digital time in center (28px mono bold)
- Play/Pause button (42px circle, filled with mode color)
- Reset button (30px, secondary)
- 4-dot session tracker at bottom

**Stopwatch:**
- Centisecond display: `MM:SS.CS` at 34px mono bold
- Lap list below (max height 90px, scrollable)
- Start/Pause (primary blue) · Lap · Reset buttons

**Alarms tab:**
- Time input + Add button
- List of alarms with time (17px mono bold), toggle switch, delete button
- Toggle: 32px × 17px pill, green when on

**Calculator:**
- Screen: dark (`#0d1117`), expression line (11px gray) + result (20px bold)
- 4-column grid of buttons
- Color coding: functions = blue dim, operators = amber dim, equals = blue solid, delete = rose text

**Sticky Notes:**
- 2×2 grid of colored notes
- 6 color dot picker per note
- Inline textarea editing
- "New" button adds note with random color

**Quick Links:**
- Name + URL input row + Add button
- List of links with external link icon, clickable, delete button

---

### Profile Page

**Layout:**
```
┌──────────────────────┬────────────────────────────────────────┐
│  Profile card (260px)│  Settings cards (flex 1)               │
│  ─────────────────── │  ┌────────────────────────────────────┐│
│  [Large Avatar]      │  │  Personal Info                     ││
│  Raghav Sethi        │  │  Name / Email / Bio fields         ││
│  raghav@...          │  └────────────────────────────────────┘│
│  [XP progress bar]   │  ┌────────────────────────────────────┐│
│  ─────────────────── │  │  AI Model Settings                 ││
│  [Badge grid 3×2]    │  │  Provider selector                 ││
│                      │  │  API key input (masked)            ││
│                      │  └────────────────────────────────────┘│
│                      │  ┌────────────────────────────────────┐│
│                      │  │  Preferences (toggles)             ││
│                      │  └────────────────────────────────────┘│
└──────────────────────┴────────────────────────────────────────┘
```

**Avatar:** 68px, border-radius 14px, blue→violet gradient background, initials text

**XP bar:**
```
Lv.14 · Achiever          2340 / 2500 XP
[██████████████████████────────────────]
```
5px height, blue→violet gradient fill.

**Toggle switches:**
```
OFF state: bg var(--s3), knob left:3px
ON state:  bg var(--blue), knob right (calc(100% - 14px))
Knob: 12px circle, white, transition left 0.15s
```

**AI Provider selector:**
Three option cards:
```
[💻 Local]  [⚡ Groq]  [🦙 Ollama]
```
Selected card gets blue border + blue dim background.

---

---

## shadcn/ui — Exact Theme Configuration

This section defines precisely how to wire the TaskArena aesthetic into shadcn. The prototype React artifacts built during planning are the visual reference — this is how to reproduce that look using real shadcn components.

### globals.css — Full Variable Override

Replace the default shadcn CSS variables entirely with these. This is the single source of truth for the entire visual theme.

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* shadcn expects these exact variable names */
    --background:         240 10% 3.9%;      /* #09090b */
    --foreground:         0 0% 98%;           /* #fafafa */

    --card:               240 10% 6.7%;      /* #111113 */
    --card-foreground:    0 0% 98%;

    --popover:            240 10% 6.7%;
    --popover-foreground: 0 0% 98%;

    --primary:            217 91% 60%;        /* #3b82f6 blue */
    --primary-foreground: 0 0% 100%;

    --secondary:          240 5% 10.8%;      /* #18181b */
    --secondary-foreground: 0 0% 98%;

    --muted:              240 3.7% 15.9%;    /* #27272a */
    --muted-foreground:   240 5% 44.9%;      /* #71717a */

    --accent:             240 3.7% 15.9%;
    --accent-foreground:  0 0% 98%;

    --destructive:        347 77% 50%;        /* #f43f5e rose */
    --destructive-foreground: 0 0% 100%;

    --border:             240 3.7% 15.9%;    /* #27272a */
    --input:              240 5% 10.8%;      /* #18181b */
    --ring:               217 91% 60%;        /* blue focus ring */

    --radius: 0.5rem;                         /* 8px */

    /* ── Custom tokens (used directly in components) ── */
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

    --mono: 'DM Mono', monospace;
  }
  /* No .light class — this app is dark only */
}

@layer base {
  * { @apply border-border; }
  body {
    @apply bg-background text-foreground;
    font-family: 'DM Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* Thin scrollbars everywhere */
  * { scrollbar-width: thin; scrollbar-color: #3f3f46 transparent; }
  *::-webkit-scrollbar { width: 4px; height: 4px; }
  *::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
  *::-webkit-scrollbar-track { background: transparent; }
}
```

---

### tailwind.config.ts — Full Config

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Map Tailwind classes to our CSS vars */
        bg:    "var(--bg)",
        s1:    "var(--s1)",
        s2:    "var(--s2)",
        s3:    "var(--s3)",
        b1:    "var(--b1)",
        b2:    "var(--b2)",
        tx:    "var(--tx)",
        tx2:   "var(--tx2)",
        tx3:   "var(--tx3)",
        /* shadcn semantic tokens */
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
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        tdot: {
          "0%, 60%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "30%":            { transform: "translateY(-5px)", opacity: "1" },
        },
      },
      animation: {
        fadeUp:  "fadeUp 0.18s ease both",
        slideIn: "slideIn 0.15s ease both",
        tdot1:   "tdot 1.4s infinite",
        tdot2:   "tdot 1.4s 0.2s infinite",
        tdot3:   "tdot 1.4s 0.4s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

---

### shadcn Component Overrides

shadcn components need their default styles adjusted to match the aesthetic. These are the key customizations for each component.

#### Button

```typescript
// src/components/ui/button.tsx — replace the cva variants

const buttonVariants = cva(
  // Base
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[7px] text-[12.5px] font-medium transition-all duration-[120ms] disabled:opacity-40 disabled:pointer-events-none [&_svg]:w-[13px] [&_svg]:h-[13px]",
  {
    variants: {
      variant: {
        default:     "bg-blue-500 text-white hover:bg-blue-600",
        secondary:   "bg-s2 text-tx border border-b1 hover:bg-s3",
        ghost:       "text-tx2 hover:bg-s2 hover:text-tx",
        destructive: "text-rose-400 border border-rose-400/30 hover:bg-rose-400/10",
        outline:     "border border-b1 bg-transparent text-tx2 hover:bg-s2 hover:text-tx",
        link:        "text-blue-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[32px] px-3 py-1.5",
        sm:      "h-[28px] px-2.5 py-1 text-[11.5px] [&_svg]:w-[11px] [&_svg]:h-[11px]",
        lg:      "h-[38px] px-4 text-[13px]",
        icon:    "h-[30px] w-[30px] rounded-[6px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);
```

#### Card

```typescript
// src/components/ui/card.tsx — replace className strings

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-s1 border border-b1 rounded-[10px] overflow-hidden",
        className
      )}
      {...props}
    />
  )
);

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1 p-4 border-b border-b1", className)} {...props} />
  )
);

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-4", className)} {...props} />
  )
);
```

#### Input

```typescript
// src/components/ui/input.tsx

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full bg-s2 border border-b1 rounded-[7px] px-3 py-2",
        "text-[13px] text-tx font-sans placeholder:text-tx3",
        "outline-none transition-colors duration-[120ms]",
        "focus:border-blue-500",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
);
```

#### Badge

```typescript
// src/components/ui/badge.tsx — add our custom variants

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[5px] px-[7px] py-[2px] text-[10px] font-semibold font-mono transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-[var(--bd)] text-blue-400 border border-blue-500/25",
        secondary:   "bg-s2 text-tx3 border border-b1",
        success:     "bg-[var(--gd)] text-emerald-400 border border-emerald-500/25",
        warning:     "bg-[var(--ad)] text-amber-400 border border-amber-500/25",
        destructive: "bg-[var(--rd)] text-rose-400 border border-rose-500/25",
        orange:      "bg-[var(--od)] text-orange-400 border border-orange-500/25",
        violet:      "bg-[var(--vd)] text-violet-400 border border-violet-500/25",
      },
    },
    defaultVariants: { variant: "default" },
  }
);
```

#### Dialog

```typescript
// src/components/ui/dialog.tsx — override the overlay and content

// Overlay
"fixed inset-0 z-50 bg-black/60 backdrop-blur-[4px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"

// Content
"fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full max-w-[400px] bg-s1 border border-b1 rounded-[12px] shadow-[0_24px_64px_rgba(0,0,0,.6)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%]"
```

#### Select

```typescript
// Key classes for SelectContent and SelectItem

// SelectTrigger
"flex h-[34px] w-full items-center justify-between rounded-[7px] border border-b1 bg-s2 px-3 py-2 text-[12.5px] text-tx placeholder:text-tx3 focus:outline-none focus:border-blue-500 disabled:opacity-40"

// SelectContent
"bg-s1 border border-b1 rounded-[8px] shadow-[0_8px_32px_rgba(0,0,0,.5)]"

// SelectItem
"text-[12.5px] text-tx2 rounded-[5px] cursor-pointer focus:bg-s2 focus:text-tx data-[state=checked]:text-blue-400"
```

#### Tabs

```typescript
// TabsList
"inline-flex items-center bg-s2 rounded-[7px] p-[3px] gap-[2px]"

// TabsTrigger
"inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[5px] px-3 py-1.5 text-[11.5px] font-medium text-tx3 transition-all duration-[120ms] data-[state=active]:bg-s1 data-[state=active]:text-tx data-[state=active]:shadow-[0_1px_4px_rgba(0,0,0,.3)]"
```

#### Textarea

```typescript
"w-full bg-s2 border border-b1 rounded-[7px] px-3 py-2 text-[13px] text-tx font-sans placeholder:text-tx3 outline-none resize-none transition-colors duration-[120ms] focus:border-blue-500 disabled:opacity-40"
```

#### Separator

```typescript
"bg-b1"  // override default zinc color
```

#### ScrollArea

```typescript
// No changes needed — inherits our thin scrollbar styles from globals.css
```

---

### How Components Map to the Prototype Aesthetic

This table shows which shadcn component to use for each UI element seen in the prototype:

| Prototype element | Use this shadcn component | Key customization |
|---|---|---|
| Page cards | `Card` + `CardContent` | `bg-s1 border-b1 rounded-[10px]` |
| Primary "Generate Quiz" button | `Button` variant="default" | Blue bg, already handled |
| "Cancel" button | `Button` variant="secondary" | `bg-s2 border-b1` |
| "Delete" icon button | `Button` variant="ghost" size="icon" | Rose text on hover |
| Difficulty chips / status badges | `Badge` with custom variant | See badge variants above |
| Course / type dropdowns | `Select` | `bg-s2 border-b1` dark style |
| Add task modal | `Dialog` | Dark overlay + `bg-s1` content |
| Collapsible sidebar | `Sheet` (mobile) + custom (desktop) | Sheet for mobile drawer |
| Tab switcher (Pomodoro modes, Calculator tabs) | `Tabs` | `bg-s2` pill style |
| Task status toggle | `Switch` | Custom green-on style |
| Form field labels | `Label` | `text-[10.5px] font-mono uppercase text-tx3` |
| Skeleton loading | `Skeleton` | `bg-s2` |
| Notifications | `Sonner` (toast) | Bottom-right, dark theme |
| Calendar (schedule page) | Custom (not shadcn Calendar) | Too opinionated — build from scratch |
| Progress bars (quiz, XP) | `Progress` | Custom color via style prop |
| Tooltip on collapsed sidebar | `Tooltip` | `bg-s1 border-b1 text-[11.5px]` |
| Command palette / search | `Command` inside `Popover` | Full-width, dark style |

---

### The `cn()` Utility

Use this for every conditional className. Already set up by shadcn but making it explicit:

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage
<div className={cn(
  "bg-s1 border border-b1 rounded-[10px] p-4",
  isActive && "border-blue-500/40 bg-[var(--bd)]",
  isCompleted && "opacity-50"
)}>
```

---

### Prototype-to-Production Reference

The React prototypes (`TaskArena_Redesign.jsx` and `TaskArena_Tools_Schedule.jsx`) were built with custom CSS-in-JS. When rebuilding in Phase 3, translate each custom class like this:

| Prototype custom class | Phase 3 Tailwind equivalent |
|---|---|
| `.card` | `bg-s1 border border-b1 rounded-[10px] overflow-hidden` |
| `.btn-p` | `<Button>` (default variant) |
| `.btn-s` | `<Button variant="secondary">` |
| `.btn-g` | `<Button variant="ghost">` |
| `.chip chip-d` | `<Badge variant="default">` (blue) |
| `.chip chip-ok` | `<Badge variant="success">` (green) |
| `.chip chip-w` | `<Badge variant="warning">` (amber) |
| `.chip chip-ov` | `<Badge variant="destructive">` (rose) |
| `.stat-val` | `font-mono text-[24px] font-bold tracking-tight` |
| `.stat-lbl` | `font-mono text-[10.5px] uppercase tracking-[0.5px] text-tx3` |
| `.form-inp` | `<Input>` |
| `.form-sel` | `<Select>` |
| `.form-lbl` | `<Label>` with `font-mono text-[10.5px] uppercase tracking-[0.5px]` |
| `.nav-item` | Custom (not a shadcn component) |
| `.modal` + `.overlay` | `<Dialog>` |
| `.qu-tabs` / `.tk-tabs` | `<Tabs>` |
| `.pb-outer` + `.pb-inner` | `<Progress>` |
| `.toast` | `toast()` from sonner |
| `.fade-up` | `animate-fadeUp` (from tailwind keyframe) |

## Component Checklist for Phase 3

Before marking Phase 3 complete, every item below must be built:

### Layout
- [ ] AppShell (left sidebar + topbar + page outlet + right panel container)
- [ ] Sidebar (expanded + collapsed + all nav items) — NO Tools item
- [ ] Topbar (search + tool icons + notifications + user dropdown)
- [ ] RightPanel (auto-shows when any tool is docked)
- [ ] FloatingTool (draggable card wrapper, used by all 6 tools when floating)

### Shared components
- [ ] TaskCard
- [ ] StatCard
- [ ] DueChip
- [ ] MessageBubble (user + assistant variants)
- [ ] ProviderBadge (Groq / Local / Ollama)
- [ ] LoadingSkeleton (task, card, message variants)
- [ ] EmptyState (with icon, title, description, CTA)
- [ ] PageHeader (title + subtitle + actions slot)
- [ ] FloatingTool wrapper (drag handle, dock/close buttons)

### Tools (each independently dockable or floating)
- [ ] PomodoroTool
- [ ] StopwatchTool
- [ ] CalculatorTool
- [ ] StickyNotesTool
- [ ] QuickTodoTool
- [ ] QuickLinksTool

### Pages
- [ ] DashboardPage (read-only overview — NO tasks management)
- [ ] TasksPage (dedicated task workspace — separate from dashboard)
- [ ] ChatbotPage (with SSE streaming)
- [ ] SchedulePage (calendar + timeline + AI panel)
- [ ] NotesPage (course grid + course view)
- [ ] StudyHubPage (replaces QuizPage — full material library)
- [ ] LeaderboardPage
- [ ] StatisticsPage
- [ ] ProfilePage

---

## Updated Navigation Structure

```typescript
const NAV = [
  {
    section: "MAIN",
    items: [
      { label: "Dashboard",   icon: Home,          path: "/" },
      { label: "Tasks",       icon: CheckSquare,   path: "/tasks" },
      { label: "Schedule",    icon: CalendarDays,  path: "/schedule" },
    ]
  },
  {
    section: "STUDY",
    items: [
      { label: "AI Tutor",    icon: MessageSquare, path: "/chat" },
      { label: "Library",     icon: BookOpen,      path: "/notes" },
      { label: "Study Hub",   icon: Brain,         path: "/study-hub" },
    ]
  },
  {
    section: "STATS",
    items: [
      { label: "Statistics",  icon: BarChart2,     path: "/stats" },
      { label: "Leaderboard", icon: Trophy,        path: "/leaderboard" },
    ]
  },
  {
    section: "OTHER",
    items: [
      { label: "Profile",     icon: User,          path: "/profile" },
    ]
  }
];
// Tools removed from nav — accessed via topbar icons only
```

---

## Dashboard Page — "Morning Briefing" (read-only)

**Purpose:** Open the app, instantly know where you stand. No actions, no editing. Pure overview.

**Layout:**
```
Page header: "Good morning, Raghav 👋" + date

┌──────────────────────────────────────────────────────────────────┐
│  Stat cards row (4 cards)                                        │
│  XP · Streak · Tasks Done Today · Current Rank                  │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────┬────────────────────────────────────────┐
│  Due Today & Tomorrow   │  This Week on Schedule                 │
│  (task list, read-only) │  (mini timeline, read-only)            │
├─────────────────────────┼────────────────────────────────────────┤
│  XP Progress            │  Weekly Leaderboard (top 3)            │
│  (level bar + next lvl) │  (podium style, your rank highlighted) │
└─────────────────────────┴────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Daily AI Digest                                                 │
│  "You have a Physics midterm in 2 days, 4 tasks pending,        │
│   and a study block tonight at 7pm. Your streak is at 7 days." │
│  Generated once per day, cached in localStorage                  │
└──────────────────────────────────────────────────────────────────┘
```

**Interaction rules:**
- Clicking a task → navigates to `/tasks` with that task highlighted
- Clicking a schedule event → navigates to `/schedule`
- Clicking leaderboard → navigates to `/leaderboard`
- No modals, no forms, no editing on this page at all
- "Go to Tasks →" button in the due today section

**Greeting logic:**
```typescript
const hour = new Date().getHours()
const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
```

---

## Tasks Page — Dedicated Workspace

**Purpose:** Full task management. This is where you actually work.

**Layout:**
```
Page header: "Tasks"  +  [+ New Task]  [🔍 Filter]  [⊞ Kanban | ☰ List]

─── Filter bar (collapsible) ──────────────────────────────────────
[All Types ▼] [All Status ▼] [All Courses ▼] [Due Date ▼] [Clear]
───────────────────────────────────────────────────────────────────

KANBAN VIEW:
┌────────────────┬────────────────┬────────────────┐
│  📋 Assignment │  📖 Study      │  ✓ Productivity │
│  (3 pending)   │  (4 pending)   │  (1 pending)    │
│                │                │                 │
│  [TaskCard]    │  [TaskCard]    │  [TaskCard]     │
│  [TaskCard]    │  [TaskCard]    │                 │
│  [TaskCard]    │                │                 │
│                │                │                 │
│  + Add task    │  + Add task    │  + Add task     │
└────────────────┴────────────────┴────────────────┘

LIST VIEW:
┌──────────────────────────────────────────────────────────────────┐
│ ☐  Essay on Renaissance Art    [assignment] [Art] [2d] [+15xp]  │
│ ☐  Problem Set 3               [assignment] [Phys][5d] [+20xp]  │
│ ☑  French Vocab (done)         [study]      [Fr]  [done]        │
└──────────────────────────────────────────────────────────────────┘
```

**Kanban columns:**
- Each column = one task type (Assignment / Study / Productivity)
- Colored left border per column: orange / blue / green
- Completed tasks shown at bottom of column with 50% opacity
- "+ Add task" row at bottom of each column — clicking opens inline form

**List view:**
- Sortable by: due date, created date, XP value, type
- Checkboxes on left — clicking completes task immediately
- Overdue tasks: rose background tint on the row
- Grouped by: Today / This Week / Later / Completed (collapsible groups)

**Inline task creation (both views):**
```
[Title input                    ] [Type ▼] [Date 📅] [Add →]
```
One-line form, no modal needed for quick adds.
Full modal ("+ New Task" button) for all fields including course link, XP value.

**Focus Mode button on each TaskCard:**
```
[▶ Focus]  — starts Pomodoro linked to this task
```
Clicking opens the Pomodoro tool (docked if panel closed, or floating) and sets the task name as the session label. When Pomodoro completes, prompt: "Mark task as done?"

---

## Study Hub Page

**Purpose:** Replaces the old Quiz page. A persistent library of all AI-generated study materials organized by course — not just MCQ quizzes.

**Layout — Course Grid (default view):**
```
Page header: "Study Hub"  +  [+ Generate]

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ ██████ (blue)    │  │ ██████ (green)   │  │ ██████ (violet)  │
│ Physics 201      │  │ Organic Chem     │  │ Statistics       │
│                  │  │                  │  │                  │
│ 📝 3 quizzes     │  │ 📝 1 quiz        │  │ 📝 0 quizzes     │
│ 📄 2 study notes │  │ 📄 0 notes       │  │ 📄 0 notes       │
│ 📐 1 formula sht │  │ 📐 0 sheets      │  │ 📐 0 sheets      │
│ 💬 1 Q&A set     │  │ 💬 0 Q&A sets    │  │ 💬 0 Q&A sets    │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

**Course view (after clicking a course):**
```
← Study Hub  [◆] Physics 201

[📝 Quizzes] [📄 Study Notes] [📋 Revision] [📐 Formula Sheet] [💬 Q&A] [📝 Exams]
← tab bar, one tab per material type

─── Quizzes tab ────────────────────────────────────────────────────
┌──────────────────────────────┐  ┌──────────────────────────────┐
│ Classical Mechanics Prep     │  │ Thermodynamics Focus         │
│ medium · 10q · best: 73%    │  │ hard · 8q · not attempted    │
│ [▶ Start]  [🗑]              │  │ [▶ Start]  [🗑]              │
└──────────────────────────────┘  └──────────────────────────────┘
[+ Generate New Quiz]
```

**Material types and what they contain:**

| Tab | What it shows | Generate button action |
|---|---|---|
| 📝 Quizzes | MCQ quiz cards with best score | Opens generate modal (difficulty, n_questions, folder scope) |
| 📄 Study Notes | AI summaries of course content | Generates markdown summary from indexed files |
| 📋 Revision | Condensed key points bullet list | Generates concise revision sheet |
| 📐 Formula Sheet | Term → formula/definition table | Generates structured reference card |
| 💬 Q&A Sets | Short + long answer question sets | Generates theoretical Q&A pairs |
| 📝 Practice Exams | Full timed exam simulations | Opens exam format wizard |

**Generate modal (shared across types):**
```
┌────────────────────────────────────────┐
│  Generate Study Notes                  │
│                                        │
│  Scope:                                │
│  ○ Whole course                        │
│  ○ Specific folder  [Chapter 3 ▼]      │
│  ○ Specific file    [Lecture W3.pdf ▼] │
│                                        │
│  AI Provider:  [⚡ Groq ▼]             │
│                                        │
│  [Cancel]            [Generate →]      │
└────────────────────────────────────────┘
```

**Practice Exam wizard:**
```
Step 1: Exam format
  ○ Upload a past paper  [📎 Choose file]
  ○ Describe it manually

Step 2 (if manual):
  Duration: [___] minutes
  Sections: [+ Add section]
    Section 1: [MCQ ▼]  [20] questions  [1] mark each
    Section 2: [Short answer ▼]  [5] questions  [5] marks each
    Section 3: [Essay ▼]  [1] question  [20] marks

Step 3: Generate → SSE progress stream → Timed exam view
```

---

## Tools System — VSCode-style Independent Panels

### Topbar tool icons
Six tool icons sit in the topbar between the search bar and notifications:

```
[🔍 Search...]      [🍅][⏱][🔢][📝][✓][🔗]    [🔔][👤]
```

Each icon has three visual states:
- **Default:** `text-tx3`, no background
- **Docked:** `text-blue-400`, faint blue dot below icon
- **Floating:** `text-violet-400`, faint violet dot below icon
- **Running** (Pomodoro/Stopwatch only): icon pulses subtly when tool is closed but timer is active

### Right Panel (auto-managed)
- Opens automatically when any tool is docked
- Closes automatically when all tools are floating or closed
- Width: 280px, slides in with `transition: width 0.2s ease`
- Contains all docked tools stacked vertically, each in its own collapsible section
- Each section has its own header with tool name + `[⊡ pop out]` + `[× close]` buttons

```
┌─ Right Panel ────────────────────────┐
│  🍅 Pomodoro              [⊡][×]     │
│  ─────────────────────────────────   │
│  24:38  Focus · Session 3/4          │
│  [■ Pause]          [↺ Reset]        │
│  ● ● ● ○                             │
│                                      │
│  🔢 Calculator            [⊡][×]     │
│  ─────────────────────────────────   │
│  sin cos tan log √ ^  (  )           │
│  ──────────────── 2,450.67           │
│  7  8  9  ×  ÷                       │
│  4  5  6  +  −                       │
│  1  2  3     =                       │
│  0     .                             │
└──────────────────────────────────────┘
```

### FloatingTool wrapper component

Every tool renders inside this wrapper when floating:

```
┌─ {Tool Name} ──────────────── [⊡][×] ┐  ← drag handle (entire header)
│                                       │
│  {tool content}                       │
│                                       │
└───────────────────────────────────────┘
```

Specs:
- Min width: 220px, max width: 360px (per tool)
- Draggable by header only
- `position: fixed`, `z-index: 9999`
- `box-shadow: 0 8px 32px rgba(0,0,0,0.6)`
- `border: 1px solid var(--b2)`
- `background: var(--s1)`
- `border-radius: 10px`
- Position clamped to viewport: never drag off-screen
- Last position saved to Zustand → persists across page navigation

### Zustand store shape

```typescript
type ToolId = "pomodoro" | "stopwatch" | "calculator" | "notes" | "todo" | "links"
type ToolState = "closed" | "docked" | "floating"

interface ToolEntry {
  state: ToolState
  position: { x: number; y: number }  // used only when floating
}

interface ToolsStore {
  // Per-tool state
  tools: Record<ToolId, ToolEntry>

  // Derived — true if any tool.state === "docked"
  // Do NOT store this — compute it: Object.values(tools).some(t => t.state === "docked")

  // Persistent timer state (survives open/close/navigate)
  pomodoro: {
    mode: "focus" | "short" | "long"
    secondsLeft: number
    running: boolean
    session: number          // 1–4, resets after long break
    linkedTaskId: number | null
    linkedTaskTitle: string | null
  }
  stopwatch: {
    running: boolean
    startedAt: number | null  // Date.now() when started
    elapsed: number           // ms accumulated before current run
    laps: number[]            // array of lap times in ms
  }

  // Actions
  openTool:    (id: ToolId, as: "docked" | "floating") => void
  closeTool:   (id: ToolId) => void
  popOut:      (id: ToolId) => void   // docked → floating
  dock:        (id: ToolId) => void   // floating → docked
  setPosition: (id: ToolId, x: number, y: number) => void

  // Timer actions
  pomodoroTick:    () => void
  pomodoroToggle:  () => void
  pomodoroReset:   () => void
  pomodoroSetMode: (mode: "focus" | "short" | "long") => void
  pomodoroLink:    (taskId: number, title: string) => void
  stopwatchToggle: () => void
  stopwatchLap:    () => void
  stopwatchReset:  () => void
}
```

Timer ticks driven by a single `useEffect` in `App.tsx`:
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    const { pomodoro, stopwatch, pomodoroTick, stopwatchTick } = useToolsStore.getState()
    if (pomodoro.running) pomodoroTick()
    if (stopwatch.running) stopwatchTick()
  }, 1000)
  return () => clearInterval(interval)
}, [])
```
Single interval at root level — never in tool components. This way timers run regardless of which page you're on or whether the panel is open.

### Focus Mode integration (TasksPage → Pomodoro)

```typescript
// On TaskCard "▶ Focus" click:
const startFocus = (task: Task) => {
  useToolsStore.getState().pomodoroLink(task.id, task.title)
  useToolsStore.getState().pomodoroSetMode("focus")

  const { tools } = useToolsStore.getState()
  if (tools.pomodoro.state === "closed") {
    // Open docked if nothing is floating, otherwise float it
    useToolsStore.getState().openTool("pomodoro", "docked")
  }
  useToolsStore.getState().pomodoroToggle() // start immediately
}
```

When Pomodoro session ends and `linkedTaskId` is set:
```
┌────────────────────────────────────┐
│  ✓ Session complete!               │
│  Mark "Essay on Renaissance Art"   │
│  as done?                          │
│  [Not yet]        [✓ Complete it]  │
└────────────────────────────────────┘
```
This is a shadcn `Dialog` triggered from the Pomodoro tool component.

---

## Component Checklist for Phase 3
