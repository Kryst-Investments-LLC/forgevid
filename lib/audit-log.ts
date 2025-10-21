import { prisma } from '@/lib/database';
import { NextRequest } from 'next/server';

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

export class AuditLogger {
  private static instance: AuditLogger;
  private logQueue: AuditLogEntry[] = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds

  private constructor() {
    // Start batch processing
    setInterval(() => this.flushLogs(), this.flushInterval);
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  async log(entry: AuditLogEntry): Promise<void> {
    // Add to queue for batch processing
    this.logQueue.push({
      ...entry
    });

    // Flush immediately for critical events
    if (entry.severity === 'critical') {
      await this.flushLogs();
    }

    // Flush when batch is full
    if (this.logQueue.length >= this.batchSize) {
      await this.flushLogs();
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const logsToFlush = [...this.logQueue];
    this.logQueue = [];

    try {
      await prisma.auditLog.createMany({
        data: logsToFlush.map(log => ({
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

      console.log(`📝 Flushed ${logsToFlush.length} audit logs`);
    } catch (error) {
      console.error('Failed to flush audit logs:', error);
      // Re-queue failed logs
      this.logQueue.unshift(...logsToFlush);
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
