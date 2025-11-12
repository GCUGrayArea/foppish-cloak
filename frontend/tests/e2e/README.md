# End-to-End Tests

This directory contains Playwright E2E tests for the Demand Letter Generator frontend application.

## Test Structure

```
tests/e2e/
├── fixtures/
│   ├── auth.fixture.ts          # Authentication helpers and test users
│   ├── test-helpers.ts          # Common test utilities
│   └── test-files/              # Sample files for upload tests
├── auth.spec.ts                 # Authentication flow tests
├── document-upload.spec.ts      # Document upload and management tests
├── template-management.spec.ts  # Template CRUD and versioning tests
├── letter-workflow.spec.ts      # Demand letter creation and editing tests
├── export.spec.ts               # Export and download functionality tests
└── collaboration.spec.ts        # Real-time collaboration tests
```

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug tests
```bash
npm run test:e2e:debug
```

### Run specific browser
```bash
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:mobile
```

### View test report
```bash
npm run test:e2e:report
```

## Test Coverage

### Authentication (`auth.spec.ts`)
- Login with valid/invalid credentials
- User registration
- Password strength validation
- Password reset flow
- Logout and session management

### Document Upload (`document-upload.spec.ts`)
- File selection via input
- Drag-and-drop file upload
- File type and size validation
- Upload progress tracking
- Document list and filtering
- Document download and deletion

### Template Management (`template-management.spec.ts`)
- Template creation with variables
- Template editing and preview
- Template versioning and history
- Template duplication
- Template search and filtering
- Variable insertion and validation

### Letter Workflow (`letter-workflow.spec.ts`)
- Letter creation from template
- Letter editing with auto-save
- AI refinement and suggestions
- Variable population from documents
- Workflow status management
- Comments and collaboration
- Letter search and organization

### Export (`export.spec.ts`)
- Export to Word and PDF
- Bulk export with progress
- Print preview
- Email with attachments
- Export history
- Template import/export

### Collaboration (`collaboration.spec.ts`)
- User presence indicators
- Real-time editing sync
- Cursor position sharing
- Document locking
- Comments and mentions
- Offline support
- Conflict resolution

## Test Configuration

Tests are configured in `playwright.config.ts` with:
- Multiple browser support (Chromium, Firefox)
- Mobile viewport testing
- Automatic dev server startup
- Screenshots on failure
- Video recording on failure
- Trace collection on retry

## Test Data

Test users are defined in `fixtures/auth.fixture.ts`:
- **Admin**: Full access to all features
- **Attorney**: Can create and manage demand letters
- **Paralegal**: Can assist with document preparation

Test files are located in `fixtures/test-files/`:
- `sample-document.txt`: Basic text file for upload testing

## Writing New Tests

### Basic Test Structure
```typescript
import { test, expect } from './fixtures/auth.fixture';

test.describe('Feature Name', () => {
  test('should do something', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Test implementation
    await page.goto('/path');
    await expect(page.locator('selector')).toBeVisible();
  });
});
```

### Using Helpers
```typescript
import { waitForToast, fillField, waitForApiResponse } from './fixtures/test-helpers';

// Wait for toast notification
await waitForToast(page, 'Success message');

// Fill and validate field
await fillField(page, 'input[name="email"]', 'test@example.com');

// Wait for API call
await waitForApiResponse(page, '/api/endpoint');
```

### Testing Multi-User Scenarios
```typescript
test('should support collaboration', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  // Login as different users
  await loginUser(page1, TEST_USERS.attorney.email, TEST_USERS.attorney.password);
  await loginUser(page2, TEST_USERS.paralegal.email, TEST_USERS.paralegal.password);

  // Test collaboration
  // ...

  await context1.close();
  await context2.close();
});
```

## CI/CD Integration

Tests run automatically in CI with:
- Single worker for consistency
- 2 retries on failure
- Screenshots and videos on failure
- JUnit XML and JSON reports

## Debugging Tips

1. **Use UI mode**: `npm run test:e2e:ui` for interactive debugging
2. **Use debug mode**: `npm run test:e2e:debug` for step-by-step execution
3. **Check screenshots**: Located in `test-results/` on failure
4. **View traces**: Open HTML report to see detailed execution traces
5. **Run single test**: Add `.only` to test: `test.only('test name', ...)`

## Best Practices

1. **Use data-testid attributes**: Prefer `[data-testid="element"]` over CSS selectors
2. **Wait for elements**: Use `waitForSelector` instead of fixed timeouts
3. **Clean up after tests**: Close contexts and logout users
4. **Isolate tests**: Each test should be independent
5. **Use fixtures**: Leverage auth fixtures for authenticated tests
6. **Test user journeys**: Focus on complete workflows, not just features
7. **Keep tests maintainable**: Use helper functions for common operations

## Troubleshooting

### Tests timeout
- Increase timeout in `playwright.config.ts`
- Check if backend is running
- Verify network connectivity

### Tests fail intermittently
- Add proper wait conditions
- Check for race conditions
- Ensure test isolation

### Screenshots not capturing full page
- Use `screenshot({ fullPage: true })`
- Check viewport size configuration

### Collaboration tests fail
- Verify WebSocket connection
- Check if collaboration service is running
- Ensure proper cleanup between tests
