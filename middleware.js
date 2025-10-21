import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import { getClientIP, SecurityAuditLogger } from './lib/security';
// Define supported locales
const locales = ['en', 'es', 'hi', 'zh', 'ja', 'fr', 'it', 'ko', 'pt', 'de'];
// Create next-intl middleware
const intlMiddleware = createMiddleware({
    locales,
    defaultLocale: 'en',
    localePrefix: 'always' // Always show locale in URL
});
// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map();
function rateLimit(ip) {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 100;
    const current = rateLimitStore.get(ip);
    if (!current || now > current.resetTime) {
        rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
        return true;
    }
    if (current.count >= maxRequests) {
        return false;
    }
    current.count++;
    return true;
}
export function middleware(request) {
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    const pathname = request.nextUrl.pathname;
    // Skip middleware for static files and API health checks
    if (pathname.startsWith('/_next/') ||
        pathname.startsWith('/static/') ||
        pathname.startsWith('/favicon.ico') ||
        pathname === '/api/health') {
        return NextResponse.next();
    }
    // Skip i18n middleware for non-localized routes (dashboard, api, auth, etc.)
    if (pathname.startsWith('/api/') ||
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/auth/') ||
        pathname.startsWith('/admin') ||
        pathname.startsWith('/docs') ||
        pathname.startsWith('/help') ||
        pathname.startsWith('/privacy') ||
        pathname.startsWith('/terms') ||
        pathname.startsWith('/legal') ||
        pathname.startsWith('/unauthorized') ||
        pathname === '/' || // Root path handling
        pathname === '/en' // This is the static /en route we have
    ) {
        // Apply security middleware only
        if (!rateLimit(ip)) {
            SecurityAuditLogger.logSecurityEvent('rate_limit_exceeded', {
                ip,
                userAgent,
                severity: 'medium',
                data: { path: pathname }
            });
            return new NextResponse('Too Many Requests', {
                status: 429,
                headers: {
                    'Retry-After': '900',
                    'X-RateLimit-Limit': '100',
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': new Date(Date.now() + 15 * 60 * 1000).toISOString()
                }
            });
        }
        const response = NextResponse.next();
        // Add security headers
        response.headers.set('X-DNS-Prefetch-Control', 'on');
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('X-XSS-Protection', '1; mode=block');
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
        // CSP header
        response.headers.set('Content-Security-Policy', `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com *.vercel-insights.com *.vercel-analytics.com;
      style-src 'self' 'unsafe-inline' fonts.googleapis.com;
      font-src 'self' fonts.gstatic.com;
      img-src 'self' data: blob: *.amazonaws.com *.cloudinary.com;
      media-src 'self' blob: *.amazonaws.com *.cloudinary.com;
      connect-src 'self' ws://localhost:3001 *.vercel-insights.com *.vercel-analytics.com;
      frame-ancestors 'none';
      base-uri 'self';
      form-action 'self';
    `.replace(/\s+/g, ' ').trim());
        // HSTS header (only for HTTPS)
        if (request.headers.get('x-forwarded-proto') === 'https') {
            response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }
        // Log suspicious activity
        if (pathname.includes('..') || pathname.includes('<') || pathname.includes('>')) {
            SecurityAuditLogger.logSecurityEvent('suspicious_path', {
                ip,
                userAgent,
                severity: 'high',
                data: { path: pathname }
            });
        }
        return response;
    }
    // For localized routes, apply i18n middleware first
    const intlResponse = intlMiddleware(request);
    // Apply security headers to i18n response
    if (intlResponse) {
        intlResponse.headers.set('X-DNS-Prefetch-Control', 'on');
        intlResponse.headers.set('X-Frame-Options', 'DENY');
        intlResponse.headers.set('X-Content-Type-Options', 'nosniff');
        intlResponse.headers.set('X-XSS-Protection', '1; mode=block');
        intlResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        intlResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
    }
    return intlResponse;
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
