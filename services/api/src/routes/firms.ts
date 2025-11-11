/**
 * Firm API Routes
 *
 * Endpoints for firm management:
 * - GET /firms/:id - Get firm details
 * - PUT /firms/:id - Update firm settings
 * - GET /firms/:firmId/users - List firm users
 * - POST /firms/:firmId/users/invite - Invite new user
 * - DELETE /firms/:firmId/users/:userId - Remove user
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { FirmService } from '../services/FirmService';
import { UserService } from '../services/UserService';
import { InvitationService } from '../services/InvitationService';
import { AuthenticatedRequest } from '../middleware/firmContext';
import { sendInvitationEmail } from '../utils/email';

const router = Router();
const firmService = new FirmService();
const userService = new UserService();
const invitationService = new InvitationService();

/**
 * Validation schemas
 */
const UpdateFirmSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  settings: z.record(z.any()).optional()
});

const InviteUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(['admin', 'attorney', 'paralegal'])
});

const UserListFiltersSchema = z.object({
  role: z.enum(['admin', 'attorney', 'paralegal']).optional(),
  isActive: z.string().transform(val => val === 'true').optional(),
  page: z.string().transform(val => parseInt(val, 10)).optional(),
  limit: z.string().transform(val => parseInt(val, 10)).optional()
});

/**
 * GET /firms/:id
 * Get firm details (admin only)
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const firmId = req.params.id;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
    }

    // Verify user belongs to this firm
    if (user.firmId !== firmId) {
      return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
    }

    // Only admins can view full firm details
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required', code: 'INSUFFICIENT_PERMISSIONS' });
    }

    const firm = await firmService.getFirmById(firmId);
    const response = firmService.toResponse(firm);

    res.json(response);
  } catch (error: any) {
    console.error('Get firm error:', error);

    if (error.message === 'FIRM_NOT_FOUND') {
      return res.status(404).json({ error: 'Firm not found', code: 'FIRM_NOT_FOUND' });
    }

    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

/**
 * PUT /firms/:id
 * Update firm settings (admin only)
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const firmId = req.params.id;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
    }

    // Verify user belongs to this firm
    if (user.firmId !== firmId) {
      return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
    }

    // Only admins can update firm details
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required', code: 'INSUFFICIENT_PERMISSIONS' });
    }

    // Validate request body
    const validation = UpdateFirmSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        code: 'INVALID_INPUT',
        details: validation.error.errors
      });
    }

    const updates = validation.data;
    const updatedFirm = await firmService.updateFirm(firmId, updates);
    const response = firmService.toResponse(updatedFirm);

    res.json(response);
  } catch (error: any) {
    console.error('Update firm error:', error);

    if (error.message === 'FIRM_NOT_FOUND') {
      return res.status(404).json({ error: 'Firm not found', code: 'FIRM_NOT_FOUND' });
    }

    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /firms/:firmId/users
 * List all users in the firm
 */
router.get('/:firmId/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const firmId = req.params.firmId;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
    }

    // Verify user belongs to this firm
    if (user.firmId !== firmId) {
      return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
    }

    // Parse and validate query filters
    const validation = UserListFiltersSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        code: 'INVALID_INPUT',
        details: validation.error.errors
      });
    }

    const filters = validation.data;
    const result = await userService.listFirmUsers(firmId, filters);

    res.json(result);
  } catch (error: any) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

/**
 * POST /firms/:firmId/users/invite
 * Invite a new user to the firm (admin only)
 */
router.post('/:firmId/users/invite', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const firmId = req.params.firmId;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
    }

    // Verify user belongs to this firm
    if (user.firmId !== firmId) {
      return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
    }

    // Only admins can invite users
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required', code: 'INSUFFICIENT_PERMISSIONS' });
    }

    // Validate request body
    const validation = InviteUserSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        code: 'INVALID_INPUT',
        details: validation.error.errors
      });
    }

    const inviteData = validation.data;

    // Create invitation
    const invitation = await invitationService.inviteUser(
      firmId,
      inviteData,
      user.id
    );

    // Get firm details for email
    const firm = await firmService.getFirmById(firmId);

    // Send invitation email
    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invitation?token=${invitation.id}`;

    try {
      await sendInvitationEmail(inviteData.email, {
        firstName: inviteData.firstName,
        firmName: firm.name,
        inviterName: `${user.email}`, // Could be enhanced with full name
        role: inviteData.role,
        invitationLink
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Continue anyway - invitation was created
    }

    res.status(201).json({
      invitation,
      message: 'Invitation email sent'
    });
  } catch (error: any) {
    console.error('Invite user error:', error);

    if (error.message === 'USER_ALREADY_EXISTS') {
      return res.status(409).json({ error: 'User already exists in firm', code: 'USER_ALREADY_EXISTS' });
    }

    if (error.message === 'INVITATION_ALREADY_PENDING') {
      return res.status(409).json({ error: 'Invitation already pending for this email', code: 'INVITATION_ALREADY_PENDING' });
    }

    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

/**
 * DELETE /firms/:firmId/users/:userId
 * Remove user from firm (admin only)
 */
router.delete('/:firmId/users/:userId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const firmId = req.params.firmId;
    const userId = req.params.userId;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
    }

    // Verify user belongs to this firm
    if (user.firmId !== firmId) {
      return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
    }

    // Only admins can remove users
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required', code: 'INSUFFICIENT_PERMISSIONS' });
    }

    await userService.removeUser(userId, firmId, user.id, user.role);

    res.json({
      message: 'User removed successfully',
      userId
    });
  } catch (error: any) {
    console.error('Remove user error:', error);

    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    if (error.message === 'CANNOT_MODIFY_SELF') {
      return res.status(400).json({ error: 'Cannot delete yourself', code: 'CANNOT_MODIFY_SELF' });
    }

    if (error.message === 'INSUFFICIENT_PERMISSIONS') {
      return res.status(403).json({ error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' });
    }

    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

export default router;
