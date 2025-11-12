/**
 * Tests for WebSocket authentication middleware
 */

import * as jwt from 'jsonwebtoken';
import { AuthMiddleware } from '../../services/collaboration/src/middleware/auth';
import { WebSocketEvent } from '../../services/collaboration/src/types';

describe('AuthMiddleware', () => {
  let authMiddleware: AuthMiddleware;
  const jwtSecret = 'test-secret';

  beforeEach(() => {
    process.env.JWT_SECRET = jwtSecret;
    authMiddleware = new AuthMiddleware();
  });

  describe('verifyToken', () => {
    it('should verify valid JWT token', () => {
      const payload = {
        userId: 'user-123',
        firmId: 'firm-456',
        email: 'test@example.com',
        role: 'attorney',
      };

      const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });

      const event = {
        queryStringParameters: { token },
      } as unknown as WebSocketEvent;

      const result = authMiddleware.verifyToken(event);

      expect(result.userId).toBe(payload.userId);
      expect(result.firmId).toBe(payload.firmId);
    });

    it('should throw error for missing token', () => {
      const event = {
        queryStringParameters: {},
      } as unknown as WebSocketEvent;

      expect(() => authMiddleware.verifyToken(event)).toThrow('Missing authentication token');
    });

    it('should throw error for invalid token', () => {
      const event = {
        queryStringParameters: { token: 'invalid-token' },
      } as unknown as WebSocketEvent;

      expect(() => authMiddleware.verifyToken(event)).toThrow('Invalid token');
    });

    it('should throw error for expired token', () => {
      const payload = {
        userId: 'user-123',
        firmId: 'firm-456',
        email: 'test@example.com',
        role: 'attorney',
      };

      const token = jwt.sign(payload, jwtSecret, { expiresIn: '-1h' });

      const event = {
        queryStringParameters: { token },
      } as unknown as WebSocketEvent;

      expect(() => authMiddleware.verifyToken(event)).toThrow('Token expired');
    });
  });

  describe('getLetterIdFromEvent', () => {
    it('should extract letterId from query parameters', () => {
      const event = {
        queryStringParameters: { letterId: 'letter-123' },
      } as unknown as WebSocketEvent;

      const result = authMiddleware.getLetterIdFromEvent(event);

      expect(result).toBe('letter-123');
    });

    it('should throw error for missing letterId', () => {
      const event = {
        queryStringParameters: {},
      } as unknown as WebSocketEvent;

      expect(() => authMiddleware.getLetterIdFromEvent(event)).toThrow('Missing letterId parameter');
    });
  });
});
