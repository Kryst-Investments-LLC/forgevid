import pino from 'pino';
// Configure Pino logger based on environment
const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');
// Base logger configuration
const baseConfig = {
    level: logLevel,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level: (label) => ({ level: label }),
    },
    serializers: {
        req: (req) => ({
            method: req.method,
            url: req.url,
            headers: {
                'user-agent': req.headers['user-agent'],
                'x-forwarded-for': req.headers['x-forwarded-for'],
            },
        }),
        res: (res) => ({
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
export const createModuleLogger = (module) => {
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
    static info(message, data) {
        logger.info(data ? { message, ...data } : { message });
    }
    static error(message, error, data) {
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
    static warn(message, data) {
        logger.warn(data ? { message, ...data } : { message });
    }
    static debug(message, data) {
        logger.debug(data ? { message, ...data } : { message });
    }
    // Performance logging
    static performance(operation, duration, data) {
        logger.info({
            message: 'Performance metric',
            operation,
            duration,
            ...data,
        });
    }
    // Security event logging
    static security(event, severity, data) {
        securityLogger[severity === 'critical' ? 'error' : 'warn']({
            message: 'Security event',
            event,
            severity,
            ...data,
        });
    }
    // Business event logging
    static business(event, userId, data) {
        logger.info({
            message: 'Business event',
            event,
            userId,
            ...data,
        });
    }
}
// Request logging middleware
export function logRequest(req, res, next) {
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
        }
        else {
            apiLogger.info(logData, 'Request completed');
        }
    });
    if (next)
        next();
}
// Error logging
export function logError(error, context) {
    Logger.error('Application error', error, context);
}
// Performance monitoring
export function logPerformance(operation, startTime, metadata) {
    const duration = Date.now() - startTime;
    Logger.performance(operation, duration, metadata);
}
// Database query logging
export function logDatabaseQuery(query, duration, params) {
    dbLogger.info({
        query: query.substring(0, 200), // Truncate long queries
        duration,
        params: params ? JSON.stringify(params).substring(0, 100) : undefined,
    }, 'Database query executed');
}
// Video processing logging
export function logVideoProcessing(videoId, operation, status, metadata) {
    videoLogger.info('Video processing event', {
        videoId,
        operation,
        status,
        ...metadata,
    });
}
// Authentication logging
export function logAuthEvent(event, userId, success = true, metadata) {
    const level = success ? 'info' : 'warn';
    authLogger[level]('Authentication event', {
        event,
        userId,
        success,
        ...metadata,
    });
}
export default logger;
