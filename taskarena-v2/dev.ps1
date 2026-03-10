# dev.ps1 - start backend + frontend for browser development
# Usage: .\dev.ps1

$projectRoot = $PSScriptRoot
$frontendRoot = Join-Path $projectRoot "frontend"
$pythonPath = Join-Path $projectRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $pythonPath)) {
  throw "Virtualenv Python not found at $pythonPath"
}

$backendJob = Start-Job -ScriptBlock {
  param($root, $pythonExe)
  Set-Location $root
  & $pythonExe -m uvicorn backend.main:app --port 8765 --reload
} -ArgumentList $projectRoot, $pythonPath

Write-Host "[backend] Starting on port 8765..."
Start-Sleep -Seconds 3

try {
  Set-Location $frontendRoot
  npm run dev
}
finally {
  if ($backendJob.State -eq "Running") {
    Stop-Job $backendJob
  }
  Receive-Job $backendJob -Keep | Out-Host
  Remove-Job $backendJob
}
