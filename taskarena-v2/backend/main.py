import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.middleware import setup_middleware
from backend.routers import (
    chatbot,
    leaderboard,
    notes,
    profile,
    quiz,
    schedule,
    stats,
    tasks,
)
from shared.config import settings
from shared.database import engine

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
        logger.warning(
            f"Database not found at {settings.db_path} — run: alembic upgrade head"
        )

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

    app.include_router(tasks.router, prefix="/api")
    app.include_router(notes.router, prefix="/api")
    app.include_router(chatbot.router, prefix="/api")
    app.include_router(schedule.router, prefix="/api")
    app.include_router(quiz.router, prefix="/api")
    app.include_router(leaderboard.router, prefix="/api")
    app.include_router(stats.router, prefix="/api")
    app.include_router(profile.router, prefix="/api")

    return app


app = create_app()
