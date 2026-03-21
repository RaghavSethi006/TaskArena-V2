# -*- mode: python ; coding: utf-8 -*-
import sys
from pathlib import Path

# Find Visual C++ runtime DLLs from the Python installation
python_dir = Path(sys.executable).parent
vc_dlls = []
for dll_name in ["vcruntime140.dll", "vcruntime140_1.dll", "msvcp140.dll"]:
    dll_path = python_dir / dll_name
    if dll_path.exists():
        vc_dlls.append((str(dll_path), "."))


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
    binaries=vc_dlls,
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
    contents_directory=".",
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
