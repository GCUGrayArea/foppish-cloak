# System Patterns

**Last Updated:** 2025-11-10 (Initial creation during planning phase)

This file documents architecture decisions, technical patterns, and design principles discovered and established during implementation.

---

## Architecture Overview

### Microservices Architecture

The Demand Letter Generator uses a true microservices architecture with clear separation of concerns:

**Services:**
1. **API Service (Node.js + TypeScript)**
   - RESTful API endpoints
   - User authentication and authorization
   - Firm and user management
   - Document metadata management
   - Template management
   - Workflow orchestration
   - Export functionality (Word/PDF generation)

2. **AI Processor Service (Python)**
   - AWS Bedrock (Claude) integration
   - Document analysis and extraction
   - Demand letter generation
   - Iterative refinement processing
   - Deployed as AWS Lambda functions

3. **Collaboration Service (Node.js + TypeScript)** [P1 Feature]
   - WebSocket server for real-time sync
   - Yjs CRDT document synchronization
   - User presence and awareness
   - Persistence to PostgreSQL

4. **Frontend (React + Vite)**
   - Single Page Application (SPA)
   - Modern build tooling with Vite
   - TypeScript for type safety
   - React Query for data fetching and caching
   - Context API for global state

### Service Communication

- **API ↔ AI Processor:** Asynchronous invocation via AWS Lambda (API Gateway)
- **Frontend ↔ API:** REST over HTTPS with JWT authentication
- **Frontend ↔ Collaboration:** WebSocket with JWT authentication
- **All Services ↔ Database:** Direct PostgreSQL connections with connection pooling

### Multi-Tenant Architecture

**Critical Pattern:** All data access must be scoped by `firm_id` to ensure tenant isolation.

**Implementation:**
- Middleware on API service extracts firm context from JWT token
- All database queries include `WHERE firm_id = ?` filter
- Foreign key constraints enforce data relationships within firms
- No cross-firm data access permitted

**Enforcement Points:**
1. Authentication middleware sets firm context
2. Database models include firm_id validation
3. Tests verify tenant isolation

---

## Design Patterns

### API Service Patterns

**Service Layer Pattern:**
- Controllers handle HTTP concerns (request/response)
- Services contain business logic
- Repository/Model layer handles data access
- Clear separation enables testing and reuse

**Example Structure:**
```
routes/demand-letters.ts → DemandLetterService → DemandLetterModel → PostgreSQL
```

**Middleware Pipeline:**
1. Request logging (correlation ID)
2. Authentication (JWT validation)
3. Firm context extraction
4. Authorization (role-based access control)
5. Request validation
6. Rate limiting
7. Route handler
8. Error handling
9. Response logging

### AI Processor Patterns

**Structured Outputs (per .claude/rules/llm-architecture.md):**
- Use Claude's tool calling for structured data extraction
- Pydantic schemas define expected output structure
- Validation ensures data quality before persistence

**Retry Logic:**
- Exponential backoff for rate limits (429 errors)
- Maximum 3 retry attempts
- Log all retry events for cost tracking

**Cost Tracking:**
- Log every Bedrock API call (request/response tokens)
- Track token usage per firm and user
- Enable cost analysis and optimization

### Frontend Patterns

**Data Fetching:**
- React Query for server state management
- Automatic caching and invalidation
- Optimistic updates for better UX
- Error boundaries for graceful failures

**State Management:**
- React Query for server state (API data)
- Context API for authentication state
- Local state (useState) for component-specific state
- Avoid Redux/Zustand unless complexity demands it

**Form Handling:**
- Controlled components with validation
- Client-side validation for UX
- Server-side validation as source of truth
- Clear error messaging

---

## Security Patterns

### Authentication Flow

1. User submits credentials to `/auth/login`
2. Server validates credentials (bcrypt password comparison)
3. Server issues JWT access token (1 hour expiry) and refresh token (30 day expiry)
4. Client stores tokens (access token in memory, refresh token in httpOnly cookie)
5. Client includes access token in Authorization header for API requests
6. On access token expiry, client uses refresh token to get new access token
7. On logout, server invalidates refresh token

### Authorization

**Role-Based Access Control (RBAC):**
- Roles: `admin`, `attorney`, `paralegal`
- Firm admins can manage users and templates
- Attorneys can create and manage demand letters
- Paralegals can assist with document preparation

**Implementation:**
- Permissions checked in middleware before route handlers
- Role stored in JWT token claims
- Authorization failures return 403 Forbidden

### Data Security

- All passwords hashed with bcrypt (cost factor 12)
- All file uploads scanned for viruses (ClamAV or AWS GuardDuty)
- All S3 document URLs signed with 1-hour expiration
- All secrets stored in AWS Secrets Manager (not in code)
- All .env files excluded from git (.gitignore enforces this)

---

## Database Patterns

### Schema Design

