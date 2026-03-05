# TaskArena v2 — Roadmap

> Check off items as you complete them. Never skip a gate. Dates are estimates.

---

## Phase 0 — Project Bootstrap
**Goal:** Repo exists, DB is created, seed data is in it. Nothing else.

- [ ] Create `taskarena-v2/` root folder
- [ ] `git init` + initial commit
- [ ] Create `.gitignore` (see CONVENTIONS.md for contents)
- [ ] Create folder skeleton: `shared/` `features/` `backend/` `frontend/` `data/` `models/` `scripts/`
- [ ] Add `.gitkeep` to `data/` and `models/`
- [ ] Create `.env` from `.env.example`
- [ ] `python -m venv .venv` + `pip install -r requirements.txt`
- [ ] Create `shared/config.py`
- [ ] Create `shared/models_base.py`
- [ ] Create `shared/database.py`
- [ ] Write all SQLAlchemy models across feature folders (models only, no service yet)
- [ ] `alembic init alembic` + configure `alembic/env.py`
- [ ] Create and run first migration: `alembic revision --autogenerate -m "initial"` → `alembic upgrade head`
- [ ] Confirm `data/taskarena.db` exists and all tables are present
- [ ] Write `scripts/seed.py` (inserts 1 user + sample courses, tasks, events)
- [ ] Run `python scripts/seed.py` — verify data with DB browser or sqlite3 CLI

**✅ Gate:** `data/taskarena.db` has all tables and seed data. No errors.

---

## Phase 1A — Tasks CLI
**Goal:** Full task CRUD + XP system working in terminal.

- [ ] `features/tasks/schemas.py`
- [ ] `features/tasks/service.py` — `get_tasks` `create_task` `update_task` `complete_task` `delete_task` `_award_xp`
- [ ] `features/tasks/cli.py` — list / add / complete / delete menu
- [ ] `features/tasks/README.md`
- [ ] **Test:** Complete a task → check `users.xp` went up → check `xp_log` has new row

**✅ Gate:** All CRUD works. XP updates correctly in DB.

---

## Phase 1B — Notes CLI
**Goal:** File organization + indexing pipeline working. RAG search returns relevant results.

- [ ] `features/notes/schemas.py`
- [ ] `features/notes/service.py` — course/folder/file CRUD
- [ ] `features/notes/indexer.py` — `extract_text` `chunk_text` `embed_chunks` `index_file` `search`
- [ ] `features/notes/cli.py` — browse / add / index / search
- [ ] `features/notes/README.md`
- [ ] **Test:** Add a real PDF → index it → run a search query → confirm relevant chunks returned

**✅ Gate:** Indexer runs without error. Vector search returns relevant content.

---

## Phase 1C — Chatbot CLI ← Priority 1
**Goal:** Streaming AI responses work in terminal. RAG context injected. Both local and Groq work.

- [ ] `features/chatbot/schemas.py`
- [ ] `features/chatbot/ai_service.py` — `BaseAI` `LocalAI` (Qwen2.5) `GroqAI` `OllamaAI` `get_ai()`
- [ ] `features/chatbot/rag_service.py` — `get_context` `format_sources`
- [ ] `features/chatbot/service.py` — `get_conversations` `create_conversation` `get_messages` `save_message` `stream_response` `build_message_history` `auto_title`
- [ ] `features/chatbot/cli.py` — new chat / open chat / stream response / source display / provider switch
- [ ] `features/chatbot/README.md`
- [ ] **Test local:** Run with Qwen2.5 GGUF → ask a question about an indexed PDF → see tokens stream → see source cited
- [ ] **Test Groq:** Add `GROQ_API_KEY` to `.env` → run same test → verify streaming works

**✅ Gate:** Tokens stream live in terminal for both local and Groq. RAG context is used. Sources are shown.

---

## Phase 1D — Schedule CLI ← Priority 2
**Goal:** Schedule CRUD works. AI suggestions reference real task deadlines from DB.

