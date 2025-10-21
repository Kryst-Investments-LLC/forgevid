import pino from 'pino';

// Configure Pino logger based on environment
const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// Base logger configuration
const baseConfig = {
  level: logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label: string) => ({ level: label }),
  },
  serializers: {
    req: (req: any) => ({
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers['user-agent'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
      },
    }),
    res: (res: any) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
};

// Production configuration with DataDog transport
const productionConfig = {
  ...baseConfig,
  transport: {
    target: 'pino-datadog-transport',
    options: {
      ddClientConf: {
        authMethods: {
          apiKeyAuth: process.env.DATADOG_API_KEY,
        },
      },
      ddsource: 'forgevid',
      ddtags: 'env:production,service:forgevid',
      service: 'forgevid',
      hostname: process.env.HOSTNAME || 'forgevid-app',
    },
  },
};

// Development configuration
const developmentConfig = {
  ...baseConfig,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
};

// Create logger instance
export const logger = pino(isProduction ? productionConfig : developmentConfig);

// Child loggers for different modules
export const createModuleLogger = (module: string) => {
  return logger.child({ module });
};

// Specific loggers for different parts of the application
export const apiLogger = createModuleLogger('api');
export const dbLogger = createModuleLogger('database');
export const authLogger = createModuleLogger('auth');
export const videoLogger = createModuleLogger('video');
export const securityLogger = createModuleLogger('security');
export const monitoringLogger = createModuleLogger('monitoring');

// Logging utilities
export class Logger {
  static info(message: string, data?: any) {
    logger.info(data ? { message, ...data } : { message });
  }

  static error(message: string, error?: Error, data?: any) {
    logger.error({
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
      ...data,
    });
  }

  static warn(message: string, data?: any) {
    logger.warn(data ? { message, ...data } : { message });
  }

  static debug(message: string, data?: any) {
    logger.debug(data ? { message, ...data } : { message });
  }

  // Performance logging
  static performance(operation: string, duration: number, data?: any) {
    logger.info({
      message: 'Performance metric',
      operation,
      duration,
      ...data,
    });
  }

  // Security event logging
  static security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', data?: any) {
    securityLogger[severity === 'critical' ? 'error' : 'warn']({
      message: 'Security event',
      event,
      severity,
      ...data,
    });
  }

  // Business event logging
  static business(event: string, userId?: string, data?: any) {
    logger.info({
      message: 'Business event',
      event,
      userId,
      ...data,
    });
  }
}

// Request logging middleware
export function logRequest(req: any, res: any, next?: any) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    };

    if (res.statusCode >= 400) {
      apiLogger.error(logData, 'Request failed');
    } else {
      apiLogger.info(logData, 'Request completed');
    }
  });

  if (next) next();
}

// Error logging
export function logError(error: Error, context?: any) {
  Logger.error('Application error', error, context);
}

// Performance monitoring
export function logPerformance(operation: string, startTime: number, metadata?: any) {
  const duration = Date.now() - startTime;
  Logger.performance(operation, duration, metadata);
}

// Database query logging
export function logDatabaseQuery(query: string, duration: number, params?: any) {
  dbLogger.info({
    query: query.substring(0, 200), // Truncate long queries
    duration,
    params: params ? JSON.stringify(params).substring(0, 100) : undefined,
  }, 'Database query executed');
}

// Video processing logging
export function logVideoProcessing(videoId: string, operation: string, status: string, metadata?: any) {
  videoLogger.info('Video processing event', {
    videoId,
    operation,
    status,
    ...metadata,
  });
}

// Authentication logging
export function logAuthEvent(event: string, userId?: string, success: boolean = true, metadata?: any) {
  const level = success ? 'info' : 'warn';
  authLogger[level]('Authentication event', {
    event,
    userId,
    success,
    ...metadata,
  });
}

export default logger;
