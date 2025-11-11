#!/usr/bin/env node

/**
 * Database Migration Runner
 *
 * This script runs SQL migrations from services/database/migrations/
 * It's a simple migration system that executes .sql files in order.
 *
 * Usage:
 *   npm run migrate        - Run all pending migrations
 *   npm run migrate:down   - Rollback last migration (if down migration exists)
 *   npm run migrate:status - Show migration status
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : undefined,
});

const MIGRATIONS_DIR = path.join(__dirname, '../../../database/migrations');
const MIGRATIONS_TABLE = 'schema_migrations';

/**
 * Ensure migrations table exists
 */
async function ensureMigrationsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(sql);
  console.log('✓ Migrations table ready');
}

/**
 * Get list of applied migrations
 */
async function getAppliedMigrations(): Promise<string[]> {
  const result = await pool.query(
    `SELECT filename FROM ${MIGRATIONS_TABLE} ORDER BY id`
  );
  return result.rows.map((row) => row.filename);
}

/**
 * Get list of migration files
 */
function getMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    return [];
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

/**
 * Run a migration
 */
async function runMigration(filename: string): Promise<void> {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filePath, 'utf8');

  console.log(`→ Running migration: ${filename}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Execute migration SQL
    await client.query(sql);

    // Record migration
    await client.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1)`,
      [filename]
    );

    await client.query('COMMIT');
    console.log(`✓ Migration completed: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`✗ Migration failed: ${filename}`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run all pending migrations
 */
async function migrate(): Promise<void> {
  console.log('Starting database migrations...\n');

  await ensureMigrationsTable();

  const appliedMigrations = await getAppliedMigrations();
  const migrationFiles = getMigrationFiles();

  const pendingMigrations = migrationFiles.filter(
    (file) => !appliedMigrations.includes(file)
  );

  if (pendingMigrations.length === 0) {
    console.log('✓ No pending migrations');
    return;
  }

  console.log(`Found ${pendingMigrations.length} pending migration(s)\n`);

  for (const migration of pendingMigrations) {
    await runMigration(migration);
  }

  console.log(`\n✓ All migrations completed successfully`);
}

/**
 * Show migration status
 */
async function showStatus(): Promise<void> {
  await ensureMigrationsTable();

  const appliedMigrations = await getAppliedMigrations();
  const migrationFiles = getMigrationFiles();

  console.log('\nMigration Status:\n');
  console.log('Applied migrations:');
  if (appliedMigrations.length === 0) {
    console.log('  (none)');
  } else {
    appliedMigrations.forEach((m) => console.log(`  ✓ ${m}`));
  }

  const pendingMigrations = migrationFiles.filter(
    (file) => !appliedMigrations.includes(file)
  );

  console.log('\nPending migrations:');
  if (pendingMigrations.length === 0) {
    console.log('  (none)');
  } else {
    pendingMigrations.forEach((m) => console.log(`  ○ ${m}`));
  }
  console.log();
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2] || 'up';

  try {
    switch (command) {
      case 'up':
      case 'migrate':
        await migrate();
        break;
      case 'status':
        await showStatus();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log('Usage: npm run migrate [up|status]');
        process.exit(1);
    }
  } catch (error) {
    console.error('\nMigration error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { migrate, showStatus };
