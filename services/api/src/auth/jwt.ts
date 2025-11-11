import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import type { JWTPayload, UserRole } from '../types/auth';

/**
 * JWT token generation and validation utilities
 */

/**
 * Generate a JWT access token
 * @param userId - User's UUID
 * @param email - User's email
 * @param firmId - Firm's UUID (for multi-tenancy)
 * @param role - User's role
 * @returns JWT token string
 */
export function generateAccessToken(
  userId: string,
  email: string,
  firmId: string,
  role: UserRole
): string {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    sub: userId,
    email,
    firmId,
    role
  };

  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.accessTokenExpiry,
    algorithm: jwtConfig.algorithm
  });
}

/**
 * Verify and decode a JWT access token
 * @param token - JWT token string
 * @returns Decoded JWT payload
 * @throws Error if token is invalid or expired
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, jwtConfig.secret, {
      algorithms: [jwtConfig.algorithm]
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('INVALID_TOKEN');
    }
    throw error;
  }
}

/**
 * Decode a JWT token without verifying the signature
 * Useful for extracting payload in error scenarios
 * WARNING: Never trust unverified tokens for authentication
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Check if a token is expired without throwing
 * @param token - JWT token string
 * @returns True if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    verifyAccessToken(token);
    return false;
  } catch (error) {
    if (error instanceof Error && error.message === 'TOKEN_EXPIRED') {
      return true;
    }
    return false;
  }
}
