import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import logger from '../lib/logger';

/**
 * AWS CloudWatch configuration
 *
 * Provides configuration for CloudWatch Logs and Metrics
 * In Lambda environments, logs are automatically captured
 * For EC2/containers, Winston CloudWatch transport can be used
 */

export interface CloudWatchConfig {
  region: string;
  logGroupName: string;
  logStreamName: string;
  enabled: boolean;
}

/**
 * Get CloudWatch configuration from environment
 */
export function getCloudWatchConfig(): CloudWatchConfig {
  return {
    region: process.env.AWS_REGION || 'us-east-1',
    logGroupName:
      process.env.AWS_CLOUDWATCH_GROUP_NAME || '/aws/demand-letter/api',
    logStreamName:
      process.env.AWS_CLOUDWATCH_STREAM_NAME ||
      `api-${process.env.NODE_ENV || 'development'}-${Date.now()}`,
    enabled: !!process.env.AWS_CLOUDWATCH_GROUP_NAME,
  };
}

/**
 * Create CloudWatch Logs client
 */
export function createCloudWatchLogsClient(): CloudWatchLogsClient {
  const config = getCloudWatchConfig();

  const client = new CloudWatchLogsClient({
    region: config.region,
  });

  logger.info('CloudWatch Logs client created', {
    region: config.region,
    logGroupName: config.logGroupName,
  });

  return client;
}

/**
 * Create CloudWatch Metrics client
 */
export function createCloudWatchMetricsClient(): CloudWatchClient {
  const config = getCloudWatchConfig();

  const client = new CloudWatchClient({
    region: config.region,
  });

  logger.info('CloudWatch Metrics client created', {
    region: config.region,
  });

  return client;
}

/**
 * CloudWatch metric namespace
 */
export const CLOUDWATCH_NAMESPACE = 'DemandLetterGenerator';

/**
 * Common metric dimensions
 */
export interface MetricDimensions {
  Service: string;
  Environment: string;
  [key: string]: string;
}

/**
 * Get default metric dimensions
 */
export function getDefaultDimensions(): MetricDimensions {
  return {
    Service: 'api',
    Environment: process.env.NODE_ENV || 'development',
  };
}

/**
 * Initialize CloudWatch integration
 * Sets up CloudWatch transport for Winston if configured
 */
export function initCloudWatch() {
  const config = getCloudWatchConfig();

  if (!config.enabled) {
    logger.info('CloudWatch logging is disabled (no log group configured)');
    logger.info(
      'Logs will only be written to console. For CloudWatch integration, set AWS_CLOUDWATCH_GROUP_NAME'
    );
    return;
  }

  // Note: winston-cloudwatch transport can be added here when needed
  // For Lambda, CloudWatch automatically captures console logs
  // For EC2/ECS, we would add the transport like this:
  //
  // import WinstonCloudWatch from 'winston-cloudwatch';
  // logger.add(new WinstonCloudWatch({
  //   logGroupName: config.logGroupName,
  //   logStreamName: config.logStreamName,
  //   awsRegion: config.region,
  //   jsonMessage: true,
  // }));

  logger.info('CloudWatch integration initialized', {
    logGroupName: config.logGroupName,
    logStreamName: config.logStreamName,
    region: config.region,
  });
}

/**
 * Helper to structure log data for CloudWatch Insights queries
 * Ensures consistent field names across all logs
 */
export function structureLogForCloudWatch(data: Record<string, any>) {
  return {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    service: 'api',
    ...data,
  };
}

/**
 * Create custom metric data for CloudWatch
 */
export interface CustomMetric {
  metricName: string;
  value: number;
  unit: string;
  dimensions?: Record<string, string>;
}

/**
 * Batch send custom metrics to CloudWatch
 * Note: This is a simplified version. In production, use a metrics library
 * or AWS SDK's PutMetricData with proper batching and error handling
 */
export async function sendCustomMetrics(metrics: CustomMetric[]) {
  const config = getCloudWatchConfig();

  if (!config.enabled) {
    logger.debug('Custom metrics would be sent to CloudWatch', { metrics });
    return;
  }

  // In production, implement actual CloudWatch PutMetricData call
  // For now, log metrics in structured format
  logger.info('Custom metrics recorded', {
    namespace: CLOUDWATCH_NAMESPACE,
    metrics: metrics.map((m) => ({
      name: m.metricName,
      value: m.value,
      unit: m.unit,
      dimensions: {
        ...getDefaultDimensions(),
        ...m.dimensions,
      },
    })),
  });
}

/**
 * Lambda-specific: Check if running in Lambda environment
 */
export function isLambdaEnvironment(): boolean {
  return !!(
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.AWS_EXECUTION_ENV?.startsWith('AWS_Lambda')
  );
}

/**
 * Get Lambda context information for logging
 */
export function getLambdaContext() {
  if (!isLambdaEnvironment()) {
    return null;
  }

  return {
    functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
    functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
    memoryLimit: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
    logGroupName: process.env.AWS_LAMBDA_LOG_GROUP_NAME,
    logStreamName: process.env.AWS_LAMBDA_LOG_STREAM_NAME,
  };
}
