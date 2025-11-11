# Active Context

**Last Updated:** 2025-11-10 (Initial creation during planning phase)

This file tracks the current work focus, recent changes, next steps, and active decisions.

---

## Current Project Phase

**Phase:** Block 1 Complete, Block 2 Planning Complete
**Status:** PR-002 and PR-003 in progress, PR-004 and PR-005 planned and ready

**Completed:**
- PRD already exists in spec.md
- Task list generated with 28 PRs across 11 dependency blocks
- Memory bank created (this file and others)
- .gitignore updated for Node.js, Python, React, AWS tech stack
- **PR-001 (Project Setup) completed** (2025-11-11)
- **PR-002 (Database Schema) planned in detail** (2025-11-11)
- **PR-003 (AWS Infrastructure) planned in detail** (2025-11-11)
- **PR-004 (User Authentication) planned in detail** (2025-11-11)
- **PR-005 (Firm and User Management) planned in detail** (2025-11-11)

**Currently In Progress:**
- PR-002 (Database Schema) - Agent White
- PR-003 (AWS Infrastructure) - Agent Orange

**Ready to Start After Block 1:**
- PR-004 (User Authentication Service) - Blocked-Ready
- PR-005 (Firm and User Management API) - Blocked-Ready

---

## Active PRs

**Currently Active:** None

**Planning Complete:**
- **PR-002:** PostgreSQL Database Schema and Migrations (Status: Blocked-Ready)
- **PR-003:** AWS Infrastructure Setup (Status: Blocked-Ready)

**Next Available Work:**
- **PR-001:** Project Setup and Repository Structure (Block 1) - **MUST START FIRST**

**After PR-001 completes:**
- **PR-002:** PostgreSQL Database Schema and Migrations (Block 1) - Can run in parallel with PR-003
- **PR-003:** AWS Infrastructure Setup (Terraform/CDK) (Block 1) - Can run in parallel with PR-002

**IMPORTANT:** PR-002 depends on PR-001's directory structure. Block 1 uses phased execution for optimal parallelization.

---

## Recent Significant Changes

### 2025-11-11: PR-004 and PR-005 Planning Complete (Block 2)
- **Agent Blonde** completed detailed planning for both Block 2 PRs together
- **PR-004 (User Authentication Service) planning:**
  - Verified file list (16 files)
  - Designed complete JWT-based authentication system
  - Technology decisions: jsonwebtoken, bcrypt (cost 12), Zod validation
  - Authentication flows: registration, login, token refresh, logout, password reset
  - JWT structure with firmId for multi-tenancy
  - Role-based access control middleware
  - Time estimate: 350 minutes (5 hours 50 minutes)
  - Security patterns: rate limiting, token rotation, password strength requirements
  - Identified need for password_reset_tokens table (schema addition)
- **PR-005 (Firm and User Management API) planning:**
  - Verified file list (18 files)
  - Designed firm and user management endpoints
  - Technology decisions: nodemailer + AWS SES, Handlebars for email templates
  - Multi-tenant context middleware design
  - User invitation system with email flow
  - Firm ownership verification patterns
  - Time estimate: 470 minutes (7 hours 50 minutes)
  - Identified need for invitations table (schema addition)
  - Comprehensive multi-tenant security testing requirements
- **Status changed:** Both PRs from "New" → "Blocked-Ready"
- **Dependencies:** Both PRs depend on PR-001 and PR-002, PR-005 depends on PR-004
- **Key decisions documented:** Authentication architecture, JWT claims, multi-tenant middleware patterns, invitation flow

### 2025-11-11: PR-002 and PR-003 Planning Complete
- **Agent Orange** completed detailed planning for both PRs together
- **PR-002 (Database Schema) planning:**
  - Verified file list (23 files)
  - Designed complete schema: 9 tables with proper multi-tenant architecture
  - Technology decisions: node-pg-migrate, pg with pooling, SQLAlchemy for Python
  - Time estimate: 110 minutes
  - File conflict noted with PR-003 on .env.example (coordination required)
- **PR-003 (AWS Infrastructure) planning:**
  - Verified file list (22 files)
  - Designed complete Terraform configuration for all AWS resources
  - Technology decisions: Terraform, VPC with public/private subnets, RDS PostgreSQL, Lambda, API Gateway
  - Time estimate: 140 minutes
  - Documented extensive .env.example structure
- **Status changed:** Both PRs from "New" → "Blocked-Ready"
- **Coordination note:** Both PRs can run in parallel after PR-001, but need to coordinate on .env.example file
- **Key decisions documented:** Schema design, AWS architecture, security configuration

### 2025-11-10: Block 1 Dependency Analysis
- **Discovery:** PR-002 has hard dependency on PR-001's directory structure
- **Updated task list:** Changed Block 1 from "all parallel" to phased execution
  - Phase 1: PR-001 alone (establishes foundation)
  - Phase 2: PR-002 + PR-003 in parallel (after PR-001 merged)
- **Rationale:** PR-002 needs `services/api/src/` and `services/ai-processor/src/` directories that don't exist yet
- **Time savings:** Phased approach saves 90-120 minutes vs fully sequential

