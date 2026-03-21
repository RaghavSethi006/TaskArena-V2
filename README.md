<div align="center">

# ⚔️ TaskArena v2

### Your personal AI study companion. Built for students who mean business.

**Manage tasks · Index your notes · Chat with an AI that knows your material · Generate quizzes · Build smarter schedules · Level up.**

Everything in one app. Offline. On your machine. Zero subscriptions.

<br/>

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri-2-FFC131?style=for-the-badge&logo=tauri&logoColor=black)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

</div>

---

## The Problem

Students juggle five different apps just to get through a semester. A notes app here. A calendar there. ChatGPT in another tab — which doesn't know anything about your actual coursework. A todo list. A Pomodoro timer. None of them talk to each other.

**TaskArena is one app that replaces all of them** — and unlike every AI tool you've tried, the AI actually knows what's in your lecture slides.

---

## Everything It Does

### 📋 Task Management — With a Kanban Board and XP

Create and track tasks across three types: **Assignments**, **Study sessions**, and **Productivity tasks**. Set priorities, due dates, and statuses. Watch them move through a Kanban board from pending → in progress → done.

Completing a task isn't just satisfying — it awards **XP points** logged to a permanent ledger. That XP feeds your level, your streak, and your leaderboard rank. The whole app is built around making progress feel real.

---

### 🧠 AI Chatbot — Grounded in Your Own Notes

This is the centerpiece. Upload your PDFs and lecture slides once. TaskArena indexes them using **SciBERT** — a BERT model trained on academic and scientific text — and builds a local semantic search engine over your material.

Every time you ask a question, the chatbot retrieves the most relevant passages from *your* notes before generating an answer. Not Wikipedia. Not the internet. Your lecture slides. Your textbook chapters. Your content.

You control the RAG context scope per conversation:

| Context | What the AI reads |
|---|---|
| **Whole course** | Every indexed file across the course |
| **Specific folder** | Just one unit or module (e.g., "Unit 3 — Thermodynamics") |
| **Single file** | One specific document (e.g., "Week 9 lecture slides") |
| **No context** | General AI, no document retrieval |

Responses stream token-by-token in real time. Every conversation is saved. Sources (the file names the AI drew from) are shown at the end of each reply.

---

### 📚 Notes & File Indexing — Your Whole Course in a Search Engine

Organize materials in a three-level hierarchy: **Course → Folder → File**. Supported formats: **PDF**, **Word documents (.docx)**, and **plain text**.

When you upload a file, the backend:
1. Extracts the full text
2. Splits it into overlapping chunks
3. Embeds each chunk with SciBERT
4. Saves the embeddings for instant semantic search

An indexed badge shows you what's ready. Re-indexing a file is a single click. This index powers the chatbot, the quiz generator, and the study material generator simultaneously.

---

### 🧪 AI Quiz Generator — From Your Notes, Not the Internet

Select a course, a folder, or a single file. Choose difficulty and question count. Hit generate.

The app runs a semantic search over your indexed material, builds a structured prompt from the most relevant content, sends it to the AI, and streams back real-time progress:

```
Searching course materials…
Building quiz prompt…
Generating questions with AI…
Saving quiz…  ✓ Done
```

Every question comes with four options, the correct answer flagged, and a written explanation. Your scores are tracked over every attempt. Your best score is always saved. XP is awarded on completion.

---

### 📖 Study Hub — AI-Generated Study Materials

Beyond quizzes, the Study Hub generates full study materials from your course content:

- **Study notes** — condensed summaries of key concepts
- **Concept summaries** — high-level overviews of topics
- **Flashcard sets** — Q&A pairs for active recall practice

Scope it to a whole course, a folder, or a single file. Choose difficulty. Watch it generate with the same live progress stream as the quiz generator. Every generated material is saved and accessible any time.

---

### 📅 Schedule Builder — With AI Suggestions

A full calendar application with daily, weekly, and monthly views. Create events in five types — **Study**, **Assignment**, **Exam**, **Break**, and **Other** — each rendered in its own color.

The smart part: hit **"Get AI Suggestions"** and the app analyzes your upcoming task deadlines and your existing schedule density, then generates specific study block recommendations — with exact dates, start times, durations, and the reasoning behind each suggestion. Click **"Schedule it"** and it becomes a real calendar event.

