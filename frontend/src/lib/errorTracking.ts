import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

/**
 * Sentry error tracking configuration for frontend
 *
 * Features:
 * - Error capture with stack traces
 * - Performance monitoring
 * - User context tracking
 * - Breadcrumbs for debugging
 * - Session replay (optional)
 * - Environment-based configuration
 */

export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
  enabled: boolean;
}

/**
 * Get Sentry configuration from environment variables
 */
function getSentryConfig(): SentryConfig {
  const environment = import.meta.env.MODE || 'development';
  const dsn = import.meta.env.VITE_SENTRY_DSN || '';
  const enabled = !!dsn && environment !== 'development';

  return {
    dsn,
    environment,
    release: import.meta.env.VITE_SENTRY_RELEASE || import.meta.env.VITE_APP_VERSION,
    // Sample 100% of transactions in development, 10% in production
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    // Sample 10% of sessions for replay in production
    replaysSessionSampleRate: environment === 'production' ? 0.1 : 0,
    // Sample 100% of error sessions for replay
    replaysOnErrorSampleRate: 1.0,
    enabled,
  };
}

/**
 * Initialize Sentry SDK
 * Must be called before React app renders
 */
export function initSentry() {
  const config = getSentryConfig();

  if (!config.enabled) {
    console.info('Sentry is disabled (no DSN configured or development environment)');
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,

    // Performance monitoring
    integrations: [
      new BrowserTracing({
        // Set sampling rate for performance monitoring
        tracePropagationTargets: [
          'localhost',
          /^https:\/\/[^/]*\.amazonaws\.com/,
          /^https:\/\/api\./,
        ],
      }),
      // Session replay for debugging
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    tracesSampleRate: config.tracesSampleRate,
    replaysSessionSampleRate: config.replaysSessionSampleRate,
    replaysOnErrorSampleRate: config.replaysOnErrorSampleRate,

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from request bodies
      if (event.request?.data) {
        const data = event.request.data as any;
        if (data.password) data.password = '***REDACTED***';
        if (data.token) data.token = '***REDACTED***';
        if (data.apiKey) data.apiKey = '***REDACTED***';
      }

      // Remove authorization headers
      if (event.request?.headers) {
        delete event.request.headers.Authorization;
        delete event.request.headers.authorization;
      }

      // Don't send events for cancelled requests
      if (hint.originalException instanceof Error) {
        if (
          hint.originalException.message.includes('cancel') ||
          hint.originalException.message.includes('abort')
        ) {
          return null;
        }
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',
      // Network errors (expected)
      'Network request failed',
      'NetworkError',
      // React hydration errors (usually not critical)
      'Hydration failed',
    ],

    // Set initial tags
    initialScope: {
      tags: {
        service: 'frontend',
        runtime: 'browser',
      },
    },
  });

  console.info('Sentry initialized', {
    environment: config.environment,
    release: config.release,
    tracesSampleRate: config.tracesSampleRate,
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
  if (!getSentryConfig().enabled) return;

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
  if (!getSentryConfig().enabled) return;

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
  if (!getSentryConfig().enabled) return;

  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

/**
 * Manually capture an exception
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (!getSentryConfig().enabled) {
    console.error('Error (Sentry disabled):', error, context);
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
  if (!getSentryConfig().enabled) {
    console.log('Message (Sentry disabled):', message, context);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    contexts: context ? { custom: context } : undefined,
  });
}

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, op: string) {
  if (!getSentryConfig().enabled) return null;

  return Sentry.startTransaction({ name, op });
}

/**
 * Error boundary component
 * Wrap your app with this to catch React errors
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

/**
 * Higher-order component to profile component performance
 */
export const withProfiler = Sentry.withProfiler;

/**
 * Hook to capture errors in React components
 */
export function useErrorHandler() {
  return {
    captureException,
    captureMessage,
    addBreadcrumb,
  };
}

/**
 * Log API error with context
 */
export function logApiError(
  error: Error,
  endpoint: string,
  method: string,
  statusCode?: number
) {
  addBreadcrumb(
    `API Error: ${method} ${endpoint}`,
    'api',
    'error',
    {
      endpoint,
      method,
      statusCode,
      error: error.message,
    }
  );

  captureException(error, {
    api: {
      endpoint,
      method,
      statusCode,
    },
  });
}

/**
 * Log authentication error
 */
export function logAuthError(error: Error, action: string) {
  addBreadcrumb(
    `Authentication Error: ${action}`,
    'auth',
    'error',
    {
      action,
      error: error.message,
    }
  );

  captureException(error, {
    auth: {
      action,
    },
  });
}

/**
 * Log navigation error
 */
export function logNavigationError(error: Error, path: string) {
  addBreadcrumb(
    `Navigation Error: ${path}`,
    'navigation',
    'error',
    {
      path,
      error: error.message,
    }
  );

  captureException(error, {
    navigation: {
      path,
    },
  });
}

/**
 * Track feature usage
 */
export function trackFeatureUsage(feature: string, action: string, metadata?: Record<string, any>) {
  addBreadcrumb(
    `Feature: ${feature} - ${action}`,
    'user-action',
    'info',
    {
      feature,
      action,
      ...metadata,
    }
  );
}
