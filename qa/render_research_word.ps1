param(
    [string]$Source = 'docs/ABO_RESEARCH_IMRAD.docx',
    [string]$OutputDirectory = 'qa/research/word'
)
$ErrorActionPreference = 'Stop'
$researchRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$researchSource = (Resolve-Path (Join-Path $researchRoot $Source)).Path
$researchOutput = [IO.Path]::GetFullPath((Join-Path $researchRoot $OutputDirectory))
if (-not $researchOutput.StartsWith($researchRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Word QA output must stay inside the project.'
}
New-Item -ItemType Directory -Path $researchOutput -Force | Out-Null
$researchPdf = Join-Path $researchOutput 'ABO_RESEARCH_IMRAD.pdf'
$researchAudit = Join-Path $researchOutput 'word-render-audit.json'
$researchWord = $null
$researchDocument = $null
$researchEvidence = [ordered]@{
    source = $Source
    source_sha256 = (Get-FileHash -LiteralPath $researchSource -Algorithm SHA256).Hash.ToLowerInvariant()
    renderer = 'Microsoft Word COM, read-only source'
    status = 'unavailable'
    source_modified = $false
    accessibility = 'Native accessibility checker and screen-reader review not performed'
}
try {
    if (Get-Process -Name WINWORD -ErrorAction SilentlyContinue) {
        throw 'An existing Word session is open; refusing to commandeer or close it.'
    }
    $researchWord = New-Object -ComObject Word.Application
    $researchWord.Visible = $false
    $researchWord.DisplayAlerts = 0
    $researchDocument = $researchWord.Documents.Open($researchSource, $false, $true)
    $researchDocument.Repaginate()
    $researchEvidence.version = $researchWord.Version
    $researchEvidence.build = $researchWord.Build
    $researchEvidence.page_count = $researchDocument.ComputeStatistics(2)
    $researchDocument.ExportAsFixedFormat($researchPdf, 17)
    $researchEvidence.pdf_sha256 = (Get-FileHash -LiteralPath $researchPdf -Algorithm SHA256).Hash.ToLowerInvariant()
    $researchEvidence.status = 'rendered_pending_page_review'
} catch {
    $researchEvidence.reason = $_.Exception.Message
} finally {
    if ($null -ne $researchDocument) {
        $researchDocument.Close(0)
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($researchDocument)
    }
    if ($null -ne $researchWord) {
        $researchWord.Quit(0)
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($researchWord)
    }
    $researchEvidence.source_modified = $researchEvidence.source_sha256 -ne (Get-FileHash -LiteralPath $researchSource -Algorithm SHA256).Hash.ToLowerInvariant()
    $researchEvidence | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $researchAudit -Encoding utf8
    $researchEvidence | ConvertTo-Json -Depth 5
}
