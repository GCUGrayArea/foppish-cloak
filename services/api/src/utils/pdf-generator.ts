/**
 * PDF Generator
 *
 * Generates PDF documents from demand letter data using Puppeteer (headless Chrome)
 */

import puppeteer from 'puppeteer';
import { ExportData } from '../types/export';
import {
  formatDocumentDate,
  sanitizeContent,
  plainTextToHtml,
} from './document-formatter';

/**
 * Generate PDF from export data
 */
export async function generatePdf(data: ExportData): Promise<Buffer> {
  const html = generateHtmlDocument(data);

  // Launch headless browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Set content
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in',
      },
      printBackground: true,
      displayHeaderFooter: data.footer.pageNumbers,
      headerTemplate: '<div></div>',
      footerTemplate: data.footer.pageNumbers
        ? '<div style="font-size: 10px; text-align: center; width: 100%;">' +
          '<span class="pageNumber"></span> / <span class="totalPages"></span>' +
          '</div>'
        : '<div></div>',
    });

    return pdfBuffer as Buffer;
  } finally {
    await browser.close();
  }
}

/**
 * Generate complete HTML document from export data
 */
function generateHtmlDocument(data: ExportData): string {
  const styles = generateStyles();
  const headerHtml = generateHeaderHtml(data);
  const recipientHtml = data.recipientInfo
    ? generateRecipientHtml(data.recipientInfo)
    : '';
  const contentHtml = generateContentHtml(data.letterContent);
  const signatureHtml = generateSignatureHtml(data.signature);
  const footerHtml = generateFooterHtml(data.footer);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demand Letter</title>
  <style>${styles}</style>
</head>
<body>
  <div class="document">
    ${headerHtml}
    ${recipientHtml}
    ${contentHtml}
    ${signatureHtml}
    ${footerHtml}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate CSS styles for PDF
 */
function generateStyles(): string {
  return `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Times New Roman', Times, serif;
  font-size: 12pt;
  line-height: 1.6;
  color: #000;
}

.document {
  max-width: 100%;
}

.header {
  text-align: center;
  margin-bottom: 2em;
}

.header h1 {
  font-size: 18pt;
  font-weight: bold;
  margin-bottom: 0.5em;
}

.header p {
  font-size: 11pt;
  margin: 0.25em 0;
}

.date {
  text-align: right;
  margin-bottom: 2em;
}

.recipient {
  margin-bottom: 2em;
}

.recipient p {
  margin: 0.25em 0;
}

.content {
  text-align: justify;
  margin-bottom: 2em;
}

.content p {
  margin-bottom: 1em;
  text-indent: 0;
}

.content ul,
.content ol {
  margin: 1em 0 1em 2em;
}

.content li {
  margin-bottom: 0.5em;
}

.signature {
  margin-top: 3em;
}

.signature p {
  margin: 0.25em 0;
}

.signature .name {
  font-weight: bold;
}

.footer {
  margin-top: 3em;
  padding-top: 1em;
  border-top: 1px solid #000;
  text-align: center;
  font-size: 10pt;
}

.footer p {
  margin: 0.25em 0;
}

strong, b {
  font-weight: bold;
}

em, i {
  font-style: italic;
}

u {
  text-decoration: underline;
}
  `.trim();
}

/**
 * Generate header HTML
 */
function generateHeaderHtml(data: ExportData): string {
  const parts: string[] = ['<div class="header">'];

  parts.push(`<h1>${escapeHtml(data.header.firmName)}</h1>`);

  if (data.header.firmAddress) {
    parts.push(`<p>${escapeHtml(data.header.firmAddress)}</p>`);
  }

  if (data.header.firmContact) {
    parts.push(`<p>${escapeHtml(data.header.firmContact)}</p>`);
  }

  parts.push('</div>');

  parts.push(
    `<div class="date">${escapeHtml(formatDocumentDate(data.header.date))}</div>`
  );

  return parts.join('\n');
}

/**
 * Generate recipient information HTML
 */
function generateRecipientHtml(
  recipientInfo: NonNullable<ExportData['recipientInfo']>
): string {
  const parts: string[] = ['<div class="recipient">'];

  if (recipientInfo.name) {
    parts.push(`<p>${escapeHtml(recipientInfo.name)}</p>`);
  }

  if (recipientInfo.address) {
    parts.push(`<p>${escapeHtml(recipientInfo.address)}</p>`);
  }

  if (recipientInfo.email) {
    parts.push(`<p>${escapeHtml(recipientInfo.email)}</p>`);
  }

  if (recipientInfo.phone) {
    parts.push(`<p>${escapeHtml(recipientInfo.phone)}</p>`);
  }

  parts.push('</div>');

  return parts.join('\n');
}

/**
 * Generate content HTML
 */
function generateContentHtml(content: string): string {
  const isHtml = /<[^>]+>/.test(content);

  let sanitized: string;
  if (isHtml) {
    sanitized = sanitizeContent(content);
  } else {
    sanitized = plainTextToHtml(content);
  }

  return `<div class="content">${sanitized}</div>`;
}

/**
 * Generate signature HTML
 */
function generateSignatureHtml(signature: ExportData['signature']): string {
  const parts: string[] = ['<div class="signature">'];

  parts.push('<p>Sincerely,</p>');
  parts.push('<br>');
  parts.push(`<p class="name">${escapeHtml(signature.attorneyName)}</p>`);

  if (signature.attorneyTitle) {
    parts.push(`<p>${escapeHtml(signature.attorneyTitle)}</p>`);
  }

  parts.push(`<p>${escapeHtml(signature.firmName)}</p>`);

  parts.push('</div>');

  return parts.join('\n');
}

/**
 * Generate footer HTML
 */
function generateFooterHtml(footer: ExportData['footer']): string {
  if (!footer.firmContact && !footer.firmAddress) {
    return '';
  }

  const parts: string[] = ['<div class="footer">'];

  if (footer.firmAddress) {
    parts.push(`<p>${escapeHtml(footer.firmAddress)}</p>`);
  }

  if (footer.firmContact) {
    parts.push(`<p>${escapeHtml(footer.firmContact)}</p>`);
  }

  parts.push('</div>');

  return parts.join('\n');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = { textContent: text } as { textContent: string };
  const escaped = div.textContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  return escaped;
}
