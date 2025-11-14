import { Request, Response, NextFunction } from 'express';
import {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalError,
} from '../../services/api/src/middleware/errorHandler';

/**
 * Tests for error handler middleware
 */

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an app error with all properties', () => {
      const error = new AppError(400, 'Bad request', 'BAD_REQUEST', { field: 'email' });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad request');
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.details).toEqual({ field: 'email' });
      expect(error.name).toBe('AppError');
      expect(error.stack).toBeDefined();
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error with 400 status', () => {
      const error = new ValidationError('Invalid email format', { field: 'email' });

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid email format');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('AuthenticationError', () => {
    it('should create an authentication error with 401 status', () => {
      const error = new AuthenticationError('Invalid token');

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Invalid token');
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.name).toBe('AuthenticationError');
    });

    it('should use default message if none provided', () => {
      const error = new AuthenticationError();

      expect(error.message).toBe('Authentication required');
    });
  });

  describe('AuthorizationError', () => {
    it('should create an authorization error with 403 status', () => {
      const error = new AuthorizationError('Access denied');

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Access denied');
      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error.name).toBe('AuthorizationError');
    });

    it('should use default message if none provided', () => {
      const error = new AuthorizationError();

      expect(error.message).toBe('Insufficient permissions');
    });
  });

  describe('NotFoundError', () => {
    it('should create a not found error with 404 status', () => {
      const error = new NotFoundError('User');

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('NotFoundError');
    });

    it('should use default resource name if none provided', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Resource not found');
    });
  });

  describe('ConflictError', () => {
    it('should create a conflict error with 409 status', () => {
      const error = new ConflictError('Email already exists');

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Email already exists');
      expect(error.code).toBe('CONFLICT');
      expect(error.name).toBe('ConflictError');
    });
  });

  describe('RateLimitError', () => {
    it('should create a rate limit error with 429 status', () => {
      const error = new RateLimitError('Rate limit exceeded');

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.name).toBe('RateLimitError');
    });

    it('should use default message if none provided', () => {
      const error = new RateLimitError();

      expect(error.message).toBe('Too many requests');
    });
  });

  describe('InternalError', () => {
    it('should create an internal error with 500 status', () => {
      const error = new InternalError('Database connection failed');

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Database connection failed');
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.name).toBe('InternalError');
    });

    it('should use default message if none provided', () => {
      const error = new InternalError();

      expect(error.message).toBe('Internal server error');
    });
  });
});

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;

  beforeEach(() => {
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });

    mockReq = {
      correlationId: 'test-correlation-id',
      logger: {
        error: jest.fn(),
        log: jest.fn(),
      } as any,
      method: 'GET',
      path: '/api/test',
    };

    mockRes = {
      status: statusSpy,
      json: jsonSpy,
      headersSent: false,
    };

    mockNext = jest.fn();
  });

  describe('errorHandler', () => {
    it('should handle ValidationError with 400 status', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: { field: 'email' },
          correlationId: 'test-correlation-id',
        },
      });
    });

    it('should handle AuthenticationError with 401 status', () => {
      const error = new AuthenticationError('Invalid token');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Invalid token',
          correlationId: 'test-correlation-id',
        },
      });
    });

    it('should handle NotFoundError with 404 status', () => {
      const error = new NotFoundError('User');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
          correlationId: 'test-correlation-id',
        },
      });
    });

    it('should handle InternalError with 500 status', () => {
      const error = new InternalError('Database error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database error',
          correlationId: 'test-correlation-id',
        },
      });
    });

    it('should handle generic Error with 500 status', () => {
      const error = new Error('Unexpected error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unexpected error',
          correlationId: 'test-correlation-id',
        },
      });
    });

    it('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.any(String),
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should not send response if headers already sent', () => {
      mockRes.headersSent = true;
      const error = new Error('Test error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).not.toHaveBeenCalled();
      expect(jsonSpy).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should use correlation ID from request if available', () => {
      const error = new ValidationError('Test error');
      mockReq.correlationId = 'custom-correlation-id';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            correlationId: 'custom-correlation-id',
          }),
        })
      );
    });
  });

  describe('notFoundHandler', () => {
    it('should create NotFoundError and call next', () => {
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('Endpoint not found');
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async operations', async () => {
      const asyncFn = jest.fn().mockResolvedValue(undefined);
      const handler = asyncHandler(asyncFn);

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch errors from async operations', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const handler = asyncHandler(asyncFn);

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle synchronous errors', async () => {
      const error = new Error('Sync error');
      const asyncFn = jest.fn().mockImplementation(() => {
        throw error;
      });
      const handler = asyncHandler(asyncFn);

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
