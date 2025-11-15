/**
 * Script to create sample PDF files for testing
 * Run with: tsx tests/fixtures/documents/create-sample-pdfs.ts
 */

import fs from 'fs';
import path from 'path';

// Minimal valid PDF structure
const createMinimalPDF = (content: string): Buffer => {
  const pdf = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
>>
endobj
4 0 obj
<<
/Length ${content.length + 40}
>>
stream
BT
/F1 12 Tf
50 700 Td
(${content}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
${400 + content.length}
%%EOF`;

  return Buffer.from(pdf, 'utf-8');
};

const documentsDir = __dirname;

// Create sample contract PDF
const contractContent = 'SAMPLE CONTRACT DOCUMENT - This is a test contract for integration testing';
const contractPDF = createMinimalPDF(contractContent);
fs.writeFileSync(path.join(documentsDir, 'sample-contract.pdf'), contractPDF);

// Create sample invoice PDF
const invoiceContent = 'SAMPLE INVOICE - Invoice #12345 - Amount Due: $5000.00';
const invoicePDF = createMinimalPDF(invoiceContent);
fs.writeFileSync(path.join(documentsDir, 'sample-invoice.pdf'), invoicePDF);

// Create sample medical records PDF
const medicalContent = 'MEDICAL RECORDS - Patient: John Doe - Date of Service: 2024-01-15';
const medicalPDF = createMinimalPDF(medicalContent);
fs.writeFileSync(path.join(documentsDir, 'sample-medical-records.pdf'), medicalPDF);

console.log('Sample PDF files created successfully:');
console.log('- sample-contract.pdf');
console.log('- sample-invoice.pdf');
console.log('- sample-medical-records.pdf');
