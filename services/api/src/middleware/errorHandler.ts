import { Request, Response, NextFunction } from 'express';
import { logError, logSecurityEvent } from '../lib/logger';
import { metrics } from '../lib/metrics';
import * as Sentry from '@sentry/node';

/**
 * Global error handler middleware
 *
 * Catches all errors thrown in route handlers and middleware.
 * Logs errors with Sentry, records metrics, and returns appropriate responses.
 *
 * Features:
 * - Sentry error tracking integration
 * - Structured error logging
 * - Error metrics recording
 * - Security event logging
 * - User-friendly error messages (no stack traces exposed)
 * - Proper HTTP status codes
 */

/**
 * Custom application error class
 * Extends Error with HTTP status code and error code
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400 Bad Request)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error (401 Unauthorized)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(401, message, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error (403 Forbidden)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(403, message, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error (404 Not Found)
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(404, `${resource} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error (409 Conflict)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit error (429 Too Many Requests)
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(429, message, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

/**
 * Internal server error (500 Internal Server Error)
 */
export class InternalError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(500, message, 'INTERNAL_ERROR');
    this.name = 'InternalError';
  }
}

/**
 * Determine if error should be reported to Sentry
 * Don't report expected errors (4xx client errors)
 */
function shouldReportToSentry(error: Error, statusCode: number): boolean {
  // Don't report expected client errors
  if (statusCode >= 400 && statusCode < 500) {
    // Except authentication/authorization failures (security monitoring)
    if (
      error instanceof AuthenticationError ||
      error instanceof AuthorizationError
    ) {
      return true;
    }
    return false;
  }

  // Report all server errors
  return statusCode >= 500;
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // If response already sent, delegate to default error handler
  if (res.headersSent) {
    return next(error);
  }

  // Determine status code and error details
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: any = undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorCode = error.code || errorCode;
    message = error.message;
    details = error.details;
  } else {
    // Unknown error - log full details
    message = error.message || message;
  }

  // Get request context
  const correlationId = req.correlationId || 'unknown';
  const logger = req.logger || require('../lib/logger').default;
  const userContext = (req as any).user
    ? {
        userId: (req as any).user.id,
        firmId: (req as any).user.firmId,
      }
    : {};

  // Log error with full context
  logError(error, {
    correlationId,
    http: {
      method: req.method,
      path: req.path,
      statusCode,
    },
    ...userContext,
  });

  // Log security events
  if (
    error instanceof AuthenticationError ||
    error instanceof AuthorizationError
  ) {
    logSecurityEvent(error.name, {
      correlationId,
      path: req.path,
      method: req.method,
      ip: req.ip,
      ...userContext,
    });
  }

  // Report to Sentry if configured
  if (shouldReportToSentry(error, statusCode)) {
    Sentry.captureException(error, {
      tags: {
        correlationId,
        path: req.path,
        method: req.method,
      },
      user: userContext.userId
        ? {
            id: userContext.userId,
            firmId: userContext.firmId,
          }
        : undefined,
      level: statusCode >= 500 ? 'error' : 'warning',
    });
  }

  // Record error metric
  metrics.recordError(errorCode, req.path);

  // Send error response
  res.status(statusCode).json({
    error: {
      code: errorCode,
      message,
      ...(details && { details }),
      correlationId,
    },
    // Include stack trace only in development
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
    }),
  });
}

/**
 * 404 Not Found handler
 * Should be registered after all other routes
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const error = new NotFoundError('Endpoint');
  next(error);
}

/**
 * Async route handler wrapper
 * Automatically catches errors from async route handlers
 *
 * Usage:
 *   router.get('/users', asyncHandler(async (req, res) => {
 *     const users = await userService.getUsers();
 *     res.json(users);
 *   }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
