# ForgeVid Complete Environment Setup Script (PowerShell)
Write-Host "🚀 Setting up ForgeVid Production Environment..." -ForegroundColor Green

# Check Node.js version
Write-Host "🔍 Checking Node.js version..." -ForegroundColor Yellow
$nodeVersion = node -v
$versionNumber = [int]($nodeVersion -replace "v(\d+)\..*", '$1')
if ($versionNumber -lt 18) {
    Write-Host "❌ Node.js 18+ required. Current version: $nodeVersion" -ForegroundColor Red
    Write-Host "Please upgrade Node.js to version 18 or higher" -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
}

# Install AI Dependencies
Write-Host "🎯 Phase 1: Installing AI Dependencies..." -ForegroundColor Cyan
Write-Host "📦 Installing OpenAI and AI processing libraries..." -ForegroundColor Yellow
npm install --save --legacy-peer-deps openai@^4.20.1 @tensorflow/tfjs@^4.10.0 @tensorflow/tfjs-node@^4.10.0 canvas@^2.11.2 sharp@^0.32.6

Write-Host "🎙️ Installing voice synthesis and audio processing..." -ForegroundColor Yellow
npm install --save --legacy-peer-deps fluent-ffmpeg@^2.1.2 jimp@^0.22.10

Write-Host "📝 Installing NLP libraries..." -ForegroundColor Yellow
npm install --save --legacy-peer-deps natural@^6.5.0 sentiment@^5.0.2

# Install Media Processing Dependencies
Write-Host "🎯 Phase 2: Installing Media Processing Dependencies..." -ForegroundColor Cyan
Write-Host "🎥 Installing video processing libraries..." -ForegroundColor Yellow
npm install --save --legacy-peer-deps @aws-sdk/client-s3@^3.400.0 @aws-sdk/s3-request-presigner@^3.400.0

Write-Host "☁️ Installing cloud storage libraries..." -ForegroundColor Yellow
npm install --save --legacy-peer-deps @google-cloud/storage@^7.1.0

# Install Collaboration Dependencies
Write-Host "🎯 Phase 3: Installing Collaboration Dependencies..." -ForegroundColor Cyan
Write-Host "⚡ Installing WebSocket and real-time libraries..." -ForegroundColor Yellow
npm install --save --legacy-peer-deps ws@^8.14.2 yjs@^13.6.7 y-websocket@^1.5.0

Write-Host "👥 Installing presence tracking libraries..." -ForegroundColor Yellow
npm install --save --legacy-peer-deps simple-peer@^9.11.1 peerjs@^1.5.2

# Install Blockchain Dependencies
Write-Host "🎯 Phase 4: Installing Blockchain Dependencies..." -ForegroundColor Cyan
Write-Host "🌐 Installing Ethereum and Web3 libraries..." -ForegroundColor Yellow
npm install --save --legacy-peer-deps ethers@^6.7.1 web3@^4.1.1

Write-Host "🗄️ Installing IPFS and decentralized storage..." -ForegroundColor Yellow
npm install --save --legacy-peer-deps ipfs-http-client@^60.0.1

# Install Analytics Dependencies
Write-Host "🎯 Phase 5: Installing Analytics Dependencies..." -ForegroundColor Cyan
Write-Host "📈 Installing analytics libraries..." -ForegroundColor Yellow
npm install --save --legacy-peer-deps mixpanel@^0.17.0 amplitude-js@^8.21.9

Write-Host "⚡ Installing performance monitoring..." -ForegroundColor Yellow
npm install --save --legacy-peer-deps @sentry/nextjs@^7.74.1 prom-client@^14.2.0

# Generate Prisma client
Write-Host "🗄️ Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate

# Create necessary directories
Write-Host "📁 Creating necessary directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "uploads/videos", "uploads/images", "uploads/audio", "uploads/temp" -Force | Out-Null
New-Item -ItemType Directory -Path "logs/app", "logs/nginx", "logs/error" -Force | Out-Null
New-Item -ItemType Directory -Path "storage/cache", "storage/sessions" -Force | Out-Null
New-Item -ItemType Directory -Path "public/uploads", "public/temp" -Force | Out-Null

Write-Host "✅ Environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 ForgeVid is ready for development!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Copy env.production.example to .env.local" -ForegroundColor White
Write-Host "2. Configure your database connection" -ForegroundColor White
Write-Host "3. Run: npm run db:migrate" -ForegroundColor White
Write-Host "4. Run: npm run db:seed" -ForegroundColor White
Write-Host "5. Run: npm run build && npm run test" -ForegroundColor White
Write-Host ""

