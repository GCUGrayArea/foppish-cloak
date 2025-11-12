import { z } from 'zod';

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Password requirements
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REQUIREMENTS = {
  minLength: PASSWORD_MIN_LENGTH,
  hasUppercase: true,
  hasLowercase: true,
  hasNumber: true,
  hasSpecialChar: true,
};

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Validates password strength
 * Returns object with validation results for each requirement
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
} {
  const checks = {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const isValid = Object.values(checks).every(Boolean);

  return { isValid, checks };
}

/**
 * Get password strength message
 */
export function getPasswordStrengthMessage(password: string): string | null {
  if (password.length === 0) {
    return null;
  }

  const { isValid, checks } = validatePasswordStrength(password);

  if (isValid) {
    return null;
  }

  const missing: string[] = [];
  if (!checks.minLength) missing.push(`at least ${PASSWORD_MIN_LENGTH} characters`);
  if (!checks.hasUppercase) missing.push('an uppercase letter');
  if (!checks.hasLowercase) missing.push('a lowercase letter');
  if (!checks.hasNumber) missing.push('a number');
  if (!checks.hasSpecialChar) missing.push('a special character');

  return `Password must contain ${missing.join(', ')}.`;
}

// Zod schemas for form validation

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z
    .string()
    .min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .refine((password) => {
      const { isValid } = validatePasswordStrength(password);
      return isValid;
    }, {
      message: 'Password must contain uppercase, lowercase, number, and special character',
    }),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters'),
  firmName: z
    .string()
    .min(1, 'Firm name is required')
    .max(100, 'Firm name must be less than 100 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .refine((password) => {
      const { isValid } = validatePasswordStrength(password);
      return isValid;
    }, {
      message: 'Password must contain uppercase, lowercase, number, and special character',
    }),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  token: z.string().min(1, 'Reset token is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Type exports for form data
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
