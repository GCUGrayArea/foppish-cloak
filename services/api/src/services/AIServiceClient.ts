/**
 * AI Service Client
 *
 * Client for invoking the Python AI Processor Lambda function.
 * Handles document analysis, letter generation, and refinement.
 */

import { LambdaClientWrapper } from '../utils/lambdaClient';
import type {
  AIAnalyzeRequest,
  AIAnalyzeResponse,
  AIGenerateRequest,
  AIGenerateResponse,
  AIRefineRequest,
  AIRefineResponse,
} from '../types/ai-service';

/**
 * AI Service Client
 */
export class AIServiceClient {
  private lambdaClient: LambdaClientWrapper;
  private analyzeFunction: string;
  private generateFunction: string;
  private refineFunction: string;

  constructor() {
    this.lambdaClient = new LambdaClientWrapper(
      process.env.AWS_REGION || 'us-east-1'
    );

    // Use single Lambda function with different paths
    const baseFunctionName =
      process.env.LAMBDA_AI_FUNCTION_NAME || 'demand-letters-dev-ai-processor';

    this.analyzeFunction = baseFunctionName;
    this.generateFunction = baseFunctionName;
    this.refineFunction = baseFunctionName;
  }

  /**
   * Analyze document and extract structured data
   */
  async analyzeDocument(
    request: Omit<AIAnalyzeRequest, 'correlationId'>
  ): Promise<AIAnalyzeResponse> {
    const result = await this.lambdaClient.invoke<
      AIAnalyzeRequest,
      AIAnalyzeResponse
    >(request as AIAnalyzeRequest, {
      functionName: this.analyzeFunction,
      invocationType: 'RequestResponse',
      correlationId: this.generateCorrelationId('analyze'),
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Document analysis failed');
    }

    return result.data;
  }

  /**
   * Generate demand letter draft
   */
  async generateLetter(
    request: Omit<AIGenerateRequest, 'correlationId'>
  ): Promise<AIGenerateResponse> {
    const result = await this.lambdaClient.invoke<
      AIGenerateRequest,
      AIGenerateResponse
    >(request as AIGenerateRequest, {
      functionName: this.generateFunction,
      invocationType: 'RequestResponse',
      correlationId: this.generateCorrelationId('generate'),
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Letter generation failed');
    }

    return result.data;
  }

  /**
   * Refine existing letter based on feedback
   */
  async refineLetter(
    request: Omit<AIRefineRequest, 'correlationId'>
  ): Promise<AIRefineResponse> {
    const result = await this.lambdaClient.invoke<AIRefineRequest, AIRefineResponse>(
      request as AIRefineRequest,
      {
        functionName: this.refineFunction,
        invocationType: 'RequestResponse',
        correlationId: this.generateCorrelationId('refine'),
      }
    );

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Letter refinement failed');
    }

    return result.data;
  }

  /**
   * Check AI service health
   */
  async checkHealth(): Promise<{ status: string; message: string }> {
    try {
      const result = await this.lambdaClient.invoke<any, any>(
        {},
        {
          functionName: this.analyzeFunction,
          invocationType: 'RequestResponse',
        }
      );

      return {
        status: result.success ? 'healthy' : 'degraded',
        message: result.success
          ? 'AI service is operational'
          : result.error || 'AI service check failed',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  /**
   * Generate correlation ID for tracing
   */
  private generateCorrelationId(operation: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${operation}-${timestamp}-${random}`;
  }

  /**
   * Close Lambda client
   */
  destroy(): void {
    this.lambdaClient.destroy();
  }
}
