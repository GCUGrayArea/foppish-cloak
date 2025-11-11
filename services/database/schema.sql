-- Complete Database Schema for Demand Letter Generator
-- This file is for reference only - actual schema is created via migrations
-- Generated: 2025-11-11

-- Multi-Tenant Architecture:
-- All data is scoped by firm_id to ensure tenant isolation
-- Queries must always include WHERE firm_id = ? to prevent cross-tenant data access

-- ============================================================================
-- Core Entities Overview:
-- ============================================================================
-- 1. firms - Multi-tenant root (1 firm = 1 tenant)
-- 2. users - Belongs to firm, has role (admin/attorney/paralegal)
-- 3. refresh_tokens - JWT refresh token management
-- 4. templates - Firm-specific letter templates
-- 5. template_versions - Template version history
-- 6. documents - Source documents stored in S3
-- 7. demand_letters - Demand letter projects
-- 8. letter_revisions - Letter revision history
-- 9. letter_documents - Many-to-many: letters ↔ documents

-- ============================================================================
-- Key Patterns:
-- ============================================================================
-- - UUID primary keys (gen_random_uuid())
-- - Foreign keys with CASCADE/SET NULL as appropriate
-- - Indexes on firm_id and foreign keys
-- - JSONB for flexible metadata storage
-- - ENUMs for controlled values
-- - Timestamps with timezone
-- - Automatic updated_at triggers

-- See migrations/001_initial_schema.sql for the actual DDL
-- This file documents the final schema structure and relationships

-- ============================================================================
-- Table Relationships:
-- ============================================================================
-- firms (1) → (N) users
-- firms (1) → (N) templates
-- firms (1) → (N) documents
-- firms (1) → (N) demand_letters
-- users (1) → (N) refresh_tokens
-- users (1) → (N) templates (created_by)
-- users (1) → (N) documents (uploaded_by)
-- users (1) → (N) demand_letters (created_by)
-- users (1) → (N) letter_revisions (changed_by)
-- templates (1) → (N) template_versions
-- templates (1) → (1) template_versions (current_version_id)
-- templates (1) → (N) demand_letters
-- demand_letters (1) → (N) letter_revisions
-- demand_letters (N) ↔ (N) documents (via letter_documents)

-- ============================================================================
-- Multi-Tenant Queries Example:
-- ============================================================================
-- CORRECT (with firm_id):
--   SELECT * FROM users WHERE firm_id = $1 AND email = $2;
--   SELECT * FROM demand_letters WHERE firm_id = $1 AND status = 'draft';
--
-- INCORRECT (missing firm_id - security vulnerability!):
--   SELECT * FROM users WHERE email = $1;
--   SELECT * FROM demand_letters WHERE status = 'draft';

-- ============================================================================
-- Index Strategy:
-- ============================================================================
-- 1. All foreign keys have indexes
-- 2. (firm_id, <common_query_column>) composite indexes
-- 3. Unique constraints where appropriate
-- 4. Timestamp indexes for ordering/filtering

-- ============================================================================
-- JSONB Fields:
-- ============================================================================
-- firms.settings: { "logo_url": "...", "preferences": {...} }
-- template_versions.variables: ["plaintiff_name", "case_number", ...]
-- documents.metadata: { "page_count": 10, "extracted_text": "...", ... }
-- demand_letters.extracted_data: { "parties": [...], "damages": [...], ... }
-- demand_letters.generation_metadata: { "model": "...", "tokens": 1000, ... }

-- ============================================================================
-- Schema Version: 1
-- Last Migration: 001_initial_schema.sql
-- ============================================================================
