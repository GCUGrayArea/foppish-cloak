import { test as base, Page } from '@playwright/test';

/**
 * Test user credentials for different roles
 */
export const TEST_USERS = {
  admin: {
    email: 'admin@testfirm.com',
    password: 'Admin123!@#',
    firmName: 'Test Law Firm',
  },
  attorney: {
    email: 'attorney@testfirm.com',
    password: 'Attorney123!@#',
    firmName: 'Test Law Firm',
  },
  paralegal: {
    email: 'paralegal@testfirm.com',
    password: 'Paralegal123!@#',
    firmName: 'Test Law Firm',
  },
  newUser: {
    email: `test-${Date.now()}@example.com`,
    password: 'NewUser123!@#',
    firstName: 'Test',
    lastName: 'User',
    firmName: `Test Firm ${Date.now()}`,
  },
};

/**
 * Extended test type with authenticated context
 */
type AuthenticatedTestFixtures = {
  authenticatedPage: Page;
};

/**
 * Login helper function
 */
export async function loginUser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for navigation after login
  await page.waitForURL('/', { timeout: 10000 });
}

/**
 * Register new user helper function
 */
export async function registerUser(
  page: Page,
  userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    firmName: string;
  }
): Promise<void> {
  await page.goto('/register');
  await page.fill('input[name="firstName"]', userData.firstName);
  await page.fill('input[name="lastName"]', userData.lastName);
  await page.fill('input[name="email"]', userData.email);
  await page.fill('input[name="password"]', userData.password);
  await page.fill('input[name="confirmPassword"]', userData.password);
  await page.fill('input[name="firmName"]', userData.firmName);

  await page.click('button[type="submit"]');

  // Wait for successful registration
  await page.waitForURL('/', { timeout: 10000 });
}

/**
 * Logout helper function
 */
export async function logoutUser(page: Page): Promise<void> {
  await page.click('button[aria-label="User menu"]');
  await page.click('text=Logout');
  await page.waitForURL('/login', { timeout: 5000 });
}

/**
 * Test fixture with authenticated page
 */
export const test = base.extend<AuthenticatedTestFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Login before each test
    await loginUser(page, TEST_USERS.attorney.email, TEST_USERS.attorney.password);

    // Provide authenticated page to test
    await use(page);

    // Cleanup: logout after test
    try {
      await logoutUser(page);
    } catch (error) {
      // Ignore logout errors during cleanup
      console.log('Logout cleanup failed:', error);
    }
  },
});

export { expect } from '@playwright/test';
