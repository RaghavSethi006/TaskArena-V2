#!/usr/bin/env python3
"""
TaskArena backend sidecar entry point.
Launched by Tauri. Picks a free port, runs migrations, prints READY, then serves forever.
"""

from __future__ import annotations

import argparse
import socket
import sys
from pathlib import Path


def get_runtime_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


def get_resource_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS", Path(sys.executable).resolve().parent))
    return Path(__file__).resolve().parent.parent


RUNTIME_ROOT = get_runtime_root()
RESOURCE_ROOT = get_resource_root()
sys.path.insert(0, str(RESOURCE_ROOT))


def find_free_port() -> int:
    """Ask the OS for an available loopback port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def ensure_runtime_dirs() -> None:
    for relative_path in ("data", "models"):
        (RUNTIME_ROOT / relative_path).mkdir(parents=True, exist_ok=True)


def run_migrations() -> None:
    alembic_ini = RESOURCE_ROOT / "alembic.ini"
    alembic_dir = RESOURCE_ROOT / "alembic"
    if not alembic_ini.exists() or not alembic_dir.exists():
        from shared.config import settings
        from shared.database import engine
        from shared.models_base import Base

        import features.chatbot.models  # noqa: F401
        import features.notes.models  # noqa: F401
        import features.quiz.models  # noqa: F401
        import features.schedule.models  # noqa: F401
        import features.tasks.models  # noqa: F401
        import shared.user_model  # noqa: F401

        db_path = Path(settings.db_path)
        if db_path.exists():
            print(
                "WARN migrations skipped: alembic resources were not bundled",
                file=sys.stderr,
                flush=True,
            )
            return

        Base.metadata.create_all(bind=engine)
        return

    from alembic import command
    from alembic.config import Config

    alembic_cfg = Config(str(alembic_ini))
    alembic_cfg.set_main_option("script_location", str(alembic_dir))
    command.upgrade(alembic_cfg, "head")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=0)
    args = parser.parse_args()

    ensure_runtime_dirs()
    run_migrations()

    port = args.port if args.port != 0 else find_free_port()

    # Tauri parses this line to discover the backend port.
    print(f"READY port={port}", flush=True)

    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=port,
        log_level="info",
        reload=False,
    )


if __name__ == "__main__":
    main()