Tasks with due dates can be **auto-synced** to the calendar so your assignments automatically appear as events without any manual entry.

---

### 🗓️ Schedule Templates — Build Once, Reuse Every Week

If your semester has a consistent structure (lectures on Monday and Wednesday, tutorials on Friday), build it once as a **template** and instantiate it across any date range with a single action. Templates generate real events, fully editable after creation.

---

### 📊 Statistics Dashboard — Actually Understand Your Progress

Three views that turn your activity data into something meaningful:

- **Overview** — total XP, current streak, longest streak, tasks completed vs. pending, quizzes taken, average quiz score, and your global rank.
- **Daily Activity** — a time series of tasks completed and XP earned per day, configurable from 1 to 90 days. Designed to render as a GitHub-style activity heatmap.
- **Task Breakdown** — completed vs. pending split by task type, so you can see whether it's assignments or study sessions falling behind.
- **Quiz Performance** — best scores and attempt counts across every quiz you've taken.

---

### 🏆 Leaderboard — Compete With Your Past Self

Rankings are computed from your XP, level, task completions, and streak. Two periods: **All-time** and **Weekly**. The leaderboard is designed to scale to multiple users — the schema and service layer are already built for it.

---

### 🎮 XP, Levels & Streaks — Gamification That Works

Every meaningful action feeds the XP system:

- ✅ Completing a task → XP based on type and priority
- 🧪 Finishing a quiz → XP based on score
- 🔥 Showing up daily → streak multiplier

XP accumulates into **levels**. Levels show on your profile and leaderboard card. Streaks track how many consecutive days you've been active. Daily activity heatmaps visualize the momentum you've built.

---

### 🛠️ Floating Desktop Tools — Always One Click Away

Six utility widgets available as floating panels from any page in the app — no navigation required, no tab-switching:

| Tool | What It Does |
|---|---|
| **Pomodoro Timer** | Configurable work / short break / long break intervals with desktop notifications |
| **Stopwatch** | Lap-capable stopwatch for timed study sessions |
| **Calculator** | Standard calculator for quick arithmetic |
| **Sticky Notes** | In-session scratchpad for quick thoughts |
| **Quick Links** | Bookmarked URLs that open in your system browser instantly |
| **Quick Todo** | Lightweight checklist separate from the main task board |

---

### ⌘K Command Palette — Navigate Without the Mouse

Hit `⌘K` (or `Ctrl+K`) from anywhere in the app. Search pages, trigger actions, start a new conversation — all from your keyboard. Zero mouse required. Inspired by Linear and VS Code.

---

### 🚀 Onboarding Wizard — Up and Running in Minutes

First-launch wizard that walks you through creating your first course, picking an AI provider, and understanding how XP and streaks work. You're never dropped into a blank app wondering what to do.

---

### 👤 Profile & AI Configuration — Full Control

Switch your AI provider, model, and API key at any time from the Profile page — no restart, no config file editing. The active provider is shown on every chatbot conversation so you always know what's answering you.

---

## Built to Impress (For Developers & Recruiters)

- **Layered architecture** — every feature is a standalone Python service class, wrapped in a FastAPI router, consumed by React. Routers never touch the database directly. Services don't know HTTP exists.
- **Real-time SSE streaming** — chat responses and generation pipelines both stream token-by-token over Server-Sent Events. No polling, no fake loading bars.
- **RAG pipeline built from scratch** — SciBERT embeddings, cosine similarity search, context scoping at three levels of granularity. No LangChain. No black boxes.
- **Alembic migrations from day one** — five schema migrations in version history. Production-grade from the start.
- **Tauri v2 sidecar** — the Python backend compiles into a native binary bundled inside the installer. End users need no Python runtime.
- **TanStack Query v5 + Zustand v4** — server state and UI state handled by the right tools, not a shared monolith.
- **Design system with CSS variables** — dark-mode-first, strict 4px spacing grid, semantic color tokens, two-font system with explicit usage rules.

### Core Stack

```
Backend   FastAPI · SQLAlchemy 2 · Alembic · SQLite · Pydantic v2 · llama-cpp-python · sentence-transformers
AI        Qwen2.5-7B-Instruct-Q4 · Groq API · Ollama · SciBERT (allenai/scibert_scivocab_uncased)
Frontend  React 18 · TypeScript 5 · Tauri v2 · Vite 5 · Tailwind CSS · shadcn/ui
State     TanStack Query v5 (server state) · Zustand v4 (UI state)
UX        Framer Motion · Recharts · Sonner · date-fns · lucide-react · DM Sans + DM Mono
```

