"""
One-time Lambda function to run database migrations
Deploy this, invoke it once, then delete it
"""

import json
import os
import boto3

# Migration SQL embedded directly
MIGRATIONS = {
    '001_initial_schema.sql': '''
-- Migration: 001 Initial Schema
-- Description: Create all tables for demand letter generator with multi-tenant architecture

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'attorney', 'paralegal');
CREATE TYPE virus_scan_status AS ENUM ('pending', 'clean', 'infected');
CREATE TYPE letter_status AS ENUM ('draft', 'analyzing', 'generating', 'refining', 'complete', 'archived');
CREATE TYPE change_type AS ENUM ('initial', 'ai_generation', 'manual_edit', 'ai_refinement');

-- TABLE: firms (Multi-tenant root)
CREATE TABLE firms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_firms_created_at ON firms(created_at);

-- TABLE: users (Belongs to firm)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'paralegal',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_email_per_firm UNIQUE (firm_id, email)
);
CREATE INDEX idx_users_firm_id ON users(firm_id);
CREATE INDEX idx_users_firm_email ON users(firm_id, email);
CREATE INDEX idx_users_firm_role ON users(firm_id, role);

-- TABLE: refresh_tokens (Session management)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- TABLE: templates (Firm-specific templates)
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    current_version_id UUID,
    is_default BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_templates_firm_id ON templates(firm_id);
CREATE INDEX idx_templates_firm_default ON templates(firm_id, is_default);
CREATE INDEX idx_templates_firm_name ON templates(firm_id, name);

-- TABLE: template_versions (Version history)
CREATE TABLE template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_template_version UNIQUE (template_id, version_number)
);
CREATE INDEX idx_template_versions_template_id ON template_versions(template_id);

-- TABLE: documents (Uploaded documents)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    original_filename VARCHAR(255) NOT NULL,
    s3_key VARCHAR(512) NOT NULL,
    s3_bucket VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100),
    virus_scan_status virus_scan_status DEFAULT 'pending',
    virus_scan_result TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_documents_firm_id ON documents(firm_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_virus_status ON documents(virus_scan_status);

-- TABLE: demand_letters (Demand letter instances)
CREATE TABLE demand_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    status letter_status DEFAULT 'draft',
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    extracted_data JSONB DEFAULT '{}',
    current_content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_demand_letters_firm_id ON demand_letters(firm_id);
CREATE INDEX idx_demand_letters_created_by ON demand_letters(created_by);
CREATE INDEX idx_demand_letters_status ON demand_letters(status);

-- TABLE: letter_revisions (Revision history)
CREATE TABLE letter_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    letter_id UUID NOT NULL REFERENCES demand_letters(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    change_type change_type NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    change_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_letter_revision UNIQUE (letter_id, revision_number)
);
CREATE INDEX idx_letter_revisions_letter_id ON letter_revisions(letter_id);
'''
}

def lambda_handler(event, context):
    """Run migrations"""

    try:
        import psycopg2
    except ImportError:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'psycopg2 not available - use Lambda layer'})
        }

    # Get database credentials from Secrets Manager
    secrets_client = boto3.client('secretsmanager', region_name='us-east-1')
    secret = secrets_client.get_secret_value(SecretId='demand-letters-dev/database/master')
    db_config = json.loads(secret['SecretString'])

    conn = None
    results = []

    try:
        # Connect to database
        conn = psycopg2.connect(db_config['database_url'])
        conn.autocommit = True
        cursor = conn.cursor()

        # Create migrations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)
        results.append('Migrations table ready')

        # Get applied migrations
        cursor.execute('SELECT filename FROM schema_migrations')
        applied = set(row[0] for row in cursor.fetchall())

        # Run each migration
        for filename, sql in sorted(MIGRATIONS.items()):
            if filename in applied:
                results.append(f'{filename}: already applied')
                continue

            try:
                cursor.execute(sql)
                cursor.execute('INSERT INTO schema_migrations (filename) VALUES (%s)', (filename,))
                results.append(f'{filename}: SUCCESS')
            except Exception as e:
                results.append(f'{filename}: FAILED - {str(e)}')
                raise

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Migrations completed',
                'results': results
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'results': results
            })
        }
    finally:
        if conn:
            conn.close()
