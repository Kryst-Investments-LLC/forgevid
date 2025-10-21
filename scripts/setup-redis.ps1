# Redis Setup Script for Windows
# This script helps set up Redis for ForgeVid collaboration

Write-Host "🔧 Setting up Redis for ForgeVid Collaboration..." -ForegroundColor Green

# Check if Docker is installed
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if Docker Compose is available
try {
    $composeVersion = docker-compose --version
    Write-Host "✅ Docker Compose found: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose not found. Please install Docker Desktop with Compose support." -ForegroundColor Red
    exit 1
}

# Start Redis using Docker Compose
Write-Host "🚀 Starting Redis container..." -ForegroundColor Yellow
docker-compose up -d redis

# Wait for Redis to be ready
Write-Host "⏳ Waiting for Redis to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test Redis connection
try {
    $redisTest = docker exec forgevid-redis redis-cli ping
    if ($redisTest -eq "PONG") {
        Write-Host "✅ Redis is running and responding!" -ForegroundColor Green
        Write-Host "📊 Redis Management UI: http://localhost:8081" -ForegroundColor Cyan
        Write-Host "🔌 Redis Connection: localhost:6379" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Redis is not responding properly" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed to connect to Redis" -ForegroundColor Red
    Write-Host "Try running: docker-compose logs redis" -ForegroundColor Yellow
}

Write-Host "`n🎉 Redis setup complete!" -ForegroundColor Green
Write-Host "You can now start the collaboration server with: npm run collaboration:dev" -ForegroundColor Cyan
