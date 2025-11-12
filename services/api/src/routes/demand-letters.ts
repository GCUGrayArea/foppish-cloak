/**
 * Demand Letter API Routes
 *
 * Endpoints for demand letter workflow:
 * - POST /demand-letters - Create new demand letter
 * - GET /demand-letters - List demand letters
 * - GET /demand-letters/:id - Get demand letter details
 * - POST /demand-letters/:id/analyze - Analyze documents
 * - POST /demand-letters/:id/generate - Generate letter draft
 * - POST /demand-letters/:id/refine - Refine letter
 * - GET /demand-letters/:id/status - Get workflow status
 * - GET /demand-letters/:id/history - Get revision history
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { DemandLetterService } from '../services/DemandLetterService';
import { ExportService } from '../services/ExportService';
import { AuthenticatedRequest } from '../middleware/firmContext';

const router = Router();
const demandLetterService = new DemandLetterService();
const exportService = new ExportService();

/**
 * Validation schemas
 */
const CreateDemandLetterSchema = z.object({
  title: z.string().min(1).max(500),
  templateId: z.string().uuid().optional(),
  documentIds: z.array(z.string().uuid()).optional(),
});

const AnalyzeDemandLetterSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1),
});

const GenerateDemandLetterSchema = z.object({
  templateId: z.string().uuid().optional(),
  customInstructions: z.string().max(2000).optional(),
  tone: z.enum(['formal', 'assertive', 'conciliatory']).optional(),
});

const RefineDemandLetterSchema = z.object({
  feedback: z.string().min(1).max(2000),
  sections: z.array(z.string()).optional(),
});

const ListDemandLettersQuerySchema = z.object({
  status: z.enum(['draft', 'analyzing', 'generating', 'refining', 'complete', 'archived']).optional(),
  createdBy: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

/**
 * POST /demand-letters
 * Create new demand letter
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.firmId) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'User authentication required',
      });
    }

    // Validate request body
    const validation = CreateDemandLetterSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        message: validation.error.message,
      });
    }

    // Create demand letter
    const letter = await demandLetterService.createDemandLetter(
      validation.data,
      req.firmId,
      req.user.id
    );

    return res.status(201).json({
      message: 'Demand letter created successfully',
      letter,
    });
  } catch (error) {
    console.error('Error creating demand letter:', error);
    return res.status(500).json({
      error: 'Creation failed',
      message: error instanceof Error ? error.message : 'Failed to create demand letter',
    });
  }
});

/**
 * GET /demand-letters
 * List demand letters for the firm
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.firmId) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'Firm context required',
      });
    }

    // Validate query parameters
    const queryValidation = ListDemandLettersQuerySchema.safeParse(req.query);

    if (!queryValidation.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        message: queryValidation.error.message,
      });
    }

    // List demand letters
    const result = await demandLetterService.listDemandLetters(
      req.firmId,
      queryValidation.data
    );

    return res.json(result);
  } catch (error) {
    console.error('Error listing demand letters:', error);
    return res.status(500).json({
      error: 'List failed',
      message: error instanceof Error ? error.message : 'Failed to list demand letters',
    });
  }
});

/**
 * GET /demand-letters/:id
 * Get demand letter details
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.firmId) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'Firm context required',
      });
    }

    const { id } = req.params;

    // Validate UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        error: 'Invalid letter ID',
        message: 'Letter ID must be a valid UUID',
      });
    }

    // Get demand letter
    const letter = await demandLetterService.getDemandLetterById(id, req.firmId);

    return res.json({ letter });
  } catch (error) {
    if (error instanceof Error && error.message === 'Demand letter not found') {
      return res.status(404).json({
        error: 'Not found',
        message: 'The requested demand letter does not exist',
      });
    }

    console.error('Error getting demand letter:', error);
    return res.status(500).json({
      error: 'Retrieval failed',
      message: error instanceof Error ? error.message : 'Failed to retrieve demand letter',
    });
  }
});

/**
 * POST /demand-letters/:id/analyze
 * Analyze documents for a demand letter
 */
router.post('/:id/analyze', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.firmId) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'Firm context required',
      });
    }

    const { id } = req.params;

    // Validate UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        error: 'Invalid letter ID',
        message: 'Letter ID must be a valid UUID',
      });
    }

    // Validate request body
    const validation = AnalyzeDemandLetterSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        message: validation.error.message,
      });
    }

    // Analyze documents
    const letter = await demandLetterService.analyzeDemandLetter(
      {
        letterId: id,
        documentIds: validation.data.documentIds,
      },
      req.firmId
    );

    return res.json({
      message: 'Document analysis complete',
      letter,
    });
  } catch (error) {
    console.error('Error analyzing documents:', error);
    return res.status(500).json({
      error: 'Analysis failed',
      message: error instanceof Error ? error.message : 'Failed to analyze documents',
    });
  }
});

/**
 * POST /demand-letters/:id/generate
 * Generate letter draft
 */
