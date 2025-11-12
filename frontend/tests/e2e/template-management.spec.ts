import { test, expect } from './fixtures/auth.fixture';
import { waitForToast, waitForApiResponse, fillField } from './fixtures/test-helpers';

test.describe('Template Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to templates page
    await authenticatedPage.goto('/templates');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test.describe('Template Creation', () => {
    test('should create new template', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const templateName = `Test Template ${Date.now()}`;

      // Click create button
      await page.click('button:has-text("Create Template")');

      // Fill template form
      await fillField(page, 'input[name="name"]', templateName);
      await fillField(
        page,
        'textarea[name="description"]',
        'Test template description'
      );

      // Fill template content
      await page.fill(
        '[data-testid="template-editor"]',
        'Dear {{client_name}},\n\nThis is a test template.'
      );

      // Save template
      await page.click('button:has-text("Save Template")');

      // Wait for creation
      await waitForApiResponse(page, '/api/templates');

      // Should show success
      await waitForToast(page, 'Template created successfully');

      // Should redirect to templates list
      await expect(page).toHaveURL('/templates');

      // Should show new template in list
      await expect(page.locator(`text=${templateName}`)).toBeVisible();
    });

    test('should validate required fields', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.click('button:has-text("Create Template")');

      // Try to save without filling required fields
      await page.click('button:has-text("Save Template")');

      // Should show validation errors
      await expect(page.locator('text=Template name is required')).toBeVisible();
      await expect(page.locator('text=Template content is required')).toBeVisible();
    });

    test('should insert variables into template', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.click('button:has-text("Create Template")');

      await fillField(page, 'input[name="name"]', 'Variable Test Template');

      // Click insert variable button
      await page.click('button:has-text("Insert Variable")');

      // Select variable from dropdown
      await page.click('text=Client Name');

      // Variable should be inserted
      const editor = page.locator('[data-testid="template-editor"]');
      await expect(editor).toContainText('{{client_name}}');
    });

    test('should preview template', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.click('button:has-text("Create Template")');

      await fillField(page, 'input[name="name"]', 'Preview Test');
      await page.fill(
        '[data-testid="template-editor"]',
        'Dear {{client_name}}, Amount: {{damage_amount}}'
      );

      // Click preview button
      await page.click('button:has-text("Preview")');

      // Should show preview modal
      await expect(page.locator('[data-testid="template-preview"]')).toBeVisible();

      // Should show template with sample data
      await expect(page.locator('text=Dear John Doe')).toBeVisible();
    });
  });

  test.describe('Template Editing', () => {
    test('should edit existing template', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Click on first template
      await page.click('[data-testid="template-card"]').first();

      // Should navigate to editor
      await expect(page).toHaveURL(/\/templates\/\d+\/edit/);

      // Edit template name
      const newName = `Updated Template ${Date.now()}`;
      await fillField(page, 'input[name="name"]', newName);

      // Edit content
      await page.fill(
        '[data-testid="template-editor"]',
        'Updated template content'
      );

      // Save changes
      await page.click('button:has-text("Save Changes")');

      // Wait for update
      await waitForApiResponse(page, '/api/templates');

      // Should show success
      await waitForToast(page, 'Template updated successfully');

      // Should show updated name
      await expect(page.locator(`text=${newName}`)).toBeVisible();
    });

    test('should preserve unsaved changes warning', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.click('[data-testid="template-card"]').first();

      // Make changes
      await page.fill('[data-testid="template-editor"]', 'Modified content');

      // Try to navigate away
      page.on('dialog', (dialog) => {
        expect(dialog.message()).toContain('unsaved changes');
        dialog.dismiss();
      });

      await page.click('text=Templates');
    });

    test('should duplicate template', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Click duplicate button
      await page.click('[data-testid="duplicate-button"]').first();

      // Should create copy
      await waitForApiResponse(page, '/api/templates');
      await waitForToast(page, 'Template duplicated successfully');

      // Should show duplicated template
      await expect(page.locator('text=(Copy)')).toBeVisible();
    });
  });

  test.describe('Template Versioning', () => {
    test('should view version history', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.click('[data-testid="template-card"]').first();

      // Click version history button
      await page.click('button:has-text("Version History")');

      // Should show version list
      await expect(page.locator('[data-testid="version-list"]')).toBeVisible();

      // Should show version entries
      await expect(page.locator('[data-testid="version-entry"]').first()).toBeVisible();
    });

    test('should restore previous version', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.click('[data-testid="template-card"]').first();
      await page.click('button:has-text("Version History")');

      // Click restore on previous version
      await page.click('[data-testid="restore-version-button"]').first();

      // Confirm restoration
      await page.click('button:has-text("Confirm")');

      // Wait for restoration
      await waitForApiResponse(page, '/api/templates');

      // Should show success
      await waitForToast(page, 'Version restored successfully');
    });

    test('should compare versions', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.click('[data-testid="template-card"]').first();
      await page.click('button:has-text("Version History")');

      // Select two versions to compare
      await page.click('[data-testid="version-checkbox"]').first();
      await page.click('[data-testid="version-checkbox"]').nth(1);

      // Click compare button
      await page.click('button:has-text("Compare")');

      // Should show diff view
      await expect(page.locator('[data-testid="version-diff"]')).toBeVisible();
    });
  });

  test.describe('Template Organization', () => {
    test('should filter templates by category', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Click filter dropdown
      await page.click('[data-testid="category-filter"]');

      // Select category
      await page.click('text=Demand Letters');

      // Should show filtered results
      const templates = page.locator('[data-testid="template-card"]');
      await expect(templates).not.toHaveCount(0);
    });

    test('should search templates', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Enter search term
      await fillField(page, 'input[placeholder="Search templates"]', 'demand');

      // Should filter results
      const templates = page.locator('[data-testid="template-card"]');
      const count = await templates.count();

      for (let i = 0; i < count; i++) {
        const card = templates.nth(i);
        await expect(card.locator('text=/demand/i')).toBeVisible();
      }
    });

    test('should sort templates', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Click sort dropdown
      await page.click('[data-testid="sort-dropdown"]');

      // Select sort option
      await page.click('text=Name (A-Z)');

      // Should sort alphabetically
      const firstTemplate = page.locator('[data-testid="template-card"]').first();
      await expect(firstTemplate).toBeVisible();
    });
  });

  test.describe('Template Deletion', () => {
    test('should delete template with confirmation', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Click delete button
      await page.click('[data-testid="delete-button"]').first();

      // Should show confirmation dialog
      await expect(page.locator('text=Are you sure')).toBeVisible();

      // Confirm deletion
      await page.click('button:has-text("Delete")');

      // Wait for deletion
      await waitForApiResponse(page, '/api/templates');

      // Should show success
      await waitForToast(page, 'Template deleted successfully');
    });

    test('should cancel template deletion', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Get initial template count
      const initialCount = await page.locator('[data-testid="template-card"]').count();

      // Click delete button
      await page.click('[data-testid="delete-button"]').first();

      // Cancel deletion
      await page.click('button:has-text("Cancel")');

      // Template count should remain the same
      const finalCount = await page.locator('[data-testid="template-card"]').count();
      expect(finalCount).toBe(initialCount);
    });

    test('should prevent deleting template in use', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Try to delete template that's in use
      await page.click('[data-testid="delete-button"]').first();
      await page.click('button:has-text("Delete")');

      // Should show error
      await waitForToast(page, 'Cannot delete template in use');
    });
  });

  test.describe('Template Variables', () => {
    test('should list available variables', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.click('button:has-text("Create Template")');

      // Click variables help
      await page.click('button:has-text("Available Variables")');

      // Should show variable list
      await expect(page.locator('[data-testid="variables-list"]')).toBeVisible();

      // Should show variable descriptions
      await expect(page.locator('text={{client_name}}')).toBeVisible();
      await expect(page.locator('text={{damage_amount}}')).toBeVisible();
    });

    test('should validate variable syntax', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.click('button:has-text("Create Template")');

      // Enter invalid variable syntax
      await page.fill(
        '[data-testid="template-editor"]',
        'Invalid variable: {client_name}'
      );

      // Should show syntax error
      await expect(page.locator('text=Invalid variable syntax')).toBeVisible();
    });
  });

  test.describe('Template Sharing', () => {
    test('should make template public', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.click('[data-testid="template-card"]').first();

      // Toggle public sharing
      await page.click('[data-testid="make-public-toggle"]');

      // Save changes
      await page.click('button:has-text("Save Changes")');

      // Should show success
      await waitForToast(page, 'Template sharing updated');

      // Should show public badge
      await expect(page.locator('text=Public')).toBeVisible();
    });
  });
});
