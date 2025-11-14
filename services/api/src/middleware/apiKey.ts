import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db/pool';

/**
 * API Key Authentication Middleware
 *
 * Validates X-API-Key header and authenticates using firm API keys.
 * API keys bypass user authentication but still require firm context.
 */
export async function validateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    // If no API key provided, continue to next middleware
    if (!apiKey) {
      return next();
    }

    // Query database for firms with API keys enabled
    const result = await pool.query(
      `SELECT id, name, api_key_hash, api_key_enabled
       FROM firms
       WHERE api_key_enabled = true`,
      []
    );

    // Check each firm's API key hash
    for (const firm of result.rows) {
      const isValid = await bcrypt.compare(apiKey, firm.api_key_hash);

      if (isValid) {
        // API key is valid - attach firm context to request
        (req as any).firm = {
          id: firm.id,
          name: firm.name,
        };

        // Also set a flag indicating API key authentication
        (req as any).apiKeyAuth = true;

        return next();
      }
    }

    // No valid API key found
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key',
    });
  } catch (error) {
    console.error('API key validation error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to validate API key',
    });
  }
}

/**
 * Middleware to check if request is authenticated via API key or JWT
 * Use this instead of the standard `authenticate` middleware when you
 * want to allow both API key and JWT authentication
 */
export async function authenticateWithApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Check if API key authentication succeeded
  if ((req as any).apiKeyAuth) {
    return next();
  }

  // Otherwise, fall through to JWT authentication
  // Import auth middleware dynamically to avoid circular dependency
  const { authenticate } = await import('./auth');
  return authenticate(req, res, next);
}
