/**
 * Document-related types for frontend
 *
 * These types match the backend API responses from services/api/src/types/document.ts
 */

/**
 * Virus scan status for uploaded documents
 */
export type VirusScanStatus = 'pending' | 'clean' | 'infected' | 'failed';

/**
 * Document type identifier
 */
export type DocumentType =
  | 'pdf'
  | 'docx'
  | 'doc'
  | 'txt'
  | 'image'
  | 'spreadsheet'
  | 'other';

/**
 * Document list item from GET /documents
 */
export interface DocumentListItem {
  id: string;
  firmId: string;
  name: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  virusScanStatus: VirusScanStatus;
  uploadedBy: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Detailed document from GET /documents/:id
 */
export interface DocumentDetail extends DocumentListItem {
  downloadUrl?: string; // Pre-signed S3 URL
}

/**
 * Document list response with pagination
 */
export interface DocumentListResponse {
  documents: DocumentListItem[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Document query parameters for filtering/pagination
 */
export interface DocumentQueryParams {
  fileType?: string;
  search?: string;
  page?: number;
  limit?: number;
  virusScanStatus?: VirusScanStatus;
}

/**
 * Upload progress tracking
 */
export interface UploadProgress {
  fileId: string; // Temporary ID for tracking
  file: File;
  progress: number; // 0-100
  status: 'queued' | 'uploading' | 'complete' | 'error';
  error?: string;
  documentId?: string; // Backend document ID after successful upload
  abortController?: AbortController;
}

/**
 * File validation error
 */
export interface FileValidationError {
  file: File;
  error: string;
}
