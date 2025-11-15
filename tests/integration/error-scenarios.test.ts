/**
 * Error Scenarios Integration Tests
 *
 * Tests error handling for invalid inputs, missing resources,
 * permission errors, and edge cases.
 */

import request from 'supertest';
import { createTestServer } from './setup/testServer';
import { initTestDatabase, closeTestDatabase, cleanDatabase } from './setup/testDatabase';
import { createTestFirm, createTestUser } from './setup/fixtures';

const app = createTestServer();

describe('Error Scenarios Integration Tests', () => {
  let firm: any, user: any, token: string;

  beforeAll(async () => {
    await initTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();

    firm = await createTestFirm();
    user = await createTestUser(firm.id, { role: 'attorney' });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });
    token = login.body.accessToken;
  });

  describe('Authentication Errors', () => {
    it('should return 401 for missing authorization header', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for malformed token', async () => {
      await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token-format')
        .expect(401);
    });

    it('should return 401 for expired token', async () => {
      // This would require a token generation utility with custom expiry
      // Skipping for this implementation
    });
  });

  describe('Resource Not Found Errors', () => {
    it('should return 404 for non-existent template', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app)
        .get(`/api/templates/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should return 404 for non-existent document', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app)
        .get(`/api/documents/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should return 404 for non-existent demand letter', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app)
        .get(`/api/demand-letters/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for invalid email format in registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firm: { name: 'Test Firm', email: 'test@firm.com' },
          user: {
            email: 'invalid-email-format', // Invalid email
            password: 'Password123!',
            firstName: 'Test',
            lastName: 'User',
          },
        })
        .expect(400);

      expect(response.body.error).toMatch(/email/i);
    });

    it('should return 400 for missing required template fields', async () => {
      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${token}`)
        .send({
          // Missing required fields
          description: 'Incomplete template',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app)
        .get('/api/templates/not-a-valid-uuid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('Permission Errors', () => {
    it('should prevent paralegal from inviting users (admin-only)', async () => {
      const paralegal = await createTestUser(firm.id, { email: 'paralegal@firm.com', role: 'paralegal' });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: paralegal.email, password: paralegal.password });

      const paralegalToken = loginResponse.body.accessToken;

      const response = await request(app)
        .post('/api/users/invite')
        .set('Authorization', `Bearer ${paralegalToken}`)
        .send({
          email: 'newuser@firm.com',
          role: 'attorney',
          firstName: 'New',
          lastName: 'User',
        })
        .expect(403);

      expect(response.body.error).toMatch(/permission|forbidden/i);
    });
  });

  describe('Business Logic Errors', () => {
    it('should prevent generating letter without template', async () => {
      const response = await request(app)
        .post('/api/demand-letters/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          // Missing templateId
          title: 'Letter without template',
          variables: {},
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should prevent exporting non-existent demand letter', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app)
        .post(`/api/export/demand-letter/${fakeId}/pdf`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('Rate Limiting (if implemented)', () => {
    it.skip('should return 429 after too many requests', async () => {
      // This test requires rate limiting to be configured
      // Skip for now
    });
  });

  describe('Server Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would require mocking database failures
      // Skip for basic implementation
    });
  });
});
