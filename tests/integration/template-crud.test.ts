/**
 * Template CRUD Integration Tests
 *
 * Tests template creation, reading, updating, deletion, and versioning.
 */

import request from 'supertest';
import { createTestServer } from './setup/testServer';
import { initTestDatabase, closeTestDatabase, cleanDatabase } from './setup/testDatabase';
import { createTestFirm, createTestUser, createTestTemplate } from './setup/fixtures';

const app = createTestServer();

describe('Template CRUD Integration Tests', () => {
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

  describe('Template Creation', () => {
    it('should create a new template', async () => {
      const templateData = {
        name: 'New Demand Letter Template',
        description: 'A template for demand letters',
        category: 'Demand Letter',
        content: 'Dear {{recipient}},\nThis is a demand for {{amount}}.\nSincerely,\n{{sender}}',
        variables: ['recipient', 'amount', 'sender'],
      };

      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${token}`)
        .send(templateData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(templateData.name);
      expect(response.body.firm_id).toBe(firm.id);
      expect(response.body.is_active).toBe(true);
    });
  });

  describe('Template Retrieval', () => {
    it('should get template by ID', async () => {
      const template = await createTestTemplate(firm.id);

      const response = await request(app)
        .get(`/api/templates/${template.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(template.id);
      expect(response.body.name).toBe(template.name);
    });

    it('should list all templates for firm', async () => {
      await createTestTemplate(firm.id, { name: 'Template 1' });
      await createTestTemplate(firm.id, { name: 'Template 2' });

      const response = await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });
  });

  describe('Template Update', () => {
    it('should update template and create new version', async () => {
      const template = await createTestTemplate(firm.id);

      const updateData = {
        name: 'Updated Template Name',
        content: 'Updated content with {{new_variable}}',
        variables: ['new_variable'],
        changeSummary: 'Added new variable',
      };

      const response = await request(app)
        .put(`/api/templates/${template.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.version_number).toBe(2); // New version created
    });
  });

  describe('Template Deletion', () => {
    it('should soft delete template (set is_active to false)', async () => {
      const template = await createTestTemplate(firm.id);

      await request(app)
        .delete(`/api/templates/${template.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const response = await request(app)
        .get(`/api/templates/${template.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.is_active).toBe(false);
    });
  });
});
