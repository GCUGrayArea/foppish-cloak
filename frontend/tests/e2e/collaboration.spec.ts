import { test, expect } from '@playwright/test';
import { TEST_USERS, loginUser } from './fixtures/auth.fixture';
import { waitForToast, fillField } from './fixtures/test-helpers';

test.describe('Real-Time Collaboration', () => {
  test.describe('User Presence', () => {
    test('should show active users on document', async ({ browser }) => {
      // Create two browser contexts for different users
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      // Login as different users
      await loginUser(page1, TEST_USERS.attorney.email, TEST_USERS.attorney.password);
      await loginUser(page2, TEST_USERS.paralegal.email, TEST_USERS.paralegal.password);

      // Both navigate to same letter
      await page1.goto('/');
      await page1.click('[data-testid="letter-card"]').first();
      const url = page1.url();

      await page2.goto(url);

      // Page 1 should see page 2's user
      await expect(page1.locator('[data-testid="active-user"]')).toHaveCount(2);
      await expect(page1.locator('text=paralegal@testfirm.com')).toBeVisible();

      // Page 2 should see page 1's user
      await expect(page2.locator('[data-testid="active-user"]')).toHaveCount(2);
      await expect(page2.locator('text=attorney@testfirm.com')).toBeVisible();

      await context1.close();
      await context2.close();
    });

    test('should update presence when user leaves', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      await loginUser(page1, TEST_USERS.attorney.email, TEST_USERS.attorney.password);
      await loginUser(page2, TEST_USERS.paralegal.email, TEST_USERS.paralegal.password);

      await page1.goto('/');
      await page1.click('[data-testid="letter-card"]').first();
      const url = page1.url();

      await page2.goto(url);

      // Both users visible
      await expect(page1.locator('[data-testid="active-user"]')).toHaveCount(2);

      // User 2 leaves
      await page2.close();

      // Wait for presence update
      await page1.waitForTimeout(2000);

      // Should show only one user
      await expect(page1.locator('[data-testid="active-user"]')).toHaveCount(1);

      await context1.close();
      await context2.close();
    });

    test('should show user cursor positions', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      await loginUser(page1, TEST_USERS.attorney.email, TEST_USERS.attorney.password);
      await loginUser(page2, TEST_USERS.paralegal.email, TEST_USERS.paralegal.password);

      await page1.goto('/');
      await page1.click('[data-testid="letter-card"]').first();
      const url = page1.url();

      await page2.goto(url);

      // User 2 clicks in editor
      await page2.click('[data-testid="letter-editor"]');

      // User 1 should see user 2's cursor
      await expect(page1.locator('[data-testid="remote-cursor"]')).toBeVisible();

      await context1.close();
      await context2.close();
    });
  });

  test.describe('Real-Time Editing', () => {
    test('should sync edits between users in real-time', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      await loginUser(page1, TEST_USERS.attorney.email, TEST_USERS.attorney.password);
      await loginUser(page2, TEST_USERS.paralegal.email, TEST_USERS.paralegal.password);

      await page1.goto('/');
      await page1.click('[data-testid="letter-card"]').first();
      const url = page1.url();

      await page2.goto(url);

      // User 1 types in editor
      const testText = 'Real-time collaboration test';
      await page1.fill('[data-testid="letter-editor"]', testText);

      // Wait for sync
      await page2.waitForTimeout(1000);

      // User 2 should see the changes
      const editor2 = page2.locator('[data-testid="letter-editor"]');
      await expect(editor2).toHaveValue(testText);

      await context1.close();
      await context2.close();
    });

    test('should handle concurrent edits without conflicts', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      await loginUser(page1, TEST_USERS.attorney.email, TEST_USERS.attorney.password);
      await loginUser(page2, TEST_USERS.paralegal.email, TEST_USERS.paralegal.password);

      await page1.goto('/');
      await page1.click('[data-testid="letter-card"]').first();
      const url = page1.url();

      await page2.goto(url);

      // Both users edit different parts
      await page1.fill('[data-testid="letter-editor"]', 'User 1 edit: Beginning\n\n\n');
      await page2.evaluate(() => {
        const editor = document.querySelector('[data-testid="letter-editor"]') as HTMLTextAreaElement;
        if (editor) {
          editor.value += '\n\nUser 2 edit: End';
          editor.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });

      // Wait for sync
      await page1.waitForTimeout(2000);
      await page2.waitForTimeout(2000);

      // Both edits should be present
      const finalContent1 = await page1.locator('[data-testid="letter-editor"]').inputValue();
      const finalContent2 = await page2.locator('[data-testid="letter-editor"]').inputValue();

      expect(finalContent1).toContain('User 1 edit');
      expect(finalContent1).toContain('User 2 edit');
      expect(finalContent1).toBe(finalContent2);

      await context1.close();
      await context2.close();
    });

    test('should show editing indicator', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      await loginUser(page1, TEST_USERS.attorney.email, TEST_USERS.attorney.password);
      await loginUser(page2, TEST_USERS.paralegal.email, TEST_USERS.paralegal.password);

      await page1.goto('/');
      await page1.click('[data-testid="letter-card"]').first();
      const url = page1.url();

      await page2.goto(url);

      // User 2 starts typing
      await page2.click('[data-testid="letter-editor"]');
      await page2.keyboard.type('Typing...');

      // User 1 should see typing indicator
      await expect(page1.locator('text=paralegal@testfirm.com is typing')).toBeVisible();

      await context1.close();
      await context2.close();
    });
  });

  test.describe('Document Locking', () => {
    test('should show warning when editing locked document', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      await loginUser(page1, TEST_USERS.attorney.email, TEST_USERS.attorney.password);
      await loginUser(page2, TEST_USERS.paralegal.email, TEST_USERS.paralegal.password);

      await page1.goto('/');
      await page1.click('[data-testid="letter-card"]').first();
      const url = page1.url();

      // User 1 locks document
      await page1.click('[data-testid="lock-document"]');

      await page2.goto(url);

      // User 2 should see lock warning
      await expect(page2.locator('text=Document locked by attorney@testfirm.com')).toBeVisible();

      await context1.close();
      await context2.close();
    });

    test('should allow admin to unlock document', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      await loginUser(page1, TEST_USERS.attorney.email, TEST_USERS.attorney.password);
      await loginUser(page2, TEST_USERS.admin.email, TEST_USERS.admin.password);

      await page1.goto('/');
      await page1.click('[data-testid="letter-card"]').first();
      const url = page1.url();

      await page1.click('[data-testid="lock-document"]');

      await page2.goto(url);

      // Admin should see unlock button
      await page2.click('[data-testid="force-unlock"]');

      // Should show success
      await waitForToast(page2, 'Document unlocked');

      await context1.close();
      await context2.close();
    });
  });

  test.describe('Comments and Mentions', () => {
    test('should notify user when mentioned in comment', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      await loginUser(page1, TEST_USERS.attorney.email, TEST_USERS.attorney.password);
      await loginUser(page2, TEST_USERS.paralegal.email, TEST_USERS.paralegal.password);

      await page1.goto('/');
      await page1.click('[data-testid="letter-card"]').first();
      const url = page1.url();

      await page2.goto(url);

      // User 1 mentions user 2 in comment
      await page1.click('button:has-text("Comments")');
      await fillField(
        page1,
        'textarea[name="comment"]',
        '@paralegal@testfirm.com Please review this section'
      );
      await page1.click('button:has-text("Post Comment")');

      // Wait for notification
      await page2.waitForTimeout(2000);

      // User 2 should see notification
      await expect(page2.locator('[data-testid="notification-badge"]')).toBeVisible();

      await context1.close();
      await context2.close();
    });

    test('should sync comments in real-time', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      await loginUser(page1, TEST_USERS.attorney.email, TEST_USERS.attorney.password);
      await loginUser(page2, TEST_USERS.paralegal.email, TEST_USERS.paralegal.password);

      await page1.goto('/');
      await page1.click('[data-testid="letter-card"]').first();
      const url = page1.url();

      await page2.goto(url);
      await page2.click('button:has-text("Comments")');

      // User 1 posts comment
      await page1.click('button:has-text("Comments")');
      const commentText = 'New comment at ' + Date.now();
      await fillField(page1, 'textarea[name="comment"]', commentText);
      await page1.click('button:has-text("Post Comment")');

      // Wait for sync
      await page2.waitForTimeout(1000);

      // User 2 should see the comment
      await expect(page2.locator(`text=${commentText}`)).toBeVisible();

      await context1.close();
      await context2.close();
    });
  });

  test.describe('Offline Support', () => {
    test('should queue changes when offline', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await loginUser(page, TEST_USERS.attorney.email, TEST_USERS.attorney.password);

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      // Go offline
      await page.context().setOffline(true);

      // Make changes
      await page.fill('[data-testid="letter-editor"]', 'Offline edit');

      // Should show offline indicator
      await expect(page.locator('text=Offline')).toBeVisible();

      // Go back online
      await page.context().setOffline(false);

      // Should sync changes
      await page.waitForTimeout(2000);
      await expect(page.locator('text=Synced')).toBeVisible();

      await context.close();
    });

    test('should show conflict resolution UI for conflicting offline changes', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await loginUser(page, TEST_USERS.attorney.email, TEST_USERS.attorney.password);

      await page.goto('/');
      await page.click('[data-testid="letter-card"]').first();

      // Simulate conflict (this would need backend support)
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('collaboration:conflict', {
          detail: {
            local: 'Local version',
            remote: 'Remote version',
          },
        }));
      });

      // Should show conflict resolution dialog
      await expect(page.locator('[data-testid="conflict-dialog"]')).toBeVisible();

      await context.close();
    });
  });

  test.describe('Version Sync', () => {
    test('should reload when document updated remotely', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      await loginUser(page1, TEST_USERS.attorney.email, TEST_USERS.attorney.password);
      await loginUser(page2, TEST_USERS.paralegal.email, TEST_USERS.paralegal.password);

      await page1.goto('/');
      await page1.click('[data-testid="letter-card"]').first();
      const url = page1.url();

      await page2.goto(url);

      // User 2 saves major changes
      await page2.fill('[data-testid="letter-editor"]', 'Major update');
      await page2.click('button:has-text("Save")');

      // Wait for sync
      await page1.waitForTimeout(2000);

      // User 1 should see updated content
      const editor1 = page1.locator('[data-testid="letter-editor"]');
      await expect(editor1).toHaveValue('Major update');

      await context1.close();
      await context2.close();
    });
  });
});
