#!/bin/bash
set -euo pipefail

START_DIR="$(pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
trap 'cd "$START_DIR"' EXIT

echo "TaskArena Build Script (Mac/Linux)"
echo "==================================="

cd "$SCRIPT_DIR"

echo
echo "[1/3] Compiling Python backend with PyInstaller..."
pyinstaller taskarena-backend.spec --clean --noconfirm

BUNDLE_DIR="frontend/src-tauri/binaries/backend-bundle"
BUNDLE_ZIP="frontend/src-tauri/binaries/backend-bundle.zip"
rm -rf "$BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR"
rm -f "$BUNDLE_ZIP"

cp -r dist/taskarena-backend/. "$BUNDLE_DIR/"
chmod +x "$BUNDLE_DIR/taskarena-backend" 2>/dev/null || true
(cd "$BUNDLE_DIR" && zip -r "$SCRIPT_DIR/$BUNDLE_ZIP" .)

echo "Backend bundle ready at: $BUNDLE_DIR"
echo "Backend archive ready at: $BUNDLE_ZIP"

echo
echo "[2/3] Installing frontend dependencies..."
cd frontend
npm install

echo
echo "[3/3] Building Tauri installer..."
cargo tauri build

echo
echo "Done! Installer at: src-tauri/target/release/bundle/"
