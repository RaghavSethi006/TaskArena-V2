#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
trap 'cd "$ROOT_DIR"' EXIT

cd "$ROOT_DIR"

if [[ -z "${VIRTUAL_ENV:-}" && -f ".venv/bin/activate" ]]; then
  # shellcheck disable=SC1091
  source ".venv/bin/activate"
fi

echo "Building TaskArena..."

echo
echo "[1/3] Compiling Python backend..."
BACKEND_BUILT=0
PYTHON_BIN="$ROOT_DIR/.venv/bin/python"
if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN="python"
fi
if pyinstaller taskarena-backend.spec --clean --noconfirm --contents-directory . || "$PYTHON_BIN" -m PyInstaller taskarena-backend.spec --clean --noconfirm --contents-directory .; then
  BACKEND_BUILT=1
elif [[ -d dist/taskarena-backend ]]; then
  echo "[1/3] PyInstaller could not run here; reusing existing dist/taskarena-backend/" >&2
else
  echo "Backend build failed and dist/taskarena-backend does not exist" >&2
  exit 1
fi

TRIPLE=$(rustc -Vv | grep "host:" | cut -d' ' -f2)
DEST="frontend/src-tauri/binaries/taskarena-backend-$TRIPLE"

rm -rf "$DEST"
mkdir -p "$(dirname "$DEST")"
cp -r dist/taskarena-backend "$DEST"
chmod -R +x "$DEST"
if [[ "$BACKEND_BUILT" -eq 1 ]]; then
  echo "[1/3] Backend compiled -> dist/taskarena-backend/"
else
  echo "[1/3] Backend ready -> dist/taskarena-backend/"
fi

if ! command -v cargo-tauri >/dev/null 2>&1; then
  echo "Run: cargo install tauri-cli --version '^2' then re-run build.sh" >&2
  exit 1
fi

echo
echo "[2/3] Installing frontend dependencies..."
cd frontend
npm install
echo "[2/3] Frontend deps installed"

echo
echo "[3/3] Building Tauri installer..."
cargo tauri build
echo "[3/3] Tauri installer built -> frontend/src-tauri/target/release/bundle/"

echo "Done! Installer at: frontend/src-tauri/target/release/bundle/"
