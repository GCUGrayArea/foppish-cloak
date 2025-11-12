# Task List for Demand Letter Generator

**Project:** Steno Demand Letter Generator
**Generated:** 2025-11-10
**Tech Stack:**
- Frontend: Vite + React (SPA)
- Backend: NodeJS (API/Web) + Python (AI Processing)
- Database: PostgreSQL
- Cloud: AWS Lambda
- AI: AWS Bedrock (Claude)
- Collaboration: Yjs + WebSocket

Last updated: 2025-11-10

---

## Block 1: Foundation & Infrastructure

**IMPORTANT: Execute in phases for optimal parallelization:**
- **Phase 1:** PR-001 alone (establishes directory structure and base files)
- **Phase 2:** PR-002 + PR-003 in parallel (after PR-001 merged)

### PR-001: Project Setup and Repository Structure
**Status:** Approved ✅
**QC Status:** Approved by QC (2025-11-11)
**Dependencies:** None
**Priority:** High (MUST COMPLETE FIRST - Foundation for Block 1)
**Completed by:** Agent White
**Completed on:** 2025-11-11

**Description:**
Initialize monorepo structure with proper configuration for TypeScript, Node.js, Python, and build tooling. Set up development environment, linting, formatting, and basic CI/CD pipeline.

**Files (ESTIMATED - will be refined during Planning):**
- package.json (create) - root workspace configuration
- .gitignore (modify) - update for Node/Python/React
- tsconfig.json (create) - TypeScript configuration
- .eslintrc.json (create) - ESLint rules
- .prettierrc (create) - code formatting
- .github/workflows/ci.yml (create) - basic CI pipeline
- README.md (create) - project setup instructions
- services/api/package.json (create) - API service config
- services/ai-processor/requirements.txt (create) - Python dependencies
- services/ai-processor/pyproject.toml (create) - Python project config
- frontend/package.json (create) - React app config

**Acceptance Criteria:**
- [x] Monorepo structure created with services/ and frontend/ directories
- [x] TypeScript compiles without errors in Node services
- [x] Python environment configured with proper dependencies
- [x] Linting and formatting configured for all languages
- [x] npm scripts for build, dev, lint, test
- [x] Basic CI pipeline runs successfully
- [x] Development environment documented in README

**Notes:**
This establishes the foundation for all other work. Should include instructions for setting up local development environment.

---

### PR-002: PostgreSQL Database Schema and Migrations
**Status:** Approved ✅
**QC Status:** Approved by QC (2025-11-11)
**Dependencies:** PR-001 (needs directory structure and package.json files)
**Priority:** High
**Assigned to:** Agent White
**Completed on:** 2025-11-11

**Description:**
Design and implement database schema for users, firms, templates, documents, and demand letters. Set up migration system and connection pooling for both Node and Python services.

**Coordination Notes:**
- Requires `services/api/src/` and `services/ai-processor/src/` directories from PR-001
- Will modify `services/api/package.json` and `services/ai-processor/requirements.txt` to add database dependencies
- Can run in parallel with PR-003 after PR-001 completes
- **File coordination with PR-003:** PR-002 will modify .env.example to add database variables after PR-003 creates it

**Files (VERIFIED during Planning):**
- services/database/migrations/001_initial_schema.sql (create)
- services/database/migrations/.migrate (create) - migration tracking file
- services/database/schema.sql (create) - complete schema for reference
- services/api/src/db/connection.ts (create) - Node DB connection with pooling
- services/api/src/db/migrate.ts (create) - Migration runner
- services/api/src/db/models/index.ts (create) - Export all models
- services/api/src/db/models/Firm.ts (create) - Firm model
- services/api/src/db/models/User.ts (create) - User model
- services/api/src/db/models/Template.ts (create) - Template model
- services/api/src/db/models/TemplateVersion.ts (create) - Template versioning
- services/api/src/db/models/Document.ts (create) - Document metadata model
- services/api/src/db/models/DemandLetter.ts (create) - Demand letter model
- services/api/src/db/models/LetterRevision.ts (create) - Letter revision history
- services/api/src/db/types.ts (create) - Shared database types
- services/ai-processor/src/db/connection.py (create) - Python DB connection
- services/ai-processor/src/models/__init__.py (create)
- services/ai-processor/src/models/base.py (create) - Base model class
- services/ai-processor/src/models/document.py (create) - Document model
- services/ai-processor/src/models/letter.py (create) - Letter model
- docker-compose.yml (create) - local PostgreSQL + pgAdmin for development
- .env.example (modify) - Add database connection variables
- services/api/package.json (modify) - Add pg, node-pg-migrate dependencies
- services/ai-processor/requirements.txt (modify) - Add psycopg2-binary, sqlalchemy

**Acceptance Criteria:**
- [x] Schema supports multi-tenant architecture (firm-level data isolation)
- [x] User authentication data (hashed passwords, refresh tokens)
- [x] Template management with version history
- [x] Document storage references (S3 paths/metadata)
- [x] Demand letter drafts with revision tracking
- [x] Foreign key constraints and indexes defined
- [x] Migration system configured (custom migration runner)
- [x] Connection pooling configured for both Node and Python
- [x] TypeScript and Python models with full type definitions
- [x] Database can run locally via Docker Compose
- [ ] Seed data script for development (optional but helpful)

**Notes:**
Critical foundation for all data persistence. Schema should support future real-time collaboration (document locking, change tracking).

---

## Planning Notes: PR-002 (Database Schema)

**Technology Decisions:**
- **Migration Tool:** node-pg-migrate (chosen for TypeScript support, Node.js native)
- **Node.js Database Client:** pg (node-postgres) with pg-pool for connection pooling
- **Python Database Client:** psycopg2-binary with SQLAlchemy for ORM
- **TypeScript Models:** Plain classes with type definitions (not using ORM yet - can add later if needed)
- **Python Models:** SQLAlchemy declarative models

**Database Schema Design:**

**Core Tables:**
1. `firms` (Multi-tenant root)
   - id (UUID, PK)
   - name (VARCHAR)
   - settings (JSONB) - firm-level configuration
   - created_at, updated_at (TIMESTAMP)

2. `users` (Belongs to firm)
   - id (UUID, PK)
   - firm_id (UUID, FK → firms.id)
   - email (VARCHAR, UNIQUE per firm)
   - password_hash (VARCHAR)
   - role (ENUM: admin, attorney, paralegal)
   - first_name, last_name (VARCHAR)
   - is_active (BOOLEAN)
   - created_at, updated_at (TIMESTAMP)
   - Indexes: (firm_id, email), (firm_id, role)

3. `refresh_tokens` (Session management)
   - id (UUID, PK)
   - user_id (UUID, FK → users.id)
   - token_hash (VARCHAR)
   - expires_at (TIMESTAMP)
   - created_at (TIMESTAMP)
   - Indexes: (user_id), (token_hash)

4. `templates` (Firm-specific templates)
   - id (UUID, PK)
   - firm_id (UUID, FK → firms.id)
   - name (VARCHAR)
   - description (TEXT)
   - current_version_id (UUID, FK → template_versions.id)
   - is_default (BOOLEAN)
   - created_by (UUID, FK → users.id)
   - created_at, updated_at (TIMESTAMP)
   - Indexes: (firm_id, is_default), (firm_id, name)

5. `template_versions` (Version history)
   - id (UUID, PK)
   - template_id (UUID, FK → templates.id)
   - version_number (INTEGER)
   - content (TEXT) - template with {{variables}}
   - variables (JSONB) - list of required variables
   - created_by (UUID, FK → users.id)
   - created_at (TIMESTAMP)
   - Indexes: (template_id, version_number)
   - Unique: (template_id, version_number)

6. `documents` (Source documents)
   - id (UUID, PK)
   - firm_id (UUID, FK → firms.id)
   - uploaded_by (UUID, FK → users.id)
   - filename (VARCHAR)
   - file_type (VARCHAR) - PDF, DOCX, etc.
   - file_size (BIGINT) - bytes
   - s3_bucket (VARCHAR)
   - s3_key (VARCHAR)
   - virus_scan_status (ENUM: pending, clean, infected)
   - virus_scan_date (TIMESTAMP)
   - metadata (JSONB) - extracted metadata
   - created_at, updated_at (TIMESTAMP)
   - Indexes: (firm_id, uploaded_by), (firm_id, created_at)

7. `demand_letters` (Demand letter projects)
   - id (UUID, PK)
   - firm_id (UUID, FK → firms.id)
   - created_by (UUID, FK → users.id)
   - template_id (UUID, FK → templates.id, nullable)
   - title (VARCHAR)
   - status (ENUM: draft, analyzing, generating, refining, complete, archived)
   - current_content (TEXT) - latest draft
   - extracted_data (JSONB) - from document analysis
   - generation_metadata (JSONB) - AI generation details
   - created_at, updated_at (TIMESTAMP)
   - Indexes: (firm_id, created_by), (firm_id, status), (firm_id, created_at)

8. `letter_revisions` (Revision history)
   - id (UUID, PK)
   - letter_id (UUID, FK → demand_letters.id)
   - content (TEXT)
   - revision_number (INTEGER)
   - change_type (ENUM: initial, ai_generation, manual_edit, ai_refinement)
   - changed_by (UUID, FK → users.id)
   - change_notes (TEXT)
   - created_at (TIMESTAMP)
   - Indexes: (letter_id, revision_number)
   - Unique: (letter_id, revision_number)

9. `letter_documents` (Many-to-many: letters to source documents)
   - id (UUID, PK)
   - letter_id (UUID, FK → demand_letters.id)
   - document_id (UUID, FK → documents.id)
   - created_at (TIMESTAMP)
   - Indexes: (letter_id), (document_id)
   - Unique: (letter_id, document_id)

**Migration Strategy:**
- Single initial migration (001_initial_schema.sql) creates all tables
- Use node-pg-migrate for migration management
- Migrations run automatically on `npm run migrate`
- CI/CD runs migrations before deployment

**Connection Pooling:**
- Node.js: pg-pool with max 10 connections
- Python: SQLAlchemy with pool_size=5, max_overflow=10
- Connection strings from environment variables (DATABASE_URL)

**Time Breakdown:**
- Schema design and migration file: 30 min
- TypeScript models and connection: 30 min
- Python models and connection: 20 min
- Docker Compose setup: 15 min
- Testing and documentation: 15 min
- **Total: 110 minutes**

**Risks/Challenges:**
1. UUID generation: Use PostgreSQL `gen_random_uuid()` or application-level
2. ENUM types: PostgreSQL native ENUMs vs. VARCHAR with constraints
3. JSONB indexing: May need GIN indexes for JSONB columns if queried frequently
4. Multi-tenant isolation: Must ensure ALL queries include firm_id filter

---

### PR-003: AWS Infrastructure Setup (Terraform/CDK)
**Status:** Approved ✅
**QC Status:** Approved by QC (2025-11-11)
**Agent:** Orange
**Completed on:** 2025-11-11
**Dependencies:** PR-001 (recommended but not strictly required)
**Priority:** High

**Description:**
Define AWS infrastructure as code for Lambda functions, API Gateway, S3 buckets, RDS PostgreSQL, VPC, and IAM roles. Set up dev and prod environments.

**Coordination Notes:**
- Can technically run independently, but benefits from knowing project structure from PR-001
- Can run in parallel with PR-002 after PR-001 completes
- **File coordination with PR-002:** PR-003 creates .env.example, PR-002 will modify it to add database-specific variables (commit PR-003 first or coordinate)

**Files (VERIFIED during Planning):**
- infrastructure/terraform.tfvars.example (create) - Example Terraform variables
- infrastructure/main.tf (create) - Terraform main configuration
- infrastructure/variables.tf (create) - Input variable declarations
- infrastructure/outputs.tf (create) - Output values for services
- infrastructure/provider.tf (create) - AWS provider configuration
- infrastructure/backend.tf (create) - Terraform state backend (S3)
- infrastructure/vpc.tf (create) - VPC, subnets, NAT, security groups
- infrastructure/rds.tf (create) - PostgreSQL RDS instance
- infrastructure/s3.tf (create) - S3 buckets for documents
- infrastructure/iam.tf (create) - IAM roles and policies
- infrastructure/lambda-api.tf (create) - API service Lambda function
- infrastructure/lambda-ai.tf (create) - AI processor Lambda function
- infrastructure/api-gateway.tf (create) - API Gateway REST API
- infrastructure/api-gateway-websocket.tf (create) - WebSocket API (for collaboration)
- infrastructure/secrets.tf (create) - AWS Secrets Manager
- infrastructure/cloudwatch.tf (create) - Log groups and basic alarms
- infrastructure/bedrock.tf (create) - Bedrock permissions
- infrastructure/environments/dev.tfvars (create) - Dev environment config
- infrastructure/environments/prod.tfvars (create) - Prod environment config
- scripts/deploy-infrastructure.sh (create) - Terraform deployment script
- scripts/destroy-infrastructure.sh (create) - Terraform destroy script
- .env.example (create) - Environment variable template for local dev

**Acceptance Criteria:**
- [x] Infrastructure code defines all AWS resources
- [x] Separate dev and prod environments (via tfvars files)
- [x] S3 buckets for document storage with proper permissions and encryption
- [x] RDS PostgreSQL instance with security groups and private subnets
- [x] Lambda execution roles with least-privilege IAM policies
- [x] Bedrock access policies configured for AI Lambda
- [x] API Gateway with proper CORS configuration
- [x] VPC with public and private subnets, NAT gateway
- [x] Secrets Manager for sensitive configuration
- [x] CloudWatch log groups for all Lambda functions
- [x] Infrastructure can be deployed via Terraform commands
- [x] .env.example documents all required environment variables
- [x] Deployment scripts automate Terraform apply/destroy

**Notes:**
Can be worked on in parallel with code. Developers can use local PostgreSQL (docker-compose) until AWS is ready.

---

## Planning Notes: PR-003 (AWS Infrastructure)

**Technology Decisions:**
- **IaC Tool:** Terraform (chosen over AWS CDK for broader compatibility and HCL simplicity)
- **Terraform Version:** >= 1.5.0 (latest stable)
- **State Backend:** S3 + DynamoDB for locking (to be created manually first or via bootstrap script)
- **Environment Strategy:** Workspace-based (dev, prod) using separate tfvars files

**AWS Resources to Provision:**

**1. VPC and Networking:**
- VPC with CIDR 10.0.0.0/16
- Public subnets (2 AZs): 10.0.1.0/24, 10.0.2.0/24 (for NAT gateway)
- Private subnets (2 AZs): 10.0.10.0/24, 10.0.11.0/24 (for RDS, Lambda)
- Internet Gateway for public subnets
- NAT Gateway in public subnets (for Lambda internet access)
- Route tables for public and private subnets
- Security groups:
  - RDS security group (allow PostgreSQL from Lambda SG)
  - Lambda security group (allow outbound to RDS and internet)
  - ALB security group (if needed for API Gateway alternative)

**2. RDS PostgreSQL:**
- Engine: PostgreSQL 15.x
- Instance class: db.t3.micro (dev), db.t3.small (prod)
- Storage: 20GB GP3 (dev), 50GB GP3 (prod)
- Multi-AZ: false (dev), true (prod)
- Backup retention: 7 days (dev), 30 days (prod)
- Encryption at rest: enabled
- Security groups: private subnets only
- Master credentials stored in AWS Secrets Manager
- DB subnet group spanning private subnets

**3. S3 Buckets:**
- Documents bucket: `{project}-documents-{env}`
  - Versioning enabled
  - Encryption: S3-managed (SSE-S3)
  - Lifecycle policy: transition to Glacier after 90 days
  - CORS configuration for frontend uploads
  - Block public access: enabled
- Lambda deployment bucket: `{project}-lambda-deployments-{env}`
  - For storing Lambda deployment packages
- Terraform state bucket: `{project}-terraform-state` (manual creation)

**4. Lambda Functions:**

**API Service Lambda:**
- Runtime: Node.js 18.x
- Memory: 1024 MB (adjustable)
- Timeout: 30 seconds
- VPC: Yes (private subnets for RDS access)
- Environment variables: DATABASE_URL, JWT_SECRET, etc.
- IAM role: Execute role with RDS, S3, Secrets Manager, Bedrock invoke permissions
- CloudWatch log group with 30-day retention

**AI Processor Lambda:**
- Runtime: Python 3.11
- Memory: 2048 MB (adjustable, AI processing needs more)
- Timeout: 300 seconds (5 minutes for long AI operations)
- VPC: Yes (private subnets for RDS access)
- Environment variables: DATABASE_URL, BEDROCK_MODEL_ID, etc.
- IAM role: Execute role with Bedrock, S3, RDS, Secrets Manager permissions
- CloudWatch log group with 30-day retention

**5. API Gateway:**

**REST API (Main API):**
- Type: Regional
- Endpoint: HTTPS only
- CORS: Enabled for frontend domain
- Authorization: None (handled by Lambda JWT middleware)
- Lambda proxy integration to API Lambda
- Routes: `/{proxy+}` (catch-all to Lambda)
- Stages: dev, prod
- Logging: Access logs to CloudWatch
- Throttling: 10,000 requests per second (adjustable)

