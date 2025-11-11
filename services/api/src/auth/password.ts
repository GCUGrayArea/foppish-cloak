import bcrypt from 'bcrypt';

/**
 * Password hashing and verification utilities using bcrypt
 * Cost factor: 12 (OWASP recommended for sensitive data)
 */

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt
 * @param password - Plain text password to hash
 * @returns Promise resolving to hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length === 0) {
    throw new Error('Password cannot be empty');
  }

  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plaintext password with a hashed password
 * Uses constant-time comparison to prevent timing attacks
 * @param password - Plain text password to verify
 * @param hashedPassword - Hashed password to compare against
 * @returns Promise resolving to true if passwords match
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  if (!password || !hashedPassword) {
    return false;
  }

  return bcrypt.compare(password, hashedPassword);
}

/**
 * Validate password strength requirements
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 *
 * @param password - Password to validate
 * @returns Object with valid flag and error message if invalid
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  error?: string;
} {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return {
      valid: false,
      error: 'Password must be at least 8 characters long'
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one uppercase letter'
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one lowercase letter'
    };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one special character'
    };
  }

  return { valid: true };
}
