/**
 * Template-related types and interfaces
 */

/**
 * Template version data from database
 */
export interface TemplateVersion {
  id: string;
  templateId: string;
  versionNumber: number;
  content: string;
  variables: string[];
  createdBy: string;
  createdAt: Date;
}

/**
 * Complete template data from database
 */
export interface Template {
  id: string;
  firmId: string;
  name: string;
  description: string | null;
  currentVersionId: string | null;
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Template with current version details
 */
export interface TemplateWithVersion extends Template {
  currentVersion: TemplateVersion | null;
}

/**
 * Request to create a new template
 */
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  content: string;
  isDefault?: boolean;
}

/**
 * Request to update template metadata or content
 */
export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  content?: string;
}

/**
 * List response for templates
 */
export interface TemplateListResponse {
  templates: TemplateListItem[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Individual template in list view
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
 * Detailed template response
 */
export interface TemplateDetailResponse {
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
 * Template query parameters
 */
export interface TemplateQueryParams {
  isDefault?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Template error codes
 */
export enum TemplateErrorCode {
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  VERSION_NOT_FOUND = 'VERSION_NOT_FOUND',
  INVALID_TEMPLATE_DATA = 'INVALID_TEMPLATE_DATA',
  UNAUTHORIZED_TEMPLATE_ACCESS = 'UNAUTHORIZED_TEMPLATE_ACCESS',
  TEMPLATE_NAME_EXISTS = 'TEMPLATE_NAME_EXISTS',
  INVALID_VARIABLE_SYNTAX = 'INVALID_VARIABLE_SYNTAX',
  NO_CONTENT_PROVIDED = 'NO_CONTENT_PROVIDED'
}
