/**
 * Firm Context Middleware
 *
 * Enforces multi-tenant isolation by verifying that users can only access
 * resources belonging to their own firm. This middleware should run after
 * authentication middleware has populated req.user.
 */

import { Request, Response, NextFunction } from 'express';
import { UserContext } from '../types/auth';

/**
 * Extended Express Request with user context
 */
export interface AuthenticatedRequest extends Request {
  user?: UserContext;
  firmId?: string;
}

/**
 * Middleware to enforce firm context from JWT
 *
 * This middleware:
 * 1. Verifies the user is authenticated (req.user exists)
 * 2. Extracts firmId from route params or request body
 * 3. Verifies it matches the user's firm from JWT
 * 4. Attaches firmId to request for easy access in handlers
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export function enforceFirmContext(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Verify authentication middleware has run
  if (!req.user || !req.user.firmId) {
    res.status(401).json({
      error: 'Not authenticated',
      code: 'NOT_AUTHENTICATED'
    });
    return;
  }

  // Extract firmId from route params (e.g., /firms/:firmId/users)
  const routeFirmId = req.params.firmId || req.body.firmId;

  // If route specifies a firmId, verify it matches user's firm
  if (routeFirmId && routeFirmId !== req.user.firmId) {
    res.status(403).json({
      error: 'Access denied to other firm resources',
      code: 'FORBIDDEN_CROSS_FIRM_ACCESS'
    });
    return;
  }

  // Attach firm context to request for handler convenience
  req.firmId = req.user.firmId;

  next();
}

/**
 * Middleware variant that allows cross-firm access for super admins
 * (Future enhancement - not implemented yet)
 */
export function enforceFirmContextWithSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // TODO: Implement super admin support if needed
  // For now, just use standard firm context enforcement
  enforceFirmContext(req, res, next);
}
