# TaskArena v2 — Tech Stack

## Full Stack Overview

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Desktop wrapper | Tauri | 2.x | Native window, file system access |
| Frontend framework | React | 18.x | UI rendering |
| Frontend build tool | Vite | 5.x | Dev server + bundler |
| Frontend language | TypeScript | 5.x | Type safety |
| UI components | shadcn/ui | latest | Pre-built accessible components |
| CSS framework | Tailwind CSS | 3.x | Utility-first styling |
| Server state | TanStack Query | 5.x | API caching + refetching |
| UI state | Zustand | 4.x | Sidebar, theme, AI provider |
| Animations | Framer Motion | 11.x | Page transitions, micro-animations |
| Charts | Recharts | 2.x | Stats page graphs |
| Toasts | Sonner | 1.x | All notifications |
| Date utils | date-fns | 3.x | Calendar date math |
| Icons | lucide-react | latest | All icons |
| Backend framework | FastAPI | 0.110+ | REST API + SSE streaming |
| ASGI server | Uvicorn | 0.29+ | Serves FastAPI |
| ORM | SQLAlchemy | 2.x | Database queries |
| DB migrations | Alembic | 1.13+ | Schema versioning |
| Database | SQLite | 3.x | Local data storage |
| Data validation | Pydantic | 2.x | Request/response schemas |
| Local AI runtime | llama-cpp-python | 0.2.x | Run GGUF models locally |
| Local AI model | Qwen2.5-7B-Instruct-Q4_K_M | — | Primary local model |
| Cloud AI | Groq API | — | Fast cloud inference |
| Groq SDK | groq | 0.x | Python SDK for Groq |
| Embeddings | sentence-transformers | 2.x | SciBERT for RAG |
| PDF extraction | pdfplumber | 0.x | Extract text from PDFs |
| DOCX extraction | python-docx | 1.x | Extract text from Word files |

---

## Python Environment

```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate        # Mac/Linux
.venv\Scripts\activate           # Windows

# Install all dependencies
pip install -r requirements.txt
```

### requirements.txt
```
# Web framework
fastapi>=0.110.0
uvicorn[standard]>=0.29.0
python-multipart>=0.0.9

# Database
sqlalchemy>=2.0.0
alembic>=1.13.0

# Data validation
pydantic>=2.0.0
pydantic-settings>=2.0.0

# AI — local
llama-cpp-python>=0.2.0

# AI — cloud
groq>=0.5.0

# AI — embeddings
sentence-transformers>=2.7.0
numpy>=1.26.0

# File processing
pdfplumber>=0.11.0
python-docx>=1.1.0

# Utilities
python-dotenv>=1.0.0
httpx>=0.27.0
```

> **Note on llama-cpp-python:** Install with GPU support for faster local inference:
> - Mac (Metal): `CMAKE_ARGS="-DLLAMA_METAL=on" pip install llama-cpp-python`
> - NVIDIA GPU: `CMAKE_ARGS="-DLLAMA_CUBLAS=on" pip install llama-cpp-python`
> - CPU only: `pip install llama-cpp-python` (slower but works)

---

## Local AI Model

### Primary: Qwen2.5-7B-Instruct-Q4_K_M

**Why Qwen2.5-7B:**
- Massively better than Phi-2 at instruction following, reasoning, and multi-turn chat
- 4-bit quantized: ~4.5GB RAM, runs on any machine with 8GB+ RAM
- Excellent at generating structured output (needed for quiz generation)
- Strong multilingual support

**Download:**
```bash
# Option 1: Python script (recommended)
python scripts/download_model.py

# Option 2: Manual from HuggingFace
# https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF
# Download: qwen2.5-7b-instruct-q4_k_m.gguf
# Place in: models/

# Option 3: Ollama (easiest, no GGUF needed)
ollama pull qwen2.5:7b
```

**Fallback for low-RAM machines (<8GB):**
- Model: `Llama-3.2-3B-Instruct-Q4_K_M.gguf`
- RAM usage: ~2GB
- Download: https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF

---