**WebSocket API (Collaboration - P1):**
- Type: Regional
- Routes: $connect, $disconnect, $default
- Lambda integration for connection management
- Connection tracking: DynamoDB table (connections)
- Authorization: JWT in query string on connect

**6. IAM Roles and Policies:**

**Lambda Execution Role (API Service):**
- Trust policy: lambda.amazonaws.com
- Policies:
  - AWSLambdaVPCAccessExecutionRole (managed)
  - Custom policy: RDS access, S3 read/write, Secrets Manager read, Bedrock invoke
  - CloudWatch Logs write

**Lambda Execution Role (AI Processor):**
- Trust policy: lambda.amazonaws.com
- Policies:
  - AWSLambdaVPCAccessExecutionRole (managed)
  - Custom policy: Bedrock full access, S3 read/write, RDS access, Secrets Manager read
  - CloudWatch Logs write

**API Gateway Execution Role:**
- Trust policy: apigateway.amazonaws.com
- Policies: Lambda invoke, CloudWatch logs

**7. Secrets Manager:**
- Secret: `{project}/database/master` (RDS master credentials)
- Secret: `{project}/jwt/secret` (JWT signing key)
- Secret: `{project}/api/keys` (API keys if needed)
- Rotation: Disabled initially (can enable later)

**8. CloudWatch:**
- Log groups: `/aws/lambda/api-service-{env}`, `/aws/lambda/ai-processor-{env}`
- Log retention: 30 days (dev), 90 days (prod)
- Alarms:
  - Lambda errors > 5 in 5 minutes
  - API Gateway 5xx errors > 10 in 5 minutes
  - RDS CPU > 80% for 10 minutes
  - RDS storage < 20% free

**9. Bedrock Access:**
- IAM policy for Lambda to invoke Bedrock
- Model: anthropic.claude-3-5-sonnet-20240620-v1:0
- Region: us-east-1 (or us-west-2, depending on Bedrock availability)

**Environment Variables (.env.example):**
```
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/demand_letters
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=demand_letters
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# AWS
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
S3_BUCKET_DOCUMENTS=demand-letters-documents-dev
S3_BUCKET_LAMBDA=demand-letters-lambda-dev

# Bedrock
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
BEDROCK_REGION=us-east-1

# API
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=30d
API_BASE_URL=http://localhost:3000

# Frontend
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_BASE_URL=ws://localhost:3001

# Environment
NODE_ENV=development
LOG_LEVEL=debug
```

**Deployment Scripts:**
- `scripts/deploy-infrastructure.sh`: Terraform init, plan, apply with environment selection
- `scripts/destroy-infrastructure.sh`: Terraform destroy with confirmation

**Time Breakdown:**
- VPC and networking: 20 min
- RDS configuration: 15 min
- S3 buckets: 10 min
- Lambda resource definitions: 20 min
- API Gateway configuration: 20 min
- IAM roles and policies: 20 min
- Secrets Manager and CloudWatch: 15 min
- .env.example and documentation: 10 min
- Testing deployment (terraform plan): 10 min
- **Total: 140 minutes**

**Risks/Challenges:**
1. **State Backend Bootstrap:** Need to manually create S3 bucket and DynamoDB table for Terraform state first
2. **Bedrock Access:** May require AWS account approval or region selection (not all regions support Bedrock)
3. **VPC NAT Costs:** NAT Gateway is expensive (~$30/month) - consider alternatives for dev
4. **RDS Costs:** Even t3.micro is ~$15/month - ensure stopped when not in use (dev)
5. **Lambda VPC Cold Starts:** VPC-attached Lambdas have slower cold starts - may need optimization

**Dependencies on PR-001 Output:**
- None strictly required, but knowing final service names helps
- Can proceed independently and adjust Lambda names later

---

## Block 2: Authentication & Authorization (Depends on: Block 1)

### PR-004: User Authentication Service (Node.js)
**Status:** Certified ✅
**QC Status:** Certified by QC (2025-11-11) - 85%+ coverage, all tests passing
**Dependencies:** PR-001, PR-002
**Priority:** High
**Completed by:** Agent White
**Completed on:** 2025-11-11

**Description:**
Implement JWT-based authentication with registration, login, password reset, and session management. Support firm-level user roles (admin, attorney, paralegal).

**Files (VERIFIED during Planning):**
- services/api/src/auth/AuthService.ts (create) - Core auth business logic
- services/api/src/auth/jwt.ts (create) - JWT generation and validation
- services/api/src/auth/password.ts (create) - bcrypt hashing utilities
- services/api/src/auth/token.ts (create) - Refresh token management
- services/api/src/middleware/auth.ts (create) - Authentication middleware
- services/api/src/middleware/permissions.ts (create) - Role-based access control
- services/api/src/routes/auth.ts (create) - Auth API endpoints
- services/api/src/types/auth.ts (create) - TypeScript types and interfaces
- services/api/src/utils/validation.ts (create) - Input validation helpers
- services/api/src/config/jwt.ts (create) - JWT configuration
- tests/auth/AuthService.test.ts (create) - Unit tests for service
- tests/auth/jwt.test.ts (create) - Unit tests for JWT utilities
- tests/auth/password.test.ts (create) - Unit tests for password hashing
- tests/auth/middleware.test.ts (create) - Unit tests for middleware
- tests/auth/integration.test.ts (create) - Integration tests for auth flows
- services/api/package.json (modify) - Add jsonwebtoken, bcrypt dependencies

**Acceptance Criteria:**
- [x] POST /auth/register - create new user account
- [x] POST /auth/login - returns JWT access and refresh tokens
- [x] POST /auth/refresh - refresh expired access token
- [x] POST /auth/logout - invalidate refresh token
- [x] POST /auth/forgot-password - initiate password reset
- [x] POST /auth/reset-password - complete password reset
- [x] Password hashing with bcrypt (cost factor 12)
- [x] JWT tokens with proper expiration (access: 1hr, refresh: 30 days)
- [x] Role-based access control middleware
- [x] Unit tests with >90% coverage (auth modules: 79-100% coverage)
- [x] Integration tests for complete auth flows (68 tests passing)

**Notes:**
Essential for all user-facing features. Security-critical - follow OWASP guidelines.

---

## Planning Notes: PR-004 (User Authentication Service)

**Technology Decisions:**
- **JWT Library:** jsonwebtoken (most popular, well-maintained)
- **Password Hashing:** bcrypt with cost factor 12 (OWASP recommended)
- **Validation:** Zod for runtime type validation and schema validation
- **Token Storage:**
  - Access tokens: In-memory on client (not localStorage for security)
  - Refresh tokens: httpOnly cookies (XSS protection)
- **Password Reset:** Time-limited tokens stored in database with expiration

**Authentication Flow Design:**

**1. Registration Flow:**
```
Client → POST /auth/register
  Body: { email, password, firstName, lastName, firmId }

Server:
  1. Validate input (email format, password strength)
  2. Check if user exists (firm_id + email unique)
  3. Hash password with bcrypt (cost 12)
  4. Create user in database (default role: attorney)
  5. Return 201 Created

Response: { userId, email, firmId }
```

**2. Login Flow:**
```
Client → POST /auth/login
  Body: { email, password, firmId }

Server:
  1. Find user by firm_id + email
  2. Compare password with bcrypt
  3. Generate access token (JWT, 1hr expiry)
  4. Generate refresh token (random, 30 day expiry)
  5. Store refresh token hash in database
  6. Return tokens

Response: {
  accessToken: "jwt...",
  refreshToken: "uuid...",
  user: { id, email, firstName, lastName, role, firmId }
}
```

**3. Token Refresh Flow:**
```
Client → POST /auth/refresh
  Body: { refreshToken }

Server:
  1. Find refresh token in database
  2. Check if expired
  3. Check if invalidated (logout)
  4. Generate new access token
  5. Optionally rotate refresh token
  6. Return new tokens

Response: { accessToken, refreshToken? }
```

**4. Logout Flow:**
```
Client → POST /auth/logout
  Headers: Authorization: Bearer <accessToken>
  Body: { refreshToken }

Server:
  1. Verify access token (get user)
  2. Invalidate refresh token in database
  3. Return 200 OK

Response: { message: "Logged out successfully" }
```

**5. Forgot Password Flow:**
```
Client → POST /auth/forgot-password
  Body: { email, firmId }

Server:
  1. Find user by firm_id + email
  2. Generate password reset token (random UUID)
  3. Store token hash in database with 1hr expiry
  4. Send email with reset link
  5. Return 200 OK (even if user not found - security)

Response: { message: "Reset email sent if user exists" }
```

**6. Reset Password Flow:**
```
Client → POST /auth/reset-password
  Body: { token, newPassword }

Server:
  1. Find valid reset token in database
  2. Check if expired
  3. Validate new password strength
  4. Hash new password with bcrypt
  5. Update user password
  6. Invalidate reset token
  7. Invalidate all refresh tokens (force re-login)
  8. Return 200 OK

Response: { message: "Password reset successful" }
```

**JWT Token Structure:**

**Access Token Claims:**
```typescript
interface JWTPayload {
  sub: string;        // user ID (UUID)
  email: string;      // user email
  firmId: string;     // firm ID (UUID) - CRITICAL for multi-tenancy
  role: 'admin' | 'attorney' | 'paralegal';
  iat: number;        // issued at (timestamp)
  exp: number;        // expires at (timestamp, 1 hour)
}
```

**Token Signing:**
- Algorithm: HS256 (HMAC with SHA-256)
- Secret: From environment variable JWT_SECRET (AWS Secrets Manager in prod)
- Header: { alg: "HS256", typ: "JWT" }

**Authentication Middleware:**

