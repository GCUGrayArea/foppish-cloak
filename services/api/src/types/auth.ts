/**
 * Authentication types and interfaces
 */

export type UserRole = 'admin' | 'attorney' | 'paralegal';

/**
 * JWT Payload structure
 * Includes firmId for multi-tenant architecture
 */
export interface JWTPayload {
  sub: string; // user ID
  email: string;
  firmId: string; // CRITICAL for multi-tenancy
  role: UserRole;
  iat: number; // issued at
  exp: number; // expires at
}

/**
 * User context extracted from JWT
 * Attached to Express Request object by auth middleware
 */
export interface UserContext {
  id: string;
  email: string;
  firmId: string;
  role: UserRole;
}

/**
 * Login request body
 */
export interface LoginRequest {
  email: string;
  password: string;
  firmId: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    firmId: string;
  };
}

/**
 * Registration request body
 */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  firmId: string;
  role?: UserRole; // Optional, defaults to 'paralegal'
}

/**
 * Registration response
 */
export interface RegisterResponse {
  userId: string;
  email: string;
  firmId: string;
}

/**
 * Token refresh request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Token refresh response
 */
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken?: string; // Optional if implementing token rotation
}

/**
 * Logout request
 */
export interface LogoutRequest {
  refreshToken: string;
}

/**
 * Forgot password request
 */
export interface ForgotPasswordRequest {
  email: string;
  firmId: string;
}

/**
 * Reset password request
 */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

/**
 * Standard auth error response
 */
export interface AuthErrorResponse {
  error: string;
  code: string;
  statusCode: number;
}

/**
 * Auth error codes
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  INVALID_RESET_TOKEN = 'INVALID_RESET_TOKEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_INACTIVE = 'USER_INACTIVE'
}
