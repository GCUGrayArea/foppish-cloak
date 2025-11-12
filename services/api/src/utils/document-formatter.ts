/**
 * Document Formatter Utilities
 *
 * Shared formatting functions for both DOCX and PDF export
 */

/**
 * Format date for document headers
 */
export function formatDocumentDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Sanitize filename for safe file downloads
 * Removes special characters and limits length
 */
export function sanitizeFileName(fileName: string, maxLength = 200): string {
  // Remove or replace unsafe characters
  const safe = fileName
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '-')
    .replace(/\.+/g, '.')
    .trim();

  // Limit length
  if (safe.length > maxLength) {
    const ext = safe.substring(safe.lastIndexOf('.'));
    const name = safe.substring(0, maxLength - ext.length);
    return name + ext;
  }

  return safe;
}

/**
 * Generate filename from letter title and date
 */
export function generateExportFileName(
  title: string,
  format: 'docx' | 'pdf',
  date: Date = new Date()
): string {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const sanitizedTitle = sanitizeFileName(title);
  return `${sanitizedTitle}-${dateStr}.${format}`;
}

/**
 * Sanitize HTML content for safe rendering
 * Removes potentially dangerous tags while preserving formatting
 */
export function sanitizeContent(content: string): string {
  // Basic sanitization - remove script tags and dangerous attributes
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .trim();
}

/**
 * Convert plain text paragraphs to HTML
 */
export function plainTextToHtml(text: string): string {
  return text
    .split('\n\n')
    .map((paragraph) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return '';
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .filter((p) => p)
    .join('\n');
}

/**
 * Extract text content from HTML (strip tags)
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Format address lines into a single string
 */
export function formatAddress(addressParts: {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}): string {
  const parts: string[] = [];

  if (addressParts.street) parts.push(addressParts.street);

  const cityStateZip: string[] = [];
  if (addressParts.city) cityStateZip.push(addressParts.city);
  if (addressParts.state) cityStateZip.push(addressParts.state);
  if (addressParts.zip) cityStateZip.push(addressParts.zip);

  if (cityStateZip.length > 0) {
    parts.push(cityStateZip.join(', '));
  }

  return parts.join('\n');
}

/**
 * Get content type header for export format
 */
export function getContentType(format: 'docx' | 'pdf'): string {
  switch (format) {
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'pdf':
      return 'application/pdf';
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * Parse HTML to extract structured content sections
 * Returns array of paragraphs with their formatting info
 */
export interface ParsedParagraph {
  text: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isList: boolean;
  listLevel: number;
}

export function parseHtmlContent(html: string): ParsedParagraph[] {
  const paragraphs: ParsedParagraph[] = [];

  // Simple HTML parser - split by block elements
  const blocks = html.split(/<\/(p|li|div|h[1-6])>/gi);

  for (const block of blocks) {
    const text = block.replace(/<[^>]+>/g, '').trim();
    if (!text) continue;

    paragraphs.push({
      text,
      isBold: /<(b|strong)>/i.test(block),
      isItalic: /<(i|em)>/i.test(block),
      isUnderline: /<u>/i.test(block),
      isList: /<li>/i.test(block),
      listLevel: 0,
    });
  }

  return paragraphs;
}
