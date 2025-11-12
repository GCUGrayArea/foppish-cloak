import { Pool } from 'pg';
import { AuthService } from '../../services/api/src/auth/AuthService';
import * as passwordModule from '../../services/api/src/auth/password';
import * as jwtModule from '../../services/api/src/auth/jwt';
import * as tokenModule from '../../services/api/src/auth/token';

// Mock dependencies
jest.mock('../../services/api/src/db/connection');
jest.mock('../../services/api/src/auth/password');
jest.mock('../../services/api/src/auth/jwt');
jest.mock('../../services/api/src/auth/token');

describe('AuthService', () => {
  let authService: AuthService;
  let mockPool: jest.Mocked<Pool>;

  const testUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    firm_id: '223e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    password_hash: 'hashed_password',
    first_name: 'John',
    last_name: 'Doe',
    role: 'attorney',
    is_active: true
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock pool
    mockPool = {
      query: jest.fn() as any
    } as jest.Mocked<Pool>;

    // Mock getPool to return our mock pool
    const connectionModule = require('../../services/api/src/db/connection');
    connectionModule.getPool = jest.fn().mockReturnValue(mockPool);

    authService = new AuthService();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      // Setup mocks
      (passwordModule.validatePasswordStrength as jest.Mock).mockReturnValue({
        valid: true
      });
      (passwordModule.hashPassword as jest.Mock).mockResolvedValue(
        'hashed_password'
      );
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // Check existing user
        .mockResolvedValueOnce({ rows: [testUser] }); // Insert user

      const request = {
        email: 'test@example.com',
        password: 'StrongP@ss123',
        firstName: 'John',
        lastName: 'Doe',
        firmId: '223e4567-e89b-12d3-a456-426614174000'
      };

      const result = await authService.register(request);

      expect(result.userId).toBe(testUser.id);
      expect(result.email).toBe(testUser.email);
      expect(result.firmId).toBe(testUser.firm_id);
      expect(passwordModule.hashPassword).toHaveBeenCalledWith(request.password);
    });

    it('should throw error if user already exists', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [testUser] });

      const request = {
        email: 'test@example.com',
        password: 'StrongP@ss123',
        firstName: 'John',
        lastName: 'Doe',
        firmId: '223e4567-e89b-12d3-a456-426614174000'
      };

      await expect(authService.register(request)).rejects.toThrow(
        'USER_ALREADY_EXISTS'
      );
    });

    it('should throw error for weak password', async () => {
      (passwordModule.validatePasswordStrength as jest.Mock).mockReturnValue({
        valid: false,
        error: 'Password too weak'
      });

      const request = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
        firmId: '223e4567-e89b-12d3-a456-426614174000'
      };

      await expect(authService.register(request)).rejects.toThrow(
        'WEAK_PASSWORD'
      );
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      (passwordModule.verifyPassword as jest.Mock).mockResolvedValue(true);
      (jwtModule.generateAccessToken as jest.Mock).mockReturnValue('jwt_token');
      (tokenModule.generateRefreshToken as jest.Mock).mockReturnValue(
        'refresh_token'
      );
      (tokenModule.storeRefreshToken as jest.Mock).mockResolvedValue(
        'token_id'
      );
(mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [testUser] });

      const request = {
        email: 'test@example.com',
        password: 'StrongP@ss123',
        firmId: '223e4567-e89b-12d3-a456-426614174000'
      };

      const result = await authService.login(request);

      expect(result.accessToken).toBe('jwt_token');
      expect(result.refreshToken).toBe('refresh_token');
      expect(result.user.id).toBe(testUser.id);
      expect(result.user.email).toBe(testUser.email);
    });

    it('should throw error for invalid credentials', async () => {
(mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const request = {
        email: 'test@example.com',
        password: 'wrong_password',
        firmId: '223e4567-e89b-12d3-a456-426614174000'
      };

      await expect(authService.login(request)).rejects.toThrow(
        'INVALID_CREDENTIALS'
      );
    });

    it('should throw error for inactive user', async () => {
      const inactiveUser = { ...testUser, is_active: false };
(mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [inactiveUser] });

      const request = {
        email: 'test@example.com',
        password: 'StrongP@ss123',
        firmId: '223e4567-e89b-12d3-a456-426614174000'
      };

      await expect(authService.login(request)).rejects.toThrow('USER_INACTIVE');
    });

    it('should throw error for wrong password', async () => {
      (passwordModule.verifyPassword as jest.Mock).mockResolvedValue(false);
(mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [testUser] });

      const request = {
        email: 'test@example.com',
        password: 'wrong_password',
        firmId: '223e4567-e89b-12d3-a456-426614174000'
      };

      await expect(authService.login(request)).rejects.toThrow(
        'INVALID_CREDENTIALS'
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should successfully refresh access token', async () => {
      (tokenModule.verifyRefreshToken as jest.Mock).mockResolvedValue(
        testUser.id
      );
      (jwtModule.generateAccessToken as jest.Mock).mockReturnValue(
        'new_jwt_token'
      );
(mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [testUser] });

      const result = await authService.refreshAccessToken('refresh_token');

      expect(result.accessToken).toBe('new_jwt_token');
    });

    it('should throw error for invalid refresh token', async () => {
      (tokenModule.verifyRefreshToken as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.refreshAccessToken('invalid_token')
      ).rejects.toThrow('INVALID_TOKEN');
    });

    it('should throw error for inactive user', async () => {
      const inactiveUser = { ...testUser, is_active: false };
      (tokenModule.verifyRefreshToken as jest.Mock).mockResolvedValue(
        testUser.id
      );
(mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [inactiveUser] });

      await expect(
        authService.refreshAccessToken('refresh_token')
      ).rejects.toThrow('USER_INACTIVE');
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      (tokenModule.invalidateRefreshToken as jest.Mock).mockResolvedValue(true);

      await authService.logout('refresh_token');

      expect(tokenModule.invalidateRefreshToken).toHaveBeenCalledWith(
        'refresh_token'
      );
    });
  });

  describe('forgotPassword', () => {
    it('should initiate password reset for existing user', async () => {
      (tokenModule.generateRefreshToken as jest.Mock).mockReturnValue(
        'reset_token'
      );
      (passwordModule.hashPassword as jest.Mock).mockResolvedValue(
        'hashed_token'
      );
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [testUser] }) // Find user
        .mockResolvedValueOnce({ rows: [] }); // Insert token

      await authService.forgotPassword('test@example.com', testUser.firm_id);

      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should not throw error for non-existent user (security)', async () => {
(mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        authService.forgotPassword('nonexistent@example.com', testUser.firm_id)
      ).resolves.not.toThrow();
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password', async () => {
      (passwordModule.validatePasswordStrength as jest.Mock).mockReturnValue({
        valid: true
      });
      (passwordModule.hashPassword as jest.Mock).mockResolvedValue(
        'new_hashed_password'
      );
      (tokenModule.invalidateAllUserTokens as jest.Mock).mockResolvedValue(2);

      // Mock private method behavior
      authService['verifyResetToken'] = jest
        .fn()
        .mockResolvedValue(testUser.id);
      authService['markResetTokenUsed'] = jest.fn().mockResolvedValue(undefined);

(mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Update password

      await authService.resetPassword('reset_token', 'NewP@ss123');

      expect(passwordModule.hashPassword).toHaveBeenCalledWith('NewP@ss123');
      expect(tokenModule.invalidateAllUserTokens).toHaveBeenCalledWith(
        testUser.id
      );
    });

    it('should throw error for invalid reset token', async () => {
      authService['verifyResetToken'] = jest.fn().mockResolvedValue(null);

      await expect(
        authService.resetPassword('invalid_token', 'NewP@ss123')
      ).rejects.toThrow('INVALID_RESET_TOKEN');
    });

    it('should throw error for weak new password', async () => {
      (passwordModule.validatePasswordStrength as jest.Mock).mockReturnValue({
        valid: false,
        error: 'Password too weak'
      });

      await expect(
        authService.resetPassword('reset_token', 'weak')
      ).rejects.toThrow('WEAK_PASSWORD');
    });
  });
});
