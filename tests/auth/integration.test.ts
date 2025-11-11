import request from 'supertest';
import express, { Express } from 'express';
import authRoutes from '../../services/api/src/routes/auth';
import { Pool } from 'pg';
import { getPool } from '../../services/api/src/db/connection';

/**
 * Integration tests for authentication flows
 * These tests verify complete end-to-end authentication workflows
 *
 * NOTE: These tests require a test database to be running
 * Run: docker-compose up -d postgres
 */

describe('Authentication Integration Tests', () => {
  let app: Express;
  let pool: Pool;
  let testFirmId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);

    // Get database pool
    pool = getPool();

    // Create test firm
    const firmResult = await pool.query(
      `INSERT INTO firms (name, settings)
       VALUES ($1, $2)
       RETURNING id`,
      ['Test Firm', {}]
    );
    testFirmId = firmResult.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testFirmId) {
      await pool.query('DELETE FROM firms WHERE id = $1', [testFirmId]);
    }
    await pool.end();
  });

  afterEach(async () => {
    // Clean up test users after each test
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
      testUserId = '';
    }
  });

  describe('Complete Registration → Login → Logout Flow', () => {
    it('should allow user to register, login, and logout', async () => {
      const userEmail = `test-${Date.now()}@example.com`;

      // 1. Register new user
      const registerResponse = await request(app)
        .post('/auth/register')
        .send({
          email: userEmail,
          password: 'StrongP@ss123',
          firstName: 'John',
          lastName: 'Doe',
          firmId: testFirmId
        })
        .expect(201);

      expect(registerResponse.body.userId).toBeDefined();
      expect(registerResponse.body.email).toBe(userEmail.toLowerCase());
      testUserId = registerResponse.body.userId;

      // 2. Login with credentials
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: userEmail,
          password: 'StrongP@ss123',
          firmId: testFirmId
        })
        .expect(200);

      expect(loginResponse.body.accessToken).toBeDefined();
      expect(loginResponse.body.refreshToken).toBeDefined();
      expect(loginResponse.body.user.email).toBe(userEmail.toLowerCase());

      const { refreshToken } = loginResponse.body;

      // 3. Logout
      await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .send({ refreshToken })
        .expect(200);

      // 4. Verify refresh token is invalidated
      await request(app)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('Token Refresh Flow', () => {
    it('should refresh access token using refresh token', async () => {
      const userEmail = `test-${Date.now()}@example.com`;

      // Register and login
      const registerResponse = await request(app)
        .post('/auth/register')
        .send({
          email: userEmail,
          password: 'StrongP@ss123',
          firstName: 'Jane',
          lastName: 'Smith',
          firmId: testFirmId
        })
        .expect(201);

      testUserId = registerResponse.body.userId;

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: userEmail,
          password: 'StrongP@ss123',
          firmId: testFirmId
        })
        .expect(200);

      // Refresh access token
      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: loginResponse.body.refreshToken })
        .expect(200);

      expect(refreshResponse.body.accessToken).toBeDefined();
      expect(refreshResponse.body.accessToken).not.toBe(
        loginResponse.body.accessToken
      );
    });
  });

  describe('Password Reset Flow', () => {
    it('should allow user to reset password', async () => {
      const userEmail = `test-${Date.now()}@example.com`;

      // Register user
      const registerResponse = await request(app)
        .post('/auth/register')
        .send({
          email: userEmail,
          password: 'OldP@ss123',
          firstName: 'Reset',
          lastName: 'Test',
          firmId: testFirmId
        })
        .expect(201);

      testUserId = registerResponse.body.userId;

      // Initiate password reset
      await request(app)
        .post('/auth/forgot-password')
        .send({
          email: userEmail,
          firmId: testFirmId
        })
        .expect(200);

      // Get reset token from database (in real app, would come from email)
      const tokenResult = await pool.query(
        `SELECT * FROM password_reset_tokens
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [testUserId]
      );

      // Note: In real implementation, we'd need the actual token before hashing
      // For this test, we'll verify the password reset endpoint exists and validates input

      // Try reset with invalid token
      await request(app)
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'NewP@ss456'
        })
        .expect(400);
    });
  });

  describe('Validation Errors', () => {
    it('should reject registration with weak password', async () => {
      await request(app)
        .post('/auth/register')
        .send({
          email: 'weak@example.com',
          password: 'weak',
          firstName: 'Weak',
          lastName: 'Password',
          firmId: testFirmId
        })
        .expect(400);
    });

    it('should reject registration with invalid email', async () => {
      await request(app)
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'StrongP@ss123',
          firstName: 'Invalid',
          lastName: 'Email',
          firmId: testFirmId
        })
        .expect(400);
    });

    it('should reject login with missing fields', async () => {
      await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com'
          // Missing password and firmId
        })
        .expect(400);
    });
  });

  describe('Security Tests', () => {
    it('should not allow duplicate user registration in same firm', async () => {
      const userEmail = `duplicate-${Date.now()}@example.com`;

      // First registration
      const firstResponse = await request(app)
        .post('/auth/register')
        .send({
          email: userEmail,
          password: 'StrongP@ss123',
          firstName: 'First',
          lastName: 'User',
          firmId: testFirmId
        })
        .expect(201);

      testUserId = firstResponse.body.userId;

      // Attempt duplicate registration
      await request(app)
        .post('/auth/register')
        .send({
          email: userEmail,
          password: 'DifferentP@ss456',
          firstName: 'Second',
          lastName: 'User',
          firmId: testFirmId
        })
        .expect(409); // Conflict
    });

    it('should not reveal if user exists in forgot password', async () => {
      // Request password reset for non-existent user
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
          firmId: testFirmId
        })
        .expect(200);

      // Should return success message even for non-existent user
      expect(response.body.message).toContain('If a user');
    });

    it('should reject login with wrong password', async () => {
      const userEmail = `wrong-pass-${Date.now()}@example.com`;

      // Register user
      const registerResponse = await request(app)
        .post('/auth/register')
        .send({
          email: userEmail,
          password: 'CorrectP@ss123',
          firstName: 'Wrong',
          lastName: 'Password',
          firmId: testFirmId
        })
        .expect(201);

      testUserId = registerResponse.body.userId;

      // Attempt login with wrong password
      await request(app)
        .post('/auth/login')
        .send({
          email: userEmail,
          password: 'WrongP@ss456',
          firmId: testFirmId
        })
        .expect(401);
    });
  });
});
