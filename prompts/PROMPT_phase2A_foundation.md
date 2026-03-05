# TaskArena v2 — Phase 2A: Backend Foundation
# Depends on: Phase 1 gate PASSED
# Goal: FastAPI app skeleton, middleware, dependencies, shared utilities
#       No routers yet — foundation only.

---

## PROMPT

---

You are continuing to build TaskArena v2. All Phase 1 CLIs are complete and the gate check has passed. Every service.py is proven to work.

Before writing any code read:
1. `docs/ARCHITECTURE.md` — the backend assembly section and router pattern
2. `docs/API.md` — the full API reference you are implementing
3. `docs/CONVENTIONS.md` — API conventions, URL patterns, response formats

Your job is **Phase 2A only** — the backend foundation. No routers yet. Build exactly these files:

```
backend/__init__.py
backend/dependencies.py
backend/middleware.py
backend/main.py
```

Then verify the server starts and the health check works. That's it.

---

## `backend/dependencies.py`

Shared FastAPI dependencies used by every router.

```python
from typing import Generator
from sqlalchemy.orm import Session
from shared.database import SessionLocal

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency — yields a DB session, always closes it.
    Usage in routers: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Hardcoded for v2 — single user, no auth yet
# When auth is added in v2.1 this becomes a real JWT dependency
CURRENT_USER_ID = 1

def get_current_user_id() -> int:
    return CURRENT_USER_ID
```

---

## `backend/middleware.py`

```python
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import time

logger = logging.getLogger("taskarena")

def setup_middleware(app: FastAPI) -> None:
    """Register all middleware on the app. Called once in main.py."""

    # CORS — allow Tauri frontend (and localhost for dev)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:1420",   # Tauri dev server default port
            "http://localhost:5173",   # Vite dev server
            "tauri://localhost",       # Tauri production
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Request timing + logging
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration = (time.perf_counter() - start) * 1000
        logger.debug(f"{request.method} {request.url.path} → {response.status_code} ({duration:.1f}ms)")
        return response

    # Global exception handler — never expose stack traces to client
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error. Check server logs."}
        )

    # ValueError → 404 (resource not found)
    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    # PermissionError → 400 (invalid state transition e.g. completing already-completed task)
    @app.exception_handler(PermissionError)
    async def permission_error_handler(request: Request, exc: PermissionError):
        return JSONResponse(status_code=400, content={"detail": str(exc)})
```

---

## `backend/main.py`

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager
from shared.config import settings
from shared.database import engine
from backend.middleware import setup_middleware
import logging

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("taskarena")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("TaskArena backend starting...")
    logger.info(f"Database: {settings.db_path}")
    logger.info(f"AI provider: {settings.ai_provider}")

    # Verify DB file exists
    from pathlib import Path
    if not Path(settings.db_path).exists():
        logger.warning(f"Database not found at {settings.db_path} — run: alembic upgrade head")

    yield

    logger.info("TaskArena backend shutting down.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="TaskArena v2",
        description="Local API for TaskArena desktop app",
        version="2.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    setup_middleware(app)

    # ── Health check (always available, no DB needed) ──
    @app.get("/health", tags=["system"])
    def health():
        return {"status": "ok", "version": "2.0.0"}

    # ── API info ──
    @app.get("/api", tags=["system"])
    def api_info():
        from pathlib import Path
        db_exists = Path(settings.db_path).exists()
        return {
            "status": "ok",
            "db_connected": db_exists,
            "ai_provider": settings.ai_provider,
            "groq_key_set": bool(settings.groq_api_key),
            "local_model_exists": Path(settings.local_model_path).exists(),
        }

    # Routers registered here in Phase 2B
    # app.include_router(tasks_router, prefix="/api")
    # app.include_router(chatbot_router, prefix="/api")
    # ...

    return app


app = create_app()
```

---

## Verification

```bash
# Start the server
uvicorn backend.main:app --reload --port 8765 --host 127.0.0.1

# In a second terminal (venv active):

# 1. Health check
curl http://localhost:8765/health
# Expected: {"status":"ok","version":"2.0.0"}

# 2. API info
curl http://localhost:8765/api
# Expected: {"status":"ok","db_connected":true,"ai_provider":"groq",...}

# 3. Docs page loads
# Open in browser: http://localhost:8765/docs
# Expected: FastAPI Swagger UI with "TaskArena v2" title
# Only /health and /api endpoints visible — no routers yet, that's correct

# 4. 404 on unknown route
curl http://localhost:8765/api/tasks
# Expected: {"detail":"Not Found"} — routers not added yet, this is correct

# 5. Server logs show startup messages
# Expected in terminal:
# INFO  taskarena: TaskArena backend starting...
# INFO  taskarena: Database: data/taskarena.db
# INFO  taskarena: AI provider: groq
```

---

## Rules

1. Do not add any routers yet — Phase 2B does that
2. Do not import any feature service in main.py yet
3. The `ValueError` → 404 and `PermissionError` → 400 exception handlers are global — routers never need to catch these manually, they just let exceptions propagate
4. `CURRENT_USER_ID = 1` is intentional — auth comes in v2.1
5. Do not modify any file outside `backend/`

---

## Done when

- [ ] `uvicorn backend.main:app --reload --port 8765` starts without errors
- [ ] `GET /health` returns 200 with `{"status":"ok"}`
- [ ] `GET /api` returns db_connected, ai_provider, groq_key_set
- [ ] `http://localhost:8765/docs` loads Swagger UI
- [ ] Startup log shows database path and AI provider
