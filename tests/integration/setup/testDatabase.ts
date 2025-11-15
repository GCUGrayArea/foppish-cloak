/**
 * Test Database Setup and Utilities
 *
 * Provides database initialization, cleanup, and transaction management
 * for integration tests.
 */

import { Pool, PoolClient } from 'pg';
import { getPool } from '../../../services/api/src/db/connection';
import { runMigrations } from '../../../services/api/src/db/migrate';

let testPool: Pool | null = null;
let activeClient: PoolClient | null = null;

/**
 * Initialize test database connection
 * Runs migrations and ensures test database is ready
 */
export async function initTestDatabase(): Promise<Pool> {
  if (testPool) {
    return testPool;
  }

  // Get the database pool (will use TEST_DATABASE_URL from env if available)
  testPool = getPool();

  try {
    // Run migrations to ensure schema is up to date
    await runMigrations('up');

    console.log('Test database initialized and migrations complete');
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    throw error;
  }

  return testPool;
}

/**
 * Clean up test database connection
 * Should be called in afterAll hooks
 */
export async function closeTestDatabase(): Promise<void> {
  if (activeClient) {
    await activeClient.release();
    activeClient = null;
  }

  if (testPool) {
    await testPool.end();
    testPool = null;
  }
}

/**
 * Begin a transaction for test isolation
 * Returns a client that should be used for all queries in the test
 */
export async function beginTransaction(): Promise<PoolClient> {
  if (!testPool) {
    throw new Error('Test database not initialized. Call initTestDatabase() first.');
  }

  const client = await testPool.connect();
  await client.query('BEGIN');
  activeClient = client;

  return client;
}

/**
 * Rollback transaction and release client
 * Should be called in afterEach hooks to ensure test isolation
 */
export async function rollbackTransaction(): Promise<void> {
  if (activeClient) {
    try {
      await activeClient.query('ROLLBACK');
    } catch (error) {
      console.error('Error rolling back transaction:', error);
    } finally {
      activeClient.release();
      activeClient = null;
    }
  }
}

/**
 * Clean all test data from the database
 * WARNING: This deletes all data! Use with caution.
 */
export async function cleanDatabase(): Promise<void> {
  if (!testPool) {
    throw new Error('Test database not initialized.');
  }

  const tables = [
    'letter_revisions',
    'demand_letters',
    'documents',
    'template_versions',
    'templates',
    'user_invitations',
    'users',
    'firms',
  ];

  for (const table of tables) {
    await testPool.query(`TRUNCATE TABLE ${table} CASCADE`);
  }

  console.log('Test database cleaned');
}

/**
 * Execute a query with the active transaction client
 * If no transaction is active, uses the pool directly
 */
export async function query(sql: string, params?: any[]): Promise<any> {
  if (activeClient) {
    return activeClient.query(sql, params);
  }

  if (!testPool) {
    throw new Error('Test database not initialized.');
  }

  return testPool.query(sql, params);
}

/**
 * Get the test pool instance
 * Useful for direct pool access in tests
 */
export function getTestPool(): Pool {
  if (!testPool) {
    throw new Error('Test database not initialized. Call initTestDatabase() first.');
  }
  return testPool;
}
