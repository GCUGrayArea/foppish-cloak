/**
 * File Validation Utilities
 *
 * Validates uploaded files for type, size, and basic security checks
 */

import path from 'path';

/**
 * Allowed file types and their MIME types
 */
export const ALLOWED_FILE_TYPES = {
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],

  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],

  // Spreadsheets (for supporting documents)
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
} as const;

/**
 * Maximum file size in bytes (50 MB)
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * Minimum file size in bytes (to prevent empty files)
 */
export const MIN_FILE_SIZE = 1; // 1 byte

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate file type based on MIME type and extension
 */
export function validateFileType(
  mimeType: string,
  filename: string
): FileValidationResult {
  // Check if MIME type is allowed
  const allowedExtensions = ALLOWED_FILE_TYPES[mimeType as keyof typeof ALLOWED_FILE_TYPES];

  if (!allowedExtensions) {
    return {
      valid: false,
      error: `File type '${mimeType}' is not allowed. Allowed types: PDF, Word documents, images, and spreadsheets.`
    };
  }

  // Check if file extension matches MIME type
  const fileExtension = path.extname(filename).toLowerCase();

  if (!allowedExtensions.includes(fileExtension)) {
    return {
      valid: false,
      error: `File extension '${fileExtension}' does not match MIME type '${mimeType}'.`
    };
  }

  return { valid: true };
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): FileValidationResult {
  if (size < MIN_FILE_SIZE) {
    return {
      valid: false,
      error: 'File is empty or too small.'
    };
  }

  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)} MB.`
    };
  }

  return { valid: true };
}

/**
 * Validate filename for security issues
 */
export function validateFilename(filename: string): FileValidationResult {
  // Check for null bytes
  if (filename.includes('\0')) {
    return {
      valid: false,
      error: 'Filename contains invalid characters.'
    };
  }

  // Check for path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return {
      valid: false,
      error: 'Filename contains invalid path characters.'
    };
  }

  // Check filename length
  if (filename.length > 255) {
    return {
      valid: false,
      error: 'Filename is too long (maximum 255 characters).'
    };
  }

  // Check for minimum filename length (name + extension)
  if (filename.length < 5) {
    return {
      valid: false,
      error: 'Filename is too short.'
    };
  }

  return { valid: true };
}

/**
 * Perform all file validations
 */
export function validateFile(
  file: Express.Multer.File
): FileValidationResult {
  // Validate filename
  const filenameResult = validateFilename(file.originalname);
  if (!filenameResult.valid) {
    return filenameResult;
  }

  // Validate file type
  const typeResult = validateFileType(file.mimetype, file.originalname);
  if (!typeResult.valid) {
    return typeResult;
  }

  // Validate file size
  const sizeResult = validateFileSize(file.size);
  if (!sizeResult.valid) {
    return sizeResult;
  }

  return { valid: true };
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(filename: string): string {
  // Remove any non-alphanumeric characters except dots, dashes, and underscores
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Ensure it doesn't start with a dot
  return sanitized.startsWith('.') ? `file${sanitized}` : sanitized;
}

/**
 * Generate a unique filename for storage
 */
export function generateUniqueFilename(originalFilename: string, documentId: string): string {
  const sanitized = sanitizeFilename(originalFilename);
  const extension = path.extname(sanitized);
  const nameWithoutExt = path.basename(sanitized, extension);

  // Include document ID for uniqueness
  return `${documentId}_${nameWithoutExt}${extension}`;
}
