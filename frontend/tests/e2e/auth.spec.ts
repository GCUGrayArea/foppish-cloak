import { test, expect } from '@playwright/test';
import { TEST_USERS, loginUser, registerUser, logoutUser } from './fixtures/auth.fixture';
import { waitForToast, fillField } from './fixtures/test-helpers';

test.describe('Authentication Flow', () => {
  test.describe('Login', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
      await page.goto('/login');

      await fillField(page, 'input[name="email"]', TEST_USERS.attorney.email);
      await fillField(page, 'input[name="password"]', TEST_USERS.attorney.password);

      await page.click('button[type="submit"]');

      // Should redirect to home page
      await page.waitForURL('/', { timeout: 10000 });
      await expect(page).toHaveURL('/');

      // Should show user info in header
      await expect(page.locator('text=Dashboard')).toBeVisible();
    });

    test('should show error with invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await fillField(page, 'input[name="email"]', 'wrong@example.com');
      await fillField(page, 'input[name="password"]', 'WrongPassword123!');

      await page.click('button[type="submit"]');

      // Should show error message
      await waitForToast(page, 'Invalid credentials');

      // Should remain on login page
      await expect(page).toHaveURL(/.*login/);
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/login');

      // Try to submit without filling fields
      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.locator('text=Email is required')).toBeVisible();
      await expect(page.locator('text=Password is required')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/login');

      await fillField(page, 'input[name="email"]', 'invalid-email');
      await fillField(page, 'input[name="password"]', 'Password123!');

      await page.click('button[type="submit"]');

      // Should show email format error
      await expect(page.locator('text=Invalid email format')).toBeVisible();
    });

    test('should toggle password visibility', async ({ page }) => {
      await page.goto('/login');

      const passwordInput = page.locator('input[name="password"]');

      // Password should be hidden by default
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Click toggle button
      await page.click('button[aria-label="Toggle password visibility"]');

      // Password should be visible
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Click toggle again
      await page.click('button[aria-label="Toggle password visibility"]');

      // Password should be hidden again
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  test.describe('Registration', () => {
    test('should successfully register new user', async ({ page }) => {
      const newUser = {
        ...TEST_USERS.newUser,
        email: `test-${Date.now()}@example.com`,
        firmName: `Test Firm ${Date.now()}`,
      };

      await page.goto('/register');

      await fillField(page, 'input[name="firstName"]', newUser.firstName);
      await fillField(page, 'input[name="lastName"]', newUser.lastName);
      await fillField(page, 'input[name="email"]', newUser.email);
      await fillField(page, 'input[name="password"]', newUser.password);
      await fillField(page, 'input[name="confirmPassword"]', newUser.password);
      await fillField(page, 'input[name="firmName"]', newUser.firmName);

      await page.click('button[type="submit"]');

      // Should redirect to home after successful registration
      await page.waitForURL('/', { timeout: 10000 });
      await expect(page).toHaveURL('/');

      // Should show success message
      await waitForToast(page, 'Registration successful');
    });

    test('should validate password strength', async ({ page }) => {
      await page.goto('/register');

      await fillField(page, 'input[name="firstName"]', 'Test');
      await fillField(page, 'input[name="lastName"]', 'User');
      await fillField(page, 'input[name="email"]', 'test@example.com');
      await fillField(page, 'input[name="firmName"]', 'Test Firm');

      // Try weak password
      await fillField(page, 'input[name="password"]', 'weak');

      // Should show password strength indicator
      await expect(page.locator('text=Weak password')).toBeVisible();

      // Try strong password
      await fillField(page, 'input[name="password"]', 'Strong123!@#');

      // Should show strong password indicator
      await expect(page.locator('text=Strong password')).toBeVisible();
    });

    test('should validate password confirmation match', async ({ page }) => {
      await page.goto('/register');

      await fillField(page, 'input[name="firstName"]', 'Test');
      await fillField(page, 'input[name="lastName"]', 'User');
      await fillField(page, 'input[name="email"]', 'test@example.com');
      await fillField(page, 'input[name="password"]', 'Password123!');
      await fillField(page, 'input[name="confirmPassword"]', 'Different123!');
      await fillField(page, 'input[name="firmName"]', 'Test Firm');

      await page.click('button[type="submit"]');

      // Should show password mismatch error
      await expect(page.locator('text=Passwords do not match')).toBeVisible();
    });

    test('should validate all required fields', async ({ page }) => {
      await page.goto('/register');

      // Try to submit without filling fields
      await page.click('button[type="submit"]');

      // Should show all validation errors
      await expect(page.locator('text=First name is required')).toBeVisible();
      await expect(page.locator('text=Last name is required')).toBeVisible();
      await expect(page.locator('text=Email is required')).toBeVisible();
      await expect(page.locator('text=Password is required')).toBeVisible();
      await expect(page.locator('text=Firm name is required')).toBeVisible();
    });
  });

  test.describe('Password Reset', () => {
    test('should request password reset', async ({ page }) => {
      await page.goto('/forgot-password');

      await fillField(page, 'input[name="email"]', TEST_USERS.attorney.email);

      await page.click('button[type="submit"]');

      // Should show success message
      await waitForToast(page, 'Password reset email sent');
    });

    test('should validate email in forgot password', async ({ page }) => {
      await page.goto('/forgot-password');

      await page.click('button[type="submit"]');

      // Should show validation error
      await expect(page.locator('text=Email is required')).toBeVisible();
    });
  });

  test.describe('Logout', () => {
    test('should successfully logout', async ({ page }) => {
      // Login first
      await loginUser(page, TEST_USERS.attorney.email, TEST_USERS.attorney.password);

      // Should be on home page
      await expect(page).toHaveURL('/');

      // Logout
      await logoutUser(page);

      // Should redirect to login page
      await expect(page).toHaveURL(/.*login/);

      // Should not be able to access protected routes
      await page.goto('/');
      await page.waitForURL(/.*login/, { timeout: 5000 });
    });
  });

  test.describe('Session Management', () => {
    test('should persist session after page reload', async ({ page }) => {
      // Login
      await loginUser(page, TEST_USERS.attorney.email, TEST_USERS.attorney.password);

      // Reload page
      await page.reload();

      // Should still be authenticated
      await expect(page).toHaveURL('/');
      await expect(page.locator('text=Dashboard')).toBeVisible();
    });

    test('should redirect to login when accessing protected route without auth', async ({ page }) => {
      await page.goto('/documents');

      // Should redirect to login
      await page.waitForURL(/.*login/, { timeout: 5000 });
    });
  });
});
