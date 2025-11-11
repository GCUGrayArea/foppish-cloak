# Manual Testing Guide - Demand Letter Generator

**Last Updated:** 2025-11-11
**Implemented PRs:** PR-001 through PR-007
**Status:** Authentication, User Management, Documents, and Templates fully functional

---

## Prerequisites

### Environment Setup
- PostgreSQL running on port 5435 (Docker container)
- Node.js 18+ installed
- API server running on port 3000

### Initial Setup (One-time)
```bash
cd services/api
npm install
cp ../.env.example .env
npm run migrate
npm run dev
```

### Test Data Setup
Create a test firm in the database:
```sql
-- Connect to database
psql postgresql://postgres:postgres@localhost:5435/demand_letters

-- Create test firm
INSERT INTO firms (id, name, settings, created_at, updated_at)
VALUES (
  'f1111111-1111-1111-1111-111111111111',
  'Acme Law Firm',
  '{"logoUrl": "", "primaryColor": "#003366"}',
  NOW(),
  NOW()
);

-- Verify firm created
SELECT * FROM firms;
```

---

## Test Suite 1: Authentication & User Management

### Test 1.1: Health Check
**Purpose:** Verify API server is running

**Steps:**
1. Open terminal or Postman
2. Send GET request to `http://localhost:3000/health`

**Expected Result:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-11T12:00:00.000Z"
}
```

**Pass/Fail:** ☐

---

### Test 1.2: User Registration
**Purpose:** Create a new user account

**Steps:**
1. Send POST request to `http://localhost:3000/auth/register`
2. Headers: `Content-Type: application/json`
3. Body:
```json
{
  "email": "john.doe@acme.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "firmId": "f1111111-1111-1111-1111-111111111111"
}
```

**Expected Result:**
- Status: 201 Created
- Response contains: `userId`, `email`, `firmId`
```json
{
  "userId": "uuid-here",
  "email": "john.doe@acme.com",
  "firmId": "f1111111-1111-1111-1111-111111111111"
}
```

**Pass/Fail:** ☐

**Notes:**
- Password must be 8+ chars with uppercase, lowercase, number, special char
- Email must be unique within firm

---

### Test 1.3: User Login
**Purpose:** Authenticate and receive JWT tokens

**Steps:**
1. Send POST request to `http://localhost:3000/auth/login`
2. Headers: `Content-Type: application/json`
3. Body:
```json
{
  "email": "john.doe@acme.com",
  "password": "SecurePass123!",
  "firmId": "f1111111-1111-1111-1111-111111111111"
}
```

**Expected Result:**
- Status: 200 OK
- Response contains: `accessToken`, `refreshToken`, `user` object
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "uuid-here",
  "user": {
    "id": "uuid",
    "email": "john.doe@acme.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "attorney",
    "firmId": "f1111111-1111-1111-1111-111111111111",
    "isActive": true
  }
}
```

**Pass/Fail:** ☐

**Save for later:** Copy `accessToken` - you'll need it for all subsequent tests

---

### Test 1.4: Get Current User Profile
**Purpose:** Verify authentication middleware and user data retrieval

**Steps:**
1. Send GET request to `http://localhost:3000/users/me`
2. Headers: `Authorization: Bearer {YOUR_ACCESS_TOKEN}`

**Expected Result:**
- Status: 200 OK
- Response contains full user profile with firm info
```json
{
  "id": "uuid",
  "email": "john.doe@acme.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "attorney",
  "firmId": "f1111111-1111-1111-1111-111111111111",
  "firmName": "Acme Law Firm",
  "isActive": true,
  "createdAt": "2025-11-11T12:00:00.000Z"
}
```

**Pass/Fail:** ☐

---

### Test 1.5: Token Refresh
**Purpose:** Verify token refresh flow

**Steps:**
1. Send POST request to `http://localhost:3000/auth/refresh`
2. Headers: `Content-Type: application/json`
3. Body:
```json
{
  "refreshToken": "your-refresh-token-from-login"
}
```

**Expected Result:**
- Status: 200 OK
- New access token returned
```json
{
  "accessToken": "new-jwt-token"
}
```

**Pass/Fail:** ☐

---

### Test 1.6: Invalid Login (Negative Test)
**Purpose:** Verify authentication rejects invalid credentials

