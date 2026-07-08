<#
.SYNOPSIS
    ForgeVid Platform Health & Video Audit Script
.DESCRIPTION
    Comprehensive audit script for ForgeVid platform that checks:
    - Next.js server health and routes
    - API endpoints and integrations
    - Database connectivity (PostgreSQL)
    - Environment variables
    - Video rendering capabilities
    - File system checks
    - AI service integrations (OpenAI, ElevenLabs)
    - Media storage (Cloudinary)
    - Payment system (Stripe)
.PARAMETER GenerateHtmlReport
    Switch to generate an HTML report
.PARAMETER ThresholdPercent
    Minimum percentage of tests that must pass for platform to be considered healthy
.PARAMETER BaseUrl
    Base URL of the ForgeVid platform (default: http://localhost:3000)
.PARAMETER SkipVideoTests
    Skip video-specific tests if not needed
#>

param(
    [switch]$GenerateHtmlReport = $true,
    [int]$ThresholdPercent = 80,
    [string]$BaseUrl = "http://localhost:3000",
    [switch]$SkipVideoTests = $false
)

# --- GLOBAL VARIABLES ---
$Global:Report = @()
$Global:StartTime = Get-Date
$Global:TotalTests = 0
$Global:PassedTests = 0

# --- FORGEVID CONFIGURATION ---
$ForgeVidConfig = @{
    BaseUrl = $BaseUrl
    ApiEndpoints = @(
        "/api/health",
        "/api/auth/status", 
        "/api/videos/list",
        "/api/ai/ping",
        "/api/templates/list",
        "/api/media/test",
        "/api/admin/health"
    )
    CriticalRoutes = @(
        "/",
        "/en", 
        "/dashboard",
        "/dashboard/ai",
        "/dashboard/editor",
        "/dashboard/media",
        "/dashboard/templates",
        "/auth/signin"
    )
    EnvironmentVariables = @(
        "DATABASE_URL",
        "NEXTAUTH_SECRET", 
        "OPENAI_API_KEY",
        "ELEVENLABS_API_KEY",
        "CLOUDINARY_URL",
        "STRIPE_SECRET_KEY"
    )
    TestVideoUrls = @(
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        "https://file-examples.com/storage/fe68c1170c1e56f17e3e93e/2017/10/file_example_MP4_480_1_5MG.mp4"
    )
    DatabaseConfig = @{
        Host = "localhost"
        Port = 5432
        Database = "forgevid_dev"
        Username = "postgres"
        # Password will be detected from environment
    }
}

# --- UTILITY FUNCTIONS ---
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Log-TestResult {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Details = "",
        [string]$Category = "General",
        [int]$ResponseTime = 0
    )
    
    $Global:TotalTests++
    if ($Passed) { $Global:PassedTests++ }
    
    $Global:Report += [PSCustomObject]@{
        Timestamp = (Get-Date)
        Category = $Category
        TestName = $TestName
        Passed = $Passed
        Details = $Details
        ResponseTime = $ResponseTime
        Status = if ($Passed) { "✅ PASS" } else { "❌ FAIL" }
    }

    $color = if ($Passed) { "Green" } else { "Red" }
    $status = if ($Passed) { "✅ PASS" } else { "❌ FAIL" }
    $timeInfo = if ($ResponseTime -gt 0) { " (${ResponseTime}ms)" } else { "" }
    
    Write-ColorOutput "[$status] $TestName$timeInfo$(if($Details) { " - $Details" })" $color
}

# --- TEST FUNCTIONS ---

function Test-ServerStatus {
    Write-ColorOutput "`n🔍 Testing ForgeVid Server Status..." "Cyan"
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri $ForgeVidConfig.BaseUrl -UseBasicParsing -TimeoutSec 10
        $stopwatch.Stop()
        
        if ($response.StatusCode -eq 200) {
            Log-TestResult "Server Availability" $true "Server responding" "Infrastructure" $stopwatch.ElapsedMilliseconds
        } else {
            Log-TestResult "Server Availability" $false "HTTP Status: $($response.StatusCode)" "Infrastructure" $stopwatch.ElapsedMilliseconds
        }
    } catch {
        Log-TestResult "Server Availability" $false $_.Exception.Message "Infrastructure"
    }
}

function Test-CriticalRoutes {
    Write-ColorOutput "`n🗺️ Testing Critical Routes..." "Cyan"
    
    foreach ($route in $ForgeVidConfig.CriticalRoutes) {
        try {
            $url = $ForgeVidConfig.BaseUrl + $route
            $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15
            $stopwatch.Stop()
            
            if ($response.StatusCode -eq 200) {
                Log-TestResult "Route: $route" $true "Loading successfully" "Routes" $stopwatch.ElapsedMilliseconds
            } else {
                Log-TestResult "Route: $route" $false "HTTP Status: $($response.StatusCode)" "Routes" $stopwatch.ElapsedMilliseconds
            }
        } catch {
            Log-TestResult "Route: $route" $false $_.Exception.Message "Routes"
        }
        Start-Sleep -Milliseconds 200
    }
}

