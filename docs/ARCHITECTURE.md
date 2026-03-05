# TaskArena v2 — Architecture

## The Three-Phase Model

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1 — CLI FEATURES                                         │
│                                                                 │
│  features/tasks/     features/notes/     features/chatbot/      │
│  features/schedule/  features/quiz/      features/leaderboard/  │
│  features/stats/                                                │
│                                                                 │
│  Each is a standalone Python app. Each has its own cli.py.      │
│  All share one SQLite database via shared/.                     │
└────────────────────────┬────────────────────────────────────────┘
                         │ service.py functions
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2 — FASTAPI BACKEND                                      │
│                                                                 │
│  backend/main.py                                                │
│  backend/routers/  (thin HTTP wrappers — call service.py)       │
│                                                                 │
│  http://localhost:8765/api/...                                  │
│  http://localhost:8765/docs   ← interactive API explorer        │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP + SSE
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 3 — TAURI + REACT FRONTEND                               │
│                                                                 │
│  frontend/src/lib/api.ts  ← only file that knows backend exists │
│  frontend/src/pages/      ← one file per page                   │
│  frontend/src/hooks/      ← useChat (SSE), useTasks, etc.       │
│                                                                 │
│  Tauri wraps the Vite dev server in a native window             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
taskarena-v2/
│
├── shared/                        # Imported by every feature and backend
│   ├── __init__.py
│   ├── config.py                  # DB path, ports, model paths, env vars
│   ├── database.py                # SQLAlchemy engine + SessionLocal + get_db()
│   └── models_base.py             # DeclarativeBase — all models import this
│
├── features/                      # Phase 1 — one folder = one self-contained CLI app
│   ├── tasks/
│   │   ├── __init__.py
│   │   ├── models.py              # SQLAlchemy ORM model(s)
│   │   ├── schemas.py             # Pydantic request/response schemas
│   │   ├── service.py             # Pure business logic — NO HTTP, NO CLI code
│   │   ├── cli.py                 # Interactive terminal app using service.py
│   │   └── README.md
│   │
│   ├── notes/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── service.py
│   │   ├── indexer.py             # SciBERT embedding pipeline
│   │   ├── cli.py
│   │   └── README.md
│   │
│   ├── chatbot/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── service.py
│   │   ├── ai_service.py          # BaseAI + LocalAI + GroqAI + OllamaAI
│   │   ├── rag_service.py         # Retrieval-augmented generation pipeline
│   │   ├── cli.py
│   │   └── README.md
│   │
│   ├── schedule/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── service.py
│   │   ├── ai_suggestions.py      # Analyzes deadlines → generates study blocks
│   │   ├── cli.py
│   │   └── README.md
│   │
│   ├── quiz/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── service.py
│   │   ├── generator.py           # AI quiz generation from file chunks
│   │   ├── cli.py
│   │   └── README.md
│   │
│   ├── leaderboard/
│   │   ├── __init__.py
│   │   ├── schemas.py
│   │   ├── service.py
│   │   ├── cli.py
│   │   └── README.md
│   │
│   └── stats/
│       ├── __init__.py
│       ├── schemas.py
│       ├── service.py
│       ├── cli.py
│       └── README.md
│
├── backend/                       # Phase 2 — FastAPI app
│   ├── __init__.py
│   ├── main.py                    # App factory, router registration, lifespan
│   ├── middleware.py              # CORS, global exception handler
│   └── routers/
│       ├── __init__.py
│       ├── tasks.py
│       ├── chatbot.py             # SSE streaming endpoint
│       ├── schedule.py
│       ├── notes.py               # Multipart file upload
│       ├── quiz.py                # SSE progress for generation
│       ├── leaderboard.py
│       ├── stats.py
│       └── profile.py
│
├── frontend/                      # Phase 3 — Tauri + React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                # shadcn components — auto-generated, never edit
│   │   │   ├── layout/
│   │   │   │   ├── AppShell.tsx   # Root layout, sidebar + topbar + outlet
│   │   │   │   ├── Sidebar.tsx    # Nav items, collapse logic
│   │   │   │   └── Topbar.tsx     # Search, notifications, user avatar
│   │   │   └── shared/            # Custom reusable components
│   │   │       ├── TaskCard.tsx
│   │   │       ├── StatCard.tsx
│   │   │       ├── DueChip.tsx
│   │   │       ├── MessageBubble.tsx
│   │   │       └── LoadingSkeleton.tsx
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ChatbotPage.tsx
│   │   │   ├── SchedulePage.tsx
│   │   │   ├── NotesPage.tsx
│   │   │   ├── QuizPage.tsx
│   │   │   ├── LeaderboardPage.tsx
│   │   │   ├── StatisticsPage.tsx
│   │   │   ├── ToolsPage.tsx
│   │   │   └── ProfilePage.tsx
│   │   ├── hooks/
│   │   │   ├── useChat.ts         # SSE streaming — most complex hook
│   │   │   ├── useTasks.ts
│   │   │   ├── useSchedule.ts
│   │   │   ├── useQuiz.ts
│   │   │   └── useNotes.ts
│   │   ├── lib/
│   │   │   ├── api.ts             # Every fetch call lives here — nothing else calls fetch()
│   │   │   ├── types.ts           # All TypeScript interfaces, mirrored from Pydantic schemas
│   │   │   └── utils.ts           # cn() from shadcn + date helpers
│   │   ├── store/
│   │   │   └── useAppStore.ts     # Zustand — sidebar, theme, AI provider
│   │   ├── App.tsx                # Router setup
│   │   ├── main.tsx
│   │   └── index.css              # Tailwind directives + CSS variables
│   ├── src-tauri/
│   │   ├── src/
│   │   │   ├── main.rs
│   │   │   └── lib.rs             # Tauri commands: file picker, notifications
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── components.json            # shadcn config
│
├── scripts/
│   ├── seed.py                    # Inserts test user + sample data
│   ├── reset_db.py                # Drops and recreates all tables
│   └── download_model.py          # Downloads Qwen2.5 GGUF from HuggingFace
│
├── models/                        # AI model weights — excluded from git
│   ├── .gitkeep
│   └── qwen2.5-7b-instruct-q4_k_m.gguf   (downloaded separately)
│
├── data/
│   ├── .gitkeep
│   └── taskarena.db               # SQLite — excluded from git
│
├── alembic/
│   ├── env.py
│   └── versions/
│
├── .env                           # Secrets — excluded from git
├── .env.example                   # Template — committed to git
├── .gitignore
├── alembic.ini
├── requirements.txt
└── package.json                   # Root scripts (run backend + frontend together)
```

---

## Data Flow

### Reading tasks (typical request)
```
User clicks "Dashboard"
  → React calls useQuery(['tasks'])
    → TanStack Query calls api.tasks.list()
      → fetch("http://localhost:8765/api/tasks")
        → FastAPI tasks router
          → TaskService(db).get_tasks(user_id=1)
            → SQLAlchemy query → SQLite
              ← list of Task objects
            ← list[TaskOut] Pydantic models
          ← JSON response
        ← parsed as TaskOut[]
      ← cached in TanStack Query
    ← rendered as TaskCard components
