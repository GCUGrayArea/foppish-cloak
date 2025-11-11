import { query } from '../connection';
import { Document, DocumentDTO, VirusScanStatus } from '../types';

export class DocumentModel {
  /**
   * Create a new document
   * @param data Document data
   * @returns Created document
   */
  static async create(data: {
    firm_id: string;
    uploaded_by: string;
    filename: string;
    file_type: string;
    file_size: number;
    s3_bucket: string;
    s3_key: string;
    metadata?: Record<string, any>;
  }): Promise<Document> {
    const sql = `
      INSERT INTO documents (
        firm_id, uploaded_by, filename, file_type, file_size,
        s3_bucket, s3_key, metadata, virus_scan_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING *
    `;

    const result = await query<Document>(sql, [
      data.firm_id,
      data.uploaded_by,
      data.filename,
      data.file_type,
      data.file_size,
      data.s3_bucket,
      data.s3_key,
      JSON.stringify(data.metadata || {}),
    ]);

    return result.rows[0];
  }

  /**
   * Find document by ID (firm-scoped)
   * @param id Document ID
   * @param firmId Firm ID
   * @returns Document or null
   */
  static async findById(id: string, firmId: string): Promise<Document | null> {
    const sql = 'SELECT * FROM documents WHERE id = $1 AND firm_id = $2';
    const result = await query<Document>(sql, [id, firmId]);
    return result.rows[0] || null;
  }

  /**
   * Update virus scan status
   * @param id Document ID
   * @param firmId Firm ID
   * @param status Virus scan status
   * @returns Updated document
   */
  static async updateVirusScan(
    id: string,
    firmId: string,
    status: VirusScanStatus
  ): Promise<Document | null> {
    const sql = `
      UPDATE documents
      SET virus_scan_status = $1, virus_scan_date = CURRENT_TIMESTAMP
      WHERE id = $2 AND firm_id = $3
      RETURNING *
    `;
    const result = await query<Document>(sql, [status, id, firmId]);
    return result.rows[0] || null;
  }

  /**
   * List documents by firm
   * @param firmId Firm ID
   * @param options Filter and pagination options
   * @returns Documents and total count
   */
  static async listByFirm(
    firmId: string,
    options: {
      uploaded_by?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ documents: Document[]; total: number }> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const conditions = ['firm_id = $1'];
    const params: any[] = [firmId];
    let paramIndex = 2;

    if (options.uploaded_by) {
      conditions.push(`uploaded_by = $${paramIndex++}`);
      params.push(options.uploaded_by);
    }

    const whereClause = conditions.join(' AND ');

    const countSql = `SELECT COUNT(*) as count FROM documents WHERE ${whereClause}`;
    const dataSql = `
      SELECT * FROM documents
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const [countResult, dataResult] = await Promise.all([
      query<{ count: string }>(countSql, params),
      query<Document>(dataSql, [...params, limit, offset]),
    ]);

    return {
      documents: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
    };
  }

  /**
   * Delete document
   * @param id Document ID
   * @param firmId Firm ID
   * @returns True if deleted
   */
  static async delete(id: string, firmId: string): Promise<boolean> {
    const sql = 'DELETE FROM documents WHERE id = $1 AND firm_id = $2';
    const result = await query(sql, [id, firmId]);
    return (result.rowCount || 0) > 0;
  }

  /**
   * Convert Document to DTO (excludes S3 keys)
   * @param document Document model
   * @returns Document DTO
   */
  static toDTO(document: Document): DocumentDTO {
    return {
      id: document.id,
      firm_id: document.firm_id,
      uploaded_by: document.uploaded_by,
      filename: document.filename,
      file_type: document.file_type,
      file_size: document.file_size,
      virus_scan_status: document.virus_scan_status,
      virus_scan_date: document.virus_scan_date,
      metadata: document.metadata,
      created_at: document.created_at,
      updated_at: document.updated_at,
    };
  }
}

export default DocumentModel;
