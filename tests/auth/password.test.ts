import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength
} from '../../services/api/src/auth/password';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'Test@1234';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'Test@1234';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should throw error for empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow();
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'Test@1234';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'Test@1234';
      const wrongPassword = 'Wrong@5678';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hash = await hashPassword('Test@1234');
      const isValid = await verifyPassword('', hash);

      expect(isValid).toBe(false);
    });

    it('should return false for empty hash', async () => {
      const isValid = await verifyPassword('Test@1234', '');

      expect(isValid).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const result = validatePasswordStrength('StrongP@ssw0rd');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Test@1');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 8 characters');
    });

    it('should reject password without uppercase', () => {
      const result = validatePasswordStrength('test@1234');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = validatePasswordStrength('TEST@1234');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('Test@word');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('number');
    });

    it('should reject password without special character', () => {
      const result = validatePasswordStrength('TestWord1234');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('special character');
    });

    it('should reject empty password', () => {
      const result = validatePasswordStrength('');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });
  });
});
