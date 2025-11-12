import logger, {
  createChildLogger,
  createRequestLogger,
  logError,
  logSecurityEvent,
  logApiRequest,
  logAwsUsage,
  logDatabaseQuery,
} from '../../services/api/src/lib/logger';

/**
 * Tests for logger utility
 *
 * Note: These tests verify the logger API and behavior.
 * They don't test actual log output since that would be brittle.
 */

describe('Logger', () => {
  beforeEach(() => {
    // Clear any existing handlers/state if needed
  });

  describe('createChildLogger', () => {
    it('should create a child logger with additional context', () => {
      const childLogger = createChildLogger({ userId: '123', firmId: '456' });
      expect(childLogger).toBeDefined();
      // Child logger should have the same methods as parent
      expect(typeof childLogger.info).toBe('function');
      expect(typeof childLogger.error).toBe('function');
      expect(typeof childLogger.warn).toBe('function');
      expect(typeof childLogger.debug).toBe('function');
    });
  });

  describe('createRequestLogger', () => {
    it('should create a request logger with correlation ID', () => {
      const correlationId = 'test-correlation-id';
      const requestLogger = createRequestLogger(correlationId);
      expect(requestLogger).toBeDefined();
      expect(typeof requestLogger.info).toBe('function');
    });
  });

  describe('logError', () => {
    it('should log Error object with context', () => {
      const error = new Error('Test error');
      const context = { userId: '123', endpoint: '/api/test' };

      // Should not throw
      expect(() => logError(error, context)).not.toThrow();
    });

    it('should log string error message', () => {
      const errorMessage = 'Something went wrong';
      const context = { endpoint: '/api/test' };

      // Should not throw
      expect(() => logError(errorMessage, context)).not.toThrow();
    });

    it('should handle error without context', () => {
      const error = new Error('Test error without context');

      // Should not throw
      expect(() => logError(error)).not.toThrow();
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security event with details', () => {
      const event = 'AuthenticationFailure';
      const details = {
        userId: '123',
        ip: '192.168.1.1',
        endpoint: '/api/login',
      };

      // Should not throw
      expect(() => logSecurityEvent(event, details)).not.toThrow();
    });

    it('should handle empty details', () => {
      const event = 'UnauthorizedAccess';

      // Should not throw
      expect(() => logSecurityEvent(event, {})).not.toThrow();
    });
  });

  describe('logApiRequest', () => {
    it('should log API request with all parameters', () => {
      const method = 'POST';
      const path = '/api/documents';
      const statusCode = 201;
      const duration = 150;
      const context = {
        userId: '123',
        firmId: '456',
        correlationId: 'test-id',
      };

      // Should not throw
      expect(() => logApiRequest(method, path, statusCode, duration, context)).not.toThrow();
    });

    it('should handle request without context', () => {
      const method = 'GET';
      const path = '/api/users';
      const statusCode = 200;
      const duration = 50;

      // Should not throw
      expect(() => logApiRequest(method, path, statusCode, duration)).not.toThrow();
    });
  });

  describe('logAwsUsage', () => {
    it('should log AWS service usage', () => {
      const service = 'Bedrock';
      const operation = 'InvokeModel';
      const details = {
        model: 'claude-3-5-sonnet',
        inputTokens: 1000,
        outputTokens: 500,
        cost: 0.025,
      };

      // Should not throw
      expect(() => logAwsUsage(service, operation, details)).not.toThrow();
    });

    it('should handle S3 operations', () => {
      const service = 'S3';
      const operation = 'PutObject';
      const details = {
        bucket: 'demand-letters',
        key: 'document.pdf',
        size: 1024000,
      };

      // Should not throw
      expect(() => logAwsUsage(service, operation, details)).not.toThrow();
    });
  });

  describe('logDatabaseQuery', () => {
    it('should log database query with normal duration', () => {
      const query = 'SELECT * FROM users WHERE id = $1';
      const duration = 50;
      const context = {
        table: 'users',
        rowsAffected: 1,
      };

      // Should not throw
      expect(() => logDatabaseQuery(query, duration, context)).not.toThrow();
    });

    it('should log slow database query with warning level', () => {
      const query = 'SELECT * FROM documents WHERE firm_id = $1';
      const duration = 1500; // > 1000ms should be logged as warning
      const context = {
        table: 'documents',
        rowsAffected: 1000,
      };

      // Should not throw
      expect(() => logDatabaseQuery(query, duration, context)).not.toThrow();
    });

    it('should handle query without context', () => {
      const query = 'BEGIN TRANSACTION';
      const duration = 5;

      // Should not throw
      expect(() => logDatabaseQuery(query, duration)).not.toThrow();
    });
  });

  describe('logger instance', () => {
    it('should have standard logging methods', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should log info message', () => {
      // Should not throw
      expect(() => logger.info('Test info message')).not.toThrow();
    });

    it('should log error message', () => {
      // Should not throw
      expect(() => logger.error('Test error message')).not.toThrow();
    });

    it('should log warn message', () => {
      // Should not throw
      expect(() => logger.warn('Test warning message')).not.toThrow();
    });

    it('should log debug message', () => {
      // Should not throw
      expect(() => logger.debug('Test debug message')).not.toThrow();
    });
  });
});
