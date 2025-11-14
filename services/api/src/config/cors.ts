import { CorsOptions } from 'cors';

// Get allowed origins from environment
function getAllowedOrigins(): string[] {
  const frontendUrl = process.env.FRONTEND_URL;
  const nodeEnv = process.env.NODE_ENV;

  const origins: string[] = [];

  // Add frontend URL if configured
  if (frontendUrl) {
    origins.push(frontendUrl);
  }

  // In development, allow localhost on any port
  if (nodeEnv === 'development') {
    origins.push(/^http:\/\/localhost:\d+$/);
  }

  return origins;
}

// CORS configuration
export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is allowed
    const isAllowed = allowedOrigins.some((allowed) => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      }
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies and authentication headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Authorization',
    'Content-Type',
    'X-Correlation-ID',
    'X-API-Key',
  ],
  exposedHeaders: [
    'X-Correlation-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 86400, // 24 hours - how long to cache preflight requests
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
