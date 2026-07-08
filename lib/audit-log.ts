import { prisma } from '@/lib/database';
import { NextRequest } from 'next/server';
import Redis from 'ioredis';

export interface AuditLogEntry {
  action: string;
  userId?: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const AUDIT_QUEUE_KEY = 'audit:log:queue';

export class AuditLogger {
  private static instance: AuditLogger;
  private redis: Redis | null = null;
  private fallbackQueue: AuditLogEntry[] = [];
  private flushInterval = 5000; // 5 seconds
  private batchSize = 25;

  private constructor() {
    this.initRedis();
    setInterval(() => this.flushLogs(), this.flushInterval);
  }

  private initRedis(): void {
    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL, {
          password: process.env.REDIS_PASSWORD || undefined,
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          enableReadyCheck: false,
        });
        this.redis.on('error', () => {
          // Silently handle — we'll fallback to in-memory
        });
      } catch {
        this.redis = null;
      }
    }
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  async log(entry: AuditLogEntry): Promise<void> {
    // Critical and high severity events are written through to DB immediately
    if (entry.severity === 'critical' || entry.severity === 'high') {
      await this.writeToDatabase([entry]);
      return;
    }

    // Lower severity events are queued (Redis if available, in-memory fallback)
    try {
      if (this.redis) {
        await this.redis.rpush(AUDIT_QUEUE_KEY, JSON.stringify(entry));
        return;
      }
    } catch {
      // Fallback to in-memory
    }

    this.fallbackQueue.push(entry);
    if (this.fallbackQueue.length >= this.batchSize) {
      await this.flushLogs();
    }
  }

  private async flushLogs(): Promise<void> {
    const entries: AuditLogEntry[] = [];

    // Drain from Redis queue
    try {
      if (this.redis) {
        const batch = await this.redis.lrange(AUDIT_QUEUE_KEY, 0, this.batchSize - 1);
        if (batch.length > 0) {
          await this.redis.ltrim(AUDIT_QUEUE_KEY, batch.length, -1);
          entries.push(...batch.map(s => JSON.parse(s)));
        }
      }
    } catch {
      // Redis unavailable — skip
    }

    // Drain from in-memory fallback
    if (this.fallbackQueue.length > 0) {
      entries.push(...this.fallbackQueue.splice(0, this.batchSize));
    }

    if (entries.length === 0) return;

    await this.writeToDatabase(entries);
  }

  private async writeToDatabase(entries: AuditLogEntry[]): Promise<void> {
    try {
      await prisma.auditLog.createMany({
        data: entries.map(log => ({
          action: log.action,
          resource: log.resource,
          details: log.details ? JSON.stringify(log.details) : null,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          userId: log.userId,
          severity: log.severity,
          createdAt: new Date()
        }))
      });
    } catch (error) {
      console.error('Failed to write audit logs to database:', error);
      // Re-queue to in-memory as last resort (capped to prevent OOM)
      if (this.fallbackQueue.length < 1000) {
        this.fallbackQueue.push(...entries);
      }
    }
  }

  // Convenience methods for common audit events
  async logUserAction(action: string, userId: string, details?: any): Promise<void> {
    await this.log({
      action,
      userId,
      resource: 'user',
      details,
      severity: 'low'
    });
  }

  async logSecurityEvent(event: string, details: any, severity: 'medium' | 'high' | 'critical' = 'medium'): Promise<void> {
    await this.log({
      action: event,
      resource: 'security',
      details,
      severity
    });
  }

  async logDataAccess(resource: string, resourceId: string, userId: string, action: string): Promise<void> {
    await this.log({
      action,
      userId,
      resource,
      resourceId,
      details: { accessType: 'data' },
      severity: 'low'
    });
  }

  async logSystemEvent(event: string, details: any, severity: 'low' | 'medium' | 'high' = 'low'): Promise<void> {
    await this.log({
      action: event,
      resource: 'system',
      details,
      severity
    });
  }
}

// Helper function to extract request info
export function extractRequestInfo(request: NextRequest): { ipAddress: string; userAgent: string } {
  const ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  
  const userAgent = request.headers.get('user-agent') || 'unknown';

  return { ipAddress, userAgent };
}

// Middleware to automatically log API requests
export function withAuditLogging(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest): Promise<Response> => {
    const auditLogger = AuditLogger.getInstance();
    const { ipAddress, userAgent } = extractRequestInfo(req);
    
    const startTime = Date.now();
    let response: Response;
    let error: Error | null = null;

    try {
      response = await handler(req);
    } catch (err) {
      error = err as Error;
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      
      await auditLogger.log({
        action: `${req.method} ${req.url}`,
        resource: 'api',
        details: {
          method: req.method,
          url: req.url,
          statusCode: 500,
          duration,
          error: error?.message
        },
        ipAddress,
        userAgent,
        severity: error ? 'high' : 'low'
      });
    }

    return response;
  };
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();
