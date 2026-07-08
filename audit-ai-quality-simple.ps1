# AI Quality Scanner for ForgeVid - Simplified Version
param(
    [string]$RepoPath = ".",
    [string]$OutputPath = ".\quality-analysis.json"
)

Write-Host "[*] Starting AI Quality Analysis..." -ForegroundColor Cyan

# Initialize analysis results
$Analysis = @{
    totalFiles = 0
    totalTodos = 0
    priorityBreakdown = @{
        CRITICAL = 0
        HIGH = 0
        MEDIUM = 0
        LOW = 0
    }
    moduleBreakdown = @{}
    estimatedHours = 0
    completionScore = 0
    recommendations = @()
}

# Define priority keywords
$CriticalKeywords = @("security", "auth", "payment", "database", "production", "deploy", "critical")
$HighKeywords = @("api", "integration", "performance", "error", "validation", "fix", "bug")
$MediumKeywords = @("feature", "enhancement", "optimize", "refactor", "improve")
$LowKeywords = @("comment", "documentation", "cleanup", "style", "format")

function Get-TodoPriority {
    param([string]$TodoText)
    
    $text = $TodoText.ToLower()
    
    foreach ($keyword in $CriticalKeywords) {
        if ($text -like "*$keyword*") { return "CRITICAL" }
    }
    foreach ($keyword in $HighKeywords) {
        if ($text -like "*$keyword*") { return "HIGH" }
    }
    foreach ($keyword in $MediumKeywords) {
        if ($text -like "*$keyword*") { return "MEDIUM" }
    }
    return "LOW"
}

function Get-ModuleFromPath {
    param([string]$Path)
    
    if ($Path -like "*\api\*" -or $Path -like "*/api/*") { return "api" }
    if ($Path -like "*\components\*" -or $Path -like "*/components/*") { return "components" }
    if ($Path -like "*\features\*" -or $Path -like "*/features/*") { return "features" }
    if ($Path -like "*\lib\*" -or $Path -like "*/lib/*") { return "lib" }
    if ($Path -like "*\app\*" -or $Path -like "*/app/*") { return "app" }
    if ($Path -like "*\tests\*" -or $Path -like "*/tests/*") { return "tests" }
    return "other"
}

# Get all source files
$SourceFiles = Get-ChildItem -Path $RepoPath -Include "*.ts", "*.tsx", "*.js", "*.jsx", "*.md" -Recurse | 
    Where-Object { 
        $_.FullName -notlike "*node_modules*" -and 
        $_.FullName -notlike "*\.next*" -and 
        $_.FullName -notlike "*\.git*" 
    }

$Analysis.totalFiles = $SourceFiles.Count
Write-Host "Found $($SourceFiles.Count) source files to analyze..." -ForegroundColor Yellow

# Analyze each file for TODOs
foreach ($file in $SourceFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    
    $module = Get-ModuleFromPath($file.FullName)
    
    if (-not $Analysis.moduleBreakdown[$module]) {
        $Analysis.moduleBreakdown[$module] = @{
            files = 0
            todos = 0
            priorities = @{ CRITICAL = 0; HIGH = 0; MEDIUM = 0; LOW = 0 }
        }
    }
    $Analysis.moduleBreakdown[$module].files++
    
    # Find TODO comments
    $todoPattern = "(?i)//\s*TODO[:\s](.+)|<!--\s*TODO[:\s](.+)\s*-->"
    $matches = [regex]::Matches($content, $todoPattern)
    
    foreach ($match in $matches) {
        $todoText = if ($match.Groups[1].Success) { $match.Groups[1].Value } else { $match.Groups[2].Value }
        $todoText = $todoText.Trim()
        
        $priority = Get-TodoPriority($todoText)
        
        $Analysis.totalTodos++
        $Analysis.priorityBreakdown[$priority]++
        $Analysis.moduleBreakdown[$module].todos++
        $Analysis.moduleBreakdown[$module].priorities[$priority]++
        
        # Estimate hours based on priority
        $hours = switch ($priority) {
            "CRITICAL" { 8 }
            "HIGH" { 4 }
            "MEDIUM" { 2 }
            "LOW" { 1 }
        }
        $Analysis.estimatedHours += $hours
    }
}