- [ ] `features/schedule/schemas.py`
- [ ] `features/schedule/ai_suggestions.py` — `analyze_workload` `generate_suggestions` `format_study_plan`
- [ ] `features/schedule/service.py` — `get_events` `create_event` `update_event` `delete_event` `get_ai_suggestions` `accept_suggestion`
- [ ] `features/schedule/cli.py` — weekly view / add / delete / suggest / accept
- [ ] `features/schedule/README.md`
- [ ] **Test:** Add 3 tasks with deadlines → run `suggest` → verify output references those specific deadlines

**✅ Gate:** CRUD works. AI suggestions are grounded in actual DB tasks.

---

## Phase 1E — Quiz CLI
**Goal:** Generate MCQ quiz from indexed notes. Take it interactively. Score saved.

- [ ] `features/quiz/schemas.py`
- [ ] `features/quiz/generator.py` — `build_prompt` `parse_response` `generate`
- [ ] `features/quiz/service.py` — `get_quizzes` `get_quiz` `create_quiz` `delete_quiz` `submit_attempt` `get_attempts`
- [ ] `features/quiz/cli.py` — list / generate (with progress) / take / results
- [ ] `features/quiz/README.md`
- [ ] **Test:** Generate quiz from indexed file → take it → verify score + XP saved in DB

**✅ Gate:** Generation produces valid parseable questions. Score is accurate. XP is awarded.

---

## Phase 1F — Leaderboard CLI
**Goal:** Rankings print correctly from DB.

- [ ] `features/leaderboard/schemas.py`
- [ ] `features/leaderboard/service.py` — `get_rankings` `get_user_stats` `get_weekly_top`
- [ ] `features/leaderboard/cli.py` — formatted table with current user highlighted
- [ ] `features/leaderboard/README.md`
- [ ] **Test:** Seed 5 users with different XP values → rankings are sorted correctly

**✅ Gate:** Rankings are accurate. Weekly top uses `xp_log` dates, not total XP.

---

## Phase 1G — Stats CLI
**Goal:** All aggregations are accurate. Weekly chart prints in terminal.

- [ ] `features/stats/schemas.py`
- [ ] `features/stats/service.py` — `get_overview` `get_daily_activity` `get_task_breakdown` `get_quiz_performance`
- [ ] `features/stats/cli.py` — summary + ASCII bar chart
- [ ] `features/stats/README.md`
- [ ] **Test:** Verify each stat number matches a manual `SELECT COUNT(*)` from the DB

**✅ Gate:** All numbers match raw DB queries.

---

## Phase 1 Complete Gate
Before moving to Phase 2, confirm all of the following:

- [ ] All 7 CLIs run without any errors
- [ ] Chatbot streams in terminal with local Qwen2.5
- [ ] Chatbot streams in terminal with Groq API
- [ ] RAG retrieves relevant context from indexed files
- [ ] XP system updates correctly across tasks and quiz features
- [ ] No feature imports from another feature (grep-check: `from features.` in service files)
- [ ] All README.md files are written

---

## Phase 2 — Backend Assembly
**Goal:** All features exposed via FastAPI. Every endpoint tested. Streaming confirmed.

- [ ] `backend/__init__.py`
- [ ] `backend/middleware.py` — CORS + global error handler
- [ ] `backend/main.py` — app factory, router registration, startup/shutdown events
- [ ] `backend/routers/tasks.py`
- [ ] `backend/routers/chatbot.py` — SSE streaming endpoint
- [ ] `backend/routers/schedule.py`
- [ ] `backend/routers/notes.py` — includes multipart file upload
- [ ] `backend/routers/quiz.py` — includes SSE progress for generation
- [ ] `backend/routers/leaderboard.py`
- [ ] `backend/routers/stats.py`
- [ ] `backend/routers/profile.py`
- [ ] Start server: `uvicorn backend.main:app --reload --port 8765`
- [ ] Open `http://localhost:8765/docs` — confirm all endpoints visible
- [ ] Test all endpoints (see API.md for full list)
- [ ] Test SSE streaming with curl: `curl -N -X POST http://localhost:8765/api/conversations/1/messages -H "Content-Type: application/json" -d '{"content":"hello","provider":"groq"}'`
- [ ] Test error responses: 404 on missing ID, 422 on bad payload

**✅ Gate:** All endpoints return correct data. Streaming works via curl. Zero 500 errors on valid requests.

---

