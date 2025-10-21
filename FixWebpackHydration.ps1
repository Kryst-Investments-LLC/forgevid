Write-Host "🧹 Cleaning project directories..."

# Navigate to your project folder
Set-Location "C:\Users\yanp0\OneDrive\Documentos\proyectos\forgevid"

# Remove node_modules and build artifacts
Remove-Item -Recurse -Force "node_modules", ".next", "dist", "build"
Remove-Item -Force "package-lock.json", "yarn.lock"

# Clear npm cache
npm cache clean --force

Write-Host "📦 Reinstalling dependencies..."
npm install

Write-Host "🔧 Rebuilding project..."
npm run build

Write-Host "🚀 Starting development server..."
npm run dev
