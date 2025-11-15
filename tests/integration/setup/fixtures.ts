/**
 * Test Fixtures Loading and Management
 *
 * Provides utilities for loading test data from JSON files and
 * creating test entities with proper relationships.
 */

import fs from 'fs/promises';
import path from 'path';
import { query } from './testDatabase';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export interface TestFirm {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface TestUser {
  id: string;
  firm_id: string;
  email: string;
  password_hash?: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'attorney' | 'paralegal';
  is_active: boolean;
}

export interface TestTemplate {
  id: string;
  firm_id: string;
  name: string;
  description?: string;
  category?: string;
  content: string;
  variables: string[];
  is_active: boolean;
}

/**
 * Load JSON fixture file
 */
async function loadFixture<T>(filename: string): Promise<T[]> {
  const fixturePath = path.join(__dirname, '../../fixtures', filename);
  const content = await fs.readFile(fixturePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Create a test firm in the database
 */
export async function createTestFirm(data?: Partial<TestFirm>): Promise<TestFirm> {
  const firm: TestFirm = {
    id: data?.id || uuidv4(),
    name: data?.name || `Test Firm ${Date.now()}`,
    address: data?.address || '123 Test St, Test City, TS 12345',
    phone: data?.phone || '555-0100',
    email: data?.email || `firm-${Date.now()}@test.com`,
  };

  await query(
    `INSERT INTO firms (id, name, address, phone, email, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
    [firm.id, firm.name, firm.address, firm.phone, firm.email]
  );

  return firm;
}

/**
 * Create a test user in the database
 */
export async function createTestUser(
  firmId: string,
  data?: Partial<TestUser>
): Promise<TestUser & { password: string }> {
  const password = data?.password_hash || 'Test123!@#';
  const passwordHash = await bcrypt.hash(password, 10);

  const user: TestUser = {
    id: data?.id || uuidv4(),
    firm_id: firmId,
    email: data?.email || `user-${Date.now()}@test.com`,
    password_hash: passwordHash,
    first_name: data?.first_name || 'Test',
    last_name: data?.last_name || 'User',
    role: data?.role || 'attorney',
    is_active: data?.is_active ?? true,
  };

  await query(
    `INSERT INTO users (id, firm_id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
    [user.id, user.firm_id, user.email, user.password_hash, user.first_name, user.last_name, user.role, user.is_active]
  );

  return { ...user, password };
}

/**
 * Create a test template in the database
 */
export async function createTestTemplate(
  firmId: string,
  data?: Partial<TestTemplate>
): Promise<TestTemplate> {
  const template: TestTemplate = {
    id: data?.id || uuidv4(),
    firm_id: firmId,
    name: data?.name || `Test Template ${Date.now()}`,
    description: data?.description || 'A test template',
    category: data?.category || 'Demand Letter',
    content: data?.content || 'Dear {{recipient_name}},\n\nThis is a demand letter regarding {{subject}}.\n\nSincerely,\n{{sender_name}}',
    variables: data?.variables || ['recipient_name', 'subject', 'sender_name'],
    is_active: data?.is_active ?? true,
  };

  await query(
    `INSERT INTO templates (id, firm_id, name, description, category, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
    [template.id, template.firm_id, template.name, template.description, template.category, template.is_active]
  );

  // Create initial template version
  const versionId = uuidv4();
  await query(
    `INSERT INTO template_versions (id, template_id, version_number, content, variables, change_summary, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [versionId, template.id, 1, template.content, JSON.stringify(template.variables), 'Initial version', template.firm_id]
  );

  return template;
}

/**
 * Create a test document in the database
 */
export async function createTestDocument(
  firmId: string,
  uploadedBy: string,
  data?: {
    file_name?: string;
    s3_key?: string;
    mime_type?: string;
    file_size?: number;
  }
): Promise<any> {
  const documentId = uuidv4();

  await query(
    `INSERT INTO documents (id, firm_id, file_name, s3_key, mime_type, file_size, uploaded_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [
      documentId,
      firmId,
      data?.file_name || 'test-document.pdf',
      data?.s3_key || `test/${documentId}.pdf`,
      data?.mime_type || 'application/pdf',
      data?.file_size || 1024,
      uploadedBy,
    ]
  );

  return { id: documentId, firm_id: firmId, ...data };
}

/**
 * Create a test demand letter in the database
 */
export async function createTestDemandLetter(
  firmId: string,
  templateId: string,
  createdBy: string,
  data?: {
    title?: string;
    status?: 'draft' | 'in_progress' | 'completed';
  }
): Promise<any> {
  const letterId = uuidv4();

  await query(
    `INSERT INTO demand_letters (id, firm_id, template_id, title, status, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
    [
      letterId,
      firmId,
      templateId,
      data?.title || 'Test Demand Letter',
      data?.status || 'draft',
      createdBy,
    ]
  );

  return { id: letterId, firm_id: firmId, template_id: templateId, ...data };
}

/**
 * Load all fixture files and insert into database
 * Returns created entities for use in tests
 */
export async function loadAllFixtures(): Promise<{
  firms: TestFirm[];
  users: (TestUser & { password: string })[];
  templates: TestTemplate[];
}> {
  const firmData = await loadFixture<Partial<TestFirm>>('firms.json');
  const userData = await loadFixture<Partial<TestUser>>('users.json');
  const templateData = await loadFixture<Partial<TestTemplate>>('templates.json');

  const firms: TestFirm[] = [];
  const users: (TestUser & { password: string })[] = [];
  const templates: TestTemplate[] = [];

  // Create firms
  for (const firmInfo of firmData) {
    const firm = await createTestFirm(firmInfo);
    firms.push(firm);
  }

  // Create users
  for (const userInfo of userData) {
    const firmId = userInfo.firm_id || firms[0]?.id;
    if (!firmId) throw new Error('No firm available for user creation');

    const user = await createTestUser(firmId, userInfo);
    users.push(user);
  }

  // Create templates
  for (const templateInfo of templateData) {
    const firmId = templateInfo.firm_id || firms[0]?.id;
    if (!firmId) throw new Error('No firm available for template creation');

    const template = await createTestTemplate(firmId, templateInfo);
    templates.push(template);
  }

  return { firms, users, templates };
}
