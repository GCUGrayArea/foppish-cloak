import winston from 'winston';

/**
 * Structured logger using Winston with CloudWatch transport
 *
 * Features:
 * - JSON structured logging for easy parsing
 * - Correlation ID support for request tracking
 * - Multiple log levels (debug, info, warn, error)
 * - CloudWatch transport for production
 * - Console transport for development
 * - Automatic context enrichment (timestamp, environment, service)
 */

// Environment configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

// Custom format for development (human-readable)
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, correlationId, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    const corrId = correlationId ? `[${correlationId}]` : '';
    return `${timestamp} ${level} ${corrId}: ${message} ${metaStr}`;
  })
);

// Custom format for production (structured JSON)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the base logger
const logger = winston.createLogger({
  level: logLevel,
  format: isDevelopment ? developmentFormat : productionFormat,
  defaultMeta: {
    service: 'api',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
  ],
});

// Add CloudWatch transport in production (when configured)
// Note: This will be configured when AWS credentials are available
// For now, we use console logging and can add CloudWatch transport via config
if (process.env.AWS_CLOUDWATCH_GROUP_NAME && process.env.AWS_CLOUDWATCH_STREAM_NAME) {
  // CloudWatch transport will be added here
  // Requires: winston-cloudwatch package
  // This is placeholder for future CloudWatch integration
  logger.info('CloudWatch logging would be enabled in production', {
    groupName: process.env.AWS_CLOUDWATCH_GROUP_NAME,
    streamName: process.env.AWS_CLOUDWATCH_STREAM_NAME,
  });
}

/**
 * Create a child logger with additional context
 * @param meta - Additional metadata to include in all log messages
 */
export function createChildLogger(meta: Record<string, any>) {
  return logger.child(meta);
}

/**
 * Create a request logger with correlation ID
 * @param correlationId - Unique ID to track requests across services
 */
export function createRequestLogger(correlationId: string) {
  return createChildLogger({ correlationId });
}

/**
 * Log an error with full context
 * @param error - Error object or message
 * @param context - Additional context about the error
 */
export function logError(error: Error | string, context?: Record<string, any>) {
  if (error instanceof Error) {
    logger.error(error.message, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...context,
    });
  } else {
    logger.error(error, context);
  }
}

/**
 * Log a security event (authentication, authorization failures, etc.)
 * @param event - Security event type
 * @param details - Event details
 */
export function logSecurityEvent(event: string, details: Record<string, any>) {
  logger.warn(`SECURITY: ${event}`, {
    securityEvent: true,
    eventType: event,
    ...details,
  });
}

/**
 * Log an API request
 * @param method - HTTP method
 * @param path - Request path
 * @param statusCode - Response status code
 * @param duration - Request duration in ms
 * @param context - Additional context (user, firm, etc.)
 */
export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  context?: Record<string, any>
) {
  logger.info('API Request', {
    http: {
      method,
      path,
      statusCode,
      duration,
    },
    ...context,
  });
}

/**
 * Log AWS service usage (for cost tracking)
 * @param service - AWS service name (Bedrock, S3, Lambda, etc.)
 * @param operation - Operation performed
 * @param details - Usage details (tokens, bytes, etc.)
 */
export function logAwsUsage(
  service: string,
  operation: string,
  details: Record<string, any>
) {
  logger.info('AWS Service Usage', {
    aws: {
      service,
      operation,
      ...details,
    },
  });
}

/**
 * Log database query performance
 * @param query - Query type or description
 * @param duration - Query duration in ms
 * @param context - Additional context (table, rows affected, etc.)
 */
export function logDatabaseQuery(
  query: string,
  duration: number,
  context?: Record<string, any>
) {
  const level = duration > 1000 ? 'warn' : 'debug';
  logger.log(level, 'Database Query', {
    database: {
      query,
      duration,
      slow: duration > 1000,
      ...context,
    },
  });
}

export default logger;
