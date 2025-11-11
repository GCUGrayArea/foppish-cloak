/**
 * Firm Context Middleware Unit Tests
 */

import { enforceFirmContext, AuthenticatedRequest } from '../../services/api/src/middleware/firmContext';
import { Response } from 'express';

describe('enforceFirmContext middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      user: {
        id: 'user-123',
        email: 'user@example.com',
        firmId: 'firm-123',
        role: 'attorney'
      },
      params: {},
      body: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  it('should pass when user is authenticated', () => {
    enforceFirmContext(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
    expect(mockRequest.firmId).toBe('firm-123');
  });

  it('should return 401 when user not authenticated', () => {
    mockRequest.user = undefined;

    enforceFirmContext(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Not authenticated',
      code: 'NOT_AUTHENTICATED'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 when firmId in route does not match user firmId', () => {
    mockRequest.params = { firmId: 'different-firm' };

    enforceFirmContext(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Access denied to other firm resources',
      code: 'FORBIDDEN_CROSS_FIRM_ACCESS'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should pass when firmId in route matches user firmId', () => {
    mockRequest.params = { firmId: 'firm-123' };

    enforceFirmContext(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
    expect(mockRequest.firmId).toBe('firm-123');
  });

  it('should pass when firmId in body matches user firmId', () => {
    mockRequest.body = { firmId: 'firm-123' };

    enforceFirmContext(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
  });

  it('should attach firmId to request', () => {
    enforceFirmContext(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockRequest.firmId).toBe('firm-123');
    expect(mockNext).toHaveBeenCalled();
  });
});