**Steps:**
1. Send POST request to `http://localhost:3000/auth/login`
2. Body:
```json
{
  "email": "john.doe@acme.com",
  "password": "WrongPassword123!",
  "firmId": "f1111111-1111-1111-1111-111111111111"
}
```

**Expected Result:**
- Status: 401 Unauthorized
- Error message: "Invalid credentials"

**Pass/Fail:** ☐

---

## Test Suite 2: Firm & User Management

### Test 2.1: List Firm Users
**Purpose:** Retrieve all users in the firm

**Steps:**
1. Send GET request to `http://localhost:3000/firms/f1111111-1111-1111-1111-111111111111/users`
2. Headers: `Authorization: Bearer {YOUR_ACCESS_TOKEN}`

**Expected Result:**
- Status: 200 OK
- Array of users in the firm (should include your test user)
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "john.doe@acme.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "attorney",
      "isActive": true,
      "createdAt": "2025-11-11T12:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

**Pass/Fail:** ☐

---

### Test 2.2: Get Firm Details
**Purpose:** Retrieve firm information (requires admin role)

**Steps:**
1. First, update your user to admin role in database:
```sql
UPDATE users SET role = 'admin' WHERE email = 'john.doe@acme.com';
```
2. Send GET request to `http://localhost:3000/firms/f1111111-1111-1111-1111-111111111111`
3. Headers: `Authorization: Bearer {YOUR_ACCESS_TOKEN}` (you may need to login again for new role)

**Expected Result:**
- Status: 200 OK
- Firm details with settings
```json
{
  "id": "f1111111-1111-1111-1111-111111111111",
  "name": "Acme Law Firm",
  "settings": {
    "logoUrl": "",
    "primaryColor": "#003366"
  },
  "createdAt": "2025-11-11T12:00:00.000Z",
  "updatedAt": "2025-11-11T12:00:00.000Z"
}
```

**Pass/Fail:** ☐

---

### Test 2.3: Update User Profile
**Purpose:** Verify users can update their own profile

**Steps:**
1. Send PUT request to `http://localhost:3000/users/{YOUR_USER_ID}`
2. Headers:
   - `Authorization: Bearer {YOUR_ACCESS_TOKEN}`
   - `Content-Type: application/json`
3. Body:
```json
{
  "firstName": "Johnny",
  "lastName": "Doe Jr"
}
```

**Expected Result:**
- Status: 200 OK
- Updated user object returned

**Pass/Fail:** ☐

---

### Test 2.4: Multi-Tenant Isolation (Security Test)
**Purpose:** Verify users cannot access other firms' data

**Prerequisites:** Create a second firm and user in database

**Steps:**
1. Create second firm:
```sql
INSERT INTO firms (id, name, settings, created_at, updated_at)
VALUES (
  'f2222222-2222-2222-2222-222222222222',
  'Different Law Firm',
  '{}',
  NOW(),
  NOW()
);
```
2. Try to access the second firm's users using your Acme Law Firm token:
   `GET http://localhost:3000/firms/f2222222-2222-2222-2222-222222222222/users`
3. Headers: `Authorization: Bearer {YOUR_ACME_ACCESS_TOKEN}`

**Expected Result:**
- Status: 403 Forbidden
- Error: "Access denied to other firm resources"

**Pass/Fail:** ☐

---

## Test Suite 3: Document Upload & Management

### Test 3.1: Upload a PDF Document
**Purpose:** Upload a document to the system

**Prerequisites:** Have a test PDF file ready

**Steps:**
1. Send POST request to `http://localhost:3000/documents/upload`
2. Headers: `Authorization: Bearer {YOUR_ACCESS_TOKEN}`
3. Form-data:
   - Key: `file`
   - Value: Select your PDF file

**cURL Example:**
```bash
curl -X POST http://localhost:3000/documents/upload \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -F "file=@/path/to/document.pdf"
```

**Expected Result:**
- Status: 201 Created
- Document metadata returned
```json
{
  "documentId": "uuid",
  "filename": "document.pdf",
  "fileSize": 123456,
  "fileType": "application/pdf",
  "uploadedAt": "2025-11-11T12:00:00.000Z"
}
```

**Pass/Fail:** ☐

**Save for later:** Copy `documentId`

---

### Test 3.2: Upload Multiple File Types
**Purpose:** Verify various document types are accepted

**Steps:**
1. Upload a Word document (.docx)
2. Upload an image (.jpg or .png)
3. Upload a spreadsheet (.xlsx) - if supported

