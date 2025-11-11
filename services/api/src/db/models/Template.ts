import { query } from '../connection';
import { Template, TemplateDTO, TemplateVersion } from '../types';

export class TemplateModel {
  /**
   * Create a new template
   * @param data Template data
   * @returns Created template
   */
  static async create(data: {
    firm_id: string;
    name: string;
    description?: string;
    is_default?: boolean;
    created_by: string;
  }): Promise<Template> {
    const sql = `
      INSERT INTO templates (firm_id, name, description, is_default, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await query<Template>(sql, [
      data.firm_id,
      data.name,
      data.description || null,
      data.is_default || false,
      data.created_by,
    ]);

    return result.rows[0];
  }

  /**
   * Find template by ID (firm-scoped)
   * @param id Template ID
   * @param firmId Firm ID for multi-tenant isolation
   * @returns Template or null
   */
  static async findById(id: string, firmId: string): Promise<Template | null> {
    const sql = 'SELECT * FROM templates WHERE id = $1 AND firm_id = $2';
    const result = await query<Template>(sql, [id, firmId]);
    return result.rows[0] || null;
  }

  /**
   * Find template with current version
   * @param id Template ID
   * @param firmId Firm ID
   * @returns Template with version or null
   */
  static async findByIdWithVersion(
    id: string,
    firmId: string
  ): Promise<(Template & { current_version?: TemplateVersion }) | null> {
    const sql = `
      SELECT
        t.*,
        tv.id as version_id,
        tv.version_number,
        tv.content,
        tv.variables,
        tv.created_by as version_created_by,
        tv.created_at as version_created_at
      FROM templates t
      LEFT JOIN template_versions tv ON t.current_version_id = tv.id
      WHERE t.id = $1 AND t.firm_id = $2
    `;

    const result = await query(sql, [id, firmId]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const template: any = {
      id: row.id,
      firm_id: row.firm_id,
      name: row.name,
      description: row.description,
      current_version_id: row.current_version_id,
      is_default: row.is_default,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    if (row.version_id) {
      template.current_version = {
        id: row.version_id,
        template_id: row.id,
        version_number: row.version_number,
        content: row.content,
        variables: row.variables,
        created_by: row.version_created_by,
        created_at: row.version_created_at,
      };
    }

    return template;
  }

  /**
   * List templates by firm
   * @param firmId Firm ID
   * @param options Pagination options
   * @returns Templates and total count
   */
  static async listByFirm(
    firmId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ templates: Template[]; total: number }> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const countSql = 'SELECT COUNT(*) as count FROM templates WHERE firm_id = $1';
    const dataSql = `
      SELECT * FROM templates
      WHERE firm_id = $1
      ORDER BY is_default DESC, name
      LIMIT $2 OFFSET $3
    `;

    const [countResult, dataResult] = await Promise.all([
      query<{ count: string }>(countSql, [firmId]),
      query<Template>(dataSql, [firmId, limit, offset]),
    ]);

    return {
      templates: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
    };
  }

  /**
   * Update template
   * @param id Template ID
   * @param firmId Firm ID
   * @param data Updated data
   * @returns Updated template
   */
  static async update(
    id: string,
    firmId: string,
    data: {
      name?: string;
      description?: string;
      is_default?: boolean;
      current_version_id?: string;
    }
  ): Promise<Template | null> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }

    if (data.is_default !== undefined) {
      updates.push(`is_default = $${paramIndex++}`);
      params.push(data.is_default);
    }

    if (data.current_version_id !== undefined) {
      updates.push(`current_version_id = $${paramIndex++}`);
      params.push(data.current_version_id);
    }

    if (updates.length === 0) {
      return this.findById(id, firmId);
    }

    params.push(id, firmId);
    const sql = `
      UPDATE templates
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND firm_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await query<Template>(sql, params);
    return result.rows[0] || null;
  }

  /**
   * Delete template
   * @param id Template ID
   * @param firmId Firm ID
   * @returns True if deleted
   */
  static async delete(id: string, firmId: string): Promise<boolean> {
    const sql = 'DELETE FROM templates WHERE id = $1 AND firm_id = $2';
    const result = await query(sql, [id, firmId]);
    return (result.rowCount || 0) > 0;
  }

  /**
   * Convert Template to DTO
   * @param template Template model
   * @returns Template DTO
   */
  static toDTO(template: Template): TemplateDTO {
    return {
      id: template.id,
      firm_id: template.firm_id,
      name: template.name,
      description: template.description,
      current_version_id: template.current_version_id,
      is_default: template.is_default,
      created_by: template.created_by,
      created_at: template.created_at,
      updated_at: template.updated_at,
    };
  }
}

export default TemplateModel;
