import { test, expect } from './fixtures/auth.fixture';
import { waitForToast, waitForApiResponse, fillField } from './fixtures/test-helpers';
import path from 'path';

test.describe('Document Upload', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to documents page
    await authenticatedPage.goto('/documents');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test.describe('File Selection', () => {
    test('should upload document via file input', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Click upload button
      await page.click('button:has-text("Upload Document")');

      // Select file
      const filePath = path.join(__dirname, 'fixtures/test-files/sample-document.txt');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);

      // Wait for upload to complete
      await waitForApiResponse(page, '/api/documents/upload');

      // Should show success message
      await waitForToast(page, 'Document uploaded successfully');

      // Should display uploaded document in list
      await expect(page.locator('text=sample-document.txt')).toBeVisible();
    });

    test('should upload multiple documents', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.click('button:has-text("Upload Document")');

      // Select multiple files
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles([
        path.join(__dirname, 'fixtures/test-files/sample-document.txt'),
      ]);

      // Wait for all uploads
      await waitForApiResponse(page, '/api/documents/upload');

      // Should show all uploaded documents
      await expect(page.locator('text=sample-document.txt')).toBeVisible();
    });
  });

  test.describe('Drag and Drop', () => {
    test('should upload document via drag and drop', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Find drop zone
      const dropZone = page.locator('[data-testid="file-drop-zone"]');
      await expect(dropZone).toBeVisible();

      // Read file content
      const filePath = path.join(__dirname, 'fixtures/test-files/sample-document.txt');
      const fs = require('fs');
      const fileContent = fs.readFileSync(filePath);

      // Create file in browser context
      const dataTransfer = await page.evaluateHandle((content) => {
        const dt = new DataTransfer();
        const file = new File([content], 'sample-document.txt', {
          type: 'text/plain',
        });
        dt.items.add(file);
        return dt;
      }, fileContent.toString());

      // Dispatch drop event
      await dropZone.dispatchEvent('drop', { dataTransfer });

      // Wait for upload
      await waitForApiResponse(page, '/api/documents/upload');

      // Should show success
      await waitForToast(page, 'Document uploaded successfully');
      await expect(page.locator('text=sample-document.txt')).toBeVisible();
    });

    test('should show drag over state', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      const dropZone = page.locator('[data-testid="file-drop-zone"]');

      // Trigger drag over
      await dropZone.dispatchEvent('dragover');

      // Should show active state
      await expect(dropZone).toHaveClass(/drag-active/);

      // Trigger drag leave
      await dropZone.dispatchEvent('dragleave');

      // Should remove active state
      await expect(dropZone).not.toHaveClass(/drag-active/);
    });
  });

  test.describe('File Validation', () => {
    test('should reject invalid file types', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.click('button:has-text("Upload Document")');

      // Try to upload invalid file type
      const fileInput = page.locator('input[type="file"]');

      // Create a mock invalid file
      await page.evaluate(() => {
        const dt = new DataTransfer();
        const file = new File(['content'], 'test.exe', {
          type: 'application/x-msdownload',
        });
        dt.items.add(file);

        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (input) {
          input.files = dt.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      // Should show error
      await waitForToast(page, 'Invalid file type');
    });

    test('should reject files exceeding size limit', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.click('button:has-text("Upload Document")');

      // Create large file (>50MB)
      await page.evaluate(() => {
        const dt = new DataTransfer();
        const largeContent = new Array(51 * 1024 * 1024).fill('x').join('');
        const file = new File([largeContent], 'large-file.pdf', {
          type: 'application/pdf',
        });
        dt.items.add(file);

        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (input) {
          input.files = dt.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      // Should show error
      await waitForToast(page, 'File size exceeds limit');
    });
  });

  test.describe('Upload Progress', () => {
    test('should show upload progress indicator', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.click('button:has-text("Upload Document")');

      const filePath = path.join(__dirname, 'fixtures/test-files/sample-document.txt');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);

      // Should show progress indicator
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();

      // Wait for completion
      await waitForApiResponse(page, '/api/documents/upload');

      // Progress should disappear
      await expect(page.locator('[data-testid="upload-progress"]')).not.toBeVisible();
    });

    test('should allow canceling upload', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.click('button:has-text("Upload Document")');

      const filePath = path.join(__dirname, 'fixtures/test-files/sample-document.txt');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);

      // Click cancel button
      await page.click('button:has-text("Cancel")');

      // Upload should be canceled
      await expect(page.locator('[data-testid="upload-progress"]')).not.toBeVisible();
      await waitForToast(page, 'Upload canceled');
    });
  });

  test.describe('Document List', () => {
    test('should display uploaded documents', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Should show document list
      await expect(page.locator('[data-testid="document-list"]')).toBeVisible();

      // Should show document cards
      await expect(page.locator('[data-testid="document-card"]').first()).toBeVisible();
    });

    test('should filter documents by type', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Click filter dropdown
      await page.click('[data-testid="filter-dropdown"]');

      // Select PDF filter
      await page.click('text=PDF Only');

      // Should show only PDF documents
      const documentCards = page.locator('[data-testid="document-card"]');
      const count = await documentCards.count();

      for (let i = 0; i < count; i++) {
        const card = documentCards.nth(i);
        await expect(card.locator('text=.pdf')).toBeVisible();
      }
    });

    test('should search documents', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Enter search term
      await fillField(page, 'input[placeholder="Search documents"]', 'sample');

      // Should filter results
      await expect(page.locator('text=sample-document.txt')).toBeVisible();
    });

    test('should sort documents', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Click sort dropdown
      await page.click('[data-testid="sort-dropdown"]');

      // Select date sorting
      await page.click('text=Date (Newest)');

      // Documents should be sorted by date
      const firstDocument = page.locator('[data-testid="document-card"]').first();
      await expect(firstDocument).toBeVisible();
    });
  });

  test.describe('Document Actions', () => {
    test('should view document details', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Click on document
      await page.click('[data-testid="document-card"]').first();

      // Should show document details
      await expect(page.locator('[data-testid="document-details"]')).toBeVisible();
    });

    test('should download document', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Start download
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-button"]').first();

      const download = await downloadPromise;

      // Verify download
      expect(download.suggestedFilename()).toBeTruthy();
    });

    test('should delete document', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Click delete button
      await page.click('[data-testid="delete-button"]').first();

      // Confirm deletion
      await page.click('button:has-text("Confirm")');

      // Wait for deletion
      await waitForApiResponse(page, '/api/documents');

      // Should show success
      await waitForToast(page, 'Document deleted successfully');
    });
  });
});
