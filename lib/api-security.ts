import { NextRequest, NextResponse } from 'next/server';
import { getClientIP, SecurityAuditLogger } from './security';
import { logger } from './logger';
import Redis from 'ioredis';

// Redis-backed distributed rate limiting
let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!redis && process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableReadyCheck: false,
    });
    redis.on('error', () => {});
  }
  return redis;
}

// Fallback in-memory store (single process only) with TTL cleanup
const memoryStore = new Map<string, { count: number; resetTime: number }>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000; // Clean up expired entries every 60s

function cleanupMemoryStore() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, value] of memoryStore) {
    if (now > value.resetTime) {
      memoryStore.delete(key);
    }
  }
}

interface SecurityConfig {
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  requireAuth?: boolean;
  validateInput?: boolean;
  allowedMethods?: string[];
}

const defaultConfig: SecurityConfig = {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  },
  requireAuth: false,
  validateInput: true,
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE']
};

async function checkDistributedRateLimit(
  key: string,
  maxRequests: number,
  windowSec: number
): Promise<{ allowed: boolean; remaining: number }> {
  const r = getRedis();
  if (r) {
    try {
      const windowKey = `rl:api:${key}:${Math.floor(Date.now() / (windowSec * 1000))}`;
      const current = await r.incr(windowKey);
      if (current === 1) {
        await r.expire(windowKey, windowSec);
      }
      const remaining = Math.max(0, maxRequests - current);
      return { allowed: current <= maxRequests, remaining };
    } catch {
      // Fall through to in-memory
    }
  }

  // Fallback: in-memory
  cleanupMemoryStore();
  const now = Date.now();
  const current = memoryStore.get(key);
  if (!current || now > current.resetTime) {
    memoryStore.set(key, { count: 1, resetTime: now + windowSec * 1000 });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  current.count++;
  memoryStore.set(key, current);
  return { allowed: true, remaining: maxRequests - current.count };
}

export function withSecurity(config: SecurityConfig = {}) {
  const securityConfig = { ...defaultConfig, ...config };

  return function securityWrapper(
    handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>
  ) {
    return async function securedHandler(req: NextRequest, ...args: any[]) {
      try {
        // 1. Method validation
        if (securityConfig.allowedMethods && !securityConfig.allowedMethods.includes(req.method)) {
          SecurityAuditLogger.logSecurityEvent('invalid_method', {
            method: req.method,
            path: req.nextUrl.pathname,
            severity: 'medium'
          });
          return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
        }

        // 2. Rate limiting (distributed via Redis)
        if (securityConfig.rateLimit) {
          const ip = getClientIP(req);
          const windowSec = Math.ceil(securityConfig.rateLimit.windowMs / 1000);
          const result = await checkDistributedRateLimit(
            ip,
            securityConfig.rateLimit.maxRequests,
            windowSec
          );

          if (!result.allowed) {
            SecurityAuditLogger.logSecurityEvent('rate_limit_exceeded', {
              ip,
              path: req.nextUrl.pathname,
              severity: 'high'
            });
            return NextResponse.json(
              { error: 'Too many requests' },
              {
                status: 429,
                headers: {
                  'Retry-After': `${windowSec}`,
                  'X-RateLimit-Limit': `${securityConfig.rateLimit.maxRequests}`,
                  'X-RateLimit-Remaining': '0',
                }
              }
            );
          }
        }

        // 3. Input validation (skip for now - would consume request body)
        // Input validation should be done in individual route handlers after reading body
        // if (securityConfig.validateInput && req.method !== 'GET') {
        //   // Note: Reading req.json() here would consume the body stream
        //   // Validation should be done in route handlers instead
        // }

        // 4. Authentication check — verify actual NextAuth session, not just header presence
        if (securityConfig.requireAuth) {
          const { getServerSession } = await import('next-auth');
          const { authOptions } = await import('@/lib/auth');
          const session = await getServerSession(authOptions);
          if (!session?.user?.id) {
            SecurityAuditLogger.logSecurityEvent('unauthorized_access', {
              path: req.nextUrl.pathname,
              severity: 'high'
            });
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
          }
        }

        // 5. Execute the original handler
        return await handler(req, ...args);

      } catch (error) {
        const detail = error instanceof Error ? (error.stack || error.message) : String(error);
        logger.error('Security middleware error:', detail);
        SecurityAuditLogger.logSecurityEvent('security_middleware_error', {
          path: req.nextUrl.pathname,
          error: error instanceof Error ? error.message : String(error),
          severity: 'high'
        });
        // Diagnostic: surface the real error only when explicitly requested with a
        // debug header (never leaked to normal clients). Remove once stable.
        const expose = req.headers.get('x-debug-errors') === '1';
        return NextResponse.json(
          expose
            ? { error: 'Internal server error', detail }
            : { error: 'Internal server error' },
          { status: 500 },
        );
      }
    };
  };
}

// Predefined security configurations for common use cases
export const securityConfigs = {
  // Public API with basic protection
  public: withSecurity({
    rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
    validateInput: true
  }),

  // Authenticated API with stricter limits
  authenticated: withSecurity({
    rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 50 },
    requireAuth: true,
    validateInput: true
  }),

  // Payment API with strictest protection
  payment: withSecurity({
    rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 20 },
    requireAuth: true,
    validateInput: true,
    allowedMethods: ['POST']
  }),

  // Read-only API
  readOnly: withSecurity({
    rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 200 },
    allowedMethods: ['GET']
  })
};
