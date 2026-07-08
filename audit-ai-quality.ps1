# AI-Driven Quality Scanner for ForgeVid
# This script analyzes TODOs and estimates completion levels by module

param(
    [string]$RepoPath = ".",
    [string]$OutputPath = ".\quality-analysis.json",
    [switch]$GenerateReport = $false,
    [switch]$DetailedAnalysis = $false
)

Write-Host "[*] Starting AI-Driven Quality Analysis for ForgeVid..." -ForegroundColor Cyan

# Define module categories and their importance weights
$ModuleWeights = @{
    "api" = 0.25          # Critical - 25%
    "components" = 0.20   # High - 20%
    "features" = 0.20     # High - 20%
    "lib" = 0.15          # Medium - 15%
    "app" = 0.10          # Medium - 10%
    "tests" = 0.05        # Low - 5%
    "docs" = 0.05         # Low - 5%
}

# TODO priority classification
$TodoPriorities = @{
    "CRITICAL" = @("security", "auth", "payment", "database", "production", "deploy")
    "HIGH" = @("api", "integration", "performance", "error", "validation", "fix")
    "MEDIUM" = @("feature", "enhancement", "optimize", "refactor", "improve")
    "LOW" = @("comment", "documentation", "cleanup", "style", "format")
}

# Initialize results
$QualityMetrics = @{
    "totalFiles" = 0
    "totalTodos" = 0
    "moduleAnalysis" = @{}
    "priorityBreakdown" = @{
        "CRITICAL" = 0
        "HIGH" = 0
        "MEDIUM" = 0
        "LOW" = 0
    }
    "completionEstimate" = 0
    "recommendations" = @()
    "riskAssessment" = "LOW"
}

function Analyze-TodoPriority {
    param([string]$TodoText)
    
    $TodoLower = $TodoText.ToLower()
    
    foreach ($priority in $TodoPriorities.Keys) {
        foreach ($keyword in $TodoPriorities[$priority]) {
            if ($TodoLower -contains $keyword) {
                return $priority
            }
        }
    }
    return "MEDIUM"  # Default priority
}

function Estimate-CompletionTime {
    param([string]$TodoText, [string]$Priority)
    
    $complexityIndicators = @{
        "integrate" = 4
        "implement" = 3
        "refactor" = 3
        "optimize" = 2
        "add" = 2
        "fix" = 1
        "update" = 1
        "remove" = 1
    }
    
    $baseTime = switch ($Priority) {
        "CRITICAL" { 8 }
        "HIGH" { 4 }
        "MEDIUM" { 2 }
        "LOW" { 1 }
    }
    
    $complexity = 1
    foreach ($indicator in $complexityIndicators.Keys) {
        if ($TodoText.ToLower() -like "*$indicator*") {
            $complexity = [Math]::Max($complexity, $complexityIndicators[$indicator])
        }
    }
    
    return $baseTime * $complexity
}

function Get-ModuleFromPath {
    param([string]$FilePath)
    
    $pathParts = $FilePath.Split([IO.Path]::DirectorySeparatorChar)
    
    if ($pathParts -contains "api") { return "api" }
    if ($pathParts -contains "components") { return "components" }
    if ($pathParts -contains "features") { return "features" }
    if ($pathParts -contains "lib") { return "lib" }
    if ($pathParts -contains "app") { return "app" }
    if ($pathParts -contains "tests") { return "tests" }
    if ($pathParts -contains "docs") { return "docs" }
    
    return "other"
}

Write-Host "[*] Scanning for TODO comments..." -ForegroundColor Yellow

# Get all relevant files
$FileExtensions = @("*.ts", "*.tsx", "*.js", "*.jsx", "*.md", "*.prisma")
$AllFiles = @()

foreach ($ext in $FileExtensions) {
    $AllFiles += Get-ChildItem -Path $RepoPath -Filter $ext -Recurse -File | Where-Object {
        $_.FullName -notlike "*node_modules*" -and 
        $_.FullName -notlike "*\.next*" -and 
        $_.FullName -notlike "*\.git*"
    }
}

$QualityMetrics.totalFiles = $AllFiles.Count