### 2025-11-10: Initial Planning Phase
- Created comprehensive task list (docs/task-list.md)
- Updated .gitignore for full tech stack
- Created memory bank files (systemPatterns.md, techContext.md, activeContext.md, progress.md)
- Clarified tech stack decisions with user:
  - Backend: Node.js + Python (true microservices)
  - AI: AWS Bedrock (Claude)
  - Frontend: Vite + React (not Next.js)
  - Collaboration: Yjs + WebSocket (P1 feature)

---

## Next Steps

### Immediate (Block 1 - Foundation)

**PR-001: Project Setup (High Priority)**
- Initialize monorepo structure (services/, frontend/)
- Configure TypeScript for Node services
- Set up Python project with pyproject.toml
- Configure linting and formatting (ESLint, Prettier, Ruff)
- Create basic CI/CD pipeline (GitHub Actions)
- Document development setup in README.md

**PR-002: Database Schema (High Priority)**
- Design PostgreSQL schema for multi-tenant architecture
- Create initial migration with all tables
- Set up TypeScript models (API service)
- Set up Python models (AI processor)
- Configure connection pooling
- Set up local PostgreSQL via Docker Compose

**PR-003: AWS Infrastructure (High Priority)**
- Write Terraform configuration for all AWS resources
- Define dev and prod environments
- Configure Lambda functions, API Gateway, S3, RDS
- Set up IAM roles and policies
- Create .env.example with all required variables
- Document deployment process

### After Block 1 (Block 2 - Authentication) - READY TO START

**PR-004: User Authentication Service (PLANNED)**
- Status: Blocked-Ready (waiting for PR-001 and PR-002)
- Depends on PR-001, PR-002
- JWT-based authentication
- Critical security component
- Time: 350 minutes (5 hours 50 minutes)
- Notes: Requires password_reset_tokens table addition

**PR-005: Firm and User Management API (PLANNED)**
- Status: Blocked-Ready (waiting for PR-001, PR-002, PR-004)
- Depends on PR-001, PR-002, PR-004
- Multi-tenant user management
- Role-based access control
- Time: 470 minutes (7 hours 50 minutes)
- Notes: Requires invitations table addition

---

## Active Decisions and Open Questions

### Technical Decisions Made
1. ✅ Use Node.js + Python (not just one language)
2. ✅ Use AWS Bedrock for Claude access (not direct Anthropic API)
3. ✅ Use Vite + React for frontend (not Next.js, not CRA)
4. ✅ Use Yjs + WebSocket for collaboration (defer to P1)
5. ✅ Avoid Tailwind CSS per user preferences

### Open Questions (To be resolved during implementation)

**UI Component Library:**
- Options: Radix UI + shadcn/ui, Material-UI, Chakra UI, or custom
- Decision needed by: PR-014 (React App Setup)
- Recommendation: Radix UI + shadcn/ui (headless, customizable, no Tailwind required)

**ORM/Query Builder:**
- ✅ **DECIDED:** Plain SQL with pg for Node.js, SQLAlchemy for Python
- Decided by: PR-002 planning (2025-11-11)
- Rationale: Flexibility, performance, TypeScript types via manual models

**Email Service:**
- ✅ **DECIDED:** nodemailer with AWS SES (SMTP for dev)
- Decided by: PR-005 planning (2025-11-11)
- Rationale: Native AWS integration, cost-effective, flexible transport configuration
- Template approach: Handlebars or plain HTML

**Form Library:**
- Options: React Hook Form, Formik, or custom
- Decision needed by: PR-015 (Authentication UI)
- Recommendation: React Hook Form (better performance, TypeScript support)

**Styling Solution:**
- Options: CSS Modules, styled-components, Emotion, or vanilla CSS
- Decision needed by: PR-014 (React App Setup)
- Constraint: NOT Tailwind CSS
- Recommendation: CSS Modules (scoped, minimal runtime, standard CSS)

**Document Processing (Python):**
- Options: PyPDF2, pdfplumber, PyMuPDF (fitz), or similar
- Decision needed by: PR-009 (Document Analysis)
- Consider: Text extraction quality, table support, performance

**Infrastructure as Code:**
- ✅ **DECIDED:** Terraform (not AWS CDK)
- Decided by: PR-003 planning (2025-11-11)
- Rationale: HCL simplicity, broader compatibility, mature tooling

**Migration Tool:**
- ✅ **DECIDED:** node-pg-migrate
- Decided by: PR-002 planning (2025-11-11)
- Rationale: TypeScript support, Node.js native, simple migration management

---

## Blockers and Challenges

**Current Blockers:** None

**Anticipated Challenges:**
1. **Lambda Cold Starts:** Python AI processor may have slow cold starts with heavy dependencies
   - Mitigation: Plan to use Lambda layers or container images
   - Monitor during PR-011 (AI Service Lambda Deployment)

2. **Real-time Collaboration Complexity:** Yjs integration is non-trivial
   - Mitigation: This is P1 (should-have), can be deferred if timeline is tight
   - Allocate extra time for PR-019, PR-020

