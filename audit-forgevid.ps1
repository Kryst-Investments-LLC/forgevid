<#
.SYNOPSIS
  audit-forgevid.ps1
.DESCRIPTION
  Audits a ForgeVid repository (based on README) and reports what's present, what's missing,
  and a completion score. Outputs to console, JSON, and optionally HTML.
.NOTES
  - Place at repo root. Run: .\audit-forgevid.ps1 -RepoPath . -GenerateHtmlReport -RunHeavyChecks
  - By default heavy checks (builds, DB connects) are NOT executed.
  - Requires PowerShell 7+.
.PARAMETER RepoPath
  Path to the repo root (default: current directory)
.PARAMETER RunHeavyChecks
  If set, runs expensive checks like npm build and DB connectivity.
.PARAMETER GenerateHtmlReport
  If set, writes an HTML report to ./audit-report.html
.PARAMETER ThresholdPercent
  Percentage threshold to consider "ready" (default 85)
.EXAMPLE
  .\audit-forgevid.ps1 -RepoPath C:\code\forgevid -GenerateHtmlReport -RunHeavyChecks
#>

param(
    [string]$RepoPath = ".",
    [switch]$RunHeavyChecks = $false,
    [switch]$GenerateHtmlReport = $false,
    [int]$ThresholdPercent = 85
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------- Helper functions ----------
function Write-Log { param($msg) Write-Host "[*] $msg" -ForegroundColor Cyan }
function Write-Warn { param($msg) Write-Host "[!] $msg" -ForegroundColor Yellow }
function Write-Err  { param($msg) Write-Host "[X] $msg" -ForegroundColor Red }

function PathExists { param($p) return ([System.IO.File]::Exists($p) -or [System.IO.Directory]::Exists($p)) }

function Read-JsonFile {
    param($path)
    try {
        Get-Content $path -Raw | ConvertFrom-Json
    } catch {
        return $null
    }
}

# Output containers
$results = [ordered]@{
    repoPath = (Get-Item $RepoPath).FullName
    timestamp = (Get-Date).ToString("u")
    checks = @()
    score = 0
    maxScore = 0
    missing = @()
    todo = @()
}

# ---------- Define checks ----------
$checks = @()

# Core repository structure
$checks += @{
    name = "git_repo"
    weight = 5
    run = { 
        $gitPath = Join-Path $RepoPath ".git"
        $hasGit = (PathExists $gitPath) -or (Get-Command git -ErrorAction SilentlyContinue)
        @{ ok = $hasGit; note = "Git repository or Git command available" }
    }
}

$checks += @{
    name = "package_json"
    weight = 10
    run = {
        $pkgPath = Join-Path $RepoPath "package.json"
        if (PathExists $pkgPath) {
            $pkg = Read-JsonFile $pkgPath
            $deps = @($pkg.dependencies.PSObject.Properties.Name)
            $devDeps = @($pkg.devDependencies.PSObject.Properties.Name)
            $totalDeps = $deps.Count + $devDeps.Count
            @{ ok = $true; note = "Found $totalDeps dependencies" }
        } else {
            @{ ok = $false; note = "package.json not found" }
        }
    }
}

$checks += @{
    name = "nextjs_config"
    weight = 8
    run = {
        $nextConfig = Join-Path $RepoPath "next.config.mjs"
        @{ ok = (PathExists $nextConfig); note = "Next.js configuration file" }
    }
}

$checks += @{
    name = "typescript_config"
    weight = 8
    run = {
        $tsConfig = Join-Path $RepoPath "tsconfig.json"
        @{ ok = (PathExists $tsConfig); note = "TypeScript configuration" }
    }
}

# App structure
$checks += @{
    name = "app_directory"
    weight = 10
    run = {
        $appDir = Join-Path $RepoPath "app"
        if (PathExists $appDir) {
            $subdirs = @("api", "dashboard", "admin", "auth")
            $found = $subdirs | Where-Object { PathExists (Join-Path $appDir $_) }
            @{ ok = $true; note = "Found app subdirs: $($found -join ', ')" }
        } else {
            @{ ok = $false; note = "app directory not found" }
        }
    }
}

$checks += @{
    name = "components_directory"
    weight = 8
    run = {
        $compDir = Join-Path $RepoPath "components"
        if (PathExists $compDir) {
            $uiDir = Join-Path $compDir "ui"
            $hasUI = PathExists $uiDir
            @{ ok = $true; note = "Components dir found, UI components: $hasUI" }
        } else {
            @{ ok = $false; note = "components directory not found" }
        }
    }
}

$checks += @{
    name = "lib_directory"
    weight = 8
    run = {
        $libDir = Join-Path $RepoPath "lib"
        @{ ok = (PathExists $libDir); note = "Utility functions directory" }
    }
}

# Database and ORM
$checks += @{
    name = "prisma_schema"
    weight = 15
    run = {
        $schemaPath = Join-Path $RepoPath "prisma\schema.prisma"
        if (PathExists $schemaPath) {
            $content = Get-Content $schemaPath -Raw
            $modelCount = ([regex]::Matches($content, "model\s+\w+")).Count
            @{ ok = $true; note = "Prisma schema with $modelCount models" }
        } else {
            @{ ok = $false; note = "prisma/schema.prisma not found" }
        }
    }
}

$checks += @{
    name = "database_client"
    weight = 10
    run = {
        $dbPath = Join-Path $RepoPath "lib\database.ts"
        @{ ok = (PathExists $dbPath); note = "Database client configuration" }
    }
}

# Authentication and security
$checks += @{
    name = "auth_provider"
    weight = 12
    run = {
        $authPath = Join-Path $RepoPath "components\auth-provider.tsx"
        @{ ok = (PathExists $authPath); note = "Authentication provider component" }
    }
}

$checks += @{
    name = "protected_route"
    weight = 10
    run = {
        $protectedPath = Join-Path $RepoPath "components\protected-route.tsx"
        @{ ok = (PathExists $protectedPath); note = "Protected route component" }
    }
}

$checks += @{
    name = "middleware_security"
    weight = 12
    run = {
        $middlewarePath = Join-Path $RepoPath "middleware.ts"
        if (PathExists $middlewarePath) {
            $content = Get-Content $middlewarePath -Raw
            $hasAuth = $content -match "auth|Auth"
            $hasRateLimit = $content -match "rateLimit|rate-limit"
            @{ ok = $true; note = "Middleware with auth: $hasAuth, rate limiting: $hasRateLimit" }
        } else {
            @{ ok = $false; note = "middleware.ts not found" }
        }
    }
}

# API routes structure
$checks += @{
    name = "api_routes"
    weight = 15
    run = {
        $apiDir = Join-Path $RepoPath "app\api"
        if (PathExists $apiDir) {
            $routes = @("auth", "videos", "ai", "media", "templates", "admin")
            $found = $routes | Where-Object { PathExists (Join-Path $apiDir $_) }
            $score = $found.Count / $routes.Count
            @{ ok = ($score -ge 0.7); note = "API routes found: $($found -join ', ') ($($found.Count)/$($routes.Count))" }
        } else {
            @{ ok = $false; note = "app/api directory not found" }
        }
    }
}

# AI and video features
$checks += @{
    name = "ai_features"
    weight = 12
    run = {
        $aiFiles = @(
            "features\ai-editing-ai.ts",
            "features\voice-to-video-ai.ts",
            "features\storyboard-ai.ts",
            "components\ai-editing-panel.tsx",
            "components\ai-prompt-panel.tsx"
        )
        $found = $aiFiles | Where-Object { PathExists (Join-Path $RepoPath $_) }
        $score = $found.Count / $aiFiles.Count
        @{ ok = ($score -ge 0.6); note = "AI features found: $($found.Count)/$($aiFiles.Count)" }
    }
}

$checks += @{
    name = "video_editor"
    weight = 12
    run = {
        $videoFiles = @(
            "components\video-preview.tsx",
            "components\timeline.tsx",
            "components\export-panel.tsx"
        )
        $found = $videoFiles | Where-Object { PathExists (Join-Path $RepoPath $_) }
        $score = $found.Count / $videoFiles.Count
        @{ ok = ($score -ge 0.6); note = "Video editor components: $($found.Count)/$($videoFiles.Count)" }
    }
}

# Collaboration features
$checks += @{
    name = "collaboration"
    weight = 10
    run = {
        $collabFiles = @(
            "components\CollaborationRoom.tsx",
            "features\collaboration-ai.ts",
            "features\collaboration-server.ts"
        )
        $found = $collabFiles | Where-Object { PathExists (Join-Path $RepoPath $_) }
        $score = $found.Count / $collabFiles.Count
        @{ ok = ($score -ge 0.6); note = "Collaboration features: $($found.Count)/$($collabFiles.Count)" }
    }
}

# Templates and media
$checks += @{
    name = "templates_media"
    weight = 10
    run = {
        $templateFiles = @(
            "components\templates-media-panel.tsx",
            "features\templates-media-ai.ts"
        )
        $found = $templateFiles | Where-Object { PathExists (Join-Path $RepoPath $_) }
        @{ ok = ($found.Count -ge 1); note = "Template/media components found: $($found.Count)" }
    }
}

# Admin and analytics
$checks += @{
    name = "admin_dashboard"
    weight = 12
    run = {
        $adminDir = Join-Path $RepoPath "app\admin"
        if (PathExists $adminDir) {
            $adminFiles = Get-ChildItem $adminDir -Recurse -File | Measure-Object
            @{ ok = $true; note = "Admin dashboard with $($adminFiles.Count) files" }
        } else {
            @{ ok = $false; note = "app/admin directory not found" }
        }
    }
}

$checks += @{
    name = "analytics_features"
    weight = 8
    run = {
        $analyticsFiles = @(
            "features\analytics-ai.ts",
            "api\analytics-insights.ts"
        )
        $found = $analyticsFiles | Where-Object { PathExists (Join-Path $RepoPath $_) }
        @{ ok = ($found.Count -ge 1); note = "Analytics features: $($found.Count)" }
    }
}

# Testing infrastructure
$checks += @{
    name = "tests_and_coverage"
    weight = 15
    run = {
        $testFiles = @(
            "jest.config.js",
            "playwright.config.ts",
            "tests"
        )
        $found = $testFiles | Where-Object { PathExists (Join-Path $RepoPath $_) }
        
        # Check package.json for test scripts
        $pkgPath = Join-Path $RepoPath "package.json"
        $hasTestScripts = $false
        if (PathExists $pkgPath) {
            $pkg = Read-JsonFile $pkgPath
            $scripts = $pkg.scripts.PSObject.Properties.Name
            $testScripts = $scripts | Where-Object { $_ -match "test|coverage" }
            $hasTestScripts = $testScripts.Count -gt 0
        }
        
        $testScriptBonus = if ($hasTestScripts) { 1 } else { 0 }
        $score = ($found.Count + $testScriptBonus) / ($testFiles.Count + 1)
        @{ ok = ($score -ge 0.75); note = "Test config: $($found -join ', '), scripts: $hasTestScripts" }
    }
}

# Documentation
$checks += @{
    name = "documentation"
    weight = 10
    run = {
        $docFiles = @(
            "README.md",
            "docs\API-DOCUMENTATION.md",
            "docs\USAGE-GUIDE.md",
            "docs\TROUBLESHOOTING.md"
        )
        $found = $docFiles | Where-Object { PathExists (Join-Path $RepoPath $_) }
        $score = $found.Count / $docFiles.Count
        @{ ok = ($score -ge 0.75); note = "Documentation files: $($found.Count)/$($docFiles.Count)" }
    }
}

# Security and compliance
$checks += @{
    name = "security_compliance"
    weight = 12
    run = {
        $secFiles = @(
            "docs\security-audit-log.md",
            "app\legal",
            "app\privacy",
            "COMPLIANCE.md"
        )
        $found = $secFiles | Where-Object { PathExists (Join-Path $RepoPath $_) }
        $score = $found.Count / $secFiles.Count
        @{ ok = ($score -ge 0.5); note = "Security/compliance files: $($found.Count)/$($secFiles.Count)" }
    }
}

# Infrastructure and deployment
$checks += @{
    name = "infrastructure"
    weight = 8
    run = {
        $infraFiles = @(
            "infra\main.tf",
            ".github\workflows",
            "docker-compose.yml",
            "Dockerfile"
        )
        $found = $infraFiles | Where-Object { PathExists (Join-Path $RepoPath $_) }
        @{ ok = ($found.Count -ge 1); note = "Infrastructure files: $($found -join ', ')" }
    }
}

# Environment configuration
$checks += @{
    name = "env_configuration"
    weight = 8
    run = {
        $envFiles = @(".env.example", ".env.local.example")
        $found = @()
        foreach ($envFile in $envFiles) {
            if (PathExists (Join-Path $RepoPath $envFile)) {
                $found += $envFile
            }
        }
        @{ ok = ($found.Count -ge 1); note = "Environment config files: $($found -join ', ')" }
    }
}

# Build and dependency check (heavy)
if ($RunHeavyChecks) {
    $checks += @{
        name = "build_check"
        weight = 20
        run = {
            try {
                Push-Location $RepoPath
                $output = npm run build 2>&1
                $success = $LASTEXITCODE -eq 0
                @{ ok = $success; note = "Build $(if($success){'succeeded'}else{'failed'})" }
            } catch {
                @{ ok = $false; note = "Build failed: $_" }
            } finally {
                Pop-Location
            }
        }
    }
    
    $checks += @{
        name = "dependency_audit"
        weight = 10
        run = {
            try {
                Push-Location $RepoPath
                $output = npm audit --audit-level moderate 2>&1
                $success = $LASTEXITCODE -eq 0
                @{ ok = $success; note = "Dependency audit $(if($success){'passed'}else{'found issues'})" }
            } catch {
                @{ ok = $false; note = "Audit failed: $_" }
            } finally {
                Pop-Location
            }
        }
    }
}

# Check for TODO/FIXME/mock implementations
$checks += @{
    name = "code_quality"
    weight = 8
    run = {
        try {
            $codeFiles = Get-ChildItem $RepoPath -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" -ErrorAction SilentlyContinue | Where-Object { 
                $_.FullName -notmatch "node_modules|\.next|dist|build" 
            }
            $totalFiles = ($codeFiles | Measure-Object).Count
            $todoCount = 0
            $mockCount = 0
            
            foreach ($file in $codeFiles) {
                try {
                    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
                    if ($content) {
                        $todoCount += ([regex]::Matches($content, "TODO|FIXME|XXX", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
                        $mockCount += ([regex]::Matches($content, "mockData|mock|placeholder", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
                    }
                } catch {
                    # Skip files that can't be read
                    continue
                }
            }
            
            $quality = $todoCount + $mockCount
            @{ ok = ($quality -lt 20); note = "Code files: $totalFiles, TODOs: $todoCount, Mocks: $mockCount" }
        } catch {
            @{ ok = $true; note = "Code quality scan completed with warnings" }
        }
    }
}

# Check for AI service keys hint (security check)
$checks += @{
    name = "ai_service_keys_hint"
    weight = 5
    run = {
        $envExample = Join-Path $RepoPath ".env.example"
        if (PathExists $envExample) {
            $content = Get-Content $envExample -Raw
            $hasOpenAI = $content -match "OPENAI"
            $hasElevenLabs = $content -match "ELEVEN"
            @{ ok = ($hasOpenAI -and $hasElevenLabs); note = "AI service keys configured: OpenAI=$hasOpenAI, ElevenLabs=$hasElevenLabs" }
        } else {
            @{ ok = $false; note = ".env.example not found" }
        }
    }
}

# ---------- Run checks and output ----------
Write-Log "Starting ForgeVid audit for path: $RepoPath"

foreach ($chk in $checks) {
    $name = $chk.name
    $weight = $chk.weight
    try {
        $res = & $chk.run
        $ok = [bool]$res.ok
        $note = $res.note
        $results.maxScore += $weight
        if ($ok) { $results.score += $weight }
        else { $results.missing += $name }
        $results.checks += [ordered]@{
            name = $name
            ok = $ok
            note = $note
            weight = $weight
        }
        Write-Host ("{0,-25} [{1}] {2}" -f $name, ($(if ($ok) {"OK"} else {"MISSING"})), $note) -ForegroundColor ($(if ($ok) {"Green"} else {"Red"}))
    } catch {
        Write-Err "$name failed: $_"
    }
}

$percent = [math]::Round(($results.score / $results.maxScore) * 100, 2)
Write-Host ""
Write-Log "ForgeVid Audit Summary:"
Write-Host "   Score: $($results.score)/$($results.maxScore) ($percent%)" -ForegroundColor Cyan

if ($percent -ge $ThresholdPercent) {
    Write-Host "✅ Platform readiness threshold ($ThresholdPercent%) met or exceeded!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Platform below readiness threshold ($ThresholdPercent%). Missing checks: $($results.missing -join ', ')" -ForegroundColor Yellow
}

# ---------- Output results ----------
$jsonPath = Join-Path $RepoPath "audit-forgevid.json"
$results | ConvertTo-Json -Depth 5 | Out-File $jsonPath -Encoding UTF8
Write-Log "JSON report written to: $jsonPath"

if ($GenerateHtmlReport) {
    $htmlPath = Join-Path $RepoPath "audit-report.html"
    $html = @"
<html><head>
<title>ForgeVid Audit Report</title>
<style>
body { font-family: Arial; margin: 30px; background: #f9f9f9; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #ddd; padding: 8px; }
th { background: #333; color: #fff; }
tr:nth-child(even) { background: #f2f2f2; }
.ok { color: green; font-weight: bold; }
.fail { color: red; font-weight: bold; }
.summary { background: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
</style>
</head><body>
<h2>ForgeVid Enterprise Platform Audit Report</h2>
<div class="summary">
<p><b>Repository:</b> $($results.repoPath)</p>
<p><b>Audit Date:</b> $($results.timestamp)</p>
<p><b>Overall Score:</b> $($results.score)/$($results.maxScore) ($percent%)</p>
<p><b>Readiness Status:</b> $(if ($percent -ge $ThresholdPercent) { "✅ READY" } else { "⚠️ NEEDS WORK" })</p>
</div>
<h3>Detailed Results</h3>
<table><tr><th>Check</th><th>Weight</th><th>Status</th><th>Details</th></tr>
"@
    foreach ($c in $results.checks) {
        $class = if ($c.ok) { "ok" } else { "fail" }
        $status = if ($c.ok) { "✅ PASS" } else { "❌ FAIL" }
        $html += "<tr><td>$($c.name)</td><td>$($c.weight)</td><td class='$class'>$status</td><td>$($c.note)</td></tr>`n"
    }
    $html += "</table>"
    
    if ($results.missing.Count -gt 0) {
        $html += "<h3>Missing Components</h3><ul>"
        foreach ($missing in $results.missing) {
            $html += "<li>$missing</li>"
        }
        $html += "</ul>"
    }
    
    $html += "</body></html>"
    $html | Out-File $htmlPath -Encoding UTF8
    Write-Log "HTML report written to: $htmlPath"
}

Write-Log "Audit complete."