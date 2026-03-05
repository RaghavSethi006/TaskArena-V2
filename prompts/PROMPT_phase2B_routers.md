# TaskArena v2 — Phase 2B: Routers
# Depends on: Phase 2A complete (server starts, /health works)
# Goal: All 8 routers wired up, every endpoint returns real data,
#       SSE streaming works for chatbot and quiz generation.

---

## PROMPT

---

You are continuing to build TaskArena v2. Phase 2A is complete — the FastAPI server starts and the health check works.

Before writing any code read:
1. `docs/API.md` — every endpoint you are implementing, exact URLs, request bodies, response shapes
2. `docs/CONVENTIONS.md` — API conventions, error handling pattern
3. `docs/ARCHITECTURE.md` — the router pattern (routers are thin wrappers — all logic stays in service.py)

Your job is **Phase 2B** — all routers. Build these files:

```
backend/routers/__init__.py
backend/routers/tasks.py
backend/routers/notes.py
backend/routers/chatbot.py
backend/routers/schedule.py
backend/routers/quiz.py
backend/routers/leaderboard.py
backend/routers/stats.py
backend/routers/profile.py
```

Then register all routers in `backend/main.py`.

---

## The Router Pattern — Read This First

Every router is a thin HTTP wrapper. It does three things only:
1. Define the route and validate the request with Pydantic
2. Call the service
3. Return the result

```python
# ✅ CORRECT — thin wrapper
@router.patch("/{task_id}/complete")
def complete_task(task_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    task, xp = TaskService(db).complete_task(task_id)
    return {"task": task, "xp_earned": xp}

# ❌ WRONG — logic in router
@router.patch("/{task_id}/complete")
def complete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).get(task_id)      # no direct DB queries in routers
    if task.status == "completed":          # no business logic in routers
        raise HTTPException(400, "...")
    task.status = "completed"
    db.commit()
    return task
```

Errors propagate automatically — `ValueError` becomes 404, `PermissionError` becomes 400, everything else becomes 500. The global handlers in middleware.py catch them. **Routers never need try/except.**

---

## `backend/routers/tasks.py`

```python
router = APIRouter(prefix="/tasks", tags=["tasks"])

GET    /tasks              → TaskService.get_tasks(user_id, type, status)
POST   /tasks              → TaskService.create_task(user_id, body)
GET    /tasks/{id}         → TaskService.get_task(id)
PATCH  /tasks/{id}         → TaskService.update_task(id, body)
DELETE /tasks/{id}         → TaskService.delete_task(id) → 204
POST   /tasks/{id}/complete → TaskService.complete_task(id)
                              returns {"task": TaskOut, "xp_earned": int,
                                       "new_total_xp": int, "leveled_up": bool}
GET    /tasks/xp-log       → TaskService.get_xp_log(user_id)
```

**Query params for GET /tasks:**
```python
type:   Optional[str] = Query(None)
status: Optional[str] = Query(None)
```

**complete_task response** needs `new_total_xp` and `leveled_up` — load the user after completion:
```python
task, xp = TaskService(db).complete_task(task_id)
user = db.query(User).get(user_id)
return {
    "task": task,
    "xp_earned": xp,
    "new_total_xp": user.xp,
    "leveled_up": False,  # TODO: track in service — fine for now
}
```

---

## `backend/routers/notes.py`

```python
router = APIRouter(prefix="/notes", tags=["notes"])

# Courses
GET    /notes/courses              → NotesService.get_courses(user_id)
POST   /notes/courses              → NotesService.create_course(user_id, body)
GET    /notes/courses/{id}         → NotesService.get_course(id)
DELETE /notes/courses/{id}         → NotesService.delete_course(id) → 204

# Folders
GET    /notes/courses/{id}/folders → NotesService.get_folders(course_id)
POST   /notes/courses/{id}/folders → NotesService.create_folder(course_id, name)
DELETE /notes/folders/{id}         → NotesService.delete_folder(id) → 204

# Files
GET    /notes/folders/{id}/files   → NotesService.get_files(folder_id)
DELETE /notes/files/{id}           → NotesService.remove_file(id) → 204
POST   /notes/files/{id}/index     → NotesService.index_file(id)
                                      returns {"file_id": int, "chunks_created": int}

# File upload — accepts file path (JSON body) OR multipart form
POST   /notes/folders/{id}/files
```

