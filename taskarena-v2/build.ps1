$ErrorActionPreference = "Stop"
$StartDir = Get-Location

Write-Host "TaskArena Build Script (Windows)" -ForegroundColor Cyan
Write-Host "================================`n"

try {
    Set-Location $PSScriptRoot

    $pythonVersion = "3.10.11"
    $embedUrl = "https://www.python.org/ftp/python/$pythonVersion/python-$pythonVersion-embed-amd64.zip"
    $embedZip = Join-Path $PSScriptRoot "python-embed.zip"
    $embedDir = Join-Path $PSScriptRoot "python-embed"
    $bundleDir = Join-Path $PSScriptRoot "frontend\src-tauri\binaries\backend-bundle"
    $sitePackagesDir = Join-Path $embedDir "Lib\site-packages"
    $pythonExe = Join-Path $embedDir "python.exe"

    Write-Host "[1/4] Downloading Python 3.10.11 embeddable..." -ForegroundColor Yellow

    if (Test-Path $embedDir) {
        Remove-Item $embedDir -Recurse -Force
    }
    if (Test-Path $embedZip) {
        Remove-Item $embedZip -Force
    }

    Invoke-WebRequest -Uri $embedUrl -OutFile $embedZip -UseBasicParsing
    Expand-Archive $embedZip -DestinationPath $embedDir -Force
    Remove-Item $embedZip -Force

    $pthFile = Get-ChildItem (Join-Path $embedDir "python*._pth") | Select-Object -First 1
    if (-not $pthFile) {
        throw "Could not find the embeddable Python ._pth file."
    }

    $pthLines = Get-Content $pthFile.FullName
    $updatedPthLines = foreach ($line in $pthLines) {
        if ($line -match "^#import site") {
            "import site"
        } else {
            $line
        }
    }
    if ($updatedPthLines -notcontains ".") {
        $updatedPthLines += "."
    }
    Set-Content -Path $pthFile.FullName -Value ($updatedPthLines -join "`n") -NoNewline

    Write-Host "Python embeddable ready.`n" -ForegroundColor Green

    Write-Host "[2/4] Installing pip and Python packages..." -ForegroundColor Yellow

    New-Item -ItemType Directory -Force -Path $sitePackagesDir | Out-Null

    $getPipPath = Join-Path $PSScriptRoot "get-pip.py"
    Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile $getPipPath -UseBasicParsing
    & $pythonExe $getPipPath --no-warn-script-location
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install pip into the embeddable runtime."
    }
    Remove-Item $getPipPath -Force

    & $pythonExe -m pip install --requirement requirements-ci.txt --target $sitePackagesDir --no-warn-script-location
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install requirements-ci.txt into the embeddable runtime."
    }

    Write-Host "Packages installed.`n" -ForegroundColor Green

    Write-Host "[3/4] Building backend bundle..." -ForegroundColor Yellow

    if (Test-Path $bundleDir) {
        Remove-Item $bundleDir -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $bundleDir | Out-Null

    Copy-Item (Join-Path $embedDir "*") $bundleDir -Recurse -Force
    Copy-Item "sidecar" (Join-Path $bundleDir "sidecar") -Recurse -Force
    Copy-Item "backend" (Join-Path $bundleDir "backend") -Recurse -Force
    Copy-Item "features" (Join-Path $bundleDir "features") -Recurse -Force
    Copy-Item "shared" (Join-Path $bundleDir "shared") -Recurse -Force
    Copy-Item "alembic" (Join-Path $bundleDir "alembic") -Recurse -Force
    Copy-Item "alembic.ini" (Join-Path $bundleDir "alembic.ini") -Force
    Copy-Item ".env.example" (Join-Path $bundleDir ".env") -Force

    Get-ChildItem $bundleDir -Recurse -Directory -Filter "__pycache__" |
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Get-ChildItem $bundleDir -Recurse -File -Filter "*.pyc" |
        Remove-Item -Force -ErrorAction SilentlyContinue

    Write-Host "Backend bundle ready at: $bundleDir`n" -ForegroundColor Green

    Write-Host "[4/4] Building Tauri installer..." -ForegroundColor Yellow

    Set-Location (Join-Path $PSScriptRoot "frontend")
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed."
    }

    cargo tauri build
    if ($LASTEXITCODE -ne 0) {
        throw "cargo tauri build failed."
    }

    Write-Host "`nDone! Installer at:" -ForegroundColor Green
    Write-Host "  frontend\src-tauri\target\release\bundle\" -ForegroundColor Cyan
} finally {
    Set-Location $StartDir
}
