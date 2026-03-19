# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path
import sys

block_cipher = None

hiddenimports = [
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    "uvicorn.lifespan.off",
    "sqlalchemy.dialects.sqlite",
    "sqlalchemy.orm",
    "alembic.runtime.migration",
    "alembic.operations",
    "alembic.operations.ops",
    "alembic.autogenerate",
    "features.tasks.models",
    "features.notes.models",
    "features.schedule.models",
    "features.chatbot.models",
    "features.quiz.models",
    "features.leaderboard.models",
    "features.study_materials.models",
    "shared.user_model",
    "passlib.handlers.bcrypt",
    "multipart",
    "email_validator",
]

a = Analysis(
    ["sidecar/main.py"],
    pathex=[str(Path(".").resolve())],
    binaries=[],
    datas=[
        ("alembic", "alembic"),
        ("alembic.ini", "."),
    ],
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    excludes=["tkinter", "matplotlib", "pytest", "IPython"],
    cipher=block_cipher,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# ─── ONEDIR mode — no extraction on launch ───────────────────────────────────
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,      # key: binaries go in COLLECT, not inside exe
    name="taskarena-backend",
    debug=False,
    strip=False,
    upx=False,                  # don't compress — faster startup
    console=False,
    icon="frontend/src-tauri/icons/icon.ico",
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    name="taskarena-backend",   # output folder name
)