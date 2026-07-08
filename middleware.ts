import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { applySecurity } from './middleware/security';
import { verifyCsrf, attachCsrfToken } from './middleware/csrf';

// Define supported locales
const locales = ['en', 'es', 'hi', 'zh', 'ja', 'fr', 'it', 'ko', 'pt', 'de'];

// Create next-intl middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always' // Always show locale in URL
});

const NEXTAUTH_CSRF_EXEMPT_PREFIXES = [
  '/api/auth/callback',
  '/api/auth/csrf',
  '/api/auth/error',
  '/api/auth/providers',
  '/api/auth/session',
  '/api/auth/signin',
  '/api/auth/signout',
  '/api/auth/verify-request',
];

function isCsrfExemptApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/webhooks/') ||
    NEXTAUTH_CSRF_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for static files, internal routes, and health checks
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/api/health' ||
    pathname === '/api/monitoring/health' ||
    pathname.startsWith('/api/internal/')
  ) {
    return NextResponse.next();
  }

  // Apply security middleware first (rate limiting, security headers)
  const securityResponse = await applySecurity(request);
  if (securityResponse) {
    return securityResponse;
  }

  // Apply CSRF protection on API state-changing requests
  if (pathname.startsWith('/api/') && !isCsrfExemptApiPath(pathname)) {
    const csrfResult = verifyCsrf(request);
    if (csrfResult) {
      return csrfResult;
    }
  }

  // Skip i18n middleware for non-localized routes (dashboard, api, auth, etc.)
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/docs') ||
    pathname.startsWith('/help') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/legal') ||
    pathname.startsWith('/unauthorized') ||
    pathname === '/' ||
    pathname === '/en'
  ) {
    // Attach CSRF token to non-API responses
    const response = NextResponse.next();
    return attachCsrfToken(response);
  }

  // For localized routes, apply i18n middleware
  const intlResponse = intlMiddleware(request);
  return attachCsrfToken(intlResponse as NextResponse);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
