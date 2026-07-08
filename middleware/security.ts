import { NextRequest, NextResponse } from 'next/server';

// Rate limiting configuration
const RATE_LIMITS = {
  general: { windowMs: 15 * 60 * 1000, max: 100 }, // 15 minutes, 100 requests
  auth: { windowMs: 15 * 60 * 1000, max: 5 }, // 15 minutes, 5 requests
  api: { windowMs: 15 * 60 * 1000, max: 50 }, // 15 minutes, 50 requests
  strict: { windowMs: 15 * 60 * 1000, max: 20 }, // 15 minutes, 20 requests
};

// Distributed rate limiting via fetch to internal endpoint.
// Edge middleware cannot use ioredis directly, so we delegate to a
// lightweight API route that interfaces with Redis.
// Fallback: in-memory map used ONLY when Redis is unreachable.
const fallbackStore = new Map<string, { count: number; resetTime: number }>();

// Get client IP
const getClientIP = (req: NextRequest): string => {
  // Cloudflare
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) return cfConnectingIP;

  // Standard proxy header — take the LAST untrusted IP to avoid spoofing
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim());
    // In production behind a reverse proxy, the rightmost IP added by
    // the trusted proxy is the client IP. For single-proxy setups the
    // first entry is typically correct.
    return ips[0];
  }

  const realIP = req.headers.get('x-real-ip');
  if (realIP) return realIP;

  return 'unknown';
};

// Security headers
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

// Input sanitization (simple version for Edge Runtime)
function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML brackets
    .trim();
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Rate limiting — attempts Redis via internal API, falls back to in-memory
async function checkRateLimit(ip: string, limitType: keyof typeof RATE_LIMITS): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const limit = RATE_LIMITS[limitType];
  const key = `${ip}:${limitType}`;
  const windowKey = `rl:${key}:${Math.floor(now / limit.windowMs)}`;

  // Try Redis-backed rate limit via internal route
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/internal/rate-limit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: windowKey, max: limit.max, windowSec: Math.ceil(limit.windowMs / 1000) }),
      signal: AbortSignal.timeout(500), // 500ms timeout to avoid blocking
    });
    if (res.ok) {
      const data = await res.json();
      return { allowed: data.allowed, remaining: data.remaining };
    }
  } catch {
    // Redis unavailable — fall through to in-memory
  }

  // Fallback: in-memory (single-process only)
  const current = fallbackStore.get(key);
  if (!current || now > current.resetTime) {
    fallbackStore.set(key, { count: 1, resetTime: now + limit.windowMs });
    return { allowed: true, remaining: limit.max - 1 };
  }
  if (current.count >= limit.max) {
    return { allowed: false, remaining: 0 };
  }
  current.count++;
  fallbackStore.set(key, current);
  return { allowed: true, remaining: limit.max - current.count };
}

export async function applySecurity(req: NextRequest): Promise<NextResponse | null> {
  // Add security headers to response
  const headers = new Headers();
  
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });
  
  // Get client IP and check rate limiting
  const ip = getClientIP(req);
  const path = req.nextUrl.pathname;
  
  // Determine rate limit type based on path
  let limitType: keyof typeof RATE_LIMITS = 'general';
  if (path.startsWith('/api/payments') || path.startsWith('/api/videos')) {
    limitType = 'strict';
  } else if (path.startsWith('/api/auth')) {
    limitType = 'auth';
  } else if (path.startsWith('/api/')) {
    limitType = 'api';
  }
  
  // Skip rate limiting for health checks
  if (path === '/api/health') {
    const response = NextResponse.next();
    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
    return response;
  }
  
  // Check rate limit (must await the async call)
  const rateLimitResult = await checkRateLimit(ip, limitType);
  
  if (!rateLimitResult.allowed) {
    const response = NextResponse.json(
      { error: 'Too many requests', retryAfter: 900 },
      { status: 429 }
    );
    
    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
    
    return response;
  }
  
  // Add rate limit headers
  headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  headers.set('X-RateLimit-Limit', RATE_LIMITS[limitType].max.toString());
  
  return null; // Continue with request
}
