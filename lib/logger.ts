import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

const LOG_LEVELS: Record<LogLevel, number> = {
  [LogLevel.ERROR]: 0,
  [LogLevel.WARN]: 1,
  [LogLevel.INFO]: 2,
  [LogLevel.DEBUG]: 3,
};

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

class Logger {
  private currentLogLevel: number;
  private isProduction: boolean;
  private errorStream: NodeJS.WritableStream | null = null;
  private accessStream: NodeJS.WritableStream | null = null;
  private auditStream: NodeJS.WritableStream | null = null;

  constructor() {
    const envLevel = (process.env.LOG_LEVEL || 'info') as LogLevel;
    this.currentLogLevel = LOG_LEVELS[envLevel] ?? LOG_LEVELS[LogLevel.INFO];
    this.isProduction = process.env.NODE_ENV === 'production';

    // Only create file streams if logs directory exists (non-containerized)
    if (!this.isProduction || process.env.LOG_TO_FILE === 'true') {
      try {
        const logsDir = join(process.cwd(), 'logs');
        if (!existsSync(logsDir)) {
          mkdirSync(logsDir, { recursive: true });
        }
        this.errorStream = createWriteStream(join(logsDir, 'error.log'), { flags: 'a' });
        this.accessStream = createWriteStream(join(logsDir, 'access.log'), { flags: 'a' });
        this.auditStream = createWriteStream(join(logsDir, 'audit.log'), { flags: 'a' });
      } catch {
        // In containers/serverless, file writes may not be possible — stdout only
      }
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    return JSON.stringify(entry) + '\n';
  }

  private writeToFile(stream: NodeJS.WritableStream | null, entry: LogEntry): void {
    if (stream) {
      stream.write(this.formatLogEntry(entry));
    }
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    if (LOG_LEVELS[level] > this.currentLogLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'forgevid',
      ...metadata,
    };

    // Primary output: structured JSON to stdout/stderr for container log collectors
    // (Promtail, Fluentd, CloudWatch agent, etc.)
    const jsonLine = JSON.stringify(entry);

    switch (level) {
      case LogLevel.ERROR:
        process.stderr.write(jsonLine + '\n');
        this.writeToFile(this.errorStream, entry);
        break;
      case LogLevel.WARN:
        process.stderr.write(jsonLine + '\n');
        this.writeToFile(this.errorStream, entry);
        break;
      case LogLevel.INFO:
        process.stdout.write(jsonLine + '\n');
        this.writeToFile(this.accessStream, entry);
        break;
      case LogLevel.DEBUG:
        process.stdout.write(jsonLine + '\n');
        this.writeToFile(this.accessStream, entry);
        break;
    }
  }

  error(message: string, error?: unknown, metadata?: Record<string, any>): void {
    const err = error instanceof Error ? error : undefined;
    const errorValue = error !== undefined && !(error instanceof Error) ? error : undefined;
    this.log(LogLevel.ERROR, message, {
      ...metadata,
      ...(errorValue !== undefined ? { errorValue } : {}),
      error: err ? {
        name: err.name,
        message: err.message,
        stack: err.stack,
      } : undefined,
    });
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  // Request logging
  logRequest(req: any, res: any, duration: number): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message: `${req.method} ${req.originalUrl}`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,
    };

    this.writeToFile(this.accessStream, entry);
    console.log(`[${entry.timestamp}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  }

  // Security events
  logSecurityEvent(event: string, req: any, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      message: `Security Event: ${event}`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl,
      method: req.method,
      userId: req.user?.id,
      ...metadata,
    };

    this.writeToFile(this.auditStream, entry);
    console.warn(`[SECURITY] ${event} - IP: ${entry.ip} - User: ${entry.userId || 'Anonymous'}`);
  }

  // Audit logging
  logAudit(action: string, userId: string, resource: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message: `Audit: ${action}`,
      userId,
      metadata: {
        action,
        resource,
        ...metadata,
      },
    };

    this.writeToFile(this.auditStream, entry);
    console.log(`[AUDIT] ${action} - User: ${userId} - Resource: ${resource}`);
  }

  // Performance logging
  logPerformance(operation: string, duration: number, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message: `Performance: ${operation}`,
      duration,
      metadata: {
        operation,
        ...metadata,
      },
    };

    this.writeToFile(this.accessStream, entry);
    console.log(`[PERFORMANCE] ${operation} - ${duration}ms`);
  }

  // Error handling
  logError(error: Error, req?: any, metadata?: Record<string, any>): void {
    this.error('Unhandled error', error, {
      ip: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent'),
      endpoint: req?.originalUrl,
      method: req?.method,
      userId: req?.user?.id,
      ...metadata,
    });
  }

  // Close streams
  close(): void {
    this.errorStream?.end();
    this.accessStream?.end();
    this.auditStream?.end();
  }
}

export const logger = new Logger();

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Application shutting down...');
  logger.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Application shutting down...');
  logger.close();
  process.exit(0);
});

// Unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', new Error(String(reason)), {
    promise: promise.toString(),
  });
});

// Uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});