/**
 * Document Service
 *
 * Business logic for document management
 */

import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/connection';
import { S3Service, UploadResult } from './S3Service';
import { generateUniqueFilename } from '../utils/fileValidation';
import type {
  Document,
  DocumentUploadRequest,
  DocumentMetadata,
  DocumentDownloadResponse,
  DocumentListQuery,
  DocumentListResponse,
  VirusScanStatus
} from '../types/document';

export class DocumentService {
  private s3Service: S3Service;

  constructor() {
    this.s3Service = new S3Service();
  }

  /**
   * Upload a new document
   */
  async uploadDocument(request: DocumentUploadRequest): Promise<Document> {
    const { file, firmId, uploadedBy } = request;

    // Generate document ID
    const documentId = uuidv4();

    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(file.originalname, documentId);

    // Upload to storage
    const uploadResult: UploadResult = await this.s3Service.uploadFile(
      file.buffer,
      uniqueFilename,
      file.mimetype,
      firmId
    );

    // Create metadata
    const metadata: DocumentMetadata = {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadDate: new Date()
    };

    // Insert document record into database
    const query = `
      INSERT INTO documents (
        id, firm_id, uploaded_by, filename, file_type, file_size,
        s3_bucket, s3_key, virus_scan_status, metadata,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      documentId,
      firmId,
      uploadedBy,
      file.originalname,
      file.mimetype,
      file.size,
      uploadResult.bucket || 'local',
      uploadResult.key || uploadResult.localPath || '',
      'pending' as VirusScanStatus, // Virus scan status
      JSON.stringify(metadata)
    ];

    const result = await pool.query(query, values);
    return this.mapRowToDocument(result.rows[0]);
  }

  /**
   * Get document by ID (with firm context for security)
   */
  async getDocumentById(documentId: string, firmId: string): Promise<Document | null> {
    const query = `
      SELECT * FROM documents
      WHERE id = $1 AND firm_id = $2
    `;

    const result = await pool.query(query, [documentId, firmId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToDocument(result.rows[0]);
  }

  /**
   * Get download URL for a document
   */
  async getDownloadUrl(documentId: string, firmId: string): Promise<DocumentDownloadResponse> {
    const document = await this.getDocumentById(documentId, firmId);

    if (!document) {
      throw new Error('Document not found');
    }

    const url = await this.s3Service.getDownloadUrl(
      document.s3Bucket,
      document.s3Key,
      document.localPath
    );

    return {
      url,
      expiresAt: new Date(Date.now() + 3600 * 1000) // 1 hour from now
    };
  }

  /**
   * List documents for a firm
   */
  async listDocuments(query: DocumentListQuery): Promise<DocumentListResponse> {
    const { firmId, uploadedBy, fileType, limit = 50, offset = 0 } = query;

    // Build WHERE clause
    const conditions = ['firm_id = $1'];
    const values: unknown[] = [firmId];
    let paramCount = 1;

    if (uploadedBy) {
      paramCount++;
      conditions.push(`uploaded_by = $${paramCount}`);
      values.push(uploadedBy);
    }

    if (fileType) {
      paramCount++;
      conditions.push(`file_type = $${paramCount}`);
      values.push(fileType);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM documents WHERE ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get documents
    const documentsQuery = `
      SELECT * FROM documents
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const documentsResult = await pool.query(documentsQuery, [
      ...values,
      limit,
      offset
    ]);

    const documents = documentsResult.rows.map(row => this.mapRowToDocument(row));

    return {
      documents,
      total,
      limit,
      offset
    };
  }

  /**
   * Delete a document (soft delete)
   */
  async deleteDocument(documentId: string, firmId: string): Promise<void> {
    const document = await this.getDocumentById(documentId, firmId);

    if (!document) {
      throw new Error('Document not found');
    }

    // Delete from storage
    await this.s3Service.deleteFile(
      document.s3Bucket,
      document.s3Key,
      document.localPath
    );

    // Soft delete from database (mark as deleted)
    const query = `
      UPDATE documents
      SET status = 'error', updated_at = NOW()
      WHERE id = $1 AND firm_id = $2
    `;

    await pool.query(query, [documentId, firmId]);
  }

  /**
   * Update virus scan status
   */
  async updateVirusScanStatus(
    documentId: string,
    firmId: string,
    status: VirusScanStatus
  ): Promise<Document> {
    const query = `
      UPDATE documents
      SET virus_scan_status = $1, virus_scan_date = NOW(), updated_at = NOW()
      WHERE id = $2 AND firm_id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [status, documentId, firmId]);

    if (result.rows.length === 0) {
      throw new Error('Document not found');
    }

    return this.mapRowToDocument(result.rows[0]);
  }

  /**
   * Get file content from local storage (development only)
   */
  async getLocalFileContent(documentId: string, firmId: string): Promise<Buffer> {
    const document = await this.getDocumentById(documentId, firmId);

    if (!document) {
      throw new Error('Document not found');
    }

    if (!document.localPath) {
      throw new Error('Document is not stored locally');
    }

    return this.s3Service.getLocalFile(document.localPath);
  }

  /**
   * Map database row to Document object
   */
  private mapRowToDocument(row: any): Document {
    return {
      id: row.id,
      firmId: row.firm_id,
      uploadedBy: row.uploaded_by,
      filename: row.filename,
      fileType: row.file_type,
      fileSize: parseInt(row.file_size, 10),
      s3Bucket: row.s3_bucket,
      s3Key: row.s3_key,
      localPath: row.local_path,
      virusScanStatus: row.virus_scan_status,
      virusScanDate: row.virus_scan_date,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
