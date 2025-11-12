import { test, expect } from './fixtures/auth.fixture';
import { waitForToast, waitForApiResponse, fillField } from './fixtures/test-helpers';
import path from 'path';

test.describe('Demand Letter Workflow', () => {
  test.describe('Letter Creation', () => {
    test('should create new demand letter from scratch', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('button:has-text("New Demand Letter")');

      // Should navigate to creation wizard
      await expect(page).toHaveURL(/\/letters\/new/);

      // Step 1: Select template
      await page.click('[data-testid="template-card"]').first();
      await page.click('button:has-text("Next")');

      // Step 2: Upload documents
      const filePath = path.join(__dirname, 'fixtures/test-files/sample-document.txt');
      await page.setInputFiles('input[type="file"]', filePath);

      await waitForApiResponse(page, '/api/documents/upload');
      await page.click('button:has-text("Next")');

      // Step 3: Review and create
      await fillField(page, 'input[name="letterName"]', 'Test Demand Letter');
      await page.click('button:has-text("Create Letter")');

      // Wait for AI processing
      await waitForApiResponse(page, '/api/letters', 30000);

      // Should show success
      await waitForToast(page, 'Demand letter created successfully');

      // Should navigate to editor
      await expect(page).toHaveURL(/\/letters\/\d+/);
    });

    test('should create letter from existing document', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Navigate to documents
      await page.goto('/documents');

      // Click create letter from document
      await page.click('[data-testid="create-letter-button"]').first();

      // Should start wizard with document pre-selected
      await expect(page).toHaveURL(/\/letters\/new/);
      await expect(page.locator('text=1 document selected')).toBeVisible();
    });
  });

  test.describe('Letter Editing', () => {
    test('should edit letter content', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      // Should show editor
      await expect(page.locator('[data-testid="letter-editor"]')).toBeVisible();

      // Edit content
      const editor = page.locator('[data-testid="letter-editor"]');
      await editor.fill('Updated letter content');

      // Save changes
      await page.click('button:has-text("Save")');

      // Wait for save
      await waitForApiResponse(page, '/api/letters');

      // Should show success
      await waitForToast(page, 'Changes saved');
    });

    test('should auto-save changes', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      // Edit content
      await page.fill('[data-testid="letter-editor"]', 'Auto-save test');

      // Wait for auto-save
      await page.waitForTimeout(3000);

      // Should show auto-save indicator
      await expect(page.locator('text=Saved')).toBeVisible();
    });

    test('should track changes history', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      // Click history button
      await page.click('button:has-text("History")');

      // Should show revisions list
      await expect(page.locator('[data-testid="revisions-list"]')).toBeVisible();

      // Should show revision entries
      await expect(page.locator('[data-testid="revision-entry"]').first()).toBeVisible();
    });

    test('should revert to previous version', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      // Open history
      await page.click('button:has-text("History")');

      // Click revert button
      await page.click('[data-testid="revert-button"]').first();

      // Confirm revert
      await page.click('button:has-text("Confirm")');

      // Should show success
      await waitForToast(page, 'Reverted to previous version');
    });
  });

  test.describe('AI Refinement', () => {
    test('should request AI refinement', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      // Click refine button
      await page.click('button:has-text("Refine with AI")');

      // Enter refinement instructions
      await fillField(
        page,
        'textarea[name="instructions"]',
        'Make the tone more formal'
      );

      await page.click('button:has-text("Refine")');

      // Should show processing indicator
      await expect(page.locator('text=Refining')).toBeVisible();

      // Wait for AI processing
      await waitForApiResponse(page, '/api/letters/refine', 30000);

      // Should show success
      await waitForToast(page, 'Letter refined successfully');

      // Should update content
      const editor = page.locator('[data-testid="letter-editor"]');
      await expect(editor).not.toBeEmpty();
    });

    test('should show refinement suggestions', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      // Click suggestions button
      await page.click('button:has-text("Get Suggestions")');

      // Wait for AI analysis
      await waitForApiResponse(page, '/api/letters/suggestions', 30000);

      // Should show suggestions panel
      await expect(page.locator('[data-testid="suggestions-panel"]')).toBeVisible();

      // Should show suggestion items
      await expect(page.locator('[data-testid="suggestion-item"]').first()).toBeVisible();
    });

    test('should apply individual suggestions', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      await page.click('button:has-text("Get Suggestions")');
      await waitForApiResponse(page, '/api/letters/suggestions', 30000);

      // Click apply on first suggestion
      await page.click('[data-testid="apply-suggestion"]').first();

      // Should update content
      await waitForToast(page, 'Suggestion applied');
    });
  });

  test.describe('Variable Population', () => {
    test('should populate template variables from documents', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      // Click populate variables button
      await page.click('button:has-text("Auto-fill from Documents")');

      // Wait for AI extraction
      await waitForApiResponse(page, '/api/letters/extract', 30000);

      // Should show extracted data
      await expect(page.locator('[data-testid="extracted-data"]')).toBeVisible();

      // Verify variables populated
      await expect(page.locator('text=Client Name:')).toBeVisible();
    });

    test('should manually edit variables', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      // Click variables panel
      await page.click('button:has-text("Variables")');

      // Should show variables form
      await expect(page.locator('[data-testid="variables-form"]')).toBeVisible();

      // Edit variable
      await fillField(page, 'input[name="client_name"]', 'John Doe');

      // Save changes
      await page.click('button:has-text("Update")');

      // Should update letter content
      await waitForToast(page, 'Variables updated');
    });
  });

  test.describe('Workflow Status', () => {
    test('should move letter through workflow stages', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      // Should show current status
      await expect(page.locator('[data-testid="status-badge"]')).toBeVisible();

      // Click change status
      await page.click('[data-testid="status-dropdown"]');

      // Select new status
      await page.click('text=Ready for Review');

      // Should update status
      await waitForApiResponse(page, '/api/letters');
      await waitForToast(page, 'Status updated');

      // Should show updated status
      await expect(page.locator('text=Ready for Review')).toBeVisible();
    });

    test('should filter letters by status', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');

      // Click status filter
      await page.click('[data-testid="status-filter"]');

      // Select status
      await page.click('text=In Progress');

      // Should show filtered results
      const letters = page.locator('[data-testid="letter-card"]');
      const count = await letters.count();

      for (let i = 0; i < count; i++) {
        const card = letters.nth(i);
        await expect(card.locator('text=In Progress')).toBeVisible();
      }
    });
  });

  test.describe('Comments and Collaboration', () => {
    test('should add comment to letter', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      // Click comments panel
      await page.click('button:has-text("Comments")');

      // Add comment
      await fillField(
        page,
        'textarea[name="comment"]',
        'This needs revision'
      );

      await page.click('button:has-text("Post Comment")');

      // Wait for comment creation
      await waitForApiResponse(page, '/api/comments');

      // Should show comment
      await expect(page.locator('text=This needs revision')).toBeVisible();
    });

    test('should reply to comment', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();
      await page.click('button:has-text("Comments")');

      // Click reply on existing comment
      await page.click('[data-testid="reply-button"]').first();

      // Enter reply
      await fillField(page, 'textarea[name="reply"]', 'Agreed, will update');

      await page.click('button:has-text("Reply")');

      // Should show reply
      await expect(page.locator('text=Agreed, will update')).toBeVisible();
    });
  });

  test.describe('Letter Search and Organization', () => {
    test('should search letters', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');

      // Enter search term
      await fillField(page, 'input[placeholder="Search letters"]', 'test');

      // Should filter results
      const letters = page.locator('[data-testid="letter-card"]');
      await expect(letters).not.toHaveCount(0);
    });

    test('should filter by date range', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');

      // Click date filter
      await page.click('[data-testid="date-filter"]');

      // Select date range
      await page.click('text=Last 30 Days');

      // Should show filtered results
      await expect(page.locator('[data-testid="letter-card"]')).not.toHaveCount(0);
    });

    test('should sort letters', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');

      // Click sort dropdown
      await page.click('[data-testid="sort-dropdown"]');

      // Select sort option
      await page.click('text=Date Modified');

      // Should reorder letters
      const firstLetter = page.locator('[data-testid="letter-card"]').first();
      await expect(firstLetter).toBeVisible();
    });
  });

  test.describe('Letter Deletion', () => {
    test('should delete letter with confirmation', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/');

      // Click delete button
      await page.click('[data-testid="delete-letter-button"]').first();

      // Confirm deletion
      await page.click('button:has-text("Delete")');

      // Wait for deletion
      await waitForApiResponse(page, '/api/letters');

      // Should show success
      await waitForToast(page, 'Letter deleted successfully');
    });
  });
});
