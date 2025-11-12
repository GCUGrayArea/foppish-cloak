import { test, expect } from './fixtures/auth.fixture';
import { waitForToast, waitForApiResponse } from './fixtures/test-helpers';

test.describe('Export and Download', () => {
  test.describe('Letter Export', () => {
    test('should export letter as Word document', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      // Click export button
      await page.click('button:has-text("Export")');

      // Select Word format
      await page.click('text=Microsoft Word (.docx)');

      // Start download
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Download")');

      const download = await downloadPromise;

      // Verify download
      expect(download.suggestedFilename()).toMatch(/\.docx$/);

      // Save file to verify it's valid
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
    });

    test('should export letter as PDF', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      await page.click('button:has-text("Export")');
      await page.click('text=PDF Document (.pdf)');

      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Download")');

      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    });

    test('should customize export settings', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      await page.click('button:has-text("Export")');

      // Customize settings
      await page.click('text=Include letterhead');
      await page.click('text=Include signature line');
      await page.selectOption('select[name="pageSize"]', 'A4');

      await page.click('text=Microsoft Word (.docx)');

      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Download")');

      await downloadPromise;

      // Should show success
      await waitForToast(page, 'Document exported successfully');
    });

    test('should handle export errors gracefully', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      // Mock export failure
      await page.route('**/api/letters/*/export', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Export failed' }),
        });
      });

      await page.click('button:has-text("Export")');
      await page.click('text=PDF Document (.pdf)');
      await page.click('button:has-text("Download")');

      // Should show error
      await waitForToast(page, 'Export failed');
    });
  });

  test.describe('Bulk Export', () => {
    test('should export multiple letters', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');

      // Select multiple letters
      await page.click('[data-testid="select-checkbox"]').first();
      await page.click('[data-testid="select-checkbox"]').nth(1);

      // Click bulk export
      await page.click('button:has-text("Export Selected")');

      // Choose format
      await page.click('text=PDF Document (.pdf)');

      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Download All")');

      const download = await downloadPromise;

      // Should download zip file
      expect(download.suggestedFilename()).toMatch(/\.zip$/);
    });

    test('should show progress for bulk export', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');

      // Select multiple letters
      await page.click('[data-testid="select-checkbox"]').first();
      await page.click('[data-testid="select-checkbox"]').nth(1);
      await page.click('[data-testid="select-checkbox"]').nth(2);

      await page.click('button:has-text("Export Selected")');
      await page.click('text=Microsoft Word (.docx)');
      await page.click('button:has-text("Download All")');

      // Should show progress indicator
      await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();
      await expect(page.locator('text=/Exporting \d+ of \d+/')).toBeVisible();
    });
  });

  test.describe('Print Preview', () => {
    test('should show print preview', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      // Click print button
      await page.click('button:has-text("Print")');

      // Should open print dialog
      const printPromise = page.waitForEvent('popup');

      // Note: Can't fully test print dialog in automated tests,
      // but we can verify the preview page opens
      await expect(page.locator('[data-testid="print-preview"]')).toBeVisible();
    });

    test('should apply print settings', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      await page.click('button:has-text("Print")');

      // Toggle print options
      await page.click('text=Print in color');
      await page.click('text=Include page numbers');

      // Preview should update
      await expect(page.locator('[data-testid="print-preview"]')).toBeVisible();
    });
  });

  test.describe('Email Export', () => {
    test('should prepare letter for email', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      // Click email button
      await page.click('button:has-text("Email")');

      // Should show email form
      await expect(page.locator('[data-testid="email-form"]')).toBeVisible();

      // Fill email details
      await page.fill('input[name="to"]', 'recipient@example.com');
      await page.fill('input[name="subject"]', 'Demand Letter');
      await page.fill('textarea[name="message"]', 'Please see attached demand letter.');

      // Send email
      await page.click('button:has-text("Send")');

      // Wait for send
      await waitForApiResponse(page, '/api/letters/email');

      // Should show success
      await waitForToast(page, 'Email sent successfully');
    });

    test('should validate email addresses', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      await page.click('button:has-text("Email")');

      // Enter invalid email
      await page.fill('input[name="to"]', 'invalid-email');

      await page.click('button:has-text("Send")');

      // Should show validation error
      await expect(page.locator('text=Invalid email address')).toBeVisible();
    });

    test('should attach letter as PDF by default', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      await page.click('button:has-text("Email")');

      // Should show attachment preview
      await expect(page.locator('text=Attachment: demand-letter.pdf')).toBeVisible();

      // Should allow changing format
      await page.click('[data-testid="change-format"]');
      await page.click('text=Word Document (.docx)');

      await expect(page.locator('text=Attachment: demand-letter.docx')).toBeVisible();
    });
  });

  test.describe('Document Download', () => {
    test('should download original uploaded document', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/documents');

      // Click download button
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-document"]').first();

      const download = await downloadPromise;

      // Verify download
      expect(download.suggestedFilename()).toBeTruthy();
    });

    test('should handle download errors', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/documents');

      // Mock download failure
      await page.route('**/api/documents/*/download', (route) => {
        route.fulfill({
          status: 404,
          body: JSON.stringify({ error: 'Document not found' }),
        });
      });

      await page.click('[data-testid="download-document"]').first();

      // Should show error
      await waitForToast(page, 'Download failed');
    });
  });

  test.describe('Export History', () => {
    test('should view export history', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      // Click export history
      await page.click('button:has-text("Export History")');

      // Should show history list
      await expect(page.locator('[data-testid="export-history-list"]')).toBeVisible();

      // Should show export entries
      await expect(page.locator('[data-testid="export-entry"]').first()).toBeVisible();
    });

    test('should re-download from export history', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      await page.click('button:has-text("Export History")');

      // Click download on previous export
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="redownload-button"]').first();

      const download = await downloadPromise;

      expect(download.suggestedFilename()).toBeTruthy();
    });
  });

  test.describe('Export Settings', () => {
    test('should save export preferences', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/settings');

      // Navigate to export settings
      await page.click('text=Export Settings');

      // Set preferences
      await page.selectOption('select[name="defaultFormat"]', 'pdf');
      await page.click('input[name="includeLetterhead"]');
      await page.selectOption('select[name="defaultPageSize"]', 'Letter');

      // Save settings
      await page.click('button:has-text("Save Preferences")');

      // Should show success
      await waitForToast(page, 'Settings saved successfully');

      // Settings should be applied to future exports
      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();
      await page.click('button:has-text("Export")');

      // Should default to saved preferences
      await expect(page.locator('input[name="includeLetterhead"]:checked')).toBeVisible();
    });
  });

  test.describe('Template Export', () => {
    test('should export template', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/templates');

      // Click on template
      await page.click('[data-testid="template-card"]').first();

      // Click export template
      await page.click('button:has-text("Export Template")');

      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Download")');

      const download = await downloadPromise;

      // Should download template as JSON
      expect(download.suggestedFilename()).toMatch(/\.json$/);
    });

    test('should import template', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/templates');

      // Click import button
      await page.click('button:has-text("Import Template")');

      // Upload template file
      const filePath = path.join(__dirname, 'fixtures/test-files/sample-template.json');
      await page.setInputFiles('input[type="file"]', filePath);

      // Wait for import
      await waitForApiResponse(page, '/api/templates/import');

      // Should show success
      await waitForToast(page, 'Template imported successfully');
    });
  });
});