function Test-ApiEndpoints {
    Write-ColorOutput "`n🔌 Testing API Endpoints..." "Cyan"
    
    foreach ($endpoint in $ForgeVidConfig.ApiEndpoints) {
        try {
            $url = $ForgeVidConfig.BaseUrl + $endpoint
            $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
            $stopwatch.Stop()
            
            if ($response.StatusCode -eq 200) {
                Log-TestResult "API: $endpoint" $true "API responding" "API" $stopwatch.ElapsedMilliseconds
            } elseif ($response.StatusCode -eq 404) {
                Log-TestResult "API: $endpoint" $false "Endpoint not implemented" "API" $stopwatch.ElapsedMilliseconds
            } else {
                Log-TestResult "API: $endpoint" $false "HTTP Status: $($response.StatusCode)" "API" $stopwatch.ElapsedMilliseconds
            }
        } catch {
            Log-TestResult "API: $endpoint" $false $_.Exception.Message "API"
        }
        Start-Sleep -Milliseconds 100
    }
}

function Test-EnvironmentVariables {
    Write-ColorOutput "`n🔐 Testing Environment Variables..." "Cyan"
    
    # Read .env.local file
    $envPath = Join-Path (Get-Location) ".env.local"
    $envVars = @{}
    
    if (Test-Path $envPath) {
        Log-TestResult "Environment File" $true ".env.local found" "Configuration"
        
        $content = Get-Content $envPath
        foreach ($line in $content) {
            if ($line -match '^([^#=]+)=(.*)$') {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim(' "')
                $envVars[$key] = $value
            }
        }
    } else {
        Log-TestResult "Environment File" $false ".env.local not found" "Configuration"
    }
    
    foreach ($varName in $ForgeVidConfig.EnvironmentVariables) {
        if ($envVars.ContainsKey($varName) -and $envVars[$varName] -ne "") {
            Log-TestResult "Env Var: $varName" $true "Present and configured" "Configuration"
        } else {
            Log-TestResult "Env Var: $varName" $false "Missing or empty" "Configuration"
        }
    }
}

function Test-DatabaseConnectivity {
    Write-ColorOutput "`n🗄️ Testing Database Connectivity..." "Cyan"
    
    try {
        # Check if PostgreSQL service is running
        $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Running" }
        if ($pgService) {
            Log-TestResult "PostgreSQL Service" $true "Service running: $($pgService.Name)" "Database"
        } else {
            Log-TestResult "PostgreSQL Service" $false "No running PostgreSQL service found" "Database"
        }
        
        # Test port connectivity
        $dbConfig = $ForgeVidConfig.DatabaseConfig
        try {
            $tcpClient = New-Object System.Net.Sockets.TcpClient
            $tcpClient.Connect($dbConfig.Host, $dbConfig.Port)
            $tcpClient.Close()
            Log-TestResult "Database Port" $true "Port $($dbConfig.Port) accessible" "Database"
        } catch {
            Log-TestResult "Database Port" $false "Port $($dbConfig.Port) not accessible" "Database"
        }
        
    } catch {
        Log-TestResult "Database Connection Test" $false $_.Exception.Message "Database"
    }
}

function Test-FileSystemIntegrity {
    Write-ColorOutput "`n📁 Testing File System..." "Cyan"
    
    $criticalPaths = @(
        @{ Path = "app"; Type = "Directory"; Description = "Next.js App Directory" },
        @{ Path = "components"; Type = "Directory"; Description = "React Components" },
        @{ Path = "lib"; Type = "Directory"; Description = "Library Files" },
        @{ Path = "package.json"; Type = "File"; Description = "Package Configuration" },
        @{ Path = "next.config.mjs"; Type = "File"; Description = "Next.js Configuration" },
        @{ Path = "prisma/schema.prisma"; Type = "File"; Description = "Database Schema" }
    )
    
    foreach ($item in $criticalPaths) {
        $fullPath = Join-Path (Get-Location) $item.Path
        if (Test-Path $fullPath) {
            Log-TestResult "File System: $($item.Description)" $true "Found at $($item.Path)" "FileSystem"
        } else {
            Log-TestResult "File System: $($item.Description)" $false "Missing: $($item.Path)" "FileSystem"
        }
    }
    
    # Check for common issues
    $nodeModulesPath = Join-Path (Get-Location) "node_modules"
    if (Test-Path $nodeModulesPath) {
        $moduleCount = (Get-ChildItem $nodeModulesPath -Directory | Measure-Object).Count
        Log-TestResult "Dependencies" $true "$moduleCount packages installed" "FileSystem"
    } else {
        Log-TestResult "Dependencies" $false "node_modules not found - run 'npm install'" "FileSystem"
    }
}

