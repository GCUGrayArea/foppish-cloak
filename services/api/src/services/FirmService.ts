/**
 * Firm Service
 *
 * Business logic for firm management operations.
 * Handles firm retrieval and settings updates.
 */

import { Pool } from 'pg';
import { getPool } from '../db/connection';
import { Firm, FirmSettings, UpdateFirmRequest, FirmResponse } from '../types/firm';

export class FirmService {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || getPool();
  }

  /**
   * Get firm by ID
   *
   * @param firmId - Firm UUID
   * @returns Firm data
   * @throws Error if firm not found
   */
  async getFirmById(firmId: string): Promise<Firm> {
    const result = await this.pool.query(
      'SELECT id, name, settings, created_at, updated_at FROM firms WHERE id = $1',
      [firmId]
    );

    if (result.rows.length === 0) {
      throw new Error('FIRM_NOT_FOUND');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      settings: row.settings || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Update firm details and settings
   *
   * @param firmId - Firm UUID
   * @param updates - Partial firm data to update
   * @returns Updated firm data
   * @throws Error if firm not found or update fails
   */
  async updateFirm(firmId: string, updates: UpdateFirmRequest): Promise<Firm> {
    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Add firm name if provided
    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      values.push(updates.name);
      paramCount++;
    }

    // Handle settings update (merge with existing)
    if (updates.settings !== undefined) {
      // Fetch current settings first
      const currentFirm = await this.getFirmById(firmId);
      const mergedSettings = {
        ...currentFirm.settings,
        ...updates.settings
      };

      updateFields.push(`settings = $${paramCount}`);
      values.push(JSON.stringify(mergedSettings));
      paramCount++;
    }

    // Always update updated_at timestamp
    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 1) {
      // Only updated_at changed, nothing to update
      return this.getFirmById(firmId);
    }

    // Add firmId to values
    values.push(firmId);

    const query = `
      UPDATE firms
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, settings, created_at, updated_at
    `;

    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('FIRM_NOT_FOUND');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      settings: row.settings || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Get firm settings only
   *
   * @param firmId - Firm UUID
   * @returns Firm settings object
   */
  async getFirmSettings(firmId: string): Promise<FirmSettings> {
    const firm = await this.getFirmById(firmId);
    return firm.settings;
  }

  /**
   * Update firm settings (partial update)
   *
   * @param firmId - Firm UUID
   * @param settingsUpdate - Partial settings to merge
   * @returns Updated firm settings
   */
  async updateFirmSettings(
    firmId: string,
    settingsUpdate: Partial<FirmSettings>
  ): Promise<FirmSettings> {
    const updatedFirm = await this.updateFirm(firmId, {
      settings: settingsUpdate
    });
    return updatedFirm.settings;
  }

  /**
   * Convert Firm model to API response format
   *
   * @param firm - Firm data from database
   * @returns Formatted firm response
   */
  toResponse(firm: Firm): FirmResponse {
    return {
      id: firm.id,
      name: firm.name,
      settings: firm.settings,
      createdAt: firm.createdAt.toISOString(),
      updatedAt: firm.updatedAt.toISOString()
    };
  }
}
