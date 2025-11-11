# Manual Testing Setup Guide

## Prerequisites
✅ PostgreSQL database is running (Docker on port 5435)
✅ All code is committed and ready to test

## Setup Steps (5 minutes)

### 1. Install Dependencies
```bash
cd services/api
npm install
```

### 2. Create .env File
```bash
cp ../.env.example .env
```

The defaults should work for local testing. Key settings:
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5435/demand_letters`
- `JWT_SECRET=your_jwt_secret_here_change_in_production`
- `STORAGE_MODE=local` (uses local filesystem, not S3)
- `PORT=3000`

### 3. Run Database Migrations
```bash
npm run migrate
```

You should see:
- 001_initial_schema.sql ✅
- 002_password_reset_tokens.sql ✅
- 003_invitations_table.sql ✅

### 4. Create a Test Firm
Connect to the database and create a firm:

```bash
# Using psql
psql postgresql://postgres:postgres@localhost:5435/demand_letters

# Or use pgAdmin at http://localhost:5050
# Login: admin@demandletters.local / admin
```

Run this SQL:
```sql
INSERT INTO firms (id, name, settings, created_at, updated_at)
VALUES (
  'f1111111-1111-1111-1111-111111111111',
  'Acme Law Firm',
  '{"logoUrl": "", "primaryColor": "#003366"}',
  NOW(),
  NOW()
);
```

Copy the firm ID (or use the one above).

### 5. Start the API Server
```bash
npm run dev
```

You should see: `API server listening on port 3000`

## Testing the API

### Test 1: Health Check
```bash
curl http://localhost:3000/health
```

Expected: `{"status":"ok","timestamp":"..."}`

### Test 2: Register a User
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@acme.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "firmId": "f1111111-1111-1111-1111-111111111111"
  }'
```

Expected: `{"userId":"...","email":"admin@acme.com","firmId":"..."}`

### Test 3: Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@acme.com",
    "password": "SecurePass123!",
    "firmId": "f1111111-1111-1111-1111-111111111111"
  }'
```

Expected: `{"accessToken":"...","refreshToken":"...","user":{...}}`

**Copy the accessToken for the next tests!**

### Test 4: Get Current User
```bash
curl http://localhost:3000/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected: Your user profile with firm info

### Test 5: List Firm Users
```bash
curl http://localhost:3000/firms/f1111111-1111-1111-1111-111111111111/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected: List of users in the firm (should show your user)

### Test 6: Upload a Document
```bash
curl -X POST http://localhost:3000/documents/upload \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@path/to/your/document.pdf"
```

Expected: `{"documentId":"...","filename":"...","fileSize":...}`

Files will be stored in `services/api/uploads/firms/{firmId}/documents/`

### Test 7: List Documents
```bash
curl http://localhost:3000/documents \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected: List of uploaded documents with pagination

### Test 8: Download Document
```bash
curl "http://localhost:3000/documents/{documentId}/download" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected: `{"downloadUrl":"...","expiresAt":"..."}`

### Test 9: Create a Template (Admin)
```bash
curl -X POST http://localhost:3000/templates \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Custom Template",
    "description": "Custom demand letter template",
    "content": "Dear {{defendant_name}},\n\nThis letter demands {{demand_amount}} for damages...",
    "isDefault": false
  }'
```

Expected: Template created with version 1 and extracted variables

### Test 10: List Templates
```bash
curl http://localhost:3000/templates \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected: List of templates (including any default templates from seeds)

### Test 11: Update Template (Creates New Version)
```bash
curl -X PUT http://localhost:3000/templates/{templateId} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated content with {{plaintiff_name}}..."
  }'
```

Expected: Template updated, new version created (version 2)

## What Works

✅ **Authentication System (PR-004)**
- User registration with password validation
- Login with JWT tokens (1hr access, 30 day refresh)
- Token refresh
- Logout
- Password reset flow

✅ **Firm & User Management (PR-005)**
- Get firm details
- Update firm settings
- List firm users
- Invite users (email not sent in local dev)
- Update user profiles
- Change user roles (admin only)

✅ **Document Upload (PR-006)**
- Upload documents (PDF, Word, images)
- File validation (type, size max 50MB)
- List documents with pagination
- Get document metadata
- Download documents (local or S3)
- Delete documents
- Multi-tenant security (can't access other firms' documents)

✅ **Template Management (PR-007)**
- Create templates with {{variable}} syntax
- List templates with filters (isDefault, search, pagination)
- Update templates (auto-versioning on content changes)
- Template versioning and rollback
- Delete templates
- Variable extraction and validation
- Default templates (personal injury, property damage, contract breach)
- Admin-only template creation/modification

## What's NOT Implemented Yet

❌ **AI Processing (Block 4)** - Planned but not implemented yet
❌ **Frontend (Blocks 6-7)** - Not started

## Troubleshooting

**Port already in use:**
```bash
# Change PORT in .env
PORT=3001
```

**Database connection error:**
```bash
# Check Docker container is running
docker ps | grep demand-letters-postgres
```

**Migrations failed:**
```bash
# Reset database
psql postgresql://postgres:postgres@localhost:5435/demand_letters -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npm run migrate
```

## Next Steps

After manual testing, you can:
1. Run the test suite: `npm test`
2. Implement PR-007 (Template Management)
3. Start on Block 4 (AI Processing) once templates are ready
