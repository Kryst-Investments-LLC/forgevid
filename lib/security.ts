import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import cors from 'cors';

// Rate limiting configurations
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 API requests per windowMs
  message: {
    error: 'Too many API requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Slow down configuration.
// express-slow-down v2 requires delayMs to be a FUNCTION — the old numeric form
// (`delayMs: 500`) throws a WRN_ESD_DELAYMS validation error, which was crashing
// the security middleware on /api/ai (every generation 500'd before it started).
// This preserves the original "add 500ms per request past the limit" behavior.
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: (used, req) => {
    const delayAfter = req.slowDown.limit;
    return (used - delayAfter) * 500; // +500ms per request above the limit
  },
});

// Helmet security configuration
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://api.pexels.com"],
      frameSrc: ["'self'", "https://js.stripe.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// CORS configuration
export const corsConfig = cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Replace with your production domain
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200,
});

// Security headers middleware
export const securityHeaders = (req: any, res: any, next: any) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  next();
};

// Input validation helpers
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// File upload security
export const allowedFileTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

export const maxFileSize = 50 * 1024 * 1024; // 50MB

export const validateFileUpload = (file: any): boolean => {
  if (!file) return false;
  if (file.size > maxFileSize) return false;
  if (!allowedFileTypes.includes(file.mimetype)) return false;
  return true;
};

// SQL injection prevention
export const sanitizeSQL = (input: string): string => {
  return input
    .replace(/['"]/g, '')
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '');
};

// XSS prevention
export const escapeHTML = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Get client IP from request (works with NextRequest and Express)
export function getClientIP(req: any): string {
  // Handle NextRequest
  if (req.headers && typeof req.headers.get === 'function') {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (realIP) {
      return realIP;
    }
  }
  
  // Handle Express request
  const forwarded = req.headers?.['x-forwarded-for'];
  const realIP = req.headers?.['x-real-ip'];
  
  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

// Input validation
export function validateInput(input: string): boolean {
  if (!input || typeof input !== 'string') return true; // Empty is valid
  
  // Check for SQL injection patterns
  const sqliPatterns = [
    /union\s+select/i,
    /drop\s+table/i,
    /delete\s+from/i,
    /;\s*(drop|truncate|delete)/i,
  ];
  
  // Check for XSS patterns
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror\s*=|onload\s*=/i,
  ];
  
  const allPatterns = [...sqliPatterns, ...xssPatterns];
  return !allPatterns.some(pattern => pattern.test(input));
}

// Security Audit Logger
export class SecurityAuditLogger {
  static logSecurityEvent(eventType: string, details: Record<string, any>): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      ...details,
    };
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Security Audit]', logEntry);
    }
    
    // In production, this would send to a security monitoring service
    // Example: Sentry, CloudWatch, etc.
  }
}