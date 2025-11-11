import { Pool } from 'pg';
import { getPool } from '../db/connection';
import { hashPassword, verifyPassword, validatePasswordStrength } from './password';
import { generateAccessToken } from './jwt';
import {
  generateRefreshToken,
  storeRefreshToken,
  verifyRefreshToken,
  invalidateRefreshToken,
  invalidateAllUserTokens
} from './token';
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  UserRole
} from '../types/auth';

/**
 * Authentication Service
 * Handles user registration, login, token refresh, logout, and password reset
 */

export class AuthService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  /**
   * Register a new user account
   */
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    const { email, password, firstName, lastName, firmId, role } = request;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new Error(`WEAK_PASSWORD: ${passwordValidation.error}`);
    }

    // Check if user already exists in this firm
    const existingUser = await this.findUserByEmailAndFirm(email, firmId);
    if (existingUser) {
      throw new Error('USER_ALREADY_EXISTS');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert user (default role: paralegal)
    const result = await this.pool.query(
      `INSERT INTO users (firm_id, email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, firm_id`,
      [firmId, email.toLowerCase(), passwordHash, firstName, lastName, role || 'paralegal']
    );

    const user = result.rows[0];

    return {
      userId: user.id,
      email: user.email,
      firmId: user.firm_id
    };
  }

  /**
   * Authenticate user and issue tokens
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    const { email, password, firmId } = request;

    // Find user
    const user = await this.findUserByEmailAndFirm(email, firmId);
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('USER_INACTIVE');
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Generate tokens
    const accessToken = generateAccessToken(
      user.id,
      user.email,
      user.firm_id,
      user.role as UserRole
    );

    const refreshToken = generateRefreshToken();
    await storeRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role as UserRole,
        firmId: user.firm_id
      }
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    refreshToken: string
  ): Promise<RefreshTokenResponse> {
    // Verify refresh token
    const userId = await verifyRefreshToken(refreshToken);
    if (!userId) {
      throw new Error('INVALID_TOKEN');
    }

    // Get user details
    const user = await this.findUserById(userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    if (!user.is_active) {
      throw new Error('USER_INACTIVE');
    }

    // Generate new access token
    const accessToken = generateAccessToken(
      user.id,
      user.email,
      user.firm_id,
      user.role as UserRole
    );

    return {
      accessToken
      // Note: Not rotating refresh token in this implementation
      // Token rotation can be added here if needed
    };
  }

  /**
   * Logout user by invalidating refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    await invalidateRefreshToken(refreshToken);
  }

  /**
   * Initiate password reset process
   * Generates reset token and stores it in database
   * Note: Email sending is mocked - implement in production
   */
  async forgotPassword(email: string, firmId: string): Promise<void> {
    // Find user (don't reveal if user exists for security)
    const user = await this.findUserByEmailAndFirm(email, firmId);
    if (!user) {
      // Return success even if user doesn't exist (security: don't reveal user existence)
      return;
    }

    // Generate reset token
    const resetToken = generateRefreshToken();
    const tokenHash = await hashPassword(resetToken);

    // Store reset token (expires in 1 hour)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    // TODO: Send email with reset link
    // await sendPasswordResetEmail(user.email, resetToken);
    console.log(`Password reset token for ${email}: ${resetToken}`);
  }

  /**
   * Complete password reset with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(`WEAK_PASSWORD: ${passwordValidation.error}`);
    }

    // Find valid reset token
    const userId = await this.verifyResetToken(token);
    if (!userId) {
      throw new Error('INVALID_RESET_TOKEN');
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update user password
    await this.pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, userId]
    );

    // Mark reset token as used
    await this.markResetTokenUsed(token);

    // Invalidate all refresh tokens (force re-login)
    await invalidateAllUserTokens(userId);
  }

  /**
   * Helper: Find user by email and firm
   */
  private async findUserByEmailAndFirm(
    email: string,
    firmId: string
  ): Promise<any | null> {
    const result = await this.pool.query(
      `SELECT id, firm_id, email, password_hash, role, first_name, last_name, is_active
       FROM users
       WHERE firm_id = $1 AND LOWER(email) = LOWER($2)`,
      [firmId, email]
    );

    return result.rows[0] || null;
  }

  /**
   * Helper: Find user by ID
   */
  private async findUserById(userId: string): Promise<any | null> {
    const result = await this.pool.query(
      `SELECT id, firm_id, email, password_hash, role, first_name, last_name, is_active
       FROM users
       WHERE id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Helper: Verify password reset token
   */
  private async verifyResetToken(token: string): Promise<string | null> {
    const result = await this.pool.query(
      `SELECT id, user_id, token_hash
       FROM password_reset_tokens
       WHERE expires_at > NOW() AND used = false
       ORDER BY created_at DESC`
    );

    const bcrypt = await import('bcrypt');
    for (const row of result.rows) {
      try {
        const matches = await bcrypt.compare(token, row.token_hash);
        if (matches) {
          return row.user_id;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Helper: Mark reset token as used
   */
  private async markResetTokenUsed(token: string): Promise<void> {
    const result = await this.pool.query(
      `SELECT id, token_hash
       FROM password_reset_tokens
       WHERE used = false`
    );

    const bcrypt = await import('bcrypt');
    for (const row of result.rows) {
      try {
        const matches = await bcrypt.compare(token, row.token_hash);
        if (matches) {
          await this.pool.query(
            'UPDATE password_reset_tokens SET used = true WHERE id = $1',
            [row.id]
          );
          return;
        }
      } catch {
        continue;
      }
    }
  }
}
