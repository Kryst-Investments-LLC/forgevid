<#
.SYNOPSIS
    ForgeVid Quick Health Check
.DESCRIPTION
    Rapid health check for ForgeVid platform - essential tests only
#>

param(
    [string]$BaseUrl = "http://localhost:3000"
)

Write-Host "🚀 ForgeVid Quick Health Check" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor DarkCyan

$tests = 0
$passed = 0

# Test 1: Server Status
Write-Host "`n🔍 Testing server..." -NoNewline
try {
    $response = Invoke-WebRequest -Uri $BaseUrl -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host " ✅ ONLINE" -ForegroundColor Green
        $passed++
    } else {
        Write-Host " ❌ HTTP $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host " ❌ OFFLINE" -ForegroundColor Red
}
$tests++

# Test 2: Critical Routes
$routes = @("/", "/en", "/dashboard")
foreach ($route in $routes) {
    Write-Host "🗺️ Testing $route..." -NoNewline
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl$route" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host " ✅ OK" -ForegroundColor Green
            $passed++
        } else {
            Write-Host " ❌ FAIL" -ForegroundColor Red
        }
    } catch {
        Write-Host " ❌ ERROR" -ForegroundColor Red
    }
    $tests++
}

# Test 3: Environment Variables
Write-Host "🔐 Testing environment..." -NoNewline
if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local" -Raw
    $requiredVars = @("NEXTAUTH_SECRET", "OPENAI_API_KEY", "ELEVENLABS_API_KEY")
    $foundVars = 0
    foreach ($var in $requiredVars) {
        if ($envContent -match "$var=") { $foundVars++ }
    }
    if ($foundVars -eq $requiredVars.Count) {
        Write-Host " ✅ CONFIGURED" -ForegroundColor Green
        $passed++
    } else {
        Write-Host " ⚠️ PARTIAL ($foundVars/$($requiredVars.Count))" -ForegroundColor Yellow
    }
} else {
    Write-Host " ❌ MISSING" -ForegroundColor Red
}
$tests++

# Test 4: Node Process
Write-Host "⚙️ Testing Node.js..." -NoNewline
$nodeProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcess) {
    Write-Host " ✅ RUNNING" -ForegroundColor Green
    $passed++
} else {
    Write-Host " ❌ NOT FOUND" -ForegroundColor Red
}
$tests++

# Summary
$passRate = [math]::Round(($passed / $tests) * 100, 1)
Write-Host "`n==============================" -ForegroundColor DarkCyan
Write-Host "Results: $passed/$tests passed ($passRate%)" -ForegroundColor White

if ($passRate -ge 75) {
    Write-Host "Status: 🟢 HEALTHY" -ForegroundColor Green
} elseif ($passRate -ge 50) {
    Write-Host "Status: 🟡 WARNING" -ForegroundColor Yellow
} else {
    Write-Host "Status: 🔴 CRITICAL" -ForegroundColor Red
}

Write-Host "==============================" -ForegroundColor DarkCyan