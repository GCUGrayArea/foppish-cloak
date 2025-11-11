// Shared database types for the API service
// These correspond to the PostgreSQL schema enums and common types

export type UserRole = 'admin' | 'attorney' | 'paralegal';

export type VirusScanStatus = 'pending' | 'clean' | 'infected';

export type LetterStatus =
  | 'draft'
  | 'analyzing'
  | 'generating'
  | 'refining'
  | 'complete'
  | 'archived';

export type ChangeType =
  | 'initial'
  | 'ai_generation'
  | 'manual_edit'
  | 'ai_refinement';

// Base interface for all models with timestamps
export interface BaseModel {
  id: string; // UUID
  created_at: Date;
  updated_at?: Date;
}

// Firm model interface
export interface Firm extends BaseModel {
  name: string;
  settings: Record<string, any>; // JSONB
}

// User model interface
export interface User extends BaseModel {
  firm_id: string; // UUID
  email: string;
  password_hash: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  is_active: boolean;
}

// Refresh token interface
export interface RefreshToken {
  id: string; // UUID
  user_id: string; // UUID
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

// Template model interface
export interface Template extends BaseModel {
  firm_id: string; // UUID
  name: string;
  description?: string;
  current_version_id?: string; // UUID
  is_default: boolean;
  created_by: string; // UUID
}

// Template version interface
export interface TemplateVersion {
  id: string; // UUID
  template_id: string; // UUID
  version_number: number;
  content: string;
  variables: string[]; // JSONB array
  created_by: string; // UUID
  created_at: Date;
}

// Document model interface
export interface Document extends BaseModel {
  firm_id: string; // UUID
  uploaded_by: string; // UUID
  filename: string;
  file_type: string;
  file_size: number; // BIGINT
  s3_bucket: string;
  s3_key: string;
  virus_scan_status: VirusScanStatus;
  virus_scan_date?: Date;
  metadata: Record<string, any>; // JSONB
}

// Demand letter model interface
export interface DemandLetter extends BaseModel {
  firm_id: string; // UUID
  created_by: string; // UUID
  template_id?: string; // UUID
  title: string;
  status: LetterStatus;
  current_content?: string;
  extracted_data: Record<string, any>; // JSONB
  generation_metadata: Record<string, any>; // JSONB
}

// Letter revision interface
export interface LetterRevision {
  id: string; // UUID
  letter_id: string; // UUID
  content: string;
  revision_number: number;
  change_type: ChangeType;
  changed_by: string; // UUID
  change_notes?: string;
  created_at: Date;
}

// Letter document junction interface
export interface LetterDocument {
  id: string; // UUID
  letter_id: string; // UUID
  document_id: string; // UUID
  created_at: Date;
}

// DTOs (Data Transfer Objects) for API responses
// These exclude sensitive fields like password_hash

export interface UserDTO {
  id: string;
  firm_id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface FirmDTO {
  id: string;
  name: string;
  settings: Record<string, any>;
  created_at: Date;
  updated_at?: Date;
}

export interface TemplateDTO {
  id: string;
  firm_id: string;
  name: string;
  description?: string;
  current_version_id?: string;
  current_version?: TemplateVersion;
  is_default: boolean;
  created_by: string;
  created_at: Date;
  updated_at?: Date;
}

export interface DocumentDTO {
  id: string;
  firm_id: string;
  uploaded_by: string;
  filename: string;
  file_type: string;
  file_size: number;
  virus_scan_status: VirusScanStatus;
  virus_scan_date?: Date;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at?: Date;
  // Note: s3_bucket and s3_key are not exposed - use signed URLs instead
}

export interface DemandLetterDTO {
  id: string;
  firm_id: string;
  created_by: string;
  template_id?: string;
  title: string;
  status: LetterStatus;
  current_content?: string;
  extracted_data: Record<string, any>;
  generation_metadata: Record<string, any>;
  created_at: Date;
  updated_at?: Date;
}

// Query result types for joins
export interface TemplateWithVersion extends Template {
  current_version?: TemplateVersion;
}

export interface DemandLetterWithDetails extends DemandLetter {
  template?: Template;
  documents?: Document[];
  latest_revision?: LetterRevision;
}
