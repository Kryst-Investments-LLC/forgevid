import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/middleware/rate-limit';
import { auditLogger, extractRequestInfo } from '@/lib/audit-log';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const { ipAddress, userAgent } = extractRequestInfo(req);
  
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success) {
      await auditLogger.logSecurityEvent('rate_limit_exceeded', {
        ipAddress,
        userAgent,
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining
      }, 'medium');

      return NextResponse.json({ 
        error: 'Rate limit exceeded',
        limit: rateLimitResult.limit,
        reset: rateLimitResult.reset,
        remaining: rateLimitResult.remaining
      }, { status: 429 });
    }

    // CSRF protection for state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      // CSRF validation would go here
      const isValidCSRF = true; // Placeholder
      if (!isValidCSRF) {
        await auditLogger.logSecurityEvent('csrf_token_invalid', {
          ipAddress,
          userAgent,
          method: req.method,
          url: req.url
        }, 'high');

        return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
      }
    }

    // Security headers (enterprise-grade)
    const response = NextResponse.next();
    
    // Basic security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
    
    // HSTS for HTTPS
    if (req.nextUrl.protocol === 'https:') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    // Content Security Policy
    response.headers.set('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel-insights.com *.vercel-analytics.com",
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
      "font-src 'self' fonts.gstatic.com",
      "img-src 'self' data: blob: *.amazonaws.com *.cloudinary.com",
      "media-src 'self' blob: *.amazonaws.com *.cloudinary.com",
      "connect-src 'self' *.vercel-insights.com *.vercel-analytics.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '));

    // Log security event
    await auditLogger.logSecurityEvent('request_processed', {
      ipAddress,
      userAgent,
      method: req.method,
      url: req.url,
      rateLimitRemaining: rateLimitResult.remaining
    }, 'medium');

    return response;

  } catch (error) {
    console.error('Security middleware error:', error);
    
    await auditLogger.logSecurityEvent('middleware_error', {
      ipAddress,
      userAgent,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'high');

    return NextResponse.json({ error: 'Security check failed' }, { status: 500 });
  }
}

export const config = { 
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/admin/:path*'
  ]
};