**File add endpoint — two approaches, support both:**

```python
class FileAddBody(BaseModel):
    name: str
    path: str  # absolute path on disk

@router.post("/folders/{folder_id}/files", status_code=201)
async def add_file(
    folder_id: int,
    body: FileAddBody,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    file = NotesService(db).add_file(folder_id, body.name, body.path)
    return file
```

The frontend in Phase 3 will use Tauri's file picker to get the path, then send it as JSON. Multipart upload is not needed — the file is always local.

**Search endpoint:**
```python
GET /notes/courses/{id}/search?q=newton%27s+third+law&folder_id=2&file_id=5

# folder_id and file_id are optional query params
# Maps to NotesService.search(query, course_id, folder_id, file_id, top_k)
# Returns list of SearchResult
```

---

## `backend/routers/chatbot.py`

This is the most complex router. The streaming endpoint is the core feature.

```python
router = APIRouter(prefix="/chat", tags=["chatbot"])

GET    /chat/conversations         → ChatService.get_conversations(user_id)
POST   /chat/conversations         → ChatService.create_conversation(user_id, ...)
GET    /chat/conversations/{id}    → ChatService.get_conversation(id)
DELETE /chat/conversations/{id}    → ChatService.delete_conversation(id) → 204
GET    /chat/conversations/{id}/messages → ChatService.get_messages(id)
POST   /chat/conversations/{id}/title    → ChatService.auto_title(id, provider)
PATCH  /chat/conversations/{id}/context → ChatService.update_context(id, ...)
```

**SSE streaming endpoint — implement exactly like this:**

```python
from fastapi.responses import StreamingResponse
from fastapi import Request
import asyncio
import json

class MessageRequest(BaseModel):
    content: str
    provider: str = "groq"
    model: Optional[str] = None

@router.post("/conversations/{conv_id}/messages")
async def send_message(
    conv_id: int,
    body: MessageRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    svc = ChatService(db)

    async def event_stream():
        full_response = ""
        sources = []
        try:
            async for token in svc.stream_response(
                conv_id=conv_id,
                user_content=body.content,
                provider=body.provider,
                model=body.model,
            ):
                # Check if client disconnected
                if await request.is_disconnected():
                    break

                if isinstance(token, dict):
                    # Final event from service — contains sources and message_id
                    sources = token.get("sources", [])
                    data = json.dumps({"done": True, "sources": sources})
                    yield f"data: {data}\n\n"
                else:
                    full_response += token
                    data = json.dumps({"token": token})
                    yield f"data: {data}\n\n"

        except Exception as e:
            error_data = json.dumps({"error": str(e)})
            yield f"data: {error_data}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # disable nginx buffering if proxied
        },
    )
```

**Important — update `ChatService.stream_response()`** to yield a final dict after the stream ends:

```python
# At the very end of stream_response(), after saving the assistant message:
yield {"done": True, "sources": sources, "message_id": saved_message.id}
```

This is how the frontend knows streaming is complete and can show the sources.

---

## `backend/routers/schedule.py`

```python
router = APIRouter(prefix="/schedule", tags=["schedule"])

GET    /schedule              → ScheduleService.get_events(user_id, from, to)
POST   /schedule              → ScheduleService.create_event(user_id, body) → 201
PATCH  /schedule/{id}         → ScheduleService.update_event(id, body)
DELETE /schedule/{id}         → ScheduleService.delete_event(id) → 204
GET    /schedule/week         → ScheduleService.get_week_events(user_id)
GET    /schedule/month        → ScheduleService.get_month_events(user_id, year, month)
```

**Query params for GET /schedule:**
```python
from_date: date = Query(..., alias="from")
to_date:   date = Query(..., alias="to")
```