function Test-VideoCapabilities {
    if ($SkipVideoTests) {
        Write-ColorOutput "`n📹 Skipping Video Tests (as requested)..." "Yellow"
        return
    }
    
    Write-ColorOutput "`n📹 Testing Video Capabilities..." "Cyan"
    
    foreach ($videoUrl in $ForgeVidConfig.TestVideoUrls) {
        try {
            $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            $response = Invoke-WebRequest -Uri $videoUrl -Method Head -TimeoutSec 15
            $stopwatch.Stop()
            
            if ($response.StatusCode -eq 200) {
                $contentType = $response.Headers["Content-Type"]
                if ($contentType -like "*video*") {
                    Log-TestResult "Video Load Test" $true "Video accessible ($contentType)" "Video" $stopwatch.ElapsedMilliseconds
                } else {
                    Log-TestResult "Video Load Test" $false "Not a video file ($contentType)" "Video" $stopwatch.ElapsedMilliseconds
                }
            } else {
                Log-TestResult "Video Load Test" $false "HTTP Status: $($response.StatusCode)" "Video" $stopwatch.ElapsedMilliseconds
            }
        } catch {
            Log-TestResult "Video Load Test" $false $_.Exception.Message "Video"
        }
    }
}

function Test-AIIntegrations {
    Write-ColorOutput "`n🤖 Testing AI Integrations..." "Cyan"
    
    # Test OpenAI API format
    $openAIKey = (Get-Content ".env.local" | Select-String "OPENAI_API_KEY" | ForEach-Object { $_.ToString().Split('=')[1].Trim('"') })
    if ($openAIKey -and $openAIKey.StartsWith("sk-")) {
        Log-TestResult "OpenAI API Key Format" $true "Key format is valid" "AI"
    } else {
        Log-TestResult "OpenAI API Key Format" $false "Invalid or missing OpenAI key" "AI"
    }
    
    # Test ElevenLabs API format
    $elevenLabsKey = (Get-Content ".env.local" | Select-String "ELEVENLABS_API_KEY" | ForEach-Object { $_.ToString().Split('=')[1].Trim('"') })
    if ($elevenLabsKey -and $elevenLabsKey.StartsWith("sk_")) {
        Log-TestResult "ElevenLabs API Key Format" $true "Key format is valid" "AI"
    } else {
        Log-TestResult "ElevenLabs API Key Format" $false "Invalid or missing ElevenLabs key" "AI"
    }
}

function Test-NodeProcesses {
    Write-ColorOutput "`n⚙️ Testing Node.js Processes..." "Cyan"
    
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Log-TestResult "Node.js Processes" $true "$($nodeProcesses.Count) Node.js process(es) running" "Process"
        
        # Check if port 3000 is in use
        try {
            $portTest = Test-NetConnection -ComputerName "localhost" -Port 3000 -WarningAction SilentlyContinue
            if ($portTest.TcpTestSucceeded) {
                Log-TestResult "Port 3000 Status" $true "Port is active and listening" "Process"
            } else {
                Log-TestResult "Port 3000 Status" $false "Port 3000 not responding" "Process"
            }
        } catch {
            Log-TestResult "Port 3000 Status" $false "Unable to test port connectivity" "Process"
        }
    } else {
        Log-TestResult "Node.js Processes" $false "No Node.js processes found - is 'npm run dev' running?" "Process"
    }
}

