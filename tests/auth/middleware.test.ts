import { Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuth } from '../../services/api/src/middleware/auth';
import {
  requireRole,
  requireAdmin,
  requireSelfOrAdmin,
  requireSameFirm
} from '../../services/api/src/middleware/permissions';
import * as jwtModule from '../../services/api/src/auth/jwt';

// Mock JWT module
jest.mock('../../services/api/src/auth/jwt');

describe('Authentication Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const validPayload = {
    sub: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    firmId: '223e4567-e89b-12d3-a456-426614174000',
    role: 'attorney' as const,
    iat: Date.now() / 1000,
    exp: Date.now() / 1000 + 3600
  };

  beforeEach(() => {
    mockReq = {
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should attach user context for valid token', async () => {
      mockReq.headers = { authorization: 'Bearer valid_token' };
      (jwtModule.verifyAccessToken as jest.Mock).mockReturnValue(validPayload);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual({
        id: validPayload.sub,
        email: validPayload.email,
        firmId: validPayload.firmId,
        role: validPayload.role
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 for missing token', async () => {
      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No token provided',
        code: 'NO_TOKEN'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token format', async () => {
      mockReq.headers = { authorization: 'InvalidFormat token' };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for expired token', async () => {
      mockReq.headers = { authorization: 'Bearer expired_token' };
      (jwtModule.verifyAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error('TOKEN_EXPIRED');
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      mockReq.headers = { authorization: 'Bearer invalid_token' };
      (jwtModule.verifyAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error('INVALID_TOKEN');
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should attach user context for valid token', async () => {
      mockReq.headers = { authorization: 'Bearer valid_token' };
      (jwtModule.verifyAccessToken as jest.Mock).mockReturnValue(validPayload);

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without user context when no token provided', async () => {
      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should continue without user context for invalid token', async () => {
      mockReq.headers = { authorization: 'Bearer invalid_token' };
      (jwtModule.verifyAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error('INVALID_TOKEN');
      });

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});

describe('Authorization Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        firmId: '223e4567-e89b-12d3-a456-426614174000',
        role: 'attorney'
      }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('requireRole', () => {
    it('should allow access for authorized role', () => {
      const middleware = requireRole('attorney', 'admin');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should deny access for unauthorized role', () => {
      const middleware = requireRole('admin');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INSUFFICIENT_PERMISSIONS'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated request', () => {
      mockReq.user = undefined;
      const middleware = requireRole('attorney');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow access for admin user', () => {
      mockReq.user!.role = 'admin';

      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access for non-admin user', () => {
      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireSelfOrAdmin', () => {
    it('should allow user to access own resource', () => {
      mockReq.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
      const middleware = requireSelfOrAdmin(req => req.params!.id);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow admin to access any resource', () => {
      mockReq.user!.role = 'admin';
      mockReq.params = { id: 'different-user-id' };
      const middleware = requireSelfOrAdmin(req => req.params!.id);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny non-admin from accessing other user resource', () => {
      mockReq.params = { id: 'different-user-id' };
      const middleware = requireSelfOrAdmin(req => req.params!.id);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireSameFirm', () => {
    it('should allow access to same firm resource', () => {
      mockReq.params = { firmId: '223e4567-e89b-12d3-a456-426614174000' };
      const middleware = requireSameFirm(req => req.params!.firmId);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access to different firm resource', () => {
      mockReq.params = { firmId: 'different-firm-id' };
      const middleware = requireSameFirm(req => req.params!.firmId);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CROSS_FIRM_ACCESS_DENIED'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
