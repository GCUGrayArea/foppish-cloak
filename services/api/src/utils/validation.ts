import { z } from 'zod';

/**
 * Zod validation schemas for authentication endpoints
 */

// UUID validation
const uuidSchema = z.string().uuid('Invalid UUID format');

// Email validation
const emailSchema = z.string().email('Invalid email format');

// Password validation (minimum requirements)
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    'Password must contain at least one special character'
  );

// User role validation
const roleSchema = z.enum(['admin', 'attorney', 'paralegal']);

/**
 * Registration request validation schema
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  firmId: uuidSchema,
  role: roleSchema.optional()
});

/**
 * Login request validation schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  firmId: uuidSchema
});

/**
 * Token refresh request validation schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

/**
 * Logout request validation schema
 */
export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

/**
 * Forgot password request validation schema
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
  firmId: uuidSchema
});

/**
 * Reset password request validation schema
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema
});

/**
 * Validate request body against a schema
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result with typed data or errors
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map(err => err.message);
  return { success: false, errors };
}