## Groq API

### Available Models
| Model ID | Context | Speed | Best for |
|---|---|---|---|
| `llama-3.3-70b-versatile` | 128k | ~280 tok/s | Main chat, complex reasoning |
| `llama-3.1-8b-instant` | 128k | ~750 tok/s | Fast responses, simple questions |
| `mixtral-8x7b-32768` | 32k | ~500 tok/s | Long context, analysis |
| `gemma2-9b-it` | 8k | ~500 tok/s | Alternative option |

**Default model:** `llama-3.3-70b-versatile`

**Setup:**
1. Create account at https://console.groq.com
2. Generate API key
3. Add to `.env`: `GROQ_API_KEY=gsk_...`

**Free tier limits:** ~14,400 requests/day on the free tier (more than enough for personal use)

---

## Node / Frontend Environment

```bash
# Prerequisites: Node 18+ and Rust installed
node --version   # should be 18+
rustc --version  # should be 1.70+

# Install Tauri CLI
npm install -g @tauri-apps/cli

# Setup frontend
cd frontend
npm install
```

### package.json dependencies
```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.23.0",
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-dialog": "^2.0.0",
    "@tauri-apps/plugin-notification": "^2.0.0",
    "@tanstack/react-query": "^5.40.0",
    "zustand": "^4.5.0",
    "framer-motion": "^11.2.0",
    "recharts": "^2.12.0",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.400.0",
    "sonner": "^1.5.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0",
    "vite": "^5.3.0"
  }
}
```

### shadcn/ui Setup
```bash
# Init (run from frontend/)
npx shadcn@latest init
# → Style: Default
# → Base color: Zinc
# → CSS variables: Yes

# Add all components needed
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add sheet
npx shadcn@latest add select
npx shadcn@latest add input
npx shadcn@latest add textarea
npx shadcn@latest add badge
npx shadcn@latest add progress
npx shadcn@latest add tabs
npx shadcn@latest add separator
npx shadcn@latest add scroll-area
npx shadcn@latest add dropdown-menu
npx shadcn@latest add tooltip
npx shadcn@latest add popover
npx shadcn@latest add command
npx shadcn@latest add sonner
npx shadcn@latest add calendar
npx shadcn@latest add avatar
npx shadcn@latest add switch
npx shadcn@latest add label
npx shadcn@latest add skeleton
```

---

## Tauri Configuration

### tauri.conf.json (key settings)
```json
{
  "app": {
    "windows": [{
      "title": "TaskArena",
      "width": 1200,
      "height": 800,
      "minWidth": 900,
      "minHeight": 600,
      "resizable": true,
      "center": true,
      "decorations": true
    }]
  },
  "bundle": {
    "identifier": "com.taskarena.app",
    "productName": "TaskArena",
    "version": "2.0.0"
  }
}
```

### Tauri used for (only these things):
- Native file picker dialog (`@tauri-apps/plugin-dialog`)
- Desktop notifications (`@tauri-apps/plugin-notification`)
- Opening system file browser to a path

### Tauri NOT used for:
- Any app data — all data goes through FastAPI
- Backend logic — all logic stays in Python

---

## Root Scripts

```json
// package.json (root)
{
  "scripts": {
    "dev": "concurrently \"npm run backend\" \"npm run frontend\"",
    "backend": "cd .. && uvicorn backend.main:app --reload --port 8765",
    "frontend": "cd frontend && npm run tauri dev",
    "build": "cd frontend && npm run tauri build",
    "seed": "python scripts/seed.py",
    "reset": "python scripts/reset_db.py",
    "migrate": "alembic upgrade head"
  }
}
```

---

## Dev Tools

| Tool | Purpose | Download |
|---|---|---|
| DB Browser for SQLite | Inspect `taskarena.db` visually | https://sqlitebrowser.org |
| Bruno / Insomnia | Test API endpoints | https://usebruno.com |
| Ollama | Run local models without GGUF setup | https://ollama.com |
| HuggingFace CLI | Download GGUF model files | `pip install huggingface-hub` |
