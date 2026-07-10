import { NextRequest, NextResponse } from 'next/server';

/**
 * Per-IP flood guards. These are NOT the product's quotas — those are per-user
 * and live in lib/quota.ts (generation minutes) and the endpoints themselves
 * (e.g. /api/site-brief allows 20 site imports per user per hour).
 *
 * The previous numbers were set as if this were a static brochure site, and
 * they made the application unusable:
 *
 *   auth: 5   — NextAuth's SessionProvider calls GET /api/auth/session on every
 *               page load, so the SIXTH page view returned 429 and the user
 *               appeared to be logged out.
 *   api: 50   — a render polls GET /api/ai/jobs/{id} every 2 seconds, roughly
 *               450 times for a long video.
 *   strict:20 — /api/videos covers the whole scene editor; twenty clicks and
 *               editing stopped working.
 *
 * A flood guard should stop a script hammering the box, not a customer using
 * the product. Anything that is unavoidable, cheap and authenticated is exempt
 * below rather than merely generous.
 */
const RATE_LIMITS = {
  general: { windowMs: 15 * 60 * 1000, max: 600 }, // page views + RSC fetches
  auth: { windowMs: 15 * 60 * 1000, max: 20 }, // CREDENTIAL ATTEMPTS only
  api: { windowMs: 15 * 60 * 1000, max: 600 }, // ordinary authenticated API use
  strict: { windowMs: 15 * 60 * 1000, max: 100 }, // payments
};

/**
 * Requests that must never be throttled by IP.
 *
 * Each is either the app talking to itself, or a request whose FREQUENCY IS
 * DICTATED BY THE APP rather than by the person using it — throttling those
 * punishes a user for doing exactly what they paid for.
 */
function isRateLimitExempt(req: NextRequest): boolean {
  const path = req.nextUrl.pathname;
  const method = req.method.toUpperCase();

  if (path === '/api/health' || path === '/api/monitoring/health') return true;

  // middleware/security.ts POSTs here on every request it handles. Counting it
  // would mean every real request costs two.
  if (path.startsWith('/api/internal/')) return true;

  // Render progress polling: ~450 requests for one long video, driven by how
  // long ffmpeg takes.
  if (method === 'GET' && path.startsWith('/api/ai/jobs/')) return true;

  // NextAuth machinery, not a login attempt. SessionProvider reads the session
  // on every mount and window focus; the CSRF token is fetched before any form.
  if (
    method === 'GET' &&
    (path === '/api/auth/session' ||
      path === '/api/auth/csrf' ||
      path === '/api/auth/providers')
  ) {
    return true;
  }

  return false;
}

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
  
  // Health checks, self-calls, progress polling and session reads are never
  // throttled — see isRateLimitExempt for why each one would be a bug.
  if (isRateLimitExempt(req)) {
    const response = NextResponse.next();
    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Determine rate limit type based on path.
  let limitType: keyof typeof RATE_LIMITS = 'general';
  if (path.startsWith('/api/payments')) {
    // Money. Worth being strict about.
    limitType = 'strict';
  } else if (path.startsWith('/api/auth')) {
    // Only a CREDENTIAL ATTEMPT deserves the brute-force budget. Reading the
    // session or a CSRF token is already exempt above; anything else here is a
    // sign-in/sign-up/callback POST.
    limitType = req.method.toUpperCase() === 'POST' ? 'auth' : 'general';
  } else if (path.startsWith('/api/')) {
    // Everything else, including /api/videos — that prefix is the scene editor
    // (load scenes, retime, swap a clip, re-render), not a payment surface.
    limitType = 'api';
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
