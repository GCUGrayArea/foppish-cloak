/**
 * DOCX Generator Unit Tests
 */

import { generateDocx } from '../../../services/api/src/utils/docx-generator';
import { ExportData } from '../../../services/api/src/types/export';

describe('DOCX Generator', () => {
  const mockExportData: ExportData = {
    header: {
      firmName: 'Test Law Firm',
      date: new Date('2025-01-15'),
      firmAddress: '456 Law St, Legal City, ST 54321',
      firmContact: 'Tel: 555-9999 | Email: contact@testfirm.com',
    },
    recipientInfo: {
      name: 'John Doe',
      address: '123 Main St, City, State 12345',
      email: 'john@example.com',
      phone: '555-1234',
    },
    letterContent: '<p>This is the <strong>demand letter</strong> content.</p>',
    signature: {
      attorneyName: 'Jane Attorney',
      attorneyTitle: 'Attorney',
      firmName: 'Test Law Firm',
    },
    footer: {
      firmContact: 'Tel: 555-9999 | Email: contact@testfirm.com',
      firmAddress: '456 Law St, Legal City, ST 54321',
      pageNumbers: true,
    },
  };

  it('should generate a DOCX buffer', async () => {
    // Act
    const buffer = await generateDocx(mockExportData);

    // Assert
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // Check for DOCX file signature (PK header)
    expect(buffer.slice(0, 2).toString()).toBe('PK');
  });

  it('should handle plain text content', async () => {
    // Arrange
    const plainTextData = {
      ...mockExportData,
      letterContent: 'This is plain text content.\n\nWith multiple paragraphs.',
    };

    // Act
    const buffer = await generateDocx(plainTextData);

    // Assert
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should handle missing recipient info', async () => {
    // Arrange
    const noRecipientData = {
      ...mockExportData,
      recipientInfo: undefined,
    };

    // Act
    const buffer = await generateDocx(noRecipientData);

    // Assert
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should handle minimal export data', async () => {
    // Arrange
    const minimalData: ExportData = {
      header: {
        firmName: 'Minimal Firm',
        date: new Date(),
      },
      letterContent: 'Minimal content.',
      signature: {
        attorneyName: 'Attorney Name',
        firmName: 'Minimal Firm',
      },
      footer: {
        pageNumbers: false,
      },
    };

    // Act
    const buffer = await generateDocx(minimalData);

    // Assert
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
