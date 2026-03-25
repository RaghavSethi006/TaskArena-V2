#!/bin/bash
set -euo pipefail

echo "TaskArena Build Script (Mac/Linux)"
echo "==================================="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "[1/3] Compiling Python backend with PyInstaller..."
pyinstaller taskarena-backend.spec --clean --noconfirm

BUNDLE_DIR="frontend/src-tauri/binaries/backend-bundle"
rm -rf "$BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR"

cp -r dist/taskarena-backend/. "$BUNDLE_DIR/"
chmod +x "$BUNDLE_DIR/taskarena-backend" 2>/dev/null || true

echo "Backend bundle ready at: $BUNDLE_DIR"

echo ""
echo "[2/3] Installing frontend dependencies..."
cd frontend
npm install

echo ""
echo "[3/3] Building Tauri installer..."
cargo tauri build

echo ""
echo "Done! Installer at: src-tauri/target/release/bundle/"
