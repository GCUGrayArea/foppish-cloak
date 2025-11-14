import { Request } from 'express';

export interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Rate limit rules for different endpoint types
export const rateLimitRules = {
  // Anonymous users (by IP)
  anonymous: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  } as RateLimitRule,

  // Authenticated users (by user ID)
  authenticated: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 500,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  } as RateLimitRule,

  // AI generation endpoints (special rate limiting)
  aiGeneration: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    skipSuccessfulRequests: false,
    skipFailedRequests: true, // Don't count failed requests
  } as RateLimitRule,

  // Firm admin endpoints
  firmAdmin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  } as RateLimitRule,

  // API key based access
  apiKey: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 500,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  } as RateLimitRule,
};

// Get rate limit rule based on request context
export function getRateLimitRule(req: Request): RateLimitRule {
  // Check if this is an AI generation endpoint
  if (req.path.includes('/demand-letters/generate')) {
    return rateLimitRules.aiGeneration;
  }

  // Check if user is a firm admin
  const user = (req as any).user;
  if (user?.role === 'admin') {
    return rateLimitRules.firmAdmin;
  }

  // Check if using API key
  if (req.headers['x-api-key']) {
    return rateLimitRules.apiKey;
  }

  // Authenticated user
  if (user) {
    return rateLimitRules.authenticated;
  }

  // Anonymous user
  return rateLimitRules.anonymous;
}

// Endpoints to skip rate limiting
export const skipRateLimitEndpoints = [
  '/health',
  '/metrics',
];

export function shouldSkipRateLimit(req: Request): boolean {
  return skipRateLimitEndpoints.includes(req.path);
}
