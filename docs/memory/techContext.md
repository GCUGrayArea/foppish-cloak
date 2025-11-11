# Technical Context

**Last Updated:** 2025-11-10 (Initial creation during planning phase)

This file documents the actual technologies in use, development setup, technical constraints, and dependencies.

---

## Technology Stack

### Frontend
- **Framework:** React 18+
- **Build Tool:** Vite
- **Language:** TypeScript
- **Routing:** React Router v6
- **State Management:**
  - React Query (server state)
  - Context API (auth state)
  - useState/useReducer (component state)
- **UI Components:** TBD (Radix UI + shadcn/ui or similar - NOT Tailwind per project preferences)
- **Forms:** TBD (React Hook Form or similar)
- **Styling:** TBD (CSS Modules, styled-components, or vanilla CSS - NOT Tailwind)
- **Testing:**
  - Vitest (unit tests)
  - React Testing Library (component tests)
  - Playwright (E2E tests)

### Backend - API Service (Node.js)
- **Runtime:** Node.js 18+ LTS
- **Framework:** Express.js
- **Language:** TypeScript
- **Authentication:** JWT (jsonwebtoken library)
- **Password Hashing:** bcrypt
- **Database Client:** node-postgres (pg)
- **Validation:** Zod or Joi
- **File Upload:** multer
- **Document Generation:**
  - Word: docx library
  - PDF: puppeteer or similar
- **Testing:**
  - Jest or Vitest (unit tests)
  - Supertest (API integration tests)

### Backend - AI Processor Service (Python)
- **Runtime:** Python 3.11+
- **Framework:** None (Lambda function handlers)
- **AWS SDK:** boto3
- **LLM Client:** AWS Bedrock SDK
- **Data Validation:** Pydantic
- **Document Processing:** PyPDF2 or similar
- **Testing:** pytest

### Collaboration Service (Node.js) [P1 Feature]
- **Runtime:** Node.js 18+ LTS
- **WebSocket:** ws library or socket.io
- **CRDT:** Yjs (y-websocket for server)
- **Language:** TypeScript

### Database
- **Primary Database:** PostgreSQL 15+
- **ORM/Query Builder:** TBD (raw SQL, Prisma, or Knex.js)
- **Migrations:** node-pg-migrate or similar
- **Connection Pooling:** pg-pool

### Cloud Infrastructure (AWS)
- **Compute:**
  - AWS Lambda (serverless functions)
  - API Gateway (HTTP/WebSocket)
- **Storage:**
  - S3 (document storage)
  - RDS PostgreSQL (relational data)
- **AI:**
  - AWS Bedrock (Claude model access)
- **Security:**
  - AWS Secrets Manager (credentials)
  - AWS IAM (access control)
- **Monitoring:**
  - CloudWatch (logs and metrics)
  - AWS X-Ray (distributed tracing) [optional]
- **Infrastructure as Code:**
  - Terraform (preferred) or AWS CDK

### Development Tools
- **Version Control:** Git
- **CI/CD:** GitHub Actions
- **Package Managers:**
  - npm or pnpm (Node.js)
  - pip (Python)
- **Linting:**
  - ESLint (TypeScript/JavaScript)
  - Prettier (code formatting)
  - Pylint or Ruff (Python)
- **Type Checking:**
  - TypeScript compiler (tsc)
  - mypy (Python, optional)

### External Services
- **Email:** TBD (AWS SES, SendGrid, or similar for user invitations)
- **Error Tracking:** Sentry (frontend and backend)
- **Virus Scanning:** ClamAV or AWS GuardDuty
- **Rate Limiting:** Redis (for distributed rate limiting across Lambda instances)

---

## Development Setup

### Prerequisites

**Required:**
- Node.js 18+ LTS
- Python 3.11+
- PostgreSQL 15+ (local via Docker or native)
- AWS CLI configured with credentials
- Git

**Optional:**
- Docker and Docker Compose (for local PostgreSQL)
- Terraform CLI (for infrastructure management)

### Initial Setup (To be documented during PR-001)

```bash
# Clone repository
git clone <repo-url>
cd foppish-cloak

# Install Node.js dependencies (root and services)
npm install

# Set up Python virtual environment
cd services/ai-processor
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Set up local database
docker-compose up -d postgres

# Run migrations
npm run migrate

# Copy environment template
cp .env.example .env
# Edit .env with local values (NEVER commit .env)

# Start development servers
npm run dev  # Starts API, frontend, and other services
```

