# ForgeVid Comprehensive Test Suite
# This script runs all security, performance, and functionality tests

param(
    [string]$Environment = "local"
)

Write-Host "🚀 Starting ForgeVid Comprehensive Test Suite..." -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host ""

# Test results tracking
$passedTests = 0
$totalTests = 0

function Run-Test {
    param(
        [string]$TestName,
        [string]$Command,
        [string]$ExpectedResult = "success"
    )
    
    Write-Host "🧪 Running: $TestName" -ForegroundColor Yellow
    
    try {
        $result = Invoke-Expression $Command
        $totalTests++
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $TestName - PASSED" -ForegroundColor Green
            $passedTests++
        } else {
            Write-Host "❌ $TestName - FAILED (Exit code: $LASTEXITCODE)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ $TestName - ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $totalTests++
    }
    
    Write-Host ""
}

# Create reports directory
if (!(Test-Path "reports")) {
    New-Item -ItemType Directory -Path "reports" | Out-Null
}

Write-Host "🔧 Setting up test environment..." -ForegroundColor Cyan

# Check if server is running
Write-Host "🌐 Checking server status..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Server is running on port 3000" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Server not running on port 3000. Starting server..." -ForegroundColor Yellow
    Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Hidden
    Start-Sleep -Seconds 10
}

Write-Host ""
Write-Host "🔒 Running Security Tests..." -ForegroundColor Cyan

# Security Tests
Run-Test "API Security Test" "npm run test:api:security"
Run-Test "General Security Test" "npm run test:security:custom"

if ($Environment -eq "production") {
    Run-Test "Production Security Test" "npm run test:security:prod"
}

Write-Host "⚡ Running Performance Tests..." -ForegroundColor Cyan

# Performance Tests
Run-Test "Lighthouse Performance" "npx lighthouse http://localhost:3000 --output=html --output-path=reports/lighthouse-report.html --chrome-flags='--headless'"

Write-Host "🧪 Running Functionality Tests..." -ForegroundColor Cyan

# Functionality Tests
Run-Test "TypeScript Compilation" "npx tsc --noEmit"
Run-Test "ESLint Check" "npx eslint . --ext .ts,.tsx,.js,.jsx"
Run-Test "Database Connection" "npx prisma db push"

Write-Host "📊 Running Integration Tests..." -ForegroundColor Cyan

# Integration Tests
Run-Test "API Health Check" "curl -f http://localhost:3000/api/health"
Run-Test "Authentication Test" "curl -f http://localhost:3000/api/auth/session"

Write-Host "🔍 Running Code Quality Tests..." -ForegroundColor Cyan

# Code Quality Tests
Run-Test "Dependency Audit" "npm audit --audit-level=moderate"
Run-Test "Package Security" "npm audit --audit-level=high"

Write-Host ""
Write-Host "📋 Test Summary" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host "✅ Passed: $passedTests" -ForegroundColor Green
Write-Host "❌ Failed: $($totalTests - $passedTests)" -ForegroundColor Red
Write-Host "📊 Total: $totalTests" -ForegroundColor Yellow

Write-Host ""
Write-Host "📄 Reports generated:" -ForegroundColor Green
Write-Host "📄 Security report: reports/security-report.json" -ForegroundColor Green
Write-Host "📄 Performance report: reports/lighthouse-report.html" -ForegroundColor Green

# Exit with appropriate code
if ($passedTests -eq $totalTests) {
    Write-Host "`n🎉 All tests passed! ForgeVid is ready for production." -ForegroundColor Green
    exit 0
} else {
    Write-Host "`nWarning: Some tests failed. Please review the results before deploying." -ForegroundColor Yellow
    exit 1
}