# Analyze each file for TODOs
foreach ($file in $AllFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    
    $module = Get-ModuleFromPath($file.FullName)
    
    if (-not $QualityMetrics.moduleAnalysis[$module]) {
        $QualityMetrics.moduleAnalysis[$module] = @{
            "files" = 0
            "todos" = @()
            "totalTodos" = 0
            "estimatedHours" = 0
            "riskLevel" = "LOW"
        }
    }
    
    $QualityMetrics.moduleAnalysis[$module].files++
    
    # Find TODO comments
    $todoMatches = [regex]::Matches($content, '(?i)//\s*TODO[:\s](.+)|<!--\s*TODO[:\s](.+)\s*-->', [System.Text.RegularExpressions.RegexOptions]::Multiline)
    
    foreach ($match in $todoMatches) {
        $todoText = if ($match.Groups[1].Success) { $match.Groups[1].Value } else { $match.Groups[2].Value }
        $todoText = $todoText.Trim()
        
        $priority = Analyze-TodoPriority($todoText)
        $estimatedHours = Estimate-CompletionTime($todoText, $priority)
        
        $todoItem = @{
            "file" = $file.Name
            "text" = $todoText
            "priority" = $priority
            "estimatedHours" = $estimatedHours
            "module" = $module
        }
        
        $QualityMetrics.moduleAnalysis[$module].todos += $todoItem
        $QualityMetrics.moduleAnalysis[$module].totalTodos++
        $QualityMetrics.moduleAnalysis[$module].estimatedHours += $estimatedHours
        $QualityMetrics.priorityBreakdown[$priority]++
        $QualityMetrics.totalTodos++
        
        # Assess module risk level
        if ($priority -eq "CRITICAL") {
            $QualityMetrics.moduleAnalysis[$module].riskLevel = "CRITICAL"
        } elseif ($priority -eq "HIGH" -and $QualityMetrics.moduleAnalysis[$module].riskLevel -ne "CRITICAL") {
            $QualityMetrics.moduleAnalysis[$module].riskLevel = "HIGH"
        }
    }
}

# Calculate overall completion estimate
$totalEstimatedHours = 0
$weightedRiskScore = 0

foreach ($module in $QualityMetrics.moduleAnalysis.Keys) {
    $moduleData = $QualityMetrics.moduleAnalysis[$module]
    $totalEstimatedHours += $moduleData.estimatedHours
    
    $moduleWeight = if ($ModuleWeights[$module]) { $ModuleWeights[$module] } else { 0.05 }
    $riskScore = switch ($moduleData.riskLevel) {
        "CRITICAL" { 4 }
        "HIGH" { 3 }
        "MEDIUM" { 2 }
        "LOW" { 1 }
    }
    $weightedRiskScore += $riskScore * $moduleWeight
}

# Estimate completion percentage based on TODO complexity and priority
$criticalWeight = $QualityMetrics.priorityBreakdown.CRITICAL * 4
$highWeight = $QualityMetrics.priorityBreakdown.HIGH * 3
$mediumWeight = $QualityMetrics.priorityBreakdown.MEDIUM * 2
$lowWeight = $QualityMetrics.priorityBreakdown.LOW * 1

$totalWeight = $criticalWeight + $highWeight + $mediumWeight + $lowWeight
$maxPossibleWeight = ($QualityMetrics.totalTodos * 4)  # If all were critical

if ($maxPossibleWeight -gt 0) {
    $complexityRatio = $totalWeight / $maxPossibleWeight
    $QualityMetrics.completionEstimate = [Math]::Round((1 - $complexityRatio) * 100, 2)
} else {
    $QualityMetrics.completionEstimate = 100
}

# Overall risk assessment
$QualityMetrics.riskAssessment = if ($weightedRiskScore -gt 3) { "HIGH" } 
                                elseif ($weightedRiskScore -gt 2) { "MEDIUM" } 
                                else { "LOW" }

# Generate recommendations
$QualityMetrics.recommendations = @()

if ($QualityMetrics.priorityBreakdown.CRITICAL -gt 0) {
    $QualityMetrics.recommendations += "URGENT: Address $($QualityMetrics.priorityBreakdown.CRITICAL) CRITICAL TODOs immediately before production deployment"
}

if ($QualityMetrics.priorityBreakdown.HIGH -gt 5) {
    $QualityMetrics.recommendations += "HIGH PRIORITY: $($QualityMetrics.priorityBreakdown.HIGH) HIGH priority items should be resolved in next sprint"
}

if ($QualityMetrics.moduleAnalysis.api -and $QualityMetrics.moduleAnalysis.api.riskLevel -eq "CRITICAL") {
    $QualityMetrics.recommendations += "API MODULE: Critical issues detected in API layer - highest priority for resolution"
}

if ($totalEstimatedHours -gt 40) {
    $QualityMetrics.recommendations += "TIMELINE: Estimated $totalEstimatedHours hours of work remaining - consider team allocation"
} else {
    $QualityMetrics.recommendations += "TIMELINE: Only $totalEstimatedHours hours estimated - achievable in current sprint"
}

if ($QualityMetrics.totalTodos -lt 30) {
    $QualityMetrics.recommendations += "EXCELLENT: Low TODO count indicates high code maturity"
}

# Output results
Write-Host "`n[*] AI Quality Analysis Complete!" -ForegroundColor Green
Write-Host "Total Files Analyzed: $($QualityMetrics.totalFiles)" -ForegroundColor Cyan
Write-Host "Total TODOs Found: $($QualityMetrics.totalTodos)" -ForegroundColor Yellow
Write-Host "Estimated Completion Time: $totalEstimatedHours hours" -ForegroundColor Magenta
Write-Host "Code Completion Estimate: $($QualityMetrics.completionEstimate)%" -ForegroundColor Green
Write-Host "Risk Assessment: $($QualityMetrics.riskAssessment)" -ForegroundColor $(if ($QualityMetrics.riskAssessment -eq "LOW") { "Green" } else { "Yellow" })

