/**
 * File icon mapping utilities
 *
 * Maps file MIME types to icon representations (using emoji for simplicity)
 */

import type { DocumentType } from '../types/document';

/**
 * Get file type category from MIME type
 */
export function getFileType(mimeType: string): DocumentType {
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }

  if (
    mimeType === 'application/msword' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }

  if (mimeType === 'text/plain') {
    return 'txt';
  }

  if (mimeType.startsWith('image/')) {
    return 'image';
  }

  if (
    mimeType === 'application/vnd.ms-excel' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return 'spreadsheet';
  }

  return 'other';
}

/**
 * Get icon (emoji) for file type
 */
export function getFileIcon(mimeType: string): string {
  const fileType = getFileType(mimeType);

  const iconMap: Record<DocumentType, string> = {
    pdf: '📄',
    docx: '📝',
    doc: '📝',
    txt: '📃',
    image: '🖼️',
    spreadsheet: '📊',
    other: '📎',
  };

  return iconMap[fileType];
}

/**
 * Get file type label for display
 */
export function getFileTypeLabel(mimeType: string): string {
  const fileType = getFileType(mimeType);

  const labelMap: Record<DocumentType, string> = {
    pdf: 'PDF Document',
    docx: 'Word Document',
    doc: 'Word Document',
    txt: 'Text File',
    image: 'Image',
    spreadsheet: 'Spreadsheet',
    other: 'Document',
  };

  return labelMap[fileType];
}

/**
 * Get color for file type badge
 */
export function getFileTypeColor(mimeType: string): string {
  const fileType = getFileType(mimeType);

  const colorMap: Record<DocumentType, string> = {
    pdf: '#dc2626', // red-600
    docx: '#2563eb', // blue-600
    doc: '#2563eb',
    txt: '#64748b', // slate-500
    image: '#16a34a', // green-600
    spreadsheet: '#16a34a', // green-600
    other: '#64748b', // slate-500
  };

  return colorMap[fileType];
}
