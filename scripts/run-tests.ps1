# ForgeVid Comprehensive Test Suite Runner
# PowerShell script for Windows environment

Write-Host "🧪 ForgeVid Test Suite Runner" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Set environment variables for testing
$env:NODE_ENV = "test"
$env:DATABASE_URL = "postgresql://test:test@localhost:5433/forgevid_test"
$env:REDIS_URL = "redis://localhost:6379/1"

# Function to run command and check exit code
function Run-Test {
    param(
        [string]$TestName,
        [string]$Command,
        [string]$WorkingDir = "."
    )
    
    Write-Host "`n🔍 Running: $TestName" -ForegroundColor Yellow
    Write-Host "Command: $Command" -ForegroundColor Gray
    
    try {
        Push-Location $WorkingDir
        Invoke-Expression $Command
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $TestName PASSED" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $TestName FAILED (Exit code: $LASTEXITCODE)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ $TestName ERROR: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    } finally {
        Pop-Location
    }
}

# Test results tracking
$testResults = @{}

Write-Host "`n📋 Test Suite Overview:" -ForegroundColor Magenta
Write-Host "1. Unit Tests (Jest)" -ForegroundColor White
Write-Host "2. Integration Tests" -ForegroundColor White
Write-Host "3. E2E Tests (Playwright)" -ForegroundColor White
Write-Host "4. Load Tests (Artillery)" -ForegroundColor White
Write-Host "5. Security Tests (OWASP ZAP)" -ForegroundColor White
Write-Host "6. Type Checking (TypeScript)" -ForegroundColor White
Write-Host "7. Linting (ESLint)" -ForegroundColor White

# 1. Type Checking
Write-Host "`n🔧 Phase 1: Type Checking" -ForegroundColor Blue
$testResults["TypeCheck"] = Run-Test "TypeScript Type Check" "npx tsc --noEmit"

# 2. Linting
Write-Host "`n🔧 Phase 2: Code Quality" -ForegroundColor Blue
$testResults["Lint"] = Run-Test "ESLint" "npx eslint . --ext .ts,.tsx,.js,.jsx --max-warnings 0"

# 3. Unit Tests
Write-Host "`n🔧 Phase 3: Unit Tests" -ForegroundColor Blue
$testResults["UnitTests"] = Run-Test "Jest Unit Tests" "npm run test -- --coverage --watchAll=false"

# 4. Integration Tests
Write-Host "`n🔧 Phase 4: Integration Tests" -ForegroundColor Blue
$testResults["IntegrationTests"] = Run-Test "API Integration Tests" "npm run test:integration"

# 5. E2E Tests
Write-Host "`n🔧 Phase 5: End-to-End Tests" -ForegroundColor Blue
Write-Host "Installing Playwright browsers..." -ForegroundColor Gray
Run-Test "Playwright Install" "npx playwright install" | Out-Null

$testResults["E2ETests"] = Run-Test "Playwright E2E Tests" "npx playwright test --reporter=html"

# 6. Load Tests
Write-Host "`n🔧 Phase 6: Load Testing" -ForegroundColor Blue
Write-Host "Starting application for load testing..." -ForegroundColor Gray

# Start the application in background
$appProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 10  # Wait for app to start

$testResults["LoadTests"] = Run-Test "Artillery Load Tests" "npx artillery run artillery/load-test.yml --output load-test-report.json"

# Stop the application
Stop-Process -Id $appProcess.Id -Force -ErrorAction SilentlyContinue

# 7. Security Tests
Write-Host "`n🔧 Phase 7: Security Testing" -ForegroundColor Blue
Write-Host "Note: OWASP ZAP requires manual setup" -ForegroundColor Yellow
Write-Host "Run: zap-baseline.py -t http://localhost:3000 -J security-report.json" -ForegroundColor Gray

# 8. Performance Tests
Write-Host "`n🔧 Phase 8: Performance Testing" -ForegroundColor Blue
$testResults["PerformanceTests"] = Run-Test "Lighthouse Performance" "npx lighthouse http://localhost:3000 --output=html --output-path=./reports/lighthouse-report.html --chrome-flags='--headless'"

# 9. Build Test
Write-Host "`n🔧 Phase 9: Build Verification" -ForegroundColor Blue
$testResults["BuildTest"] = Run-Test "Production Build" "npm run build"

# Generate Test Report
Write-Host "`n📊 Test Results Summary" -ForegroundColor Magenta
Write-Host "========================" -ForegroundColor Magenta

$passedTests = 0
$totalTests = $testResults.Count

foreach ($test in $testResults.GetEnumerator()) {
    $status = if ($test.Value) { "✅ PASSED" } else { "❌ FAILED" }
    $color = if ($test.Value) { "Green" } else { "Red" }
    Write-Host "$($test.Key): $status" -ForegroundColor $color
    if ($test.Value) { $passedTests++ }
}

Write-Host "`n📈 Overall Results:" -ForegroundColor Cyan
Write-Host "Passed: $passedTests/$totalTests" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Yellow" })
Write-Host "Success Rate: $([math]::Round(($passedTests / $totalTests) * 100, 2))%" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Yellow" })

# Generate detailed report
$reportData = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    environment = "test"
    results = $testResults
    summary = @{
        total = $totalTests
        passed = $passedTests
        failed = $totalTests - $passedTests
        successRate = [math]::Round(($passedTests / $totalTests) * 100, 2)
    }
}

$reportJson = $reportData | ConvertTo-Json -Depth 3
$reportJson | Out-File -FilePath "test-results.json" -Encoding UTF8

Write-Host "`n📄 Detailed report saved to: test-results.json" -ForegroundColor Green
Write-Host "📄 Coverage report: coverage/lcov-report/index.html" -ForegroundColor Green
Write-Host "📄 E2E report: playwright-report/index.html" -ForegroundColor Green
Write-Host "📄 Load test report: load-test-report.json" -ForegroundColor Green
Write-Host "📄 Performance report: reports/lighthouse-report.html" -ForegroundColor Green

# Exit with appropriate code
if ($passedTests -eq $totalTests) {
    Write-Host "`n🎉 All tests passed! ForgeVid is ready for production." -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n⚠️  Some tests failed. Please review the results before deploying." -ForegroundColor Yellow
    exit 1
}


