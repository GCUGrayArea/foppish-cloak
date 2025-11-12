import { query } from '../connection';
import { Firm, FirmDTO } from '../types';

export class FirmModel {
  /**
   * Create a new firm
   * @param data Firm data
   * @returns Created firm
   */
  static async create(data: {
    name: string;
    settings?: Record<string, any>;
  }): Promise<Firm> {
    const sql = `
      INSERT INTO firms (name, settings)
      VALUES ($1, $2)
      RETURNING *
    `;

    const result = await query<Firm>(sql, [
      data.name,
      JSON.stringify(data.settings || {}),
    ]);

    return result.rows[0];
  }

  /**
   * Find firm by ID
   * @param id Firm ID
   * @returns Firm or null
   */
  static async findById(id: string): Promise<Firm | null> {
    const sql = 'SELECT * FROM firms WHERE id = $1';
    const result = await query<Firm>(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find firm by name
   * @param name Firm name
   * @returns Firm or null
   */
  static async findByName(name: string): Promise<Firm | null> {
    const sql = 'SELECT * FROM firms WHERE name = $1';
    const result = await query<Firm>(sql, [name]);
    return result.rows[0] || null;
  }

  /**
   * Update firm
   * @param id Firm ID
   * @param data Updated data
   * @returns Updated firm
   */
  static async update(
    id: string,
    data: {
      name?: string;
      settings?: Record<string, any>;
    }
  ): Promise<Firm | null> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }

    if (data.settings !== undefined) {
      updates.push(`settings = $${paramIndex++}`);
      params.push(JSON.stringify(data.settings));
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    params.push(id);
    const sql = `
      UPDATE firms
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query<Firm>(sql, params);
    return result.rows[0] || null;
  }

  /**
   * Delete firm (cascades to all related data)
   * @param id Firm ID
   * @returns True if deleted
   */
  static async delete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM firms WHERE id = $1';
    const result = await query(sql, [id]);
    return (result.rowCount || 0) > 0;
  }

  /**
   * List all firms (admin function)
   * @param options Pagination options
   * @returns Firms and total count
   */
  static async list(options: {
    limit?: number;
    offset?: number;
  } = {}): Promise<{ firms: Firm[]; total: number }> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const countSql = 'SELECT COUNT(*) as count FROM firms';
    const dataSql = `
      SELECT * FROM firms
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const [countResult, dataResult] = await Promise.all([
      query<{ count: string }>(countSql),
      query<Firm>(dataSql, [limit, offset]),
    ]);

    return {
      firms: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
    };
  }

  /**
   * Get firm statistics
   * @param firmId Firm ID
   * @returns Firm stats
   */
  static async getStats(firmId: string): Promise<{
    userCount: number;
    templateCount: number;
    documentCount: number;
    letterCount: number;
  }> {
    const sql = `
      SELECT
        (SELECT COUNT(*) FROM users WHERE firm_id = $1) as user_count,
        (SELECT COUNT(*) FROM templates WHERE firm_id = $1) as template_count,
        (SELECT COUNT(*) FROM documents WHERE firm_id = $1) as document_count,
        (SELECT COUNT(*) FROM demand_letters WHERE firm_id = $1) as letter_count
    `;

    const result = await query<{
      user_count: string;
      template_count: string;
      document_count: string;
      letter_count: string;
    }>(sql, [firmId]);

    const row = result.rows[0];
    return {
      userCount: parseInt(row.user_count),
      templateCount: parseInt(row.template_count),
      documentCount: parseInt(row.document_count),
      letterCount: parseInt(row.letter_count),
    };
  }

  /**
   * Convert Firm to DTO (no sensitive data to exclude for firms)
   * @param firm Firm model
   * @returns Firm DTO
   */
  static toDTO(firm: Firm): FirmDTO {
    return {
      id: firm.id,
      name: firm.name,
      settings: firm.settings,
      created_at: firm.created_at,
      updated_at: firm.updated_at,
    };
  }
}

export default FirmModel;