Write-Host "`nPriority Breakdown:" -ForegroundColor Cyan
Write-Host "   CRITICAL: $($QualityMetrics.priorityBreakdown.CRITICAL)" -ForegroundColor Red
Write-Host "   HIGH: $($QualityMetrics.priorityBreakdown.HIGH)" -ForegroundColor Yellow
Write-Host "   MEDIUM: $($QualityMetrics.priorityBreakdown.MEDIUM)" -ForegroundColor Blue
Write-Host "   LOW: $($QualityMetrics.priorityBreakdown.LOW)" -ForegroundColor Green

if ($QualityMetrics.recommendations.Count -gt 0) {
    Write-Host "`nAI Recommendations:" -ForegroundColor Cyan
    foreach ($rec in $QualityMetrics.recommendations) {
        Write-Host "   $rec" -ForegroundColor White
    }
}

# Save detailed JSON report
$QualityMetrics | ConvertTo-Json -Depth 10 | Out-File $OutputPath -Encoding UTF8
Write-Host "`n📄 Detailed report saved to: $OutputPath" -ForegroundColor Green

if ($GenerateReport) {
    # Generate HTML report
    $htmlReport = @"
<!DOCTYPE html>
<html>
<head>
    <title>ForgeVid AI Quality Analysis</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #333; border-bottom: 2px solid #007acc; padding-bottom: 20px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #007acc; }
        .priority-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }
        .priority-card { padding: 15px; border-radius: 8px; text-align: center; color: white; }
        .critical { background: #dc3545; }
        .high { background: #fd7e14; }
        .medium { background: #0dcaf0; }
        .low { background: #198754; }
        .module-analysis { margin: 20px 0; }
        .module-card { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 8px; }
        .recommendations { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .risk-low { color: #198754; }
        .risk-medium { color: #fd7e14; }
        .risk-high { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 ForgeVid AI Quality Analysis</h1>
            <p>Generated on $(Get-Date -Format "MMMM dd, yyyy 'at' HH:mm")</p>
        </div>
        
        <div class="metrics">
            <div class="metric-card">
                <h3>📊 Files Analyzed</h3>
                <h2>$($QualityMetrics.totalFiles)</h2>
            </div>
            <div class="metric-card">
                <h3>📝 Total TODOs</h3>
                <h2>$($QualityMetrics.totalTodos)</h2>
            </div>
            <div class="metric-card">
                <h3>⏱️ Est. Hours</h3>
                <h2>$totalEstimatedHours hrs</h2>
            </div>
            <div class="metric-card">
                <h3>🎯 Completion</h3>
                <h2>$($QualityMetrics.completionEstimate)%</h2>
            </div>
        </div>
        
        <h2>📋 Priority Distribution</h2>
        <div class="priority-grid">
            <div class="priority-card critical">
                <h3>🚨 CRITICAL</h3>
                <h2>$($QualityMetrics.priorityBreakdown.CRITICAL)</h2>
            </div>
            <div class="priority-card high">
                <h3>⚠️ HIGH</h3>
                <h2>$($QualityMetrics.priorityBreakdown.HIGH)</h2>
            </div>
            <div class="priority-card medium">
                <h3>📋 MEDIUM</h3>
                <h2>$($QualityMetrics.priorityBreakdown.MEDIUM)</h2>
            </div>
            <div class="priority-card low">
                <h3>📝 LOW</h3>
                <h2>$($QualityMetrics.priorityBreakdown.LOW)</h2>
            </div>
        </div>
        
        <h2>🏗️ Module Analysis</h2>
        <div class="module-analysis">
"@

    foreach ($module in $QualityMetrics.moduleAnalysis.Keys | Sort-Object) {
        $moduleData = $QualityMetrics.moduleAnalysis[$module]
        $riskClass = "risk-" + $moduleData.riskLevel.ToLower()
        
        $htmlReport += @"
            <div class="module-card">
                <h3>📁 $($module.ToUpper()) Module</h3>
                <p><strong>Files:</strong> $($moduleData.files) | <strong>TODOs:</strong> $($moduleData.totalTodos) | <strong>Est. Hours:</strong> $($moduleData.estimatedHours) | <strong>Risk:</strong> <span class="$riskClass">$($moduleData.riskLevel)</span></p>
            </div>
"@
    }

    $htmlReport += @"
        </div>
        
        <div class="recommendations">
            <h2>💡 AI Recommendations</h2>
            <ul>
"@

    foreach ($rec in $QualityMetrics.recommendations) {
        $htmlReport += "<li>$rec</li>"
    }

    $htmlReport += @"
            </ul>
        </div>
        
        <div style="text-align: center; margin-top: 40px; color: #666;">
            <p>Report generated by ForgeVid AI Quality Scanner v1.0</p>
        </div>
    </div>
</body>
</html>
"@

    $htmlPath = $OutputPath -replace "\.json$", ".html"
    $htmlReport | Out-File $htmlPath -Encoding UTF8
    Write-Host "📊 HTML report generated: $htmlPath" -ForegroundColor Green
}

Write-Host "`nAI Quality Analysis Complete!" -ForegroundColor Magenta