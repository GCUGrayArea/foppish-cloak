/**
 * Multi-Tenant Security Integration Tests
 *
 * Tests firm data isolation across all resources (users, templates, documents, letters).
 */

import request from 'supertest';
import { createTestServer } from './setup/testServer';
import { initTestDatabase, closeTestDatabase, cleanDatabase } from './setup/testDatabase';
import { createTestFirm, createTestUser, createTestTemplate, createTestDocument, createTestDemandLetter } from './setup/fixtures';

const app = createTestServer();

describe('Multi-Tenant Security Integration Tests', () => {
  let firmA: any, firmB: any;
  let userA: any, userB: any;
  let tokenA: string;

  beforeAll(async () => {
    await initTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();

    // Create two separate firms
    firmA = await createTestFirm({ name: 'Firm A' });
    firmB = await createTestFirm({ name: 'Firm B' });

    userA = await createTestUser(firmA.id, { email: 'admin@firmA.com', role: 'admin' });
    userB = await createTestUser(firmB.id, { email: 'admin@firmB.com', role: 'admin' });

    const loginA = await request(app)
      .post('/api/auth/login')
      .send({ email: userA.email, password: userA.password });
    tokenA = loginA.body.accessToken;
  });

  describe('User Isolation', () => {
    it('should not allow firm A to list firm B users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(response.body.every((u: any) => u.firm_id === firmA.id)).toBe(true);
      expect(response.body.some((u: any) => u.id === userB.id)).toBe(false);
    });

    it('should not allow firm A to access firm B user details', async () => {
      await request(app)
        .get(`/api/users/${userB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404); // Not 403, to avoid leaking existence
    });
  });

  describe('Template Isolation', () => {
    it('should not allow access to templates from other firms', async () => {
      const templateB = await createTestTemplate(firmB.id, { name: 'Firm B Template' });

      await request(app)
        .get(`/api/templates/${templateB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);
    });

    it('should only list templates belonging to the firm', async () => {
      await createTestTemplate(firmA.id, { name: 'Template A1' });
      await createTestTemplate(firmA.id, { name: 'Template A2' });
      await createTestTemplate(firmB.id, { name: 'Template B1' });

      const responseA = await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(responseA.body).toHaveLength(2);
      expect(responseA.body.every((t: any) => t.firm_id === firmA.id)).toBe(true);
    });
  });

  describe('Document Isolation', () => {
    it('should not allow access to documents from other firms', async () => {
      const docB = await createTestDocument(firmB.id, userB.id);

      await request(app)
        .get(`/api/documents/${docB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);
    });

    it('should only list documents belonging to the firm', async () => {
      await createTestDocument(firmA.id, userA.id, { file_name: 'docA1.pdf' });
      await createTestDocument(firmA.id, userA.id, { file_name: 'docA2.pdf' });
      await createTestDocument(firmB.id, userB.id, { file_name: 'docB1.pdf' });

      const responseA = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(responseA.body).toHaveLength(2);
      expect(responseA.body.every((d: any) => d.firm_id === firmA.id)).toBe(true);
    });
  });

  describe('Demand Letter Isolation', () => {
    it('should not allow access to demand letters from other firms', async () => {
      const templateB = await createTestTemplate(firmB.id);
      const letterB = await createTestDemandLetter(firmB.id, templateB.id, userB.id);

      await request(app)
        .get(`/api/demand-letters/${letterB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);
    });

    it('should only list demand letters belonging to the firm', async () => {
      const templateA = await createTestTemplate(firmA.id);
      const templateB = await createTestTemplate(firmB.id);

      await createTestDemandLetter(firmA.id, templateA.id, userA.id, { title: 'Letter A1' });
      await createTestDemandLetter(firmA.id, templateA.id, userA.id, { title: 'Letter A2' });
      await createTestDemandLetter(firmB.id, templateB.id, userB.id, { title: 'Letter B1' });

      const responseA = await request(app)
        .get('/api/demand-letters')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(responseA.body).toHaveLength(2);
      expect(responseA.body.every((l: any) => l.firm_id === firmA.id)).toBe(true);
    });
  });

  describe('Cross-Firm Operation Attempts', () => {
    it('should not allow firm A to update firm B template', async () => {
      const templateB = await createTestTemplate(firmB.id);

      await request(app)
        .put(`/api/templates/${templateB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Hacked Name' })
        .expect(404);
    });

    it('should not allow firm A to delete firm B user', async () => {
      await request(app)
        .delete(`/api/users/${userB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);
    });

    it('should not allow firm A to generate letter using firm B template', async () => {
      const templateB = await createTestTemplate(firmB.id);

      await request(app)
        .post('/api/demand-letters')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          templateId: templateB.id,
          title: 'Attempt to use other firm template',
        })
        .expect(404);
    });
  });
});
