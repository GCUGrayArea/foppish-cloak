import { query } from '../connection';
import { User, UserDTO, UserRole } from '../types';

export class UserModel {
  /**
   * Create a new user
   * @param data User data
   * @returns Created user
   */
  static async create(data: {
    firm_id: string;
    email: string;
    password_hash: string;
    role: UserRole;
    first_name: string;
    last_name: string;
    is_active?: boolean;
  }): Promise<User> {
    const sql = `
      INSERT INTO users (firm_id, email, password_hash, role, first_name, last_name, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await query<User>(sql, [
      data.firm_id,
      data.email.toLowerCase(), // Normalize email
      data.password_hash,
      data.role,
      data.first_name,
      data.last_name,
      data.is_active !== undefined ? data.is_active : true,
    ]);

    return result.rows[0];
  }

  /**
   * Find user by ID (firm-scoped)
   * @param id User ID
   * @param firmId Firm ID for multi-tenant isolation
   * @returns User or null
   */
  static async findById(id: string, firmId: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE id = $1 AND firm_id = $2';
    const result = await query<User>(sql, [id, firmId]);
    return result.rows[0] || null;
  }

  /**
   * Find user by email (firm-scoped)
   * @param email User email
   * @param firmId Firm ID for multi-tenant isolation
   * @returns User or null
   */
  static async findByEmail(
    email: string,
    firmId: string
  ): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE email = $1 AND firm_id = $2';
    const result = await query<User>(sql, [email.toLowerCase(), firmId]);
    return result.rows[0] || null;
  }

  /**
   * Update user
   * @param id User ID
   * @param firmId Firm ID for multi-tenant isolation
   * @param data Updated data
   * @returns Updated user
   */
  static async update(
    id: string,
    firmId: string,
    data: {
      email?: string;
      password_hash?: string;
      role?: UserRole;
      first_name?: string;
      last_name?: string;
      is_active?: boolean;
    }
  ): Promise<User | null> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(data.email.toLowerCase());
    }

    if (data.password_hash !== undefined) {
      updates.push(`password_hash = $${paramIndex++}`);
      params.push(data.password_hash);
    }

    if (data.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      params.push(data.role);
    }

    if (data.first_name !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      params.push(data.first_name);
    }

    if (data.last_name !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      params.push(data.last_name);
    }

    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(data.is_active);
    }

    if (updates.length === 0) {
      return this.findById(id, firmId);
    }

    params.push(id, firmId);
    const sql = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND firm_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await query<User>(sql, params);
    return result.rows[0] || null;
  }

  /**
   * Soft delete user (set is_active = false)
   * @param id User ID
   * @param firmId Firm ID for multi-tenant isolation
   * @returns True if deactivated
   */
  static async deactivate(id: string, firmId: string): Promise<boolean> {
    const sql = `
      UPDATE users
      SET is_active = false
      WHERE id = $1 AND firm_id = $2
    `;
    const result = await query(sql, [id, firmId]);
    return (result.rowCount || 0) > 0;
  }

  /**
   * Hard delete user (cascades to refresh tokens)
   * @param id User ID
   * @param firmId Firm ID for multi-tenant isolation
   * @returns True if deleted
   */
  static async delete(id: string, firmId: string): Promise<boolean> {
    const sql = 'DELETE FROM users WHERE id = $1 AND firm_id = $2';
    const result = await query(sql, [id, firmId]);
    return (result.rowCount || 0) > 0;
  }

  /**
   * List users by firm
   * @param firmId Firm ID
   * @param options Filter and pagination options
   * @returns Users and total count
   */
  static async listByFirm(
    firmId: string,
    options: {
      role?: UserRole;
      is_active?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ users: User[]; total: number }> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const conditions: string[] = ['firm_id = $1'];
    const params: any[] = [firmId];
    let paramIndex = 2;

    if (options.role !== undefined) {
      conditions.push(`role = $${paramIndex++}`);
      params.push(options.role);
    }

    if (options.is_active !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      params.push(options.is_active);
    }

    const whereClause = conditions.join(' AND ');

    const countSql = `SELECT COUNT(*) as count FROM users WHERE ${whereClause}`;
    const dataSql = `
      SELECT * FROM users
      WHERE ${whereClause}
      ORDER BY last_name, first_name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const [countResult, dataResult] = await Promise.all([
      query<{ count: string }>(countSql, params),
      query<User>(dataSql, [...params, limit, offset]),
    ]);

    return {
      users: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
    };
  }

  /**
   * Check if email exists in firm
   * @param email Email to check
   * @param firmId Firm ID
   * @param excludeUserId Optionally exclude a user ID (for updates)
   * @returns True if exists
   */
  static async emailExists(
    email: string,
    firmId: string,
    excludeUserId?: string
  ): Promise<boolean> {
    let sql = 'SELECT id FROM users WHERE email = $1 AND firm_id = $2';
    const params: any[] = [email.toLowerCase(), firmId];

    if (excludeUserId) {
      sql += ' AND id != $3';
      params.push(excludeUserId);
    }

    const result = await query(sql, params);
    return result.rows.length > 0;
  }

  /**
   * Count users by role in firm
   * @param firmId Firm ID
   * @returns Role counts
   */
  static async countByRole(firmId: string): Promise<{
    admin: number;
    attorney: number;
    paralegal: number;
    total: number;
  }> {
    const sql = `
      SELECT
        role,
        COUNT(*) as count
      FROM users
      WHERE firm_id = $1 AND is_active = true
      GROUP BY role
    `;

    const result = await query<{ role: UserRole; count: string }>(sql, [
      firmId,
    ]);

    const counts = {
      admin: 0,
      attorney: 0,
      paralegal: 0,
      total: 0,
    };

    for (const row of result.rows) {
      const count = parseInt(row.count);
      counts[row.role] = count;
      counts.total += count;
    }

    return counts;
  }

  /**
   * Convert User to DTO (excludes password_hash)
   * @param user User model
   * @returns User DTO
   */
  static toDTO(user: User): UserDTO {
    return {
      id: user.id,
      firm_id: user.firm_id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  /**
   * Convert multiple users to DTOs
   * @param users User models
   * @returns User DTOs
   */
  static toDTOs(users: User[]): UserDTO[] {
    return users.map((user) => this.toDTO(user));
  }
}

export default UserModel;