**Expected Result:**
- All valid file types accepted
- Each upload returns document metadata

**Pass/Fail:** ☐

---

### Test 3.3: File Size Validation (Negative Test)
**Purpose:** Verify files over 50MB are rejected

**Steps:**
1. Attempt to upload a file larger than 50MB
2. Headers: `Authorization: Bearer {YOUR_ACCESS_TOKEN}`

**Expected Result:**
- Status: 413 Payload Too Large
- Error message about file size limit

**Pass/Fail:** ☐

---

### Test 3.4: Invalid File Type (Negative Test)
**Purpose:** Verify executable files are rejected

**Steps:**
1. Attempt to upload a .exe or .bat file
2. Headers: `Authorization: Bearer {YOUR_ACCESS_TOKEN}`

**Expected Result:**
- Status: 400 Bad Request
- Error message about invalid file type

**Pass/Fail:** ☐

---

### Test 3.5: List Uploaded Documents
**Purpose:** Retrieve list of firm's documents

**Steps:**
1. Send GET request to `http://localhost:3000/documents`
2. Headers: `Authorization: Bearer {YOUR_ACCESS_TOKEN}`
3. Optional query params: `?page=1&limit=10`

**Expected Result:**
- Status: 200 OK
- Paginated list of documents
```json
{
  "documents": [
    {
      "id": "uuid",
      "filename": "document.pdf",
      "fileType": "application/pdf",
      "fileSize": 123456,
      "uploadedBy": "uuid",
      "uploadedByName": "John Doe",
      "virusScanStatus": "pending",
      "createdAt": "2025-11-11T12:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

**Pass/Fail:** ☐

---

### Test 3.6: Get Document Details
**Purpose:** Retrieve metadata for specific document

**Steps:**
1. Send GET request to `http://localhost:3000/documents/{DOCUMENT_ID}`
2. Headers: `Authorization: Bearer {YOUR_ACCESS_TOKEN}`

**Expected Result:**
- Status: 200 OK
- Full document metadata

**Pass/Fail:** ☐

---

### Test 3.7: Generate Download URL
**Purpose:** Get a signed URL to download the document

**Steps:**
1. Send GET request to `http://localhost:3000/documents/{DOCUMENT_ID}/download`
2. Headers: `Authorization: Bearer {YOUR_ACCESS_TOKEN}`

**Expected Result:**
- Status: 200 OK
- Download URL with expiration
```json
{
  "downloadUrl": "http://localhost:3000/uploads/firms/.../document.pdf",
  "expiresAt": "2025-11-11T13:00:00.000Z"
}
```

**Pass/Fail:** ☐

---

### Test 3.8: Delete Document
**Purpose:** Remove a document from the system

**Steps:**
1. Send DELETE request to `http://localhost:3000/documents/{DOCUMENT_ID}`
2. Headers: `Authorization: Bearer {YOUR_ACCESS_TOKEN}`

**Expected Result:**
- Status: 200 OK
- Confirmation message
```json
{
  "message": "Document deleted successfully",
  "documentId": "uuid"
}
```

**Pass/Fail:** ☐

---

### Test 3.9: Document Multi-Tenant Isolation (Security Test)
**Purpose:** Verify users cannot access other firms' documents

**Prerequisites:** Upload a document as a user from a different firm

**Steps:**
1. Try to access another firm's document using your token
2. Send GET request to `http://localhost:3000/documents/{OTHER_FIRM_DOCUMENT_ID}`
3. Headers: `Authorization: Bearer {YOUR_ACCESS_TOKEN}`

**Expected Result:**
- Status: 404 Not Found
- (Returns 404 instead of 403 to prevent information leakage)

**Pass/Fail:** ☐

---

## Test Suite 4: Template Management

### Test 4.1: Load Default Templates (Optional)
**Purpose:** Populate database with default templates

**Steps:**
1. Run seed file:
```bash
psql postgresql://postgres:postgres@localhost:5435/demand_letters \
  -f services/database/seeds/001_default_templates.sql
```

**Expected Result:**
- 3 default templates created:
  - Personal Injury Demand Letter
  - Property Damage Claim
  - Contract Breach Notice

**Pass/Fail:** ☐

---

### Test 4.2: List Templates
**Purpose:** Retrieve all firm templates

