#!/usr/bin/env python3
"""Simple migration runner using psycopg2"""

import os
import sys
from urllib.parse import urlparse

try:
    import psycopg2
except ImportError:
    print("Error: psycopg2 not installed. Install with: pip install psycopg2-binary")
    sys.exit(1)

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("Error: DATABASE_URL environment variable is required")
    sys.exit(1)

# Parse DATABASE_URL
url = urlparse(DATABASE_URL)
conn_params = {
    'host': url.hostname,
    'port': url.port or 5432,
    'database': url.path[1:],  # Remove leading /
    'user': url.username,
    'password': url.password
}

MIGRATIONS_DIR = 'services/database/migrations'

def run_migrations():
    try:
        print('Connecting to database...')
        conn = psycopg2.connect(**conn_params)
        conn.autocommit = True
        cursor = conn.cursor()
        print('✓ Connected')

        # Create migrations table
        print('Creating migrations table...')
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print('✓ Migrations table ready')

        # Get applied migrations
        cursor.execute('SELECT filename FROM schema_migrations ORDER BY filename')
        applied = set(row[0] for row in cursor.fetchall())
        print(f'Applied migrations: {len(applied)}')

        # Get migration files
        import glob
        files = sorted([os.path.basename(f) for f in glob.glob(f'{MIGRATIONS_DIR}/*.sql')])
        print(f'Total migration files: {len(files)}')

        # Run pending migrations
        for file in files:
            if file in applied:
                print(f'⊘ {file} (already applied)')
                continue

            print(f'→ Running {file}...')
            with open(f'{MIGRATIONS_DIR}/{file}', 'r') as f:
                sql = f.read()

            try:
                cursor.execute(sql)
                cursor.execute('INSERT INTO schema_migrations (filename) VALUES (%s)', (file,))
                print(f'✓ {file} applied successfully')
            except Exception as e:
                print(f'✗ {file} failed: {e}')
                raise

        print('\n✓ All migrations completed successfully!')

        cursor.close()
        conn.close()

    except Exception as e:
        print(f'\n✗ Migration error: {e}')
        sys.exit(1)

if __name__ == '__main__':
    run_migrations()
