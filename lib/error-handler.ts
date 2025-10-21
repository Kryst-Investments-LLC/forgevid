import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: any;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'AppError';
  }
}

export function handleError(error: unknown): NextResponse {
  console.error('API Error:', error);

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.issues
    }, { status: 400 });
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return NextResponse.json({
          error: 'Duplicate entry',
          code: 'DUPLICATE_ERROR',
          details: error.meta
        }, { status: 409 });
      case 'P2025':
        return NextResponse.json({
          error: 'Record not found',
          code: 'NOT_FOUND',
          details: error.meta
        }, { status: 404 });
      default:
        return NextResponse.json({
          error: 'Database error',
          code: 'DATABASE_ERROR',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
  }

  // Custom app errors
  if (error instanceof AppError) {
    return NextResponse.json({
      error: error.message,
      code: error.code,
      details: error.details
    }, { status: error.statusCode });
  }

  // Generic errors
  return NextResponse.json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
  }, { status: 500 });
}

export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  };
}

// Common error types
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;

// Predefined error responses
export const ErrorResponses = {
  UNAUTHORIZED: () => new AppError('Unauthorized', 401, ErrorCodes.AUTHENTICATION_ERROR),
  FORBIDDEN: () => new AppError('Forbidden', 403, ErrorCodes.AUTHORIZATION_ERROR),
  NOT_FOUND: (resource: string = 'Resource') => new AppError(`${resource} not found`, 404, ErrorCodes.NOT_FOUND),
  RATE_LIMITED: () => new AppError('Rate limit exceeded', 429, ErrorCodes.RATE_LIMIT_ERROR),
  VALIDATION_FAILED: (details: any) => new AppError('Validation failed', 400, ErrorCodes.VALIDATION_ERROR, details),
  EXTERNAL_SERVICE_ERROR: (service: string) => new AppError(`${service} service unavailable`, 502, ErrorCodes.EXTERNAL_SERVICE_ERROR)
};