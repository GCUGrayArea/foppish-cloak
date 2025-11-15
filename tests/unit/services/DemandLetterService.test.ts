/**
 * Demand Letter Service Unit Tests
 */

import { DemandLetterService } from '../../../services/api/src/services/DemandLetterService';
import { DemandLetterModel } from '../../../services/api/src/db/models/DemandLetter';

// Mock dependencies
jest.mock('../../../services/api/src/db/models/DemandLetter');
jest.mock('../../../services/api/src/services/DocumentService');
jest.mock('../../../services/api/src/services/AIServiceClient');
jest.mock('../../../services/api/src/db/connection');

describe('DemandLetterService', () => {
  let service: DemandLetterService;
  let mockDemandLetterModel: jest.Mocked<typeof DemandLetterModel>;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new DemandLetterService();

    mockDemandLetterModel = DemandLetterModel as jest.Mocked<typeof DemandLetterModel>;

    // Mock pool.query for enrichLetterDetails
    const mockPool = require('../../../services/api/src/db/connection').pool;
    mockPool.query = jest.fn().mockResolvedValue({ rows: [] });
  });

  describe('createDemandLetter', () => {
    it('should create a new demand letter', async () => {
      const mockLetter = {
        id: 'letter-123',
        firm_id: 'firm-123',
        created_by: 'user-123',
        title: 'Test Letter',
        status: 'draft' as const,
        extracted_data: {},
        generation_metadata: {},
        created_at: new Date(),
      };

      mockDemandLetterModel.create.mockResolvedValue(mockLetter);
      mockDemandLetterModel.findById.mockResolvedValue(mockLetter);

      const result = await service.createDemandLetter(
        {
          title: 'Test Letter',
        },
        'firm-123',
        'user-123'
      );

      expect(result).toBeDefined();
      expect(mockDemandLetterModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Letter',
          firm_id: 'firm-123',
          created_by: 'user-123',
        })
      );
    });

    it('should associate documents if provided', async () => {
      const mockLetter = {
        id: 'letter-123',
        firm_id: 'firm-123',
        created_by: 'user-123',
        title: 'Test Letter',
        status: 'draft' as const,
        extracted_data: {},
        generation_metadata: {},
        created_at: new Date(),
      };

      mockDemandLetterModel.create.mockResolvedValue(mockLetter);
      mockDemandLetterModel.findById.mockResolvedValue(mockLetter);

      // Mock DocumentService
      const DocumentService = require('../../../services/api/src/services/DocumentService').DocumentService;
      const mockGetDocumentById = jest.fn().mockResolvedValue({
        id: 'doc-1',
        filename: 'test.pdf',
        fileType: 'application/pdf',
      });
      DocumentService.mockImplementation(() => ({
        getDocumentById: mockGetDocumentById,
      }));

      // Mock pool.query for document association
      const mockPool = require('../../../services/api/src/db/connection').pool;
      mockPool.query.mockResolvedValue({ rows: [] });

      // Create new service instance with mocked DocumentService
      const testService = new DemandLetterService();

      await testService.createDemandLetter(
        {
          title: 'Test Letter',
          documentIds: ['doc-1', 'doc-2'],
        },
        'firm-123',
        'user-123'
      );

      expect(mockGetDocumentById).toHaveBeenCalled();
    });
  });

  describe('getDemandLetterById', () => {
    it('should retrieve a demand letter by ID', async () => {
      const mockLetter = {
        id: 'letter-123',
        firm_id: 'firm-123',
        created_by: 'user-123',
        title: 'Test Letter',
        status: 'draft' as const,
        extracted_data: {},
        generation_metadata: { workflowState: 'draft' },
        created_at: new Date(),
      };

      mockDemandLetterModel.findById.mockResolvedValue(mockLetter);

      const result = await service.getDemandLetterById('letter-123', 'firm-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('letter-123');
    });

    it('should throw error if letter not found', async () => {
      mockDemandLetterModel.findById.mockResolvedValue(null);

      await expect(
        service.getDemandLetterById('nonexistent', 'firm-123')
      ).rejects.toThrow('Demand letter not found');
    });
  });

  describe('listDemandLetters', () => {
    it('should list demand letters for a firm', async () => {
      const mockLetters = [
        {
          id: 'letter-1',
          firm_id: 'firm-123',
          created_by: 'user-123',
          title: 'Letter 1',
          status: 'draft' as const,
          extracted_data: {},
          generation_metadata: {},
          created_at: new Date(),
        },
      ];

      mockDemandLetterModel.listByFirm.mockResolvedValue({
        letters: mockLetters,
        total: 1,
      });

      const result = await service.listDemandLetters('firm-123', {
        limit: 50,
        offset: 0,
      });

      expect(result.letters).toBeDefined();
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockDemandLetterModel.listByFirm.mockResolvedValue({
        letters: [],
        total: 0,
      });

      await service.listDemandLetters('firm-123', {
        status: 'complete',
      });

      expect(mockDemandLetterModel.listByFirm).toHaveBeenCalledWith(
        'firm-123',
        expect.objectContaining({ status: 'complete' })
      );
    });
  });

  describe('getWorkflowStatus', () => {
    it('should return workflow status for a letter', async () => {
      const mockLetter = {
        id: 'letter-123',
        firm_id: 'firm-123',
        created_by: 'user-123',
        title: 'Test Letter',
        status: 'draft' as const,
        extracted_data: {},
        generation_metadata: { workflowState: 'draft', refinementCount: 0 },
        created_at: new Date(),
      };

      mockDemandLetterModel.findById.mockResolvedValue(mockLetter);

      // Mock pool.query for document count
      const mockPool = require('../../../services/api/src/db/connection').pool;
      mockPool.query.mockResolvedValue({ rows: [{ count: '2' }] });

      const status = await service.getWorkflowStatus('letter-123', 'firm-123');

      expect(status.letterId).toBe('letter-123');
      expect(status.state).toBe('draft');
      expect(status.progress).toBeDefined();
    });
  });
});

/**
 * Note: This is a skeleton test file for unit tests.
 * In production, you would:
 *
 * 1. Mock all database calls properly
 * 2. Mock AI service client responses
 * 3. Test all service methods comprehensively
 * 4. Test error handling paths
 * 5. Test workflow state transitions
 * 6. Test data merging and transformation logic
 * 7. Verify proper cleanup and resource management
 *
 * The actual tests would be 300-400 lines covering:
 * - analyzeDemandLetter with mocked AI responses
 * - generateDemandLetter with various templates
 * - refineDemandLetter with conversation history
 * - Error scenarios and rollbacks
 * - Edge cases (empty data, invalid states, etc.)
 */
