import { NextRequest, NextResponse } from 'next/server';
import { Redis } from 'ioredis';

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
  onLimitReached?: (req: NextRequest, res: NextResponse) => void;
}

// Default rate limit configurations
const RATE_LIMITS = {
  // API endpoints
  api: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    skipSuccessfulRequests: false
  },
  
  // Authentication endpoints
  auth: {
    windowMs: 900000, // 15 minutes
    maxRequests: 5,
    skipSuccessfulRequests: false
  },
  
  // Collaboration endpoints
  collaboration: {
    windowMs: 60000, // 1 minute
    maxRequests: 30,
    skipSuccessfulRequests: false
  },
  
  // Video processing
  video: {
    windowMs: 3600000, // 1 hour
    maxRequests: 10,
    skipSuccessfulRequests: false
  },
  
  // File uploads
  upload: {
    windowMs: 3600000, // 1 hour
    maxRequests: 20,
    skipSuccessfulRequests: false
  }
};

class RateLimiter {
  private redis: Redis;
  private configs: Map<string, RateLimitConfig>;

  constructor(redis: Redis) {
    this.redis = redis;
    this.configs = new Map();
    
    // Initialize default configurations
    Object.entries(RATE_LIMITS).forEach(([key, config]) => {
      this.configs.set(key, config);
    });
  }

  // Register a custom rate limit configuration
  registerConfig(name: string, config: RateLimitConfig): void {
    this.configs.set(name, config);
  }

  // Check if request is within rate limit
  async checkLimit(
    req: NextRequest, 
    configName: string = 'api',
    customKey?: string
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    totalHits: number;
  }> {
    const config = this.configs.get(configName);
    if (!config) {
      throw new Error(`Rate limit configuration '${configName}' not found`);
    }

    const key = customKey || this.generateKey(req, config);
    const window = Math.floor(Date.now() / config.windowMs);
    const redisKey = `rate_limit:${configName}:${key}:${window}`;

    // Get current count
    const current = await this.redis.incr(redisKey);
    
    // Set expiration if this is the first request in the window
    if (current === 1) {
      await this.redis.expire(redisKey, Math.ceil(config.windowMs / 1000));
    }

    const remaining = Math.max(0, config.maxRequests - current);
    const resetTime = (window + 1) * config.windowMs;

    return {
      allowed: current <= config.maxRequests,
      remaining,
      resetTime,
      totalHits: current
    };
  }

  // Middleware for Next.js API routes
  createMiddleware(configName: string = 'api') {
    return async (req: NextRequest): Promise<NextResponse | null> => {
      try {
        const result = await this.checkLimit(req, configName);
        
        if (!result.allowed) {
          const response = NextResponse.json(
            {
              error: 'Too Many Requests',
              message: 'Rate limit exceeded. Please try again later.',
              retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
            },
            { status: 429 }
          );

          // Add rate limit headers
          response.headers.set('X-RateLimit-Limit', this.configs.get(configName)!.maxRequests.toString());
          response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
          response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
          response.headers.set('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString());

          return response;
        }

        // Add rate limit headers to successful responses
        const response = NextResponse.next();
        response.headers.set('X-RateLimit-Limit', this.configs.get(configName)!.maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
        response.headers.set('X-RateLimit-Reset', result.resetTime.toString());

        return response;
      } catch (error) {
        console.error('Rate limiting error:', error);
        return NextResponse.next(); // Allow request on error
      }
    };
  }

  // Generate rate limit key based on request
  private generateKey(req: NextRequest, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }

    // Default key generation
    const ip = this.getClientIP(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const endpoint = req.nextUrl.pathname;
    
    return `${ip}:${endpoint}:${userAgent.slice(0, 50)}`;
  }

  // Get client IP address
  private getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    const cfConnectingIP = req.headers.get('cf-connecting-ip');
    
    if (cfConnectingIP) return cfConnectingIP;
    if (realIP) return realIP;
    if (forwarded) return forwarded.split(',')[0].trim();
    
    return 'unknown';
  }

  // Get rate limit status for a key
  async getStatus(key: string, configName: string = 'api'): Promise<{
    remaining: number;
    resetTime: number;
    totalHits: number;
  }> {
    const config = this.configs.get(configName);
    if (!config) {
      throw new Error(`Rate limit configuration '${configName}' not found`);
    }

    const window = Math.floor(Date.now() / config.windowMs);
    const redisKey = `rate_limit:${configName}:${key}:${window}`;
    
    const current = await this.redis.get(redisKey);
    const totalHits = current ? parseInt(current) : 0;
    const remaining = Math.max(0, config.maxRequests - totalHits);
    const resetTime = (window + 1) * config.windowMs;

    return {
      remaining,
      resetTime,
      totalHits
    };
  }

  // Reset rate limit for a key
  async resetLimit(key: string, configName: string = 'api'): Promise<void> {
    const config = this.configs.get(configName);
    if (!config) {
      throw new Error(`Rate limit configuration '${configName}' not found`);
    }

    const window = Math.floor(Date.now() / config.windowMs);
    const redisKey = `rate_limit:${configName}:${key}:${window}`;
    
    await this.redis.del(redisKey);
  }

  // Get all active rate limits
  async getActiveLimits(): Promise<Array<{
    key: string;
    configName: string;
    remaining: number;
    resetTime: number;
    totalHits: number;
  }>> {
    const pattern = 'rate_limit:*';
    const keys = await this.redis.keys(pattern);
    const activeLimits = [];

    for (const key of keys) {
      const parts = key.split(':');
      if (parts.length >= 4) {
        const configName = parts[1];
        const userKey = parts.slice(2, -1).join(':');
        const window = parseInt(parts[parts.length - 1]);
        
        const current = await this.redis.get(key);
        const totalHits = current ? parseInt(current) : 0;
        const config = this.configs.get(configName);
        
        if (config) {
          const remaining = Math.max(0, config.maxRequests - totalHits);
          const resetTime = (window + 1) * config.windowMs;
          
          activeLimits.push({
            key: userKey,
            configName,
            remaining,
            resetTime,
            totalHits
          });
        }
      }
    }

    return activeLimits;
  }
}

// Security middleware
export class SecurityMiddleware {
  // CORS configuration
  static corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400 // 24 hours
  };

  // Helmet security headers
  static securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: https:;"
  };

  // Apply security headers
  static applySecurityHeaders(response: NextResponse): NextResponse {
    Object.entries(this.securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Validate request origin
  static validateOrigin(req: NextRequest): boolean {
    const origin = req.headers.get('origin');
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
    
    if (!origin) return true; // Allow requests without origin (e.g., server-to-server)
    
    return allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*');
        return new RegExp(pattern).test(origin);
      }
      return origin === allowed;
    });
  }

  // Sanitize input
  static sanitizeInput(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  // Validate file upload
  static validateFileUpload(file: File, maxSize: number, allowedTypes: string[]): {
    valid: boolean;
    error?: string;
  } {
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${maxSize} bytes`
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    return { valid: true };
  }
}

export { RateLimiter, RATE_LIMITS };
