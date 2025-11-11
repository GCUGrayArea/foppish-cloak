import { Pool, PoolClient, PoolConfig, QueryResult } from 'pg';

// Database connection configuration
const poolConfig: PoolConfig = {
  // Connection string from environment variable
  connectionString: process.env.DATABASE_URL,

  // Pool settings for optimal performance
  max: 10, // Maximum number of clients in the pool
  min: 2, // Minimum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection can't be established

  // SSL configuration (required for production RDS)
  ssl:
    process.env.NODE_ENV === 'production'
      ? {
          rejectUnauthorized: false, // AWS RDS requires this
        }
      : undefined,
};

// Create connection pool
const pool = new Pool(poolConfig);

// Pool error handler
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Pool connection event logging (development only)
if (process.env.NODE_ENV === 'development') {
  pool.on('connect', () => {
    console.log('Database client connected');
  });

  pool.on('acquire', () => {
    console.log('Database client acquired from pool');
  });

  pool.on('remove', () => {
    console.log('Database client removed from pool');
  });
}

/**
 * Execute a query with automatic connection management
 * @param text SQL query text
 * @param params Query parameters
 * @returns Query result
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    // Log slow queries (> 1 second)
    if (duration > 1000) {
      console.warn('Slow query detected:', {
        text,
        duration: `${duration}ms`,
        rows: result.rowCount,
      });
    }

    return result;
  } catch (error) {
    console.error('Database query error:', {
      text,
      params,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get a client from the pool for transaction management
 * @returns Pool client
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

/**
 * Execute multiple queries in a transaction
 * @param callback Transaction callback
 * @returns Transaction result
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test database connectivity
 * @returns True if connection successful
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as now, version() as version');
    console.log('Database connection successful:', {
      timestamp: result.rows[0].now,
      version: result.rows[0].version.split(',')[0], // Shortened version string
    });
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Close all connections in the pool
 * Should be called on application shutdown
 */
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('Database pool closed');
}

/**
 * Get pool statistics
 * @returns Pool stats
 */
export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

// Export pool for direct access if needed (advanced use cases)
export { pool };

// Helper type for query results with firm_id scoping
export interface FirmScopedQuery {
  firm_id: string;
  [key: string]: any;
}

/**
 * Validate that a query result belongs to the expected firm
 * @param rows Query result rows
 * @param expectedFirmId Expected firm ID
 * @throws Error if firm_id doesn't match
 */
export function validateFirmScope<T extends FirmScopedQuery>(
  rows: T[],
  expectedFirmId: string
): void {
  for (const row of rows) {
    if (row.firm_id !== expectedFirmId) {
      throw new Error(
        `Firm ID mismatch: expected ${expectedFirmId}, got ${row.firm_id}`
      );
    }
  }
}

/**
 * Build a WHERE clause for firm-scoped queries
 * @param firmId Firm ID to scope by
 * @param additionalConditions Additional WHERE conditions
 * @returns WHERE clause string and parameters
 */
export function buildFirmScopedWhere(
  firmId: string,
  additionalConditions?: { clause: string; params: any[] }
): { clause: string; params: any[] } {
  const baseclause = 'WHERE firm_id = $1';
  const baseParams = [firmId];

  if (!additionalConditions) {
    return { clause: baseclause, params: baseParams };
  }

  // Adjust parameter placeholders in additional conditions
  const adjustedClause = additionalConditions.clause.replace(
    /\$(\d+)/g,
    (match, num) => `$${parseInt(num) + 1}`
  );

  return {
    clause: `${baseclause} AND ${adjustedClause}`,
    params: [...baseParams, ...additionalConditions.params],
  };
}

export default {
  query,
  getClient,
  transaction,
  testConnection,
  closePool,
  getPoolStats,
  validateFirmScope,
  buildFirmScopedWhere,
};
