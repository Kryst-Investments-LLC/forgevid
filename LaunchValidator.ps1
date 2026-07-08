# LaunchValidator.ps1
# Author: Yan (AI Ethics & Automation)
# Purpose: Validate platform readiness across performance, security, accessibility, SEO, and governance

# CONFIGURATION
$projectPath = "C:\Users\yanp0\OneDrive\Documentos\proyectos\forgevid"
$reportPath = "$projectPath\launch-report"
$thresholds = @{
  performance = 90
  accessibility = 95
  seo = 85
  cls = 0.1
  lcp = 1200
}

# Ensure report directory exists
New-Item -ItemType Directory -Force -Path $reportPath | Out-Null

Write-Host "`nStarting Launch Validation..." -ForegroundColor Cyan

# 1. LIGHTHOUSE AUDIT
Write-Host "`nRunning Lighthouse audit..."
lighthouse http://localhost:3000 `
  --output=json `
  --output-path="$reportPath\lighthouse.json" `
  --chrome-flags="--headless" `
  --quiet `
  | Out-Null

# Parse Lighthouse scores robustly
$lighthouse = Get-Content "$reportPath\lighthouse.json" | ConvertFrom-Json
$audits = $lighthouse.audits

function Get-LighthouseMetric {
  param([object]$audits, [string]$key)
  if ($audits.$key -and $null -ne $audits.$key.numericValue) {
    return [math]::Round([double]$audits.$key.numericValue, 2)
  } else {
    return 'N/A'
  }
}

$fcp = Get-LighthouseMetric -audits $audits -key 'first-contentful-paint'
$lcp = Get-LighthouseMetric -audits $audits -key 'largest-contentful-paint'
$tbt = Get-LighthouseMetric -audits $audits -key 'total-blocking-time'
$cls = Get-LighthouseMetric -audits $audits -key 'cumulative-layout-shift'
$si  = Get-LighthouseMetric -audits $audits -key 'speed-index'

Write-Host "Lighthouse Key Metrics:"
Write-Host "  FCP: $fcp ms"
Write-Host "  LCP: $lcp ms"
Write-Host "  TBT: $tbt ms"
Write-Host "  CLS: $cls"
Write-Host "  Speed Index: $si ms"

function Get-LighthouseScore {
  param (
    [Parameter(Mandatory=$true)][object]$categories,
    [Parameter(Mandatory=$true)][string]$categoryName
  )
  if ($categories.$categoryName -and $categories.$categoryName.score -ne $null) {
    return [math]::Round($categories.$categoryName.score * 100)
  } else {
    return 0
  }
}


# Patch: Print $lighthouse.categories for debugging if scores are zero
$perfScore = Get-LighthouseScore -categories $lighthouse.categories -categoryName "performance"
$accessScore = Get-LighthouseScore -categories $lighthouse.categories -categoryName "accessibility"
$seoScore = Get-LighthouseScore -categories $lighthouse.categories -categoryName "seo"
if ($perfScore -eq 0 -and $accessScore -eq 0 -and $seoScore -eq 0) {
  Write-Host "[DEBUG] $($lighthouse.categories | ConvertTo-Json -Depth 3)"
}

Write-Host "`nLighthouse Scores:"
Write-Host "Performance: $perfScore"
Write-Host "Accessibility: $accessScore"
Write-Host "SEO: $seoScore"

function Show-ScoreBar {
  param ([string]$Label, [int]$Score)
  $bar = "#" * ($Score / 10)
  Write-Host "$Label [$Score] $bar"
}

Show-ScoreBar -Label "Performance" -Score $perfScore
Show-ScoreBar -Label "Accessibility" -Score $accessScore
Show-ScoreBar -Label "SEO" -Score $seoScore


# Threshold check
if (
  $perfScore -lt $thresholds.performance -or
  $accessScore -lt $thresholds.accessibility -or
  $seoScore -lt $thresholds.seo -or
  ($cls -ne 'N/A' -and [double]$cls -gt $thresholds.cls) -or
  ($lcp -ne 'N/A' -and [double]$lcp -gt $thresholds.lcp)
) {
  Write-Warning "Lighthouse scores below threshold. Review report at $reportPath\lighthouse.json"
}
npm audit --json > "$reportPath\npm-audit.json"
npm audit fix --force | Tee-Object "$reportPath\npm-fix.log"

# 4. ACCESSIBILITY SCAN (PowerShell Module)
Write-Host "`nRunning accessibility scan..."
Import-Module "$projectPath\modules\AccessibilityAudit.psm1"
Invoke-AccessibilityAudit -Url "http://localhost:3000" -ReportPath "$reportPath\accessibility.json"

# 5. SEO/CONTENT CRAWLER
Write-Host "`nRunning SEO/content crawler..."
Invoke-WebRequest "http://localhost:3000" -OutFile "$reportPath\homepage.html"

# 6. GOVERNANCE CHECKLIST (ISO/CEET)
Write-Host "`nValidating governance checklist..."
Import-Module "$projectPath\modules\GovernanceAudit.psm1"
$governanceChecklist = "$projectPath\checklists\iso42001-ceet.json"
$governanceStatus = Test-GovernanceCompliance -ChecklistPath $governanceChecklist -PlatformPath $projectPath

# Export governance results
$governanceStatus | ConvertTo-Json -Depth 5 | Out-File "$reportPath\governance.json"

# Show summary in console
Write-Host "`nGovernance Checklist Summary:"
if ($governanceStatus) {
    $governanceStatus | ForEach-Object {
        $itemName = $_.item
        $itemStatus = $_.status
        Write-Host " - ${itemName}: ${itemStatus}"
    }
}

# FINAL SUMMARY
Write-Host ""
Write-Host "Launch Validation Complete!"
Write-Host "Reports saved to: $reportPath"
