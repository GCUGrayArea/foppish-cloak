/**
 * Client-side file validation utilities
 *
 * Matches backend validation rules from services/api/src/utils/fileValidation.ts
 */

/**
 * Allowed file types and their MIME types
 */
export const ALLOWED_FILE_TYPES = {
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
  'text/plain': ['.txt'],

  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],

  // Spreadsheets
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    '.xlsx',
  ],
} as const;

/**
 * Maximum file size in bytes (50 MB)
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * Minimum file size in bytes
 */
export const MIN_FILE_SIZE = 1;

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex >= 0 ? filename.slice(lastDotIndex).toLowerCase() : '';
}

/**
 * Validate file type based on MIME type
 */
export function validateFileType(file: File): FileValidationResult {
  const mimeType = file.type;
  const filename = file.name;

  // Check if MIME type is allowed
  const allowedExtensions =
    ALLOWED_FILE_TYPES[mimeType as keyof typeof ALLOWED_FILE_TYPES];

  if (!allowedExtensions) {
    return {
      valid: false,
      error: `File type '${mimeType || 'unknown'}' is not allowed. Allowed types: PDF, Word documents, images, and spreadsheets.`,
    };
  }

  // Check if file extension matches MIME type
  const fileExtension = getFileExtension(filename);

  if (!(allowedExtensions as readonly string[]).includes(fileExtension)) {
    return {
      valid: false,
      error: `File extension '${fileExtension}' does not match file type.`,
    };
  }

  return { valid: true };
}

/**
 * Validate file size
 */
export function validateFileSize(file: File): FileValidationResult {
  if (file.size < MIN_FILE_SIZE) {
    return {
      valid: false,
      error: 'File is empty or too small.',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${formatFileSize(MAX_FILE_SIZE)}.`,
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
      error: 'Filename contains invalid characters.',
    };
  }

  // Check for path traversal attempts
  if (
    filename.includes('..') ||
    filename.includes('/') ||
    filename.includes('\\')
  ) {
    return {
      valid: false,
      error: 'Filename contains invalid path characters.',
    };
  }

  // Check filename length
  if (filename.length > 255) {
    return {
      valid: false,
      error: 'Filename is too long (maximum 255 characters).',
    };
  }

  // Check for minimum filename length
  if (filename.length < 5) {
    return {
      valid: false,
      error: 'Filename is too short.',
    };
  }

  return { valid: true };
}

/**
 * Perform all file validations
 */
export function validateFile(file: File): FileValidationResult {
  // Validate filename
  const filenameResult = validateFilename(file.name);
  if (!filenameResult.valid) {
    return filenameResult;
  }

  // Validate file type
  const typeResult = validateFileType(file);
  if (!typeResult.valid) {
    return typeResult;
  }

  // Validate file size
  const sizeResult = validateFileSize(file);
  if (!sizeResult.valid) {
    return sizeResult;
  }

  return { valid: true };
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get list of allowed file extensions for display
 */
export function getAllowedExtensions(): string[] {
  const extensions = new Set<string>();

  Object.values(ALLOWED_FILE_TYPES).forEach((exts) => {
    exts.forEach((ext) => extensions.add(ext));
  });

  return Array.from(extensions).sort();
}
