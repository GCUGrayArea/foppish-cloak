/**
 * TemplateService Unit Tests
 *
 * Tests for template business logic and database operations
 */

// @ts-nocheck - Test file with extensive jest mocking

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Pool } from 'pg';
import { TemplateService } from '../../services/api/src/services/TemplateService';
import { CreateTemplateRequest, UpdateTemplateRequest } from '../../services/api/src/types/template';

// Mock pool for testing
class MockPool {
  query = jest.fn(async (_query: string, _values?: any[]) => {
    // Simulate database queries
    return { rows: [], rowCount: 0 };
  });

  connect = jest.fn(async () => ({
    query: this.query,
    release: jest.fn()
  }));
}

describe('TemplateService', () => {
  let service: TemplateService;
  let mockPool: any;

  beforeEach(() => {
    mockPool = new MockPool();
    service = new TemplateService(mockPool as unknown as Pool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listTemplates', () => {
    it('should return empty list when no templates exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.listTemplates('firm-123');

      expect(result.templates).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should apply isDefault filter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.listTemplates('firm-123', { isDefault: true });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('is_default = $2'),
        expect.arrayContaining([true])
      );
    });

    it('should apply search filter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.listTemplates('firm-123', { search: 'injury' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%injury%'])
      );
    });

    it('should apply pagination parameters', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '50' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.listTemplates('firm-123', { page: 2, limit: 20 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([20, 20]) // limit and offset
      );
    });
  });

  describe('createTemplate', () => {
    it('should throw error if template name already exists', async () => {
      const client: any = {
        query: jest.fn()
          // @ts-expect-error - mock return value
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          // @ts-expect-error - mock return value
          .mockResolvedValueOnce({ rows: [{ id: 'existing' }], rowCount: 1 }), // duplicate check
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(client);

      const data: CreateTemplateRequest = {
        name: 'Duplicate Template',
        content: 'Content with {{variable}}'
      };

      await expect(
        service.createTemplate('firm-123', 'user-123', data)
      ).rejects.toThrow('TEMPLATE_NAME_EXISTS');

      expect(client.query).toHaveBeenCalledWith(
        expect.stringContaining('ROLLBACK')
      );
    });

    it('should create template and initial version', async () => {
      const client = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce({ rows: [] }) // duplicate check
          .mockResolvedValueOnce({ // create template
            rows: [{
              id: 'template-123',
              firm_id: 'firm-123',
              name: 'New Template',
              description: null,
              is_default: false,
              created_by: 'user-123',
              created_at: new Date(),
              updated_at: new Date()
            }]
          })
          .mockResolvedValueOnce({ // create version
            rows: [{
              id: 'version-123',
              version_number: 1,
              content: 'Content with {{variable}}',
              variables: ['variable'],
              created_by: 'user-123',
              created_at: new Date()
            }]
          })
          .mockResolvedValueOnce(undefined) // update current_version_id
          .mockResolvedValueOnce(undefined), // COMMIT
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(client);

      // Mock getTemplateById for final return
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'template-123',
          firm_id: 'firm-123',
          name: 'New Template',
          description: null,
          is_default: false,
          created_at: new Date(),
          updated_at: new Date(),
          creator_id: 'user-123',
          creator_name: 'Test User',
          version_id: 'version-123',
          version_number: 1,
          content: 'Content with {{variable}}',
          variables: ['variable'],
          version_created_at: new Date(),
          version_creator_id: 'user-123',
          version_creator_name: 'Test User'
        }]
      }).mockResolvedValueOnce({ rows: [] }); // version history

      const data: CreateTemplateRequest = {
        name: 'New Template',
        content: 'Content with {{variable}}'
      };

      const result = await service.createTemplate('firm-123', 'user-123', data);

      expect(result.name).toBe('New Template');
      expect(result.currentVersion?.versionNumber).toBe(1);
    });
  });

  describe('updateTemplate', () => {
    it('should throw error if template not found', async () => {
      const client = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce({ rows: [] }), // template check
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(client);

      const data: UpdateTemplateRequest = { name: 'Updated Name' };

      await expect(
        service.updateTemplate('template-123', 'firm-123', 'user-123', data)
      ).rejects.toThrow('TEMPLATE_NOT_FOUND');
    });

    it('should create new version when content is updated', async () => {
      const client = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce({ // template check
            rows: [{ id: 'template-123', name: 'Template' }]
          })
          .mockResolvedValueOnce({ // get max version
            rows: [{ max_version: 2 }]
          })
          .mockResolvedValueOnce({ // create new version
            rows: [{ id: 'version-456' }]
          })
          .mockResolvedValueOnce(undefined) // update current_version_id
          .mockResolvedValueOnce(undefined), // COMMIT
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(client);

      // Mock getTemplateById
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'template-123',
          firm_id: 'firm-123',
          name: 'Template',
          description: null,
          is_default: false,
          created_at: new Date(),
          updated_at: new Date(),
          creator_id: 'user-123',
          creator_name: 'Test User',
          version_id: 'version-123',
          version_number: 3,
          content: 'Updated content with {{new_variable}}',
          variables: ['new_variable'],
          version_created_at: new Date(),
          version_creator_id: 'user-123',
          version_creator_name: 'Test User'
        }]
      }).mockResolvedValueOnce({ rows: [] }); // version history

      const data: UpdateTemplateRequest = {
        content: 'Updated content with {{new_variable}}'
      };

      await expect(
        service.updateTemplate('template-123', 'firm-123', 'user-123', data)
      ).resolves.toBeDefined();

      expect(client.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO template_versions'),
        expect.arrayContaining(['template-123', 3])
      );
    });

    it('should not create version when only metadata changes', async () => {
      const client = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce({ // template check
            rows: [{ id: 'template-123', name: 'Template' }]
          })
          .mockResolvedValueOnce(undefined) // update metadata
          .mockResolvedValueOnce(undefined), // COMMIT
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(client);

      // Mock getTemplateById
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'template-123',
          firm_id: 'firm-123',
          name: 'Updated Name',
          description: 'Updated description',
          is_default: false,
          created_at: new Date(),
          updated_at: new Date(),
          creator_id: 'user-123',
          creator_name: 'Test User',
          version_id: 'version-123',
          version_number: 1,
          content: 'Content',
          variables: [],
          version_created_at: new Date(),
          version_creator_id: 'user-123',
          version_creator_name: 'Test User'
        }]
      }).mockResolvedValueOnce({ rows: [] }); // version history

      const data: UpdateTemplateRequest = {
        name: 'Updated Name',
        description: 'Updated description'
      };

      await expect(
        service.updateTemplate('template-123', 'firm-123', 'user-123', data)
      ).resolves.toBeDefined();

      // Should not call INSERT INTO template_versions
      const calls = client.query.mock.calls;
      const hasVersionInsert = calls.some(call =>
        call[0]?.includes('INSERT INTO template_versions')
      );
      expect(hasVersionInsert).toBe(false);
    });
  });

  describe('rollbackToVersion', () => {
    it('should throw error if template not found', async () => {
      const client = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce({ rows: [] }), // template check
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(client);

      await expect(
        service.rollbackToVersion('template-123', 'firm-123', 'version-456')
      ).rejects.toThrow('TEMPLATE_NOT_FOUND');
    });

    it('should throw error if version not found', async () => {
      const client = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce({ // template check
            rows: [{ id: 'template-123' }]
          })
          .mockResolvedValueOnce({ rows: [] }), // version check
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(client);

      await expect(
        service.rollbackToVersion('template-123', 'firm-123', 'version-456')
      ).rejects.toThrow('VERSION_NOT_FOUND');
    });

    it('should update current_version_id on successful rollback', async () => {
      const client = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce({ // template check
            rows: [{ id: 'template-123' }]
          })
          .mockResolvedValueOnce({ // version check
            rows: [{ id: 'version-456' }]
          })
          .mockResolvedValueOnce(undefined) // update current_version_id
          .mockResolvedValueOnce(undefined), // COMMIT
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(client);

      // Mock getTemplateById
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'template-123',
          firm_id: 'firm-123',
          name: 'Template',
          description: null,
          is_default: false,
          created_at: new Date(),
          updated_at: new Date(),
          creator_id: 'user-123',
          creator_name: 'Test User',
          version_id: 'version-456',
          version_number: 2,
          content: 'Content',
          variables: [],
          version_created_at: new Date(),
          version_creator_id: 'user-123',
          version_creator_name: 'Test User'
        }]
      }).mockResolvedValueOnce({ rows: [] }); // version history

      await expect(
        service.rollbackToVersion('template-123', 'firm-123', 'version-456')
      ).resolves.toBeDefined();

      expect(client.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE templates SET current_version_id'),
        ['version-456', 'template-123']
      );
    });
  });

  describe('deleteTemplate', () => {
    it('should throw error if template not found', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 0 });

      await expect(
        service.deleteTemplate('template-123', 'firm-123')
      ).rejects.toThrow('TEMPLATE_NOT_FOUND');
    });

    it('should delete template successfully', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      await expect(
        service.deleteTemplate('template-123', 'firm-123')
      ).resolves.toBeUndefined();

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM templates WHERE id = $1 AND firm_id = $2',
        ['template-123', 'firm-123']
      );
    });
  });
});
