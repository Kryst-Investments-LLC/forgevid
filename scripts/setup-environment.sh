#!/bin/bash

# ForgeVid Complete Environment Setup Script
echo "🚀 Setting up ForgeVid Production Environment..."

# Check Node.js version
echo "🔍 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Current version: $(node -v)"
    echo "Please upgrade Node.js to version 18 or higher"
    exit 1
else
    echo "✅ Node.js version: $(node -v)"
fi

# Check PostgreSQL
echo "🔍 Checking PostgreSQL connection..."
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL client found"
else
    echo "❌ PostgreSQL client not found. Please install PostgreSQL"
    exit 1
fi

# Install base dependencies
echo "📦 Installing base dependencies..."
npm install --legacy-peer-deps

# Make scripts executable
chmod +x scripts/*.sh

# Install additional dependencies in phases
echo "🎯 Phase 1: Installing AI Dependencies..."
bash scripts/install-ai-deps.sh

echo "🎯 Phase 2: Installing Media Processing Dependencies..."
bash scripts/install-media-deps.sh

echo "🎯 Phase 3: Installing Collaboration Dependencies..."
bash scripts/install-collaboration-deps.sh

echo "🎯 Phase 4: Installing Blockchain Dependencies..."
bash scripts/install-blockchain-deps.sh

echo "🎯 Phase 5: Installing Analytics Dependencies..."
bash scripts/install-analytics-deps.sh

# Generate Prisma client
echo "🗄️ Generating Prisma client..."
npx prisma generate

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p uploads/{videos,images,audio,temp}
mkdir -p logs/{app,nginx,error}
mkdir -p storage/{cache,sessions}
mkdir -p public/{uploads,temp}

# Set permissions
chmod -R 755 uploads/
chmod -R 755 logs/
chmod -R 755 storage/

echo "✅ Environment setup complete!"
echo ""
echo "🎉 ForgeVid is ready for development!"
echo ""
echo "Next steps:"
echo "1. Copy env.production.example to .env.local"
echo "2. Configure your database connection"
echo "3. Run: npm run db:migrate"
echo "4. Run: npm run db:seed"
echo "5. Run: npm run build && npm run test"
echo ""

