/**
 * Document API Routes
 *
 * Endpoints for document upload and management:
 * - POST /documents/upload - Upload source document
 * - GET /documents - List firm documents
 * - GET /documents/:id - Get document metadata
 * - GET /documents/:id/download - Get download URL for document
 * - DELETE /documents/:id - Delete document
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { DocumentService } from '../services/DocumentService';
import { AuthenticatedRequest } from '../middleware/firmContext';
import { uploadSingle, handleUploadError } from '../middleware/upload';

const router = Router();
const documentService = new DocumentService();

/**
 * Validation schemas
 */
const ListDocumentsQuerySchema = z.object({
  uploadedBy: z.string().uuid().optional(),
  fileType: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional()
});

/**
 * POST /documents/upload
 * Upload a new document
 */
router.post(
  '/upload',
  uploadSingle,
  handleUploadError,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file provided',
          message: 'Please upload a file'
        });
      }

      if (!req.user || !req.firmId) {
        return res.status(401).json({
          error: 'Not authenticated',
          message: 'User authentication required'
        });
      }

      const document = await documentService.uploadDocument({
        file: req.file,
        firmId: req.firmId,
        uploadedBy: req.user.id
      });

      res.status(201).json({
        message: 'Document uploaded successfully',
        document
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Failed to upload document'
      });
    }
  }
);

/**
 * GET /documents
 * List all documents for the firm
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.firmId) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'Firm context required'
      });
    }

    // Validate query parameters
    const queryValidation = ListDocumentsQuerySchema.safeParse(req.query);

    if (!queryValidation.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        message: queryValidation.error.message
      });
    }

    const query = queryValidation.data;

    const result = await documentService.listDocuments({
      firmId: req.firmId,
      ...query
    });

    res.json(result);
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({
      error: 'List failed',
      message: error instanceof Error ? error.message : 'Failed to list documents'
    });
  }
});

/**
 * GET /documents/:id
 * Get document metadata
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.firmId) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'Firm context required'
      });
    }

    const { id } = req.params;

    // Validate UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        error: 'Invalid document ID',
        message: 'Document ID must be a valid UUID'
      });
    }

    const document = await documentService.getDocumentById(id, req.firmId);

    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: 'The requested document does not exist or you do not have access to it'
      });
    }

    res.json({ document });
  } catch (error) {
    console.error('Error getting document:', error);
    res.status(500).json({
      error: 'Retrieval failed',
      message: error instanceof Error ? error.message : 'Failed to retrieve document'
    });
  }
});

/**
 * GET /documents/:id/download
 * Get a signed download URL for the document
 */
router.get('/:id/download', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.firmId) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'Firm context required'
      });
    }

    const { id } = req.params;

    // Validate UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        error: 'Invalid document ID',
        message: 'Document ID must be a valid UUID'
      });
    }

    // Check virus scan status first
    const document = await documentService.getDocumentById(id, req.firmId);

    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: 'The requested document does not exist or you do not have access to it'
      });
    }

    if (document.virusScanStatus === 'infected') {
      return res.status(403).json({
        error: 'Document infected',
        message: 'This document failed virus scanning and cannot be downloaded'
      });
    }

    // Get download URL
    const downloadInfo = await documentService.getDownloadUrl(id, req.firmId);

    res.json({
      url: downloadInfo.url,
      expiresAt: downloadInfo.expiresAt,
      filename: document.filename
    });
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({
      error: 'Download failed',
      message: error instanceof Error ? error.message : 'Failed to generate download URL'
    });
  }
});

/**
 * DELETE /documents/:id
 * Delete a document
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.firmId) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'Firm context required'
      });
    }

    const { id } = req.params;

    // Validate UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        error: 'Invalid document ID',
        message: 'Document ID must be a valid UUID'
      });
    }

    await documentService.deleteDocument(id, req.firmId);

    res.json({
      message: 'Document deleted successfully',
      documentId: id
    });
  } catch (error) {
    console.error('Error deleting document:', error);

    if (error instanceof Error && error.message === 'Document not found') {
      return res.status(404).json({
        error: 'Document not found',
        message: 'The requested document does not exist or you do not have access to it'
      });
    }

    res.status(500).json({
      error: 'Delete failed',
      message: error instanceof Error ? error.message : 'Failed to delete document'
    });
  }
});

export default router;
