/**
 * Template API Routes
 *
 * Endpoints for template management:
 * - GET /templates - List all firm templates
 * - GET /templates/:id - Get template details
 * - POST /templates - Create new template (admin only)
 * - PUT /templates/:id - Update template (admin only)
 * - POST /templates/:id/rollback - Rollback to previous version (admin only)
 * - DELETE /templates/:id - Delete template (admin only)
 */

import { Router, Response } from 'express';
import { TemplateService } from '../services/TemplateService';
import { AuthenticatedRequest } from '../middleware/firmContext';
import { verifyTemplateOwnership } from '../middleware/templateOwnership';
import {
  createTemplateSchema,
  updateTemplateSchema,
  templateQuerySchema
} from '../utils/templateValidation';
import { validateTemplateContent } from '../utils/templateValidation';
import { z } from 'zod';

const router = Router();
const templateService = new TemplateService();

/**
 * Validate template update request
 *
 * @param req - Request object
 * @param res - Response object
 * @returns Validated data or null if validation failed (response already sent)
 */
function validateTemplateUpdate(
  req: AuthenticatedRequest,
  res: Response
): { user: any; data: any } | null {
  const user = req.user;

  if (!user) {
    res.status(401).json({
      error: 'Not authenticated',
      code: 'NOT_AUTHENTICATED'
    });
    return null;
  }

  // Verify admin role
  if (user.role !== 'admin') {
    res.status(403).json({
      error: 'Admin access required',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
    return null;
  }

  // Validate request body
  const validation = updateTemplateSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      error: 'Invalid request data',
      code: 'INVALID_INPUT',
      details: validation.error.errors
    });
    return null;
  }

  const data = validation.data;

  // Validate content if provided
  if (data.content) {
    const contentValidation = validateTemplateContent(data.content);
    if (!contentValidation.valid) {
      res.status(400).json({
        error: 'Invalid template content',
        code: 'INVALID_TEMPLATE_CONTENT',
        details: contentValidation.errors
      });
      return null;
    }
  }

  return { user, data };
}


/**
 * Rollback request schema
 */
const rollbackSchema = z.object({
  versionId: z.string().uuid('Invalid version ID format')
});

/**
 * GET /templates
 * List all templates for the authenticated user's firm
 *
 * Query params:
 * - isDefault: Filter by default status
 * - search: Search by name/description
 * - page: Page number (default 1)
 * - limit: Items per page (default 50, max 100)
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Validate query parameters
    const queryValidation = templateQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        code: 'INVALID_INPUT',
        details: queryValidation.error.errors
      });
    }

    const params = queryValidation.data;

    // Get templates
    const result = await templateService.listTemplates(user.firmId, params);

    return res.json({
      templates: result.templates,
      total: result.total,
      page: params.page || 1,
      limit: params.limit || 50
    });
  } catch (error: any) {
    console.error('List templates error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /templates/:id
 * Get detailed template information including current version and history
 */
