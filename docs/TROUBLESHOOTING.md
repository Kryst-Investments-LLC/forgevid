# ForgeVid Troubleshooting Guide

## Table of Contents
1. [Installation Issues](#installation-issues)
2. [Runtime Errors](#runtime-errors)
3. [API Issues](#api-issues)
4. [Database Issues](#database-issues)
5. [Authentication Issues](#authentication-issues)
6. [Performance Issues](#performance-issues)
7. [Browser Compatibility](#browser-compatibility)
8. [Production Deployment](#production-deployment)

## Installation Issues

### Node.js Version Compatibility
**Problem**: `Error: Node.js version not supported`
**Solution**:
```bash
# Check Node.js version
node --version

# Install Node.js 18+ if needed
# Using nvm (recommended)
nvm install 18
nvm use 18

# Or download from nodejs.org
```

### Package Installation Failures
**Problem**: `npm install` fails with dependency conflicts
**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Install with legacy peer deps
npm install --legacy-peer-deps

# Or use yarn instead
yarn install
```

### TypeScript Compilation Errors
**Problem**: TypeScript compilation fails
**Solution**:
```bash
# Check TypeScript version
npx tsc --version

# Update TypeScript
npm install --save-dev typescript@latest

# Check tsconfig.json
npx tsc --noEmit
```

## Runtime Errors

### Jest Test Runner Issues
**Problem**: `jest-environment-jsdom cannot be found`
**Solution**:
```bash
# Install missing dependency
npm install --save-dev jest-environment-jsdom

# Update Jest configuration
# In jest.config.js, ensure:
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
}
```

**Problem**: Tests fail with "TextEncoder is not defined"
**Solution**:
```javascript
// In tests/setup.js, add:
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
```

### Next.js Build Errors
**Problem**: `Module not found` errors during build
**Solution**:
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build

# Check for missing imports
npm run lint
```

**Problem**: `Error: Cannot resolve module`
**Solution**:
```bash
# Check if module is installed
npm list <module-name>

# Install missing module
npm install <module-name>

# Check import paths
# Use absolute imports: import Component from '@/components/Component'
```

### Memory Issues
**Problem**: `JavaScript heap out of memory`
**Solution**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Or in package.json scripts:
"build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
```

## API Issues

### OpenAI API Errors
**Problem**: `Invalid API key` error
**Solution**:
```bash
# Check environment variable
echo $OPENAI_SECRET_KEY

# Verify in .env.local
OPENAI_SECRET_KEY=sk-your-actual-key-here

# Restart development server
npm run dev
```

**Problem**: `Rate limit exceeded`
**Solution**:
```javascript
// Implement exponential backoff
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async (fn, retries = 3) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && error.status === 429) {
      await delay(Math.pow(2, 3 - retries) * 1000);
      return retryWithBackoff(fn, retries - 1);
    }
    throw error;
  }
};
```

**Problem**: `Request timeout`
**Solution**:
```javascript
// Increase timeout in API calls
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
  signal: AbortSignal.timeout(30000) // 30 seconds
});
```

### Stripe Payment Issues
**Problem**: `Invalid Stripe key`
**Solution**:
```bash
# Check Stripe keys
echo $STRIPE_SECRET_KEY
echo $STRIPE_PUBLISHABLE_KEY

# Verify keys are correct for environment
# Test keys start with sk_test_ and pk_test_
# Live keys start with sk_live_ and pk_live_
```

**Problem**: `Webhook signature verification failed`
**Solution**:
```javascript
// Verify webhook endpoint URL
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Check webhook signature
const signature = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
```

## Database Issues

### Connection Errors
**Problem**: `Connection refused` to PostgreSQL
**Solution**:
```bash
# Check if PostgreSQL is running
pg_ctl status

# Start PostgreSQL
pg_ctl start

# Check connection string
echo $DATABASE_URL
# Should be: postgresql://username:password@localhost:5432/database
```

**Problem**: `Database does not exist`
**Solution**:
```bash
# Create database
createdb forgevid

# Or using psql
psql -U postgres -c "CREATE DATABASE forgevid;"

# Run migrations
npx prisma migrate dev
```

### Migration Issues
**Problem**: `Migration failed`
**Solution**:
```bash
# Reset database
npx prisma migrate reset

# Or reset specific migration
npx prisma migrate resolve --applied "migration_name"

# Check migration status
npx prisma migrate status
```

**Problem**: `Schema drift detected`
**Solution**:
```bash
# Generate new migration
npx prisma migrate dev --name fix_schema_drift

# Or push schema changes directly (development only)
npx prisma db push
```

## Authentication Issues

### JWT Token Errors
**Problem**: `Invalid token` error
**Solution**:
```javascript
// Check token expiration
const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
console.log('Token expires:', new Date(decoded.exp * 1000));

// Refresh token if needed
const newToken = jwt.sign(
  { userId: decoded.userId },
  process.env.NEXTAUTH_SECRET,
  { expiresIn: '1h' }
);
```

**Problem**: `Token expired`
**Solution**:
```javascript
// Implement token refresh
const refreshToken = async () => {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${currentToken}` }
  });
  
  if (response.ok) {
    const { token } = await response.json();
    localStorage.setItem('token', token);
    return token;
  }
  
  // Redirect to login if refresh fails
  window.location.href = '/auth/login';
};
```

### NextAuth Configuration Issues
**Problem**: `NextAuth configuration error`
**Solution**:
```javascript
// Check NextAuth configuration
// In pages/api/auth/[...nextauth].js
export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
  },
});
```

## Performance Issues

### Slow Page Loads
**Problem**: Pages load slowly
**Solution**:
```javascript
// Implement lazy loading
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false
});

// Use Next.js Image optimization
import Image from 'next/image';

<Image
  src="/image.jpg"
  alt="Description"
  width={500}
  height={300}
  priority={false}
  placeholder="blur"
/>
```

### Memory Leaks
**Problem**: Memory usage increases over time
**Solution**:
```javascript
// Clean up event listeners
useEffect(() => {
  const handleResize = () => {
    // Handle resize
  };
  
  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);

// Clean up intervals/timeouts
useEffect(() => {
  const interval = setInterval(() => {
    // Do something
  }, 1000);
  
  return () => clearInterval(interval);
}, []);
```

### API Response Times
**Problem**: API calls are slow
**Solution**:
```javascript
// Implement caching
const cache = new Map();

const getCachedData = async (key, fetcher) => {
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const data = await fetcher();
  cache.set(key, data);
  
  // Clear cache after 5 minutes
  setTimeout(() => cache.delete(key), 5 * 60 * 1000);
  
  return data;
};

// Use database indexes
// Add indexes for frequently queried fields
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  createdAt DateTime @default(now())
  
  @@index([email])
  @@index([createdAt])
}
```

## Browser Compatibility

### WebRTC Issues
**Problem**: Voice recording not working
**Solution**:
```javascript
// Check browser support
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  alert('Your browser does not support voice recording');
  return;
}

// Request permissions
try {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // Use stream
} catch (error) {
  console.error('Error accessing microphone:', error);
  // Handle error
}
```

### WebSocket Connection Issues
**Problem**: Real-time features not working
**Solution**:
```javascript
// Check WebSocket support
if (!window.WebSocket) {
  console.error('WebSocket not supported');
  return;
}

// Implement reconnection logic
const connectWebSocket = () => {
  const socket = new WebSocket('ws://localhost:3000');
  
  socket.onopen = () => {
    console.log('Connected to server');
  };
  
  socket.onclose = () => {
    console.log('Connection closed, reconnecting...');
    setTimeout(connectWebSocket, 5000);
  };
  
  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
};
```

## Production Deployment

### Environment Variables
**Problem**: Environment variables not loaded
**Solution**:
```bash
# Check environment variables in production
vercel env ls

# Set environment variables
vercel env add OPENAI_SECRET_KEY
vercel env add DATABASE_URL

# Or in Vercel dashboard:
# Project Settings > Environment Variables
```

### Build Failures
**Problem**: Build fails in production
**Solution**:
```bash
# Test build locally
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Check for ESLint errors
npm run lint

# Check for unused dependencies
npx depcheck
```

### Database Connection Issues
**Problem**: Database connection fails in production
**Solution**:
```javascript
// Use connection pooling
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### CDN Issues
**Problem**: Static assets not loading
**Solution**:
```javascript
// Configure CDN in next.config.js
module.exports = {
  images: {
    domains: ['your-cdn-domain.com'],
    loader: 'custom',
    loaderFile: './lib/imageLoader.js',
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://your-cdn-domain.com' : '',
};
```

## Debugging Tools

### Development Tools
```bash
# Enable debug logging
DEBUG=* npm run dev

# Check bundle size
npm run build && npx @next/bundle-analyzer

# Profile performance
npm run dev -- --profile
```

### Production Monitoring
```javascript
// Add error tracking
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Add performance monitoring
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
```

## Getting Help

### Logs and Debugging
1. Check browser console for client-side errors
2. Check server logs for API errors
3. Use `console.log()` strategically for debugging
4. Enable verbose logging in development

### Common Error Codes
- `400` - Bad Request (check request body)
- `401` - Unauthorized (check authentication)
- `403` - Forbidden (check permissions)
- `404` - Not Found (check URL/endpoint)
- `429` - Too Many Requests (implement rate limiting)
- `500` - Internal Server Error (check server logs)

### Support Channels
- **GitHub Issues**: [github.com/krystinvestments/forgevid/issues](https://github.com/krystinvestments/forgevid/issues)
- **Email Support**: krystinvestments@gmail.com
- **Documentation**: [docs.forgevid.com](https://docs.forgevid.com)

---

**Last Updated**: September 7, 2025
**Version**: 1.0.0
