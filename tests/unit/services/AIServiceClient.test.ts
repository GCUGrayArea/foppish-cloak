/**
 * AI Service Client Tests
 */

import { AIServiceClient } from '../../../services/api/src/services/AIServiceClient';
import { LambdaClientWrapper } from '../../../services/api/src/utils/lambdaClient';

// Mock Lambda client
jest.mock('../../../services/api/src/utils/lambdaClient');

describe('AIServiceClient', () => {
  let aiService: AIServiceClient;
  let mockLambdaClient: jest.Mocked<LambdaClientWrapper>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mocked Lambda client
    mockLambdaClient = {
      invoke: jest.fn(),
      destroy: jest.fn(),
    } as any;

    // Mock the constructor to return our mocked client
    (LambdaClientWrapper as jest.Mock).mockImplementation(() => mockLambdaClient);

    aiService = new AIServiceClient();
  });

  afterEach(() => {
    aiService.destroy();
  });

  describe('analyzeDocument', () => {
    it('should successfully analyze a document', async () => {
      const mockResponse = {
        success: true,
        documentId: 'doc-123',
        extractedData: {
          parties: [{ type: 'plaintiff', name: 'John Doe' }],
          incident: { date: '2024-01-01', location: 'Test Location' },
        },
        processingTimeSeconds: 5.2,
        tokenUsage: { inputTokens: 1000, outputTokens: 500 },
        modelId: 'claude-3',
        extractionTimestamp: '2024-01-01T00:00:00Z',
      };

      mockLambdaClient.invoke.mockResolvedValue({
        success: true,
        data: mockResponse,
        correlationId: 'test-corr-id',
      });

      const result = await aiService.analyzeDocument({
        documentId: 'doc-123',
        documentText: 'Sample document text',
        firmId: 'firm-123',
      });

      expect(result).toEqual(mockResponse);
      expect(mockLambdaClient.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'doc-123',
          documentText: 'Sample document text',
          firmId: 'firm-123',
        }),
        expect.objectContaining({
          functionName: expect.any(String),
          invocationType: 'RequestResponse',
        })
      );
    });

    it('should throw error when analysis fails', async () => {
      mockLambdaClient.invoke.mockResolvedValue({
        success: false,
        error: 'Analysis failed',
        correlationId: 'test-corr-id',
      });

      await expect(
        aiService.analyzeDocument({
          documentId: 'doc-123',
          documentText: 'Sample document text',
          firmId: 'firm-123',
        })
      ).rejects.toThrow('Analysis failed');
    });
  });

  describe('generateLetter', () => {
    it('should successfully generate a letter', async () => {
      const mockResponse = {
        success: true,
        letter: {
          sections: [
            {
              type: 'intro',
              title: 'Introduction',
              content: 'This letter serves...',
              order: 1,
            },
          ],
          metadata: {
            generatedAt: '2024-01-01T00:00:00Z',
            tone: 'formal',
            wordCount: 500,
          },
        },
        processingTimeSeconds: 8.5,
        tokenUsage: { inputTokens: 2000, outputTokens: 1000 },
        modelId: 'claude-3',
        generationTimestamp: '2024-01-01T00:00:00Z',
      };

      mockLambdaClient.invoke.mockResolvedValue({
        success: true,
        data: mockResponse,
        correlationId: 'test-corr-id',
      });

      const result = await aiService.generateLetter({
        caseId: 'case-123',
        extractedData: { parties: [] },
        templateVariables: {},
        firmId: 'firm-123',
      });

      expect(result).toEqual(mockResponse);
      expect(mockLambdaClient.invoke).toHaveBeenCalled();
    });

    it('should throw error when generation fails', async () => {
      mockLambdaClient.invoke.mockResolvedValue({
        success: false,
        error: 'Generation failed',
        correlationId: 'test-corr-id',
      });

      await expect(
        aiService.generateLetter({
          caseId: 'case-123',
          extractedData: {},
          templateVariables: {},
          firmId: 'firm-123',
        })
      ).rejects.toThrow('Generation failed');
    });
  });

  describe('refineLetter', () => {
    it('should successfully refine a letter', async () => {
      const mockResponse = {
        success: true,
        refinedLetter: {
          sections: [
            {
              type: 'intro',
              title: 'Introduction',
              content: 'Refined content...',
              order: 1,
            },
          ],
          metadata: {},
        },
        changesSummary: 'Made content more assertive',
        processingTimeSeconds: 6.0,
        tokenUsage: { inputTokens: 1500, outputTokens: 800 },
        modelId: 'claude-3',
        refinementTimestamp: '2024-01-01T00:00:00Z',
      };

      mockLambdaClient.invoke.mockResolvedValue({
        success: true,
        data: mockResponse,
        correlationId: 'test-corr-id',
      });

      const result = await aiService.refineLetter({
        letterId: 'letter-123',
        currentLetter: {
          sections: [],
          metadata: {},
        },
        feedback: {
          instruction: 'Make it more assertive',
        },
        firmId: 'firm-123',
      });

      expect(result).toEqual(mockResponse);
      expect(mockLambdaClient.invoke).toHaveBeenCalled();
    });

    it('should throw error when refinement fails', async () => {
      mockLambdaClient.invoke.mockResolvedValue({
        success: false,
        error: 'Refinement failed',
        correlationId: 'test-corr-id',
      });

      await expect(
        aiService.refineLetter({
          letterId: 'letter-123',
          currentLetter: { sections: [], metadata: {} },
          feedback: { instruction: 'Test' },
          firmId: 'firm-123',
        })
      ).rejects.toThrow('Refinement failed');
    });
  });

  describe('checkHealth', () => {
    it('should return healthy status when service is operational', async () => {
      mockLambdaClient.invoke.mockResolvedValue({
        success: true,
        data: {},
        correlationId: 'test-corr-id',
      });

      const health = await aiService.checkHealth();

      expect(health.status).toBe('healthy');
      expect(health.message).toContain('operational');
    });

    it('should return degraded status on failure', async () => {
      mockLambdaClient.invoke.mockResolvedValue({
        success: false,
        error: 'Service unavailable',
        correlationId: 'test-corr-id',
      });

      const health = await aiService.checkHealth();

      expect(health.status).toBe('degraded');
    });

    it('should return unhealthy status on exception', async () => {
      mockLambdaClient.invoke.mockRejectedValue(new Error('Network error'));

      const health = await aiService.checkHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.message).toContain('Network error');
    });
  });
});