```

### AI chat message (SSE streaming)
```
User types message and hits Send
  → useChat.send(content)
    → fetch POST /api/conversations/1/messages
      → FastAPI chatbot router
        → ChatService.stream_response()
          → RAGService.get_context(query, course_id)
            → SciBERT embed query → cosine similarity → top 5 chunks
          → GroqAI.stream(messages, context)
            → Groq API streaming HTTP request
              ← token ← token ← token ...
            yield token
          yield f"data: {token}\n\n"   ← SSE event
        ← StreamingResponse
      ← ReadableStream
    → reader.read() in loop
      → each token appended to message in React state
        → UI updates in real time
```

### File indexing
```
User adds a file in Notes CLI (or UI)
  → NotesService.add_file(folder_id, name, path)
    → creates File record with indexed=False
  → Indexer.index_file(file_id)
    → extract_text(path)         ← pdfplumber / python-docx / plain read
    → chunk_text(text, 512)      ← sliding window chunks
    → embed_chunks(chunks)       ← SciBERT sentence embeddings
    → save each chunk + embedding to file_chunks table
    → mark file.indexed = True
```

---

## The Service Pattern

The most important architectural rule. Every feature has a `service.py` that is pure business logic:

```python
# ✅ CORRECT — service.py
class TaskService:
    def __init__(self, db: Session):
        self.db = db

    def complete_task(self, task_id: int) -> tuple[Task, int]:
        task = self.db.query(Task).get(task_id)
        task.status = "completed"
        self.db.commit()
        xp = self._award_xp(task.user_id, task.points, ...)
        return task, xp
```

```python
# ✅ CORRECT — cli.py calls service
task, xp = svc.complete_task(42)
print(f"✓ Done! +{xp} XP")
```

```python
# ✅ CORRECT — router also calls the same service
@router.patch("/{task_id}/complete")
def complete_task(task_id: int, db = Depends(get_db)):
    task, xp = TaskService(db).complete_task(task_id)
    return {"task": task, "xp_earned": xp}
```

```python
# ❌ WRONG — service importing FastAPI
from fastapi import HTTPException     # never in service.py
from fastapi.responses import JSONResponse  # never in service.py

# ❌ WRONG — service doing CLI formatting
def complete_task(self, task_id):
    task = ...
    print(f"✓ Completed!")  # never in service.py
    click.echo(...)          # never in service.py
```

---

## Import Rules

```
shared/          ← can be imported by: features/*, backend/*, scripts/*
features/tasks/  ← can be imported by: backend/routers/tasks.py only
features/notes/  ← can be imported by: backend/routers/notes.py only
                    AND features/chatbot/ (rag_service needs the search function)
                    AND features/quiz/ (generator needs the search function)

# Exception: chatbot and quiz may import from notes.indexer for the search function
# because RAG and quiz generation are fundamentally dependent on the notes index.
# All other cross-feature imports are forbidden.
```
