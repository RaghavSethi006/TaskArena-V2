# TaskArena v2 — Project Plan

## What Is This

TaskArena is a **desktop productivity app for students**. It combines task management, AI tutoring with RAG over your own notes, smart scheduling, course file organization, AI-generated quizzes, and gamification (XP, levels, streaks, leaderboard) — all in one offline-capable native desktop app.

The previous version (Electron + CRA + scattered IPC handlers) was scrapped due to unfixable architectural problems. This is a clean rebuild, planned upfront, built in the right order.

---

## The One-Line Summary

> CLI first → Backend second → GUI last. Each feature is its own project. They share one database. Nothing is built on top of something broken.

---

## Core Goals

| # | Goal |
|---|---|
| 1 | AI Tutor that actually works — streaming, RAG over your own notes, local or Groq |
| 2 | Smart Schedule — AI reads your deadlines and generates a realistic study plan |
| 3 | Everything in one place — no switching between 5 apps |
| 4 | Works fully offline — local Qwen2.5 model, no internet required |
| 5 | Fast and native-feeling — Tauri (not Electron), instant HMR, no UI lag |

---

## What This Is NOT

- Not a web app or SaaS — local desktop only, your data never leaves your machine
- Not a Notion-style editor — it organizes files you already have, doesn't replace them
- Not a general calendar — scheduling is study-focused only
- Not multi-user in v2 — single user, but the DB schema is multi-user ready

---

## Key Decisions & Why

### Tauri 2 over Electron
Electron bundles a full copy of Chromium (~150MB binary). Tauri uses the OS WebView — final binary is ~8MB. Rust backend is faster and more secure. The Webview renders React exactly the same.

### FastAPI over Electron IPC
v1 had 7 separate IPC handler files with no consistent pattern, impossible to debug. FastAPI gives one clean REST API with auto-generated `/docs`, proper async, SSE streaming support, and keeps all Python/AI code together. The React frontend just calls HTTP — simple, testable, completely replaceable.

### CLI-first development
Building UI first hides logic bugs under visual complexity. CLI-first means every feature is proven to work before a single React component is written. If the UI ever needs a redo, the backend is 100% untouched.

### Groq over OpenAI
Groq's LPU hardware runs inference at ~500 tok/s vs OpenAI's ~50 tok/s. For a chat app that difference is transformative. Free tier is generous. Models available on Groq: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768`, `gemma2-9b-it`.

### Qwen2.5-7B as local model (upgrade from Phi-2)
Phi-2 (2.7B) was weak on instruction following, reasoning, and anything complex. **Qwen2.5-7B-Instruct-Q4_K_M** is the new local default:
- Dramatically better reasoning, instruction following, and multi-turn chat
- 4.5GB RAM usage (fits in 8GB machines)
- GGUF available on HuggingFace, also available via `ollama pull qwen2.5:7b`
- Fallback for low-RAM: `Llama-3.2-3B-Instruct-Q4_K_M` (~2GB)

### SQLite + SQLAlchemy
Single file, zero config, works offline. SQLAlchemy means switching to PostgreSQL later is a one-line config change. Alembic handles all migrations — no manual DB editing ever.

### TanStack Query for server state, Zustand for UI state
No Redux. TanStack Query handles all API calls, caching, and background refetching. Zustand handles sidebar state, theme, AI provider preference. Local component state handles forms and modals.

---

## Features — v2.0 Scope

### In scope
- **Dashboard** — Kanban task board, stat cards, XP/streak display
- **AI Tutor** — streaming chat, conversation history, RAG over course files, local + Groq
- **Smart Schedule** — monthly calendar, day timeline, AI-generated study plan suggestions
- **Study Library** — course → folder → file organization, indexing status
- **Quiz Hub** — AI-generated MCQ quizzes from notes, take quiz interactively, score history
- **Leaderboard** — local rankings (Firebase sync prepared but optional)
- **Statistics** — weekly charts, activity heatmap, task breakdown, quiz performance
- **Tools** — Pomodoro timer, Stopwatch + Alarms, Scientific Calculator, Sticky Notes, Quick Links
- **Profile** — display name, AI provider toggle, API key management, preferences

### Explicitly out of scope for v2
- Mobile app
- Real-time multiplayer / collaborative features
- Cloud sync or backup
- Markdown/rich text note editor
- Browser extension
- Group study rooms

---

## Hard Rules (Non-Negotiable)

1. **Streaming AI responses** — no waiting 30s for a full reply, tokens appear as they generate
2. **No `alert()` or `confirm()`** — shadcn `Dialog` and `Sonner` toasts everywhere
3. **No inline styles** — Tailwind utility classes only, shadcn for components
4. **TypeScript strict mode** — no `any` types, all types defined in `lib/types.ts`
5. **`service.py` is pure logic** — no HTTP imports, no CLI formatting code, ever
6. **No cross-feature imports** — features only import from `shared/`
7. **Phase gates are hard stops** — Phase 2 does not start until all CLIs pass; Phase 3 does not start until all API endpoints pass
8. **Alembic for every schema change** — never manually edit `taskarena.db`
9. **One pattern everywhere** — REST HTTP through `lib/api.ts`, no exceptions
