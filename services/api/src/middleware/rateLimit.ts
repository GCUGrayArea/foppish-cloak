import { Request, Response, NextFunction } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedisClient } from '../config/redis';
import {
  getRateLimitRule,
  shouldSkipRateLimit,
} from '../config/rateLimit';

// Create rate limiter middleware
export function createRateLimiter(): RateLimitRequestHandler {
  const redisClient = getRedisClient();

  // Base configuration
  const baseConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes default
    max: 100, // Default max requests
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    skip: (req: Request) => shouldSkipRateLimit(req),
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise IP
      const user = (req as any).user;
      if (user?.id) {
        return `user:${user.id}`;
      }
      return `ip:${req.ip}`;
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: res.getHeader('Retry-After'),
      });
    },
  };

  // If Redis is available, use Redis store
  if (redisClient) {
    return rateLimit({
      ...baseConfig,
      store: new RedisStore({
        // @ts-expect-error - RedisStore expects Redis client
        client: redisClient,
        prefix: 'ratelimit:',
      }),
    });
  }

  // Fallback to memory store if Redis is not available
  console.warn(
    'Redis not available - using memory store for rate limiting'
  );
  return rateLimit(baseConfig);
}

// Middleware that applies dynamic rate limiting based on context
export function dynamicRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip if rate limiting is disabled
  if (process.env.RATE_LIMIT_ENABLED === 'false') {
    return next();
  }

  // Skip if endpoint should be skipped
  if (shouldSkipRateLimit(req)) {
    return next();
  }

  // Get rate limit rule for this request
  const rule = getRateLimitRule(req);

  // Create rate limiter with the appropriate rule
  const redisClient = getRedisClient();

  const limiter = rateLimit({
    windowMs: rule.windowMs,
    max: rule.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: rule.skipSuccessfulRequests,
    skipFailedRequests: rule.skipFailedRequests,
    skip: () => false,
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      if (user?.id) {
        return `user:${user.id}:${req.path}`;
      }
      return `ip:${req.ip}:${req.path}`;
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: res.getHeader('Retry-After'),
      });
    },
    store: redisClient
      ? new RedisStore({
          // @ts-expect-error - RedisStore expects Redis client
          client: redisClient,
          prefix: 'ratelimit:',
        })
      : undefined,
  });

  limiter(req, res, next);
}

// Export the default rate limiter
export const rateLimiter = createRateLimiter();
