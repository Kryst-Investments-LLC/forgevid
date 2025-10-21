import { prisma } from './database';
import { SecurityAuditLogger } from './security';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
export class SecurityManagerServer {
    static instance;
    rateLimitStore = new Map();
    static getInstance() {
        if (!this.instance) {
            this.instance = new SecurityManagerServer();
        }
        return this.instance;
    }
    // Rate limiting for server-side operations
    async checkRateLimit(identifier, windowMs = 900000, maxRequests = 100) {
        const now = Date.now();
        const current = this.rateLimitStore.get(identifier);
        if (!current || now > current.resetTime) {
            this.rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
            return true;
        }
        if (current.count >= maxRequests) {
            return false;
        }
        current.count++;
        return true;
    }
    // JWT token validation for API routes
    async validateApiToken(token) {
        try {
            const secret = process.env.JWT_SECRET || 'default_secret';
            const payload = jwt.verify(token, secret);
            return { valid: true, payload };
        }
        catch (error) {
            return { valid: false };
        }
    }
    // Session validation
    async validateSession(sessionToken) {
        try {
            const session = await prisma.session.findUnique({
                where: { token: sessionToken },
                include: { user: true }
            });
            if (!session || session.expiresAt < new Date()) {
                return { valid: false };
            }
            return { valid: true, userId: session.userId };
        }
        catch (error) {
            console.error('Session validation error:', error);
            return { valid: false };
        }
    }
    // API key validation
    async validateApiKey(apiKey) {
        try {
            const key = await prisma.apiKey.findUnique({
                where: { key: apiKey, isActive: true },
                include: { user: true }
            });
            if (!key) {
                return { valid: false };
            }
            // Update last used timestamp
            await prisma.apiKey.update({
                where: { id: key.id },
                data: { lastUsed: new Date() }
            });
            return { valid: true, userId: key.userId };
        }
        catch (error) {
            console.error('API key validation error:', error);
            return { valid: false };
        }
    }
    // Password hashing and validation
    async hashPassword(password) {
        const bcrypt = await import('bcryptjs');
        return bcrypt.hash(password, 12);
    }
    async validatePassword(password, hash) {
        const bcrypt = await import('bcryptjs');
        return bcrypt.compare(password, hash);
    }
    // Encryption for sensitive data
    encryptSensitiveData(data) {
        const algorithm = 'aes-256-gcm';
        const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return `${iv.toString('hex')}:${encrypted}`;
    }
    decryptSensitiveData(encryptedData) {
        const algorithm = 'aes-256-gcm';
        const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
        const [ivHex, encrypted] = encryptedData.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    // CSRF token generation and validation
    generateCSRFToken(sessionId) {
        const timestamp = Date.now().toString();
        const data = `${sessionId}:${timestamp}`;
        const hash = crypto.createHmac('sha256', process.env.JWT_SECRET || 'default_secret')
            .update(data)
            .digest('hex');
        return `${timestamp}:${hash}`;
    }
    validateCSRFToken(token, sessionId) {
        try {
            const [timestamp, hash] = token.split(':');
            const data = `${sessionId}:${timestamp}`;
            const expectedHash = crypto.createHmac('sha256', process.env.JWT_SECRET || 'default_secret')
                .update(data)
                .digest('hex');
            // Check if token is not older than 1 hour
            const tokenAge = Date.now() - parseInt(timestamp);
            if (tokenAge > 3600000)
                return false;
            return hash === expectedHash;
        }
        catch {
            return false;
        }
    }
    // IP-based security checks
    async checkSuspiciousIP(ip) {
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
        });
        return recentAttempts > 10;
    }
    // User agent analysis
    analyzeSuspiciousUserAgent(userAgent) {
        const suspiciousPatterns = [
            { pattern: /bot|crawler|spider|scraper/i, reason: 'Bot detected' },
            { pattern: /curl|wget|python|php/i, reason: 'Automated tool detected' },
            { pattern: /sqlmap|nikto|nmap/i, reason: 'Security scanning tool detected' }
        ];
        for (const { pattern, reason } of suspiciousPatterns) {
            if (pattern.test(userAgent)) {
                return { suspicious: true, reason };
            }
        }
        return { suspicious: false };
    }
    // Request size validation
    validateRequestSize(request, maxSize = 10 * 1024 * 1024) {
        const contentLength = request.headers.get('content-length');
        if (!contentLength)
            return true;
        return parseInt(contentLength) <= maxSize;
    }
    // SQL injection detection
    detectSQLInjection(input) {
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
            /('|(\\')|(;)|(\-\-)|(\s*\/\*)|(\s*\*\/))/gi,
            /(SCRIPT|JAVASCRIPT|VBSCRIPT|ONLOAD|ONERROR)/gi
        ];
        return sqlPatterns.some(pattern => pattern.test(input));
    }
    // XSS detection
    detectXSS(input) {
        const xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi
        ];
        return xssPatterns.some(pattern => pattern.test(input));
    }
    // Log security events
    async logSecurityEvent(event, details) {
        await SecurityAuditLogger.logSecurityEvent(event, details);
    }
    // Generate secure random tokens
    generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }
    // Validate file uploads
    validateFileUpload(file) {
        const maxSize = 100 * 1024 * 1024; // 100MB
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm', 'video/quicktime',
            'audio/mpeg', 'audio/wav', 'audio/ogg'
        ];
        if (file.size > maxSize) {
            return { valid: false, error: 'File size too large' };
        }
        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: 'File type not allowed' };
        }
        // Check for malicious file names
        if (this.detectXSS(file.name) || this.detectSQLInjection(file.name)) {
            return { valid: false, error: 'Malicious file name detected' };
        }
        return { valid: true };
    }
    // Clean up expired rate limit entries
    cleanupRateLimit() {
        const now = Date.now();
        for (const [key, value] of this.rateLimitStore) {
            if (now > value.resetTime) {
                this.rateLimitStore.delete(key);
            }
        }
    }
}
// Cleanup expired entries every 5 minutes
setInterval(() => {
    SecurityManagerServer.getInstance().cleanupRateLimit();
}, 300000);
export default SecurityManagerServer;
