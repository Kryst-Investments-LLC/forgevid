import crypto from 'crypto';

/**
 * Password-reset token helpers.
 *
 * The raw token is emailed to the user and NEVER stored. We keep only its
 * SHA-256 hash in `users.resetTokenHash`, so a database leak cannot be used to
 * reset anyone's password. Tokens are single-use (cleared on success) and
 * short-lived (RESET_TTL_MS).
 */

export const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

/** A URL-safe random token plus its stored hash. Email the raw, store the hash. */
export function createResetToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('base64url');
  return { raw, hash: hashResetToken(raw) };
}

export function hashResetToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/** Constant-time compare of two hex hashes of equal length. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

/** Absolute base URL for links in emails, from whichever env var is set. */
export function appBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_WEBSITE_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}
