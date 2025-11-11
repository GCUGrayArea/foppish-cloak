/**
 * InvitationService Unit Tests
 */

import { InvitationService } from '../../services/api/src/services/InvitationService';
import { Pool } from 'pg';

// Mock pool
const mockPool = {
  query: jest.fn()
} as unknown as Pool;

describe('InvitationService', () => {
  let invitationService: InvitationService;

  beforeEach(() => {
    invitationService = new InvitationService(mockPool);
    jest.clearAllMocks();
  });

  describe('inviteUser', () => {
    it('should create invitation when user does not exist', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // Check existing user
        .mockResolvedValueOnce({ rows: [] }) // Check pending invitation
        .mockResolvedValueOnce({
          rows: [{
            id: 'invite-123',
            firm_id: 'firm-123',
            email: 'newuser@example.com',
            first_name: 'New',
            last_name: 'User',
            role: 'attorney',
            token: 'token-123',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            used: false,
            invited_by: 'admin-1',
            created_at: new Date()
          }]
        }); // Create invitation

      const result = await invitationService.inviteUser(
        'firm-123',
        {
          email: 'newuser@example.com',
          firstName: 'New',
          lastName: 'User',
          role: 'attorney'
        },
        'admin-1'
      );

      expect(result.email).toBe('newuser@example.com');
      expect(result.status).toBe('pending');
    });

    it('should throw error when user already exists', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'existing-user' }]
      });

      await expect(
        invitationService.inviteUser(
          'firm-123',
          {
            email: 'existing@example.com',
            firstName: 'Existing',
            lastName: 'User',
            role: 'attorney'
          },
          'admin-1'
        )
      ).rejects.toThrow('USER_ALREADY_EXISTS');
    });

    it('should throw error when pending invitation exists', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // No existing user
        .mockResolvedValueOnce({ rows: [{ id: 'pending-invite' }] }); // Pending invitation exists

      await expect(
        invitationService.inviteUser(
          'firm-123',
          {
            email: 'pending@example.com',
            firstName: 'Pending',
            lastName: 'User',
            role: 'attorney'
          },
          'admin-1'
        )
      ).rejects.toThrow('INVITATION_ALREADY_PENDING');
    });
  });

  describe('validateInvitation', () => {
    it('should return invitation when valid', async () => {
      const mockInvitation = {
        id: 'invite-123',
        firm_id: 'firm-123',
        email: 'user@example.com',
        first_name: 'New',
        last_name: 'User',
        role: 'attorney',
        token: 'valid-token',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires tomorrow
        used: false,
        invited_by: 'admin-1',
        created_at: new Date()
      };

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockInvitation] });

      const result = await invitationService.validateInvitation('valid-token');

      expect(result.email).toBe('user@example.com');
      expect(result.used).toBe(false);
    });

    it('should throw error when invitation not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(invitationService.validateInvitation('invalid-token'))
        .rejects
        .toThrow('INVITATION_NOT_FOUND');
    });

    it('should throw error when invitation already used', async () => {
      const mockInvitation = {
        id: 'invite-123',
        firm_id: 'firm-123',
        email: 'user@example.com',
        first_name: 'New',
        last_name: 'User',
        role: 'attorney',
        token: 'used-token',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        used: true, // Already used
        invited_by: 'admin-1',
        created_at: new Date()
      };

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockInvitation] });

      await expect(invitationService.validateInvitation('used-token'))
        .rejects
        .toThrow('INVITATION_USED');
    });

    it('should throw error when invitation expired', async () => {
      const mockInvitation = {
        id: 'invite-123',
        firm_id: 'firm-123',
        email: 'user@example.com',
        first_name: 'New',
        last_name: 'User',
        role: 'attorney',
        token: 'expired-token',
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
        used: false,
        invited_by: 'admin-1',
        created_at: new Date()
      };

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockInvitation] });

      await expect(invitationService.validateInvitation('expired-token'))
        .rejects
        .toThrow('INVITATION_EXPIRED');
    });
  });

  describe('acceptInvitation', () => {
    it('should mark invitation as used', async () => {
      const mockInvitation = {
        id: 'invite-123',
        firm_id: 'firm-123',
        email: 'user@example.com',
        first_name: 'New',
        last_name: 'User',
        role: 'attorney',
        token: 'valid-token',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        used: false,
        invited_by: 'admin-1',
        created_at: new Date()
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockInvitation] }) // validateInvitation
        .mockResolvedValueOnce({ rowCount: 1 }); // mark as used

      await expect(invitationService.acceptInvitation('valid-token'))
        .resolves
        .toBeUndefined();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('used = true'),
        ['valid-token']
      );
    });
  });

  describe('listFirmInvitations', () => {
    it('should list pending invitations by default', async () => {
      const mockInvitations = [
        {
          id: 'invite-1',
          firm_id: 'firm-123',
          email: 'user1@example.com',
          first_name: 'User',
          last_name: 'One',
          role: 'attorney',
          token: 'token-1',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          used: false,
          invited_by: 'admin-1',
          created_at: new Date()
        }
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: mockInvitations });

      const result = await invitationService.listFirmInvitations('firm-123', true);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('pending');
    });
  });
});