---

## AI Providers

Pick what works for your machine. Switch any time.

| Provider | Setup | Speed | Privacy |
|---|---|---|---|
| **Local — Qwen2.5-7B** | Download a ~4.5 GB GGUF file. Runs on CPU or GPU. | Depends on hardware | 100% local, nothing leaves your machine |
| **Groq** | Add one API key. Free tier available. | ~280 tokens/sec | Data goes to Groq's servers |
| **Ollama** | `ollama pull qwen2.5:7b`. No GGUF needed. | Depends on hardware | 100% local |

**Low-RAM machines (<8 GB):** use the Llama-3.2-3B-Q4 model (~2 GB) as a local fallback.

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node 18+ and Rust 1.70+ *(for Tauri)*
- 8 GB RAM for local AI — *or skip it entirely and use Groq for free*

### Setup

```bash
# 1. Clone
git clone https://github.com/your-username/TaskArena2.0.git
cd TaskArena2.0/taskarena-v2

# 2. Python environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 3. Environment config
cp .env.example .env             # Add GROQ_API_KEY if using Groq

# 4. Database
alembic upgrade head
python scripts/seed.py           # Optional — loads sample data

# 5. Local AI model (skip if using Groq or Ollama)
python scripts/download_model.py

# 6. Frontend
cd frontend && npm install && cd ..
```

### Run

```bash
# Terminal 1 — Backend
uvicorn backend.main:app --reload --port 8765

# Terminal 2 — Frontend  
cd frontend && npm run tauri dev
```

App opens in a native window. API explorer at `http://localhost:8765/docs`.

---

## Project Structure

```
taskarena-v2/
├── features/           # One self-contained Python package per feature
│   ├── tasks/          # models · schemas · service · cli
│   ├── notes/          # + indexer.py (SciBERT embedding pipeline)
│   ├── chatbot/        # + ai_service.py · rag_service.py
│   ├── schedule/       # + ai_suggestions.py · template_service.py
│   ├── quiz/           # + generator.py
│   ├── study_materials/# + generator.py
│   ├── leaderboard/
│   └── stats/
├── backend/            # FastAPI — thin HTTP wrappers over feature services
│   └── routers/        # One router per feature, no DB access allowed here
├── frontend/           # Tauri v2 + React desktop app
│   └── src/
│       ├── pages/      # One file per route (9 pages)
│       ├── hooks/      # Data fetching + SSE streaming hooks
│       ├── components/ # Layout · Schedule UI · Floating tools · Shared
│       └── stores/     # Zustand: UI state · schedule state · tools state
├── shared/             # DB engine, ORM base, config — used by everything
├── alembic/            # Migration history (5 versions)
├── models/             # AI model weights — git-ignored, downloaded separately
└── scripts/            # seed.py · reset_db.py · download_model.py
```

---

## Roadmap

**Shipped**
- [x] Task management with Kanban board, XP, and levelling
- [x] Notes & file indexing with SciBERT RAG pipeline
- [x] Streaming AI chatbot with granular context scoping (course / folder / file)
- [x] AI quiz generation with live progress streaming
- [x] AI study materials generation (notes, summaries, flashcards)
- [x] AI schedule suggestions and one-click acceptance
- [x] Schedule templates with date-range instantiation
- [x] Statistics dashboard with activity heatmap and breakdown charts
- [x] Leaderboard with all-time and weekly periods
- [x] XP, levels, streaks, and gamification throughout
- [x] Six floating desktop tools (Pomodoro, Stopwatch, Calculator, Sticky Notes, Quick Links, Quick Todo)
- [x] `⌘K` Command palette
- [x] Onboarding wizard
- [x] Profile with runtime AI provider switching
- [x] Full Tauri desktop app with sidecar Python backend

**Coming Next**
- [ ] Multi-user support with Firebase Auth
- [ ] Multiplayer study lobbies
- [ ] Export quizzes and study materials as PDF
- [ ] Hybrid full-text + semantic search across all indexed notes

---

## License

[LICENSE](LICENSE) — built by Raghav Sethi.