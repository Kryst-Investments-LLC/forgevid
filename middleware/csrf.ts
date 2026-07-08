import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.NEXTAUTH_SECRET || '';
const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-csrf' : 'csrf-token';

/**
 * Generate a cryptographically secure CSRF token using the double-submit cookie pattern.
 * Token = randomBytes || HMAC(randomBytes, secret)
 */
export function generateCsrfToken(): { token: string; cookie: string } {
  const random = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  const hmac = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(random)
    .digest('hex');
  const token = `${random}.${hmac}`;
  return { token, cookie: token };
}

/**
 * Verify a CSRF token against its HMAC signature.
 */
function isValidCsrfToken(token: string): boolean {
  if (!token || !token.includes('.')) return false;
  const [random, providedHmac] = token.split('.');
  if (!random || !providedHmac) return false;

  const expectedHmac = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(random)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  if (expectedHmac.length !== providedHmac.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expectedHmac, 'hex'),
    Buffer.from(providedHmac, 'hex')
  );
}

/**
 * Double-submit cookie CSRF middleware.
 * - On GET requests: sets a CSRF cookie + returns the token header.
 * - On state-changing requests (POST/PUT/DELETE/PATCH): validates that
 *   the header token matches the cookie token and both are valid HMACs.
 */
export function verifyCsrf(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();

  // Safe methods don't need CSRF validation, but we issue a token
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return null; // no blocking, token is set elsewhere
  }

  // State-changing methods: validate double submit
  const headerToken = req.headers.get(CSRF_HEADER);
  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;

  if (!headerToken || !cookieToken) {
    return NextResponse.json(
      { error: 'CSRF token missing' },
      { status: 403 }
    );
  }

  // Both tokens must match (double-submit)
  if (headerToken !== cookieToken) {
    return NextResponse.json(
      { error: 'CSRF token mismatch' },
      { status: 403 }
    );
  }

  // Token must be cryptographically valid
  if (!isValidCsrfToken(headerToken)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }

  return null; // valid — proceed
}

/**
 * Attach a CSRF token cookie to a response.
 */
export function attachCsrfToken(response: NextResponse): NextResponse {
  const { token } = generateCsrfToken();
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false, // Client JS needs to read it for the header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60, // 1 hour
  });
  response.headers.set(CSRF_HEADER, token);
  return response;
}