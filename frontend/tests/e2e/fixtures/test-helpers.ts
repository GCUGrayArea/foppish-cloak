import { Page, expect } from '@playwright/test';
import path from 'path';

/**
 * Wait for API response helper
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 10000
): Promise<any> {
  const response = await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );

  return response.json();
}

/**
 * Upload file helper
 */
export async function uploadFile(
  page: Page,
  inputSelector: string,
  fileName: string
): Promise<void> {
  const filePath = path.join(__dirname, 'test-files', fileName);
  await page.setInputFiles(inputSelector, filePath);
}

/**
 * Drag and drop file helper
 */
export async function dragAndDropFile(
  page: Page,
  dropZoneSelector: string,
  fileName: string
): Promise<void> {
  const filePath = path.join(__dirname, 'test-files', fileName);

  // Create DataTransfer and File
  const buffer = await page.evaluate(async (filePath) => {
    const response = await fetch(`file://${filePath}`);
    const buffer = await response.arrayBuffer();
    return Array.from(new Uint8Array(buffer));
  }, filePath);

  // Simulate drag and drop
  await page.evaluate(
    async ({ selector, fileName, buffer }) => {
      const dropZone = document.querySelector(selector);
      if (!dropZone) throw new Error('Drop zone not found');

      const file = new File([new Uint8Array(buffer)], fileName, {
        type: 'application/pdf',
      });

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });

      dropZone.dispatchEvent(dropEvent);
    },
    { selector: dropZoneSelector, fileName, buffer }
  );
}

/**
 * Wait for element to be visible
 */
export async function waitForVisible(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Fill form field with validation
 */
export async function fillField(
  page: Page,
  selector: string,
  value: string
): Promise<void> {
  await page.fill(selector, value);
  await expect(page.locator(selector)).toHaveValue(value);
}

/**
 * Click and wait for navigation
 */
export async function clickAndNavigate(
  page: Page,
  selector: string,
  expectedUrl?: string
): Promise<void> {
  await Promise.all([
    page.waitForNavigation({ timeout: 10000 }),
    page.click(selector),
  ]);

  if (expectedUrl) {
    expect(page.url()).toContain(expectedUrl);
  }
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(
  page: Page,
  name: string
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Check for accessibility violations (basic check)
 */
export async function checkAccessibility(page: Page): Promise<void> {
  // Check for basic accessibility requirements
  const checks = [
    // All images should have alt text
    page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.every((img) => img.hasAttribute('alt'));
    }),
    // All form inputs should have labels
    page.evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll('input:not([type="hidden"])')
      );
      return inputs.every((input) => {
        const label = document.querySelector(`label[for="${input.id}"]`);
        return label !== null || input.hasAttribute('aria-label');
      });
    }),
    // All buttons should have accessible names
    page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.every(
        (btn) =>
          btn.textContent?.trim() ||
          btn.hasAttribute('aria-label') ||
          btn.hasAttribute('title')
      );
    }),
  ];

  const results = await Promise.all(checks);
  expect(results.every((r) => r)).toBeTruthy();
}

/**
 * Wait for loading to complete
 */
export async function waitForLoadingComplete(
  page: Page,
  timeout = 10000
): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Get toast message text
 */
export async function getToastMessage(page: Page): Promise<string | null> {
  try {
    const toast = await page.waitForSelector('[role="alert"]', {
      timeout: 5000,
    });
    return toast.textContent();
  } catch {
    return null;
  }
}

/**
 * Wait for toast to appear with specific text
 */
export async function waitForToast(
  page: Page,
  expectedText: string
): Promise<void> {
  const toast = await page.waitForSelector(
    `[role="alert"]:has-text("${expectedText}")`,
    { timeout: 5000 }
  );
  await expect(toast).toBeVisible();
}
