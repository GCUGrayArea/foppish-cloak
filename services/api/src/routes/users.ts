/**
 * User API Routes
 *
 * Endpoints for user management:
 * - GET /users/me - Get current user profile
 * - PUT /users/:id - Update user profile
 * - PUT /users/:id/role - Change user role (admin only)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { UserService } from '../services/UserService';
import { AuthenticatedRequest } from '../middleware/firmContext';

const router = Router();
const userService = new UserService();

/**
 * Validation schemas
 */
const UpdateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional()
});

const UpdateRoleSchema = z.object({
  role: z.enum(['admin', 'attorney', 'paralegal'])
});

/**
 * GET /users/me
 * Get current user's profile
 */
router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
    }

    const profile = await userService.getUserProfile(user.id, user.firmId);

    res.json(profile);
  } catch (error: any) {
    console.error('Get user profile error:', error);

    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

/**
 * PUT /users/:id
 * Update user profile
 * Users can update their own profile, admins can update any user in their firm
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
    }

    // Validate request body
    const validation = UpdateUserSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        code: 'INVALID_INPUT',
        details: validation.error.errors
      });
    }

    const updates = validation.data;

    // Update user
    const updatedUser = await userService.updateUser(
      userId,
      user.firmId,
      updates,
      user.id,
      user.role
    );

    const response = userService.toResponse(updatedUser);

    res.json(response);
  } catch (error: any) {
    console.error('Update user error:', error);

    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    if (error.message === 'INSUFFICIENT_PERMISSIONS') {
      return res.status(403).json({ error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' });
    }

    if (error.message === 'EMAIL_CONFLICT') {
      return res.status(409).json({ error: 'Email already in use', code: 'EMAIL_CONFLICT' });
    }

    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

/**
 * PUT /users/:id/role
 * Change user role (admin only)
 */
router.put('/:id/role', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
    }

    // Only admins can change roles
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required', code: 'INSUFFICIENT_PERMISSIONS' });
    }

    // Validate request body
    const validation = UpdateRoleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        code: 'INVALID_INPUT',
        details: validation.error.errors
      });
    }

    const { role } = validation.data;

    // Update role
    const updatedUser = await userService.updateUserRole(
      userId,
      user.firmId,
      role,
      user.id,
      user.role
    );

    const response = userService.toResponse(updatedUser);

    res.json(response);
  } catch (error: any) {
    console.error('Update user role error:', error);

    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    if (error.message === 'CANNOT_MODIFY_SELF') {
      return res.status(400).json({ error: 'Cannot change your own role', code: 'CANNOT_MODIFY_SELF' });
    }

    if (error.message === 'INSUFFICIENT_PERMISSIONS') {
      return res.status(403).json({ error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' });
    }

    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

export default router;