router.get(
  '/:id',
  verifyTemplateOwnership,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      const templateId = req.params.id;

      if (!user) {
        return res.status(401).json({
          error: 'Not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
      }

      const template = await templateService.getTemplateById(
        templateId,
        user.firmId
      );

      return res.json(template);
    } catch (error: any) {
      console.error('Get template error:', error);

      if (error.message === 'TEMPLATE_NOT_FOUND') {
        return res.status(404).json({
          error: 'Template not found',
          code: 'TEMPLATE_NOT_FOUND'
        });
      }

      return res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * POST /templates
 * Create a new template (admin only)
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Verify admin role
    if (user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Validate request body
    const validation = createTemplateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        code: 'INVALID_INPUT',
        details: validation.error.errors
      });
    }

    const data = validation.data;

    // Validate template content structure
    const contentValidation = validateTemplateContent(data.content);
    if (!contentValidation.valid) {
      return res.status(400).json({
        error: 'Invalid template content',
        code: 'INVALID_TEMPLATE_CONTENT',
        details: contentValidation.errors
      });
    }

    // Create template
    const template = await templateService.createTemplate(
      user.firmId,
      user.id,
      data
    );

    return res.status(201).json(template);
  } catch (error: any) {
    console.error('Create template error:', error);

    if (error.message === 'TEMPLATE_NAME_EXISTS') {
      return res.status(409).json({
        error: 'Template with this name already exists',
        code: 'TEMPLATE_NAME_EXISTS'
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * PUT /templates/:id
 * Update template metadata and/or content (admin only)
 *
 * - Content changes create a new version
 * - Metadata changes (name, description) don't create versions
 */
router.put(
  '/:id',
  verifyTemplateOwnership,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      const templateId = req.params.id;

      if (!user) {
        return res.status(401).json({
          error: 'Not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
      }

      // Verify admin role
      if (user.role !== 'admin') {
        return res.status(403).json({
          error: 'Admin access required',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Validate request body
      const validation = updateTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid request data',
          code: 'INVALID_INPUT',
          details: validation.error.errors
        });
      }

      const data = validation.data;

      // Validate content if provided
      if (data.content) {
        const contentValidation = validateTemplateContent(data.content);
        if (!contentValidation.valid) {
          return res.status(400).json({
            error: 'Invalid template content',
            code: 'INVALID_TEMPLATE_CONTENT',
            details: contentValidation.errors
          });
        }
      }

      // Update template
      const template = await templateService.updateTemplate(
        templateId,
        user.firmId,
        user.id,
        data
      );

      return res.json(template);
    } catch (error: any) {
      console.error('Update template error:', error);

      if (error.message === 'TEMPLATE_NOT_FOUND') {
        return res.status(404).json({
          error: 'Template not found',
          code: 'TEMPLATE_NOT_FOUND'
        });
      }

      if (error.message === 'TEMPLATE_NAME_EXISTS') {
        return res.status(409).json({
          error: 'Template with this name already exists',
          code: 'TEMPLATE_NAME_EXISTS'
        });
      }

      return res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * POST /templates/:id/rollback
 * Rollback template to a previous version (admin only)
 *
 * Body: { versionId: string }
 */
router.post(
  '/:id/rollback',
  verifyTemplateOwnership,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      const templateId = req.params.id;

      if (!user) {
        return res.status(401).json({
          error: 'Not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
      }

      // Verify admin role
      if (user.role !== 'admin') {
        return res.status(403).json({
          error: 'Admin access required',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Validate request body
      const validation = rollbackSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid request data',
          code: 'INVALID_INPUT',
          details: validation.error.errors
        });
      }

      const { versionId } = validation.data;

      // Rollback to version
      const template = await templateService.rollbackToVersion(
        templateId,
        user.firmId,
        versionId
      );

      return res.json(template);
    } catch (error: any) {
      console.error('Rollback template error:', error);

      if (error.message === 'TEMPLATE_NOT_FOUND') {
        return res.status(404).json({
          error: 'Template not found',
          code: 'TEMPLATE_NOT_FOUND'
        });
      }

      if (error.message === 'VERSION_NOT_FOUND') {
        return res.status(404).json({
          error: 'Template version not found',
          code: 'VERSION_NOT_FOUND'
        });
      }

      return res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * DELETE /templates/:id
 * Delete a template (admin only)
 *
 * Note: This is a hard delete. Template and all versions are removed.
 */
router.delete(
  '/:id',
  verifyTemplateOwnership,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      const templateId = req.params.id;

      if (!user) {
        return res.status(401).json({
          error: 'Not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
      }

      // Verify admin role
      if (user.role !== 'admin') {
        return res.status(403).json({
          error: 'Admin access required',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Delete template
      await templateService.deleteTemplate(templateId, user.firmId);

      return res.status(204).send();
    } catch (error: any) {
      console.error('Delete template error:', error);

      if (error.message === 'TEMPLATE_NOT_FOUND') {
        return res.status(404).json({
          error: 'Template not found',
          code: 'TEMPLATE_NOT_FOUND'
        });
      }

      return res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

export default router;
