# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path

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
    "features.study_materials.models",
    "shared.user_model",
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
    module_collection_mode={"features": "py+pyz"},
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="taskarena-backend",
    debug=False,
    strip=False,
    upx=False,
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
    name="taskarena-backend",
)
