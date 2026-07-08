import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 1000,
      enableReadyCheck: false,
    });
    redis.on('error', () => {
      // Silently handle — callers check for failures
    });
  }
  return redis;
}

/**
 * Internal rate-limit endpoint used by Edge middleware.
 * Uses Redis INCR + EXPIRE for distributed, atomic rate limiting.
 *
 * Body: { key: string, max: number, windowSec: number }
 * Returns: { allowed: boolean, remaining: number, current: number }
 */
export async function POST(request: NextRequest) {
  // Only allow internal calls (no external/browser access)
  // Server-to-server fetch (from Edge middleware) does not set an Origin header.
  // If Origin is present it must exactly match the host.
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const { key, max, windowSec } = await request.json();

    if (!key || !max || !windowSec) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const r = getRedis();
    const current = await r.incr(key);

    if (current === 1) {
      await r.expire(key, windowSec);
    }

    const allowed = current <= max;
    const remaining = Math.max(0, max - current);

    return NextResponse.json({ allowed, remaining, current });
  } catch {
    // Redis unavailable — allow the request (fail open with warning)
    return NextResponse.json({ allowed: true, remaining: 999, current: 0, fallback: true });
  }
}
