/**
 * Authentication Flow Integration Tests
 *
 * Tests complete authentication workflows including registration,
 * login, token refresh, and logout.
 */

import request from 'supertest';
import { createTestServer } from './setup/testServer';
import { initTestDatabase, closeTestDatabase, cleanDatabase } from './setup/testDatabase';
import { createTestFirm } from './setup/fixtures';

const app = createTestServer();

describe('Authentication Flow Integration Tests', () => {
  beforeAll(async () => {
    await initTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('User Registration', () => {
    it('should successfully register a new firm and admin user', async () => {
      const registrationData = {
        firm: {
          name: 'New Law Firm',
          address: '123 Legal St, Law City, LC 12345',
          phone: '555-1234',
          email: 'contact@newlawfirm.com',
        },
        user: {
          email: 'admin@newlawfirm.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User',
        },
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('firm');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      expect(response.body.user.email).toBe(registrationData.user.email);
      expect(response.body.user.role).toBe('admin');
      expect(response.body.firm.name).toBe(registrationData.firm.name);
    });

    it('should reject registration with weak password', async () => {
      const registrationData = {
        firm: {
          name: 'Test Firm',
          email: 'test@firm.com',
        },
        user: {
          email: 'user@firm.com',
          password: 'weak', // Too short/simple
          firstName: 'Test',
          lastName: 'User',
        },
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(400);

      expect(response.body.error).toMatch(/password/i);
    });

    it('should reject duplicate email registration', async () => {
      const registrationData = {
        firm: {
          name: 'Another Firm',
          email: 'another@firm.com',
        },
        user: {
          email: 'admin@firm.com', // Will try to register this email
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
        },
      };

      // First registration succeeds
      await request(app).post('/api/auth/register').send(registrationData).expect(201);

      // Second registration with same email should fail
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...registrationData,
          firm: { name: 'Different Firm', email: 'different@firm.com' },
        })
        .expect(409);

      expect(response.body.error).toMatch(/email.*already/i);
    });
  });

  describe('User Login', () => {
    it('should successfully login with valid credentials', async () => {
      // First register a user
      const registrationData = {
        firm: {
          name: 'Test Firm',
          email: 'test@firm.com',
        },
        user: {
          email: 'user@test.com',
          password: 'TestPass123!',
          firstName: 'Test',
          lastName: 'User',
        },
      };

      await request(app).post('/api/auth/register').send(registrationData).expect(201);

      // Now login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: registrationData.user.email,
          password: registrationData.user.password,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');
      expect(loginResponse.body).toHaveProperty('refreshToken');
      expect(loginResponse.body).toHaveProperty('user');
      expect(loginResponse.body.user.email).toBe(registrationData.user.email);
    });

    it('should reject login with invalid password', async () => {
      const registrationData = {
        firm: {
          name: 'Test Firm',
          email: 'test@firm.com',
        },
        user: {
          email: 'user@test.com',
          password: 'TestPass123!',
          firstName: 'Test',
          lastName: 'User',
        },
      };

      await request(app).post('/api/auth/register').send(registrationData).expect(201);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: registrationData.user.email,
          password: 'WrongPassword!',
        })
        .expect(401);

      expect(loginResponse.body.error).toMatch(/invalid.*credentials/i);
    });

    it('should reject login for non-existent user', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'SomePassword123!',
        })
        .expect(401);

      expect(loginResponse.body.error).toMatch(/invalid.*credentials/i);
    });

    it('should reject login for inactive user', async () => {
      const firm = await createTestFirm();
      const { createTestUser } = await import('./setup/fixtures');

      // Create inactive user
      const user = await createTestUser(firm.id, {
        email: 'inactive@test.com',
        is_active: false,
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(401);

      expect(loginResponse.body.error).toMatch(/inactive|disabled/i);
    });
  });

  describe('Token Refresh', () => {
    it('should successfully refresh access token with valid refresh token', async () => {
      // Register and get tokens
      const registrationData = {
        firm: {
          name: 'Test Firm',
          email: 'test@firm.com',
        },
        user: {
          email: 'user@test.com',
          password: 'TestPass123!',
          firstName: 'Test',
          lastName: 'User',
        },
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      const { refreshToken } = registerResponse.body;

      // Wait a moment to ensure different token timestamps
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Refresh the token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body).toHaveProperty('refreshToken');
      expect(refreshResponse.body.accessToken).not.toBe(registerResponse.body.accessToken);
    });

    it('should reject refresh with invalid token', async () => {
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(refreshResponse.body.error).toMatch(/invalid.*token/i);
    });
  });

  describe('Logout', () => {
    it('should successfully logout and invalidate refresh token', async () => {
      // Register user
      const registrationData = {
        firm: {
          name: 'Test Firm',
          email: 'test@firm.com',
        },
        user: {
          email: 'user@test.com',
          password: 'TestPass123!',
          firstName: 'Test',
          lastName: 'User',
        },
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      const { accessToken, refreshToken } = registerResponse.body;

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      // Try to use the refresh token - should fail
      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('Protected Route Access', () => {
    it('should allow access to protected route with valid token', async () => {
      const registrationData = {
        firm: {
          name: 'Test Firm',
          email: 'test@firm.com',
        },
        user: {
          email: 'user@test.com',
          password: 'TestPass123!',
          firstName: 'Test',
          lastName: 'User',
        },
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      const { accessToken } = registerResponse.body;

      // Access protected route
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.email).toBe(registrationData.user.email);
    });

    it('should reject access to protected route without token', async () => {
      const response = await request(app).get('/api/users/me').expect(401);

      expect(response.body.error).toMatch(/unauthorized|token/i);
    });

    it('should reject access to protected route with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toMatch(/invalid.*token/i);
    });
  });
});