3. **Multi-Tenant Data Isolation:** Critical to get right, easy to get wrong
   - Mitigation: Comprehensive testing in PR-021 (Integration Tests)
   - Middleware enforcement in PR-004, PR-005

4. **Bedrock API Availability:** Need AWS account with Bedrock access
   - Action: Verify Bedrock access before starting PR-008
   - May require AWS account setup, approval, or region selection

---

## Coordination Notes

### Agent Identity System
- Agents claim PRs using color-based identities (White, Orange, Pink, etc.)
- Identity claimed in .claude/agent-identity.lock file
- Identity released after PR completion or suspension
- See .claude/rules/agent-identity.md for details

### Commit Policy
**Auto-commit (no permission needed):**
- docs/prd.md
- docs/task-list.md
- .claude/agent-identity.lock
- docs/memory/*.md (all memory bank files)

**Require permission before committing:**
- All implementation code
- Configuration files
- .gitignore (ask first)
- Tests
- Documentation (other than planning docs)

See .claude/rules/commit-policy.md for complete policy.

### File Locking
- Each PR lists estimated files
- Agents verify file lists during Planning phase
- Concurrent PRs must not touch the same files
- If file conflict detected, wait for other PR to complete

---

## Work Prioritization

**Critical Path:**
PR-001 → (PR-002 or PR-003) → Block 2 → Block 3 → Block 4 → Block 5 → Block 7 → Block 9

**Block 1 Execution Strategy:**
- Start with PR-001 (single agent, 60-90 minutes)
- After PR-001 merges, run PR-002 and PR-003 in parallel (2 agents, 90-120 minutes)
- Total Block 1 time: 150-210 minutes (vs 240-330 if fully sequential)

**High Priority (P0 - Must-have):**
- All PRs in Blocks 1-7 (foundation through frontend features)
- PR-021, PR-022 (integration and E2E tests)
- PR-025 (deployment pipeline)

**Medium Priority (P1 - Should-have):**
- PR-019, PR-020 (real-time collaboration)
- PR-023, PR-024 (monitoring and security)
- PR-026, PR-027 (documentation)

**Lower Priority (Can defer if needed):**
- PR-028 (architecture documentation - but must be done last)

**Parallel Work Opportunities:**
- Block 1 Phase 2: PR-002 + PR-003 (2 agents after PR-001)
- Block 2: PR-004 + PR-005 (2 agents)
- Block 3: PR-006 + PR-007 (2 agents)
- PR-023, PR-024 (monitoring/security) can start early
- Test PRs can sometimes run alongside implementation

---

## Communication with User

**Questions to ask user when appropriate:**
- Which UI component library to use? (before PR-014)
- Which email service to use? (before PR-005)
- AWS account setup for Bedrock access (before PR-008)
- Should we prioritize P1 collaboration features or defer? (before starting Block 8)

**User preferences to remember:**
- NO Tailwind CSS
- Comprehensive testing expected
- Security-conscious (legal industry)
- Multi-tenant architecture critical

---

## Memory Bank Maintenance

**This file (activeContext.md) should be updated:**
- When PRs change status (New → Planning → In Progress → Complete)
- When blockers are discovered or resolved
- When technical decisions are made
- When priorities shift
- After each significant milestone

**When updating memory bank:**
- Update activeContext.md (current state)
- Update progress.md (what works)
- Update systemPatterns.md (new patterns discovered)
- Update techContext.md (new dependencies, constraints)

**Next expected update:**
- After first PR (PR-001, PR-002, or PR-003) transitions to Planning
- After technical decisions are made (ORM, UI library, etc.)
- After Block 1 completion (foundation in place)

---

## Success Criteria for Current Phase

**Planning Phase Complete When:**
- ✅ Task list generated and reviewed
- ✅ Memory bank created
- ✅ Tech stack decisions made
- ✅ .gitignore configured
- ⏳ User approval to commit planning documents
- ⏳ Planning documents committed to repo

**Ready to Start Implementation When:**
- ✅ All planning documents committed
- ✅ First agent claims a Block 1 PR
- ✅ Agent transitions PR from New → Planning

---

## Notes for Next Agent Session

**What the next agent should do:**
1. Read ALL memory bank files (this file, systemPatterns.md, techContext.md, progress.md)
2. Read docs/prd.md and docs/task-list.md
3. **Start with PR-001 (Project Setup) - REQUIRED FIRST**
4. Claim agent identity using /work command
5. Transition PR to Planning phase
6. Verify file list and acceptance criteria
7. Begin implementation

**Context the next agent will need:**
- This is a brand new project, no code exists yet
- **PR-001 MUST complete before PR-002 or PR-003** (directory structure dependency)
- Focus on establishing solid foundation (testing, linting, structure)
- Multi-tenant architecture is critical from day one
- After PR-001 merges, two agents can work on PR-002 and PR-003 in parallel

**Things to watch out for:**
- Don't forget to update memory bank after completing work
- Verify .env.example is created (never commit actual .env)
- Ensure all file paths use the monorepo structure (services/, frontend/)
- Test database connection before considering PR-002 complete
- Document any discoveries or challenges in memory bank
