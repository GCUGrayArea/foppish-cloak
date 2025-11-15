/**
 * Jest Configuration for Integration Tests
 *
 * Separate configuration for integration tests that require database,
 * external services, and longer timeouts.
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/integration/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        rootDir: '.',
        baseUrl: '.',
        paths: {
          '@/*': ['services/api/src/*']
        },
        moduleResolution: 'node',
        esModuleInterop: true,
        skipLibCheck: true,
        resolveJsonModule: true,
      }
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/services/api/src/$1',
  },
  // Module resolution - look in services/api/node_modules for dependencies
  modulePaths: ['<rootDir>/services/api/node_modules'],
  moduleDirectories: ['node_modules', 'services/api/node_modules'],
  // Longer timeout for integration tests (10 seconds per test)
  testTimeout: 10000,
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup/jest.setup.ts'],
  // Don't collect coverage for integration tests by default (too slow)
  collectCoverage: false,
  // Ensure tests run serially to avoid database conflicts
  maxWorkers: 1,
  // Verbose output
  verbose: true,
};
