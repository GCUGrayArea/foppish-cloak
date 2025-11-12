/**
 * ExportService Unit Tests
 */

import { ExportService } from '../../../services/api/src/services/ExportService';
import { DemandLetterModel } from '../../../services/api/src/db/models/DemandLetter';
import { FirmModel } from '../../../services/api/src/db/models/Firm';
import { UserModel } from '../../../services/api/src/db/models/User';
import * as docxGenerator from '../../../services/api/src/utils/docx-generator';
import * as pdfGenerator from '../../../services/api/src/utils/pdf-generator';

// Mock the models and generators
jest.mock('../../../services/api/src/db/models/DemandLetter');
jest.mock('../../../services/api/src/db/models/Firm');
jest.mock('../../../services/api/src/db/models/User');
jest.mock('../../../services/api/src/utils/docx-generator');
jest.mock('../../../services/api/src/utils/pdf-generator');

describe('ExportService', () => {
  let exportService: ExportService;

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
        email: 'john@example.com',
        phone: '555-1234',
      },
    },
    generation_metadata: {},
    created_at: new Date(),
  };

  const mockFirm = {
    id: 'firm-123',
    name: 'Test Law Firm',
    settings: {
      address: '456 Law St, Legal City, ST 54321',
      phone: '555-9999',
      email: 'contact@testfirm.com',
      website: 'www.testfirm.com',
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
    exportService = new ExportService();
    jest.clearAllMocks();
  });

  describe('exportToDocx', () => {
    it('should export demand letter to DOCX format', async () => {
      // Arrange
      const mockBuffer = Buffer.from('mock docx content');
      (DemandLetterModel.findById as jest.Mock).mockResolvedValue(mockLetter);
      (FirmModel.findById as jest.Mock).mockResolvedValue(mockFirm);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (docxGenerator.generateDocx as jest.Mock).mockResolvedValue(mockBuffer);

      // Act
      const result = await exportService.exportToDocx(mockLetter.id, mockLetter.firm_id);

      // Assert
      expect(result.buffer).toBe(mockBuffer);
      expect(result.contentType).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      expect(result.fileName).toMatch(/\.docx$/);
      expect(result.size).toBe(mockBuffer.length);
      expect(DemandLetterModel.findById).toHaveBeenCalledWith(
        mockLetter.id,
        mockLetter.firm_id
      );
      expect(FirmModel.findById).toHaveBeenCalledWith(mockLetter.firm_id);
      expect(UserModel.findById).toHaveBeenCalledWith(
        mockUser.id,
        mockLetter.firm_id
      );
    });

    it('should throw error if letter not found', async () => {
      // Arrange
      (DemandLetterModel.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        exportService.exportToDocx('invalid-id', 'firm-123')
      ).rejects.toThrow('Demand letter not found');
    });

    it('should throw error if letter has no content', async () => {
      // Arrange
      const letterNoContent = { ...mockLetter, current_content: '' };
      (DemandLetterModel.findById as jest.Mock).mockResolvedValue(letterNoContent);

      // Act & Assert
      await expect(
        exportService.exportToDocx(mockLetter.id, mockLetter.firm_id)
      ).rejects.toThrow('Letter has no content');
    });
  });

  describe('exportToPdf', () => {
    it('should export demand letter to PDF format', async () => {
      // Arrange
      const mockBuffer = Buffer.from('mock pdf content');
      (DemandLetterModel.findById as jest.Mock).mockResolvedValue(mockLetter);
      (FirmModel.findById as jest.Mock).mockResolvedValue(mockFirm);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (pdfGenerator.generatePdf as jest.Mock).mockResolvedValue(mockBuffer);

      // Act
      const result = await exportService.exportToPdf(mockLetter.id, mockLetter.firm_id);

      // Assert
      expect(result.buffer).toBe(mockBuffer);
      expect(result.contentType).toBe('application/pdf');
      expect(result.fileName).toMatch(/\.pdf$/);
      expect(result.size).toBe(mockBuffer.length);
      expect(DemandLetterModel.findById).toHaveBeenCalledWith(
        mockLetter.id,
        mockLetter.firm_id
      );
      expect(FirmModel.findById).toHaveBeenCalledWith(mockLetter.firm_id);
      expect(UserModel.findById).toHaveBeenCalledWith(
        mockUser.id,
        mockLetter.firm_id
      );
    });

    it('should throw error if letter not found', async () => {
      // Arrange
      (DemandLetterModel.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        exportService.exportToPdf('invalid-id', 'firm-123')
      ).rejects.toThrow('Demand letter not found');
    });
  });
});
