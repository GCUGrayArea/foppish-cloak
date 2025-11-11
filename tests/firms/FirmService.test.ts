/**
 * FirmService Unit Tests
 */

import { FirmService } from '../../services/api/src/services/FirmService';
import { Pool } from 'pg';

// Mock pool
const mockPool = {
  query: jest.fn()
} as unknown as Pool;

describe('FirmService', () => {
  let firmService: FirmService;

  beforeEach(() => {
    firmService = new FirmService(mockPool);
    jest.clearAllMocks();
  });

  describe('getFirmById', () => {
    it('should return firm data when firm exists', async () => {
      const mockFirm = {
        id: 'firm-123',
        name: 'Test Law Firm',
        settings: { logoUrl: 'https://example.com/logo.png' },
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-15')
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockFirm]
      });

      const result = await firmService.getFirmById('firm-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['firm-123']
      );
      expect(result).toEqual({
        id: 'firm-123',
        name: 'Test Law Firm',
        settings: { logoUrl: 'https://example.com/logo.png' },
        createdAt: mockFirm.created_at,
        updatedAt: mockFirm.updated_at
      });
    });

    it('should throw error when firm not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(firmService.getFirmById('nonexistent'))
        .rejects
        .toThrow('FIRM_NOT_FOUND');
    });
  });

  describe('updateFirm', () => {
    it('should update firm name', async () => {
      const existingFirm = {
        id: 'firm-123',
        name: 'Old Name',
        settings: {},
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-15')
      };

      const updatedFirm = {
        ...existingFirm,
        name: 'New Name',
        updated_at: new Date('2024-02-01')
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [updatedFirm]
      });

      const result = await firmService.updateFirm('firm-123', { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });

    it('should merge settings updates', async () => {
      const existingFirm = {
        id: 'firm-123',
        name: 'Test Firm',
        settings: { logoUrl: 'https://example.com/logo.png', color: 'blue' },
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-15')
      };

      // Mock getFirmById call first
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [existingFirm] })
        .mockResolvedValueOnce({
          rows: [{
            ...existingFirm,
            settings: { logoUrl: 'https://example.com/logo.png', color: 'blue', theme: 'dark' }
          }]
        });

      const result = await firmService.updateFirm('firm-123', {
        settings: { theme: 'dark' }
      });

      expect(result.settings).toEqual({
        logoUrl: 'https://example.com/logo.png',
        color: 'blue',
        theme: 'dark'
      });
    });
  });

  describe('getFirmSettings', () => {
    it('should return firm settings', async () => {
      const mockFirm = {
        id: 'firm-123',
        name: 'Test Firm',
        settings: { logoUrl: 'https://example.com/logo.png' },
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockFirm] });

      const result = await firmService.getFirmSettings('firm-123');

      expect(result).toEqual({ logoUrl: 'https://example.com/logo.png' });
    });
  });

  describe('toResponse', () => {
    it('should format firm data for API response', () => {
      const firm = {
        id: 'firm-123',
        name: 'Test Firm',
        settings: { logoUrl: 'test.png' },
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-15T10:30:00.000Z')
      };

      const response = firmService.toResponse(firm);

      expect(response).toEqual({
        id: 'firm-123',
        name: 'Test Firm',
        settings: { logoUrl: 'test.png' },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z'
      });
    });
  });
});
