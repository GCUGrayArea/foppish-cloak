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
**Status:** New
**Dependencies:** None
**Priority:** High (MUST COMPLETE FIRST - Foundation for Block 1)

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
- [ ] Monorepo structure created with services/ and frontend/ directories
- [ ] TypeScript compiles without errors in Node services
- [ ] Python environment configured with proper dependencies
- [ ] Linting and formatting configured for all languages
- [ ] npm scripts for build, dev, lint, test
- [ ] Basic CI pipeline runs successfully
- [ ] Development environment documented in README

**Notes:**
This establishes the foundation for all other work. Should include instructions for setting up local development environment.

---

### PR-002: PostgreSQL Database Schema and Migrations
**Status:** Blocked-Ready
**Dependencies:** PR-001 (needs directory structure and package.json files)
**Priority:** High

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
- [ ] Schema supports multi-tenant architecture (firm-level data isolation)
- [ ] User authentication data (hashed passwords, refresh tokens)
- [ ] Template management with version history
- [ ] Document storage references (S3 paths/metadata)
- [ ] Demand letter drafts with revision tracking
- [ ] Foreign key constraints and indexes defined
- [ ] Migration system configured (node-pg-migrate)
- [ ] Connection pooling configured for both Node and Python
- [ ] TypeScript and Python models with full type definitions
- [ ] Database can run locally via Docker Compose
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
**Status:** Blocked-Ready
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
- [ ] Infrastructure code defines all AWS resources
- [ ] Separate dev and prod environments (via tfvars files)
- [ ] S3 buckets for document storage with proper permissions and encryption
- [ ] RDS PostgreSQL instance with security groups and private subnets
- [ ] Lambda execution roles with least-privilege IAM policies
- [ ] Bedrock access policies configured for AI Lambda
- [ ] API Gateway with proper CORS configuration
- [ ] VPC with public and private subnets, NAT gateway
- [ ] Secrets Manager for sensitive configuration
- [ ] CloudWatch log groups for all Lambda functions
- [ ] Infrastructure can be deployed via Terraform commands
- [ ] .env.example documents all required environment variables
- [ ] Deployment scripts automate Terraform apply/destroy

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
**Status:** New
**Dependencies:** PR-001, PR-002
**Priority:** High

**Description:**
Implement JWT-based authentication with registration, login, password reset, and session management. Support firm-level user roles (admin, attorney, paralegal).

**Files (ESTIMATED - will be refined during Planning):**
- services/api/src/auth/AuthService.ts (create)
- services/api/src/auth/jwt.ts (create) - JWT utilities
- services/api/src/auth/password.ts (create) - bcrypt hashing
- services/api/src/middleware/auth.ts (create) - auth middleware
- services/api/src/middleware/permissions.ts (create) - role-based access
- services/api/src/routes/auth.ts (create) - auth endpoints
- services/api/src/types/auth.ts (create) - TypeScript types
- tests/auth/AuthService.test.ts (create)
- tests/auth/integration.test.ts (create)

**Acceptance Criteria:**
- [ ] POST /auth/register - create new user account
- [ ] POST /auth/login - returns JWT access and refresh tokens
- [ ] POST /auth/refresh - refresh expired access token
- [ ] POST /auth/logout - invalidate refresh token
- [ ] POST /auth/forgot-password - initiate password reset
- [ ] POST /auth/reset-password - complete password reset
- [ ] Password hashing with bcrypt (cost factor 12)
- [ ] JWT tokens with proper expiration (access: 1hr, refresh: 30 days)
- [ ] Role-based access control middleware
- [ ] Unit tests with >90% coverage
- [ ] Integration tests for complete auth flows

**Notes:**
Essential for all user-facing features. Security-critical - follow OWASP guidelines.

---

### PR-005: Firm and User Management API
**Status:** New
**Dependencies:** PR-001, PR-002, PR-004
**Priority:** High

**Description:**
Build API endpoints for managing firms, users, and firm-level settings. Support inviting users, managing roles, and firm configuration.

**Files (ESTIMATED - will be refined during Planning):**
- services/api/src/routes/firms.ts (create)
- services/api/src/routes/users.ts (create)
- services/api/src/services/FirmService.ts (create)
- services/api/src/services/UserService.ts (create)
- services/api/src/middleware/firmContext.ts (create) - tenant isolation
- services/api/src/types/firm.ts (create)
- tests/firms/FirmService.test.ts (create)
- tests/integration/firm-management.test.ts (create)

