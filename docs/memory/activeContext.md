# Active Context

**Last Updated:** 2025-11-10 (Initial creation during planning phase)

This file tracks the current work focus, recent changes, next steps, and active decisions.

---

## Current Project Phase

**Phase:** Initial Planning
**Status:** Planning documents generated, ready for implementation to begin

**Completed:**
- PRD already exists in spec.md
- Task list generated with 28 PRs across 11 dependency blocks
- Memory bank created (this file and others)
- .gitignore updated for Node.js, Python, React, AWS tech stack

**Ready to Start:**
- Any PR in Block 1 (PR-001, PR-002, PR-003) can be claimed immediately

---

## Active PRs

**Currently Active:** None

**Next Available Work:**
- **PR-001:** Project Setup and Repository Structure (Block 1)
- **PR-002:** PostgreSQL Database Schema and Migrations (Block 1)
- **PR-003:** AWS Infrastructure Setup (Terraform/CDK) (Block 1)

All three can be worked on in parallel by different agents.

---

## Recent Significant Changes

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

### After Block 1 (Block 2 - Authentication)

**PR-004: User Authentication Service**
- Depends on PR-001, PR-002
- JWT-based authentication
- Critical security component

**PR-005: Firm and User Management API**
- Depends on PR-001, PR-002, PR-004
- Multi-tenant user management
- Role-based access control

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
- Options: Raw SQL with pg, Prisma, Knex.js, or Drizzle
- Decision needed by: PR-002 (Database Schema)
- Consider: Type safety, migration support, performance

**Email Service:**
- Options: AWS SES, SendGrid, Resend, or similar
- Decision needed by: PR-005 (User Management - for invitations)
- Consider: Deliverability, cost, template support

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
- Options: Terraform (confirmed) or AWS CDK
- Decision needed by: PR-003 (AWS Infrastructure)
- Recommendation: Terraform (HCL, widely used, cloud-agnostic)

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
Block 1 → Block 2 → Block 3 → Block 4 → Block 5 → Block 7 → Block 9

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
- All of Block 1 can run in parallel (3 agents)
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
3. Choose a PR from Block 1 (PR-001, PR-002, or PR-003)
4. Claim agent identity using /work command
5. Transition PR to Planning phase
6. Verify file list and acceptance criteria
7. Begin implementation

**Context the next agent will need:**
- This is a brand new project, no code exists yet
- All Block 1 PRs can start immediately (no dependencies)
- Focus on establishing solid foundation (testing, linting, structure)
- Multi-tenant architecture is critical from day one

**Things to watch out for:**
- Don't forget to update memory bank after completing work
- Verify .env.example is created (never commit actual .env)
- Ensure all file paths use the monorepo structure (services/, frontend/)
- Test database connection before considering PR-002 complete
- Document any discoveries or challenges in memory bank
