/**
 * WebSocket JWT authentication middleware
 * Validates JWT token from query string parameter
 */

import * as jwt from 'jsonwebtoken';
import { WebSocketEvent, JWTPayload } from '../types';

export class AuthMiddleware {
  private jwtSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  }

  /**
   * Verify JWT token from WebSocket connection
   * Token is passed in query string parameter 'token'
   */
  verifyToken(event: WebSocketEvent): JWTPayload {
    const token = event.queryStringParameters?.token;

    if (!token) {
      throw new Error('Missing authentication token');
    }

    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;

      if (!decoded.userId || !decoded.firmId) {
        throw new Error('Invalid token payload');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      throw error;
    }
  }

  /**
   * Extract letter ID from query parameters
   */
  getLetterIdFromEvent(event: WebSocketEvent): string {
    const letterId = event.queryStringParameters?.letterId;

    if (!letterId) {
      throw new Error('Missing letterId parameter');
    }

    return letterId;
  }

  /**
   * Validate user has access to the letter (same firm)
   * TODO: Query database to verify letter belongs to firm
   * For now, we trust the JWT firmId
   */
  async validateLetterAccess(
    _letterId: string,
    _firmId: string
  ): Promise<boolean> {
    return true;
  }
}

export const authMiddleware = new AuthMiddleware();
