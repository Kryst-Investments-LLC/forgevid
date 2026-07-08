import jwt from 'jsonwebtoken';
import { z } from 'zod';
import Redis from 'ioredis';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REVOCATION_PREFIX = 'jwt:revoked:';

// Typed payload schemas
const accessTokenPayloadSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']),
  organizationId: z.string().nullable().optional(),
  type: z.literal('access'),
});

const refreshTokenPayloadSchema = z.object({
  sub: z.string(),
  type: z.literal('refresh'),
  family: z.string(), // For refresh token rotation detection
});

export type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;
export type RefreshTokenPayload = z.infer<typeof refreshTokenPayloadSchema>;

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!redis && process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableReadyCheck: false,
    });
    redis.on('error', () => {}); // prevent unhandled rejection
  }
  return redis;
}

/**
 * Sign an access token with typed payload.
 */
export function signAccessToken(payload: Omit<AccessTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'access' }, JWT_SECRET!, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    algorithm: 'HS256',
    issuer: 'forgevid',
    audience: 'forgevid-api',
  });
}

/**
 * Sign a refresh token with rotation family tracking.
 */
export function signRefreshToken(userId: string, family?: string): string {
  const crypto = require('crypto');
  return jwt.sign(
    { sub: userId, type: 'refresh', family: family || crypto.randomUUID() },
    JWT_SECRET!,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      algorithm: 'HS256',
      issuer: 'forgevid',
    }
  );
}

/**
 * Verify and decode an access token. Returns typed payload or null.
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!, {
      algorithms: ['HS256'],
      issuer: 'forgevid',
      audience: 'forgevid-api',
    });
    const result = accessTokenPayloadSchema.safeParse(decoded);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * Verify and decode a refresh token. Returns typed payload or null.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!, {
      algorithms: ['HS256'],
      issuer: 'forgevid',
    });
    const result = refreshTokenPayloadSchema.safeParse(decoded);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * Revoke a token by adding its JTI to the Redis blocklist.
 * The entry expires when the token would have expired naturally.
 */
export async function revokeToken(token: string): Promise<boolean> {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded?.exp) return false;

    const r = getRedis();
    if (!r) return false;

    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl <= 0) return true; // already expired

    // Use the token hash as the revocation key
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await r.set(`${REVOCATION_PREFIX}${tokenHash}`, '1', 'EX', ttl);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a token has been revoked.
 */
export async function isTokenRevoked(token: string): Promise<boolean> {
  try {
    const r = getRedis();
    if (!r) return false; // If Redis is down, fail open (consider fail closed in high-security)

    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const revoked = await r.get(`${REVOCATION_PREFIX}${tokenHash}`);
    return revoked === '1';
  } catch {
    return false;
  }
}

// Backward compatibility
export function signToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: '1h', algorithm: 'HS256' });
}

export function verifyToken(token: string): unknown {
  return jwt.verify(token, JWT_SECRET!, { algorithms: ['HS256'] });
}
