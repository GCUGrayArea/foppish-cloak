/**
 * AWS Lambda Client Utility
 *
 * Generic utility for invoking AWS Lambda functions.
 */

import { LambdaClient, InvokeCommand, InvokeCommandInput } from '@aws-sdk/client-lambda';
import { v4 as uuidv4 } from 'uuid';

/**
 * Lambda invocation options
 */
export interface LambdaInvocationOptions {
  functionName: string;
  invocationType?: 'RequestResponse' | 'Event';
  timeout?: number;
  correlationId?: string;
}

/**
 * Lambda invocation result
 */
export interface LambdaInvocationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  correlationId: string;
}

/**
 * AWS Lambda client wrapper
 */
export class LambdaClientWrapper {
  private client: LambdaClient;
  private region: string;

  constructor(region: string = process.env.AWS_REGION || 'us-east-1') {
    this.region = region;
    this.client = new LambdaClient({ region: this.region });
  }

  /**
   * Invoke Lambda function
   */
  async invoke<TRequest = any, TResponse = any>(
    payload: TRequest,
    options: LambdaInvocationOptions
  ): Promise<LambdaInvocationResult<TResponse>> {
    const correlationId = options.correlationId || uuidv4();

    try {
      const command = this.createInvokeCommand(payload, options, correlationId);

      const response = await this.client.send(command);

      return this.parseResponse<TResponse>(response, correlationId);
    } catch (error) {
      console.error('Lambda invocation error:', {
        functionName: options.functionName,
        correlationId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Lambda invocation error',
        correlationId,
      };
    }
  }

  /**
   * Create Lambda invoke command
   */
  private createInvokeCommand<T>(
    payload: T,
    options: LambdaInvocationOptions,
    correlationId: string
  ): InvokeCommand {
    // Wrap payload in API Gateway proxy format
    const event = {
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
      },
      httpMethod: 'POST',
      path: this.getPathFromFunctionName(options.functionName),
    };

    const input: InvokeCommandInput = {
      FunctionName: options.functionName,
      InvocationType: options.invocationType || 'RequestResponse',
      Payload: Buffer.from(JSON.stringify(event)),
    };

    return new InvokeCommand(input);
  }

  /**
   * Parse Lambda response
   */
  private parseResponse<T>(
    response: any,
    correlationId: string
  ): LambdaInvocationResult<T> {
    // Check for Lambda execution errors
    if (response.FunctionError) {
      const errorPayload = response.Payload
        ? JSON.parse(Buffer.from(response.Payload).toString())
        : {};

      return {
        success: false,
        error: errorPayload.errorMessage || 'Lambda function error',
        correlationId,
      };
    }

    // Parse successful response
    if (!response.Payload) {
      return {
        success: false,
        error: 'Empty Lambda response',
        correlationId,
      };
    }

    try {
      const payload = JSON.parse(Buffer.from(response.Payload).toString());

      // Handle API Gateway proxy response format
      if (payload.statusCode) {
        const statusCode = payload.statusCode;
        const body = payload.body ? JSON.parse(payload.body) : {};

        if (statusCode >= 200 && statusCode < 300) {
          return {
            success: true,
            data: body,
            statusCode,
            correlationId: payload.headers?.['X-Correlation-ID'] || correlationId,
          };
        } else {
          return {
            success: false,
            error: body.error || body.message || 'Lambda request failed',
            statusCode,
            correlationId: payload.headers?.['X-Correlation-ID'] || correlationId,
          };
        }
      }

      // Direct Lambda response (not API Gateway)
      return {
        success: true,
        data: payload,
        correlationId,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse Lambda response',
        correlationId,
      };
    }
  }

  /**
   * Extract path from function name for API Gateway proxy format
   */
  private getPathFromFunctionName(functionName: string): string {
    // Extract operation from function name
    // e.g., "demand-letters-dev-ai-processor" -> "/ai-processor"
    const parts = functionName.split('-');
    const lastPart = parts[parts.length - 1];

    // Map function names to paths
    const pathMap: Record<string, string> = {
      'ai-processor': '/analyze',
      analyze: '/analyze',
      generate: '/generate',
      refine: '/refine',
    };

    return pathMap[lastPart] || `/${lastPart}`;
  }

  /**
   * Close the client connection
   */
  destroy(): void {
    this.client.destroy();
  }
}