router.post('/:id/generate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.firmId) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'User authentication required',
      });
    }

    const { id } = req.params;

    // Validate UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        error: 'Invalid letter ID',
        message: 'Letter ID must be a valid UUID',
      });
    }

    // Validate request body
    const validation = GenerateDemandLetterSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        message: validation.error.message,
      });
    }

    // Generate letter
    const letter = await demandLetterService.generateDemandLetter(
      {
        letterId: id,
        ...validation.data,
      },
      req.firmId,
      req.user.id
    );

    return res.json({
      message: 'Letter generated successfully',
      letter,
    });
  } catch (error) {
    console.error('Error generating letter:', error);
    return res.status(500).json({
      error: 'Generation failed',
      message: error instanceof Error ? error.message : 'Failed to generate letter',
    });
  }
});

/**
 * POST /demand-letters/:id/refine
 * Refine existing letter
 */
router.post('/:id/refine', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.firmId) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'User authentication required',
      });
    }

    const { id } = req.params;

    // Validate UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        error: 'Invalid letter ID',
        message: 'Letter ID must be a valid UUID',
      });
    }

    // Validate request body
    const validation = RefineDemandLetterSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        message: validation.error.message,
      });
    }

    // Refine letter
    const letter = await demandLetterService.refineDemandLetter(
      {
        letterId: id,
        ...validation.data,
      },
      req.firmId,
      req.user.id
    );

    return res.json({
      message: 'Letter refined successfully',
      letter,
    });
  } catch (error) {
    console.error('Error refining letter:', error);
    return res.status(500).json({
      error: 'Refinement failed',
      message: error instanceof Error ? error.message : 'Failed to refine letter',
    });
  }
});

/**
 * GET /demand-letters/:id/status
 * Get workflow status
 */
router.get('/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.firmId) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'Firm context required',
      });
    }

    const { id } = req.params;

    // Validate UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        error: 'Invalid letter ID',
        message: 'Letter ID must be a valid UUID',
      });
    }

    // Get workflow status
    const status = await demandLetterService.getWorkflowStatus(id, req.firmId);

    return res.json(status);
  } catch (error) {
    console.error('Error getting workflow status:', error);
    return res.status(500).json({
      error: 'Status retrieval failed',
      message: error instanceof Error ? error.message : 'Failed to get workflow status',
    });
  }
});

/**
 * GET /demand-letters/:id/history
 * Get revision history
 */
router.get('/:id/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.firmId) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'Firm context required',
      });
    }

    const { id } = req.params;

    // Validate UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        error: 'Invalid letter ID',
        message: 'Letter ID must be a valid UUID',
      });
    }

    // Get letter details (includes revision history)
    const letter = await demandLetterService.getDemandLetterById(id, req.firmId);

    return res.json({
      letterId: letter.id,
      revisions: letter.revisions,
    });
  } catch (error) {
    console.error('Error getting revision history:', error);
    return res.status(500).json({
      error: 'History retrieval failed',
      message: error instanceof Error ? error.message : 'Failed to get revision history',
    });
  }
});

export default router;

/**
 * GET /demand-letters/:id/export/docx
 * Export demand letter to Word format
 */
router.get('/:id/export/docx', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.firmId) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'Firm context required',
      });
    }

    const { id } = req.params;

    // Validate UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        error: 'Invalid letter ID',
        message: 'Letter ID must be a valid UUID',
      });
    }

    // Export to DOCX
    const result = await exportService.exportToDocx(id, req.firmId);

    // Set headers for file download
    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.fileName}"`
    );
    res.setHeader('Content-Length', result.size);

    return res.send(result.buffer);
  } catch (error) {
    if (error instanceof Error && error.message === 'Demand letter not found') {
      return res.status(404).json({
        error: 'Not found',
        message: 'The requested demand letter does not exist',
      });
    }

    if (
      error instanceof Error &&
      error.message.includes('has no content')
    ) {
      return res.status(400).json({
        error: 'Export not available',
        message: error.message,
      });
    }

    console.error('Error exporting to DOCX:', error);
    return res.status(500).json({
      error: 'Export failed',
      message:
        error instanceof Error ? error.message : 'Failed to export document',
    });
  }
});

/**
 * GET /demand-letters/:id/export/pdf
 * Export demand letter to PDF format
 */
router.get('/:id/export/pdf', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.firmId) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'Firm context required',
      });
    }

    const { id } = req.params;

    // Validate UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        error: 'Invalid letter ID',
        message: 'Letter ID must be a valid UUID',
      });
    }

    // Export to PDF
    const result = await exportService.exportToPdf(id, req.firmId);

    // Set headers for file download
    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.fileName}"`
    );
    res.setHeader('Content-Length', result.size);

    return res.send(result.buffer);
  } catch (error) {
    if (error instanceof Error && error.message === 'Demand letter not found') {
      return res.status(404).json({
        error: 'Not found',
        message: 'The requested demand letter does not exist',
      });
    }

    if (
      error instanceof Error &&
      error.message.includes('has no content')
    ) {
      return res.status(400).json({
        error: 'Export not available',
        message: error.message,
      });
    }

    console.error('Error exporting to PDF:', error);
    return res.status(500).json({
      error: 'Export failed',
      message:
        error instanceof Error ? error.message : 'Failed to export document',
    });
  }
});
