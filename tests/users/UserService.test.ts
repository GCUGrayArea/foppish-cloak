/**
 * UserService Unit Tests
 */

import { UserService } from '../../services/api/src/services/UserService';
import { Pool } from 'pg';

// Mock pool
const mockPool = {
  query: jest.fn()
} as unknown as Pool;

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService(mockPool);
    jest.clearAllMocks();
  });

  describe('listFirmUsers', () => {
    it('should list all users in a firm with pagination', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          firm_id: 'firm-123',
          email: 'user1@example.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'attorney',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: mockUsers });

      const result = await userService.listFirmUsers('firm-123', { page: 1, limit: 50 });

      expect(result.total).toBe(10);
      expect(result.users).toHaveLength(1);
      expect(result.users[0].email).toBe('user1@example.com');
    });

    it('should filter users by role', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [] });

      await userService.listFirmUsers('firm-123', { role: 'admin' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('role = $2'),
        expect.arrayContaining(['firm-123', 'admin'])
      );
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 'user-1',
        firm_id: 'firm-123',
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'attorney',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });

      const result = await userService.getUserById('user-1', 'firm-123');

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('user@example.com');
    });

    it('should throw error when user not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(userService.getUserById('nonexistent', 'firm-123'))
        .rejects
        .toThrow('USER_NOT_FOUND');
    });

    it('should throw error when user belongs to different firm', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(userService.getUserById('user-1', 'wrong-firm'))
        .rejects
        .toThrow('USER_NOT_FOUND');
    });
  });

  describe('updateUser', () => {
    it('should allow users to update their own profile', async () => {
      const existingUser = {
        id: 'user-1',
        firm_id: 'firm-123',
        email: 'old@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'attorney',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const updatedUser = {
        ...existingUser,
        first_name: 'Jane'
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [existingUser] }) // getUserById
        .mockResolvedValueOnce({ rows: [updatedUser] }); // update

      const result = await userService.updateUser(
        'user-1',
        'firm-123',
        { firstName: 'Jane' },
        'user-1',
        'attorney'
      );

      expect(result.firstName).toBe('Jane');
    });

    it('should allow admins to update any user', async () => {
      const existingUser = {
        id: 'user-2',
        firm_id: 'firm-123',
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'attorney',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [existingUser] })
        .mockResolvedValueOnce({ rows: [existingUser] });

      await expect(
        userService.updateUser('user-2', 'firm-123', { firstName: 'Jane' }, 'admin-1', 'admin')
      ).resolves.toBeDefined();
    });

    it('should deny non-admin from updating other users', async () => {
      const existingUser = {
        id: 'user-2',
        firm_id: 'firm-123',
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'attorney',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [existingUser] });

      await expect(
        userService.updateUser('user-2', 'firm-123', { firstName: 'Jane' }, 'user-1', 'attorney')
      ).rejects.toThrow('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('updateUserRole', () => {
    it('should allow admin to change user role', async () => {
      const existingUser = {
        id: 'user-1',
        firm_id: 'firm-123',
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'paralegal',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const updatedUser = { ...existingUser, role: 'attorney' };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [existingUser] })
        .mockResolvedValueOnce({ rows: [updatedUser] });

      const result = await userService.updateUserRole(
        'user-1',
        'firm-123',
        'attorney',
        'admin-1',
        'admin'
      );

      expect(result.role).toBe('attorney');
    });

    it('should prevent non-admin from changing roles', async () => {
      await expect(
        userService.updateUserRole('user-1', 'firm-123', 'admin', 'user-2', 'attorney')
      ).rejects.toThrow('INSUFFICIENT_PERMISSIONS');
    });

    it('should prevent user from changing their own role', async () => {
      const existingUser = {
        id: 'admin-1',
        firm_id: 'firm-123',
        email: 'admin@example.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [existingUser] });

      await expect(
        userService.updateUserRole('admin-1', 'firm-123', 'admin', 'admin-1', 'admin')
      ).rejects.toThrow('CANNOT_MODIFY_SELF');
    });
  });

  describe('removeUser', () => {
    it('should soft delete user (set is_active = false)', async () => {
      const existingUser = {
        id: 'user-1',
        firm_id: 'firm-123',
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'attorney',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [existingUser] })
        .mockResolvedValueOnce({ rowCount: 1 });

      await expect(
        userService.removeUser('user-1', 'firm-123', 'admin-1', 'admin')
      ).resolves.toBeUndefined();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = false'),
        ['user-1', 'firm-123']
      );
    });

    it('should prevent non-admin from removing users', async () => {
      await expect(
        userService.removeUser('user-1', 'firm-123', 'user-2', 'attorney')
      ).rejects.toThrow('INSUFFICIENT_PERMISSIONS');
    });

    it('should prevent user from removing themselves', async () => {
      await expect(
        userService.removeUser('admin-1', 'firm-123', 'admin-1', 'admin')
      ).rejects.toThrow('CANNOT_MODIFY_SELF');
    });
  });
});
