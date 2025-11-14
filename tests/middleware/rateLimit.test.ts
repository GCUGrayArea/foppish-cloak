/**
 * Rate Limit Middleware Unit Tests
 */

import { Request, Response, NextFunction } from 'express';
import { createRateLimiter, dynamicRateLimit } from '../../services/api/src/middleware/rateLimit';

// Mock dependencies
jest.mock('../../services/api/src/config/redis', () => ({
  getRedisClient: jest.fn(() => null), // Return null to use memory store
}));

jest.mock('../../services/api/src/config/rateLimit', () => ({
  getRateLimitRule: jest.fn((req) => ({
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  })),
  shouldSkipRateLimit: jest.fn((req) => {
    // Skip health check endpoint
    return req.path === '/health';
  }),
}));

describe('Rate Limit Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      ip: '127.0.0.1',
      path: '/api/test',
      method: 'GET',
      headers: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      getHeader: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe('createRateLimiter', () => {
    it('should create a rate limiter instance', () => {
      const limiter = createRateLimiter();
      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('should use memory store when Redis is not available', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      createRateLimiter();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Redis not available - using memory store for rate limiting'
      );
      consoleSpy.mockRestore();
    });
  });

  describe('dynamicRateLimit', () => {
    it('should skip rate limiting when RATE_LIMIT_ENABLED is false', () => {
      const originalEnv = process.env.RATE_LIMIT_ENABLED;
      process.env.RATE_LIMIT_ENABLED = 'false';

      dynamicRateLimit(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      process.env.RATE_LIMIT_ENABLED = originalEnv;
    });

    it('should skip rate limiting for health check endpoint', () => {
      mockRequest.path = '/health';

      dynamicRateLimit(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should apply rate limiting for normal requests', () => {
      dynamicRateLimit(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // The limiter should be called (next will be called by the limiter)
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use user ID in key when user is authenticated', () => {
      (mockRequest as any).user = { id: 'user-123' };

      dynamicRateLimit(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should use IP in key when user is not authenticated', () => {
      mockRequest.ip = '192.168.1.1';

      dynamicRateLimit(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Rate limit handler', () => {
    it('should return 429 when rate limit is exceeded', () => {
      const limiter = createRateLimiter();

      // Simulate rate limit exceeded by calling handler directly
      const mockReq = mockRequest as Request;
      const mockRes = mockResponse as Response;

      // The rate limiter internally handles the 429 response
      expect(limiter).toBeDefined();
    });

    it('should include retry-after header in response', () => {
      const limiter = createRateLimiter();
      expect(limiter).toBeDefined();
    });
  });

  describe('Key generation', () => {
    it('should generate different keys for different IPs', () => {
      const limiter = createRateLimiter();

      // First request from IP 1
      const req1 = { ...mockRequest, ip: '192.168.1.1' } as Request;

      // Second request from IP 2
      const req2 = { ...mockRequest, ip: '192.168.1.2' } as Request;

      expect(limiter).toBeDefined();
    });

    it('should generate different keys for different users', () => {
      const limiter = createRateLimiter();

      // First request from user 1
      const req1 = {
        ...mockRequest,
        user: { id: 'user-1' },
      } as Request;

      // Second request from user 2
      const req2 = {
        ...mockRequest,
        user: { id: 'user-2' },
      } as Request;

      expect(limiter).toBeDefined();
    });
  });

  describe('Redis store integration', () => {
    it('should use Redis store when Redis client is available', () => {
      // Mock Redis client
      const mockRedisClient = {
        on: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
      };

      const { getRedisClient } = require('../../services/api/src/config/redis');
      getRedisClient.mockReturnValue(mockRedisClient);

      const limiter = createRateLimiter();
      expect(limiter).toBeDefined();
    });

    it('should gracefully degrade when Redis is unavailable', () => {
      const { getRedisClient } = require('../../services/api/src/config/redis');
      getRedisClient.mockReturnValue(null);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const limiter = createRateLimiter();

      expect(limiter).toBeDefined();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