**Core Entities:**
- `firms` - Multi-tenant root
- `users` - Belongs to firm, has role
- `templates` - Belongs to firm, versioned
- `documents` - Belongs to firm and user, references S3
- `demand_letters` - Belongs to firm and user, tracks workflow state
- `letter_revisions` - History of letter changes

**Foreign Keys:**
- All entities (except `firms`) have `firm_id` foreign key
- Cascade deletes configured appropriately
- Indexes on foreign keys for query performance

**Versioning:**
- Templates use version numbers for history tracking
- Demand letters use separate `letter_revisions` table
- Enables rollback and audit trail

### Migration Strategy

- Use node-pg-migrate or similar tool
- Migrations numbered sequentially (001, 002, etc.)
- Never modify existing migrations (create new ones for changes)
- Run migrations automatically on deployment

---

## LLM Application Patterns

*Following principles from .claude/rules/llm-architecture.md*

### Structured Outputs for Deterministic Operations

**Use tool calling for:**
- Document fact extraction (parties, dates, damages)
- Template variable population
- Structured metadata generation

**Implementation:**
```python
# Define Pydantic schema for expected output
class ExtractedFacts(BaseModel):
    parties: List[Party]
    incident_date: Optional[date]
    damages: List[Damage]

# Use Claude with tool calling
response = bedrock.invoke(
    messages=[...],
    tools=[extract_facts_tool],
    tool_choice={"type": "tool", "name": "extract_facts"}
)
```

### Logging for LLM Debugging

**Log all LLM interactions:**
- Full prompt text (including system prompt)
- Model parameters (temperature, max_tokens)
- Response content
- Token usage (input/output)
- Latency
- Cost estimation

**Purpose:**
- Debug unexpected outputs
- Track cost per feature
- Optimize prompts based on real usage
- Compliance and audit trail

### Prompt Engineering

**Current approach:**
- Prompts stored in Python files (not database) for version control
- Clear instructions with examples
- Structured output format specified
- Legal domain context provided

**To be refined:**
- May add firm-specific prompt customization
- Template-specific generation instructions
- Iterative improvement based on user feedback

---

## Testing Patterns

### Test Pyramid

**Unit Tests (Fast, Many):**
- Service logic tested in isolation
- Mocked database and external APIs
- >90% coverage target for critical paths

**Integration Tests (Medium Speed, Moderate):**
- API endpoints tested with real database
- Mocked external services (Bedrock, S3)
- Full request/response cycle

**E2E Tests (Slow, Few):**
- Critical user journeys only
- Real backend services (dev environment)
- Playwright for browser automation

### Test Data Management

- Fixtures for common test scenarios
- Test database isolation (each test gets fresh DB)
- Seed data scripts for development
- Sample documents for AI testing

---

## Deployment Patterns

### AWS Lambda Deployment

**Node.js Services:**
- Build TypeScript to JavaScript
- Package with dependencies
- Deploy as Lambda function or container image

**Python Services:**
- Package dependencies as Lambda layer
- Deploy function code separately
- Use container image for complex dependencies

**Cold Start Optimization:**
- Keep handler functions lightweight
- Lazy-load heavy dependencies
- Consider provisioned concurrency for critical paths

### Environment Configuration

**Environments:**
- `dev` - Development environment, relaxed security
- `prod` - Production environment, full security

**Configuration:**
- Environment variables for all service config
- AWS Secrets Manager for sensitive values
- .env.example documents required variables
- Never commit .env files

---

## Collaboration Patterns (P1 Feature)

### Yjs CRDT for Conflict-Free Editing

**Why Yjs:**
- Proven CRDT library for collaborative editing
- Automatic conflict resolution
- Offline support with sync on reconnect
- Integrates with popular editors

**Implementation:**
- Each demand letter is a Yjs document
- WebSocket server syncs updates across clients
- PostgreSQL persistence for Yjs document state
- Room-based isolation (one room per letter)

**User Awareness:**
- Show active users on document
- Display user cursors and selections
- Indicate who's editing which section

---

## Notes for Future Implementation

**Patterns to establish during development:**
- Error handling conventions (what gets logged vs surfaced to user)
- API response format standardization
- File organization within services
- Component organization in React app
- CSS/styling conventions (not using Tailwind per preferences)

**Patterns to watch for:**
- Common validation logic across endpoints
- Shared utility functions
- Reusable React components
- Common database query patterns

These will be documented as implementation progresses.

---

## Anti-Patterns to Avoid

**Don't:**
- Query database without firm_id scope (breaks multi-tenancy)
- Store secrets in code or .env files committed to git
- Skip virus scanning on file uploads
- Use LLM for deterministic operations (use tool calling)
- Modify existing database migrations
- Use client-side validation as sole validation
- Implement authentication without rate limiting
- Deploy without running tests first
- Create circular dependencies between services

**Do:**
- Follow established patterns in this document
- Update this document when new patterns emerge
- Suggest rule changes when behavior patterns should be enforced
- Validate all inputs at API boundaries
- Log all errors with context
- Test multi-tenant isolation
- Monitor costs (especially Bedrock usage)
