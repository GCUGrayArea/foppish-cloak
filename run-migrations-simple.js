// Simple migration runner without dependencies
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const MIGRATIONS_DIR = path.join(__dirname, 'services', 'database', 'migrations');

async function runMigrations() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✓ Connected');

    // Create migrations table
    console.log('Creating migrations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Migrations table ready');

    // Get applied migrations
    const result = await client.query('SELECT filename FROM schema_migrations ORDER BY filename');
    const applied = new Set(result.rows.map(r => r.filename));
    console.log(`Applied migrations: ${applied.size}`);

    // Get migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Total migration files: ${files.length}`);

    // Run pending migrations
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`⊘ ${file} (already applied)`);
        continue;
      }

      console.log(`→ Running ${file}...`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        console.log(`✓ ${file} applied successfully`);
      } catch (err) {
        console.error(`✗ ${file} failed:`, err.message);
        throw err;
      }
    }

    console.log('\n✓ All migrations completed successfully!');

  } catch (error) {
    console.error('\n✗ Migration error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