**Steps:**
1. Send GET request to `http://localhost:3000/templates`
2. Headers: `Authorization: Bearer {YOUR_ACCESS_TOKEN}`

**Expected Result:**
- Status: 200 OK
- List of templates (may include default templates if seeded)
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "Personal Injury Demand Letter",
      "description": "Standard demand letter for personal injury claims",
      "isDefault": true,
      "currentVersionNumber": 1,
      "createdBy": "System",
      "createdAt": "2025-11-11T12:00:00.000Z",
      "updatedAt": "2025-11-11T12:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50,
  "totalPages": 1
}
```

**Pass/Fail:** ☐

---

### Test 4.3: Create Custom Template
**Purpose:** Create a new template with variables

**Prerequisites:** User must have admin role

**Steps:**
1. Send POST request to `http://localhost:3000/templates`
2. Headers:
   - `Authorization: Bearer {YOUR_ACCESS_TOKEN}`
   - `Content-Type: application/json`
3. Body:
```json
{
  "name": "Simple Demand Template",
  "description": "A basic demand letter template",
  "content": "Dear {{defendant_name}},\n\nOn behalf of {{plaintiff_name}}, I am writing to demand payment in the amount of {{demand_amount}} for damages sustained on {{incident_date}}.\n\nThe incident occurred at {{incident_location}} and resulted in {{total_damages}} in total damages.\n\nPlease respond by {{deadline_date}}.\n\nSincerely,\n{{attorney_name}}\n{{firm_name}}",
  "isDefault": false
}
```

**Expected Result:**
- Status: 201 Created
- Template created with version 1
- Variables automatically extracted
```json
{
  "id": "uuid",
  "name": "Simple Demand Template",
  "description": "A basic demand letter template",
  "isDefault": false,
  "currentVersionNumber": 1,
  "currentVersion": {
    "versionNumber": 1,
    "content": "Dear {{defendant_name}}...",
    "variables": [
      "defendant_name",
      "plaintiff_name",
      "demand_amount",
      "incident_date",
      "incident_location",
      "total_damages",
      "deadline_date",
      "attorney_name",
      "firm_name"
    ],
    "createdBy": "uuid",
    "createdAt": "2025-11-11T12:00:00.000Z"
  }
}
```

**Pass/Fail:** ☐

**Save for later:** Copy `id` (template ID)

---

### Test 4.4: Get Template Details
**Purpose:** Retrieve full template with version history

**Steps:**
1. Send GET request to `http://localhost:3000/templates/{TEMPLATE_ID}`
2. Headers: `Authorization: Bearer {YOUR_ACCESS_TOKEN}`

**Expected Result:**
- Status: 200 OK
- Complete template with current version and history
```json
{
  "id": "uuid",
  "name": "Simple Demand Template",
  "description": "A basic demand letter template",
  "isDefault": false,
  "currentVersionNumber": 1,
  "createdBy": "uuid",
  "createdAt": "2025-11-11T12:00:00.000Z",
  "updatedAt": "2025-11-11T12:00:00.000Z",
  "currentVersion": {
    "versionNumber": 1,
    "content": "Dear {{defendant_name}}...",
    "variables": ["defendant_name", "plaintiff_name", ...],
    "createdBy": "uuid",
    "createdAt": "2025-11-11T12:00:00.000Z"
  },
  "versionHistory": [
    {
      "versionNumber": 1,
      "content": "Dear {{defendant_name}}...",
      "variables": ["defendant_name", ...],
      "createdBy": "uuid",
      "createdByName": "John Doe",
      "createdAt": "2025-11-11T12:00:00.000Z"
    }
  ]
}
```

**Pass/Fail:** ☐

---

### Test 4.5: Update Template (Metadata Only)
**Purpose:** Update template name/description without creating new version

**Steps:**
1. Send PUT request to `http://localhost:3000/templates/{TEMPLATE_ID}`
2. Headers:
   - `Authorization: Bearer {YOUR_ACCESS_TOKEN}`
   - `Content-Type: application/json`
3. Body:
```json
{
  "name": "Updated Template Name",
  "description": "Updated description"
}
```

**Expected Result:**
- Status: 200 OK
- Template updated, version number unchanged (still 1)

**Pass/Fail:** ☐

---

### Test 4.6: Update Template Content (Creates New Version)
**Purpose:** Update template content to trigger automatic versioning

