# TaskArena v2 — Conventions

## Python Conventions

### File naming
- All lowercase, underscores: `ai_service.py`, `rag_service.py`
- Models: `models.py` per feature
- One class per service file

### Class naming
- Services: `TaskService`, `ChatService`, `QuizService`
- AI providers: `LocalAI`, `GroqAI`, `OllamaAI`
- Schemas: `TaskCreate`, `TaskUpdate`, `TaskOut`

### Service class pattern — always this structure
```python
class FeatureService:
    def __init__(self, db: Session):
        self.db = db

    # Public methods — called by CLI and routers
    def get_things(self, ...) -> list[Thing]: ...
    def create_thing(self, ...) -> Thing: ...
    def update_thing(self, ...) -> Thing: ...
    def delete_thing(self, ...) -> None: ...

    # Private helpers — only called internally
    def _helper(self, ...) -> ...: ...
```

### What service.py NEVER contains
```python
# ❌ Never import FastAPI in service.py
from fastapi import HTTPException, Depends

# ❌ Never print or format output in service.py
print("Task completed!")
click.echo(...)

# ❌ Never import from another feature's service
from features.tasks.service import TaskService  # in chatbot/service.py — NO

# ❌ Never handle HTTP status codes
raise HTTPException(404, "not found")  # this belongs in the router
```

### Error handling in services
```python
# ✅ Raise plain Python exceptions
def get_task(self, task_id: int) -> Task:
    task = self.db.query(Task).get(task_id)
    if not task:
        raise ValueError(f"Task with id {task_id} not found")
    return task

# Router catches it and converts to HTTP error:
@router.get("/{task_id}")
def get_task(task_id: int, db = Depends(get_db)):
    try:
        return TaskService(db).get_task(task_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
```

### Pydantic schemas pattern
```python
# Always three schemas per resource:
class TaskCreate(BaseModel):     # what the client sends to create
    title: str
    type: Literal["assignment", "study", "productivity"]
    deadline: date | None = None
    points: int = 5

class TaskUpdate(BaseModel):     # what the client sends to update (all optional)
    title: str | None = None
    status: Literal["pending", "completed"] | None = None
    deadline: date | None = None

class TaskOut(BaseModel):        # what the API returns
    id: int
    title: str
    type: str
    status: str
    deadline: date | None
    points: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)  # allow ORM → Pydantic
```

### sys.path in CLI files
Every cli.py needs this at the top to make shared/ importable:
```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
```

---

## TypeScript / React Conventions

### File and component naming
- Pages: `PascalCase` — `ChatbotPage.tsx`, `SchedulePage.tsx`
- Hooks: `camelCase` with `use` prefix — `useChat.ts`, `useTasks.ts`
- Components: `PascalCase` — `TaskCard.tsx`, `MessageBubble.tsx`
- Lib files: `camelCase` — `api.ts`, `utils.ts`, `types.ts`

### Types — always defined, never any
```typescript
// ✅ All types in lib/types.ts
export interface Task {
  id: number;
  title: string;
  type: "assignment" | "study" | "productivity";
  status: "pending" | "completed";
  deadline: string | null;
  points: number;
  subject: string | null;
}

// ✅ Import from types.ts
import type { Task } from "@/lib/types";

// ❌ Never use any
const task: any = ...;     // banned
const data: any[] = ...;   // banned
```

### API calls — only in lib/api.ts
```typescript
// ✅ api.ts is the only file that calls fetch()
// In a component or hook:
const tasks = await api.tasks.list({ status: "pending" });

// ❌ Never call fetch() directly in a component or hook
const response = await fetch("http://localhost:8765/api/tasks"); // NO
```

### State management rules
```typescript
// Server data (from API) → TanStack Query
const { data: tasks } = useQuery({
  queryKey: ["tasks", { status: "pending" }],
  queryFn: () => api.tasks.list({ status: "pending" }),
});

// Global UI state → Zustand (useAppStore)
const { sidebarCollapsed, toggleSidebar } = useAppStore();

// Form inputs, modals, toggles → useState
const [modalOpen, setModalOpen] = useState(false);

// ❌ Never put API data in Zustand
// ❌ Never put UI state in TanStack Query
```

