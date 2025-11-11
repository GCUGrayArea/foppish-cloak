/**
 * Template Ownership Middleware
 *
 * Verifies that the authenticated user's firm owns the requested template.
 * Prevents cross-firm template access in multi-tenant system.
 */

import { Request, Response, NextFunction } from 'express';
import { getPool } from '../db/connection';
import { AuthRequest } from './auth';

/**
 * Verify template ownership by firm
 *
 * Must be used after auth middleware (requireAuth) and firm context middleware.
 * Checks that the template identified by :id or :templateId param belongs
 * to the authenticated user's firm.
 *
 * @throws 403 if template belongs to different firm
 * @throws 404 if template doesn't exist
 */
export async function verifyTemplateOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { firmId, userId } = authReq.user;

    // Get template ID from params (supports both :id and :templateId)
    const templateId = req.params.id || req.params.templateId;

    if (!templateId) {
      res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Template ID is required'
      });
      return;
    }

    // Check if template exists and belongs to user's firm
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, firm_id FROM templates WHERE id = $1',
      [templateId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'TEMPLATE_NOT_FOUND',
        message: 'Template not found'
      });
      return;
    }

    const template = result.rows[0];

    // Verify firm ownership
    if (template.firm_id !== firmId) {
      res.status(403).json({
        error: 'UNAUTHORIZED_TEMPLATE_ACCESS',
        message: 'You do not have access to this template'
      });
      return;
    }

    // Template is owned by user's firm, proceed
    next();
  } catch (error) {
    console.error('Error verifying template ownership:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to verify template ownership'
    });
  }
}

/**
 * Verify template version ownership by firm
 *
 * Similar to verifyTemplateOwnership but checks template_versions table.
 * Joins with templates to verify firm ownership.
 *
 * @throws 403 if template version belongs to different firm
 * @throws 404 if template version doesn't exist
 */
export async function verifyTemplateVersionOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { firmId } = authReq.user;

    // Get version ID from params
    const versionId = req.params.versionId;

    if (!versionId) {
      res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Template version ID is required'
      });
      return;
    }

    // Check if version exists and its template belongs to user's firm
    const pool = getPool();
    const result = await pool.query(
      `SELECT tv.id, t.firm_id
       FROM template_versions tv
       JOIN templates t ON tv.template_id = t.id
       WHERE tv.id = $1`,
      [versionId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'VERSION_NOT_FOUND',
        message: 'Template version not found'
      });
      return;
    }

    const version = result.rows[0];

    // Verify firm ownership
    if (version.firm_id !== firmId) {
      res.status(403).json({
        error: 'UNAUTHORIZED_TEMPLATE_ACCESS',
        message: 'You do not have access to this template version'
      });
      return;
    }

    // Version is owned by user's firm, proceed
    next();
  } catch (error) {
    console.error('Error verifying template version ownership:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to verify template version ownership'
    });
  }
}
