$testUrls = @(
    "http://localhost:3000/api/test?q=hello",
    "http://localhost:3000/api/test?q=' OR '1'='1",
    "http://localhost:3000/api/test?q=<script>alert('xss')</script>",
    "http://localhost:3000/api/test?q=../../../etc/passwd"
)

foreach ($url in $testUrls) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -ErrorAction Stop
        Write-Host "[$($r.StatusCode)] $url" -ForegroundColor Green
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        Write-Host "[$status] $url" -ForegroundColor Yellow
    }
}

