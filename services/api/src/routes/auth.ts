import { Router, Request, Response } from 'express';
import { AuthService } from '../auth/AuthService';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../utils/validation';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../utils/validation';
import type {
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  LogoutRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest
} from '../types/auth';

const router = Router();
const authService = new AuthService();

/**
 * POST /auth/register
 * Register a new user account
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = validateRequest(registerSchema, req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        details: validation.errors
      });
      return;
    }

    const request = validation.data as RegisterRequest;

    // Register user
    const result = await authService.register(request);

    res.status(201).json(result);
  } catch (error) {
    handleAuthError(error, res);
  }
});

/**
 * POST /auth/login
 * Authenticate user and return tokens
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = validateRequest(loginSchema, req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        details: validation.errors
      });
      return;
    }

    const request = validation.data as LoginRequest;

    // Authenticate user
    const result = await authService.login(request);

    res.status(200).json(result);
  } catch (error) {
    handleAuthError(error, res);
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = validateRequest(refreshTokenSchema, req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        details: validation.errors
      });
      return;
    }

    const { refreshToken } = validation.data as RefreshTokenRequest;

    // Refresh access token
    const result = await authService.refreshAccessToken(refreshToken);

    res.status(200).json(result);
  } catch (error) {
    handleAuthError(error, res);
  }
});

/**
 * POST /auth/logout
 * Logout user by invalidating refresh token
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = validateRequest(logoutSchema, req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        details: validation.errors
      });
      return;
    }

    const { refreshToken } = validation.data as LogoutRequest;

    // Logout user
    await authService.logout(refreshToken);

    res.status(200).json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    handleAuthError(error, res);
  }
});

/**
 * POST /auth/forgot-password
 * Initiate password reset flow
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = validateRequest(forgotPasswordSchema, req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        details: validation.errors
      });
      return;
    }

    const { email, firmId } = validation.data as ForgotPasswordRequest;

    // Initiate password reset (always returns success for security)
    await authService.forgotPassword(email, firmId);

    res.status(200).json({
      message: 'If a user with this email exists, a password reset link has been sent'
    });
  } catch (error) {
    // Always return success to prevent user enumeration
    res.status(200).json({
      message: 'If a user with this email exists, a password reset link has been sent'
    });
  }
});

/**
 * POST /auth/reset-password
 * Complete password reset with token
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = validateRequest(resetPasswordSchema, req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        details: validation.errors
      });
      return;
    }

    const { token, newPassword } = validation.data as ResetPasswordRequest;

    // Reset password
    await authService.resetPassword(token, newPassword);

    res.status(200).json({
      message: 'Password reset successful'
    });
  } catch (error) {
    handleAuthError(error, res);
  }
});

/**
 * Helper function to handle authentication errors
 * Maps service errors to appropriate HTTP responses
 */
function handleAuthError(error: unknown, res: Response): void {
  if (!(error instanceof Error)) {
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
    return;
  }

  const message = error.message;

  // Map error codes to HTTP responses
  if (message === 'USER_ALREADY_EXISTS') {
    res.status(409).json({
      error: 'User with this email already exists in this firm',
      code: 'USER_ALREADY_EXISTS'
    });
    return;
  }

  if (message.startsWith('WEAK_PASSWORD')) {
    res.status(400).json({
      error: message.replace('WEAK_PASSWORD: ', ''),
      code: 'WEAK_PASSWORD'
    });
    return;
  }

  if (message === 'INVALID_CREDENTIALS') {
    res.status(401).json({
      error: 'Invalid email or password',
      code: 'INVALID_CREDENTIALS'
    });
    return;
  }

  if (message === 'USER_INACTIVE') {
    res.status(403).json({
      error: 'User account is inactive',
      code: 'USER_INACTIVE'
    });
    return;
  }

  if (message === 'INVALID_TOKEN' || message === 'USER_NOT_FOUND') {
    res.status(401).json({
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
    return;
  }

  if (message === 'INVALID_RESET_TOKEN') {
    res.status(400).json({
      error: 'Invalid or expired reset token',
      code: 'INVALID_RESET_TOKEN'
    });
    return;
  }

  // Generic error
  console.error('Auth error:', error);
  res.status(500).json({
    error: 'Authentication failed',
    code: 'AUTH_ERROR'
  });
}

export default router;