**Note:** Detailed setup will be documented in README.md during PR-001.

---

## Technical Constraints

### Performance Requirements
(From PRD Section 7: Non-Functional Requirements)

- **API Response Time:** <500ms for most endpoints (excluding AI processing)
- **Database Query Time:** <2 seconds
- **Document Analysis:** <30 seconds for 10-page document
- **Letter Generation:** <10 seconds for initial draft
- **Cold Start Time (Lambda):** <3 seconds

### Security Requirements
- All data encrypted in transit (HTTPS/TLS)
- All data encrypted at rest (S3, RDS)
- Compliance with legal industry standards (TBD: specific standards)
- Data privacy regulations (TBD: GDPR, CCPA compliance details)

### Scalability Requirements
- Support concurrent users without performance degradation
- Handle multiple firms (multi-tenant architecture)
- Lambda auto-scaling handles traffic spikes
- Database connection pooling prevents exhaustion

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge - latest 2 versions)
- Responsive design (desktop, tablet, mobile)
- Accessibility: WCAG AA compliance

---

## Dependencies

### Critical Dependencies

**Node.js (API Service):**
```json
{
  "express": "^4.x",
  "jsonwebtoken": "^9.x",
  "bcrypt": "^5.x",
  "pg": "^8.x",
  "zod": "^3.x",
  "multer": "^1.x",
  "docx": "^8.x"
}
```

**Python (AI Processor):**
```
boto3>=1.28.0
anthropic>=0.25.0  # If using Anthropic SDK instead of Bedrock SDK
pydantic>=2.0.0
PyPDF2>=3.0.0
```

**React (Frontend):**
```json
{
  "react": "^18.x",
  "react-router-dom": "^6.x",
  "@tanstack/react-query": "^5.x",
  "vite": "^5.x"
}
```

**Collaboration (P1):**
```json
{
  "yjs": "^13.x",
  "y-websocket": "^1.x",
  "ws": "^8.x"
}
```

### Development Dependencies

