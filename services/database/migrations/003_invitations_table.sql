-- Migration 003: Add invitations table
-- Created: 2025-11-11
-- Purpose: Support user invitation system for PR-005

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'attorney', 'paralegal')),
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_invitations_firm_id ON invitations(firm_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_firm_email ON invitations(firm_id, email);
CREATE INDEX idx_invitations_firm_pending ON invitations(firm_id, used, expires_at) WHERE used = false;

-- Add comment
COMMENT ON TABLE invitations IS 'User invitations for firms - supports email-based user onboarding';
COMMENT ON COLUMN invitations.token IS 'Unique token for invitation acceptance (UUID)';
COMMENT ON COLUMN invitations.expires_at IS 'Invitation expiry date (typically 7 days from creation)';
COMMENT ON COLUMN invitations.used IS 'Whether the invitation has been accepted';
COMMENT ON COLUMN invitations.invited_by IS 'User who created this invitation (admin)';