# --- REPORT GENERATION ---
function Generate-HtmlReport {
    $reportPath = "ForgeVid_Audit_Report_$(Get-Date -Format 'yyyyMMdd_HHmmss').html"
    
    $passRate = [math]::Round(($Global:PassedTests / $Global:TotalTests) * 100, 1)
    $healthStatus = if ($passRate -ge $ThresholdPercent) { "🟢 HEALTHY" } else { "🔴 NEEDS ATTENTION" }
    
    $html = @"
<!DOCTYPE html>
<html>
<head>
    <title>ForgeVid Platform Audit Report</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #007acc; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #007acc; }
        .summary-card h3 { margin: 0 0 10px 0; color: #333; }
        .summary-card .value { font-size: 24px; font-weight: bold; color: #007acc; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: 600; color: #333; }
        .pass { color: #28a745; font-weight: bold; }
        .fail { color: #dc3545; font-weight: bold; }
        .category { font-weight: bold; padding: 8px; background: #e9ecef; }
        .status-healthy { color: #28a745; font-weight: bold; }
        .status-warning { color: #ffc107; font-weight: bold; }
        .status-error { color: #dc3545; font-weight: bold; }
        .footer { margin-top: 30px; text-align: center; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 ForgeVid Platform Audit Report</h1>
            <p>Generated: $(Get-Date -Format 'MMMM dd, yyyy at HH:mm:ss')</p>
            <p>Platform URL: <strong>$($ForgeVidConfig.BaseUrl)</strong></p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Overall Health</h3>
                <div class="value $(if($passRate -ge $ThresholdPercent){'status-healthy'}else{'status-error'})">$healthStatus</div>
            </div>
            <div class="summary-card">
                <h3>Pass Rate</h3>
                <div class="value">$passRate%</div>
            </div>
            <div class="summary-card">
                <h3>Tests Passed</h3>
                <div class="value">$Global:PassedTests / $Global:TotalTests</div>
            </div>
            <div class="summary-card">
                <h3>Duration</h3>
                <div class="value">$([math]::Round(((Get-Date) - $Global:StartTime).TotalSeconds, 1))s</div>
            </div>
        </div>
        
        <h2>Detailed Test Results</h2>
        <table>
            <thead>
                <tr>
                    <th>Time</th>
                    <th>Category</th>
                    <th>Test Name</th>
                    <th>Status</th>
                    <th>Response Time</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
"@

    $currentCategory = ""
    foreach ($entry in $Global:Report | Sort-Object Category, TestName) {
        if ($entry.Category -ne $currentCategory) {
            $html += "<tr><td colspan='6' class='category'>$($entry.Category)</td></tr>`n"
            $currentCategory = $entry.Category
        }
        
        $statusClass = if ($entry.Passed) { "pass" } else { "fail" }
        $responseTime = if ($entry.ResponseTime -gt 0) { "$($entry.ResponseTime)ms" } else { "-" }
        
        $html += @"
            <tr>
                <td>$($entry.Timestamp.ToString('HH:mm:ss'))</td>
                <td>$($entry.Category)</td>
                <td>$($entry.TestName)</td>
                <td class='$statusClass'>$($entry.Status)</td>
                <td>$responseTime</td>
                <td>$($entry.Details)</td>
            </tr>
"@
    }

    $html += @"
            </tbody>
        </table>
        
        <div class="footer">
            <p>ForgeVid Platform Audit Script v1.0 | Generated by PowerShell</p>
            <p>For support or questions, refer to the platform documentation.</p>
        </div>
    </div>
</body>
</html>
"@

    $html | Out-File -FilePath $reportPath -Encoding UTF8
    Write-ColorOutput "📊 HTML Report generated: $reportPath" "Green"
    
    # Try to open the report
    try {
        Start-Process $reportPath
    } catch {
        Write-ColorOutput "Report saved but couldn't auto-open. Open manually: $reportPath" "Yellow"
    }
}

# --- MAIN EXECUTION ---

Write-ColorOutput "🔍 ForgeVid Platform Comprehensive Audit Starting..." "Cyan"
Write-ColorOutput "=============================================" "DarkCyan"

# Run all test suites
Test-ServerStatus
Test-CriticalRoutes
Test-ApiEndpoints
Test-EnvironmentVariables
Test-DatabaseConnectivity
Test-FileSystemIntegrity
Test-VideoCapabilities
Test-AIIntegrations
Test-NodeProcesses

# Calculate final results
$duration = (Get-Date) - $Global:StartTime
$passRate = [math]::Round(($Global:PassedTests / $Global:TotalTests) * 100, 1)

Write-ColorOutput "`n=============================================" "DarkCyan"
Write-ColorOutput "🎯 AUDIT SUMMARY" "Cyan"
Write-ColorOutput "=============================================" "DarkCyan"
Write-ColorOutput "Total Tests: $Global:TotalTests" "White"
Write-ColorOutput "Passed: $Global:PassedTests" "Green"
Write-ColorOutput "Failed: $($Global:TotalTests - $Global:PassedTests)" "Red"
Write-ColorOutput "Pass Rate: $passRate%" "White"
Write-ColorOutput "Duration: $([math]::Round($duration.TotalSeconds, 1)) seconds" "White"

if ($passRate -ge $ThresholdPercent) {
    Write-ColorOutput "`n🎉 PLATFORM STATUS: HEALTHY ✅" "Green"
    Write-ColorOutput "ForgeVid platform is operating within acceptable parameters." "Green"
} else {
    Write-ColorOutput "`n⚠️  PLATFORM STATUS: NEEDS ATTENTION ❌" "Red"
    Write-ColorOutput "ForgeVid platform has issues that require investigation." "Red"
}

# Generate HTML report if requested
if ($GenerateHtmlReport) {
    Write-ColorOutput "`n📊 Generating detailed HTML report..." "Cyan"
    Generate-HtmlReport
}

Write-ColorOutput "`n✅ ForgeVid Platform Audit Completed!" "Green"
Write-ColorOutput "=============================================" "DarkCyan"

# Exit with appropriate code
if ($passRate -ge $ThresholdPercent) {
    exit 0
} else {
    exit 1
}