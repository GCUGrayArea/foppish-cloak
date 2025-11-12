import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../auth/jwt';
import type { UserContext } from '../types/auth';

/**
 * Extend Express Request to include user context
 */
declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user context to request
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'No token provided',
        code: 'NO_TOKEN'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT signature and expiration
    const payload = verifyAccessToken(token);

    // Attach user context to request
    req.user = {
      id: payload.sub,
      email: payload.email,
      firmId: payload.firmId,
      role: payload.role
    };

    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'TOKEN_EXPIRED') {
        res.status(401).json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
        return;
      }

      if (error.message === 'INVALID_TOKEN') {
        res.status(401).json({
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
        return;
      }
    }

    // Generic authentication error
    res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user context if token is provided and valid, but doesn't require it
 * Useful for endpoints that behave differently for authenticated users
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user context
      next();
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.sub,
      email: payload.email,
      firmId: payload.firmId,
      role: payload.role
    };

    next();
  } catch {
    // Invalid token, continue without user context
    next();
  }
}
