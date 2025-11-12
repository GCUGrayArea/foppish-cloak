/**
 * DOCX Generator
 *
 * Generates Word documents from demand letter data using the docx library
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
} from 'docx';
import { ExportData } from '../types/export';
import {
  formatDocumentDate,
  parseHtmlContent
} from './document-formatter';

/**
 * Generate Word document from export data
 */
export async function generateDocx(data: ExportData): Promise<Buffer> {
  const sections = [];

  // Create header content
  const headerParagraphs = createHeaderSection(data);
  sections.push(...headerParagraphs);

  // Add recipient information if available
  if (data.recipientInfo) {
    const recipientParagraphs = createRecipientSection(data.recipientInfo);
    sections.push(...recipientParagraphs);
    sections.push(createSpacerParagraph());
  }

  // Add letter content
  const contentParagraphs = createContentSection(data.letterContent);
  sections.push(...contentParagraphs);

  // Add signature block
  const signatureParagraphs = createSignatureSection(data.signature);
  sections.push(...signatureParagraphs);

  // Add footer information if available
  if (data.footer.firmContact || data.footer.firmAddress) {
    sections.push(createSpacerParagraph());
    const footerParagraphs = createFooterSection(data.footer);
    sections.push(...footerParagraphs);
  }

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch = 1440 twips
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: sections,
      },
    ],
  });

  // Generate buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

/**
 * Create header section with firm name and date
 */
function createHeaderSection(data: ExportData): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Firm name
  paragraphs.push(
    new Paragraph({
      text: data.header.firmName,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: {
        after: 200,
      },
    })
  );

  // Firm address and contact (if provided)
  if (data.header.firmAddress) {
    paragraphs.push(
      new Paragraph({
        text: data.header.firmAddress,
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 100,
        },
      })
    );
  }

  if (data.header.firmContact) {
    paragraphs.push(
      new Paragraph({
        text: data.header.firmContact,
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 200,
        },
      })
    );
  }

  // Date
  paragraphs.push(
    new Paragraph({
      text: formatDocumentDate(data.header.date),
      alignment: AlignmentType.RIGHT,
      spacing: {
        after: 400,
      },
    })
  );

  return paragraphs;
}

/**
 * Create recipient information section
 */
function createRecipientSection(
  recipientInfo: NonNullable<ExportData['recipientInfo']>
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines: string[] = [];

  if (recipientInfo.name) lines.push(recipientInfo.name);
  if (recipientInfo.address) lines.push(recipientInfo.address);
  if (recipientInfo.email) lines.push(recipientInfo.email);
  if (recipientInfo.phone) lines.push(recipientInfo.phone);

  for (const line of lines) {
    paragraphs.push(
      new Paragraph({
        text: line,
        spacing: {
          after: 100,
        },
      })
    );
  }

  return paragraphs;
}

/**
 * Create main content section from HTML or plain text
 */
function createContentSection(content: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Check if content is HTML
  const isHtml = /<[^>]+>/.test(content);

  if (isHtml) {
    // Parse HTML content
    const parsed = parseHtmlContent(content);

    for (const item of parsed) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: item.text,
              bold: item.isBold,
              italics: item.isItalic,
              underline: item.isUnderline ? {} : undefined,
            }),
          ],
          spacing: {
            after: 200,
          },
          bullet: item.isList ? { level: item.listLevel } : undefined,
        })
      );
    }
  } else {
    // Plain text - split by paragraphs
    const textParagraphs = content.split('\n\n');

    for (const para of textParagraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      paragraphs.push(
        new Paragraph({
          text: trimmed,
          spacing: {
            after: 200,
          },
        })
      );
    }
  }

  return paragraphs;
}

/**
 * Create signature block
 */
function createSignatureSection(signature: ExportData['signature']): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Add spacing before signature
  paragraphs.push(createSpacerParagraph());
  paragraphs.push(createSpacerParagraph());

  // Closing salutation
  paragraphs.push(
    new Paragraph({
      text: 'Sincerely,',
      spacing: {
        after: 400,
      },
    })
  );

  // Attorney name (bold)
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: signature.attorneyName,
          bold: true,
        }),
      ],
      spacing: {
        after: 100,
      },
    })
  );

  // Attorney title (if provided)
  if (signature.attorneyTitle) {
    paragraphs.push(
      new Paragraph({
        text: signature.attorneyTitle,
        spacing: {
          after: 100,
        },
      })
    );
  }

  // Firm name
  paragraphs.push(
    new Paragraph({
      text: signature.firmName,
      spacing: {
        after: 200,
      },
    })
  );

  return paragraphs;
}

/**
 * Create footer section with firm contact information
 */
function createFooterSection(footer: ExportData['footer']): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Separator line
  paragraphs.push(
    new Paragraph({
      border: {
        top: {
          color: '000000',
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
      spacing: {
        before: 200,
        after: 200,
      },
    })
  );

  // Footer text
  const footerLines: string[] = [];
  if (footer.firmAddress) footerLines.push(footer.firmAddress);
  if (footer.firmContact) footerLines.push(footer.firmContact);

  for (const line of footerLines) {
    paragraphs.push(
      new Paragraph({
        text: line,
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 100,
        },
      })
    );
  }

  return paragraphs;
}

/**
 * Create empty paragraph for spacing
 */
function createSpacerParagraph(): Paragraph {
  return new Paragraph({
    text: '',
    spacing: {
      after: 200,
    },
  });
}
