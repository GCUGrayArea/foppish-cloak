/**
 * Firm Ownership Verification Middleware
 *
 * Verifies that a specific resource (identified by ID in route params)
 * belongs to the authenticated user's firm. This provides an additional
 * layer of security beyond firm context enforcement.
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './firmContext';
import { getPool } from '../db/connection';

/**
 * Creates middleware to verify resource ownership by firm
 *
 * @param tableName - Database table name to check
 * @param resourceIdParam - Route parameter name for resource ID (default: 'id')
 * @returns Express middleware function
 *
 * @example
 * // Verify template belongs to user's firm
 * router.get('/templates/:id', authenticate, verifyFirmOwnership('templates'), getTemplate);
 *
 * // Verify document with custom param name
 * router.get('/docs/:documentId', authenticate, verifyFirmOwnership('documents', 'documentId'), getDocument);
 */
export function verifyFirmOwnership(
  tableName: string,
  resourceIdParam: string = 'id'
) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const resourceId = req.params[resourceIdParam];
      const firmId = req.user?.firmId;

      if (!firmId) {
        res.status(401).json({
          error: 'Not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
        return;
      }

      if (!resourceId) {
        res.status(400).json({
          error: 'Resource ID not provided',
          code: 'MISSING_RESOURCE_ID'
        });
        return;
      }

      // Query database to verify resource belongs to firm
      const pool = getPool();
      const result = await pool.query(
        `SELECT firm_id FROM ${tableName} WHERE id = $1`,
        [resourceId]
      );

      if (result.rows.length === 0) {
        // Resource doesn't exist - return 404 to avoid leaking existence
        res.status(404).json({
          error: 'Resource not found',
          code: 'RESOURCE_NOT_FOUND'
        });
        return;
      }

      const resourceFirmId = result.rows[0].firm_id;

      if (resourceFirmId !== firmId) {
        // Resource exists but belongs to different firm - return 404 to avoid leaking existence
        res.status(404).json({
          error: 'Resource not found',
          code: 'RESOURCE_NOT_FOUND'
        });
        return;
      }

      // Resource verified - continue to handler
      next();
    } catch (error) {
      console.error('Error verifying firm ownership:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}

/**
 * Verifies that a user belongs to the authenticated user's firm
 * Special case of ownership verification with additional checks
 *
 * @param userIdParam - Route parameter name for user ID (default: 'userId')
 * @returns Express middleware function
 */
export function verifyUserFirmOwnership(userIdParam: string = 'userId') {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const targetUserId = req.params[userIdParam];
      const authenticatedUserId = req.user?.id;
      const firmId = req.user?.firmId;

      if (!firmId || !authenticatedUserId) {
        res.status(401).json({
          error: 'Not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
        return;
      }

      if (!targetUserId) {
        res.status(400).json({
          error: 'User ID not provided',
          code: 'MISSING_USER_ID'
        });
        return;
      }

      // Query database to verify user belongs to same firm
      const pool = getPool();
      const result = await pool.query(
        'SELECT id, firm_id, is_active FROM users WHERE id = $1',
        [targetUserId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      const targetUser = result.rows[0];

      if (targetUser.firm_id !== firmId) {
        // User exists but belongs to different firm
        res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      // User verified - continue to handler
      next();
    } catch (error) {
      console.error('Error verifying user firm ownership:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}
