/**
 * User Service
 *
 * Business logic for user management operations.
 * Handles user listing, updates, role changes, and deletion.
 */

import { Pool } from 'pg';
import { getPool } from '../db/connection';
import {
  User,
  UserListFilters,
  UpdateUserRequest,
  UserResponse,
  UserListResponse,
  UserProfileResponse
} from '../types/user';
import { UserRole } from '../types/auth';

export class UserService {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || getPool();
  }

  /**
   * List users in a firm with optional filters
   *
   * @param firmId - Firm UUID
   * @param filters - Optional filters (role, isActive, pagination)
   * @returns Paginated list of users
   */
  async listFirmUsers(
    firmId: string,
    filters: UserListFilters = {}
  ): Promise<UserListResponse> {
    const { role, isActive, page = 1, limit = 50 } = filters;

    // Build WHERE clauses
    const whereClauses = ['firm_id = $1'];
    const values: any[] = [firmId];
    let paramCount = 2;

    if (role !== undefined) {
      whereClauses.push(`role = $${paramCount}`);
      values.push(role);
      paramCount++;
    }

    if (isActive !== undefined) {
      whereClauses.push(`is_active = $${paramCount}`);
      values.push(isActive);
      paramCount++;
    }

    const whereClause = whereClauses.join(' AND ');

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM users WHERE ${whereClause}`;
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT id, firm_id, email, first_name, last_name, role, is_active, created_at, updated_at
      FROM users
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    values.push(limit, offset);
    const dataResult = await this.pool.query(dataQuery, values);

    const users = dataResult.rows.map(row => this.toResponse(this.mapRowToUser(row)));

    return {
      users,
      total,
      page,
      limit
    };
  }

  /**
   * Get user by ID (with firm verification)
   *
   * @param userId - User UUID
   * @param firmId - Firm UUID for verification
   * @returns User data
   * @throws Error if user not found or belongs to different firm
   */
  async getUserById(userId: string, firmId: string): Promise<User> {
    const result = await this.pool.query(
      `SELECT id, firm_id, email, first_name, last_name, role, is_active, created_at, updated_at
       FROM users
       WHERE id = $1 AND firm_id = $2`,
      [userId, firmId]
    );

    if (result.rows.length === 0) {
      throw new Error('USER_NOT_FOUND');
    }

    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Get user profile with firm information
   *
   * @param userId - User UUID
   * @param firmId - Firm UUID for verification
   * @returns User profile with firm name
   */
  async getUserProfile(userId: string, firmId: string): Promise<UserProfileResponse> {
    const result = await this.pool.query(
      `SELECT u.id, u.firm_id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at, f.name as firm_name
       FROM users u
       JOIN firms f ON u.firm_id = f.id
       WHERE u.id = $1 AND u.firm_id = $2`,
      [userId, firmId]
    );

    if (result.rows.length === 0) {
      throw new Error('USER_NOT_FOUND');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at.toISOString(),
      firmId: row.firm_id,
      firmName: row.firm_name
    };
  }

  /**
   * Update user profile
   *
   * @param userId - User UUID
   * @param firmId - Firm UUID for verification
   * @param updates - Partial user data to update
   * @param requestingUserId - ID of user making the request
   * @param requestingUserRole - Role of user making the request
   * @returns Updated user data
   * @throws Error if unauthorized or update fails
   */
  async updateUser(
    userId: string,
    firmId: string,
    updates: UpdateUserRequest,
    requestingUserId: string,
    requestingUserRole: UserRole
  ): Promise<User> {
    // Authorization check: can update if self or admin
    const isSelf = userId === requestingUserId;
    const isAdmin = requestingUserRole === 'admin';

    if (!isSelf && !isAdmin) {
      throw new Error('INSUFFICIENT_PERMISSIONS');
    }

    // Verify user exists and belongs to firm
    const existingUser = await this.getUserById(userId, firmId);

    // Build update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.firstName !== undefined) {
      updateFields.push(`first_name = $${paramCount}`);
      values.push(updates.firstName);
      paramCount++;
    }

    if (updates.lastName !== undefined) {
      updateFields.push(`last_name = $${paramCount}`);
      values.push(updates.lastName);
      paramCount++;
    }

    if (updates.email !== undefined) {
      // Check email uniqueness within firm
      await this.checkEmailAvailability(updates.email, firmId, userId);

      updateFields.push(`email = $${paramCount}`);
      values.push(updates.email);
      paramCount++;
    }

    if (updateFields.length === 0) {
      // No updates provided
      return existingUser;
    }

    // Always update updated_at
    updateFields.push(`updated_at = NOW()`);

    // Add userId and firmId to values
    values.push(userId, firmId);

    const query = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND firm_id = $${paramCount + 1}
      RETURNING id, firm_id, email, first_name, last_name, role, is_active, created_at, updated_at
    `;

    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('USER_NOT_FOUND');
    }

    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Change user role (admin only)
   *
   * @param userId - User UUID
   * @param firmId - Firm UUID for verification
   * @param newRole - New role to assign
   * @param requestingUserId - ID of user making the request
   * @param requestingUserRole - Role of user making the request
   * @returns Updated user data
   * @throws Error if unauthorized or user cannot change own role
   */
  async updateUserRole(
    userId: string,
    firmId: string,
    newRole: UserRole,
    requestingUserId: string,
    requestingUserRole: UserRole
  ): Promise<User> {
    // Only admins can change roles
    if (requestingUserRole !== 'admin') {
      throw new Error('INSUFFICIENT_PERMISSIONS');
    }

    // Cannot change own role
    if (userId === requestingUserId) {
      throw new Error('CANNOT_MODIFY_SELF');
    }

    // Verify user exists and belongs to firm
    await this.getUserById(userId, firmId);

    // Update role
    const result = await this.pool.query(
      `UPDATE users
       SET role = $1, updated_at = NOW()
       WHERE id = $2 AND firm_id = $3
       RETURNING id, firm_id, email, first_name, last_name, role, is_active, created_at, updated_at`,
      [newRole, userId, firmId]
    );

    if (result.rows.length === 0) {
      throw new Error('USER_NOT_FOUND');
    }

    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Remove user from firm (soft delete - set is_active = false)
   *
   * @param userId - User UUID
   * @param firmId - Firm UUID for verification
   * @param requestingUserId - ID of user making the request
   * @param requestingUserRole - Role of user making the request
   * @throws Error if unauthorized or user tries to delete self
   */
  async removeUser(
    userId: string,
    firmId: string,
    requestingUserId: string,
    requestingUserRole: UserRole
  ): Promise<void> {
    // Only admins can remove users
    if (requestingUserRole !== 'admin') {
      throw new Error('INSUFFICIENT_PERMISSIONS');
    }

    // Cannot delete self
    if (userId === requestingUserId) {
      throw new Error('CANNOT_MODIFY_SELF');
    }

    // Verify user exists and belongs to firm
    await this.getUserById(userId, firmId);

    // Soft delete: set is_active = false
    const result = await this.pool.query(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 AND firm_id = $2',
      [userId, firmId]
    );

    if (result.rowCount === 0) {
      throw new Error('USER_NOT_FOUND');
    }

    // TODO: Invalidate all user's refresh tokens
    // This will be implemented when AuthService is available
  }

  /**
   * Check if email is available within firm (excluding specific user)
   *
   * @param email - Email to check
   * @param firmId - Firm UUID
   * @param excludeUserId - Optional user ID to exclude from check
   * @throws Error if email already in use
   */
  private async checkEmailAvailability(
    email: string,
    firmId: string,
    excludeUserId?: string
  ): Promise<void> {
    const query = excludeUserId
      ? 'SELECT id FROM users WHERE email = $1 AND firm_id = $2 AND id != $3'
      : 'SELECT id FROM users WHERE email = $1 AND firm_id = $2';

    const values = excludeUserId ? [email, firmId, excludeUserId] : [email, firmId];

    const result = await this.pool.query(query, values);

    if (result.rows.length > 0) {
      throw new Error('EMAIL_CONFLICT');
    }
  }

  /**
   * Map database row to User model
   */
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      firmId: row.firm_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Convert User model to API response format
   */
  toResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString()
    };
  }
}