**Acceptance Criteria:**
- [ ] GET /firms/:id - get firm details (admin only)
- [ ] PUT /firms/:id - update firm settings (admin only)
- [ ] GET /firms/:id/users - list firm users
- [ ] POST /firms/:id/users/invite - invite user to firm
- [ ] DELETE /firms/:id/users/:userId - remove user (admin only)
- [ ] PUT /users/:id - update user profile
- [ ] PUT /users/:id/role - change user role (admin only)
- [ ] Firm-level data isolation enforced at middleware level
- [ ] Email invitations sent for new users
- [ ] Tests verify multi-tenant isolation

**Notes:**
Multi-tenant architecture is critical - all queries must be scoped to firm_id.

---

## Block 3: Document Storage & Management (Depends on: Block 2)

### PR-006: Document Upload and Storage Service
**Status:** New
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
- [ ] POST /documents/upload - upload source documents to S3
- [ ] GET /documents/:id - get document metadata
- [ ] GET /documents/:id/download - generate signed S3 URL
- [ ] DELETE /documents/:id - soft delete document
- [ ] File type validation (PDF, DOCX, DOC, images)
- [ ] File size limits (max 50MB per file)
- [ ] Virus scanning integration (ClamAV or AWS GuardDuty)
- [ ] S3 signed URLs with 1-hour expiration
- [ ] Metadata extraction (file name, size, type, upload date)
- [ ] Document associated with firm and user
- [ ] Unit and integration tests

**Notes:**
Security-critical. All uploads must be scanned and validated before storage.

---

### PR-007: Template Management System
**Status:** New
**Dependencies:** PR-001, PR-002, PR-004, PR-005
**Priority:** High

**Description:**
Build system for creating, editing, and managing firm-specific demand letter templates. Support template variables, versioning, and default templates.

**Files (ESTIMATED - will be refined during Planning):**
- services/api/src/services/TemplateService.ts (create)
- services/api/src/routes/templates.ts (create)
- services/api/src/types/template.ts (create)
- services/api/src/utils/templateValidation.ts (create)
- tests/templates/TemplateService.test.ts (create)
- tests/integration/template-management.test.ts (create)

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

## Block 4: AI Processing Service (Depends on: Block 3)

### PR-008: AWS Bedrock Integration (Python)
**Status:** New
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
- [ ] Bedrock client configured with Claude model (claude-3-5-sonnet)
- [ ] Structured output using tool calling or JSON mode
- [ ] Retry logic with exponential backoff for rate limits
- [ ] Error handling for common Bedrock errors
- [ ] Logging of all LLM interactions (requests/responses)
- [ ] Cost tracking (token usage logged)
- [ ] Configuration for model parameters (temperature, max_tokens)
- [ ] Unit tests with mocked Bedrock responses
- [ ] Integration tests with real Bedrock calls (dev environment only)

**Notes:**
Follow patterns from .claude/rules/llm-architecture.md for robust LLM application design.

---

### PR-009: Document Analysis and Extraction (Python)
**Status:** New
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
- [ ] Parse PDF documents (text extraction)
- [ ] Extract structured data: parties, dates, case facts, damages
- [ ] Use Claude with structured outputs (tool calling)
- [ ] Handle multi-page documents
- [ ] Confidence scores for extracted data
- [ ] Support multiple document types (police reports, medical records, contracts)
- [ ] Validation of extracted data against schemas
- [ ] Unit tests with fixture documents
- [ ] Performance: process 10-page document in <30 seconds

**Notes:**
This is the core AI capability. Quality of extraction directly impacts letter quality.

---

### PR-010: Demand Letter Generation (Python)
**Status:** New
**Dependencies:** PR-001, PR-002, PR-007, PR-008, PR-009
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
**Status:** New
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
**Status:** New
**Dependencies:** PR-001
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

**Overall Progress:** 0/28 PRs Complete (0%)

**Status Breakdown:**
- Complete: 0
- In Progress: 0
- Broken: 0
- Blocked-Ready: 0
- Suspended: 0
- Planning: 0
- New: 28

**Dependency Blocks:**
- Block 1 (Foundation): 3 PRs - **PHASED EXECUTION:**
  - Phase 1: PR-001 alone (60-90 min)
  - Phase 2: PR-002 + PR-003 in parallel (90-120 min)
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
PR-001 (Project Setup) - **MUST START FIRST**
After PR-001 completes: PR-002 and PR-003 can start in parallel

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

**Generated:** 2025-11-10
**Ready for parallel agent execution**
