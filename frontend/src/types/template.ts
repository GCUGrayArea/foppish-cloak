/**
 * Template-related types for frontend
 *
 * These types match the backend API responses from services/api/src/types/template.ts
 */

/**
 * Template list item from GET /templates
 */
export interface TemplateListItem {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  currentVersion: {
    id: string;
    versionNumber: number;
    variableCount: number;
    createdAt: string;
  } | null;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Detailed template from GET /templates/:id
 */
export interface TemplateDetail {
  id: string;
  firmId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  currentVersion: {
    id: string;
    versionNumber: number;
    content: string;
    variables: string[];
    createdBy: {
      id: string;
      name: string;
    };
    createdAt: string;
  } | null;
  versionHistory: VersionHistoryItem[];
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Version history item
 */
export interface VersionHistoryItem {
  id: string;
  versionNumber: number;
  createdBy: string;
  createdAt: string;
}

/**
 * Template list response with pagination
 */
export interface TemplateListResponse {
  templates: TemplateListItem[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Create template request body
 */
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  content: string;
  isDefault?: boolean;
}

/**
 * Update template request body
 */
export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  content?: string;
}

/**
 * Rollback template request body
 */
export interface RollbackTemplateRequest {
  versionId: string;
}

/**
 * Template query parameters
 */
export interface TemplateQueryParams {
  isDefault?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Standard template variables available for insertion
 */
export const TEMPLATE_VARIABLES = [
  { name: 'plaintiff_name', label: 'Plaintiff Name', description: 'Name of the plaintiff/claimant' },
  { name: 'plaintiff_address', label: 'Plaintiff Address', description: 'Address of plaintiff' },
  { name: 'defendant_name', label: 'Defendant Name', description: 'Name of the defendant' },
  { name: 'defendant_address', label: 'Defendant Address', description: 'Address of defendant' },
  { name: 'case_number', label: 'Case Number', description: 'Case reference number' },
  { name: 'incident_date', label: 'Incident Date', description: 'Date of incident' },
  { name: 'incident_location', label: 'Incident Location', description: 'Location where incident occurred' },
  { name: 'total_damages', label: 'Total Damages', description: 'Total damages being claimed' },
  { name: 'medical_expenses', label: 'Medical Expenses', description: 'Medical costs' },
  { name: 'property_damages', label: 'Property Damages', description: 'Property damage costs' },
  { name: 'lost_wages', label: 'Lost Wages', description: 'Lost income' },
  { name: 'demand_amount', label: 'Demand Amount', description: 'Total amount being demanded' },
  { name: 'deadline_date', label: 'Deadline Date', description: 'Response deadline date' },
  { name: 'attorney_name', label: 'Attorney Name', description: 'Attorney name' },
  { name: 'attorney_signature', label: 'Attorney Signature', description: 'Attorney signature block' },
] as const;

/**
 * Template variable definition
 */
export interface TemplateVariable {
  name: string;
  label: string;
  description: string;
}
