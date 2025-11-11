import {
  generateAccessToken,
  verifyAccessToken,
  decodeToken,
  isTokenExpired
} from '../../services/api/src/auth/jwt';

describe('JWT Utilities', () => {
  const testUserId = '123e4567-e89b-12d3-a456-426614174000';
  const testEmail = 'test@example.com';
  const testFirmId = '223e4567-e89b-12d3-a456-426614174000';
  const testRole = 'attorney' as const;

  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateAccessToken(
        testUserId,
        testEmail,
        testFirmId,
        testRole
      );

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include correct claims in token', () => {
      const token = generateAccessToken(
        testUserId,
        testEmail,
        testFirmId,
        testRole
      );

      const payload = verifyAccessToken(token);

      expect(payload.sub).toBe(testUserId);
      expect(payload.email).toBe(testEmail);
      expect(payload.firmId).toBe(testFirmId);
      expect(payload.role).toBe(testRole);
    });

    it('should include iat and exp claims', () => {
      const token = generateAccessToken(
        testUserId,
        testEmail,
        testFirmId,
        testRole
      );

      const payload = verifyAccessToken(token);

      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid token', () => {
      const token = generateAccessToken(
        testUserId,
        testEmail,
        testFirmId,
        testRole
      );

      const payload = verifyAccessToken(token);

      expect(payload).toBeDefined();
      expect(payload.sub).toBe(testUserId);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyAccessToken(invalidToken)).toThrow('INVALID_TOKEN');
    });

    it('should throw error for malformed token', () => {
      const malformedToken = 'not-a-jwt';

      expect(() => verifyAccessToken(malformedToken)).toThrow();
    });

    it('should throw error for empty token', () => {
      expect(() => verifyAccessToken('')).toThrow();
    });
  });

  describe('decodeToken', () => {
    it('should decode valid token without verification', () => {
      const token = generateAccessToken(
        testUserId,
        testEmail,
        testFirmId,
        testRole
      );

      const payload = decodeToken(token);

      expect(payload).toBeDefined();
      expect(payload?.sub).toBe(testUserId);
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      const payload = decodeToken(invalidToken);

      expect(payload).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const token = generateAccessToken(
        testUserId,
        testEmail,
        testFirmId,
        testRole
      );

      const expired = isTokenExpired(token);

      expect(expired).toBe(false);
    });

    it('should return false for invalid token (not expired, just invalid)', () => {
      const invalidToken = 'invalid.token.here';

      const expired = isTokenExpired(invalidToken);

      expect(expired).toBe(false);
    });
  });
});
