import { query } from '../connection';
import { TemplateVersion } from '../types';

export class TemplateVersionModel {
  /**
   * Create a new template version
   * @param data Template version data
   * @returns Created template version
   */
  static async create(data: {
    template_id: string;
    version_number: number;
    content: string;
    variables?: string[];
    created_by: string;
  }): Promise<TemplateVersion> {
    const sql = `
      INSERT INTO template_versions (template_id, version_number, content, variables, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await query<TemplateVersion>(sql, [
      data.template_id,
      data.version_number,
      data.content,
      JSON.stringify(data.variables || []),
      data.created_by,
    ]);

    return result.rows[0];
  }

  /**
   * Find template version by ID
   * @param id Version ID
   * @returns Template version or null
   */
  static async findById(id: string): Promise<TemplateVersion | null> {
    const sql = 'SELECT * FROM template_versions WHERE id = $1';
    const result = await query<TemplateVersion>(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get latest version number for template
   * @param templateId Template ID
   * @returns Latest version number
   */
  static async getLatestVersionNumber(templateId: string): Promise<number> {
    const sql = `
      SELECT COALESCE(MAX(version_number), 0) as latest
      FROM template_versions
      WHERE template_id = $1
    `;
    const result = await query<{ latest: number }>(sql, [templateId]);
    return result.rows[0].latest;
  }

  /**
   * List versions for template
   * @param templateId Template ID
   * @returns Template versions
   */
  static async listByTemplate(
    templateId: string
  ): Promise<TemplateVersion[]> {
    const sql = `
      SELECT * FROM template_versions
      WHERE template_id = $1
      ORDER BY version_number DESC
    `;
    const result = await query<TemplateVersion>(sql, [templateId]);
    return result.rows;
  }
}

export default TemplateVersionModel;
