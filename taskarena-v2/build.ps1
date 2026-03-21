$projectRoot = $PSScriptRoot
$exitCode = 0

function Test-TauriCliInstalled {
    return (
        $null -ne (Get-Command cargo-tauri -ErrorAction SilentlyContinue) -or
        $null -ne (Get-Command cargo-tauri.exe -ErrorAction SilentlyContinue)
    )
}

try {
    Set-Location $projectRoot

    $activateScript = Join-Path $projectRoot ".venv\Scripts\Activate.ps1"
    if (-not $env:VIRTUAL_ENV -and (Test-Path $activateScript)) {
        . $activateScript
    }

    Write-Host "Building TaskArena..." -ForegroundColor Cyan

    Write-Host "`n[1/3] Compiling Python backend..." -ForegroundColor Yellow
    $backendDist = Join-Path $projectRoot "dist/taskarena-backend"
    $backendBuilt = $false
    pyinstaller taskarena-backend.spec --clean --noconfirm
    if ($LASTEXITCODE -ne 0) {
        $venvPython = Join-Path $projectRoot ".venv\Scripts\python.exe"
        if (Test-Path $venvPython) {
            & $venvPython -m PyInstaller taskarena-backend.spec --clean --noconfirm
        } else {
            python -m PyInstaller taskarena-backend.spec --clean --noconfirm
        }
    }
    if ($LASTEXITCODE -ne 0) {
        if (Test-Path $backendDist) {
            Write-Host "[1/3] PyInstaller could not run here; reusing existing dist/taskarena-backend/" -ForegroundColor Yellow
        } else {
            throw "Backend build failed and dist/taskarena-backend does not exist"
        }
    } else {
        $backendBuilt = $true
    }

    $triple = (rustc -Vv | Select-String "host:").ToString().Split(" ")[1].Trim()
    $dest = Join-Path $projectRoot "frontend/src-tauri/binaries/taskarena-backend-$triple"
    if (Test-Path $dest) {
        Remove-Item $dest -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
    Copy-Item $backendDist $dest -Recurse -Force
    if ($backendBuilt) {
        Write-Host "[1/3] Backend compiled -> dist/taskarena-backend/" -ForegroundColor Green
    } else {
        Write-Host "[1/3] Backend ready -> dist/taskarena-backend/" -ForegroundColor Green
    }

    Set-Location (Join-Path $projectRoot "frontend")

    if (-not (Test-TauriCliInstalled)) {
        Write-Host "Run: cargo install tauri-cli --version '^2' then re-run build.ps1" -ForegroundColor Red
        $exitCode = 1
    } else {
        Write-Host "`n[2/3] Installing frontend dependencies..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Frontend dependency installation failed"
        }
        Write-Host "[2/3] Frontend deps installed" -ForegroundColor Green

        Write-Host "`n[3/3] Building Tauri installer..." -ForegroundColor Yellow
        cargo tauri build
        if ($LASTEXITCODE -ne 0) {
            throw "Tauri build failed"
        }
        Write-Host "[3/3] Tauri installer built -> frontend/src-tauri/target/release/bundle/" -ForegroundColor Green
        Write-Host "Done! Installer at: frontend/src-tauri/target/release/bundle/nsis/*.exe" -ForegroundColor Green
    }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($exitCode -eq 0) {
        $exitCode = 1
    }
} finally {
    Set-Location $projectRoot
}

exit $exitCode
