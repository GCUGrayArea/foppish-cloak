/**
 * PDF Generator Unit Tests
 */

import { generatePdf } from '../../../services/api/src/utils/pdf-generator';
import { ExportData } from '../../../services/api/src/types/export';
import puppeteer from 'puppeteer';

// Mock puppeteer
jest.mock('puppeteer');

describe('PDF Generator', () => {
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

  let mockBrowser: any;
  let mockPage: any;

  beforeEach(() => {
    mockPage = {
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock pdf content')),
    };

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };

    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should generate a PDF buffer', async () => {
    // Act
    const buffer = await generatePdf(mockExportData);

    // Assert
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(puppeteer.launch).toHaveBeenCalledWith({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it('should set PDF content with proper HTML structure', async () => {
    // Act
    await generatePdf(mockExportData);

    // Assert
    expect(mockPage.setContent).toHaveBeenCalled();
    const htmlContent = (mockPage.setContent as jest.Mock).mock.calls[0][0];
    expect(htmlContent).toContain('<!DOCTYPE html>');
    expect(htmlContent).toContain('Test Law Firm');
    expect(htmlContent).toContain('John Doe');
    expect(htmlContent).toContain('Jane Attorney');
  });

  it('should configure PDF options correctly', async () => {
    // Act
    await generatePdf(mockExportData);

    // Assert
    expect(mockPage.pdf).toHaveBeenCalledWith({
      format: 'A4',
      margin: {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in',
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: expect.stringContaining('pageNumber'),
    });
  });

  it('should close browser even if error occurs', async () => {
    // Arrange
    mockPage.pdf.mockRejectedValue(new Error('PDF generation failed'));

    // Act & Assert
    await expect(generatePdf(mockExportData)).rejects.toThrow('PDF generation failed');
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it('should handle plain text content', async () => {
    // Arrange
    const plainTextData = {
      ...mockExportData,
      letterContent: 'This is plain text content.\n\nWith multiple paragraphs.',
    };

    // Act
    const buffer = await generatePdf(plainTextData);

    // Assert
    expect(buffer).toBeInstanceOf(Buffer);
    expect(mockPage.setContent).toHaveBeenCalled();
  });

  it('should handle missing recipient info', async () => {
    // Arrange
    const noRecipientData = {
      ...mockExportData,
      recipientInfo: undefined,
    };

    // Act
    const buffer = await generatePdf(noRecipientData);

    // Assert
    expect(buffer).toBeInstanceOf(Buffer);
    const htmlContent = (mockPage.setContent as jest.Mock).mock.calls[0][0];
    expect(htmlContent).not.toContain('class="recipient"');
  });
});
