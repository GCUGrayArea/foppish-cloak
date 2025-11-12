-- Migration: 004 Collaboration Documents
-- Description: Create table for storing Yjs CRDT document state for real-time collaboration
-- Created: 2025-11-12

-- ===========================================================================
-- TABLE: collaboration_documents (Yjs document persistence)
-- ===========================================================================

CREATE TABLE collaboration_documents (
    letter_id UUID PRIMARY KEY REFERENCES demand_letters(id) ON DELETE CASCADE,
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    yjs_state BYTEA NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for firm-scoped queries (multi-tenant isolation)
CREATE INDEX idx_collaboration_documents_firm_id ON collaboration_documents(firm_id);

-- Index for last_updated for cleanup and monitoring
CREATE INDEX idx_collaboration_documents_last_updated ON collaboration_documents(last_updated);

-- Trigger to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_collaboration_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_collaboration_documents_updated_at
    BEFORE UPDATE ON collaboration_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_collaboration_documents_updated_at();
