/**
 * PostgreSQL database client for collaboration service
 * Provides connection pooling and query execution
 */

import { Pool, PoolConfig } from 'pg';
import { YjsDocument } from '../types';

class DatabaseClient {
  private pool: Pool | null = null;

  /**
   * Initialize database connection pool
   */
  initialize(config?: PoolConfig): void {
    const poolConfig: PoolConfig = config || {
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    };

    this.pool = new Pool(poolConfig);

    this.pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
    });
  }

  /**
   * Get database pool instance
   */
  getPool(): Pool {
    if (!this.pool) {
      this.initialize();
    }
    return this.pool!;
  }

  /**
   * Load Yjs document state from database
   */
  async loadYjsDocument(letterId: string, firmId: string): Promise<YjsDocument | null> {
    const query = `
      SELECT letter_id, firm_id, yjs_state, last_updated
      FROM collaboration_documents
      WHERE letter_id = $1 AND firm_id = $2
    `;

    const result = await this.getPool().query(query, [letterId, firmId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      letterId: row.letter_id,
      firmId: row.firm_id,
      yjsState: row.yjs_state,
      lastUpdated: row.last_updated,
    };
  }

  /**
   * Save Yjs document state to database
   */
  async saveYjsDocument(letterId: string, firmId: string, yjsState: Uint8Array): Promise<void> {
    const query = `
      INSERT INTO collaboration_documents (letter_id, firm_id, yjs_state)
      VALUES ($1, $2, $3)
      ON CONFLICT (letter_id)
      DO UPDATE SET yjs_state = $3, last_updated = CURRENT_TIMESTAMP
    `;

    await this.getPool().query(query, [letterId, firmId, Buffer.from(yjsState)]);
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

// Singleton instance
export const dbClient = new DatabaseClient();
