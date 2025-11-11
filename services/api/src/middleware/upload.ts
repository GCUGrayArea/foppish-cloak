/**
 * File Upload Middleware
 *
 * Multer configuration for handling file uploads
 */

import multer from 'multer';
import { Request } from 'express';
import { validateFile } from '../utils/fileValidation';

/**
 * Multer storage configuration
 * Store files in memory for processing before saving to S3/local
 */
const storage = multer.memoryStorage();

/**
 * File filter for validation
 */
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  const validation = validateFile(file);

  if (!validation.valid) {
    callback(new Error(validation.error || 'Invalid file'));
  } else {
    callback(null, true);
  }
};

/**
 * Multer upload middleware configuration
 */
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
    files: 1 // Single file upload for now
  }
});

/**
 * Middleware for single file upload
 */
export const uploadSingle = upload.single('file');

/**
 * Middleware for multiple file upload
 */
export const uploadMultiple = upload.array('files', 10); // Max 10 files

/**
 * Error handler for multer errors
 */
export function handleUploadError(
  error: any,
  _req: Request,
  res: any,
  next: any
) {
  if (error instanceof multer.MulterError) {
    // Multer-specific errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'Maximum file size is 50 MB'
      });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Maximum 10 files allowed'
      });
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected field',
        message: 'Unexpected file field in upload'
      });
    }

    return res.status(400).json({
      error: 'Upload error',
      message: error.message
    });
  }

  // File validation errors
  if (error.message) {
    return res.status(400).json({
      error: 'Validation error',
      message: error.message
    });
  }

  next(error);
}
