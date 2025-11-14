/**
 * Document Export Integration Tests
 */

import request from 'supertest';
import express from 'express';
import demandLettersRouter from '../../services/api/src/routes/demand-letters';
import { DemandLetterModel } from '../../services/api/src/db/models/DemandLetter';
import { FirmModel } from '../../services/api/src/db/models/Firm';
import { UserModel } from '../../services/api/src/db/models/User';

// Mock the database models
jest.mock('../../services/api/src/db/models/DemandLetter');
jest.mock('../../services/api/src/db/models/Firm');
jest.mock('../../services/api/src/db/models/User');

// Mock puppeteer to avoid launching actual browser in tests
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock pdf content')),
    }),
    close: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe('Document Export Integration Tests', () => {
  let app: express.Application;

  const mockLetter = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    firm_id: 'firm-123',
    created_by: 'user-123',
    title: 'Test Demand Letter',
    status: 'complete' as const,
    current_content: '<p>This is test letter content.</p>',
    extracted_data: {
      recipient: {
        name: 'John Doe',
        address: '123 Main St, City, State 12345',
      },
    },
    generation_metadata: {},
    created_at: new Date(),
  };

  const mockFirm = {
    id: 'firm-123',
    name: 'Test Law Firm',
    settings: {
      address: '456 Law St',
      phone: '555-9999',
      email: 'contact@testfirm.com',
    },
    created_at: new Date(),
  };

  const mockUser = {
    id: 'user-123',
    firm_id: 'firm-123',
    email: 'attorney@testfirm.com',
    password_hash: 'hash',
    role: 'attorney' as const,
    first_name: 'Jane',
    last_name: 'Attorney',
    is_active: true,
    created_at: new Date(),
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    app.use((req: any, res, next) => {
      req.firmId = 'firm-123';
      req.user = { id: 'user-123', email: 'test@example.com' };
      next();
    });

    app.use('/demand-letters', demandLettersRouter);

    jest.clearAllMocks();
  });

  describe('GET /demand-letters/:id/export/docx', () => {
    it('should export demand letter as DOCX', async () => {
      // Arrange
      (DemandLetterModel.findById as jest.Mock).mockResolvedValue(mockLetter);
      (FirmModel.findById as jest.Mock).mockResolvedValue(mockFirm);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .get(`/demand-letters/${mockLetter.id}/export/docx`)
        .expect(200);

      // Assert
      expect(response.headers['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      expect(response.headers['content-disposition']).toMatch(/^attachment; filename="/);
      expect(response.headers['content-disposition']).toMatch(/\.docx"$/);
      expect(response.headers['content-length']).toBeTruthy();
      expect(Buffer.isBuffer(response.body)).toBe(true);
    });

    it('should return 404 if letter not found', async () => {
      // Arrange
      (DemandLetterModel.findById as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await request(app)
        .get('/demand-letters/00000000-0000-0000-0000-000000000000/export/docx')
        .expect(404);

      // Assert
      expect(response.body.error).toBe('Not found');
    });

    it('should return 400 if letter has no content', async () => {
      // Arrange
      const letterNoContent = { ...mockLetter, current_content: '' };
      (DemandLetterModel.findById as jest.Mock).mockResolvedValue(letterNoContent);

      // Act
      const response = await request(app)
        .get(`/demand-letters/${mockLetter.id}/export/docx`)
        .expect(400);

      // Assert
      expect(response.body.error).toBe('Export not available');
    });

    it('should return 400 for invalid UUID', async () => {
      // Act
      const response = await request(app)
        .get('/demand-letters/invalid-id/export/docx')
        .expect(400);

      // Assert
      expect(response.body.error).toBe('Invalid letter ID');
    });
  });

  describe('GET /demand-letters/:id/export/pdf', () => {
    it('should export demand letter as PDF', async () => {
      // Arrange
      (DemandLetterModel.findById as jest.Mock).mockResolvedValue(mockLetter);
      (FirmModel.findById as jest.Mock).mockResolvedValue(mockFirm);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .get(`/demand-letters/${mockLetter.id}/export/pdf`)
        .expect(200);

      // Assert
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toMatch(/^attachment; filename="/);
      expect(response.headers['content-disposition']).toMatch(/\.pdf"$/);
      expect(response.headers['content-length']).toBeTruthy();
      expect(Buffer.isBuffer(response.body)).toBe(true);
    });

    it('should return 404 if letter not found', async () => {
      // Arrange
      (DemandLetterModel.findById as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await request(app)
        .get('/demand-letters/00000000-0000-0000-0000-000000000000/export/pdf')
        .expect(404);

      // Assert
      expect(response.body.error).toBe('Not found');
    });

    it('should return 400 for invalid UUID', async () => {
      // Act
      const response = await request(app)
        .get('/demand-letters/invalid-id/export/pdf')
        .expect(400);

      // Assert
      expect(response.body.error).toBe('Invalid letter ID');
    });
  });
});
