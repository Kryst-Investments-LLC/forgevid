import { NextRequest, NextResponse } from 'next/server';

/**
 * Double-submit-cookie CSRF, Edge-compatible.
 *
 * This file runs in Next's EDGE runtime (middleware), which has no Node
 * `crypto` module — importing it 500'd every request the middleware touched,
 * taking the whole site down. Everything here uses Web Crypto
 * (globalThis.crypto), which the Edge runtime provides natively; the HMAC via
 * crypto.subtle is async, so the exported functions are async too.
 */

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.NEXTAUTH_SECRET || '';
const CSRF_TOKEN_BYTES = 32;
const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-csrf' : 'csrf-token';

const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

let hmacKeyPromise: Promise<CryptoKey> | null = null;
function hmacKey(): Promise<CryptoKey> {
  if (!hmacKeyPromise) {
    hmacKeyPromise = crypto.subtle.importKey(
      'raw',
      encoder.encode(CSRF_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
  }
  return hmacKeyPromise;
}

async function hmacHex(message: string): Promise<string> {
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(), encoder.encode(message));
  return toHex(new Uint8Array(signature));
}

/** Constant-time string comparison (both operands hex, same charset). */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Token = randomHex.HMAC(randomHex, secret) — verifiable without server state.
 */
export async function generateCsrfToken(): Promise<{ token: string; cookie: string }> {
  const randomBytes = new Uint8Array(CSRF_TOKEN_BYTES);
  crypto.getRandomValues(randomBytes);
  const random = toHex(randomBytes);
  const token = `${random}.${await hmacHex(random)}`;
  return { token, cookie: token };
}

async function isValidCsrfToken(token: string): Promise<boolean> {
  if (!token || !token.includes('.')) return false;
  const [random, providedHmac] = token.split('.');
  if (!random || !providedHmac) return false;
  const expectedHmac = await hmacHex(random);
  return timingSafeEqualHex(expectedHmac, providedHmac);
}

/**
 * Double-submit validation for state-changing requests.
 * Returns a 403 response to short-circuit with, or null to proceed.
 */
export async function verifyCsrf(req: NextRequest): Promise<NextResponse | null> {
  const method = req.method.toUpperCase();

  // Safe methods don't need CSRF validation; tokens are issued elsewhere.
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return null;
  }

  const headerToken = req.headers.get(CSRF_HEADER);
  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;

  if (!headerToken || !cookieToken) {
    return NextResponse.json({ error: 'CSRF token missing' }, { status: 403 });
  }
  if (headerToken !== cookieToken) {
    return NextResponse.json({ error: 'CSRF token mismatch' }, { status: 403 });
  }
  if (!(await isValidCsrfToken(headerToken))) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  return null;
}

/** Attach a fresh CSRF token cookie + header to a response. */
export async function attachCsrfToken(response: NextResponse): Promise<NextResponse> {
  const { token } = await generateCsrfToken();
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false, // client JS reads it to echo in the x-csrf-token header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60,
  });
  response.headers.set(CSRF_HEADER, token);
  return response;
}
