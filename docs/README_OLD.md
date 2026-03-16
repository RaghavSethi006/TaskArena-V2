# TaskArena v2

> A desktop productivity app for students. AI tutoring, smart scheduling, task management, quiz generation, and gamification — all offline-capable.

---

## Stack

**Frontend:** Tauri 2 · React 18 · Vite · TypeScript · shadcn/ui · Tailwind CSS  
**Backend:** FastAPI · SQLAlchemy · SQLite · Alembic  
**AI:** Qwen2.5-7B (local) · Groq API · Ollama

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node 18+
- Rust (for Tauri): https://rustup.rs

### Setup

```bash
# 1. Clone and enter
git clone <repo-url>
cd taskarena-v2

# 2. Python environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 3. Environment variables
cp .env.example .env
# Edit .env — add your GROQ_API_KEY at minimum

# 4. Database
alembic upgrade head
python scripts/seed.py

# 5. (Optional) Download local AI model
python scripts/download_model.py

# 6. Frontend (Phase 3 only)
cd frontend
npm install
```

### Running

```bash
# Backend only (API + CLI features)
source .venv/bin/activate
uvicorn backend.main:app --reload --port 8765
# → API docs: http://localhost:8765/docs

# Frontend (Phase 3)
cd frontend
npm run tauri dev

# Run a CLI feature directly
python features/tasks/cli.py
python features/chatbot/cli.py
```

---

## Project Docs

| File | Contents |
|---|---|
| [PLAN.md](PLAN.md) | Project goals, decisions, scope, non-negotiables |
| [ROADMAP.md](ROADMAP.md) | Phase-by-phase checklist with gates |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Folder structure, data flow, patterns |
| [DATABASE.md](DATABASE.md) | Full schema, relationships, common queries |
| [TECH_STACK.md](TECH_STACK.md) | Every dependency, versions, setup commands |
| [AI_GUIDE.md](AI_GUIDE.md) | AI providers, RAG pipeline, model setup |
| [API.md](API.md) | Every endpoint, request/response examples |
| [CONVENTIONS.md](CONVENTIONS.md) | Code style, naming, rules |
| [PROMPTS.md](PROMPTS.md) | All AI system prompts, tuning notes |
| [ENV.md](ENV.md) | Environment variable reference |
| [PROGRESS.md](PROGRESS.md) | Session log, current status, known issues |

---

## Development Approach

This project uses a **CLI-first, three-phase approach:**

```
Phase 1: Build each feature as a standalone CLI app (shared DB)
         ↓ Gate: every CLI works end-to-end
Phase 2: Assemble into FastAPI backend (thin HTTP wrappers over service.py)
         ↓ Gate: every API endpoint passes
Phase 3: Build the Tauri + React GUI on top of the working API
```

The key principle: **`service.py` contains pure business logic — no HTTP, no CLI code, no UI.** Both the CLI and the API router call the same service functions. Logic is written once.

---

## AI Models

### Local — Qwen2.5-7B-Instruct-Q4_K_M
- File: `models/qwen2.5-7b-instruct-q4_k_m.gguf`
- RAM: ~4.5GB
- Download: `python scripts/download_model.py`

### Cloud — Groq API
- Models: `llama-3.3-70b-versatile` (default), `llama-3.1-8b-instant`
- Setup: Add `GROQ_API_KEY=gsk_...` to `.env`
- Free tier: https://console.groq.com

### Ollama (optional)
- `ollama pull qwen2.5:7b`
- Auto-detected if running on `localhost:11434`

---

## License

MIT
