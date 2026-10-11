param([ValidateRange(1024, 65535)][int]$Port = 8000)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'frontend/dist/index.html'))) {
    throw 'Run ./scripts/setup.ps1 first to install and build ABO.'
}
Write-Host "Open http://127.0.0.1:$Port . Press Ctrl+C in this terminal to stop ABO."
Push-Location (Join-Path $projectRoot 'backend')
try {
    uv run --frozen uvicorn abo_api.main:app --host 127.0.0.1 --port $Port
    if ($LASTEXITCODE -ne 0) { throw 'ABO stopped with an error. Check whether the port is occupied.' }
} finally { Pop-Location }