**All Services:**
- TypeScript, ESLint, Prettier
- Testing frameworks (Jest/Vitest, pytest)
- Type definitions (@types/*)

**Infrastructure:**
- Terraform or AWS CDK
- AWS CLI

---

## Integration Points

### External API Integrations

**AWS Bedrock (Claude):**
- Purpose: AI document analysis and letter generation
- Authentication: AWS IAM credentials
- Rate Limits: TBD (depends on AWS account tier)
- Cost: Pay per token (input + output)
- Error Handling: Retry with exponential backoff

**AWS S3:**
- Purpose: Document storage
- Authentication: AWS IAM credentials
- Security: Pre-signed URLs with 1-hour expiration
- Virus Scanning: Before allowing download

**AWS RDS (PostgreSQL):**
- Purpose: Structured data persistence
- Authentication: Username/password from AWS Secrets Manager
- Connection: SSL/TLS required
- Connection Pooling: Max 10 connections per Lambda instance

**Email Service (TBD):**
- Purpose: User invitations, password resets
- Options: AWS SES, SendGrid, or similar
- Templates: HTML email templates
- Deliverability: SPF/DKIM configuration required

### Internal Service Integrations

**API → AI Processor:**
- Protocol: AWS Lambda invocation via API Gateway
- Async: Long-running tasks processed asynchronously
- Notifications: WebSocket for progress updates
- Error Handling: Retry failed Lambda invocations

**Frontend → API:**
- Protocol: REST over HTTPS
- Authentication: JWT in Authorization header
- CORS: Configured for frontend domain
- Error Format: Standardized JSON error responses

**Frontend → Collaboration (P1):**
- Protocol: WebSocket (wss://)
- Authentication: JWT token in connection handshake
- Heartbeat: Keep-alive messages to maintain connection
- Reconnection: Automatic with exponential backoff

---

## Configuration Management

### Environment Variables

**API Service:**
```
NODE_ENV=development|production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=<from AWS Secrets Manager>
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=30d
AWS_REGION=us-east-1
S3_BUCKET_NAME=demand-letters-documents
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
SENTRY_DSN=<from Sentry>
REDIS_URL=redis://localhost:6379 (for rate limiting)
```

**AI Processor:**
```
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
DATABASE_URL=postgresql://user:pass@host:5432/db
LOG_LEVEL=INFO
```

**Frontend:**
```
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_BASE_URL=ws://localhost:3001 (for collaboration)
VITE_SENTRY_DSN=<from Sentry>
```

**Security:**
- Never commit .env files
- Use .env.example as template
- Store secrets in AWS Secrets Manager in production
- Rotate secrets regularly

---

## Known Technical Challenges

### To Be Discovered During Implementation

**Expected Challenges:**
1. **Lambda Cold Starts:** Python Lambda with large dependencies may have slow cold starts
   - Mitigation: Use Lambda layers, container images, or provisioned concurrency

2. **WebSocket on Lambda:** API Gateway WebSocket requires special handling
   - Solution: Use API Gateway WebSocket integration with connection management in DynamoDB

3. **Large File Processing:** 50MB files may timeout on Lambda
   - Mitigation: Use streaming uploads directly to S3, process asynchronously

4. **Concurrent Editing Conflicts:** Real-time collaboration requires careful state management
   - Solution: Yjs CRDT handles this automatically

5. **Bedrock Rate Limits:** High usage may hit API rate limits
   - Mitigation: Implement queue system, retry with backoff, request limit increases

6. **Multi-Tenant Data Isolation:** Ensuring no cross-firm data leaks
   - Mitigation: Comprehensive testing, middleware enforcement, database constraints

**This section will be updated as challenges are discovered and solved.**

---

## Development Workflow

### Branching Strategy
- `main` branch for production-ready code
- Feature branches for each PR (e.g., `feature/PR-001-project-setup`)
- PRs merged to main after testing and review

### Testing Strategy
- Unit tests run on every commit (CI)
- Integration tests run on every PR
- E2E tests run before deployment
- Manual QA for critical user flows

### Deployment Strategy
- CI/CD via GitHub Actions
- Automatic deployment to dev on main branch merge
- Manual approval for production deployment
- Blue/green deployment for zero-downtime updates (TBD)

---

## Monitoring and Observability

### Logging
- **CloudWatch Logs:** All Lambda function logs
- **Structured Logging:** JSON format for easy parsing
- **Correlation IDs:** Track requests across services
- **Log Levels:** DEBUG, INFO, WARN, ERROR

### Metrics
- **CloudWatch Metrics:**
  - API response times (P50, P95, P99)
  - Lambda invocation counts and durations
  - Database connection pool usage
  - Bedrock token usage and costs
  - Error rates by endpoint

### Alerts
- **CloudWatch Alarms:**
  - High error rates (>5% in 5 minutes)
  - Slow response times (P95 >2 seconds)
  - Lambda failures
  - Database connection exhaustion
  - Bedrock cost spikes

### Error Tracking
- **Sentry:** Frontend and backend error tracking
  - Captures stack traces, user context, breadcrumbs
  - Integration with source maps for readable traces
  - Alert on new errors or error spikes

---

## Cost Optimization

### Expected Cost Drivers
1. **AWS Bedrock (Claude):** Pay per token (largest cost driver)
2. **RDS PostgreSQL:** Instance size and storage
3. **Lambda:** Invocations and execution time
4. **S3:** Storage and data transfer
5. **Data Transfer:** Cross-region, outbound to internet

### Optimization Strategies
- Log all Bedrock token usage for analysis
- Optimize prompt length while maintaining quality
- Use S3 lifecycle policies to archive old documents
- Right-size RDS instance based on usage metrics
- Use Lambda provisioned concurrency only where needed
- Implement caching for frequently accessed data

### Budget Alerts
- Set up AWS Budgets with alerts at 50%, 80%, 100% of expected monthly cost
- Monitor Bedrock costs daily during initial rollout

---

## Future Technical Considerations

**Potential Enhancements:**
- GraphQL API for more efficient data fetching
- Server-Side Rendering (SSR) with Next.js for better SEO
- Advanced caching layer (CloudFront, Redis)
- Mobile app (React Native)
- Third-party integrations (document management systems)
- Advanced analytics and reporting

**These are out of scope for initial release but may be considered based on user feedback and business needs.**

---

## Notes for Implementation

**To be documented during development:**
- Actual package.json dependencies and versions
- Confirmed AWS service configurations
- Database schema evolution (migrations)
- Performance benchmarks (actual vs. requirements)
- Security audit findings and remediations
- Cost analysis (actual vs. projected)

This file will be updated as technical decisions are made and constraints are discovered.
