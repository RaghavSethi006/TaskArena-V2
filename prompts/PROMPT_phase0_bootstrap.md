# TaskArena v2 — Phase 0 Bootstrap Prompt
# Tool: Codex / any agentic AI coder
# Goal: Set up the entire project skeleton, shared layer, and database

---

## PROMPT (paste this exactly)

---

You are building a desktop productivity app called TaskArena v2. The full project documentation is in the `docs/` folder. Before writing any code, read these files in this order:

1. `docs/ARCHITECTURE.md` — understand the folder structure and the three-phase approach
2. `docs/DATABASE.md` — understand the full schema you are about to create
3. `docs/CONVENTIONS.md` — understand the coding rules you must follow
4. `docs/TECH_STACK.md` — understand the dependencies
5. `docs/ENV.md` — understand the environment variables

Your job right now is **Phase 0 only** — project bootstrap. Do not build any feature logic. Do not build any CLI apps. Do not build any API routes. Do not build any frontend. Phase 0 is purely: folder skeleton + shared layer + database + seed script.

---

## What to build

### 1. Folder skeleton

Create every folder and file listed below. Folders that need no immediate content get an empty `__init__.py` or `.gitkeep`.

```
taskarena-v2/
├── shared/
│   ├── __init__.py
│   ├── config.py
│   ├── database.py
│   └── models_base.py
├── features/
│   ├── tasks/
│   │   ├── __init__.py
│   │   └── models.py
│   ├── notes/
│   │   ├── __init__.py
│   │   └── models.py
│   ├── chatbot/
│   │   ├── __init__.py
│   │   └── models.py
│   ├── schedule/
│   │   ├── __init__.py
│   │   └── models.py
│   ├── quiz/
│   │   ├── __init__.py
│   │   └── models.py
│   ├── leaderboard/
│   │   └── __init__.py
│   └── stats/
│       └── __init__.py
├── backend/
│   ├── __init__.py
│   └── routers/
│       └── __init__.py
├── frontend/
│   └── .gitkeep
├── scripts/
│   ├── seed.py
│   └── reset_db.py
├── models/
│   └── .gitkeep
├── data/
│   └── .gitkeep
├── alembic/
│   └── versions/
│       └── .gitkeep
├── .env.example
├── .gitignore
├── alembic.ini
└── requirements.txt
```

---

### 2. `.gitignore`

```
# Python
.venv/
__pycache__/
*.pyc
*.pyo
*.pyd
.pytest_cache/
*.egg-info/
dist/
build/

# Data — never commit
data/
*.db
*.db-shm
*.db-wal

# Models — too large
models/*.gguf
models/scibert/

# Secrets
.env

# Node
frontend/node_modules/
frontend/dist/
frontend/.tauri/

# Tauri
frontend/src-tauri/target/

# OS
.DS_Store
Thumbs.db
```

---

### 3. `requirements.txt`

```
fastapi>=0.110.0
uvicorn[standard]>=0.29.0
python-multipart>=0.0.9
sqlalchemy>=2.0.0
alembic>=1.13.0
pydantic>=2.0.0
pydantic-settings>=2.0.0
groq>=0.5.0
sentence-transformers>=2.7.0
numpy>=1.26.0
pdfplumber>=0.11.0
python-docx>=1.1.0
python-dotenv>=1.0.0
httpx>=0.27.0
llama-cpp-python>=0.2.0
```

---

### 4. `.env.example`

```
# TaskArena v2 — copy to .env and fill in values

GROQ_API_KEY=

AI_PROVIDER=groq
GROQ_MODEL=llama-3.3-70b-versatile
LOCAL_MODEL_PATH=models/qwen2.5-7b-instruct-q4_k_m.gguf
LOCAL_N_CTX=4096
LOCAL_N_GPU_LAYERS=-1
LOCAL_N_THREADS=8
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b

DB_PATH=data/taskarena.db
API_PORT=8765
API_HOST=127.0.0.1
DEBUG=false

EMBEDDING_MODEL=allenai/scibert_scivocab_uncased
EMBEDDING_CACHE_DIR=models/scibert
RAG_TOP_K=5
CHUNK_SIZE=512
CHUNK_OVERLAP=64
```

---

### 5. `shared/config.py`

Use `pydantic-settings` to load all env vars. Expose a single `settings` object imported everywhere.

