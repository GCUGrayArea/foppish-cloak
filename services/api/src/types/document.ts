/**
 * Document Types
 *
 * Type definitions for document upload and storage
 */

export type VirusScanStatus = 'pending' | 'clean' | 'infected';

export type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'error';

export interface Document {
  id: string;
  firmId: string;
  uploadedBy: string;
  filename: string;
  fileType: string;
  fileSize: number;
  s3Bucket: string | null;
  s3Key: string | null;
  localPath: string | null; // For local development
  virusScanStatus: VirusScanStatus;
  virusScanDate: Date | null;
  metadata: Record<string, unknown>;
  status: DocumentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentUploadRequest {
  file: Express.Multer.File;
  firmId: string;
  uploadedBy: string;
}

export interface DocumentMetadata {
  originalName: string;
  mimeType: string;
  size: number;
  uploadDate: Date;
  [key: string]: unknown;
}

export interface DocumentDownloadResponse {
  url: string;
  expiresAt: Date;
}

export interface DocumentListQuery {
  firmId: string;
  uploadedBy?: string;
  fileType?: string;
  limit?: number;
  offset?: number;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
  limit: number;
  offset: number;
}
