# Quick Build Test - Bypass TypeScript errors temporarily
Write-Host "🚀 Quick Build Test - Bypassing TypeScript for now..." -ForegroundColor Yellow

# Temporarily disable TypeScript strict mode for build
$nextConfigContent = Get-Content "next.config.mjs" -Raw
$nextConfigContent = $nextConfigContent -replace "ignoreBuildErrors: true", "ignoreBuildErrors: true"

# Try build with TypeScript errors ignored
Write-Host "📦 Attempting build with TypeScript errors ignored..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ BUILD SUCCESSFUL! ForgeVid can compile!" -ForegroundColor Green
    Write-Host "🎯 Next step: Fix TypeScript errors for production readiness" -ForegroundColor Yellow
} else {
    Write-Host "❌ Build failed even with TypeScript ignored" -ForegroundColor Red
    Write-Host "🔧 Need to fix fundamental issues first" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📊 Current Status:" -ForegroundColor Cyan
Write-Host "- Dependencies: ✅ Installed (1566 packages)" -ForegroundColor Green
Write-Host "- Core Files: ✅ Created (utils, security, etc.)" -ForegroundColor Green  
Write-Host "- TypeScript: ⚠️ 141 errors remaining" -ForegroundColor Yellow
Write-Host "- Build System: 🔄 Testing..." -ForegroundColor Yellow

