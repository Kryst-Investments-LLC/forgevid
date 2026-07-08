import { NextRequest } from 'next/server'
import { prisma } from './database'
import { SecurityAuditLogger } from './security'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import Redis from 'ioredis'

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!redis && process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableReadyCheck: false,
    });
    redis.on('error', () => {});
  }
  return redis;
}

export class SecurityManagerServer {
  private static instance: SecurityManagerServer
  // Fallback only — used when Redis is unavailable
  private fallbackStore = new Map<string, { count: number; resetTime: number }>()

  static getInstance(): SecurityManagerServer {
    if (!this.instance) {
      this.instance = new SecurityManagerServer()
    }
    return this.instance
  }

  // Rate limiting — distributed via Redis, fallback to in-memory
  async checkRateLimit(identifier: string, windowMs: number = 900000, maxRequests: number = 100): Promise<boolean> {
    const r = getRedis();
    if (r) {
      try {
        const windowSec = Math.ceil(windowMs / 1000);
        const windowKey = `rl:srv:${identifier}:${Math.floor(Date.now() / windowMs)}`;
        const current = await r.incr(windowKey);
        if (current === 1) {
          await r.expire(windowKey, windowSec);
        }
        return current <= maxRequests;
      } catch {
        // Fall through to in-memory
      }
    }

    const now = Date.now()
    const current = this.fallbackStore.get(identifier)
    
    if (!current || now > current.resetTime) {
      this.fallbackStore.set(identifier, { count: 1, resetTime: now + windowMs })
      return true
    }

    if (current.count >= maxRequests) {
      return false
    }

    current.count++
    return true
  }

  // JWT token validation for API routes
  async validateApiToken(token: string): Promise<{ valid: boolean; payload?: any }> {
    try {
      const secret = process.env.JWT_SECRET
      if (!secret) return { valid: false }
      const payload = jwt.verify(token, secret, { algorithms: ['HS256'] })
      return { valid: true, payload }
    } catch {
      return { valid: false }
    }
  }

  // Session validation
  async validateSession(sessionToken: string): Promise<{ valid: boolean; userId?: string }> {
    try {
      const session = await prisma.session.findUnique({
        where: { token: sessionToken },
        include: { user: true }
      })

      if (!session || session.expiresAt < new Date()) {
        return { valid: false }
      }

      return { valid: true, userId: session.userId }
    } catch (error) {
      console.error('Session validation error:', error)
      return { valid: false }
    }
  }

  // API key validation
  async validateApiKey(apiKey: string): Promise<{ valid: boolean; userId?: string }> {
    try {
      const key = await prisma.apiKey.findUnique({
        where: { key: apiKey, isActive: true },
        include: { user: true }
      })

      if (!key) {
        return { valid: false }
      }

      // Update last used timestamp
      await prisma.apiKey.update({
        where: { id: key.id },
        data: { lastUsed: new Date() }
      })

      return { valid: true, userId: key.userId }
    } catch (error) {
      console.error('API key validation error:', error)
      return { valid: false }
    }
  }

  // Password hashing and validation
  async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcryptjs')
    return bcrypt.hash(password, 12)
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcryptjs')
    return bcrypt.compare(password, hash)
  }

  // Encryption for sensitive data
  encryptSensitiveData(data: string): string {
    const algorithm = 'aes-256-gcm'
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    return `${iv.toString('hex')}:${encrypted}`
  }

  decryptSensitiveData(encryptedData: string): string {
    const algorithm = 'aes-256-gcm'
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32)
    const [ivHex, encrypted] = encryptedData.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }

  // CSRF token generation and validation
  generateCSRFToken(sessionId: string): string {
    const timestamp = Date.now().toString()
    const data = `${sessionId}:${timestamp}`
    const hash = crypto.createHmac('sha256', process.env.JWT_SECRET || 'default_secret')
      .update(data)
      .digest('hex')
    
    return `${timestamp}:${hash}`
  }

  validateCSRFToken(token: string, sessionId: string): boolean {
    try {
      const [timestamp, hash] = token.split(':')
      const data = `${sessionId}:${timestamp}`
      const expectedHash = crypto.createHmac('sha256', process.env.JWT_SECRET || 'default_secret')
        .update(data)
        .digest('hex')
      
      // Check if token is not older than 1 hour
      const tokenAge = Date.now() - parseInt(timestamp)
      if (tokenAge > 3600000) return false
      
      return hash === expectedHash
    } catch {
      return false
    }
  }

  // IP-based security checks
  async checkSuspiciousIP(ip: string): Promise<boolean> {
    // Check if IP has too many failed attempts
    const recentAttempts = await prisma.auditLog.count({
      where: {
        ipAddress: ip,
        action: 'authentication_attempt',
        createdAt: {
          gte: new Date(Date.now() - 3600000) // Last hour
        },
        details: {
          not: null
        }
      }
    })

    return recentAttempts > 10
  }

  // User agent analysis
  analyzeSuspiciousUserAgent(userAgent: string): { suspicious: boolean; reason?: string } {
    const suspiciousPatterns = [
      { pattern: /bot|crawler|spider|scraper/i, reason: 'Bot detected' },
      { pattern: /curl|wget|python|php/i, reason: 'Automated tool detected' },
      { pattern: /sqlmap|nikto|nmap/i, reason: 'Security scanning tool detected' }
    ]

    for (const { pattern, reason } of suspiciousPatterns) {
      if (pattern.test(userAgent)) {
        return { suspicious: true, reason }
      }
    }

    return { suspicious: false }
  }

  // Request size validation
  validateRequestSize(request: NextRequest, maxSize: number = 10 * 1024 * 1024): boolean {
    const contentLength = request.headers.get('content-length')
    if (!contentLength) return true
    
    return parseInt(contentLength) <= maxSize
  }

  // SQL injection detection
  detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /('|(\\')|(;)|(\-\-)|(\s*\/\*)|(\s*\*\/))/gi,
      /(SCRIPT|JAVASCRIPT|VBSCRIPT|ONLOAD|ONERROR)/gi
    ]

    return sqlPatterns.some(pattern => pattern.test(input))
  }

  // XSS detection
  detectXSS(input: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ]

    return xssPatterns.some(pattern => pattern.test(input))
  }

  // Log security events
  async logSecurityEvent(
    event: string,
    details: {
      userId?: string
      ip?: string
      userAgent?: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      data?: Record<string, any>
    }
  ) {
    await SecurityAuditLogger.logSecurityEvent(event, details)
  }

  // Generate secure random tokens
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }

  // Validate file uploads
  validateFileUpload(file: {
    name: string
    size: number
    type: string
  }): { valid: boolean; error?: string } {
    const maxSize = 100 * 1024 * 1024 // 100MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/ogg'
    ]

    if (file.size > maxSize) {
      return { valid: false, error: 'File size too large' }
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not allowed' }
    }

    // Check for malicious file names
    if (this.detectXSS(file.name) || this.detectSQLInjection(file.name)) {
      return { valid: false, error: 'Malicious file name detected' }
    }

    return { valid: true }
  }

  // Clean up expired rate limit entries
  cleanupRateLimit() {
    const now = Date.now()
    for (const [key, value] of this.fallbackStore) {
      if (now > value.resetTime) {
        this.fallbackStore.delete(key)
      }
    }
  }
}

// Cleanup expired entries every 5 minutes
setInterval(() => {
  SecurityManagerServer.getInstance().cleanupRateLimit()
}, 300000)

export default SecurityManagerServer