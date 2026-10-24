param([switch]$SkipChecks)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

foreach ($commandName in @('uv', 'npm')) {
    if (-not (Get-Command $commandName -ErrorAction SilentlyContinue)) {
        throw "Install $commandName before setup. See docs/DEVELOPMENT.md."
    }
}

Push-Location (Join-Path $projectRoot 'backend')

try {
    uv sync --locked

    if ($LASTEXITCODE -ne 0) {
        throw 'Locked Python installation failed.'
    }

    if (-not $SkipChecks) {
        uv run pytest tests ../qa

        if ($LASTEXITCODE -ne 0) {
            throw 'Python verification failed.'
        }
    }
} finally {
    Pop-Location
}

Push-Location (Join-Path $projectRoot 'frontend')

try {
    npm ci

    if ($LASTEXITCODE -ne 0) {
        throw 'Locked frontend installation failed. Stop ABO Vite before retrying.'
    }

    npm run api:types

    if ($LASTEXITCODE -ne 0) {
        throw 'API type generation failed.'
    }

    if ($SkipChecks) {
        npm run build
    } else {
        npm run check
    }

    if ($LASTEXITCODE -ne 0) {
        throw 'Frontend verification/build failed.'
    }
} finally {
    Pop-Location
}

Write-Host 'ABO installed and built. Run ./scripts/start.ps1 and open http://127.0.0.1:8000'
