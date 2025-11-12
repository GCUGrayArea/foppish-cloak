import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createRequestLogger, logApiRequest } from '../lib/logger';
import { metrics } from '../lib/metrics';

/**
 * Request logger middleware
 *
 * Attaches a correlation ID to each request and logs request/response details.
 * Tracks request duration and records metrics.
 *
 * Features:
 * - Generates unique correlation ID for request tracking
 * - Logs request method, path, status code, duration
 * - Records API latency metrics
 * - Adds correlation ID to response headers
 * - Enriches request context with logger instance
 */

// Extend Express Request type to include logger and correlation ID
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      logger: ReturnType<typeof createRequestLogger>;
      startTime: number;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  // Generate correlation ID (or use existing from header)
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  req.correlationId = correlationId;
  req.startTime = Date.now();

  // Create request-specific logger
  req.logger = createRequestLogger(correlationId);

  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', correlationId);

  // Extract user context if available (after auth middleware)
  const getUserContext = () => {
    const user = (req as any).user;
    if (user) {
      return {
        userId: user.id,
        firmId: user.firmId,
        role: user.role,
      };
    }
    return {};
  };

  // Log request start
  req.logger.info('Request started', {
    http: {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    },
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any) {
    res.send = originalSend; // Restore original send to avoid infinite loop
    return res.send(data);
  };

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    const userContext = getUserContext();

    // Log API request with full context
    logApiRequest(req.method, req.path, res.statusCode, duration, {
      correlationId,
      ...userContext,
    });

    // Record metrics
    metrics.recordApiLatency(req.path, req.method, duration, res.statusCode);

    // Log completion with appropriate level based on status code
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    req.logger.log(level, 'Request completed', {
      http: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
      },
      ...userContext,
    });
  });

  // Handle errors during request processing
  res.on('error', (error) => {
    req.logger.error('Response error', {
      error: {
        message: error.message,
        stack: error.stack,
      },
      http: {
        method: req.method,
        path: req.path,
      },
    });

    metrics.recordError('ResponseError', req.path);
  });

  next();
}

/**
 * Helper to extract client IP address from request
 * Handles proxied requests (X-Forwarded-For header)
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Performance monitoring middleware
 * Logs slow requests (> 1 second) for investigation
 */
export function slowRequestMonitor(req: Request, res: Response, next: NextFunction) {
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    if (duration > 1000) {
      req.logger.warn('Slow request detected', {
        http: {
          method: req.method,
          path: req.path,
          duration,
        },
        performance: {
          slow: true,
          threshold: 1000,
        },
      });
    }
  });
  next();
}
