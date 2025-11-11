import { query } from '../connection';
import { DemandLetter, DemandLetterDTO, LetterStatus } from '../types';

export class DemandLetterModel {
  /**
   * Create a new demand letter
   * @param data Demand letter data
   * @returns Created demand letter
   */
  static async create(data: {
    firm_id: string;
    created_by: string;
    template_id?: string;
    title: string;
    status?: LetterStatus;
  }): Promise<DemandLetter> {
    const sql = `
      INSERT INTO demand_letters (
        firm_id, created_by, template_id, title, status,
        extracted_data, generation_metadata
      )
      VALUES ($1, $2, $3, $4, $5, '{}', '{}')
      RETURNING *
    `;

    const result = await query<DemandLetter>(sql, [
      data.firm_id,
      data.created_by,
      data.template_id || null,
      data.title,
      data.status || 'draft',
    ]);

    return result.rows[0];
  }

  /**
   * Find demand letter by ID (firm-scoped)
   * @param id Letter ID
   * @param firmId Firm ID
   * @returns Demand letter or null
   */
  static async findById(
    id: string,
    firmId: string
  ): Promise<DemandLetter | null> {
    const sql = 'SELECT * FROM demand_letters WHERE id = $1 AND firm_id = $2';
    const result = await query<DemandLetter>(sql, [id, firmId]);
    return result.rows[0] || null;
  }

  /**
   * Update demand letter
   * @param id Letter ID
   * @param firmId Firm ID
   * @param data Updated data
   * @returns Updated demand letter
   */
  static async update(
    id: string,
    firmId: string,
    data: {
      title?: string;
      status?: LetterStatus;
      current_content?: string;
      extracted_data?: Record<string, any>;
      generation_metadata?: Record<string, any>;
    }
  ): Promise<DemandLetter | null> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(data.title);
    }

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }

    if (data.current_content !== undefined) {
      updates.push(`current_content = $${paramIndex++}`);
      params.push(data.current_content);
    }

    if (data.extracted_data !== undefined) {
      updates.push(`extracted_data = $${paramIndex++}`);
      params.push(JSON.stringify(data.extracted_data));
    }

    if (data.generation_metadata !== undefined) {
      updates.push(`generation_metadata = $${paramIndex++}`);
      params.push(JSON.stringify(data.generation_metadata));
    }

    if (updates.length === 0) {
      return this.findById(id, firmId);
    }

    params.push(id, firmId);
    const sql = `
      UPDATE demand_letters
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND firm_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await query<DemandLetter>(sql, params);
    return result.rows[0] || null;
  }

  /**
   * List demand letters by firm
   * @param firmId Firm ID
   * @param options Filter and pagination options
   * @returns Demand letters and total count
   */
  static async listByFirm(
    firmId: string,
    options: {
      created_by?: string;
      status?: LetterStatus;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ letters: DemandLetter[]; total: number }> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const conditions = ['firm_id = $1'];
    const params: any[] = [firmId];
    let paramIndex = 2;

    if (options.created_by) {
      conditions.push(`created_by = $${paramIndex++}`);
      params.push(options.created_by);
    }

    if (options.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(options.status);
    }

    const whereClause = conditions.join(' AND ');

    const countSql = `SELECT COUNT(*) as count FROM demand_letters WHERE ${whereClause}`;
    const dataSql = `
      SELECT * FROM demand_letters
      WHERE ${whereClause}
      ORDER BY updated_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const [countResult, dataResult] = await Promise.all([
      query<{ count: string }>(countSql, params),
      query<DemandLetter>(dataSql, [...params, limit, offset]),
    ]);

    return {
      letters: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
    };
  }

  /**
   * Delete demand letter
   * @param id Letter ID
   * @param firmId Firm ID
   * @returns True if deleted
   */
  static async delete(id: string, firmId: string): Promise<boolean> {
    const sql = 'DELETE FROM demand_letters WHERE id = $1 AND firm_id = $2';
    const result = await query(sql, [id, firmId]);
    return (result.rowCount || 0) > 0;
  }

  /**
   * Convert DemandLetter to DTO
   * @param letter Demand letter model
   * @returns Demand letter DTO
   */
  static toDTO(letter: DemandLetter): DemandLetterDTO {
    return {
      id: letter.id,
      firm_id: letter.firm_id,
      created_by: letter.created_by,
      template_id: letter.template_id,
      title: letter.title,
      status: letter.status,
      current_content: letter.current_content,
      extracted_data: letter.extracted_data,
      generation_metadata: letter.generation_metadata,
      created_at: letter.created_at,
      updated_at: letter.updated_at,
    };
  }
}

export default DemandLetterModel;
