param([ValidateRange(1024, 65535)][int]$Port = 8000)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$distIndex = Join-Path $projectRoot 'frontend/dist/index.html'

if (-not (Test-Path -LiteralPath $distIndex)) {
    throw 'Run ./scripts/setup.ps1 first to install and build ABO.'
}

$distTime = (Get-Item -LiteralPath $distIndex).LastWriteTimeUtc
$latestSource = Get-ChildItem -Path (Join-Path $projectRoot 'frontend/src'), (Join-Path $projectRoot 'frontend/public') -Recurse -File |
    Sort-Object LastWriteTimeUtc -Descending |
    Select-Object -First 1

if ($latestSource -and $latestSource.LastWriteTimeUtc -gt $distTime) {
    Write-Host 'Rebuilding frontend/dist to match updated frontend sources...'
    Push-Location (Join-Path $projectRoot 'frontend')

    try {
        npm.cmd run build

        if ($LASTEXITCODE -ne 0) {
            throw 'Frontend build failed.'
        }
    } finally {
        Pop-Location
    }
}

Write-Host "Open http://127.0.0.1:$Port . Press Ctrl+C in this terminal to stop ABO."
Push-Location (Join-Path $projectRoot 'backend')

try {
    uv run --frozen uvicorn abo_api.main:app --host 127.0.0.1 --port $Port

    if ($LASTEXITCODE -ne 0) {
        throw 'ABO stopped with an error. Check whether the port is occupied.'
    }
} finally {
    Pop-Location
}