## Phase 3 — Frontend
**Goal:** Full working GUI connected to the backend.

### 3A — Setup & Shell
- [ ] `npm create vite@latest frontend -- --template react-ts`
- [ ] Tailwind CSS configured
- [ ] `npx shadcn@latest init` — Zinc theme, CSS variables on
- [ ] All shadcn components added (see TECH_STACK.md)
- [ ] All extra npm deps installed
- [ ] Tauri configured (`src-tauri/tauri.conf.json`)
- [ ] `lib/api.ts` — full API client written
- [ ] `lib/types.ts` — all TypeScript interfaces (mirrored from Pydantic schemas)
- [ ] `store/useAppStore.ts` — Zustand store
- [ ] AppShell renders — sidebar + topbar + page outlet
- [ ] Sidebar collapses/expands + state persists
- [ ] Navigation between all page routes works (placeholder pages)

### 3B — Chatbot Page ← Priority 1
- [ ] `hooks/useChat.ts` — SSE streaming, tokens append in real time
- [ ] Conversation list sidebar
- [ ] Message thread with user + assistant bubbles
- [ ] Tokens stream visibly as they arrive (no waiting for full response)
- [ ] Course context dropdown (triggers RAG)
- [ ] AI provider selector (Local / Groq / Ollama)
- [ ] Source file citations shown under AI messages
- [ ] New conversation button
- [ ] Typing indicator before first token arrives
- [ ] Auto-scroll to bottom

### 3C — Schedule Page ← Priority 2
- [ ] Monthly calendar grid with event indicator dots
- [ ] Click cell → day timeline panel updates
- [ ] Add Event modal (title, time, type, course)
- [ ] Delete event
- [ ] AI Suggestions panel — calls `/api/schedule/suggestions`
- [ ] "Schedule it" button saves suggestion as real event
- [ ] Week strip (current week overview)
- [ ] Upcoming deadlines sidebar

### 3D — Dashboard + Core Pages
- [ ] Dashboard — Kanban columns, stat cards, XP toast on task complete
- [ ] Notes — course grid → folder sidebar → file list, add file, indexing status badge
- [ ] Quiz — quiz cards, generate modal with live progress steps, take quiz UI, results
- [ ] Leaderboard — rankings table, user stats panel

### 3E — Remaining Pages
- [ ] Statistics — area charts, heatmap grid, breakdown bars
- [ ] Tools — Pomodoro, Stopwatch/Alarms, Calculator, Sticky Notes, Quick Links
- [ ] Profile — name/email, AI config, preferences, badges

### 3F — Polish
- [ ] Page enter animations (framer-motion `fadeUp`)
- [ ] Loading skeletons on all data-dependent views
- [ ] Empty states (no tasks, no conversations, no quizzes)
- [ ] Error states (backend offline, API error)
- [ ] Sonner toasts on all create/complete/delete actions
- [ ] Keyboard shortcuts: `⌘K` global search, number keys for quiz answers
- [ ] Sidebar collapse state persists in localStorage
- [ ] All modals closeable with `Escape`
- [ ] `npm run tauri build` — packaged app runs on target machine

**✅ Gate:** Every page is functional, connected to real API data, no hardcoded mock values.

---

## Milestone Summary

| Milestone | Deliverable | Gate condition |
|---|---|---|
| M0 | Bootstrap | DB exists, seed data works |
| M1a | Tasks CLI | CRUD + XP working |
| M1b | Notes CLI | Indexer + search working |
| M1c | Chatbot CLI | Streaming local + Groq + RAG |
| M1d | Schedule CLI | CRUD + AI suggestions |
| M1e | Quiz CLI | Generate + take + score |
| M1f | Leaderboard CLI | Rankings correct |
| M1g | Stats CLI | All aggregations accurate |
| M2 | Backend | All endpoints pass, streaming works |
| M3a | Frontend shell | Routing, sidebar, API connected |
| M3b | Chatbot UI | Streaming in browser |
| M3c | Schedule UI | Calendar + AI suggestions |
| M3d | All pages | Every page functional with real data |
| M3e | Polish | Animations, errors, keyboard nav |
| v2.0 | Ship | Tauri binary runs, no mock data anywhere |
