/**
 * Export-related TypeScript types
 *
 * Types for document export functionality (Word/PDF generation)
 */

/**
 * Export format types
 */
export type ExportFormat = 'docx' | 'pdf';

/**
 * Document structure sections
 */
export interface ExportDocumentHeader {
  firmName: string;
  firmLogo?: string; // Base64 encoded or URL
  date: Date;
  firmAddress?: string;
  firmContact?: string;
}

export interface ExportDocumentFooter {
  firmContact?: string;
  firmAddress?: string;
  pageNumbers: boolean;
}

export interface ExportRecipientInfo {
  name?: string;
  address?: string;
  email?: string;
  phone?: string;
}

export interface ExportSignature {
  attorneyName: string;
  attorneyTitle?: string;
  firmName: string;
}

/**
 * Complete export data structure
 */
export interface ExportData {
  header: ExportDocumentHeader;
  recipientInfo?: ExportRecipientInfo;
  letterContent: string;
  signature: ExportSignature;
  footer: ExportDocumentFooter;
}

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  includeBranding: boolean;
  includePageNumbers: boolean;
  fileName?: string;
}

/**
 * Export result
 */
export interface ExportResult {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  size: number;
}

/**
 * Firm branding settings (from firm.settings JSONB)
 */
export interface FirmBrandingSettings {
  logo?: string; // URL or base64
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  primaryColor?: string;
  secondaryColor?: string;
}
