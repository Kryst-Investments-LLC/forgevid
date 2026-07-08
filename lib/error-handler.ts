import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 400, true, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, true, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, true, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, true, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, true, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

export class PaymentError extends AppError {
  constructor(message: string = 'Payment processing failed') {
    super(message, 402, true, 'PAYMENT_ERROR');
    this.name = 'PaymentError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string = 'External service error') {
    super(`${service}: ${message}`, 502, true, 'EXTERNAL_SERVICE_ERROR');
    this.name = 'ExternalServiceError';
  }
}

// Error response formatter
export const formatErrorResponse = (error: any, req?: NextRequest) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Default error response
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details: any = undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code || 'APP_ERROR';
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    message = 'File upload error';
    code = 'FILE_UPLOAD_ERROR';
  } else if (error.code === 'P2002') {
    // Prisma unique constraint error
    statusCode = 409;
    message = 'Resource already exists';
    code = 'DUPLICATE_ERROR';
  } else if (error.code === 'P2025') {
    // Prisma record not found error
    statusCode = 404;
    message = 'Resource not found';
    code = 'NOT_FOUND_ERROR';
  }

  // Add development details
  if (isDevelopment) {
    details = {
      stack: error.stack,
      name: error.name,
      code: error.code,
    };
  }

  return {
    success: false,
    error: {
      message,
      code,
      statusCode,
      ...(details && { details }),
      ...(req && { requestId: req.headers.get('x-request-id') }),
    },
  };
};

// Global error handler for API routes
export const handleApiError = (error: any, req?: NextRequest) => {
  // Log the error
  logger.logError(error, req);

  // Format error response
  const errorResponse = formatErrorResponse(error, req);
  
  // Return appropriate response
  return NextResponse.json(
    errorResponse,
    { status: errorResponse.error.statusCode }
  );
};

// Async error wrapper for API routes
export const asyncHandler = (fn: Function) => {
  return (req: NextRequest, ...args: any[]) => {
    return Promise.resolve(fn(req, ...args)).catch((error) => {
      return handleApiError(error, req);
    });
  };
};

// Validation helpers
export const validateRequired = (value: any, fieldName: string) => {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
  return value;
};

export const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }
  return email;
};

export const validatePassword = (password: string) => {
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long');
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    throw new ValidationError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
  }
  return password;
};

export const validateUUID = (uuid: string, fieldName: string = 'ID') => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    throw new ValidationError(`Invalid ${fieldName} format`);
  }
  return uuid;
};

// Database error handler
export const handleDatabaseError = (error: any) => {
  if (error.code === 'P2002') {
    throw new ConflictError('Resource already exists');
  }
  if (error.code === 'P2025') {
    throw new NotFoundError('Resource not found');
  }
  if (error.code === 'P2003') {
    throw new ValidationError('Invalid reference');
  }
  if (error.code === 'P2014') {
    throw new ValidationError('Invalid data relationship');
  }
  
  // Log unexpected database errors
  logger.error('Database error', error);
  throw new AppError('Database operation failed', 500);
};

// External service error handler
export const handleExternalServiceError = (service: string, error: any) => {
  logger.error(`External service error: ${service}`, error);
  
  if (error.response) {
    // Service responded with error status
    const status = error.response.status;
    const message = error.response.data?.message || error.message;
    
    if (status >= 400 && status < 500) {
      throw new AppError(`${service}: ${message}`, status);
    } else {
      throw new ExternalServiceError(service, message);
    }
  } else if (error.request) {
    // Service didn't respond
    throw new ExternalServiceError(service, 'Service unavailable');
  } else {
    // Other error
    throw new ExternalServiceError(service, error.message);
  }
};

// Retry mechanism for external services
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
      logger.warn(`Retry attempt ${attempt}/${maxRetries}`, { error: error instanceof Error ? error.message : String(error) });
    }
  }
  
  throw lastError;
};