**AI suggestions — async endpoints:**
```python
@router.get("/schedule/suggestions")
async def get_suggestions(
    provider: str = Query("groq"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    suggestions = await ScheduleService(db).get_ai_suggestions(user_id, provider)
    return {"suggestions": suggestions}

@router.post("/schedule/suggestions/accept", status_code=201)
def accept_suggestion(
    body: SuggestionAcceptBody,  # title, type, date, start_time, duration, course_id
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    event = ScheduleService(db).accept_suggestion(user_id, body.dict())
    return event
```

---

## `backend/routers/quiz.py`

```python
router = APIRouter(prefix="/quizzes", tags=["quiz"])

GET    /quizzes                → QuizService.get_quizzes(course_id optional)
GET    /quizzes/{id}           → QuizService.get_quiz(id) — returns {quiz, questions}
DELETE /quizzes/{id}           → QuizService.delete_quiz(id) → 204
GET    /quizzes/{id}/attempts  → QuizService.get_attempts(id, user_id)
POST   /quizzes/{id}/attempts  → QuizService.submit_attempt(id, user_id, answers, time_taken)
```

**Quiz generation — SSE streaming with progress steps:**

```python
class GenerateRequest(BaseModel):
    course_id: int
    folder_id: Optional[int] = None
    n_questions: int = 10
    difficulty: str = "medium"
    provider: str = "groq"

@router.post("/quizzes/generate")
async def generate_quiz(body: GenerateRequest, db: Session = Depends(get_db)):

    async def progress_stream():
        quiz_result = {"quiz_id": None}

        async def on_progress(step: str, current: int, total: int):
            data = json.dumps({"step": step, "progress": current, "total": total})
            # Can't yield from callback — use a queue
            await queue.put(data)

        queue = asyncio.Queue()

        async def run_generation():
            try:
                quiz = await QuizService(db).generate_quiz(
                    course_id=body.course_id,
                    n_questions=body.n_questions,
                    difficulty=body.difficulty,
                    folder_id=body.folder_id,
                    provider=body.provider,
                    progress_callback=on_progress,
                )
                quiz_result["quiz_id"] = quiz.id
                await queue.put(None)  # sentinel — generation done
            except Exception as e:
                await queue.put(json.dumps({"error": str(e)}))
                await queue.put(None)

        asyncio.create_task(run_generation())

        while True:
            item = await queue.get()
            if item is None:
                break
            yield f"data: {item}\n\n"

        if quiz_result["quiz_id"]:
            data = json.dumps({"done": True, "quiz_id": quiz_result["quiz_id"]})
            yield f"data: {data}\n\n"

    return StreamingResponse(
        progress_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

---

## `backend/routers/leaderboard.py`

```python
router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])

GET /leaderboard          → LeaderboardService.get_rankings(limit)
                            query param: limit (default 10), period ("alltime"|"weekly")
GET /leaderboard/me       → LeaderboardService.get_user_stats(user_id)
```

```python
@router.get("/leaderboard")
def get_leaderboard(
    limit: int = Query(10),
    period: str = Query("alltime"),
    db: Session = Depends(get_db),
):
    svc = LeaderboardService(db)
    if period == "weekly":
        return svc.get_weekly_rankings(limit)
    return svc.get_rankings(limit)
```

---

## `backend/routers/stats.py`

```python
router = APIRouter(prefix="/stats", tags=["stats"])

GET /stats/overview      → StatsService.get_overview(user_id)
GET /stats/activity      → StatsService.get_daily_activity(user_id, days)
                           query param: days (default 7, max 90)
GET /stats/breakdown     → StatsService.get_task_breakdown(user_id)
GET /stats/quiz          → StatsService.get_quiz_performance(user_id)
```

---

## `backend/routers/profile.py`

```python
router = APIRouter(prefix="/profile", tags=["profile"])

