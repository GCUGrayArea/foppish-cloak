/**
 * AI Service Client Types
 *
 * Types for communicating with the Python AI Processor Lambda function.
 */

/**
 * Base AI service request
 */
export interface AIServiceRequest {
  firmId: string;
  userId?: string;
  correlationId?: string;
}

/**
 * Document analysis request to AI service
 */
export interface AIAnalyzeRequest extends AIServiceRequest {
  documentId: string;
  documentText: string;
  documentType?: string;
}

/**
 * Document analysis response from AI service
 */
export interface AIAnalyzeResponse {
  success: boolean;
  documentId: string;
  extractedData: Record<string, any>;
  processingTimeSeconds: number;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
  };
  modelId: string;
  extractionTimestamp: string;
  errorMessage?: string;
}

/**
 * Letter generation request to AI service
 */
export interface AIGenerateRequest extends AIServiceRequest {
  caseId: string;
  extractedData: Record<string, any>;
  templateVariables: Record<string, any>;
  tone?: string;
  customInstructions?: string;
}

/**
 * Letter generation response from AI service
 */
export interface AIGenerateResponse {
  success: boolean;
  letter?: {
    sections: Array<{
      type: string;
      title: string;
      content: string;
      order: number;
    }>;
    metadata: {
      templateId?: string;
      generatedAt: string;
      tone: string;
      wordCount: number;
    };
  };
  processingTimeSeconds: number;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
  };
  modelId: string;
  generationTimestamp: string;
  errorMessage?: string;
}

/**
 * Letter refinement request to AI service
 */
export interface AIRefineRequest extends AIServiceRequest {
  letterId: string;
  currentLetter: {
    sections: Array<{
      type: string;
      title: string;
      content: string;
      order: number;
    }>;
    metadata: Record<string, any>;
  };
  feedback: {
    instruction: string;
    sections?: string[];
    tone?: string;
  };
  conversationHistory?: {
    turns: Array<{
      role: string;
      content: string;
      timestamp: string;
    }>;
  };
}

/**
 * Letter refinement response from AI service
 */
export interface AIRefineResponse {
  success: boolean;
  refinedLetter?: {
    sections: Array<{
      type: string;
      title: string;
      content: string;
      order: number;
    }>;
    metadata: Record<string, any>;
  };
  changesSummary?: string;
  processingTimeSeconds: number;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
  };
  modelId: string;
  refinementTimestamp: string;
  conversationHistory?: {
    turns: Array<{
      role: string;
      content: string;
      timestamp: string;
    }>;
  };
  errorMessage?: string;
}

/**
 * AI service error response
 */
export interface AIServiceError {
  error: string;
  message: string;
  statusCode?: number;
  correlationId?: string;
}

/**
 * Lambda invocation options
 */
export interface LambdaInvocationOptions {
  functionName: string;
  invocationType?: 'RequestResponse' | 'Event';
  timeout?: number;
  correlationId?: string;
}
