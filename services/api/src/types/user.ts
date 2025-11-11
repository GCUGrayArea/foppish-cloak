/**
 * User management types and interfaces
 */

import { UserRole } from './auth';

/**
 * User data from database (excluding sensitive fields)
 */
export interface User {
  id: string;
  firmId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User list response with pagination
 */
export interface UserListResponse {
  users: UserResponse[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Single user response (public fields only)
 */
export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

/**
 * Request to update user profile
 */
export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
}

/**
 * Request to change user role (admin only)
 */
export interface UpdateUserRoleRequest {
  role: UserRole;
}

/**
 * Request to invite a new user
 */
export interface InviteUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

/**
 * Invitation data stored in database
 */
export interface Invitation {
  id: string;
  firmId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  token: string;
  expiresAt: Date;
  used: boolean;
  invitedBy: string;
  createdAt: Date;
}

/**
 * Invitation response (public fields only)
 */
export interface InvitationResponse {
  id: string;
  email: string;
  role: UserRole;
  expiresAt: string;
  status: 'pending' | 'used' | 'expired';
}

/**
 * Complete user profile response (includes firm info)
 */
export interface UserProfileResponse extends UserResponse {
  firmId: string;
  firmName: string;
}

/**
 * Query filters for listing users
 */
export interface UserListFilters {
  role?: UserRole;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

/**
 * User management error codes
 */
export enum UserErrorCode {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  INVITATION_EXPIRED = 'INVITATION_EXPIRED',
  INVITATION_USED = 'INVITATION_USED',
  INVITATION_NOT_FOUND = 'INVITATION_NOT_FOUND',
  CANNOT_MODIFY_SELF = 'CANNOT_MODIFY_SELF',
  INVALID_ROLE = 'INVALID_ROLE',
  EMAIL_CONFLICT = 'EMAIL_CONFLICT',
  INVALID_USER_DATA = 'INVALID_USER_DATA'
}
