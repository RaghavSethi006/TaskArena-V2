Write-Host "Building TaskArena..." -ForegroundColor Cyan

# Step 1: Compile Python backend (onedir mode)
Write-Host "`n[1/3] Compiling Python backend..." -ForegroundColor Yellow
pyinstaller taskarena-backend.spec --clean --noconfirm

if ($LASTEXITCODE -ne 0) { Write-Host "Backend build failed" -ForegroundColor Red; exit 1 }

# Copy the entire onedir output to Tauri's binaries folder
# Tauri needs the folder named with the target triple suffix
$triple = (rustc -Vv | Select-String "host:").ToString().Split(" ")[1].Trim()
$dest = "frontend/src-tauri/binaries/taskarena-backend-$triple"

if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
Copy-Item "dist/taskarena-backend" $dest -Recurse

Write-Host "Backend compiled to: $dest" -ForegroundColor Green

# Step 2: Build Tauri app
Write-Host "`n[2/3] Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install

Write-Host "`n[3/3] Building Tauri installer..." -ForegroundColor Yellow
cargo tauri build

Write-Host "`nDone! Installer at: src-tauri/target/release/bundle/" -ForegroundColor Green