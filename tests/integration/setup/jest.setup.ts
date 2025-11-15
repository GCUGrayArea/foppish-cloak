/**
 * Jest Setup for Integration Tests
 *
 * Runs before all integration tests to configure environment.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for all tests globally
jest.setTimeout(10000);

// NOTE: AWS SDK mocking removed - tests will use real services or LocalStack
// If you need to mock AWS services, add mocks here

// Suppress console output during tests unless explicitly enabled
if (process.env.TEST_LOGGING !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error for actual errors
    error: console.error,
  };
}