# Calculate completion score
$criticalWeight = $Analysis.priorityBreakdown.CRITICAL * 4
$highWeight = $Analysis.priorityBreakdown.HIGH * 3
$mediumWeight = $Analysis.priorityBreakdown.MEDIUM * 2
$lowWeight = $Analysis.priorityBreakdown.LOW * 1

$totalWeight = $criticalWeight + $highWeight + $mediumWeight + $lowWeight
$maxWeight = $Analysis.totalTodos * 4

if ($maxWeight -gt 0) {
    $Analysis.completionScore = [Math]::Round(((1 - ($totalWeight / $maxWeight)) * 100), 1)
} else {
    $Analysis.completionScore = 100
}

# Generate recommendations
if ($Analysis.priorityBreakdown.CRITICAL -gt 0) {
    $Analysis.recommendations += "URGENT: $($Analysis.priorityBreakdown.CRITICAL) CRITICAL TODOs require immediate attention"
}

if ($Analysis.priorityBreakdown.HIGH -gt 5) {
    $Analysis.recommendations += "HIGH: $($Analysis.priorityBreakdown.HIGH) HIGH priority items should be addressed soon"
}

if ($Analysis.estimatedHours -lt 20) {
    $Analysis.recommendations += "TIMELINE: Only $($Analysis.estimatedHours) hours estimated - easily achievable"
} elseif ($Analysis.estimatedHours -lt 40) {
    $Analysis.recommendations += "TIMELINE: $($Analysis.estimatedHours) hours estimated - manageable with focused effort"
} else {
    $Analysis.recommendations += "TIMELINE: $($Analysis.estimatedHours) hours estimated - consider team allocation"
}

if ($Analysis.totalTodos -lt 30) {
    $Analysis.recommendations += "QUALITY: Low TODO count indicates mature codebase"
}

# Display results
Write-Host "`n=== AI QUALITY ANALYSIS RESULTS ===" -ForegroundColor Green
Write-Host "Total Files: $($Analysis.totalFiles)" -ForegroundColor Cyan
Write-Host "Total TODOs: $($Analysis.totalTodos)" -ForegroundColor Yellow
Write-Host "Estimated Hours: $($Analysis.estimatedHours)" -ForegroundColor Magenta
Write-Host "Completion Score: $($Analysis.completionScore)%" -ForegroundColor Green

Write-Host "`nPriority Breakdown:" -ForegroundColor Cyan
Write-Host "  CRITICAL: $($Analysis.priorityBreakdown.CRITICAL)" -ForegroundColor Red
Write-Host "  HIGH: $($Analysis.priorityBreakdown.HIGH)" -ForegroundColor Yellow  
Write-Host "  MEDIUM: $($Analysis.priorityBreakdown.MEDIUM)" -ForegroundColor Blue
Write-Host "  LOW: $($Analysis.priorityBreakdown.LOW)" -ForegroundColor Green

Write-Host "`nModule Breakdown:" -ForegroundColor Cyan
foreach ($module in $Analysis.moduleBreakdown.Keys | Sort-Object) {
    $moduleData = $Analysis.moduleBreakdown[$module]
    Write-Host "  $($module.ToUpper()): $($moduleData.todos) TODOs in $($moduleData.files) files" -ForegroundColor White
}

if ($Analysis.recommendations.Count -gt 0) {
    Write-Host "`nRecommendations:" -ForegroundColor Cyan
    foreach ($rec in $Analysis.recommendations) {
        Write-Host "  - $rec" -ForegroundColor White
    }
}

# Save JSON report
$Analysis | ConvertTo-Json -Depth 5 | Out-File $OutputPath -Encoding UTF8
Write-Host "`nDetailed report saved to: $OutputPath" -ForegroundColor Green

Write-Host "`nAI Quality Analysis Complete!" -ForegroundColor Magenta