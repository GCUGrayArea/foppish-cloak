import dotenv from 'dotenv';

dotenv.config();

/**
 * JWT Configuration
 * Secrets should be loaded from AWS Secrets Manager in production
 */

export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  accessTokenExpiry: process.env.JWT_EXPIRES_IN || '1h',
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  algorithm: 'HS256' as const
};

// Validate that JWT secret is set in production
if (process.env.NODE_ENV === 'production' && jwtConfig.secret === 'dev-secret-change-in-production') {
  throw new Error('JWT_SECRET must be set in production environment');
}
