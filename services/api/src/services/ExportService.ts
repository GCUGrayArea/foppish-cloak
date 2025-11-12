/**
 * Export Service
 *
 * Handles export of demand letters to Word and PDF formats
 */

import { DemandLetterModel } from '../db/models/DemandLetter';
import { FirmModel } from '../db/models/Firm';
import { UserModel } from '../db/models/User';
import { ExportData, ExportResult, FirmBrandingSettings } from '../types/export';
import { generateDocx } from '../utils/docx-generator';
import { generatePdf } from '../utils/pdf-generator';
import {
  generateExportFileName,
  getContentType,
} from '../utils/document-formatter';

export class ExportService {
  /**
   * Export demand letter to DOCX format
   */
  async exportToDocx(
    letterId: string,
    firmId: string
  ): Promise<ExportResult> {
    const exportData = await this.prepareExportData(letterId, firmId);
    const buffer = await generateDocx(exportData);

    const fileName = generateExportFileName(
      exportData.letterContent.substring(0, 50).replace(/<[^>]+>/g, ''),
      'docx'
    );

    return {
      buffer,
      fileName,
      contentType: getContentType('docx'),
      size: buffer.length,
    };
  }

  /**
   * Export demand letter to PDF format
   */
  async exportToPdf(letterId: string, firmId: string): Promise<ExportResult> {
    const exportData = await this.prepareExportData(letterId, firmId);
    const buffer = await generatePdf(exportData);

    const fileName = generateExportFileName(
      exportData.letterContent.substring(0, 50).replace(/<[^>]+>/g, ''),
      'pdf'
    );

    return {
      buffer,
      fileName,
      contentType: getContentType('pdf'),
      size: buffer.length,
    };
  }

  /**
   * Prepare export data by fetching letter, firm, and user information
   */
  private async prepareExportData(
    letterId: string,
    firmId: string
  ): Promise<ExportData> {
    // Fetch demand letter
    const letter = await DemandLetterModel.findById(letterId, firmId);

    if (!letter) {
      throw new Error('Demand letter not found');
    }

    // Validate letter has content
    if (!letter.current_content || letter.current_content.trim() === '') {
      throw new Error(
        'Letter has no content. Please generate or edit the letter first.'
      );
    }

    // Fetch firm information
    const firm = await FirmModel.findById(firmId);

    if (!firm) {
      throw new Error('Firm not found');
    }

    // Fetch user (creator) information
    const user = await UserModel.findById(letter.created_by, firmId);

    if (!user) {
      throw new Error('Letter creator not found');
    }

    // Extract firm branding settings
    const branding = this.extractBrandingSettings(firm.settings);

    // Build export data
    const exportData: ExportData = {
      header: {
        firmName: firm.name,
        firmLogo: branding.logo,
        date: new Date(),
        firmAddress: branding.address,
        firmContact: this.formatFirmContact(branding),
      },
      recipientInfo: this.extractRecipientInfo(letter.extracted_data),
      letterContent: letter.current_content,
      signature: {
        attorneyName: `${user.first_name} ${user.last_name}`,
        attorneyTitle: this.getAttorneyTitle(user.role),
        firmName: firm.name,
      },
      footer: {
        firmContact: this.formatFirmContact(branding),
        firmAddress: branding.address,
        pageNumbers: true,
      },
    };

    return exportData;
  }

  /**
   * Extract branding settings from firm settings JSONB
   */
  private extractBrandingSettings(
    settings: Record<string, any>
  ): FirmBrandingSettings {
    return {
      logo: settings.logo,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
    };
  }

  /**
   * Extract recipient information from extracted_data
   */
  private extractRecipientInfo(
    extractedData: Record<string, any>
  ): ExportData['recipientInfo'] {
    if (!extractedData.recipient) {
      return undefined;
    }

    return {
      name: extractedData.recipient.name,
      address: extractedData.recipient.address,
      email: extractedData.recipient.email,
      phone: extractedData.recipient.phone,
    };
  }

  /**
   * Format firm contact information
   */
  private formatFirmContact(branding: FirmBrandingSettings): string {
    const parts: string[] = [];

    if (branding.phone) parts.push(`Tel: ${branding.phone}`);
    if (branding.email) parts.push(`Email: ${branding.email}`);
    if (branding.website) parts.push(`Web: ${branding.website}`);

    return parts.join(' | ');
  }

  /**
   * Get attorney title based on role
   */
  private getAttorneyTitle(role: string): string | undefined {
    switch (role) {
      case 'admin':
        return 'Managing Attorney';
      case 'attorney':
        return 'Attorney';
      case 'paralegal':
        return 'Paralegal';
      default:
        return undefined;
    }
  }
}
