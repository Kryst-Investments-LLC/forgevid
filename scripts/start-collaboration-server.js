#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting ForgeVid Collaboration Server...\n');

// Check if server directory exists
const serverDir = path.join(__dirname, '..', 'server');
if (!fs.existsSync(serverDir)) {
  console.error('❌ Server directory not found. Please run this from the project root.');
  process.exit(1);
}

// Check if package.json exists in server directory
const packageJsonPath = path.join(serverDir, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Server package.json not found. Please install dependencies first.');
  process.exit(1);
}

// Install server dependencies if node_modules doesn't exist
const nodeModulesPath = path.join(serverDir, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing server dependencies...');
  const install = spawn('npm', ['install'], {
    cwd: serverDir,
    stdio: 'inherit',
    shell: true
  });

  install.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Server dependencies installed successfully');
      startServer();
    } else {
      console.error('❌ Failed to install server dependencies');
      process.exit(1);
    }
  });
} else {
  startServer();
}

function startServer() {
  console.log('🔧 Starting collaboration server...');
  
  // Set environment variables
  const env = {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development',
    COLLABORATION_PORT: process.env.COLLABORATION_PORT || '3001',
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: process.env.REDIS_PORT || '6379',
    JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000'
  };

  const server = spawn('node', ['collaboration-server.js'], {
    cwd: serverDir,
    stdio: 'inherit',
    shell: true,
    env
  });

  server.on('close', (code) => {
    console.log(`\n🔌 Collaboration server exited with code ${code}`);
  });

  server.on('error', (err) => {
    console.error('❌ Failed to start collaboration server:', err);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down collaboration server...');
    server.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down collaboration server...');
    server.kill('SIGTERM');
  });
}
