/**
 * Document Upload Integration Tests
 *
 * Tests the complete document upload workflow including:
 * - Authentication
 * - File upload
 * - Storage (local/S3)
 * - Multi-tenant security
 */

import request from 'supertest';
import app from '../../src/index';
import { pool } from '../../src/db/connection';
import { AuthService } from '../../src/auth/AuthService';
import fs from 'fs/promises';
import path from 'path';

describe('Document Upload Integration Tests', () => {
  let authToken: string;
  let firmId: string;
  let userId: string;
  let authService: AuthService;

  beforeAll(async () => {
    authService = new AuthService();

    // Create test firm
    const firmResult = await pool.query(
      `INSERT INTO firms (id, name, settings, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Test Firm', '{}', NOW(), NOW())
       RETURNING id`
    );
    firmId = firmResult.rows[0].id;

    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (id, firm_id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'test@example.com', $2, 'Test', 'User', 'attorney', true, NOW(), NOW())
       RETURNING id`,
      [firmId, await authService['hashPassword']('password123')]
    );
    userId = userResult.rows[0].id;

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
        firmId
      });

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM documents WHERE firm_id = $1', [firmId]);
    await pool.query('DELETE FROM users WHERE firm_id = $1', [firmId]);
    await pool.query('DELETE FROM firms WHERE id = $1', [firmId]);

    // Close database connection
    await pool.end();

    // Clean up uploaded files
    const uploadDir = path.join(process.cwd(), 'uploads', 'firms', firmId);
    try {
      await fs.rm(uploadDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('POST /documents/upload', () => {
    it('should upload a valid PDF document', async () => {
      const testPdfBuffer = Buffer.from('PDF test content');

      const response = await request(app)
        .post('/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testPdfBuffer, {
          filename: 'test-document.pdf',
          contentType: 'application/pdf'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Document uploaded successfully');
      expect(response.body.document).toHaveProperty('id');
      expect(response.body.document.firmId).toBe(firmId);
      expect(response.body.document.uploadedBy).toBe(userId);
      expect(response.body.document.filename).toBe('test-document.pdf');
      expect(response.body.document.fileType).toBe('application/pdf');
      expect(response.body.document.virusScanStatus).toBe('pending');
    });

    it('should upload a Word document', async () => {
      const testDocxBuffer = Buffer.from('Word document content');

      const response = await request(app)
        .post('/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testDocxBuffer, {
          filename: 'test-document.docx',
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

      expect(response.status).toBe(201);
      expect(response.body.document.fileType).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
    });

    it('should reject upload without authentication', async () => {
      const testPdfBuffer = Buffer.from('PDF test content');

      const response = await request(app)
        .post('/documents/upload')
        .attach('file', testPdfBuffer, {
          filename: 'test-document.pdf',
          contentType: 'application/pdf'
        });

      expect(response.status).toBe(401);
    });

    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No file provided');
    });

    it('should reject file that is too large', async () => {
      // Create buffer larger than 50MB (51MB)
      const largeDummyBuffer = Buffer.alloc(51 * 1024 * 1024);

      const response = await request(app)
        .post('/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeDummyBuffer, {
          filename: 'large-file.pdf',
          contentType: 'application/pdf'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('File too large');
    });

    it('should reject invalid file type', async () => {
      const testBuffer = Buffer.from('Executable content');

      const response = await request(app)
        .post('/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testBuffer, {
          filename: 'malicious.exe',
          contentType: 'application/x-msdownload'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Validation error');
    });
  });

  describe('GET /documents', () => {
    let documentId: string;

    beforeAll(async () => {
      // Upload a document for testing
      const testPdfBuffer = Buffer.from('PDF test content');

      const uploadResponse = await request(app)
        .post('/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testPdfBuffer, {
          filename: 'list-test.pdf',
          contentType: 'application/pdf'
        });

      documentId = uploadResponse.body.document.id;
    });

    it('should list documents for authenticated user', async () => {
      const response = await request(app)
        .get('/documents')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('documents');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.documents)).toBe(true);
      expect(response.body.documents.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/documents?limit=1&offset=0')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.limit).toBe(1);
      expect(response.body.offset).toBe(0);
      expect(response.body.documents.length).toBeLessThanOrEqual(1);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app).get('/documents');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /documents/:id', () => {
    let documentId: string;

    beforeAll(async () => {
      const testPdfBuffer = Buffer.from('PDF test content');

      const uploadResponse = await request(app)
        .post('/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testPdfBuffer, {
          filename: 'get-test.pdf',
          contentType: 'application/pdf'
        });

      documentId = uploadResponse.body.document.id;
    });

    it('should get document metadata', async () => {
      const response = await request(app)
        .get(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.document.id).toBe(documentId);
      expect(response.body.document.firmId).toBe(firmId);
    });

    it('should return 404 for non-existent document', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/documents/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should enforce multi-tenant security', async () => {
      // Create another firm and user
      const otherFirmResult = await pool.query(
        `INSERT INTO firms (id, name, settings, created_at, updated_at)
         VALUES (gen_random_uuid(), 'Other Firm', '{}', NOW(), NOW())
         RETURNING id`
      );
      const otherFirmId = otherFirmResult.rows[0].id;

      const otherUserResult = await pool.query(
        `INSERT INTO users (id, firm_id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'other@example.com', $2, 'Other', 'User', 'attorney', true, NOW(), NOW())
         RETURNING id`,
        [otherFirmId, await authService['hashPassword']('password123')]
      );

      // Login as other user
      const otherLoginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'other@example.com',
          password: 'password123',
          firmId: otherFirmId
        });

      const otherAuthToken = otherLoginResponse.body.accessToken;

      // Try to access document from different firm
      const response = await request(app)
        .get(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${otherAuthToken}`);

      expect(response.status).toBe(404); // Should not find document from other firm

      // Clean up
      await pool.query('DELETE FROM users WHERE firm_id = $1', [otherFirmId]);
      await pool.query('DELETE FROM firms WHERE id = $1', [otherFirmId]);
    });
  });

  describe('GET /documents/:id/download', () => {
    let documentId: string;

    beforeAll(async () => {
      const testPdfBuffer = Buffer.from('PDF test content');

      const uploadResponse = await request(app)
        .post('/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testPdfBuffer, {
          filename: 'download-test.pdf',
          contentType: 'application/pdf'
        });

      documentId = uploadResponse.body.document.id;
    });

    it('should generate download URL', async () => {
      const response = await request(app)
        .get(`/documents/${documentId}/download`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('expiresAt');
      expect(response.body).toHaveProperty('filename');
    });

    it('should reject download of infected documents', async () => {
      // Mark document as infected
      await pool.query(
        `UPDATE documents SET virus_scan_status = 'infected' WHERE id = $1`,
        [documentId]
      );

      const response = await request(app)
        .get(`/documents/${documentId}/download`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Document infected');

      // Reset status
      await pool.query(
        `UPDATE documents SET virus_scan_status = 'pending' WHERE id = $1`,
        [documentId]
      );
    });
  });

  describe('DELETE /documents/:id', () => {
    let documentId: string;

    beforeEach(async () => {
      const testPdfBuffer = Buffer.from('PDF test content');

      const uploadResponse = await request(app)
        .post('/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testPdfBuffer, {
          filename: 'delete-test.pdf',
          contentType: 'application/pdf'
        });

      documentId = uploadResponse.body.document.id;
    });

    it('should delete a document', async () => {
      const response = await request(app)
        .delete(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Document deleted successfully');

      // Verify document is deleted
      const getResponse = await request(app)
        .get(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should return 404 when deleting non-existent document', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/documents/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