**Steps:**
1. Send PUT request to `http://localhost:3000/templates/{TEMPLATE_ID}`
2. Headers:
   - `Authorization: Bearer {YOUR_ACCESS_TOKEN}`
   - `Content-Type: application/json`
3. Body:
```json
{
  "content": "UPDATED: Dear {{defendant_name}},\n\nThis is an updated demand for {{demand_amount}}.\n\nSincerely,\n{{attorney_name}}"
}
```

**Expected Result:**
- Status: 200 OK
- New version created (version 2)
- Variables re-extracted
- Template's `currentVersionNumber` is now 2
```json
{
  "id": "uuid",
  "currentVersionNumber": 2,
  "currentVersion": {
    "versionNumber": 2,
    "content": "UPDATED: Dear {{defendant_name}}...",
    "variables": ["defendant_name", "demand_amount", "attorney_name"],
    "createdBy": "uuid",
    "createdAt": "2025-11-11T12:05:00.000Z"
  }
}
```

**Pass/Fail:** ☐

---

### Test 4.7: Rollback Template to Previous Version
**Purpose:** Restore an earlier version of a template

**Steps:**
1. Send POST request to `http://localhost:3000/templates/{TEMPLATE_ID}/rollback`
2. Headers:
   - `Authorization: Bearer {YOUR_ACCESS_TOKEN}`
   - `Content-Type: application/json`
3. Body:
```json
{
  "versionNumber": 1
}
```

**Expected Result:**
- Status: 200 OK
- New version (3) created with content from version 1
- Template's `currentVersionNumber` is now 3
- Content matches version 1

**Pass/Fail:** ☐

**Note:** Rollback creates a new version rather than deleting versions (preserves audit trail)

---

### Test 4.8: Template Variable Validation
**Purpose:** Verify invalid variable syntax is rejected

**Steps:**
1. Send POST request to create template with invalid variable syntax
2. Body:
```json
{
  "name": "Invalid Template",
  "description": "Test",
  "content": "This has {{Invalid-Variable}} and {{123invalid}} and {{UPPERCASE}}"
}
```

**Expected Result:**
- Status: 400 Bad Request
- Error indicating variable syntax issues
- Valid format: lowercase letters, numbers, underscores only

**Pass/Fail:** ☐

---

### Test 4.9: Delete Template
**Purpose:** Remove a template from the system

**Steps:**
1. Send DELETE request to `http://localhost:3000/templates/{TEMPLATE_ID}`
2. Headers: `Authorization: Bearer {YOUR_ACCESS_TOKEN}`

**Expected Result:**
- Status: 200 OK
- Confirmation message
```json
{
  "message": "Template deleted successfully",
  "templateId": "uuid"
}
```
- Template and all versions removed from database

**Pass/Fail:** ☐

---

### Test 4.10: Template Multi-Tenant Isolation (Security Test)
**Purpose:** Verify users cannot access other firms' templates

**Prerequisites:** Create a template as a user from a different firm

**Steps:**
1. Try to access another firm's template using your token
2. Send GET request to `http://localhost:3000/templates/{OTHER_FIRM_TEMPLATE_ID}`
3. Headers: `Authorization: Bearer {YOUR_ACCESS_TOKEN}`

**Expected Result:**
- Status: 404 Not Found

**Pass/Fail:** ☐

---

### Test 4.11: Admin-Only Template Creation (Security Test)
**Purpose:** Verify non-admin users cannot create templates

**Prerequisites:** Create a non-admin user (role: attorney or paralegal)

**Steps:**
1. Login as non-admin user
2. Attempt to create a template with non-admin token
3. Send POST to `http://localhost:3000/templates` with non-admin token

**Expected Result:**
- Status: 403 Forbidden
- Error: "Insufficient permissions"

**Pass/Fail:** ☐

---

## Test Suite 5: Integration & Workflow Tests

### Test 5.1: Complete User Journey
**Purpose:** Verify end-to-end workflow

**Steps:**
1. Register new user
2. Login and receive tokens
3. Get user profile
4. Upload a document
5. Create a template
6. List documents and templates
7. Update template (create new version)
8. Logout

**Expected Result:**
- All steps complete successfully
- Data persists correctly
- Authentication maintained throughout

**Pass/Fail:** ☐

---

### Test 5.2: Concurrent Users (Same Firm)
**Purpose:** Verify multiple users in same firm can work simultaneously

