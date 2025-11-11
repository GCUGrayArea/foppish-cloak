/**
 * Template Service
 *
 * Business logic for template management operations.
 * Handles template CRUD, versioning, and variable extraction.
 */

import { Pool } from 'pg';
import { getPool } from '../db/connection';
import {
  Template,
  TemplateVersion,
  TemplateWithVersion,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateQueryParams,
  TemplateListItem,
  TemplateDetailResponse,
  VersionHistoryItem
} from '../types/template';
import { extractVariables } from '../utils/variableExtraction';
import { sanitizeTemplateContent } from '../utils/templateValidation';

export class TemplateService {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || getPool();
  }

  /**
   * List templates for a firm with optional filtering
   *
   * @param firmId - Firm UUID
   * @param params - Query parameters (isDefault, search, pagination)
   * @returns Paginated list of templates
   */
  async listTemplates(
    firmId: string,
    params: TemplateQueryParams = {}
  ): Promise<{ templates: TemplateListItem[]; total: number }> {
    const { isDefault, search, page = 1, limit = 50 } = params;
    const offset = (page - 1) * limit;

    // Build WHERE clause conditions
    const conditions: string[] = ['t.firm_id = $1'];
    const values: any[] = [firmId];
    let paramCount = 2;

    if (isDefault !== undefined) {
      conditions.push(`t.is_default = $${paramCount}`);
      values.push(isDefault);
      paramCount++;
    }

    if (search) {
      conditions.push(
        `(t.name ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`
      );
      values.push(`%${search}%`);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM templates t WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated templates with current version and creator info
    const query = `
      SELECT
        t.id, t.name, t.description, t.is_default,
        t.created_at, t.updated_at,
        u.id as creator_id, (u.first_name || ' ' || u.last_name) as creator_name,
        cv.id as version_id, cv.version_number,
        cv.variables, cv.created_at as version_created_at
      FROM templates t
      JOIN users u ON t.created_by = u.id
      LEFT JOIN template_versions cv ON t.current_version_id = cv.id
      WHERE ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    values.push(limit, offset);
    const result = await this.pool.query(query, values);

    const templates: TemplateListItem[] = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      isDefault: row.is_default,
      currentVersion: row.version_id ? {
        id: row.version_id,
        versionNumber: row.version_number,
        variableCount: (row.variables || []).length,
        createdAt: row.version_created_at.toISOString()
      } : null,
      createdBy: {
        id: row.creator_id,
        name: row.creator_name
      },
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    }));

    return { templates, total };
  }

  /**
   * Get template by ID with current version and history
   *
   * @param templateId - Template UUID
   * @param firmId - Firm UUID (for ownership verification)
   * @returns Detailed template information
   * @throws Error if template not found or belongs to different firm
   */
  async getTemplateById(
    templateId: string,
    firmId: string
  ): Promise<TemplateDetailResponse> {
    // Get template with current version
    const templateQuery = `
      SELECT
        t.id, t.firm_id, t.name, t.description, t.is_default,
        t.created_at, t.updated_at,
        creator.id as creator_id, (creator.first_name || ' ' || creator.last_name) as creator_name,
        cv.id as version_id, cv.version_number, cv.content,
        cv.variables, cv.created_at as version_created_at,
        version_creator.id as version_creator_id,
        (version_creator.first_name || ' ' || version_creator.last_name) as version_creator_name
      FROM templates t
      JOIN users creator ON t.created_by = creator.id
      LEFT JOIN template_versions cv ON t.current_version_id = cv.id
      LEFT JOIN users version_creator ON cv.created_by = version_creator.id
      WHERE t.id = $1 AND t.firm_id = $2
    `;

    const templateResult = await this.pool.query(templateQuery, [
      templateId,
      firmId
    ]);

    if (templateResult.rows.length === 0) {
      throw new Error('TEMPLATE_NOT_FOUND');
    }

    const row = templateResult.rows[0];

    // Get version history
    const historyQuery = `
      SELECT
        tv.id, tv.version_number, tv.created_at,
        (u.first_name || ' ' || u.last_name) as creator_name
      FROM template_versions tv
      JOIN users u ON tv.created_by = u.id
      WHERE tv.template_id = $1
      ORDER BY tv.version_number DESC
    `;

    const historyResult = await this.pool.query(historyQuery, [templateId]);
    const versionHistory: VersionHistoryItem[] = historyResult.rows.map(v => ({
      id: v.id,
      versionNumber: v.version_number,
      createdBy: v.creator_name,
      createdAt: v.created_at.toISOString()
    }));

    return {
      id: row.id,
      firmId: row.firm_id,
      name: row.name,
      description: row.description,
      isDefault: row.is_default,
      currentVersion: row.version_id ? {
        id: row.version_id,
        versionNumber: row.version_number,
        content: row.content,
        variables: row.variables || [],
        createdBy: {
          id: row.version_creator_id,
          name: row.version_creator_name
        },
        createdAt: row.version_created_at.toISOString()
      } : null,
      versionHistory,
      createdBy: {
        id: row.creator_id,
        name: row.creator_name
      },
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    };
  }

  /**
   * Create a new template with initial version
   *
   * @param firmId - Firm UUID
   * @param userId - Creating user UUID
   * @param data - Template data
   * @returns Created template with version 1
   */
  async createTemplate(
    firmId: string,
    userId: string,
    data: CreateTemplateRequest
  ): Promise<TemplateDetailResponse> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Sanitize content
      const sanitizedContent = sanitizeTemplateContent(data.content);
      const variables = extractVariables(sanitizedContent);

      // Check for duplicate name within firm
      const duplicateCheck = await client.query(
        'SELECT id FROM templates WHERE firm_id = $1 AND name = $2',
        [firmId, data.name]
      );

      if (duplicateCheck.rows.length > 0) {
        throw new Error('TEMPLATE_NAME_EXISTS');
      }

      // Create template record
      const templateResult = await client.query(
        `INSERT INTO templates (firm_id, name, description, is_default, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, firm_id, name, description, is_default,
                   created_by, created_at, updated_at`,
        [
          firmId,
          data.name,
          data.description || null,
          data.isDefault || false,
          userId
        ]
      );

      const template = templateResult.rows[0];

      // Create version 1
      const versionResult = await client.query(
        `INSERT INTO template_versions
         (template_id, version_number, content, variables, created_by)
         VALUES ($1, 1, $2, $3, $4)
         RETURNING id, version_number, content, variables, created_by, created_at`,
        [template.id, sanitizedContent, JSON.stringify(variables), userId]
      );

      const version = versionResult.rows[0];

      // Update template to reference the version
      await client.query(
        'UPDATE templates SET current_version_id = $1 WHERE id = $2',
        [version.id, template.id]
      );

      await client.query('COMMIT');

      // Return full template details
      return this.getTemplateById(template.id, firmId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update template metadata and/or content
   *
   * - Name/description changes: Update template only (no new version)
   * - Content changes: Create new version and update current_version_id
   *
   * @param templateId - Template UUID
   * @param firmId - Firm UUID
   * @param userId - Updating user UUID
   * @param data - Update data
   * @returns Updated template details
   */
  async updateTemplate(
    templateId: string,
    firmId: string,
    userId: string,
    data: UpdateTemplateRequest
  ): Promise<TemplateDetailResponse> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Verify template exists and belongs to firm
      const existingTemplate = await client.query(
        'SELECT id, name FROM templates WHERE id = $1 AND firm_id = $2',
        [templateId, firmId]
      );

      if (existingTemplate.rows.length === 0) {
        throw new Error('TEMPLATE_NOT_FOUND');
      }

      // Check for name conflict if name is being changed
      if (data.name && data.name !== existingTemplate.rows[0].name) {
        const duplicateCheck = await client.query(
          'SELECT id FROM templates WHERE firm_id = $1 AND name = $2 AND id != $3',
          [firmId, data.name, templateId]
        );

        if (duplicateCheck.rows.length > 0) {
          throw new Error('TEMPLATE_NAME_EXISTS');
        }
      }

      // Handle content update (creates new version)
      if (data.content) {
        const sanitizedContent = sanitizeTemplateContent(data.content);
        const variables = extractVariables(sanitizedContent);

        // Get current max version number
        const maxVersionResult = await client.query(
          'SELECT COALESCE(MAX(version_number), 0) as max_version FROM template_versions WHERE template_id = $1',
          [templateId]
        );

        const nextVersion = maxVersionResult.rows[0].max_version + 1;

        // Create new version
        const versionResult = await client.query(
          `INSERT INTO template_versions
           (template_id, version_number, content, variables, created_by)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [templateId, nextVersion, sanitizedContent, JSON.stringify(variables), userId]
        );

        const newVersionId = versionResult.rows[0].id;

        // Update template's current version
        await client.query(
          'UPDATE templates SET current_version_id = $1, updated_at = NOW() WHERE id = $2',
          [newVersionId, templateId]
        );
      }

      // Handle metadata updates (name, description)
      const metadataUpdates: string[] = [];
      const metadataValues: any[] = [];
      let paramCount = 1;

      if (data.name) {
        metadataUpdates.push(`name = $${paramCount}`);
        metadataValues.push(data.name);
        paramCount++;
      }

      if (data.description !== undefined) {
        metadataUpdates.push(`description = $${paramCount}`);
        metadataValues.push(data.description || null);
        paramCount++;
      }

      if (metadataUpdates.length > 0) {
        metadataUpdates.push('updated_at = NOW()');
        metadataValues.push(templateId);

        const updateQuery = `
          UPDATE templates
          SET ${metadataUpdates.join(', ')}
          WHERE id = $${paramCount}
        `;

        await client.query(updateQuery, metadataValues);
      }

      await client.query('COMMIT');

      return this.getTemplateById(templateId, firmId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rollback template to a previous version
   *
   * @param templateId - Template UUID
   * @param firmId - Firm UUID
   * @param versionId - Version UUID to rollback to
   * @returns Updated template details
   */
  async rollbackToVersion(
    templateId: string,
    firmId: string,
    versionId: string
  ): Promise<TemplateDetailResponse> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Verify template exists and belongs to firm
      const templateCheck = await client.query(
        'SELECT id FROM templates WHERE id = $1 AND firm_id = $2',
        [templateId, firmId]
      );

      if (templateCheck.rows.length === 0) {
        throw new Error('TEMPLATE_NOT_FOUND');
      }

      // Verify version exists and belongs to this template
      const versionCheck = await client.query(
        'SELECT id FROM template_versions WHERE id = $1 AND template_id = $2',
        [versionId, templateId]
      );

      if (versionCheck.rows.length === 0) {
        throw new Error('VERSION_NOT_FOUND');
      }

      // Update template's current version
      await client.query(
        'UPDATE templates SET current_version_id = $1, updated_at = NOW() WHERE id = $2',
        [versionId, templateId]
      );

      await client.query('COMMIT');

      return this.getTemplateById(templateId, firmId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Soft delete a template
   *
   * Uses deleted_at timestamp for soft deletion.
   * Template and versions remain in database for audit trail.
   *
   * @param templateId - Template UUID
   * @param firmId - Firm UUID
   */
  async deleteTemplate(templateId: string, firmId: string): Promise<void> {
    // Note: Schema doesn't have deleted_at field, so we'll use hard delete
    // In production, should add deleted_at column for soft deletes

    const result = await this.pool.query(
      'DELETE FROM templates WHERE id = $1 AND firm_id = $2',
      [templateId, firmId]
    );

    if (result.rowCount === 0) {
      throw new Error('TEMPLATE_NOT_FOUND');
    }
  }

  /**
   * Get specific template version by ID
   *
   * @param versionId - Version UUID
   * @param firmId - Firm UUID (for ownership check)
   * @returns Template version details
   */
  async getVersionById(
    versionId: string,
    firmId: string
  ): Promise<TemplateVersion> {
    const query = `
      SELECT
        tv.id, tv.template_id, tv.version_number, tv.content,
        tv.variables, tv.created_by, tv.created_at
      FROM template_versions tv
      JOIN templates t ON tv.template_id = t.id
      WHERE tv.id = $1 AND t.firm_id = $2
    `;

    const result = await this.pool.query(query, [versionId, firmId]);

    if (result.rows.length === 0) {
      throw new Error('VERSION_NOT_FOUND');
    }

    const row = result.rows[0];

    return {
      id: row.id,
      templateId: row.template_id,
      versionNumber: row.version_number,
      content: row.content,
      variables: row.variables || [],
      createdBy: row.created_by,
      createdAt: row.created_at
    };
  }
}
