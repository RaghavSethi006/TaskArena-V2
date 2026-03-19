#!/bin/bash
set -e

echo "Building TaskArena..."

# Step 1: Compile Python backend
echo "[1/3] Compiling Python backend..."
pyinstaller taskarena-backend.spec --clean --noconfirm

# Get target triple for naming
TRIPLE=$(rustc -Vv | grep "host:" | cut -d' ' -f2)
DEST="frontend/src-tauri/binaries/taskarena-backend-$TRIPLE"

rm -rf "$DEST"
cp -r dist/taskarena-backend "$DEST"

echo "Backend compiled to: $DEST"

# Step 2: Build Tauri app
echo "[2/3] Installing frontend dependencies..."
cd frontend && npm install

echo "[3/3] Building Tauri installer..."
cargo tauri build

echo "Done! Installer at: src-tauri/target/release/bundle/"