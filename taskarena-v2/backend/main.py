import os
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI

from backend.middleware import setup_middleware
from backend.routers import (
    chatbot,
    leaderboard,
    notes,
    profile,
    quiz,
    schedule,
    schedule_template,
    stats,
    study_materials,
    tasks,
)
from shared.config import settings
from shared.database import SessionLocal
from shared.user_model import User

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

logger = logging.getLogger("taskarena")


def ensure_default_user() -> None:
    with SessionLocal() as db:
        user = db.get(User, 1)
        if user is None:
            db.add(User(id=1, name="Student"))
            db.commit()
            logger.info("Created default local user")


def run_migrations_if_needed() -> None:
    db_path = Path(settings.db_path)
    if not db_path.exists():
        logger.warning(f"Database not found at {settings.db_path} — running migrations")

    alembic_ini = settings.resource_root / "alembic.ini"
    alembic_dir = settings.resource_root / "alembic"
    if not alembic_ini.exists() or not alembic_dir.exists():
        logger.warning("Migrations skipped: alembic resources not found")
        return

    try:
        from alembic import command
        from alembic.config import Config

        alembic_cfg = Config(str(alembic_ini))
        alembic_cfg.set_main_option("script_location", str(alembic_dir))
        alembic_cfg.set_main_option("sqlalchemy.url", settings.db_url)
        command.upgrade(alembic_cfg, "head")
        logger.info("Database migrations checked")
    except Exception as exc:
        logger.error("Failed to run migrations", exc_info=exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("TaskArena backend starting...")
    logger.info(f"Database: {settings.db_path}")
    logger.info(f"AI provider: {settings.ai_provider}")

    if os.getenv("TASKARENA_RESOURCE_DIR"):
        logger.info("Skipping app-startup migrations because the sidecar already handled them")
    else:
        run_migrations_if_needed()
    ensure_default_user()
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

    @app.get("/api/health", tags=["system"])
    def api_health():
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
    app.include_router(schedule_template.router, prefix="/api")
    app.include_router(quiz.router, prefix="/api")
    app.include_router(study_materials.router, prefix="/api")
    app.include_router(leaderboard.router, prefix="/api")
    app.include_router(stats.router, prefix="/api")
    app.include_router(profile.router, prefix="/api")

    return app


app = create_app()