```python
from pydantic_settings import BaseSettings
from pathlib import Path

ROOT = Path(__file__).parent.parent

class Settings(BaseSettings):
    # Database
    db_path: str = str(ROOT / "data" / "taskarena.db")

    # API
    api_port: int = 8765
    api_host: str = "127.0.0.1"
    debug: bool = False

    # AI provider
    ai_provider: str = "groq"
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    local_model_path: str = str(ROOT / "models" / "qwen2.5-7b-instruct-q4_k_m.gguf")
    local_n_ctx: int = 4096
    local_n_gpu_layers: int = -1
    local_n_threads: int = 8
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b"

    # Embeddings
    embedding_model: str = "allenai/scibert_scivocab_uncased"
    embedding_cache_dir: str = str(ROOT / "models" / "scibert")
    rag_top_k: int = 5
    chunk_size: int = 512
    chunk_overlap: int = 64

    @property
    def db_url(self) -> str:
        return f"sqlite:///{self.db_path}"

    @property
    def root(self) -> Path:
        return ROOT

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

settings = Settings()
```

---

### 6. `shared/models_base.py`

```python
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass
```

---

### 7. `shared/database.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from shared.config import settings

engine = create_engine(
    settings.db_url,
    connect_args={"check_same_thread": False},
    echo=settings.debug,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

def get_db():
    """Dependency for both CLI apps and FastAPI routes."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

### 8. SQLAlchemy models — one `models.py` per feature

Write all models using `shared.models_base.Base`. Every model must have proper types, relationships, and defaults. Use `datetime.utcnow` for timestamps.

**`features/tasks/models.py`**
- `Task`: id, user_id (FK→users), title, subject, type (CHECK: assignment/study/productivity), status (CHECK: pending/completed, default pending), deadline (Date nullable), points (int default 5), course_id (FK→courses nullable), created_at, completed_at (nullable)
- `XPLog`: id, user_id (FK→users), amount, reason, logged_at

**`features/notes/models.py`**
- `Course`: id, user_id (FK→users), name, code, color (default #3b82f6), created_at
- `Folder`: id, course_id (FK→courses CASCADE), name, order_index (default 0)
- `File`: id, folder_id (FK→folders CASCADE), name, path, size (nullable int), indexed (bool default False), indexed_at (nullable), created_at
- `FileChunk`: id, file_id (FK→files CASCADE), content, chunk_index (int), embedding (LargeBinary nullable)

**`features/chatbot/models.py`**
- `ChatConversation`: id, user_id (FK→users), title (nullable), context_course_id (FK→courses nullable), created_at, updated_at
- `ChatMessage`: id, conversation_id (FK→chat_conversations CASCADE), role (CHECK: user/assistant), content, sources (Text nullable — stores JSON), model_used (nullable), created_at

**`features/schedule/models.py`**
- `ScheduleEvent`: id, user_id (FK→users), title, type (CHECK: study/assignment/exam/break/other), course_id (FK→courses nullable), date (Date), start_time (Time nullable), duration (int nullable — minutes), notes (nullable), ai_suggested (bool default False), created_at

**`features/quiz/models.py`**
- `Quiz`: id, course_id (FK→courses), title, difficulty (CHECK: easy/medium/hard), created_at
- `QuizQuestion`: id, quiz_id (FK→quizzes CASCADE), question, option_a, option_b, option_c, option_d, correct (CHECK: a/b/c/d), explanation (nullable), order_index (int nullable)
- `QuizAttempt`: id, quiz_id (FK→quizzes), user_id (FK→users), score (Float nullable), answers (Text nullable — JSON), time_taken (int nullable — seconds), taken_at

There is also a **`User`** model that every feature references. Put it in `shared/` since it is used everywhere:

**`shared/user_model.py`**
- `User`: id, name, email (unique nullable), level (int default 1), xp (int default 0), streak (int default 0), last_active (Date nullable), created_at

---

### 9. `alembic.ini`

Configure to point at `data/taskarena.db`. The `script_location` should be `alembic`.

---

### 10. `alembic/env.py`

Configure to:
- Import `shared.config.settings` and use `settings.db_url` as the database URL
- Import `shared.models_base.Base` as the `target_metadata`
- Import ALL models so Alembic can see them:
  ```python
  import shared.user_model          # noqa
  import features.tasks.models      # noqa
  import features.notes.models      # noqa
  import features.chatbot.models    # noqa
  import features.schedule.models   # noqa
  import features.quiz.models       # noqa
  ```

---

### 11. `scripts/seed.py`

Create sample data for development. Running this script should:

1. Create the `data/` directory if it doesn't exist
2. Create a `User` with: name="Raghav Sethi", email="raghav@taskarena.com", level=14, xp=2340, streak=7
3. Create 3 `Course` records: Physics 201 (blue), Organic Chemistry (green), Statistics (violet)
4. Create 1 `Folder` per course named "Chapter 1 — Foundations"
5. Create 5 `Task` records:
   - "Essay on Renaissance Art" — assignment, Art History, due in 3 days, 15 pts
   - "Problem Set 3 — Mechanics" — assignment, Physics, due in 5 days, 20 pts
   - "Review Chapter 7 Thermodynamics" — study, Physics, due tomorrow, 10 pts
   - "French Vocab Flashcards" — study, French, due in 4 days, 8 pts — status=completed
   - "Organize semester notes" — productivity, Admin, due in 2 days, 5 pts
6. Create 3 `ScheduleEvent` records for today and tomorrow:
   - Today 09:00 — "Study: Thermodynamics Ch.7" — study, 90min
   - Today 14:00 — "Essay draft" — assignment, 60min
   - Tomorrow 10:00 — "Physics Midterm" — exam, 120min
7. Create 1 `ChatConversation` titled "Newtonian Mechanics" linked to Physics course
8. Create 2 `ChatMessage` records for that conversation (one user, one assistant)
9. Add 3 `XPLog` entries for the completed tasks
10. Print a summary of what was created

Use `SessionLocal` from `shared.database`. Wrap everything in a try/except and print clear success/error messages.

---

### 12. `scripts/reset_db.py`

```python
"""
Drops all tables and recreates them. Dev use only.
Run: python scripts/reset_db.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from shared.models_base import Base
from shared.database import engine
import shared.user_model          # noqa — must import to register with Base
import features.tasks.models      # noqa
import features.notes.models      # noqa
import features.chatbot.models    # noqa
import features.schedule.models   # noqa
import features.quiz.models       # noqa

if __name__ == "__main__":
    print("⚠️  Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("✓  Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("✓  Done. Run scripts/seed.py to populate with test data.")
```

---

## Verification steps

After building everything, run these commands and confirm each one succeeds:

```bash
# 1. Create virtual environment and install deps
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 2. Copy env file
cp .env.example .env

# 3. Create the DB via Alembic
alembic upgrade head
# Expected: "Running upgrade -> xxxx, initial"

# 4. Verify tables exist
sqlite3 data/taskarena.db ".tables"
# Expected: chat_conversations  chat_messages  courses  file_chunks
#           files  folders  quiz_attempts  quiz_questions  quizzes
#           schedule_events  tasks  users  xp_log

# 5. Run seed script
python scripts/seed.py
# Expected: summary of created records, no errors

# 6. Verify seed data
sqlite3 data/taskarena.db "SELECT name, xp, streak FROM users;"
# Expected: Raghav Sethi|2340|7

sqlite3 data/taskarena.db "SELECT COUNT(*) FROM tasks;"
# Expected: 5

sqlite3 data/taskarena.db "SELECT title, date, start_time FROM schedule_events;"
# Expected: 3 rows
```

---

## Rules to follow while building

1. Every Python file that imports from `shared/` or `features/` needs `sys.path.insert(0, ...)` at the top if run as a script, OR the project must be run from the root directory.
2. All models import `Base` from `shared.models_base` — never define a new `Base`.
3. All models import `User` relationships from `shared.user_model` — never redefine the User model.
4. Use `String` not `Text` for short fields (name, title, code). Use `Text` only for long content (message content, notes, JSON blobs).
5. All `created_at` columns: `Column(DateTime, default=datetime.utcnow, nullable=False)`
6. Foreign key cascade deletes must be set at the SQLAlchemy level: `ondelete="CASCADE"` on the ForeignKey, AND `cascade="all, delete-orphan"` on the relationship.
7. Do not use `autoincrement=True` — SQLite does this automatically for INTEGER PRIMARY KEY.
8. Do not create any `service.py`, `cli.py`, `router.py`, or frontend files. Phase 0 is models + shared layer + DB + scripts only.

---

## Done when

- [ ] All folders and files exist
- [ ] `pip install -r requirements.txt` succeeds
- [ ] `alembic upgrade head` creates `data/taskarena.db` with all 13 tables
- [ ] `python scripts/seed.py` runs without errors and prints a creation summary
- [ ] `python scripts/reset_db.py` drops and recreates all tables without errors
- [ ] SQLite confirms seed data is present
