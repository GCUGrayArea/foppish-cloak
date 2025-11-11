/**
 * Firm-related types and interfaces
 */

/**
 * Firm settings structure (stored as JSONB in database)
 */
export interface FirmSettings {
  logoUrl?: string;
  primaryColor?: string;
  defaultTemplateId?: string;
  emailSignature?: string;
  [key: string]: any; // Allow additional custom settings
}

/**
 * Complete firm data from database
 */
export interface Firm {
  id: string;
  name: string;
  settings: FirmSettings;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request to update firm details
 */
export interface UpdateFirmRequest {
  name?: string;
  settings?: Partial<FirmSettings>;
}

/**
 * Response when getting firm details
 */
export interface FirmResponse {
  id: string;
  name: string;
  settings: FirmSettings;
  createdAt: string;
  updatedAt: string;
}

/**
 * Firm error codes
 */
export enum FirmErrorCode {
  FIRM_NOT_FOUND = 'FIRM_NOT_FOUND',
  INVALID_FIRM_DATA = 'INVALID_FIRM_DATA',
  UNAUTHORIZED_FIRM_ACCESS = 'UNAUTHORIZED_FIRM_ACCESS'
}
