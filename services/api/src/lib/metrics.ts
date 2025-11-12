import logger, { logAwsUsage } from './logger';

/**
 * Custom metrics helper for CloudWatch
 *
 * Provides utilities for tracking business and performance metrics:
 * - API endpoint performance (latency, throughput)
 * - Business metrics (documents processed, letters generated)
 * - AWS service usage (Bedrock tokens, S3 operations)
 * - Error rates
 * - Database connection pool usage
 *
 * In production, these metrics would be sent to CloudWatch Metrics.
 * For now, they are logged in a structured format that can be parsed and aggregated.
 */

export interface MetricData {
  metricName: string;
  value: number;
  unit: MetricUnit;
  dimensions?: Record<string, string>;
  timestamp?: Date;
}

export type MetricUnit =
  | 'Seconds'
  | 'Milliseconds'
  | 'Microseconds'
  | 'Bytes'
  | 'Kilobytes'
  | 'Megabytes'
  | 'Count'
  | 'Percent'
  | 'None';

class MetricsCollector {
  private namespace: string;

  constructor(namespace: string = 'DemandLetterGenerator') {
    this.namespace = namespace;
  }

  /**
   * Record a metric value
   * @param data - Metric data
   */
  recordMetric(data: MetricData) {
    const metric = {
      namespace: this.namespace,
      metricName: data.metricName,
      value: data.value,
      unit: data.unit,
      dimensions: data.dimensions || {},
      timestamp: data.timestamp || new Date(),
    };

    // Log metric in structured format
    // In production, this would be sent to CloudWatch Metrics API
    logger.debug('Metric recorded', { metric });
  }

  /**
   * Record API endpoint latency
   * @param endpoint - API endpoint path
   * @param method - HTTP method
   * @param duration - Request duration in milliseconds
   * @param statusCode - HTTP status code
   */
  recordApiLatency(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number
  ) {
    this.recordMetric({
      metricName: 'ApiLatency',
      value: duration,
      unit: 'Milliseconds',
      dimensions: {
        Endpoint: endpoint,
        Method: method,
        StatusCode: String(statusCode),
      },
    });
  }

  /**
   * Record database query duration
   * @param query - Query type or name
   * @param duration - Query duration in milliseconds
   */
  recordDatabaseQueryDuration(query: string, duration: number) {
    this.recordMetric({
      metricName: 'DatabaseQueryDuration',
      value: duration,
      unit: 'Milliseconds',
      dimensions: {
        Query: query,
      },
    });
  }

  /**
   * Record database connection pool usage
   * @param total - Total connections in pool
   * @param idle - Idle connections
   * @param waiting - Waiting connections
   */
  recordConnectionPoolUsage(total: number, idle: number, waiting: number) {
    this.recordMetric({
      metricName: 'DatabaseConnectionPoolTotal',
      value: total,
      unit: 'Count',
    });

    this.recordMetric({
      metricName: 'DatabaseConnectionPoolIdle',
      value: idle,
      unit: 'Count',
    });

    this.recordMetric({
      metricName: 'DatabaseConnectionPoolWaiting',
      value: waiting,
      unit: 'Count',
    });

    // Calculate usage percentage
    const usage = total > 0 ? ((total - idle) / total) * 100 : 0;
    this.recordMetric({
      metricName: 'DatabaseConnectionPoolUsagePercent',
      value: usage,
      unit: 'Percent',
    });
  }

