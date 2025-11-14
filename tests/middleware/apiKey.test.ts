/**
 * API Key Middleware Unit Tests
 */

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { validateApiKey, authenticateWithApiKey } from '../../services/api/src/middleware/apiKey';
import pool from '../../services/api/src/db/pool';

// Mock database pool
jest.mock('../../services/api/src/db/pool', () => ({
  query: jest.fn(),
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('API Key Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('validateApiKey', () => {
    it('should continue to next middleware when no API key is provided', async () => {
      await validateApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should validate API key against database', async () => {
      const apiKey = 'test-api-key-123';
      const hashedKey = await bcrypt.hash(apiKey, 10);

      mockRequest.headers = {
        'x-api-key': apiKey,
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 'firm-123',
            name: 'Test Firm',
            api_key_hash: hashedKey,
            api_key_enabled: true,
          },
        ],
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await validateApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, name, api_key_hash'),
        []
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(apiKey, hashedKey);
      expect((mockRequest as any).firm).toEqual({
        id: 'firm-123',
        name: 'Test Firm',
      });
      expect((mockRequest as any).apiKeyAuth).toBe(true);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when API key is invalid', async () => {
      const apiKey = 'invalid-api-key';

      mockRequest.headers = {
        'x-api-key': apiKey,
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 'firm-123',
            name: 'Test Firm',
            api_key_hash: 'some-hash',
            api_key_enabled: true,
          },
        ],
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await validateApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid API key',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when no firms have API keys enabled', async () => {
      mockRequest.headers = {
        'x-api-key': 'test-api-key',
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [],
      });

      await validateApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid API key',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockRequest.headers = {
        'x-api-key': 'test-api-key',
      };

      const dbError = new Error('Database connection failed');
      (pool.query as jest.Mock).mockRejectedValue(dbError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await validateApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'API key validation error:',
        dbError
      );
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to validate API key',
      });
      expect(mockNext).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should check multiple firms until valid key is found', async () => {
      const apiKey = 'valid-api-key';

      mockRequest.headers = {
        'x-api-key': apiKey,
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 'firm-1',
            name: 'Firm One',
            api_key_hash: 'hash-1',
            api_key_enabled: true,
          },
          {
            id: 'firm-2',
            name: 'Firm Two',
            api_key_hash: 'hash-2',
            api_key_enabled: true,
          },
        ],
      });

      // First comparison fails, second succeeds
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      await validateApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bcrypt.compare).toHaveBeenCalledTimes(2);
      expect((mockRequest as any).firm).toEqual({
        id: 'firm-2',
        name: 'Firm Two',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should attach firm context and apiKeyAuth flag when valid', async () => {
      const apiKey = 'test-api-key';
      const hashedKey = 'hashed-key';

      mockRequest.headers = {
        'x-api-key': apiKey,
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 'firm-abc',
            name: 'ABC Law Firm',
            api_key_hash: hashedKey,
            api_key_enabled: true,
          },
        ],
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await validateApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect((mockRequest as any).firm).toEqual({
        id: 'firm-abc',
        name: 'ABC Law Firm',
      });
      expect((mockRequest as any).apiKeyAuth).toBe(true);
    });
  });

  describe('authenticateWithApiKey', () => {
    it('should call next when API key authentication succeeded', async () => {
      (mockRequest as any).apiKeyAuth = true;

      await authenticateWithApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fall through to JWT auth when no API key auth', async () => {
      // Mock the authenticate function from auth middleware
      const mockAuthenticate = jest.fn();
      jest.mock('../../services/api/src/middleware/auth', () => ({
        authenticate: mockAuthenticate,
      }));

      await authenticateWithApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Should call next (since apiKeyAuth is not set)
      // In real implementation, this would import and call authenticate
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('API key security', () => {
    it('should only query firms with api_key_enabled = true', async () => {
      mockRequest.headers = {
        'x-api-key': 'test-key',
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [],
      });

      await validateApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('api_key_enabled = true'),
        []
      );
    });

    it('should use bcrypt compare for secure key comparison', async () => {
      const apiKey = 'secret-key';

      mockRequest.headers = {
        'x-api-key': apiKey,
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 'firm-1',
            name: 'Test Firm',
            api_key_hash: 'bcrypt-hash',
            api_key_enabled: true,
          },
        ],
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await validateApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bcrypt.compare).toHaveBeenCalledWith(apiKey, 'bcrypt-hash');
    });
  });
});
