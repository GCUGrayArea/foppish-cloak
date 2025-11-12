/**
 * Invitation Service
 *
 * Business logic for user invitation system.
 * Handles invitation creation, validation, and acceptance.
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db/connection';
import {
  Invitation,
  InvitationResponse,
  InviteUserRequest
} from '../types/user';

export class InvitationService {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || getPool();
  }

  /**
   * Invite a new user to the firm
   *
   * @param firmId - Firm UUID
   * @param invitation - Invitation details
   * @param invitedBy - UUID of user creating invitation
   * @returns Created invitation
   * @throws Error if user already exists or email in use
   */
  async inviteUser(
    firmId: string,
    invitation: InviteUserRequest,
    invitedBy: string
  ): Promise<InvitationResponse> {
    // Check if user already exists in firm
    const existingUser = await this.pool.query(
      'SELECT id FROM users WHERE email = $1 AND firm_id = $2',
      [invitation.email, firmId]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('USER_ALREADY_EXISTS');
    }

    // Check for pending invitation
    const existingInvitation = await this.pool.query(
      'SELECT id FROM invitations WHERE email = $1 AND firm_id = $2 AND used = false AND expires_at > NOW()',
      [invitation.email, firmId]
    );

    if (existingInvitation.rows.length > 0) {
      throw new Error('INVITATION_ALREADY_PENDING');
    }

    // Generate unique invitation token
    const token = uuidv4();

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const result = await this.pool.query(
      `INSERT INTO invitations (id, firm_id, email, first_name, last_name, role, token, expires_at, used, invited_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9, NOW())
       RETURNING id, firm_id, email, first_name, last_name, role, token, expires_at, used, invited_by, created_at`,
      [
        uuidv4(),
        firmId,
        invitation.email,
        invitation.firstName,
        invitation.lastName,
        invitation.role,
        token,
        expiresAt,
        invitedBy
      ]
    );

    const created = this.mapRowToInvitation(result.rows[0]);

    // TODO: Send invitation email
    // This will be implemented after email utility is created

    return this.toResponse(created);
  }

  /**
   * Validate invitation token
   *
   * @param token - Invitation token UUID
   * @returns Invitation details if valid
   * @throws Error if token invalid, expired, or already used
   */
  async validateInvitation(token: string): Promise<Invitation> {
    const result = await this.pool.query(
      `SELECT id, firm_id, email, first_name, last_name, role, token, expires_at, used, invited_by, created_at
       FROM invitations
       WHERE token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      throw new Error('INVITATION_NOT_FOUND');
    }

    const invitation = this.mapRowToInvitation(result.rows[0]);

    // Check if already used
    if (invitation.used) {
      throw new Error('INVITATION_USED');
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      throw new Error('INVITATION_EXPIRED');
    }

    return invitation;
  }

  /**
   * Mark invitation as used
   *
   * @param token - Invitation token UUID
   * @throws Error if token not found
   */
  async acceptInvitation(token: string): Promise<void> {
    // Validate first
    await this.validateInvitation(token);

    // Mark as used
    const result = await this.pool.query(
      'UPDATE invitations SET used = true WHERE token = $1',
      [token]
    );

    if (result.rowCount === 0) {
      throw new Error('INVITATION_NOT_FOUND');
    }
  }

  /**
   * Get all invitations for a firm
   *
   * @param firmId - Firm UUID
   * @param includePending - Include only pending invitations (default: true)
   * @returns List of invitations
   */
  async listFirmInvitations(
    firmId: string,
    includePending: boolean = true
  ): Promise<InvitationResponse[]> {
    let query = `
      SELECT id, firm_id, email, first_name, last_name, role, token, expires_at, used, invited_by, created_at
      FROM invitations
      WHERE firm_id = $1
    `;

    if (includePending) {
      query += ' AND used = false AND expires_at > NOW()';
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, [firmId]);

    return result.rows.map(row => {
      const invitation = this.mapRowToInvitation(row);
      return this.toResponse(invitation);
    });
  }

  /**
   * Cancel/delete an invitation (admin only)
   *
   * @param invitationId - Invitation UUID
   * @param firmId - Firm UUID for verification
   * @throws Error if invitation not found
   */
  async cancelInvitation(invitationId: string, firmId: string): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM invitations WHERE id = $1 AND firm_id = $2',
      [invitationId, firmId]
    );

    if (result.rowCount === 0) {
      throw new Error('INVITATION_NOT_FOUND');
    }
  }

  /**
   * Map database row to Invitation model
   */
  private mapRowToInvitation(row: any): Invitation {
    return {
      id: row.id,
      firmId: row.firm_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      token: row.token,
      expiresAt: row.expires_at,
      used: row.used,
      invitedBy: row.invited_by,
      createdAt: row.created_at
    };
  }

  /**
   * Convert Invitation model to API response format
   */
  toResponse(invitation: Invitation): InvitationResponse {
    let status: 'pending' | 'used' | 'expired';

    if (invitation.used) {
      status = 'used';
    } else if (new Date() > invitation.expiresAt) {
      status = 'expired';
    } else {
      status = 'pending';
    }

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
      status
    };
  }
}