### Component structure
```typescript
// Always this order inside a component:
export function TaskCard({ task }: { task: Task }) {
  // 1. Hooks (query, mutation, store, state)
  const completeTask = useMutation({ ... });
  const [expanded, setExpanded] = useState(false);

  // 2. Derived values
  const isOverdue = task.deadline && new Date(task.deadline) < new Date();

  // 3. Handlers
  const handleComplete = () => completeTask.mutate(task.id);

  // 4. JSX return
  return (
    <Card>...</Card>
  );
}
```

### Styling rules
```typescript
// ✅ Tailwind classes only
<div className="flex items-center gap-3 p-4 rounded-lg bg-zinc-900 border border-zinc-800">

// ✅ cn() for conditional classes (from lib/utils.ts)
<div className={cn("rounded-lg p-4", isActive && "bg-blue-500/10 border-blue-500/30")}>

// ❌ No inline styles
<div style={{ padding: "16px", background: "#09090b" }}>  // NEVER

// ❌ No CSS modules or separate CSS files for component styles
// ❌ No styled-components
```

### No mock data in components
```typescript
// ❌ No hardcoded arrays in page files
const tasks = [
  { id: 1, title: "Essay draft", ... },
  { id: 2, title: "Problem set", ... },
];

// ✅ Everything from TanStack Query
const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: api.tasks.list });
```

---

## API Conventions

### URL pattern
```
GET    /api/{resource}           → list
POST   /api/{resource}           → create
GET    /api/{resource}/{id}      → get one
PATCH  /api/{resource}/{id}      → update (partial)
DELETE /api/{resource}/{id}      → delete
POST   /api/{resource}/{id}/{action}  → special action e.g. /tasks/1/complete
```

### Response format
```python
# Lists return plain arrays
[{ "id": 1, "title": "..." }, ...]

# Single items return plain objects
{ "id": 1, "title": "..." }

# Actions return the updated resource + metadata
{ "task": {...}, "xp_earned": 15 }

# Errors (auto-handled by FastAPI)
{ "detail": "Task with id 99 not found" }
```

### SSE format (streaming)
```
data: {"token": "Hello"}\n\n
data: {"token": " there"}\n\n
data: {"token": "!"}\n\n
data: {"done": true, "sources": ["Physics Ch4.pdf"]}\n\n
```

---

## Git Conventions

### Commit message format
```
feat: add quiz generation CLI
fix: streaming stops mid-response when context is empty
chore: add sentence-transformers to requirements.txt
docs: update AI_GUIDE with Ollama setup steps
refactor: extract _award_xp into shared helper
test: verify RAG returns correct top-k chunks
```

### Branch naming
```
feature/chatbot-streaming
feature/schedule-ai-suggestions
fix/quiz-score-calculation
chore/setup-alembic
```

### .gitignore
```
# Python
.venv/
__pycache__/
*.pyc
*.pyo
.pytest_cache/

# Data — never commit
data/
*.db
*.db-shm
*.db-wal

# Models — too large for git
models/*.gguf
models/scibert/

# Secrets
.env

# Node
frontend/node_modules/
frontend/dist/

# Tauri build output
frontend/src-tauri/target/

# OS
.DS_Store
Thumbs.db
```

---

## Dev Environment Checklist

Before starting any session:
```bash
source .venv/bin/activate          # activate Python env
uvicorn backend.main:app --reload --port 8765 &   # start backend (Phase 2+)
cd frontend && npm run tauri dev   # start frontend (Phase 3+)
```

Useful commands:
```bash
# Check all tables exist
sqlite3 data/taskarena.db ".tables"

# Run a CLI feature directly
python features/tasks/cli.py

# Run a quick DB query
sqlite3 data/taskarena.db "SELECT * FROM users;"

# Check Groq key is set
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print(os.environ.get('GROQ_API_KEY', 'NOT SET'))"

# Check local model is present
ls -lh models/

# Tail backend logs
uvicorn backend.main:app --reload --port 8765 --log-level debug
```