GET   /profile            → return User (from db, user_id=1)
PATCH /profile            → update name, email
GET   /profile/ai-config  → return current AI config from settings + availability check
PATCH /profile/ai-config  → update .env values at runtime (in-memory only for now)
```

**AI config endpoint:**
```python
@router.get("/profile/ai-config")
def get_ai_config():
    from pathlib import Path
    import httpx

    ollama_available = False
    try:
        r = httpx.get(f"{settings.ollama_base_url}/api/tags", timeout=1.0)
        ollama_available = r.status_code == 200
    except Exception:
        pass

    return {
        "provider":            settings.ai_provider,
        "model":               settings.groq_model,
        "groq_key_set":        bool(settings.groq_api_key),
        "local_model_exists":  Path(settings.local_model_path).exists(),
        "ollama_available":    ollama_available,
        "ollama_url":          settings.ollama_base_url,
    }
```

---

## Register all routers in `backend/main.py`

Replace the commented-out router section with:

```python
from backend.routers import tasks, notes, chatbot, schedule, quiz, leaderboard, stats, profile

app.include_router(tasks.router,       prefix="/api")
app.include_router(notes.router,       prefix="/api")
app.include_router(chatbot.router,     prefix="/api")
app.include_router(schedule.router,    prefix="/api")
app.include_router(quiz.router,        prefix="/api")
app.include_router(leaderboard.router, prefix="/api")
app.include_router(stats.router,       prefix="/api")
app.include_router(profile.router,     prefix="/api")
```

---

## Rules

1. Routers never query the DB directly — always through a service
2. Routers never contain business logic — only HTTP wiring
3. No try/except in routers — let errors propagate to global handlers
4. All async endpoints (suggestions, streaming) must be `async def`
5. All sync endpoints must be plain `def` — do not make everything async
6. Do not modify any service.py file — if a router needs something the service doesn't provide, add it to the service first, then call it from the router
7. SSE responses must include `X-Accel-Buffering: no` header

---

## Verification — test every endpoint

Start the server first:
```bash
uvicorn backend.main:app --reload --port 8765
```

Open `http://localhost:8765/docs` — all 8 router groups should appear.

**Test with curl (run each one, verify expected output):**

```bash
# Tasks
curl http://localhost:8765/api/tasks
# → JSON array of 5 tasks from seed data

curl -X POST http://localhost:8765/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Task","type":"study","points":10}'
# → 201 with new task object

curl -X POST http://localhost:8765/api/tasks/1/complete
# → {"task":{...},"xp_earned":15,"new_total_xp":...}

# Notes
curl http://localhost:8765/api/notes/courses
# → JSON array of courses

# Stats
curl http://localhost:8765/api/stats/overview
# → overview object with tasks_completed, xp, streak etc

# Leaderboard
curl http://localhost:8765/api/leaderboard
# → array with Raghav Sethi at rank 1

# Profile AI config
curl http://localhost:8765/api/profile/ai-config
# → provider, groq_key_set, local_model_exists, ollama_available

# Schedule suggestions (async — may take a few seconds)
curl http://localhost:8765/api/schedule/suggestions?provider=groq
# → {"suggestions": [...]}

# SSE streaming — must see tokens appear one by one in terminal
curl -N -X POST http://localhost:8765/api/chat/conversations/1/messages \
  -H "Content-Type: application/json" \
  -d '{"content":"hello","provider":"groq"}'
# → data: {"token":"Hello"}
#   data: {"token":" there"}
#   ...
#   data: {"done":true,"sources":[...]}

# Quiz generation SSE
curl -N -X POST http://localhost:8765/api/quizzes/generate \
  -H "Content-Type: application/json" \
  -d '{"course_id":1,"n_questions":5,"difficulty":"easy","provider":"groq"}'
# → data: {"step":"Searching course materials","progress":1,"total":4}
#   data: {"step":"Generating questions with AI","progress":3,"total":4}
#   data: {"done":true,"quiz_id":2}
```

**Verify error handling:**
```bash
# 404 on missing resource
curl http://localhost:8765/api/tasks/99999
# → {"detail":"Task with id 99999 not found"}

# 422 on bad payload
curl -X POST http://localhost:8765/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"No type field"}'
# → {"detail":[{"loc":["body","type"],"msg":"Field required",...}]}

# 400 on invalid state
curl -X POST http://localhost:8765/api/tasks/1/complete
# (complete an already-completed task)
# → {"detail":"Task is already completed"}
```
