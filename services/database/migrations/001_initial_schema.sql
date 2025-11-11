-- Migration: 001 Initial Schema
-- Description: Create all tables for demand letter generator with multi-tenant architecture
-- Created: 2025-11-11

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================================================
-- ENUMS
-- ===========================================================================

-- User roles within a firm
CREATE TYPE user_role AS ENUM ('admin', 'attorney', 'paralegal');

-- Document virus scan status
CREATE TYPE virus_scan_status AS ENUM ('pending', 'clean', 'infected');

-- Demand letter workflow status
CREATE TYPE letter_status AS ENUM ('draft', 'analyzing', 'generating', 'refining', 'complete', 'archived');

-- Letter revision change types
CREATE TYPE change_type AS ENUM ('initial', 'ai_generation', 'manual_edit', 'ai_refinement');

-- ===========================================================================
-- TABLE: firms (Multi-tenant root)
-- ===========================================================================

CREATE TABLE firms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_firms_created_at ON firms(created_at);

-- ===========================================================================
-- TABLE: users (Belongs to firm)
-- ===========================================================================

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

-- ===========================================================================
-- TABLE: refresh_tokens (Session management)
-- ===========================================================================

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

-- ===========================================================================
-- TABLE: templates (Firm-specific templates)
-- ===========================================================================

CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    current_version_id UUID, -- Will be set after template_versions created
    is_default BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_firm_id ON templates(firm_id);
CREATE INDEX idx_templates_firm_default ON templates(firm_id, is_default);
CREATE INDEX idx_templates_firm_name ON templates(firm_id, name);

-- ===========================================================================
-- TABLE: template_versions (Version history)
-- ===========================================================================

CREATE TABLE template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_template_version UNIQUE (template_id, version_number)
);

CREATE INDEX idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX idx_template_versions_template_version ON template_versions(template_id, version_number);

-- Add foreign key constraint from templates to template_versions
ALTER TABLE templates
    ADD CONSTRAINT fk_templates_current_version
    FOREIGN KEY (current_version_id)
    REFERENCES template_versions(id)
    ON DELETE SET NULL;

-- ===========================================================================
-- TABLE: documents (Source documents)
-- ===========================================================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    filename VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    s3_bucket VARCHAR(255) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    virus_scan_status virus_scan_status DEFAULT 'pending',
    virus_scan_date TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_firm_id ON documents(firm_id);
CREATE INDEX idx_documents_firm_uploaded_by ON documents(firm_id, uploaded_by);
CREATE INDEX idx_documents_firm_created_at ON documents(firm_id, created_at);
CREATE INDEX idx_documents_virus_scan_status ON documents(virus_scan_status);

-- ===========================================================================
-- TABLE: demand_letters (Demand letter projects)
-- ===========================================================================

CREATE TABLE demand_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    status letter_status DEFAULT 'draft',
    current_content TEXT,
    extracted_data JSONB DEFAULT '{}',
    generation_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_demand_letters_firm_id ON demand_letters(firm_id);
CREATE INDEX idx_demand_letters_firm_created_by ON demand_letters(firm_id, created_by);
CREATE INDEX idx_demand_letters_firm_status ON demand_letters(firm_id, status);
CREATE INDEX idx_demand_letters_firm_created_at ON demand_letters(firm_id, created_at);
CREATE INDEX idx_demand_letters_template_id ON demand_letters(template_id);

-- ===========================================================================
-- TABLE: letter_revisions (Revision history)
-- ===========================================================================

CREATE TABLE letter_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    letter_id UUID NOT NULL REFERENCES demand_letters(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    revision_number INTEGER NOT NULL,
    change_type change_type NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    change_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_letter_revision UNIQUE (letter_id, revision_number)
);

CREATE INDEX idx_letter_revisions_letter_id ON letter_revisions(letter_id);
CREATE INDEX idx_letter_revisions_letter_revision ON letter_revisions(letter_id, revision_number);

-- ===========================================================================
-- TABLE: letter_documents (Many-to-many: letters to source documents)
-- ===========================================================================

CREATE TABLE letter_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    letter_id UUID NOT NULL REFERENCES demand_letters(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_letter_document UNIQUE (letter_id, document_id)
);

CREATE INDEX idx_letter_documents_letter_id ON letter_documents(letter_id);
CREATE INDEX idx_letter_documents_document_id ON letter_documents(document_id);

-- ===========================================================================
-- TRIGGERS: Automatic timestamp updates
-- ===========================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_firms_updated_at BEFORE UPDATE ON firms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_demand_letters_updated_at BEFORE UPDATE ON demand_letters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================================================
-- COMMENTS: Documentation for schema
-- ===========================================================================

COMMENT ON TABLE firms IS 'Multi-tenant root table - each firm is a separate tenant';
COMMENT ON TABLE users IS 'Users belong to firms with role-based access control';
COMMENT ON TABLE refresh_tokens IS 'Refresh tokens for JWT authentication session management';
COMMENT ON TABLE templates IS 'Firm-specific demand letter templates with versioning';
COMMENT ON TABLE template_versions IS 'Version history for templates to track changes';
COMMENT ON TABLE documents IS 'Source documents uploaded to S3 with metadata';
COMMENT ON TABLE demand_letters IS 'Demand letter projects with workflow status';
COMMENT ON TABLE letter_revisions IS 'Revision history for demand letters';
COMMENT ON TABLE letter_documents IS 'Junction table linking letters to source documents';

COMMENT ON COLUMN firms.settings IS 'Firm-level configuration as JSONB';
COMMENT ON COLUMN users.is_active IS 'Soft delete flag for users';
COMMENT ON COLUMN templates.current_version_id IS 'Points to the active version of this template';
COMMENT ON COLUMN template_versions.variables IS 'List of required template variables as JSONB array';
COMMENT ON COLUMN documents.metadata IS 'Extracted metadata from document as JSONB';
COMMENT ON COLUMN demand_letters.extracted_data IS 'Structured data extracted from documents as JSONB';
COMMENT ON COLUMN demand_letters.generation_metadata IS 'AI generation details (tokens, model, etc.) as JSONB';
