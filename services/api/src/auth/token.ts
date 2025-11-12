import crypto from 'crypto';
import { hashPassword } from './password';
import { getPool } from '../db/connection';

/**
 * Refresh token management utilities
 * Refresh tokens are stored in the database with hashed values for security
 */

/**
 * Generate a cryptographically secure random refresh token
 * @returns Random token string (UUID v4 format)
 */
export function generateRefreshToken(): string {
  return crypto.randomUUID();
}

/**
 * Store a refresh token in the database
 * Tokens are hashed before storage for security
 * @param userId - User's UUID
 * @param token - Plain refresh token
 * @param expiresInDays - Number of days until token expires (default: 30)
 * @returns Promise resolving to token ID
 */
export async function storeRefreshToken(
  userId: string,
  token: string,
  expiresInDays: number = 30
): Promise<string> {
  const pool = getPool();
  const tokenHash = await hashPassword(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const result = await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, tokenHash, expiresAt]
  );

  return result.rows[0].id;
}

/**
 * Verify a refresh token and return associated user ID
 * @param token - Plain refresh token to verify
 * @returns Promise resolving to user ID if valid, null otherwise
 */
export async function verifyRefreshToken(
  token: string
): Promise<string | null> {
  const pool = getPool();

  // Get all non-expired tokens (we'll verify hash client-side)
  const result = await pool.query(
    `SELECT id, user_id, token_hash
     FROM refresh_tokens
     WHERE expires_at > NOW()
     ORDER BY created_at DESC`
  );

  // Use bcrypt to find matching token (constant-time comparison)
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
 * Invalidate a specific refresh token
 * @param token - Plain refresh token to invalidate
 * @returns Promise resolving to true if token was invalidated
 */
export async function invalidateRefreshToken(token: string): Promise<boolean> {
  const pool = getPool();

  // Similar to verify, but we delete the token
  const result = await pool.query(
    `SELECT id, token_hash
     FROM refresh_tokens
     WHERE expires_at > NOW()`
  );

  const bcrypt = await import('bcrypt');
  for (const row of result.rows) {
    try {
      const matches = await bcrypt.compare(token, row.token_hash);
      if (matches) {
        await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [row.id]);
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

/**
 * Invalidate all refresh tokens for a user
 * Used during password reset or account compromise
 * @param userId - User's UUID
 * @returns Promise resolving to number of tokens invalidated
 */
export async function invalidateAllUserTokens(userId: string): Promise<number> {
  const pool = getPool();

  const result = await pool.query(
    'DELETE FROM refresh_tokens WHERE user_id = $1 RETURNING id',
    [userId]
  );

  return result.rowCount || 0;
}

/**
 * Clean up expired refresh tokens
 * Should be run periodically (e.g., daily cron job)
 * @returns Promise resolving to number of tokens deleted
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const pool = getPool();

  const result = await pool.query(
    'DELETE FROM refresh_tokens WHERE expires_at <= NOW() RETURNING id'
  );

  return result.rowCount || 0;
}