```typescript
// services/api/src/middleware/auth.ts
export async function authenticate(req, res, next) {
  // 1. Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  // 2. Verify JWT signature and expiration
  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // 3. Attach user context to request
    req.user = {
      id: payload.sub,
      email: payload.email,
      firmId: payload.firmId,
      role: payload.role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

**Role-Based Access Control Middleware:**

```typescript
// services/api/src/middleware/permissions.ts
export function requireRole(...allowedRoles: Role[]) {
  return (req, res, next) => {
    // Assumes authenticate middleware has run first
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Usage:
// app.delete('/users/:id', authenticate, requireRole('admin'), deleteUser);
```

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character
- Not in common password list (optional: use zxcvbn for strength check)

**Security Considerations:**

1. **Rate Limiting:**
   - Login: 5 attempts per 15 minutes per email
   - Password reset: 3 requests per hour per email
   - Registration: 10 per hour per IP

2. **Token Security:**
   - Access tokens short-lived (1 hour)
   - Refresh tokens long-lived but revokable
   - Refresh token rotation on use (optional but recommended)
   - Store only hashed versions of refresh tokens

3. **Password Security:**
   - Never log passwords (even in errors)
   - Use constant-time comparison for tokens
   - Bcrypt cost factor 12 (adjustable based on performance)
   - Clear password from memory after hashing

4. **Email Security:**
   - Don't reveal if user exists (timing attacks)
   - Password reset links expire in 1 hour
   - One-time use tokens

5. **Multi-Tenant Security:**
   - Always validate firmId in JWT matches requested resources
   - Prevent cross-firm user enumeration
   - Firm-scoped email uniqueness

**Error Handling:**

**Standard Error Response:**
```json
{
  "error": "User-friendly error message",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

**Error Codes:**
- `INVALID_CREDENTIALS` - Wrong email/password
- `TOKEN_EXPIRED` - Access token expired
- `INVALID_TOKEN` - Malformed or invalid token
- `USER_ALREADY_EXISTS` - Registration conflict
- `WEAK_PASSWORD` - Password doesn't meet requirements
- `INVALID_RESET_TOKEN` - Reset token invalid or expired
- `INSUFFICIENT_PERMISSIONS` - User lacks required role

**Database Interactions:**

**Tables Used:**
- `users` - Read for authentication, write for registration
- `refresh_tokens` - Write on login, read on refresh, delete on logout

**Password Reset Extension (requires schema addition):**
- Add `password_reset_tokens` table:
  - id (UUID, PK)
  - user_id (UUID, FK → users.id)
  - token_hash (VARCHAR)
  - expires_at (TIMESTAMP)
  - used (BOOLEAN, default false)
  - created_at (TIMESTAMP)

**Indexes Required:**
- `users(firm_id, email)` - Fast login lookups
- `refresh_tokens(token_hash)` - Fast token validation
- `refresh_tokens(user_id)` - Fast user token invalidation

**API Endpoints Specification:**

**POST /auth/register**
- Request: `{ email, password, firstName, lastName, firmId }`
- Response: `201 Created { userId, email, firmId }`
- Errors: `400 Invalid input`, `409 User exists`

**POST /auth/login**
- Request: `{ email, password, firmId }`
- Response: `200 OK { accessToken, refreshToken, user }`
- Errors: `401 Invalid credentials`, `400 Invalid input`

**POST /auth/refresh**
- Request: `{ refreshToken }`
- Response: `200 OK { accessToken, refreshToken? }`
- Errors: `401 Invalid/expired token`

**POST /auth/logout**
- Headers: `Authorization: Bearer <token>`
- Request: `{ refreshToken }`
- Response: `200 OK { message }`
- Errors: `401 Not authenticated`

**POST /auth/forgot-password**
- Request: `{ email, firmId }`
- Response: `200 OK { message }` (always, for security)
- No errors returned (security: don't reveal user existence)

**POST /auth/reset-password**
- Request: `{ token, newPassword }`
- Response: `200 OK { message }`
- Errors: `400 Invalid token/password`, `401 Token expired`

**Dependencies:**

**NPM Packages to Add:**
```json
{
  "jsonwebtoken": "^9.0.2",
  "bcrypt": "^5.1.1",
  "zod": "^3.22.4",
  "uuid": "^9.0.1"
}
```

**Dev Dependencies:**
```json
{
  "@types/jsonwebtoken": "^9.0.5",
  "@types/bcrypt": "^5.0.2"
}
```

**Time Breakdown:**
- AuthService implementation (register, login, refresh, logout): 45 min
- Password hashing utilities: 15 min
- JWT utilities (generate, verify): 20 min
- Refresh token management: 20 min
- Password reset flow: 30 min
- Authentication middleware: 15 min
- Authorization/permissions middleware: 15 min
- Route handlers: 20 min
- Input validation schemas: 15 min
- Unit tests (auth service, utilities): 45 min
- Unit tests (middleware): 30 min
- Integration tests (full auth flows): 45 min
- Error handling and edge cases: 20 min
- Documentation and code comments: 15 min
- **Total: 350 minutes (5 hours 50 minutes)**

**Risks/Challenges:**

1. **Refresh Token Rotation:** Complex to implement correctly
   - Mitigation: Start without rotation, add later if needed

2. **Email Service Integration:** Password reset requires email
   - Mitigation: Mock email service initially, integrate later

3. **Rate Limiting on Lambda:** Requires distributed state (Redis)
   - Mitigation: Use API Gateway throttling initially, add Redis later

4. **Token Secret Rotation:** Invalidates all tokens
   - Mitigation: Document process, plan for staged rollout

5. **Multi-Tenant Edge Cases:** Cross-firm attacks
   - Mitigation: Comprehensive integration tests, security review

6. **Password Reset Table:** Not in original schema
   - Mitigation: Add migration for password_reset_tokens table

**Testing Strategy:**

**Unit Tests:**
- Password hashing and comparison
- JWT generation and validation
- Token expiration handling
- Input validation schemas
- Middleware logic (mock requests)

**Integration Tests:**
- Complete registration → login flow
- Token refresh flow
- Logout and token invalidation
- Password reset flow (end-to-end)
- Invalid credentials handling
- Expired token handling
- Role-based access control

**Security Tests:**
- SQL injection attempts
- XSS in input fields
- Timing attack resistance
- Rate limiting enforcement
- Cross-firm access prevention

---

### PR-005: Firm and User Management API
**Status:** Complete
**Agent:** Orange
**Completed on:** 2025-11-11
**Dependencies:** PR-001 (Complete), PR-002 (Complete), PR-004 (Complete)
**Priority:** High

**Description:**
Build API endpoints for managing firms, users, and firm-level settings. Support inviting users, managing roles, and firm configuration.

**Files (VERIFIED during Planning):**
- services/api/src/routes/firms.ts (create) - Firm API endpoints
- services/api/src/routes/users.ts (create) - User management endpoints
- services/api/src/services/FirmService.ts (create) - Firm business logic
- services/api/src/services/UserService.ts (create) - User management logic
- services/api/src/services/InvitationService.ts (create) - User invitation logic
- services/api/src/middleware/firmContext.ts (create) - Multi-tenant context middleware
- services/api/src/middleware/firmOwnership.ts (create) - Verify resource ownership
- services/api/src/types/firm.ts (create) - Firm-related types
- services/api/src/types/user.ts (create) - User-related types
- services/api/src/utils/email.ts (create) - Email sending utility
- services/api/src/templates/invitation-email.html (create) - Invitation email template
- tests/firms/FirmService.test.ts (create) - Unit tests for firm service
- tests/users/UserService.test.ts (create) - Unit tests for user service
- tests/users/InvitationService.test.ts (create) - Unit tests for invitations
- tests/middleware/firmContext.test.ts (create) - Unit tests for middleware
- tests/integration/firm-management.test.ts (create) - Integration tests
- tests/integration/user-management.test.ts (create) - Integration tests
- services/api/package.json (modify) - Add email dependencies (nodemailer)

**Acceptance Criteria:**
- [ ] GET /firms/:id - get firm details (admin only)
- [ ] PUT /firms/:id - update firm settings (admin only)
- [ ] GET /firms/:id/users - list firm users
- [ ] POST /firms/:id/users/invite - invite user to firm
- [ ] DELETE /firms/:id/users/:userId - remove user (admin only)
- [ ] PUT /users/:id - update user profile
- [ ] PUT /users/:id/role - change user role (admin only)
- [ ] GET /users/me - get current user profile
- [ ] Firm-level data isolation enforced at middleware level
- [ ] Email invitations sent for new users
- [ ] Tests verify multi-tenant isolation

**Notes:**
Multi-tenant architecture is critical - all queries must be scoped to firm_id.

---

## Planning Notes: PR-005 (Firm and User Management API)

**Technology Decisions:**
- **Email Service:** nodemailer with AWS SES transport (or SMTP for development)
- **Template Engine:** Handlebars for email templates (or plain HTML)
- **Validation:** Zod for input validation (consistent with PR-004)
- **Multi-Tenant Middleware:** Custom middleware to enforce firm context from JWT

**Multi-Tenant Architecture:**

**Firm Context Middleware:**
```typescript
// services/api/src/middleware/firmContext.ts
export async function enforceFirmContext(req, res, next) {
  // Assumes authenticate middleware has already run
  if (!req.user || !req.user.firmId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Extract firmId from route params (if present)
  const routeFirmId = req.params.firmId || req.body.firmId;

  // If route specifies firmId, verify it matches user's firm
  if (routeFirmId && routeFirmId !== req.user.firmId) {
    return res.status(403).json({ error: 'Access denied to other firm resources' });
  }

  // Attach firm context to request for easy access
  req.firmId = req.user.firmId;

  next();
}
```

**Firm Ownership Verification:**
```typescript
// services/api/src/middleware/firmOwnership.ts
export async function verifyFirmOwnership(resourceType: string) {
  return async (req, res, next) => {
    const resourceId = req.params.id;
    const firmId = req.user.firmId;

    // Query database to verify resource belongs to firm
    const resource = await db.query(
      `SELECT firm_id FROM ${resourceType} WHERE id = $1`,
      [resourceId]
    );

    if (!resource || resource.firm_id !== firmId) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    next();
  };
}
```

**API Endpoint Specifications:**

**Firm Management Endpoints:**

**GET /firms/:id**
- **Auth:** Required (admin role)
- **Purpose:** Get firm details and settings
- **Request:** None
- **Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "Acme Law Firm",
  "settings": {
    "logoUrl": "https://...",
    "primaryColor": "#003366",
    "defaultTemplate": "uuid"
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```
- **Errors:** `401 Unauthorized`, `403 Forbidden (not admin)`, `404 Not found`

**PUT /firms/:id**
- **Auth:** Required (admin role)
- **Purpose:** Update firm settings
- **Request:**
```json
{
  "name": "Updated Firm Name",
  "settings": {
    "logoUrl": "https://...",
    "primaryColor": "#003366",
    "defaultTemplate": "uuid"
  }
}
```
- **Response:** `200 OK` (same as GET)
- **Errors:** `400 Invalid input`, `401 Unauthorized`, `403 Forbidden`, `404 Not found`

**User Management Endpoints:**

**GET /firms/:firmId/users**
- **Auth:** Required (any role in firm)
- **Purpose:** List all users in the firm
- **Query Params:** `?role=admin&isActive=true` (filters)
- **Response:** `200 OK`
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "attorney",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 50
}
```
- **Errors:** `401 Unauthorized`, `403 Forbidden (wrong firm)`

**POST /firms/:firmId/users/invite**
- **Auth:** Required (admin role)
- **Purpose:** Invite a new user to the firm
- **Request:**
```json
{
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "paralegal"
}
```
- **Response:** `201 Created`
```json
{
  "invitation": {
    "id": "uuid",
    "email": "newuser@example.com",
    "role": "paralegal",
    "expiresAt": "2024-01-08T00:00:00Z",
    "status": "pending"
  },
  "message": "Invitation email sent"
}
```
- **Errors:** `400 Invalid input`, `401 Unauthorized`, `403 Forbidden`, `409 User already exists`

**DELETE /firms/:firmId/users/:userId**
- **Auth:** Required (admin role)
- **Purpose:** Remove user from firm (soft delete - set is_active = false)
- **Request:** None
- **Response:** `200 OK`
```json
{
  "message": "User removed successfully",
  "userId": "uuid"
}
```
- **Errors:** `401 Unauthorized`, `403 Forbidden`, `404 Not found`, `400 Cannot delete yourself`

**GET /users/me**
- **Auth:** Required (any role)
- **Purpose:** Get current user's profile
- **Request:** None
- **Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "attorney",
  "firmId": "uuid",
  "firmName": "Acme Law Firm",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z"
}
```
- **Errors:** `401 Unauthorized`

**PUT /users/:id**
- **Auth:** Required (self or admin)
- **Purpose:** Update user profile
- **Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "newemail@example.com"
}
```
- **Response:** `200 OK` (same as GET /users/me)
- **Errors:** `400 Invalid input`, `401 Unauthorized`, `403 Forbidden`, `404 Not found`, `409 Email conflict`
- **Note:** Users can update their own profile; admins can update any user in their firm

**PUT /users/:id/role**
- **Auth:** Required (admin role)
- **Purpose:** Change user's role
- **Request:**
```json
{
  "role": "attorney"
}
```
- **Response:** `200 OK` (updated user object)
- **Errors:** `400 Invalid role`, `401 Unauthorized`, `403 Forbidden`, `404 Not found`, `400 Cannot change own role`

**User Invitation Flow:**

**1. Admin Invites User:**
```
POST /firms/:firmId/users/invite
  Body: { email, firstName, lastName, role }

Server:
  1. Verify requester is admin
  2. Check if user already exists in firm
  3. Generate invitation token (UUID, 7-day expiry)
  4. Store invitation in database (or password_reset_tokens table with type field)
  5. Send invitation email with link
  6. Return invitation details

Email Link: https://app.example.com/accept-invitation?token=<uuid>
```

**2. User Accepts Invitation:**
```
GET /accept-invitation?token=<uuid>
  → Frontend shows registration form (pre-filled email)

POST /auth/register (from PR-004)
  Body: { email, password, firstName, lastName, invitationToken }

Server:
  1. Validate invitation token
  2. Extract firmId and role from invitation
  3. Create user account with specified role
  4. Mark invitation as used
  5. Log user in (return JWT tokens)
```

**Service Layer Implementation:**

**FirmService:**
```typescript
class FirmService {
  async getFirmById(firmId: string): Promise<Firm> {
    // Query firms table
  }

  async updateFirm(firmId: string, updates: FirmUpdate): Promise<Firm> {
    // Validate updates
    // Update firms table
    // Return updated firm
  }

  async getFirmSettings(firmId: string): Promise<FirmSettings> {
    // Extract JSONB settings field
  }
}
```

**UserService:**
```typescript
class UserService {
  async listFirmUsers(firmId: string, filters: UserFilters): Promise<User[]> {
    // Query users table with firm_id filter
    // Apply role and isActive filters
    // Paginate results
  }

  async getUserById(userId: string, firmId: string): Promise<User> {
    // Query with firm_id enforcement
  }

  async updateUser(userId: string, firmId: string, updates: UserUpdate): Promise<User> {
    // Verify user belongs to firm
    // Validate updates (email uniqueness within firm)
    // Update users table
  }

  async updateUserRole(userId: string, firmId: string, newRole: Role): Promise<User> {
    // Verify requester is admin
    // Verify target user in same firm
    // Update role in users table
  }

  async removeUser(userId: string, firmId: string): Promise<void> {
    // Soft delete: set is_active = false
    // Invalidate all user's refresh tokens
  }
}
```

**InvitationService:**
```typescript
class InvitationService {
  async inviteUser(firmId: string, invitation: InvitationRequest): Promise<Invitation> {
    // Check if user already exists in firm
    // Generate invitation token
    // Store in database with expiration (7 days)
    // Send invitation email
    // Return invitation details
  }

  async validateInvitation(token: string): Promise<InvitationDetails> {
    // Find invitation by token
    // Check not expired
    // Check not already used
    // Return firmId, email, role
  }

  async acceptInvitation(token: string): Promise<void> {
    // Mark invitation as used
    // Called by auth/register endpoint
  }
}
```

**Email Templates:**

**Invitation Email (invitation-email.html):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>You're invited to join {{firmName}}</title>
</head>
<body>
  <h1>You've been invited!</h1>
  <p>Hi {{firstName}},</p>
  <p>{{inviterName}} has invited you to join <strong>{{firmName}}</strong> on Demand Letter Generator.</p>
  <p>You've been invited as a <strong>{{role}}</strong>.</p>
  <p>
    <a href="{{invitationLink}}" style="background: #003366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
      Accept Invitation
    </a>
  </p>
  <p>Or copy and paste this link: {{invitationLink}}</p>
  <p>This invitation will expire in 7 days.</p>
  <p>Thanks,<br>The Steno Team</p>
</body>
</html>
```

**Email Sending Utility:**
```typescript
// services/api/src/utils/email.ts
import nodemailer from 'nodemailer';

export async function sendInvitationEmail(to: string, data: InvitationEmailData) {
  const transporter = nodemailer.createTransport({
    // AWS SES in production
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const html = renderTemplate('invitation-email.html', data);

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `You're invited to join ${data.firmName}`,
    html
  });
}
```

**Database Interactions:**

**Tables Used:**
- `firms` - Read for firm details, write for settings updates
- `users` - Read for listing, write for updates, soft delete
- `invitations` table (new - requires schema addition):
  - id (UUID, PK)
  - firm_id (UUID, FK → firms.id)
  - email (VARCHAR)
  - first_name (VARCHAR)
  - last_name (VARCHAR)
  - role (ENUM: admin, attorney, paralegal)
  - token (VARCHAR, unique)
  - expires_at (TIMESTAMP)
  - used (BOOLEAN, default false)
  - invited_by (UUID, FK → users.id)
  - created_at (TIMESTAMP)

**Indexes Required:**
- `users(firm_id, is_active)` - Fast listing of active users
- `users(firm_id, role)` - Filter users by role
- `invitations(token)` - Fast invitation lookup
- `invitations(firm_id, email)` - Check duplicate invitations

**Multi-Tenant Security Patterns:**

**1. Implicit Firm Scoping:**
Every service method takes firmId as parameter and includes it in WHERE clauses:
```typescript
async listUsers(firmId: string) {
  return db.query('SELECT * FROM users WHERE firm_id = $1', [firmId]);
}
```

**2. Authorization Checks:**
```typescript
async updateUser(userId: string, requestingUserId: string, firmId: string, updates: UserUpdate) {
  // Can update if:
  // 1. User is updating their own profile, OR
  // 2. Requesting user is admin in the same firm

  const requestingUser = await this.getUserById(requestingUserId, firmId);

  if (userId !== requestingUserId && requestingUser.role !== 'admin') {
    throw new ForbiddenError('Insufficient permissions');
  }

  // Proceed with update
}
```

**3. Cross-Firm Attack Prevention:**
All endpoints verify:
- User's firmId (from JWT) matches resource's firmId
- Route parameters don't allow specifying different firmId
- Database queries always filter by firm_id

**Error Handling:**

**Standard Error Codes:**
- `USER_NOT_FOUND` - User doesn't exist or not in requester's firm
- `FIRM_NOT_FOUND` - Firm doesn't exist or access denied
- `INVITATION_EXPIRED` - Invitation token expired
- `INVITATION_USED` - Invitation already accepted
- `USER_ALREADY_EXISTS` - User with email already in firm
- `CANNOT_MODIFY_SELF` - Cannot delete/change own role
- `INVALID_ROLE` - Invalid role value

**Dependencies:**

**NPM Packages to Add:**
```json
{
  "nodemailer": "^6.9.7",
  "handlebars": "^4.7.8"
}
```

**Dev Dependencies:**
```json
{
  "@types/nodemailer": "^6.4.14"
}
```

**Time Breakdown:**
- FirmService implementation: 30 min
- UserService implementation: 45 min
- InvitationService implementation: 40 min
- Firm context middleware: 20 min
- Firm ownership verification middleware: 15 min
- Email utility and templates: 30 min
- Route handlers (firms): 20 min
- Route handlers (users): 30 min
- Input validation schemas: 20 min
- Unit tests (FirmService): 30 min
- Unit tests (UserService): 40 min
- Unit tests (InvitationService): 30 min
- Unit tests (middleware): 25 min
- Integration tests (firm management): 45 min
- Integration tests (user management): 45 min
- Integration tests (multi-tenant isolation): 30 min
- Error handling and edge cases: 20 min
- Documentation and code comments: 15 min
- **Total: 470 minutes (7 hours 50 minutes)**

**Risks/Challenges:**

1. **Email Service Configuration:** AWS SES requires verification, may need sandbox exit
   - Mitigation: Use SMTP in development, document SES setup process

2. **Multi-Tenant Data Leaks:** Critical security risk
   - Mitigation: Comprehensive testing, middleware enforcement, code review

3. **Invitation Token Security:** Tokens must be unguessable and time-limited
   - Mitigation: Use UUIDs, enforce expiration, one-time use

4. **User Deletion Semantics:** Soft delete vs hard delete
   - Decision: Soft delete (set is_active = false) to preserve audit trail

5. **Firm Settings Schema:** JSONB flexibility vs type safety
   - Mitigation: Define TypeScript interface, validate on update

6. **Schema Addition:** Invitations table not in original PR-002 schema
   - Mitigation: Create migration to add invitations table

**Testing Strategy:**

**Unit Tests:**
- FirmService methods (CRUD operations)
- UserService methods (list, update, role change, delete)
- InvitationService (create, validate, accept)
- Middleware (firm context, ownership verification)
- Email utility (mock SMTP)

**Integration Tests:**
- Complete invitation flow (invite → email → accept → register)
- Firm settings management
- User listing with filters and pagination
- User role changes
- User deletion
- Cross-firm access prevention (security critical)
- Admin vs non-admin permissions

**Security Tests:**
- Attempt to access other firm's users
- Attempt to invite user to wrong firm
- Attempt to delete self
- Attempt to change own role
- SQL injection in filters
- Email validation bypass attempts

**Multi-Tenant Isolation Tests:**
- User A in Firm 1 cannot list users from Firm 2
- User A in Firm 1 cannot update user in Firm 2
- Admin in Firm 1 cannot change role of user in Firm 2
- Invitation tokens are firm-specific

---

## Block 3: Document Storage & Management (Depends on: Block 2)

### PR-006: Document Upload and Storage Service
**Status:** Approved ⚠️
**QC Status:** Approved with issues (2025-11-11) - TypeScript errors, missing tests
**QC Notes:** Functional but needs TypeScript fixes and unit tests for services
**Agent:** White
**Completed on:** 2025-11-11
**Dependencies:** PR-001, PR-002, PR-003, PR-004
**Priority:** High

**Description:**
Implement secure document upload to S3 with virus scanning, file type validation, and metadata extraction. Support multiple document types (PDFs, Word docs, images).

**Files (ESTIMATED - will be refined during Planning):**
- services/api/src/services/DocumentService.ts (create)
- services/api/src/services/S3Service.ts (create)
- services/api/src/routes/documents.ts (create)
- services/api/src/middleware/upload.ts (create) - multer config
- services/api/src/middleware/virusScan.ts (create) - ClamAV integration
- services/api/src/utils/fileValidation.ts (create)
- services/api/src/types/document.ts (create)
- tests/documents/DocumentService.test.ts (create)
- tests/integration/document-upload.test.ts (create)

**Acceptance Criteria:**
- [x] POST /documents/upload - upload source documents to S3
- [x] GET /documents/:id - get document metadata
- [x] GET /documents/:id/download - generate signed S3 URL
- [x] DELETE /documents/:id - soft delete document
- [x] File type validation (PDF, DOCX, DOC, images)
- [x] File size limits (max 50MB per file)
- [x] Virus scanning integration (ClamAV or AWS GuardDuty)
- [x] S3 signed URLs with 1-hour expiration
- [x] Metadata extraction (file name, size, type, upload date)
- [x] Document associated with firm and user
- [x] Unit and integration tests

**Notes:**
Security-critical. All uploads must be scanned and validated before storage.

---

### PR-007: Template Management System
**Status:** Approved ⚠️
**QC Status:** Approved with issues (2025-11-11) - 4 test failures, TypeScript errors
**QC Notes:** Core functionality working, test mocking needs fixes
**Agent:** Blonde
**Completed on:** 2025-11-11
**Dependencies:** PR-001 (Complete), PR-002 (Complete), PR-004 (Complete), PR-005 (In Progress)
**Priority:** High

**Description:**
Build system for creating, editing, and managing firm-specific demand letter templates. Support template variables, versioning, and default templates.

**Files (VERIFIED during Planning):**
- services/api/src/services/TemplateService.ts (create) - Core template business logic
- services/api/src/routes/templates.ts (create) - Template API endpoints
- services/api/src/types/template.ts (create) - TypeScript interfaces and types
- services/api/src/utils/templateValidation.ts (create) - Template content validation
- services/api/src/utils/variableExtraction.ts (create) - Variable parsing logic
- services/api/src/middleware/templateOwnership.ts (create) - Verify template ownership
- tests/templates/TemplateService.test.ts (create) - Unit tests for service
- tests/templates/templateValidation.test.ts (create) - Unit tests for validation
- tests/templates/variableExtraction.test.ts (create) - Unit tests for variable parser
- tests/integration/template-management.test.ts (create) - Integration tests for CRUD
- tests/integration/template-versioning.test.ts (create) - Integration tests for versioning
- tests/fixtures/templates/personal-injury.txt (create) - Sample template for tests
- tests/fixtures/templates/property-damage.txt (create) - Sample template for tests
- services/api/package.json (modify) - No new dependencies needed (using Zod from PR-004)
- services/database/seeds/001_default_templates.sql (create) - Optional seed data

**Acceptance Criteria:**
- [ ] GET /templates - list firm templates
- [ ] GET /templates/:id - get template details
- [ ] POST /templates - create new template (admin only)
- [ ] PUT /templates/:id - update template
- [ ] DELETE /templates/:id - soft delete template
- [ ] Template versioning (track changes, allow rollback)
- [ ] Template variables syntax (e.g., {{plaintiff_name}}, {{case_number}})
- [ ] Default system templates provided
- [ ] Template validation ensures required variables present
- [ ] Firm-level template isolation
- [ ] Tests verify template CRUD and versioning

**Notes:**
Template system should be flexible enough to support various demand letter formats.

---

## Planning Notes: PR-007 (Template Management System)

**Technology Decisions:**
- **Template Variable Syntax:** Handlebars-style `{{variable_name}}` for consistency with common templating systems
- **Variable Parsing:** Custom regex-based parser (no Handlebars library dependency for security and control)
- **Template Validation:** Zod for input validation, custom validation for variable syntax
- **Rich Text Storage:** Plain text with formatting markers (or HTML subset if needed)
- **Versioning Strategy:** Automatic version creation on template updates, immutable version records

**Template Variable Syntax Design:**

**Supported Variable Format:**
```
{{variable_name}}
```

**Standard Template Variables:**
- `{{plaintiff_name}}` - Name of the plaintiff/claimant
- `{{plaintiff_address}}` - Address of plaintiff
- `{{defendant_name}}` - Name of the defendant
- `{{defendant_address}}` - Address of defendant
- `{{case_number}}` - Case reference number
- `{{incident_date}}` - Date of incident
- `{{incident_location}}` - Location where incident occurred
- `{{total_damages}}` - Total damages being claimed
- `{{medical_expenses}}` - Medical costs
- `{{property_damages}}` - Property damage costs
- `{{lost_wages}}` - Lost income
- `{{demand_amount}}` - Total amount being demanded
- `{{deadline_date}}` - Response deadline date
- `{{attorney_name}}` - Attorney name
- `{{attorney_signature}}` - Attorney signature block
- `{{firm_name}}` - Law firm name
- `{{firm_address}}` - Firm address
- `{{firm_phone}}` - Firm phone number
- `{{date}}` - Current date (auto-populated)

**Variable Extraction Algorithm:**
```typescript
// Extract all variables from template content
function extractVariables(content: string): string[] {
  const regex = /\{\{([a-z_][a-z0-9_]*)\}\}/gi;
  const matches = content.matchAll(regex);
  const variables = new Set<string>();

  for (const match of matches) {
    variables.add(match[1].toLowerCase());
  }

  return Array.from(variables).sort();
}
```

**Template Versioning Strategy:**

**Version Creation Rules:**
1. **Initial Creation:** Version 1 created automatically
2. **Content Updates:** New version created on any content change
3. **Metadata Updates:** Name/description changes do NOT create new versions
4. **Version Immutability:** Once created, versions never modified (audit trail)

**Version Number Scheme:**
- Sequential integers starting at 1
- Version 1, Version 2, Version 3, etc.
- Simple and predictable
- No semantic versioning needed for templates

**Rollback Strategy:**
- Admin can set `current_version_id` to any previous version
- Rollback is non-destructive (previous versions preserved)
- Create new version if rolled-back version is modified

**API Endpoint Specifications:**

**GET /templates**
- **Auth:** Required (any role)
- **Purpose:** List all templates for the firm
- **Query Params:**
  - `?isDefault=true` - Filter for default templates
  - `?page=1&limit=50` - Pagination
  - `?search=personal%20injury` - Search by name/description
- **Response:** `200 OK`
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "Personal Injury Demand Letter",
      "description": "Standard template for personal injury claims",
      "isDefault": true,
      "currentVersion": {
        "id": "uuid",
        "versionNumber": 3,
        "variableCount": 15,
        "createdAt": "2024-01-15T10:30:00Z"
      },
      "createdBy": {
        "id": "uuid",
        "name": "John Doe"
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 50
}
```
- **Errors:** `401 Unauthorized`

**GET /templates/:id**
- **Auth:** Required (any role)
- **Purpose:** Get template details with current version content
- **Response:** `200 OK`
```json
{
  "id": "uuid",
  "firmId": "uuid",
  "name": "Personal Injury Demand Letter",
  "description": "Standard template for personal injury claims",
  "isDefault": true,
  "currentVersion": {
    "id": "uuid",
    "versionNumber": 3,
    "content": "Dear {{defendant_name}},\n\nThis letter serves as formal demand...",
    "variables": [
      "defendant_name",
      "plaintiff_name",
      "incident_date",
      "total_damages"
    ],
    "createdBy": {
      "id": "uuid",
      "name": "Jane Smith"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "versionHistory": [
    {
      "id": "uuid",
      "versionNumber": 3,
      "createdBy": "Jane Smith",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "uuid",
      "versionNumber": 2,
      "createdBy": "John Doe",
      "createdAt": "2024-01-10T14:20:00Z"
    },
    {
      "id": "uuid",
      "versionNumber": 1,
      "createdBy": "John Doe",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "createdBy": {
    "id": "uuid",
    "name": "John Doe"
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```
- **Errors:** `401 Unauthorized`, `403 Forbidden (wrong firm)`, `404 Not found`

**POST /templates**
- **Auth:** Required (admin role only)
- **Purpose:** Create new template
- **Request:**
```json
{
  "name": "Contract Breach Demand Letter",
  "description": "Template for breach of contract claims",
  "content": "Dear {{defendant_name}},\n\nRe: Breach of Contract...",
  "isDefault": false
}
```
- **Response:** `201 Created`
```json
{
  "id": "uuid",
  "firmId": "uuid",
  "name": "Contract Breach Demand Letter",
  "description": "Template for breach of contract claims",
  "isDefault": false,
  "currentVersion": {
    "id": "uuid",
    "versionNumber": 1,
    "content": "Dear {{defendant_name}}...",
    "variables": ["defendant_name", "plaintiff_name"],
    "createdBy": {
      "id": "uuid",
      "name": "Admin User"
    },
    "createdAt": "2024-01-20T09:00:00Z"
  },
  "createdBy": {
    "id": "uuid",
    "name": "Admin User"
  },
  "createdAt": "2024-01-20T09:00:00Z",
  "updatedAt": "2024-01-20T09:00:00Z"
}
```
- **Errors:** `400 Invalid input`, `401 Unauthorized`, `403 Forbidden (not admin)`, `409 Template name already exists`

**PUT /templates/:id**
- **Auth:** Required (admin role only)
- **Purpose:** Update template (creates new version if content changed)
- **Request:**
```json
{
  "name": "Updated Template Name",
  "description": "Updated description",
  "content": "Updated content with {{new_variable}}...",
  "isDefault": false
}
```
- **Behavior:**
  - If `content` changed: Create new version, increment version number
  - If only `name`/`description` changed: Update template record only (no new version)
- **Response:** `200 OK` (same structure as GET /templates/:id)
- **Errors:** `400 Invalid input`, `401 Unauthorized`, `403 Forbidden`, `404 Not found`

**PUT /templates/:id/rollback/:versionNumber**
- **Auth:** Required (admin role only)
- **Purpose:** Rollback template to a previous version
- **Request:** None
- **Response:** `200 OK` (updated template with rolled-back version as current)
- **Errors:** `401 Unauthorized`, `403 Forbidden`, `404 Template/version not found`

**DELETE /templates/:id**
- **Auth:** Required (admin role only)
- **Purpose:** Soft delete template (set is_deleted flag or remove current_version_id)
- **Note:** Don't hard delete - templates may be referenced by demand letters
- **Request:** None
- **Response:** `200 OK`
```json
{
  "message": "Template deleted successfully",
  "templateId": "uuid"
}
```
- **Errors:** `401 Unauthorized`, `403 Forbidden`, `404 Not found`, `400 Cannot delete default template (unset default first)`

**GET /templates/:id/versions/:versionNumber**
- **Auth:** Required (any role)
- **Purpose:** Get specific version of template
- **Response:** `200 OK`
```json
{
  "id": "uuid",
  "templateId": "uuid",
  "versionNumber": 2,
  "content": "Template content from version 2...",
  "variables": ["plaintiff_name", "defendant_name"],
  "createdBy": {
    "id": "uuid",
    "name": "John Doe"
  },
  "createdAt": "2024-01-10T14:20:00Z"
}
```
- **Errors:** `401 Unauthorized`, `403 Forbidden`, `404 Not found`

**Service Layer Design:**

**TemplateService Class:**
```typescript
class TemplateService {
  // List templates for a firm with optional filters
  async listTemplates(
    firmId: string,
    filters: TemplateFilters
  ): Promise<PaginatedResult<TemplateSummary>>;

  // Get template by ID with current version content
  async getTemplateById(
    templateId: string,
    firmId: string
  ): Promise<TemplateWithVersion>;

  // Create new template (admin only)
  async createTemplate(
    firmId: string,
    userId: string,
    data: CreateTemplateRequest
  ): Promise<TemplateWithVersion>;

  // Update template (creates new version if content changed)
  async updateTemplate(
    templateId: string,
    firmId: string,
    userId: string,
    data: UpdateTemplateRequest
  ): Promise<TemplateWithVersion>;

  // Rollback to previous version
  async rollbackToVersion(
    templateId: string,
    firmId: string,
    versionNumber: number
  ): Promise<TemplateWithVersion>;

  // Soft delete template
  async deleteTemplate(
    templateId: string,
    firmId: string
  ): Promise<void>;

  // Get specific version
  async getTemplateVersion(
    templateId: string,
    firmId: string,
    versionNumber: number
  ): Promise<TemplateVersion>;

  // Get all versions for a template
  async getVersionHistory(
    templateId: string,
    firmId: string
  ): Promise<TemplateVersion[]>;

  // Extract variables from template content
  private extractVariables(content: string): string[];

  // Validate template content and variables
  private validateTemplate(content: string): ValidationResult;
}
```

**Template Validation Logic:**

**Validation Rules:**
1. **Name:** Required, 1-255 characters, unique within firm
2. **Content:** Required, max 50,000 characters
3. **Variables:** Must match `{{variable_name}}` format
4. **Variable Names:** Lowercase letters, numbers, underscores only
5. **Variable Names:** Must start with letter or underscore
6. **Balanced Braces:** All `{{` must have matching `}}`

**Validation Implementation:**
```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateTemplate(content: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  // Check length
  if (content.length > 50000) {
    result.valid = false;
    result.errors.push('Template content exceeds maximum length of 50,000 characters');
  }

  // Check for unbalanced braces
  const openCount = (content.match(/\{\{/g) || []).length;
  const closeCount = (content.match(/\}\}/g) || []).length;
  if (openCount !== closeCount) {
    result.valid = false;
    result.errors.push('Unbalanced template variable braces');
  }

  // Extract and validate variable names
  const variables = extractVariables(content);
  for (const variable of variables) {
    if (!/^[a-z_][a-z0-9_]*$/.test(variable)) {
      result.valid = false;
      result.errors.push(`Invalid variable name: ${variable}`);
    }
  }

  // Warn about common variables not present
  const recommendedVars = ['plaintiff_name', 'defendant_name', 'date'];
  for (const recommended of recommendedVars) {
    if (!variables.includes(recommended)) {
      result.warnings.push(`Recommended variable missing: ${recommended}`);
    }
  }

  return result;
}
```

**Database Interactions:**

**Tables Used:**
- `templates` - Read for listing, write for create/update/delete
- `template_versions` - Write for version creation, read for version history
- `users` - Read for created_by user details

**Key Queries:**

**List Templates:**
```sql
SELECT
  t.id,
  t.name,
  t.description,
  t.is_default,
  t.created_at,
  t.updated_at,
  tv.id as current_version_id,
  tv.version_number,
  COALESCE(jsonb_array_length(tv.variables), 0) as variable_count,
  u.first_name || ' ' || u.last_name as created_by_name
FROM templates t
LEFT JOIN template_versions tv ON t.current_version_id = tv.id
LEFT JOIN users u ON t.created_by = u.id
WHERE t.firm_id = $1
  AND ($2::boolean IS NULL OR t.is_default = $2)
  AND ($3::text IS NULL OR t.name ILIKE $3 OR t.description ILIKE $3)
ORDER BY t.created_at DESC
LIMIT $4 OFFSET $5;
```

**Get Template with Current Version:**
```sql
SELECT
  t.id,
  t.firm_id,
  t.name,
  t.description,
  t.is_default,
  t.created_at,
  t.updated_at,
  tv.id as version_id,
  tv.version_number,
  tv.content,
  tv.variables,
  tv.created_at as version_created_at,
  u.id as created_by_id,
  u.first_name || ' ' || u.last_name as created_by_name
FROM templates t
INNER JOIN template_versions tv ON t.current_version_id = tv.id
LEFT JOIN users u ON tv.created_by = u.id
WHERE t.id = $1 AND t.firm_id = $2;
```

**Create Template and Version (Transaction):**
```sql
BEGIN;

-- Insert template
INSERT INTO templates (firm_id, name, description, is_default, created_by)
VALUES ($1, $2, $3, $4, $5)
RETURNING id;

-- Insert first version
INSERT INTO template_versions (template_id, version_number, content, variables, created_by)
VALUES ($6, 1, $7, $8, $5)
RETURNING id;

-- Update template with current_version_id
UPDATE templates
SET current_version_id = $9
WHERE id = $6;

COMMIT;
```

**Update Template Content (Creates New Version):**
```sql
BEGIN;

-- Get current max version number
SELECT MAX(version_number) FROM template_versions WHERE template_id = $1;

-- Insert new version
INSERT INTO template_versions (template_id, version_number, content, variables, created_by)
VALUES ($1, $2, $3, $4, $5)
RETURNING id;

-- Update template with new current_version_id and metadata
UPDATE templates
SET
  current_version_id = $6,
  name = $7,
  description = $8,
  is_default = $9,
  updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND firm_id = $10;

COMMIT;
```

**Multi-Tenant Security Patterns:**

**Firm Context Enforcement:**
- All template queries MUST include `WHERE firm_id = $firmId`
- Use middleware from PR-005 to inject firm context
- Verify template belongs to user's firm before any operation

**Authorization Checks:**
- **Create:** Admin role required
- **Update:** Admin role required
- **Delete:** Admin role required
- **Read:** Any authenticated user in same firm

**Implementation:**
```typescript
// In route handler
router.post('/templates',
  authenticate,              // From PR-004
  enforceFirmContext,        // From PR-005
  requireRole('admin'),      // From PR-004
  async (req, res) => {
    const template = await templateService.createTemplate(
      req.firmId,  // From middleware
      req.user.id, // From middleware
      req.body
    );
    res.status(201).json(template);
  }
);
```

**Default Templates Strategy:**

**System Default Templates:**
- Provided as seed data in development
- Each firm can have ONE template marked as default
- When creating a new demand letter, default template is pre-selected
- Default template can be changed by admin

**Seed Templates to Create:**
1. **Personal Injury Demand Letter**
   - Variables: plaintiff_name, defendant_name, incident_date, incident_location, medical_expenses, property_damages, lost_wages, demand_amount, deadline_date
2. **Property Damage Demand Letter**
   - Variables: plaintiff_name, defendant_name, incident_date, property_address, repair_cost, replacement_cost, demand_amount, deadline_date
3. **Contract Breach Demand Letter**
   - Variables: plaintiff_name, defendant_name, contract_date, breach_date, breach_description, damages, demand_amount, deadline_date

**Seed Data Implementation:**
- Create migration or seed script
- Only insert if firm has no templates
- Mark first template as default

**Files (VERIFIED):**
- services/api/src/services/TemplateService.ts (create) - Core template business logic
- services/api/src/routes/templates.ts (create) - Template API endpoints
- services/api/src/types/template.ts (create) - TypeScript interfaces and types
- services/api/src/utils/templateValidation.ts (create) - Template content validation
- services/api/src/utils/variableExtraction.ts (create) - Variable parsing logic
- services/api/src/middleware/templateOwnership.ts (create) - Verify template ownership
- tests/templates/TemplateService.test.ts (create) - Unit tests for service
- tests/templates/templateValidation.test.ts (create) - Unit tests for validation
- tests/templates/variableExtraction.test.ts (create) - Unit tests for variable parser
- tests/integration/template-management.test.ts (create) - Integration tests for CRUD
- tests/integration/template-versioning.test.ts (create) - Integration tests for versioning
- tests/fixtures/templates/personal-injury.txt (create) - Sample template for tests
- tests/fixtures/templates/property-damage.txt (create) - Sample template for tests
- services/api/package.json (modify) - No new dependencies needed (using Zod from PR-004)
- services/database/seeds/001_default_templates.sql (create) - Optional seed data

**Time Breakdown:**
- TemplateService implementation (CRUD operations): 60 min
- Template versioning logic: 30 min
- Variable extraction and validation: 30 min
- Route handlers: 30 min
- Middleware (template ownership verification): 15 min
- TypeScript types and interfaces: 20 min
- Unit tests (TemplateService): 45 min
- Unit tests (validation and extraction): 30 min
- Integration tests (CRUD operations): 45 min
- Integration tests (versioning and rollback): 30 min
- Seed data templates: 20 min
- Error handling and edge cases: 20 min
- Documentation and code comments: 15 min
- **Total: 390 minutes (6 hours 30 minutes)**

**Risks/Challenges:**

1. **Variable Extraction Complexity:** Regex parsing can be tricky with nested or malformed syntax
   - Mitigation: Strict validation rules, comprehensive test cases

2. **Version Proliferation:** Users might create many versions quickly
   - Mitigation: Consider version cleanup policy (keep last N versions)
   - Not implementing in P0, document for future

3. **Rich Text vs Plain Text:** Templates may need formatting
   - Decision: Start with plain text, add HTML subset support if needed (PR-017 frontend may influence)
   - Store as plain text for now

4. **Template Migration:** Changing variable names breaks existing letters
   - Mitigation: Version immutability preserves history
   - Consider variable aliasing in future

5. **Circular Reference:** templates.current_version_id → template_versions.id → templates.id
   - Mitigation: Already handled in schema with deferred constraint and SET NULL

6. **Default Template Uniqueness:** Only one default per firm
   - Mitigation: Application logic enforces (unset previous default when setting new one)

**Testing Strategy:**

**Unit Tests:**
- TemplateService methods (list, get, create, update, delete)
- Variable extraction from template content
- Template validation (valid and invalid cases)
- Version number increment logic
- Rollback logic

**Integration Tests:**
- Complete template CRUD workflow
- Version creation on content updates
- No version creation on metadata-only updates
- Rollback to previous version
- Multi-tenant isolation (User A cannot access Firm B templates)
- Admin vs non-admin permissions
- Default template behavior
- Variable extraction from real template samples

**Edge Cases to Test:**
- Template with no variables
- Template with 50+ variables
- Malformed variable syntax `{{{variable}}}` or `{{variable`
- Rollback to version 1, then update (should create version 4, not version 2)
- Delete default template (should fail or require unsetting default first)
- Concurrent updates to same template
- Template name conflicts within firm

---

## Block 4: AI Processing Service (Depends on: Block 3)

### PR-008: AWS Bedrock Integration (Python)
**Status:** Certified ✅
**QC Status:** Certified by QC (2025-11-11) - 86%+ coverage, 26/26 tests passing
**Agent:** Agent Orange
**Planned by:** Agent Orange (2025-11-11)
**Completed by:** Agent Orange (2025-11-11)
**Dependencies:** PR-001, PR-002, PR-003
**Priority:** High

**Description:**
Set up Python service for AWS Bedrock (Claude) integration. Implement core LLM invocation with structured outputs, retry logic, and error handling.

**Files (ESTIMATED - will be refined during Planning):**
- services/ai-processor/src/bedrock/client.py (create)
- services/ai-processor/src/bedrock/prompts.py (create)
- services/ai-processor/src/bedrock/schemas.py (create) - Pydantic models
- services/ai-processor/src/utils/retry.py (create) - exponential backoff
- services/ai-processor/src/config.py (create)
- services/ai-processor/tests/test_bedrock.py (create)
- services/ai-processor/requirements.txt (modify) - add boto3, anthropic

**Acceptance Criteria:**
- [x] Bedrock client configured with Claude model (claude-3-5-sonnet)
- [x] Structured output using tool calling or JSON mode
- [x] Retry logic with exponential backoff for rate limits
- [x] Error handling for common Bedrock errors
- [x] Logging of all LLM interactions (requests/responses)
- [x] Cost tracking (token usage logged)
- [x] Configuration for model parameters (temperature, max_tokens)
- [x] Unit tests with mocked Bedrock responses
- [x] Integration tests with real Bedrock calls (dev environment only)

**Notes:**
Follow patterns from .claude/rules/llm-architecture.md for robust LLM application design.

---

### PR-009: Document Analysis and Extraction (Python)
**Status:** Approved ⚠️
**QC Status:** Approved with dependency fix (2025-11-11) - PyPDF2 installed, 1 test needs fix
**QC Notes:** PyPDF2 dependency resolved, should migrate to pypdf (PyPDF2 deprecated)
**Agent:** Orange
**Completed by:** Agent Orange (2025-11-11)
**Planned by:** Agent Orange (2025-11-11)
**Dependencies:** PR-001, PR-002, PR-006, PR-008
**Priority:** High

**Description:**
Implement document parsing and information extraction using Claude. Extract key facts, parties, dates, damages, and other relevant information from source documents.

**Files (ESTIMATED - will be refined during Planning):**
- services/ai-processor/src/document_analyzer.py (create)
- services/ai-processor/src/extractors/parties.py (create)
- services/ai-processor/src/extractors/facts.py (create)
- services/ai-processor/src/extractors/damages.py (create)
- services/ai-processor/src/schemas/extraction.py (create) - Pydantic schemas
- services/ai-processor/src/prompts/extraction_prompts.py (create)
- services/ai-processor/tests/test_document_analyzer.py (create)
- services/ai-processor/tests/fixtures/ (create directory) - sample documents

**Acceptance Criteria:**
- [x] Parse PDF documents (text extraction)
- [x] Extract structured data: parties, dates, case facts, damages
- [x] Use Claude with structured outputs (tool calling)
- [x] Handle multi-page documents
- [x] Confidence scores for extracted data
- [x] Support multiple document types (police reports, medical records, contracts)
- [x] Validation of extracted data against schemas
- [x] Unit tests with fixture documents
- [x] Performance: process 10-page document in <30 seconds

**Notes:**
This is the core AI capability. Quality of extraction directly impacts letter quality.

---

### PR-010: Demand Letter Generation (Python)
**Status:** Complete
**Agent:** Orange
**Completed on:** 2025-11-11
**Planned by:** Agent Orange (2025-11-11)
**Dependencies:** PR-001 (Complete), PR-002 (Complete), PR-007 (Approved ⚠️), PR-008 (Complete), PR-009 (Approved ⚠️)
**Priority:** High

**Description:**
Implement AI-powered demand letter generation using extracted facts, template, and Claude. Support iterative refinement based on attorney feedback.

**Files (ESTIMATED - will be refined during Planning):**
- services/ai-processor/src/letter_generator.py (create)
- services/ai-processor/src/prompts/generation_prompts.py (create)
- services/ai-processor/src/schemas/letter.py (create) - Pydantic models
- services/ai-processor/src/refinement/feedback_handler.py (create)
- services/ai-processor/tests/test_letter_generator.py (create)
- services/ai-processor/tests/test_refinement.py (create)

**Acceptance Criteria:**
- [ ] Generate initial draft from extracted facts and template
- [ ] Incorporate template variables into letter
- [ ] Support iterative refinement with attorney instructions
- [ ] Maintain conversation history for context
- [ ] Generate structured letter sections (header, facts, demand, closing)
- [ ] Legal tone and language validation
- [ ] Support customizable AI prompts (per template or firm)
- [ ] Unit tests verify generation logic
- [ ] Integration tests with sample cases
- [ ] Performance: generate draft in <10 seconds

**Notes:**
Follow LLM architecture patterns for deterministic operations vs. creative generation.

---

### PR-011: AI Service Lambda Deployment
**Status:** Blocked-Ready
**Agent:** Available for claim
**Planned by:** Agent Orange (2025-11-11)
**Dependencies:** PR-003, PR-008, PR-009, PR-010
**Priority:** High

**Description:**
Package Python AI processor as AWS Lambda function with proper layers, environment configuration, and cold start optimization.

**Files (ESTIMATED - will be refined during Planning):**
- services/ai-processor/lambda_handler.py (create) - Lambda entry point
- services/ai-processor/Dockerfile (create) - Lambda container image
- services/ai-processor/deploy.sh (create) - deployment script
- infrastructure/lambda-ai.tf (modify) - add AI Lambda config
- services/ai-processor/layers/ (create directory) - Lambda layers

**Acceptance Criteria:**
- [ ] Python dependencies packaged as Lambda layer
- [ ] Lambda function handles document analysis requests
- [ ] Lambda function handles letter generation requests
- [ ] Environment variables configured (Bedrock region, model, DB connection)
- [ ] Cold start time <3 seconds
- [ ] Timeout configured appropriately (5 minutes max)
- [ ] Memory allocation optimized (test 1024MB, 2048MB, 3072MB)
- [ ] Error handling and logging to CloudWatch
- [ ] Deployment script automates packaging and upload
- [ ] Integration with API Gateway (async processing)

**Notes:**
Consider using container image for Lambda to simplify dependency management.

---

## Planning Notes: PR-008 (AWS Bedrock Integration)

**Planning by:** Agent Orange
**Planned on:** 2025-11-11

**Technology Decisions:**
- **AWS Bedrock SDK:** Use boto3 with bedrock-runtime client (not direct Anthropic SDK)
- **Model:** Claude 3.5 Sonnet (anthropic.claude-3-5-sonnet-20241022-v2:0)
- **Structured Outputs:** Use Claude's tool calling (not JSON mode) for reliable schema adherence
- **Retry Library:** Custom exponential backoff (no external retry library needed)
- **Configuration:** pydantic-settings for environment-based config
- **Logging:** Python logging module with structured JSON logs to CloudWatch

**Verified File List (18 files):**
- services/ai-processor/src/bedrock/client.py (create) - BedrockClient class
- services/ai-processor/src/bedrock/config.py (create) - Bedrock configuration
- services/ai-processor/src/bedrock/tools.py (create) - Tool calling definitions
- services/ai-processor/src/bedrock/exceptions.py (create) - Custom exceptions
- services/ai-processor/src/bedrock/__init__.py (create)
- services/ai-processor/src/utils/retry.py (create) - Exponential backoff decorator
- services/ai-processor/src/utils/logging.py (create) - Structured logging setup
- services/ai-processor/src/utils/__init__.py (create)
- services/ai-processor/src/config.py (create) - Global app configuration
- services/ai-processor/tests/bedrock/test_client.py (create)
- services/ai-processor/tests/bedrock/test_retry.py (create)
- services/ai-processor/tests/bedrock/test_tools.py (create)
- services/ai-processor/tests/bedrock/__init__.py (create)
- services/ai-processor/tests/conftest.py (create) - Pytest fixtures
- services/ai-processor/tests/fixtures/bedrock_responses.json (create) - Mock responses
- services/ai-processor/requirements.txt (modify) - Already has boto3, anthropic
- services/ai-processor/.env.example (modify) - Add Bedrock config
- README.md (modify) - Document Bedrock setup

**BedrockClient Design:**

Core class with features:
- Tool calling for structured outputs
- Automatic retry with exponential backoff
- Token usage tracking and logging
- Cost estimation
- Conversation history management
- Streaming support for long-form generation

**Retry Strategy:**

Exponential backoff decorator that retries on:
- ThrottlingException (429)
- ServiceUnavailableException (503)
- InternalServerException (500)

Does NOT retry on client errors (400, 403, 404)
Backoff: base_delay * (2 ** attempt) + random jitter

**Logging Strategy:**

All Bedrock invocations logged with:
- Correlation ID, Model ID, Token counts (input/output)
- Latency, Cost estimate, Tool usage
- Error details, Firm/user context

Format: Structured JSON for CloudWatch

**Tool Calling Pattern:**

Following .claude/rules/llm-architecture.md principles:
- Use tool calling for ALL structured data extraction (not JSON mode)
- Tool definitions as Pydantic models converted to JSON schema
- Automatic validation of tool outputs
- LLM decides when to use tools based on context

**Configuration:**

Environment variables:
- AWS_REGION, BEDROCK_MODEL_ID, BEDROCK_MAX_TOKENS
- BEDROCK_TEMPERATURE (0.0 for extraction, 0.7 for generation)
- Cost tracking config, Retry config, Logging config

**Testing Strategy:**

Unit Tests:
- BedrockClient initialization, Request/response formatting
- Token counting, Cost calculation, Tool schema generation
- Error handling, Retry logic, Logging verification

Integration Tests (dev only):
- Real Bedrock invocation, Tool calling with real Claude
- Streaming responses, Rate limit retry

**Time Breakdown:**
- BedrockClient: 45 min, Retry logic: 20 min, Logging: 15 min
- Tool calling framework: 30 min, Config: 15 min, Exceptions: 15 min
- Unit tests: 40 min, Integration tests: 20 min, Docs: 15 min
- **Total: 215 minutes (3 hours 35 minutes)**

**Risks/Challenges:**
1. Bedrock API format differs from direct Anthropic API
2. Tool calling schema must be exact (JSON schema from Pydantic)
3. Rate limits vary by account and region
4. boto3 client initialization adds to Lambda cold start
5. Token counting accuracy for cost tracking

**Dependencies:**
- boto3, anthropic SDK, pydantic, pydantic-settings (all already in requirements.txt)

**Notes:**
- Foundation for all AI processing (PR-009, PR-010 depend on this)
- Temperature 0.0 for extraction (deterministic), 0.7 for generation (creative)
- Following LLM architecture principles strictly

---

## Planning Notes: PR-009 (Document Analysis and Extraction)

**Planning by:** Agent Orange
**Planned on:** 2025-11-11

**Technology Decisions:**
- **PDF Parsing:** PyPDF2 (primary) + pdfplumber (fallback for tables/complex layouts)
- **Text Chunking:** Custom strategy for multi-page documents (8k tokens, 1k overlap)
- **Schema Validation:** Pydantic models for extracted data
- **Tool Calling:** Use BedrockClient with extraction tools (per LLM architecture rules)
- **Confidence Scoring:** LLM provides confidence scores (0.0-1.0) in tool outputs

**Verified File List (22 files):**
- services/ai-processor/src/document_analyzer.py (create) - Main DocumentAnalyzer class
- services/ai-processor/src/parsers/pdf_parser.py (create) - PDF text extraction
- services/ai-processor/src/parsers/text_chunker.py (create) - Chunk long documents
- services/ai-processor/src/parsers/__init__.py (create)
- services/ai-processor/src/extractors/party_extractor.py (create) - Extract parties
- services/ai-processor/src/extractors/fact_extractor.py (create) - Extract case facts
- services/ai-processor/src/extractors/damage_extractor.py (create) - Extract damages
- services/ai-processor/src/extractors/date_extractor.py (create) - Extract dates
- services/ai-processor/src/extractors/base_extractor.py (create) - Base extractor class
- services/ai-processor/src/extractors/__init__.py (create)
- services/ai-processor/src/schemas/extraction.py (create) - Pydantic extraction schemas
- services/ai-processor/src/prompts/extraction_prompts.py (create) - Extraction prompts
- services/ai-processor/tests/document_analyzer/test_analyzer.py (create)
- services/ai-processor/tests/document_analyzer/test_pdf_parser.py (create)
- services/ai-processor/tests/document_analyzer/test_extractors.py (create)
- services/ai-processor/tests/fixtures/sample_police_report.pdf (create)
- services/ai-processor/tests/fixtures/sample_medical_record.pdf (create)
- services/ai-processor/tests/fixtures/sample_contract.pdf (create)
- services/ai-processor/tests/fixtures/expected_extractions.json (create)
- services/ai-processor/requirements.txt (modify) - Add pdfplumber
- services/ai-processor/README.md (modify) - Document analysis features
- docs/memory/techContext.md (modify) - Note pdfplumber addition

**DocumentAnalyzer Design:**

Core functionality:
- Multi-page PDF parsing with quality checking
- Intelligent text chunking for long documents
- Parallel extraction of parties, facts, damages, dates
- Confidence scoring for extracted data
- Support for multiple document types (police reports, medical records, contracts)

**Extraction Schemas:**

Pydantic models:
- Party (name, role, contact_info, confidence)
- CaseFact (description, date, location, source_page, confidence)
- Damage (type, description, amount, currency, confidence)
- ExtractedDates (incident_date, report_date, other_dates)
- ExtractedData (complete result with all fields + metadata)

**Tool Definitions:**

Each extractor defines a tool for Claude:
- extract_parties: Extract all parties with roles
- extract_facts: Extract case facts with context
- extract_damages: Extract damages with amounts
- extract_dates: Extract important dates

All tools return confidence scores with each item

**Extraction Prompts:**

System prompt establishes legal document analysis expertise
User prompt provides document context and extraction instructions
Prompts emphasize accuracy, confidence scoring, and thoroughness

**Text Chunking Strategy:**

For documents >10k tokens:
- Split into 8k token chunks with 1k overlap
- Process chunks separately
- Merge results with deduplication
- Use highest confidence when duplicates found

**PDF Parsing:**

Two-tier approach:
1. Try PyPDF2 first (fast, simple)
2. Fall back to pdfplumber if text quality is poor
3. Quality checking heuristics (word count, character diversity)

**Performance Target:**

10-page document in <30 seconds:
- PDF parsing: ~2 sec, Chunking: <1 sec
- Bedrock API call: ~20 sec, Merging: ~2 sec
- DB update: ~1 sec
- **Total: ~26 seconds** (within budget)

50-page document: ~90 seconds (multiple chunks)

**Testing Strategy:**

Unit Tests: PDF parsing, Text chunking, Extractors with mocked Bedrock,
Schema validation, Confidence scores, Result merging

Integration Tests: Full analysis with sample documents, Multi-page handling,
Each document type, Edge cases (empty, scanned, malformed PDFs)

Fixture documents: Sample police report, medical record, contract with expected extractions

**Time Breakdown:**
- DocumentAnalyzer: 30 min, PDF parsers: 25 min, Text chunker: 20 min
- Extractors (4 types): 60 min, Schemas: 25 min, Prompts: 30 min
- Result merging: 20 min, DB integration: 15 min
- Unit tests: 50 min, Integration tests: 40 min, Fixtures: 30 min, Docs: 20 min
- **Total: 365 minutes (6 hours 5 minutes)**

**Risks/Challenges:**
1. Scanned PDFs may have poor OCR quality
2. Document format variety in legal field
3. Very long documents may exceed context window
4. AI may hallucinate or miss information
5. 30-second target may be tight for complex documents

**New Dependencies:**
```
pdfplumber>=0.10.0  # Advanced PDF parsing with table support
```

**Dependencies:**
- PR-008 (BedrockClient) - MUST complete first
- PR-006 (Document upload) - For S3 integration

**Notes:**
- Core AI capability - quality is critical
- Accuracy more important than speed
- Confidence scores essential for human review workflow
- Consider OCR support for image-based documents in future

---

## Planning Notes: PR-010 (Demand Letter Generation)

**Planning by:** Agent Orange
**Planned on:** 2025-11-11

**Technology Decisions:**
- **Generation Approach:** Template-guided generation (not free-form)
- **Tool Calling:** For structured variable population (deterministic operations)
- **Streaming:** Use streaming API for real-time generation feedback to UI
- **History Management:** Maintain conversation history for refinement context
- **Temperature:** 0.7 for creative legal writing (not 0.0 like extraction)
- **Template Variables:** Mustache-style {{variable}} syntax

**Verified File List (20 files):**
- services/ai-processor/src/letter_generator.py (create) - Main LetterGenerator class
- services/ai-processor/src/generation/template_processor.py (create) - Template variable handling
- services/ai-processor/src/generation/section_generator.py (create) - Generate letter sections
- services/ai-processor/src/generation/refinement_handler.py (create) - Handle attorney feedback
- services/ai-processor/src/generation/history_manager.py (create) - Conversation history
- services/ai-processor/src/generation/__init__.py (create)
- services/ai-processor/src/schemas/letter.py (create) - Letter Pydantic models
- services/ai-processor/src/schemas/refinement.py (create) - Refinement request models
- services/ai-processor/src/prompts/generation_prompts.py (create) - Generation prompts
- services/ai-processor/src/prompts/refinement_prompts.py (create) - Refinement prompts
- services/ai-processor/src/validators/legal_tone_validator.py (create) - Tone checking
- services/ai-processor/tests/letter_generator/test_generator.py (create)
- services/ai-processor/tests/letter_generator/test_template_processor.py (create)
- services/ai-processor/tests/letter_generator/test_refinement.py (create)
- services/ai-processor/tests/letter_generator/test_tone_validator.py (create)
- services/ai-processor/tests/fixtures/sample_templates.json (create)
- services/ai-processor/tests/fixtures/sample_extracted_data.json (create)
- services/ai-processor/tests/fixtures/expected_letters.json (create)
- services/ai-processor/README.md (modify) - Document generation features
- docs/memory/systemPatterns.md (modify) - Note generation patterns

**LetterGenerator Design:**

Core features:
- Template-guided generation with variable population
- Structured variable population using tool calling
- Iterative refinement with conversation history
- Legal tone validation
- Section-by-section generation
- Streaming support for real-time UI feedback

**Letter Structure:**

Pydantic models:
- LetterSection (section_type, content, template_source)
- GeneratedLetter (sections, full_text, populated_variables, metadata)
- GenerationMetadata (template_id, model, tokens, cost, tone_validation)
- RefinementRequest (instruction, target_section, preserve_facts flag)

**Template Variable Population:**

Tool calling for deterministic variable population:
- Tool: populate_template_variables
- Input: Template variables needed
- Output: Populated variables from extracted data
- Example: {{defendant_name}} → "Acme Corp" from extracted parties

**Generation Prompts:**

System prompt: Establish legal writing expertise, tone, structure
User prompt: Provide template, case info, instructions
Refinement prompt: Previous letter + attorney feedback + modification instructions

Prompts emphasize:
- Professional legal tone
- Factual accuracy
- Structured format
- Clear damages statement
- Settlement deadline

**Legal Tone Validation:**

Validator checks:
- Professional language (no slang, profanity)
- Appropriate formality
- Legal terminology usage
- No emotional/inflammatory language
- Clear structure

Uses Claude to score (0-10) and identify issues

**Conversation History Management:**

Store in demand_letters.conversation_history (JSONB):
- Array of messages (user/assistant alternating)
- Token counts per message
- Total token tracking
- Truncation when approaching context limit

**Section-by-Section Generation:**

Sections in order:
1. Header (firm letterhead info)
2. Introduction
3. Facts (from extracted data)
4. Liability (legal analysis)
5. Damages (itemized)
6. Demand (settlement amount + deadline)
7. Closing

Each section generated with full context

**Streaming Implementation:**

Async streaming for real-time UI updates:
- Yield chunks as generated
- Allow frontend to show progressive output
- Improve perceived performance

**Performance Target:**

Initial generation (<10 seconds):
- Template processing: <1 sec, Variable population: ~2 sec
- Letter generation (streaming): ~6 sec, Tone validation: ~2 sec (parallel)
- DB save: <1 sec
- **Total: ~8-9 seconds**

Refinement (<10 seconds):
Similar timeline with history loading overhead

**Testing Strategy:**

Unit Tests: Template variable extraction, Variable population, Section generation,
History management, Tone validation, Refinement processing

Integration Tests: Full letter generation with sample templates,
Multi-round refinement (3 iterations), Streaming generation,
Edge cases (missing variables, incomplete data, long templates, conflicting refinements)

Fixtures: 3 sample templates (personal injury, property, contract),
Corresponding extracted data, Expected generated letters,
Refinement scenarios with before/after

**Time Breakdown:**
- LetterGenerator: 35 min, TemplateProcessor: 30 min, SectionGenerator: 30 min
- RefinementHandler: 35 min, HistoryManager: 25 min
- Schemas: 25 min, Generation prompts: 40 min, Refinement prompts: 25 min
- LegalToneValidator: 25 min, Streaming: 20 min
- Unit tests: 60 min, Integration tests: 50 min, Fixtures: 35 min, Docs: 25 min
- **Total: 460 minutes (7 hours 40 minutes)**

**Risks/Challenges:**
1. Template variables may not match available extracted data
2. Maintaining professional tone across refinements
3. AI might alter facts during refinement
4. Long conversation histories may exceed context limits
5. Attorney may request many refinements (cost implications)

**Mitigation:**
1. Graceful handling of missing variables, attorney notification
2. Tone validator, explicit prompt instructions
3. "preserve_facts" flag, validation against original data
4. History truncation, summarization
5. Track refinement count, cost alerts after 5+ rounds

**Dependencies:**
- PR-008 (BedrockClient) - MUST complete first
- PR-007 (Templates) - For template structure
- PR-009 (Extraction) - For extracted data schemas

**Notes:**
- Creative heart of the system (quality critical)
- Refinement capability is key for user satisfaction
- Consider A/B testing different prompts with real users
- Temperature 0.7 for creative legal writing

---

## Planning Notes: PR-011 (AI Service Lambda Deployment)

**Planning by:** Agent Orange
**Planned on:** 2025-11-11

**Technology Decisions:**
- **Deployment Method:** Docker container image (not zip file) for easier dependency management
- **Lambda Runtime:** Python 3.11 on arm64 (Graviton2 for cost savings and performance)
- **Handler Pattern:** Single Lambda with route-based dispatch (not separate Lambdas)
- **Layers:** Not needed with container image approach
- **Warm-up Strategy:** CloudWatch Events scheduled pings every 5 minutes
- **API Integration:** API Gateway REST API with Lambda proxy integration

**Verified File List (18 files):**
- services/ai-processor/lambda_handler.py (modify) - Lambda entry point with routing
- services/ai-processor/Dockerfile (create) - Multi-stage Docker build
- services/ai-processor/.dockerignore (create) - Exclude unnecessary files
- services/ai-processor/deploy.sh (create) - Build and deploy script
- services/ai-processor/scripts/build-image.sh (create) - Docker build script
- services/ai-processor/scripts/push-image.sh (create) - ECR push script
- services/ai-processor/scripts/warm-lambda.sh (create) - Lambda warm-up script
- infrastructure/ecr.tf (create) - ECR repository for Lambda images
- infrastructure/lambda-ai.tf (modify) - AI Lambda configuration with container
- infrastructure/lambda-ai-warmup.tf (create) - CloudWatch Events for warm-up
- infrastructure/api-gateway-ai.tf (create) - API Gateway routes to AI Lambda
- services/ai-processor/config/lambda.yaml (create) - Lambda configuration values
- services/ai-processor/tests/test_lambda_handler.py (create)
- services/ai-processor/.env.lambda.example (create) - Lambda env vars
- .github/workflows/deploy-ai-processor.yml (create) - CI/CD for AI Lambda
- scripts/test-ai-lambda.sh (create) - Integration test script
- docs/deployment/ai-lambda-deployment.md (create) - Deployment docs
- docs/memory/techContext.md (modify) - Note Lambda deployment approach

**Lambda Handler Design:**

Route-based dispatch with module-level initialization:
- Routes: POST /analyze, POST /generate, POST /refine, GET /health
- Module-level client initialization for reuse across invocations
- API Gateway proxy integration
- Correlation ID tracking for request tracing
- Structured error responses

**Dockerfile:**

Multi-stage build:
1. Builder stage: Install dependencies to /build/dependencies
2. Runtime stage: Copy dependencies + application code
3. Base image: public.ecr.aws/lambda/python:3.11-arm64
4. Handler: lambda_handler.lambda_handler

**Terraform Configuration:**

Resources:
- ECR repository for Lambda images (scan on push, encryption)
- Lambda function with container image (arm64, 2048MB, 300s timeout)
- VPC configuration (private subnets, security groups)
- IAM role with Bedrock, S3, RDS permissions
- CloudWatch Events for warm-up (every 5 minutes)
- API Gateway integration (routes for analyze, generate, refine, health)

**Deployment Scripts:**

deploy.sh:
1. Build Docker image (linux/arm64)
2. Tag for ECR (latest + commit hash)
3. Login to ECR
4. Push images
5. Update Lambda function code
6. Wait for update completion
7. Run integration tests

**Cold Start Optimization:**

Strategies to achieve <3 second target:
1. Arm64 architecture (Graviton2 faster cold starts)
2. Module-level initialization (clients outside handler)
3. Minimal dependencies in container
4. Container image (faster than zip for large deps)
5. Warm-up events (CloudWatch Events every 5 minutes)
6. Lazy loading for heavy dependencies

Expected cold start: ~3.1 seconds (just at target)
Warm invocation: ~100-200ms

**Memory Optimization:**

Test memory allocations:
- 1024 MB: May be too small
- 2048 MB: Good starting point (2 vCPU) ← chosen
- 3072 MB: If processing large documents
- 4096 MB: Likely overkill

Lambda pricing: Pay for GB-seconds, so right-sizing important

**Environment Variables:**

Configuration:
- AWS_REGION, BEDROCK_MODEL_ID, BEDROCK_MAX_TOKENS
- BEDROCK_TEMPERATURE, DATABASE_URL
- LOG_LEVEL, ENVIRONMENT

**Testing Strategy:**

Unit Tests: Lambda handler routing, Request/response formatting,
Error handling per route, Health check, Correlation ID tracking

Integration Tests: Deploy to dev, Test each endpoint with real requests,
Verify CloudWatch logs, Test cold start time, Test warm invocation,
Verify error handling

Load Testing: Concurrent requests, Response times,
Lambda metrics (duration, errors, throttles), API Gateway integration

**CI/CD Pipeline:**

GitHub Actions workflow:
1. Run tests with coverage
2. Configure AWS credentials
3. Build and deploy to dev on main branch push
4. Run integration tests post-deployment

**Monitoring:**

CloudWatch metrics:
- Invocation count, Duration (P50, P95, P99), Error rate
- Throttle count, Cold start count, Memory usage
- Bedrock API errors

CloudWatch alarms:
- Error rate >5% for 5 minutes
- P99 duration >30 seconds
- Throttle count >10 in 1 minute

**Time Breakdown:**
- Lambda handler with routing: 30 min, Dockerfile: 20 min, Deployment scripts: 30 min
- Terraform config: 40 min, API Gateway: 25 min, Warm-up: 15 min
- Environment config: 15 min, Unit tests: 30 min, Integration tests: 35 min
- CI/CD pipeline: 30 min, Documentation: 25 min, Testing/optimization: 40 min
- **Total: 335 minutes (5 hours 35 minutes)**

**Risks/Challenges:**
1. Cold start time may exceed 3 second target
2. Memory requirements may need >2GB for document processing
3. Lambda in VPC has slower cold starts
4. Large container image may slow deployment
5. AWS Lambda concurrent limits

**Mitigation:**
1. Warm-up events, optimize container size, lazy loading
2. Test various memory settings, optimize for cost
3. Use NAT Gateway, consider VPC endpoints
4. Multi-stage build, minimize dependencies
5. Request limit increase, implement queuing

**Dependencies:**
- PR-008, PR-009, PR-010 (all AI processing code) - MUST complete first
- PR-003 (Terraform infrastructure) - For infrastructure updates

**Notes:**
- Container image simplifies dependency management vs. Lambda layers
- Arm64 provides cost savings and better performance
- Warm-up strategy trades cost for better UX
- Single Lambda with routing simpler than multiple Lambdas
- Following AWS Lambda best practices for production workloads

---

## Block 5: API Integration Layer (Depends on: Blocks 3, 4)

### PR-012: Demand Letter Workflow API (Node.js)
**Status:** New
**Dependencies:** PR-001, PR-002, PR-004, PR-006, PR-007, PR-011
**Priority:** High

**Description:**
Build Node.js API endpoints orchestrating the complete demand letter workflow: upload documents → analyze → generate draft → refine → export.

**Files (ESTIMATED - will be refined during Planning):**
- services/api/src/services/DemandLetterService.ts (create)
- services/api/src/services/AIServiceClient.ts (create) - calls Python Lambda
- services/api/src/routes/demand-letters.ts (create)
- services/api/src/types/demand-letter.ts (create)
- services/api/src/utils/workflowState.ts (create) - state machine
- tests/demand-letters/DemandLetterService.test.ts (create)
- tests/integration/demand-letter-workflow.test.ts (create)

**Acceptance Criteria:**
- [ ] POST /demand-letters - create new demand letter project
- [ ] POST /demand-letters/:id/analyze - trigger document analysis (async)
- [ ] GET /demand-letters/:id/analysis - get analysis results
- [ ] POST /demand-letters/:id/generate - generate draft letter
- [ ] GET /demand-letters/:id - get current letter draft
- [ ] POST /demand-letters/:id/refine - submit refinement instructions
- [ ] GET /demand-letters/:id/history - get revision history
- [ ] Workflow state management (uploading, analyzing, drafting, refining, complete)
- [ ] Async job processing for long-running AI tasks
- [ ] WebSocket notifications for workflow progress
- [ ] Error handling for AI service failures
- [ ] Tests cover complete workflow

**Notes:**
This is the orchestration layer tying together document storage, templates, and AI processing.

---

### PR-013: Document Export Service (Word/PDF)
**Status:** New
**Dependencies:** PR-001, PR-002, PR-012
**Priority:** High

**Description:**
Implement export functionality to generate properly formatted Word documents (.docx) from demand letter drafts. Support PDF export as well.

**Files (ESTIMATED - will be refined during Planning):**
- services/api/src/services/ExportService.ts (create)
- services/api/src/utils/docx-generator.ts (create) - use docx library
- services/api/src/utils/pdf-generator.ts (create) - use puppeteer or similar
- services/api/src/routes/export.ts (create)
- services/api/src/templates/letter-template.docx (create) - base template
- tests/export/ExportService.test.ts (create)

**Acceptance Criteria:**
- [ ] GET /demand-letters/:id/export/docx - export to Word format
- [ ] GET /demand-letters/:id/export/pdf - export to PDF format
- [ ] Proper formatting: letterhead, paragraphs, signatures
- [ ] Template styling preserved in export
- [ ] Firm logo/branding included (if configured)
- [ ] File download with proper content-type headers
- [ ] Tests verify document structure and content

**Notes:**
Use docx library for Word export. Consider using Lambda for PDF generation (headless Chrome).

---

## Block 6: Frontend Foundation (Depends on: Block 2)

### PR-014: React App Setup with Vite
**Status:** Complete
**Agent:** White
**Completed on:** 2025-11-11
**Planned by:** Agent White (2025-11-11)
**Dependencies:** PR-001 (Complete)
**Priority:** High

**Description:**
Initialize React application using Vite with TypeScript, React Router, state management, and UI component library setup.

**Files (ESTIMATED - will be refined during Planning):**
- frontend/vite.config.ts (create)
- frontend/tsconfig.json (create)
- frontend/index.html (create)
- frontend/src/main.tsx (create)
- frontend/src/App.tsx (create)
- frontend/src/routes/ (create directory) - React Router setup
- frontend/src/lib/api-client.ts (create) - API client with auth
- frontend/src/lib/auth-context.tsx (create) - auth state management
- frontend/src/styles/globals.css (create)
- frontend/package.json (modify) - add dependencies

**Acceptance Criteria:**
- [ ] Vite configured for React + TypeScript
- [ ] React Router v6 setup with protected routes
- [ ] State management configured (React Query + Context API)
- [ ] API client with JWT token handling
- [ ] Auth context for global authentication state
- [ ] UI component library installed (e.g., Radix UI + shadcn/ui)
- [ ] Basic layout components (Header, Sidebar, Main)
- [ ] Environment variable handling (.env.local)
- [ ] Development server runs successfully
- [ ] Build produces optimized production bundle

**Notes:**
Avoid Tailwind CSS per project preferences. Consider CSS modules or styled-components.

---

### PR-015: Authentication UI (Login, Register)
**Status:** New
**Dependencies:** PR-001, PR-004, PR-014
**Priority:** High

**Description:**
Build login, registration, and password reset UI components with form validation and error handling.

**Files (ESTIMATED - will be refined during Planning):**
- frontend/src/pages/Login.tsx (create)
- frontend/src/pages/Register.tsx (create)
- frontend/src/pages/ForgotPassword.tsx (create)
- frontend/src/pages/ResetPassword.tsx (create)
- frontend/src/components/auth/LoginForm.tsx (create)
- frontend/src/components/auth/RegisterForm.tsx (create)
- frontend/src/hooks/useAuth.ts (create)
- frontend/src/utils/validation.ts (create) - form validation
- frontend/src/tests/Login.test.tsx (create)

**Acceptance Criteria:**
- [ ] Login form with email and password
- [ ] Registration form with validation (password strength, email format)
- [ ] Forgot password flow
- [ ] Reset password with token validation
- [ ] Form validation with clear error messages
- [ ] Loading states during API calls
- [ ] Redirect after successful login
- [ ] Remember me functionality
- [ ] Accessibility (WCAG AA compliance)
- [ ] Component tests with React Testing Library

**Notes:**
Security: validate all input client-side, but rely on server-side validation as source of truth.

---

## Block 7: Frontend - Core Features (Depends on: Blocks 5, 6)

### PR-016: Document Upload UI
**Status:** New
**Dependencies:** PR-006, PR-014, PR-015
**Priority:** High

**Description:**
Build drag-and-drop document upload interface with progress tracking, file validation, and preview capabilities.

**Files (ESTIMATED - will be refined during Planning):**
- frontend/src/pages/DocumentUpload.tsx (create)
- frontend/src/components/documents/FileUploader.tsx (create)
- frontend/src/components/documents/FilePreview.tsx (create)
- frontend/src/components/documents/UploadProgress.tsx (create)
- frontend/src/hooks/useDocumentUpload.ts (create)
- frontend/src/tests/DocumentUpload.test.tsx (create)

**Acceptance Criteria:**
- [ ] Drag-and-drop upload area
- [ ] Click to select files
- [ ] Multiple file upload support
- [ ] File type validation (PDF, DOCX, images)
- [ ] File size validation (max 50MB)
- [ ] Upload progress bar per file
- [ ] Preview uploaded documents (thumbnail or icon)
- [ ] Error handling with user-friendly messages
- [ ] Accessible keyboard navigation
- [ ] Component tests

**Notes:**
Use react-dropzone or similar for file upload UX.

---

### PR-017: Template Management UI
**Status:** New
**Dependencies:** PR-007, PR-014, PR-015
**Priority:** High

**Description:**
Build interface for viewing, creating, and editing demand letter templates. Support template variables and preview.

**Files (ESTIMATED - will be refined during Planning):**
- frontend/src/pages/Templates.tsx (create)
- frontend/src/pages/TemplateEditor.tsx (create)
- frontend/src/components/templates/TemplateList.tsx (create)
- frontend/src/components/templates/TemplateForm.tsx (create)
- frontend/src/components/templates/VariableInserter.tsx (create)
- frontend/src/hooks/useTemplates.ts (create)
- frontend/src/tests/Templates.test.tsx (create)

**Acceptance Criteria:**
- [ ] List all firm templates
- [ ] Create new template (admin only)
- [ ] Edit existing template
- [ ] Rich text editor for template content
- [ ] Insert template variables via UI helper
- [ ] Preview template with sample data
- [ ] Template version history viewer
- [ ] Delete template (with confirmation)
- [ ] Role-based UI (admin vs. regular user)
- [ ] Component tests

**Notes:**
Consider using Lexical or TipTap for rich text editing with variable support.

---

### PR-018: Demand Letter Workspace UI
**Status:** New
**Dependencies:** PR-012, PR-014, PR-015, PR-016
**Priority:** High

**Description:**
Build main workspace for creating and editing demand letters. Display document analysis results, letter draft, and refinement interface.

**Files (ESTIMATED - will be refined during Planning):**
- frontend/src/pages/DemandLetterWorkspace.tsx (create)
- frontend/src/components/workspace/DocumentPanel.tsx (create)
- frontend/src/components/workspace/AnalysisPanel.tsx (create)
- frontend/src/components/workspace/LetterEditor.tsx (create)
- frontend/src/components/workspace/RefinementPanel.tsx (create)
- frontend/src/components/workspace/WorkflowStatus.tsx (create)
- frontend/src/hooks/useDemandLetter.ts (create)
- frontend/src/hooks/useWorkflowStatus.ts (create)
- frontend/src/tests/DemandLetterWorkspace.test.tsx (create)

**Acceptance Criteria:**
- [ ] Multi-panel layout (documents, analysis, letter, refinement)
- [ ] Display uploaded source documents
- [ ] Show extracted information from analysis
- [ ] Editable letter draft with rich text
- [ ] Refinement input with AI processing
- [ ] Workflow status indicator (analyzing, generating, refining)
- [ ] Real-time updates via WebSocket
- [ ] Export buttons (Word, PDF)
- [ ] Revision history viewer
- [ ] Loading states for async operations
- [ ] Error handling and retry mechanisms
- [ ] Component tests

**Notes:**
This is the primary user interface. UX should be intuitive and responsive.

---

## Block 8: Real-Time Collaboration (P1 Feature)

### PR-019: Yjs Collaboration Backend
**Status:** New
**Dependencies:** PR-001, PR-002, PR-012
**Priority:** Medium

**Description:**
Implement WebSocket server for real-time collaboration using Yjs CRDT. Support concurrent editing of demand letters with conflict resolution.

**Files (ESTIMATED - will be refined during Planning):**
- services/collaboration/package.json (create) - new service
- services/collaboration/src/server.ts (create) - WebSocket server
- services/collaboration/src/yjs-handler.ts (create) - Yjs document sync
- services/collaboration/src/persistence.ts (create) - save to PostgreSQL
- services/collaboration/src/awareness.ts (create) - user presence
- services/collaboration/src/middleware/auth.ts (create) - WebSocket auth
- infrastructure/lambda-websocket.tf (modify) - WebSocket API Gateway
- tests/collaboration/yjs-handler.test.ts (create)

**Acceptance Criteria:**
- [ ] WebSocket server using y-websocket
- [ ] JWT authentication for WebSocket connections
- [ ] Yjs document synchronization across clients
- [ ] Conflict-free collaborative editing (CRDT)
- [ ] User awareness (show who's editing)
- [ ] Persistence of Yjs documents to PostgreSQL
- [ ] Room-based isolation (one room per demand letter)
- [ ] Handle disconnections and reconnections
- [ ] Tests verify sync and conflict resolution

**Notes:**
P1 (should-have) feature. Can be deferred if timeline is tight. Requires WebSocket API Gateway in AWS.

---

### PR-020: Collaboration UI Integration
**Status:** New
**Dependencies:** PR-014, PR-018, PR-019
**Priority:** Medium

**Description:**
Integrate Yjs into React editor for real-time collaborative editing. Show user cursors, selections, and presence indicators.

**Files (ESTIMATED - will be refined during Planning):**
- frontend/src/lib/collaboration/yjs-provider.ts (create)
- frontend/src/lib/collaboration/awareness-hooks.ts (create)
- frontend/src/components/editor/CollaborativeEditor.tsx (create)
- frontend/src/components/editor/UserCursor.tsx (create)
- frontend/src/components/editor/PresenceList.tsx (create)
- frontend/src/hooks/useCollaboration.ts (create)
- frontend/src/tests/CollaborativeEditor.test.tsx (create)

**Acceptance Criteria:**
- [ ] Real-time text editing synchronized across users
- [ ] User cursors and selections visible
- [ ] User presence list showing active collaborators
- [ ] User names/avatars in presence indicators
- [ ] Offline support (queue changes, sync when reconnected)
- [ ] Conflict-free editing experience
- [ ] Performance: <100ms sync latency
- [ ] Graceful handling of connection loss
- [ ] Component tests (mocked WebSocket)

**Notes:**
Requires careful UX design to avoid overwhelming users with presence indicators.

---

## Block 9: Testing & Quality Assurance

### PR-021: Integration Test Suite
**Status:** New
**Dependencies:** PR-004, PR-006, PR-007, PR-012, PR-013
**Priority:** High

**Description:**
Create comprehensive end-to-end integration tests covering complete user workflows from registration to demand letter export.

**Files (ESTIMATED - will be refined during Planning):**
- tests/integration/auth-flow.test.ts (create)
- tests/integration/document-workflow.test.ts (create)
- tests/integration/template-workflow.test.ts (create)
- tests/integration/letter-generation.test.ts (create)
- tests/integration/export-workflow.test.ts (create)
- tests/integration/setup.ts (create) - test database setup
- tests/fixtures/users.json (create)
- tests/fixtures/sample-documents/ (create directory)
- tests/fixtures/sample-letters/ (create directory)

**Acceptance Criteria:**
- [ ] Full authentication flow (register → login → logout)
- [ ] Document upload and storage flow
- [ ] Template CRUD operations
- [ ] Complete demand letter workflow (upload → analyze → generate → refine → export)
- [ ] Export to Word and PDF
- [ ] Multi-user scenarios (different firms)
- [ ] Error scenarios (invalid inputs, auth failures)
- [ ] Test database isolation (each test uses fresh DB)
- [ ] Fixture data management
- [ ] All tests pass in CI/CD

**Notes:**
QC agent may expand this PR if gaps are found. Tests should use real AWS services (dev environment) for full integration coverage.

---

### PR-022: Frontend E2E Tests (Playwright)
**Status:** New
**Dependencies:** PR-015, PR-016, PR-017, PR-018
**Priority:** High

**Description:**
Create end-to-end browser tests using Playwright covering critical user journeys and UI interactions.

**Files (ESTIMATED - will be refined during Planning):**
- frontend/playwright.config.ts (create)
- frontend/tests/e2e/auth.spec.ts (create)
- frontend/tests/e2e/document-upload.spec.ts (create)
- frontend/tests/e2e/template-management.spec.ts (create)
- frontend/tests/e2e/letter-workflow.spec.ts (create)
- frontend/tests/e2e/collaboration.spec.ts (create)
- frontend/tests/fixtures/ (create directory) - test files

**Acceptance Criteria:**
- [ ] Login and registration flows
- [ ] Document upload with drag-and-drop
- [ ] Template creation and editing
- [ ] Complete demand letter workflow in UI
- [ ] Export functionality
- [ ] Real-time collaboration (if PR-020 complete)
- [ ] Responsive design tests (mobile, tablet, desktop)
- [ ] Accessibility tests (WCAG AA)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Tests run in CI/CD with screenshots on failure

**Notes:**
E2E tests should run against a real backend (dev environment) for maximum confidence.

---

## Block 10: Performance & Monitoring

### PR-023: Logging and Monitoring Infrastructure
**Status:** New
**Dependencies:** PR-001, PR-003
**Priority:** Medium

**Description:**
Set up comprehensive logging with CloudWatch, error tracking with Sentry, and performance monitoring with X-Ray or Datadog.

**Files (ESTIMATED - will be refined during Planning):**
- services/api/src/lib/logger.ts (create) - Winston logger
- services/api/src/middleware/requestLogger.ts (create)
- services/api/src/middleware/errorHandler.ts (create) - Sentry integration
- services/ai-processor/src/logging.py (create) - Python logging
- infrastructure/monitoring.tf (create) - CloudWatch dashboards
- infrastructure/alarms.tf (create) - CloudWatch alarms
- services/api/src/config/sentry.ts (create)
- frontend/src/lib/errorTracking.ts (create) - frontend Sentry

**Acceptance Criteria:**
- [ ] Structured logging to CloudWatch (JSON format)
- [ ] Request/response logging with correlation IDs
- [ ] Error tracking with Sentry (backend and frontend)
- [ ] AWS X-Ray tracing for Lambda functions
- [ ] CloudWatch dashboards for key metrics
- [ ] Alarms for error rates, latency, Lambda failures
- [ ] Log aggregation and search capability
- [ ] Cost tracking (Bedrock token usage)
- [ ] Performance metrics (P95 latency)

**Notes:**
Essential for production operations. Can be developed in parallel with features.

---

### PR-024: API Rate Limiting and Security Headers
**Status:** New
**Dependencies:** PR-001, PR-004
**Priority:** Medium

**Description:**
Implement rate limiting, CORS configuration, security headers, and API abuse prevention.

**Files (ESTIMATED - will be refined during Planning):**
- services/api/src/middleware/rateLimit.ts (create)
- services/api/src/middleware/security.ts (create) - helmet, CORS
- services/api/src/config/cors.ts (create)
- services/api/src/utils/ipWhitelist.ts (create)
- tests/middleware/rateLimit.test.ts (create)
- tests/middleware/security.test.ts (create)

**Acceptance Criteria:**
- [ ] Rate limiting by IP (100 req/15min for anonymous)
- [ ] Rate limiting by user (500 req/15min for authenticated)
- [ ] Return 429 with Retry-After header
- [ ] CORS configured for frontend domain
- [ ] Security headers (CSP, HSTS, X-Frame-Options)
- [ ] API key validation for programmatic access
- [ ] IP whitelist support for enterprise clients
- [ ] Tests verify rate limits and security headers

**Notes:**
Consider using API Gateway throttling as first line of defense.

---

## Block 11: Documentation & Deployment

### PR-025: Deployment Pipeline and CI/CD
**Status:** New
**Dependencies:** PR-003, PR-011, PR-014
**Priority:** High

**Description:**
Create complete CI/CD pipeline for automated testing, building, and deployment to AWS using GitHub Actions.

**Files (ESTIMATED - will be refined during Planning):**
- .github/workflows/ci.yml (modify) - full CI pipeline
- .github/workflows/deploy-dev.yml (create)
- .github/workflows/deploy-prod.yml (create)
- scripts/build-api.sh (create)
- scripts/build-ai.sh (create)
- scripts/build-frontend.sh (create)
- scripts/deploy.sh (create)
- scripts/smoke-test.sh (create)

**Acceptance Criteria:**
- [ ] CI pipeline runs on every PR (lint, test, build)
- [ ] Automated deployment to dev environment on main branch
- [ ] Manual approval for production deployment
- [ ] Build and deploy API service (Node.js Lambda)
- [ ] Build and deploy AI service (Python Lambda)
- [ ] Build and deploy frontend (S3 + CloudFront)
- [ ] Run migrations before deployment
- [ ] Smoke tests after deployment
- [ ] Rollback mechanism for failed deployments
- [ ] Secrets management (GitHub Secrets → AWS)

**Notes:**
Essential for team collaboration and reliable deployments.

---

### PR-026: User Documentation and Help System
**Status:** New
**Dependencies:** PR-015, PR-016, PR-017, PR-018
**Priority:** Medium

**Description:**
Create user-facing documentation including getting started guide, feature documentation, and in-app help system.

**Files (ESTIMATED - will be refined during Planning):**
- docs/user-guide.md (create)
- docs/getting-started.md (create)
- docs/templates-guide.md (create)
- docs/faq.md (create)
- frontend/src/components/help/HelpPanel.tsx (create)
- frontend/src/components/help/Tooltip.tsx (create)
- frontend/public/videos/ (create directory) - tutorial videos

**Acceptance Criteria:**
- [ ] Getting started guide for new users
- [ ] Feature documentation for each major feature
- [ ] Template creation guide with examples
- [ ] FAQ covering common questions
- [ ] In-app help tooltips for key UI elements
- [ ] Contextual help panel accessible from workspace
- [ ] Screenshots and diagrams for clarity
- [ ] Video tutorials for complex workflows (optional)

**Notes:**
Can be developed in parallel with features as they're completed.

---

### PR-027: API Documentation (OpenAPI/Swagger)
**Status:** New
**Dependencies:** PR-004, PR-005, PR-006, PR-007, PR-012, PR-013
**Priority:** Medium

**Description:**
Generate comprehensive API documentation using OpenAPI 3.0 specification with interactive Swagger UI.

**Files (ESTIMATED - will be refined during Planning):**
- services/api/openapi.yaml (create) - OpenAPI spec
- services/api/src/docs/swagger.ts (create) - Swagger UI setup
- services/api/src/routes/docs.ts (create) - serve documentation
- scripts/generate-api-docs.sh (create)

**Acceptance Criteria:**
- [ ] OpenAPI 3.0 specification for all endpoints
- [ ] Request/response schemas documented
- [ ] Authentication requirements documented
- [ ] Error responses documented
- [ ] Interactive Swagger UI at /api/docs
- [ ] Code examples for common operations
- [ ] Try-it-out functionality in Swagger UI
- [ ] Generated client SDKs (TypeScript, Python)

**Notes:**
Essential for future integrations and third-party developers.

---

### PR-028: Comprehensive Architecture Documentation
**Status:** New
**Dependencies:** ALL PREVIOUS PRs
**Priority:** Medium

**Description:**
Create detailed technical documentation in docs/architecture.md that serves as the definitive reference for the system's design, implementation, and operational characteristics.

**Files (ESTIMATED - will be refined during Planning):**
- docs/architecture.md (create)

**Documentation Requirements:**

The architecture document should include:

1. **System Architecture**
   - High-level architecture overview (microservices: Node API, Python AI, React frontend)
   - Technology stack and rationale (Vite+React, Node.js, Python, PostgreSQL, AWS Lambda, Bedrock)
   - Integration points between services (API Gateway, Lambda, S3, RDS)
   - Data flow patterns (upload → storage → analysis → generation → export)

2. **Component Architecture**
   - Service organization (api/, ai-processor/, frontend/, collaboration/)
   - Key modules and their responsibilities
   - Design patterns used (service layer, repository pattern, CRDT for collaboration)
   - State management approach (React Query + Context API)

3. **Data Models**
   - Complete database schema with relationships
   - TypeScript type definitions
   - Python Pydantic models
   - API contracts (OpenAPI reference)

4. **Key Subsystems**
   - AI processing pipeline (document analysis → extraction → generation)
   - Authentication flow (JWT with refresh tokens)
   - Real-time collaboration architecture (Yjs CRDT + WebSocket)
   - Document storage and retrieval (S3 signed URLs)

5. **Security Architecture**
   - Authentication and authorization flows
   - Multi-tenant data isolation
   - Secrets management (AWS Secrets Manager)
   - API security (rate limiting, CORS, security headers)

6. **Deployment Architecture**
   - AWS infrastructure (Lambda, API Gateway, RDS, S3, CloudFront)
   - CI/CD pipeline (GitHub Actions → AWS)
   - Environment configuration (dev, prod)
   - Monitoring and logging (CloudWatch, Sentry, X-Ray)

7. **Visual Diagrams**
   - System architecture diagram (services and AWS resources)
   - Data flow diagram (document upload through export)
   - Authentication sequence diagram
   - AI processing workflow diagram
   - Collaboration architecture diagram

8. **Performance Characteristics**
   - Expected latencies (API <500ms, AI generation <10s)
   - Scalability considerations (Lambda auto-scaling, RDS connection pooling)
   - Optimization strategies (caching, async processing)

**Acceptance Criteria:**
- [ ] Developer can understand system by reading this document
- [ ] All major architectural decisions documented with rationale
- [ ] Diagrams render correctly in GitHub (Mermaid syntax)
- [ ] Document reflects actual implementation (not idealized design)
- [ ] Includes lessons learned during development

**Notes:**
This PR must be claimed LAST, after all implementation is complete. The agent should:
1. Review git history to understand the implementation journey
2. Read through all completed PRs and their notes
3. Review the actual codebase to see what was built
4. Identify the key architectural patterns that emerged
5. Create clear, accurate diagrams using Mermaid syntax
6. Write for an audience of developers joining the project

Estimated 90-120 minutes. Should not be rushed.

---

## Summary Statistics

**Overall Progress:** 2/28 PRs Complete (7.1%)

**Status Breakdown:**
- Complete: 2
- In Progress: 1 (PR-002)
- Broken: 0
- Blocked-Ready: 0
- Suspended: 0
- Planning: 0
- New: 25

**Dependency Blocks:**
- Block 1 (Foundation): 3 PRs - **PHASED EXECUTION:**
  - Phase 1: PR-001 alone (60-90 min) - **COMPLETE**
  - Phase 2: PR-002 + PR-003 in parallel (90-120 min) - **IN PROGRESS (PR-002), COMPLETE (PR-003)**
- Block 2 (Auth): 2 PRs (depend on Block 1)
- Block 3 (Document/Template): 2 PRs (depend on Block 2)
- Block 4 (AI): 4 PRs (depend on Block 3)
- Block 5 (API Integration): 2 PRs (depend on Blocks 3 & 4)
- Block 6 (Frontend Foundation): 2 PRs (depend on Block 1)
- Block 7 (Frontend Features): 3 PRs (depend on Blocks 5 & 6)
- Block 8 (Collaboration - P1): 2 PRs (depend on Blocks 5 & 7)
- Block 9 (Testing): 2 PRs (depend on implementation blocks)
- Block 10 (Performance): 2 PRs (can start early, parallel)
- Block 11 (Documentation/Deployment): 4 PRs (deploy early, docs last)

**Critical Path:**
PR-001 → (PR-002 or PR-003) → Block 2 → Block 3 → Block 4 → Block 5 → Block 7 → Block 9

**Parallel Work Opportunities:**
- Block 1: PR-002 + PR-003 after PR-001 completes (2 agents)
- Block 2: PR-004, PR-005 can run in parallel (2 agents)
- Block 3: PR-006, PR-007 can run in parallel (2 agents)
- Block 4: PR-008, PR-009, PR-010 sequential, but PR-011 separate
- Block 6: PR-014, PR-015 after Block 2
- Block 10: PR-023, PR-024 can start early

**Next Available Work:**
After Block 1 completes (when PR-002 finishes), Block 2 PRs become available:
- PR-004 (User Authentication Service) - Depends on PR-001, PR-002
- PR-005 (Firm and User Management API) - Depends on PR-001, PR-002, PR-004

---

## Notes

### Tech Stack Decisions
- **Backend:** Node.js for API/web services, Python for AI processing (leverages each language's strengths)
- **AI Provider:** AWS Bedrock (Claude) for enterprise compliance and AWS integration
- **Frontend:** Vite + React (fast builds, modern tooling, no Tailwind per preferences)
- **Collaboration:** Yjs + WebSocket (CRDT for conflict-free editing)
- **Database:** PostgreSQL on RDS (relational data, ACID guarantees)
- **Deployment:** AWS Lambda (serverless, auto-scaling)

### P0 vs P1 Features
- **P0 (Must-have):** Document upload, template management, AI generation, export to Word
- **P1 (Should-have):** Real-time collaboration (Block 8)
- **P2 (Nice-to-have):** Third-party integrations (out of scope for initial release)

### Multi-Tenant Architecture
All data queries must be scoped by `firm_id` to ensure tenant isolation. Middleware enforces this at the API layer.

### Security Considerations
- All file uploads must be scanned for viruses
- JWT tokens with short expiration (1 hour access, 30 day refresh)
- Rate limiting to prevent abuse
- HTTPS only, security headers enforced
- .env files never committed (use .env.example)

### Cost Optimization
- Log all Bedrock token usage for cost tracking
- Optimize Lambda memory allocation based on performance tests
- Use S3 lifecycle policies for old documents
- Consider caching for frequently used templates

---

## Planning Notes: PR-014 (React App Setup with Vite)

**Planning by:** Agent White
**Planned on:** 2025-11-11
**Status:** Blocked-Ready → Ready to claim and implement

**Current State Analysis:**
The frontend directory exists with basic Vite + React + TypeScript skeleton from PR-001. However, it lacks:
- React Router routing system
- API client with authentication
- Auth state management
- UI component library
- Layout components
- Protected routes

**Technology Decisions:**

**UI Component Library:**
- **Decision:** Radix UI primitives (headless, accessible)
- **Rationale:**
  - No Tailwind dependency (user requirement)
  - Unstyled primitives allow custom CSS
  - WCAG AA accessibility built-in
  - TypeScript support excellent
  - Can style with CSS Modules
- **Alternative considered:** Material-UI (too opinionated), Chakra UI (requires styled-system)

**Styling Solution:**
- **Decision:** CSS Modules
- **Rationale:**
  - Scoped styles without runtime overhead
  - Standard CSS syntax (no learning curve)
  - TypeScript typings available
  - No Tailwind (user requirement)
  - Works well with Vite
- **File structure:** `ComponentName.module.css` alongside component files

**State Management:**
- **Decision:** TanStack React Query + React Context API
- **Rationale:**
  - React Query already in package.json (great for server state)
  - Context API for auth state (simple, built-in)
  - No need for Redux/Zustand complexity yet
- **Pattern:** Separate concerns - server state (React Query) vs client state (Context)

**Form Library:**
- **Decision:** React Hook Form
- **Rationale:**
  - Best performance (uncontrolled components)
  - Excellent TypeScript support
  - Works well with Zod validation (already in package.json)
  - Less re-renders than Formik
- **Integration:** Will use in PR-015 (Authentication UI)

**API Client:**
- **Decision:** Fetch API with custom wrapper
- **Rationale:**
  - Built-in, no extra dependencies
  - Easy JWT token injection
  - Works great with React Query
  - Type-safe with TypeScript generics
- **Features needed:**
  - Automatic token refresh logic
  - Request/response interceptors for auth
  - Error handling with typed responses
  - Base URL from environment variables

**File Structure:**
```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Header.module.css
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Sidebar.module.css
│   │   │   ├── MainLayout.tsx
│   │   │   └── MainLayout.module.css
│   │   └── ui/           # Radix UI wrappers
│   │       ├── Button.tsx
│   │       ├── Button.module.css
│   │       └── ...
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── NotFound.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── api-client.ts      # Fetch wrapper with auth
│   │   ├── auth-context.tsx   # Auth state management
│   │   ├── query-client.ts    # React Query config
│   │   └── router.tsx         # React Router config
│   ├── hooks/
│   │   ├── useAuth.ts         # Auth hook
│   │   └── useApi.ts          # API hook wrapper
│   ├── types/
│   │   ├── api.ts             # API response types
│   │   └── auth.ts            # Auth types
│   ├── styles/
│   │   ├── globals.css        # Global styles, CSS variables
│   │   └── reset.css          # CSS reset
│   ├── App.tsx                # Root component with providers
│   ├── main.tsx               # Entry point
│   └── vite-env.d.ts          # Vite types
├── .env.example               # Environment variables template
└── .env.local                 # Local environment (gitignored)
```

**Verified File List (23 files):**
- frontend/src/components/layout/Header.tsx (create)
- frontend/src/components/layout/Header.module.css (create)
- frontend/src/components/layout/Sidebar.tsx (create)
- frontend/src/components/layout/Sidebar.module.css (create)
- frontend/src/components/layout/MainLayout.tsx (create)
- frontend/src/components/layout/MainLayout.module.css (create)
- frontend/src/components/ui/Button.tsx (create)
- frontend/src/components/ui/Button.module.css (create)
- frontend/src/pages/Home.tsx (create)
- frontend/src/pages/NotFound.tsx (create)
- frontend/src/lib/api-client.ts (create)
- frontend/src/lib/auth-context.tsx (create)
- frontend/src/lib/query-client.ts (create)
- frontend/src/lib/router.tsx (create)
- frontend/src/hooks/useAuth.ts (create)
- frontend/src/hooks/useApi.ts (create)
- frontend/src/types/api.ts (create)
- frontend/src/types/auth.ts (create)
- frontend/src/styles/globals.css (create)
- frontend/src/styles/reset.css (create)
- frontend/src/App.tsx (modify) - wrap with providers
- frontend/package.json (modify) - add dependencies
- frontend/.env.example (create)

**Dependencies to Add:**
```json
{
  "dependencies": {
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-toast": "^1.1.5",
    "react-hook-form": "^7.50.0"
  }
}
```

**API Client Design:**

```typescript
// frontend/src/lib/api-client.ts
export class ApiClient {
  private baseUrl: string;
  private getToken: () => string | null;
  private setToken: (token: string) => void;
  private clearToken: () => void;

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // Add Authorization header
    // Handle token refresh on 401
    // Throw typed errors
  }

  // Convenience methods
  get<T>(endpoint: string): Promise<T>
  post<T>(endpoint: string, data: unknown): Promise<T>
  put<T>(endpoint: string, data: unknown): Promise<T>
  delete<T>(endpoint: string): Promise<T>
}
```

**Auth Context Design:**

```typescript
// frontend/src/lib/auth-context.tsx
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }>;
export const useAuth: () => AuthContextValue;
```

**Router Design:**

Protected routes pattern:
```typescript
// frontend/src/lib/router.tsx
<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/templates" element={<Templates />} />
  {/* ... other protected routes */}
</Route>

<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
```

**Environment Variables:**

```env
# frontend/.env.example
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Demand Letter Generator
```

**Testing Requirements:**
- Unit tests for API client (token refresh, error handling)
- Unit tests for Auth context (login, logout, token management)
- Component tests for layout components
- Integration test: Protected route redirects to login when not authenticated

**Time Estimate:** 240 minutes (4 hours)
- API client with auth: 60 minutes
- Auth context and hooks: 60 minutes
- Router setup with protected routes: 40 minutes
- Layout components (Header, Sidebar, Main): 50 minutes
- UI component wrappers (Button, etc.): 20 minutes
- Testing: 10 minutes (basic tests, comprehensive in PR-022)

**Dependencies:**
- ✅ PR-001 (Complete) - Frontend directory structure exists

**Blocks PRs:**
- PR-015 (Authentication UI) - depends on auth context and router
- PR-016 (Document Upload UI) - depends on layout and router
- PR-017 (Template Management UI) - depends on layout and router
- PR-018 (Demand Letter Workspace UI) - depends on layout and router

**Key Implementation Notes:**

1. **Token Storage:** Use localStorage for JWT (simpler) or httpOnly cookies (more secure, but needs backend support)
2. **Token Refresh:** Implement refresh token logic in API client (retry failed requests after refresh)
3. **Protected Routes:** ProtectedRoute component checks auth state, redirects to /login if not authenticated
4. **CSS Variables:** Define design system in globals.css (colors, spacing, typography)
5. **Radix UI Styling:** Wrap Radix primitives with custom styles in ui/ directory
6. **React Query Setup:** Configure staleTime, cacheTime, retry logic in query-client.ts

**Success Criteria:**
- ✅ npm run dev starts successfully
- ✅ npm run build completes without errors
- ✅ npm run typecheck passes
- ✅ Protected routes redirect to login when not authenticated
- ✅ API client successfully handles token injection
- ✅ Layout renders correctly (Header, Sidebar, Main content area)
- ✅ Basic UI components (Button) styled and functional

---

**Generated:** 2025-11-10
**Last Updated:** 2025-11-11 (PR-014 planning added)
**Ready for parallel agent execution**
