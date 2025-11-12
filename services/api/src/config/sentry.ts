import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { Express } from 'express';
import logger from '../lib/logger';

/**
 * Sentry configuration for error tracking and performance monitoring
 *
 * Features:
 * - Error tracking with context
 * - Performance monitoring (transactions and spans)
 * - Request breadcrumbs
 * - User context enrichment
 * - Environment-based configuration
 * - Production profiling
 */

export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  enabled: boolean;
}

/**
 * Get Sentry configuration from environment
 */
function getSentryConfig(): SentryConfig {
  const environment = process.env.NODE_ENV || 'development';
  const dsn = process.env.SENTRY_DSN || '';
  const enabled = !!dsn && environment !== 'development';

  return {
    dsn,
    environment,
    release: process.env.SENTRY_RELEASE || process.env.npm_package_version,
    // Sample 100% of transactions in development, 10% in production
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    // Sample 100% of profiles in development, 10% in production
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
    enabled,
  };
}

/**
 * Initialize Sentry SDK
 */
export function initSentry() {
  const config = getSentryConfig();

  if (!config.enabled) {
    logger.info('Sentry is disabled (no DSN configured or development environment)');
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,

    // Performance monitoring
    tracesSampleRate: config.tracesSampleRate,
    profilesSampleRate: config.profilesSampleRate,

    // Integrations
    integrations: [
      // Performance profiling
      new ProfilingIntegration(),

      // HTTP instrumentation
      new Sentry.Integrations.Http({ tracing: true }),

      // Express instrumentation (will be set up separately with app)
    ],

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }

      // Remove sensitive query parameters
      if (event.request?.query_string) {
        event.request.query_string = event.request.query_string.replace(
          /([?&])(token|password|secret|api_key)=[^&]*/gi,
          '$1$2=***REDACTED***'
        );
      }

      return event;
    },

    // Add global tags
    initialScope: {
      tags: {
        service: 'api',
        runtime: 'node',
      },
    },
  });

  logger.info('Sentry initialized', {
    environment: config.environment,
    release: config.release,
    tracesSampleRate: config.tracesSampleRate,
  });
}

/**
 * Set up Sentry Express middleware
 * Must be called after Express app is created
 */
export function setupSentryMiddleware(app: Express) {
  const config = getSentryConfig();

  if (!config.enabled) {
    return;
  }

  // Request handler must be the first middleware
  app.use(
    Sentry.Handlers.requestHandler({
      user: ['id', 'firmId', 'email', 'role'],
      ip: true,
    })
  );

  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());

  logger.info('Sentry Express middleware configured');
}

/**
 * Set up Sentry error handler middleware
 * Must be called after all routes but before other error handlers
 */
export function setupSentryErrorHandler(app: Express) {
  const config = getSentryConfig();

  if (!config.enabled) {
    return;
  }

  // Error handler must be after all controllers but before other error handlers
  app.use(
    Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Capture all errors except expected client errors
        const statusCode =
          error && typeof error === 'object' && 'statusCode' in error
            ? (error as any).statusCode
            : 500;
        return statusCode >= 500 || statusCode === 401 || statusCode === 403;
      },
    })
  );

  logger.info('Sentry error handler middleware configured');
}

/**
 * Manually capture an exception with context
 */
export function captureException(error: Error, context?: Record<string, any>) {
  const config = getSentryConfig();

  if (!config.enabled) {
    return;
  }

  Sentry.captureException(error, {
    contexts: context ? { custom: context } : undefined,
  });
}

/**
 * Manually capture a message
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) {
  const config = getSentryConfig();

  if (!config.enabled) {
    return;
  }

  Sentry.captureMessage(message, {
    level,
    contexts: context ? { custom: context } : undefined,
  });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  firmId: string;
  role?: string;
}) {
  const config = getSentryConfig();

  if (!config.enabled) {
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    firmId: user.firmId,
    role: user.role,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  const config = getSentryConfig();

  if (!config.enabled) {
    return;
  }

  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
) {
  const config = getSentryConfig();

  if (!config.enabled) {
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, op: string) {
  const config = getSentryConfig();

  if (!config.enabled) {
    return null;
  }

  return Sentry.startTransaction({ name, op });
}

/**
 * Flush Sentry events (useful for Lambda functions)
 */
export async function flushSentry(timeout: number = 2000): Promise<boolean> {
  const config = getSentryConfig();

  if (!config.enabled) {
    return true;
  }

  return Sentry.flush(timeout);
}