**Steps:**
1. Create 2-3 users in the same firm
2. Login with each user (different browser/client)
3. Upload documents with different users
4. Verify all users can see all firm documents
5. Verify only admins can create templates

**Expected Result:**
- Users share access to firm data
- Permissions enforced correctly
- No data corruption

**Pass/Fail:** ☐

---

### Test 5.3: Session Expiration
**Purpose:** Verify token expiration handling

**Steps:**
1. Login and get access token
2. Wait for token to expire (1 hour, or modify JWT_EXPIRES_IN in .env for faster testing)
3. Attempt to use expired token
4. Use refresh token to get new access token
5. Verify new token works

**Expected Result:**
- Expired token returns 401 Unauthorized
- Refresh token successfully returns new access token
- New token allows API access

**Pass/Fail:** ☐

---

## Test Results Summary

**Date Tested:** ___________
**Tester:** ___________
**Environment:** ☐ Local Dev  ☐ Staging  ☐ Production

### Results by Test Suite

| Test Suite | Total Tests | Passed | Failed | Skipped | Pass Rate |
|------------|-------------|--------|--------|---------|-----------|
| 1. Authentication & User Management | 6 | ___ | ___ | ___ | ___% |
| 2. Firm & User Management | 4 | ___ | ___ | ___ | ___% |
| 3. Document Upload & Management | 9 | ___ | ___ | ___ | ___% |
| 4. Template Management | 11 | ___ | ___ | ___ | ___% |
| 5. Integration & Workflow | 3 | ___ | ___ | ___ | ___% |
| **TOTAL** | **33** | ___ | ___ | ___ | ___% |

### Critical Issues Found
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

### Non-Critical Issues Found
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

### Notes
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

---

## Troubleshooting Common Issues

### Issue: "Connection refused" or "ECONNREFUSED"
**Solution:** Verify API server is running (`npm run dev`) and listening on port 3000

### Issue: "Database connection error"
**Solution:**
- Check PostgreSQL container is running: `docker ps | grep postgres`
- Verify connection string in .env matches Docker port (5435)

### Issue: "Invalid token" or "Token expired"
**Solution:**
- Login again to get fresh token
- Check JWT_SECRET in .env matches between requests
- Verify token is being sent in Authorization header correctly

### Issue: "Firm not found"
**Solution:** Verify firm exists in database with the UUID you're using

### Issue: File upload fails
**Solution:**
- Check file size is under 50MB
- Verify file type is supported (PDF, DOCX, DOC, images)
- Ensure `uploads/` directory exists and is writable

### Issue: Templates not appearing
**Solution:**
- Run seed file to create default templates
- Verify user has correct firmId in token
- Check templates table in database

---

## Appendix: Standard Template Variables

These variables are supported in templates:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{plaintiff_name}}` | Name of plaintiff/claimant | John Smith |
| `{{plaintiff_address}}` | Plaintiff's address | 123 Main St, City, ST 12345 |
| `{{defendant_name}}` | Name of defendant | ABC Company |
| `{{defendant_address}}` | Defendant's address | 456 Oak Ave, City, ST 67890 |
| `{{case_number}}` | Case reference number | 2025-CV-001234 |
| `{{incident_date}}` | Date of incident | January 15, 2025 |
| `{{incident_location}}` | Where incident occurred | Main St & 1st Ave |
| `{{total_damages}}` | Total damages claimed | $50,000 |
| `{{medical_expenses}}` | Medical costs | $25,000 |
| `{{property_damages}}` | Property damage costs | $10,000 |
| `{{lost_wages}}` | Lost income | $15,000 |
| `{{demand_amount}}` | Total amount demanded | $75,000 |
| `{{deadline_date}}` | Response deadline | February 15, 2025 |
| `{{attorney_name}}` | Attorney name | Jane Attorney, Esq. |
| `{{attorney_signature}}` | Attorney signature block | [Signature block] |
| `{{firm_name}}` | Law firm name | Acme Law Firm |
| `{{firm_address}}` | Firm address | 789 Legal Blvd, City, ST |
| `{{firm_phone}}` | Firm phone | (555) 123-4567 |

---

## Next Steps After Testing

Once all tests pass:
1. Document any issues or bugs found
2. Run automated test suite: `npm test`
3. Ready to proceed with Block 4 (AI Processing) implementation
4. Consider frontend development (Blocks 6-7) for UI testing

**End of Manual Testing Guide**
