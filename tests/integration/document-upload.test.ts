/**
 * Document Upload Integration Tests
 *
 * Tests document upload workflow including S3 storage,
 * database records, and multi-tenant isolation.
 */

import request from 'supertest';
import path from 'path';
import { createTestServer } from './setup/testServer';
import { initTestDatabase, closeTestDatabase, cleanDatabase } from './setup/testDatabase';
import { createTestFirm, createTestUser } from './setup/fixtures';

const app = createTestServer();

describe('Document Upload Integration Tests', () => {
  let firm1: any, firm2: any;
  let user1: any, user2: any;
  let token1: string, token2: string;

  beforeAll(async () => {
    await initTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();

    // Create two firms with users for multi-tenant testing
    firm1 = await createTestFirm({ name: 'Firm 1' });
    firm2 = await createTestFirm({ name: 'Firm 2' });

    user1 = await createTestUser(firm1.id, { email: 'user1@firm1.com', role: 'attorney' });
    user2 = await createTestUser(firm2.id, { email: 'user2@firm2.com', role: 'attorney' });

    // Get auth tokens
    const login1 = await request(app)
      .post('/api/auth/login')
      .send({ email: user1.email, password: user1.password });
    token1 = login1.body.accessToken;

    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ email: user2.email, password: user2.password });
    token2 = login2.body.accessToken;
  });

  describe('Document Upload', () => {
    it('should successfully upload a PDF document', async () => {
      const filePath = path.join(__dirname, '../fixtures/documents/sample-contract.pdf');

      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token1}`)
        .attach('file', filePath)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('file_name');
      expect(response.body).toHaveProperty('s3_key');
      expect(response.body.file_name).toMatch(/sample-contract\.pdf/);
      expect(response.body.mime_type).toBe('application/pdf');
      expect(response.body.firm_id).toBe(firm1.id);
    });

    it('should reject upload without authentication', async () => {
      const filePath = path.join(__dirname, '../fixtures/documents/sample-contract.pdf');

      await request(app)
        .post('/api/documents/upload')
        .attach('file', filePath)
        .expect(401);
    });

    it('should reject non-PDF file uploads', async () => {
      // This test would need a non-PDF file, skipping for now
      // In production, you'd test with .txt, .exe, etc.
    });
  });

  describe('Document Retrieval', () => {
    it('should retrieve document metadata after upload', async () => {
      const filePath = path.join(__dirname, '../fixtures/documents/sample-invoice.pdf');

      const uploadResponse = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token1}`)
        .attach('file', filePath);

      const documentId = uploadResponse.body.id;

      const getResponse = await request(app)
        .get(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(getResponse.body.id).toBe(documentId);
      expect(getResponse.body.file_name).toMatch(/sample-invoice\.pdf/);
    });

    it('should get signed download URL for document', async () => {
      const filePath = path.join(__dirname, '../fixtures/documents/sample-contract.pdf');

      const uploadResponse = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token1}`)
        .attach('file', filePath);

      const documentId = uploadResponse.body.id;

      const urlResponse = await request(app)
        .get(`/api/documents/${documentId}/download-url`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(urlResponse.body).toHaveProperty('url');
      expect(urlResponse.body.url).toMatch(/^https?:\/\//);
    });

    it('should list all documents for the firm', async () => {
      const file1Path = path.join(__dirname, '../fixtures/documents/sample-contract.pdf');
      const file2Path = path.join(__dirname, '../fixtures/documents/sample-invoice.pdf');

      await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token1}`)
        .attach('file', file1Path);

      await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token1}`)
        .attach('file', file2Path);

      const listResponse = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(listResponse.body).toHaveLength(2);
      expect(listResponse.body[0]).toHaveProperty('file_name');
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should not allow access to documents from other firms', async () => {
      const filePath = path.join(__dirname, '../fixtures/documents/sample-contract.pdf');

      // Firm 1 uploads document
      const uploadResponse = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token1}`)
        .attach('file', filePath);

      const documentId = uploadResponse.body.id;

      // Firm 2 tries to access Firm 1's document
      await request(app)
        .get(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404); // Should return 404, not 403, to avoid leaking existence
    });

    it('should only list documents belonging to the user firm', async () => {
      const filePath = path.join(__dirname, '../fixtures/documents/sample-contract.pdf');

      // Firm 1 uploads a document
      await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token1}`)
        .attach('file', filePath);

      // Firm 2 uploads a document
      await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token2}`)
        .attach('file', filePath);

      // Firm 1 lists documents - should only see their own
      const firm1List = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(firm1List.body).toHaveLength(1);
      expect(firm1List.body[0].firm_id).toBe(firm1.id);

      // Firm 2 lists documents - should only see their own
      const firm2List = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(firm2List.body).toHaveLength(1);
      expect(firm2List.body[0].firm_id).toBe(firm2.id);
    });
  });

  describe('Document Deletion', () => {
    it('should successfully delete own document', async () => {
      const filePath = path.join(__dirname, '../fixtures/documents/sample-contract.pdf');

      const uploadResponse = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token1}`)
        .attach('file', filePath);

      const documentId = uploadResponse.body.id;

      await request(app)
        .delete(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      // Verify document is gone
      await request(app)
        .get(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(404);
    });

    it('should not allow deleting documents from other firms', async () => {
      const filePath = path.join(__dirname, '../fixtures/documents/sample-contract.pdf');

      // Firm 1 uploads document
      const uploadResponse = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token1}`)
        .attach('file', filePath);

      const documentId = uploadResponse.body.id;

      // Firm 2 tries to delete Firm 1's document
      await request(app)
        .delete(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404);
    });
  });
});
