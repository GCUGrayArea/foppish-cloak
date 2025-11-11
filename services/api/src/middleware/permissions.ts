import { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../types/auth';

/**
 * Role-Based Access Control (RBAC) middleware
 * Requires authentication middleware to run first
 */

/**
 * Middleware factory to require specific roles
 * @param allowedRoles - Array of roles that are allowed to access the route
 * @returns Express middleware function
 *
 * @example
 * router.delete('/users/:id', authenticate, requireRole('admin'), deleteUser);
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Ensure user is authenticated
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    // Check if user's role is in the allowed list
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to require admin role
 * Shorthand for requireRole('admin')
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  return requireRole('admin')(req, res, next);
}

/**
 * Middleware to ensure user can only access their own resources
 * or is an admin (admins can access any resource in their firm)
 *
 * @param getUserIdFromRequest - Function to extract user ID from request
 * @returns Express middleware function
 *
 * @example
 * router.put(
 *   '/users/:id',
 *   authenticate,
 *   requireSelfOrAdmin(req => req.params.id),
 *   updateUser
 * );
 */
export function requireSelfOrAdmin(
  getUserIdFromRequest: (req: Request) => string
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    const targetUserId = getUserIdFromRequest(req);
    const isAdmin = req.user.role === 'admin';
    const isSelf = req.user.id === targetUserId;

    if (!isAdmin && !isSelf) {
      res.status(403).json({
        error: 'Can only modify your own profile or must be admin',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to ensure firm context matches authenticated user's firm
 * Prevents cross-firm data access
 *
 * @param getFirmIdFromRequest - Function to extract firm ID from request
 * @returns Express middleware function
 */
export function requireSameFirm(getFirmIdFromRequest: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    const targetFirmId = getFirmIdFromRequest(req);

    if (req.user.firmId !== targetFirmId) {
      res.status(403).json({
        error: 'Access denied to other firm resources',
        code: 'CROSS_FIRM_ACCESS_DENIED'
      });
      return;
    }

    next();
  };
}
