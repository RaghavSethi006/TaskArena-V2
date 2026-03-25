$ErrorActionPreference = "Stop"
$StartDir = Get-Location

Write-Host "TaskArena Build Script (Windows)" -ForegroundColor Cyan
Write-Host "================================`n"

try {
    Set-Location $PSScriptRoot

    Write-Host "[1/4] Downloading Python 3.10.11 embeddable..." -ForegroundColor Yellow

    $pythonVersion = "3.10.11"
    $embedUrl = "https://www.python.org/ftp/python/$pythonVersion/python-$pythonVersion-embed-amd64.zip"
    $embedZip = "python-embed.zip"
    $embedDir = "python-embed"

    if (Test-Path $embedDir) { Remove-Item $embedDir -Recurse -Force }
    if (Test-Path $embedZip) { Remove-Item $embedZip -Force }

    Invoke-WebRequest -Uri $embedUrl -OutFile $embedZip -UseBasicParsing
    Expand-Archive $embedZip -DestinationPath $embedDir -Force
    Remove-Item $embedZip

    $pthFile = Get-ChildItem "$embedDir\python*._pth" | Select-Object -First 1
    if (-not $pthFile) { throw "Could not find ._pth file in embeddable Python" }

    $pthContent = Get-Content $pthFile.FullName
    $pthContent = $pthContent | ForEach-Object {
        if ($_ -match "^#import site") { "import site" } else { $_ }
    }
    if ($pthContent -notcontains ".") { $pthContent += "." }
    Set-Content $pthFile.FullName ($pthContent -join "`n") -NoNewline

    Write-Host "Python embeddable ready.`n" -ForegroundColor Green

    Write-Host "[2/4] Installing pip and Python packages..." -ForegroundColor Yellow

    $pythonExe = Resolve-Path "$embedDir\python.exe"
    Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile "get-pip.py" -UseBasicParsing
    & $pythonExe "get-pip.py" --no-warn-script-location --quiet
    Remove-Item "get-pip.py"

    & $pythonExe -m pip install -r requirements.txt --no-warn-script-location --quiet
    if ($LASTEXITCODE -ne 0) { throw "pip install failed" }

    Write-Host "Packages installed.`n" -ForegroundColor Green

    Write-Host "[3/4] Building backend bundle..." -ForegroundColor Yellow

    $bundleDir = "frontend\src-tauri\binaries\backend-bundle"
    if (Test-Path $bundleDir) { Remove-Item $bundleDir -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $bundleDir | Out-Null

    Copy-Item "$embedDir\*" $bundleDir -Recurse -Force
    Copy-Item "sidecar" "$bundleDir\sidecar" -Recurse -Force
    Copy-Item "backend" "$bundleDir\backend" -Recurse -Force
    Copy-Item "features" "$bundleDir\features" -Recurse -Force
    Copy-Item "shared" "$bundleDir\shared" -Recurse -Force
    Copy-Item "alembic" "$bundleDir\alembic" -Recurse -Force
    Copy-Item "alembic.ini" "$bundleDir\alembic.ini" -Force
    Copy-Item ".env.example" "$bundleDir\.env" -Force

    Get-ChildItem $bundleDir -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Get-ChildItem $bundleDir -Recurse -File -Filter "*.pyc" | Remove-Item -Force -ErrorAction SilentlyContinue

    Write-Host "Bundle ready at: $bundleDir`n" -ForegroundColor Green

    Write-Host "[4/4] Building Tauri installer..." -ForegroundColor Yellow

    Set-Location frontend
    npm install --quiet
    cargo tauri build
    if ($LASTEXITCODE -ne 0) { throw "Tauri build failed" }

    Write-Host "`nDone! Installer at:" -ForegroundColor Green
    Write-Host "  src-tauri\target\release\bundle\nsis\*.exe" -ForegroundColor Cyan
} finally {
    Set-Location $StartDir
}