  /**
   * Record AWS Bedrock token usage (for cost tracking)
   * @param model - Bedrock model ID
   * @param inputTokens - Number of input tokens
   * @param outputTokens - Number of output tokens
   * @param firmId - Firm ID for multi-tenant cost tracking
   */
  recordBedrockTokenUsage(
    model: string,
    inputTokens: number,
    outputTokens: number,
    firmId: string
  ) {
    // Log for cost analysis
    logAwsUsage('Bedrock', 'InvokeModel', {
      model,
      inputTokens,
      outputTokens,
      firmId,
    });

    // Record metrics
    this.recordMetric({
      metricName: 'BedrockInputTokens',
      value: inputTokens,
      unit: 'Count',
      dimensions: {
        Model: model,
        FirmId: firmId,
      },
    });

    this.recordMetric({
      metricName: 'BedrockOutputTokens',
      value: outputTokens,
      unit: 'Count',
      dimensions: {
        Model: model,
        FirmId: firmId,
      },
    });

    // Estimate cost (approximate pricing)
    // Claude 3.5 Sonnet: $3/MTok input, $15/MTok output
    const inputCost = (inputTokens / 1_000_000) * 3;
    const outputCost = (outputTokens / 1_000_000) * 15;
    const totalCost = inputCost + outputCost;

    this.recordMetric({
      metricName: 'BedrockCost',
      value: totalCost,
      unit: 'None', // USD
      dimensions: {
        Model: model,
        FirmId: firmId,
      },
    });
  }

  /**
   * Record S3 operation
   * @param operation - S3 operation type (PutObject, GetObject, etc.)
   * @param bytes - Bytes transferred
   */
  recordS3Operation(operation: string, bytes: number) {
    logAwsUsage('S3', operation, { bytes });

    this.recordMetric({
      metricName: 'S3Operations',
      value: 1,
      unit: 'Count',
      dimensions: {
        Operation: operation,
      },
    });

    this.recordMetric({
      metricName: 'S3DataTransfer',
      value: bytes,
      unit: 'Bytes',
      dimensions: {
        Operation: operation,
      },
    });
  }

  /**
   * Record document processing event
   * @param type - Document type (upload, analysis, generation)
   * @param duration - Processing duration in milliseconds
   * @param success - Whether processing succeeded
   */
  recordDocumentProcessing(type: string, duration: number, success: boolean) {
    this.recordMetric({
      metricName: 'DocumentProcessingDuration',
      value: duration,
      unit: 'Milliseconds',
      dimensions: {
        Type: type,
        Success: String(success),
      },
    });

    this.recordMetric({
      metricName: 'DocumentProcessingCount',
      value: 1,
      unit: 'Count',
      dimensions: {
        Type: type,
        Success: String(success),
      },
    });
  }

  /**
   * Record demand letter generation event
   * @param firmId - Firm ID
   * @param duration - Generation duration in milliseconds
   * @param success - Whether generation succeeded
   */
  recordLetterGeneration(firmId: string, duration: number, success: boolean) {
    this.recordMetric({
      metricName: 'LetterGenerationDuration',
      value: duration,
      unit: 'Milliseconds',
      dimensions: {
        FirmId: firmId,
        Success: String(success),
      },
    });

    this.recordMetric({
      metricName: 'LetterGenerationCount',
      value: 1,
      unit: 'Count',
      dimensions: {
        FirmId: firmId,
        Success: String(success),
      },
    });
  }

  /**
   * Record error occurrence
   * @param errorType - Error type or code
   * @param endpoint - API endpoint where error occurred
   */
  recordError(errorType: string, endpoint?: string) {
    this.recordMetric({
      metricName: 'ErrorCount',
      value: 1,
      unit: 'Count',
      dimensions: {
        ErrorType: errorType,
        Endpoint: endpoint || 'Unknown',
      },
    });
  }

  /**
   * Record user session event
   * @param event - Session event (login, logout, timeout)
   * @param firmId - Firm ID
   */
  recordUserSession(event: 'login' | 'logout' | 'timeout', firmId: string) {
    this.recordMetric({
      metricName: 'UserSessions',
      value: 1,
      unit: 'Count',
      dimensions: {
        Event: event,
        FirmId: firmId,
      },
    });
  }
}

// Export singleton instance
export const metrics = new MetricsCollector();

/**
 * Helper to time and record function execution
 * @param name - Operation name
 * @param fn - Function to execute and time
 */
export async function timeOperation<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    metrics.recordMetric({
      metricName: 'OperationDuration',
      value: duration,
      unit: 'Milliseconds',
      dimensions: {
        Operation: name,
        Success: 'true',
      },
    });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    metrics.recordMetric({
      metricName: 'OperationDuration',
      value: duration,
      unit: 'Milliseconds',
      dimensions: {
        Operation: name,
        Success: 'false',
      },
    });
    throw error;
  }
}
