# Demand Letter Generator

AI-powered legal document generation system for creating professional demand letters using AWS Bedrock (Claude).

## Project Overview

The Demand Letter Generator is a microservices-based application that helps law firms streamline the creation of demand letters through AI-powered document analysis and generation. The system analyzes source documents, extracts relevant information, and generates professional demand letters using Claude AI.

### Key Features

- **AI-Powered Document Analysis**: Automatically extract facts, parties, and damages from source documents
- **Template Management**: Create and manage firm-specific demand letter templates
- **Intelligent Generation**: Generate professional demand letters with Claude AI
- **Iterative Refinement**: Refine letters based on attorney feedback
- **Multi-Tenant Architecture**: Secure firm-level data isolation
- **Real-Time Collaboration** (P1): Concurrent editing with Yjs CRDT
- **Document Export**: Export to Word (.docx) and PDF formats

## Technology Stack

### Frontend
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Routing**: React Router v6
- **State Management**: React Query + Context API
- **Testing**: Vitest + React Testing Library + Playwright

### Backend - API Service (Node.js)
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Authentication**: JWT with bcrypt
- **Database Client**: node-postgres (pg)
- **Testing**: Jest + Supertest

### Backend - AI Processor (Python)
- **Runtime**: Python 3.11+
- **AI Provider**: AWS Bedrock (Claude)
- **Validation**: Pydantic
- **Testing**: pytest

### Infrastructure
- **Cloud**: AWS (Lambda, API Gateway, S3, RDS PostgreSQL)
- **IaC**: Terraform
- **CI/CD**: GitHub Actions
- **Monitoring**: CloudWatch, Sentry

## Repository Structure

```
foppish-cloak/
├── .github/
│   └── workflows/
│       └── ci.yml                 # CI/CD pipeline
├── docs/
│   ├── prd.md                     # Product requirements
│   ├── task-list.md               # Project task tracking
│   └── memory/                    # Agent memory bank
│       ├── systemPatterns.md      # Architecture decisions
│       ├── techContext.md         # Tech stack details
│       ├── activeContext.md       # Current work context
│       └── progress.md            # Implementation status
├── services/
│   ├── api/                       # Node.js API service
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── ai-processor/              # Python AI service
│   │   ├── src/
│   │   ├── requirements.txt
│   │   └── pyproject.toml
│   └── collaboration/             # WebSocket collaboration service (P1)
├── frontend/                      # React frontend
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── infrastructure/                # Terraform configuration
├── package.json                   # Root workspace config
├── tsconfig.json                  # Root TypeScript config
└── README.md
```

## Prerequisites

### Required
- **Node.js**: 18.0.0 or higher
- **Python**: 3.11 or higher
- **PostgreSQL**: 15 or higher (via Docker or native)
- **AWS CLI**: Configured with credentials
- **Git**: Latest version

### Optional
- **Docker & Docker Compose**: For local PostgreSQL
- **Terraform CLI**: For infrastructure management

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd foppish-cloak
```

### 2. Install Dependencies

#### Node.js Dependencies (Root + Services)
```bash
npm install
```

This will install dependencies for the root workspace and all Node.js services (API, frontend).

#### Python Dependencies (AI Processor)
```bash
cd services/ai-processor
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Set Up Local Database

#### Option A: Using Docker Compose (Recommended)
```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Database will be available at localhost:5432
```

#### Option B: Native PostgreSQL
Install PostgreSQL 15+ and create a database:
```bash
createdb demand_letters_dev
```

### 4. Configure Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your local configuration
# IMPORTANT: Never commit .env files to git!
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `AWS_REGION`: AWS region for Bedrock and services
- `BEDROCK_MODEL_ID`: Claude model identifier

See `.env.example` for complete list.

### 5. Run Database Migrations

```bash
# Run migrations (once PR-002 is complete)
npm run migrate
```

### 6. Start Development Servers

#### Start All Services
```bash
npm run dev
```

This starts:
- **API Service**: http://localhost:3000
- **Frontend**: http://localhost:5173

#### Start Individual Services
```bash
# API only
npm run api:dev

# Frontend only
npm run frontend:dev

# Collaboration service (P1 feature)
npm run collaboration:dev
```

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific workspace
npm test --workspace=services/api
npm test --workspace=frontend

# Python tests
cd services/ai-processor
pytest

# Run tests with coverage
npm run test:coverage
```

### Linting and Formatting

```bash
# Lint all code
npm run lint

# Fix linting issues
npm run lint:fix

# Format all code
npm run format

# Check formatting
npm run format:check
```

### Type Checking

```bash
# Type check all TypeScript
npm run typecheck

# Type check specific service
npm run typecheck --workspace=services/api
```

### Building for Production

```bash
# Build all services
npm run build

# Build specific service
npm run build --workspace=services/api
npm run build --workspace=frontend
```

## Project Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all services in development mode |
| `npm run build` | Build all services for production |
| `npm run test` | Run all tests |
| `npm run lint` | Lint all code |
| `npm run format` | Format all code with Prettier |
| `npm run typecheck` | Type check all TypeScript code |
| `npm run clean` | Clean build artifacts and node_modules |

## Architecture

### Multi-Tenant Design
All data is scoped by `firm_id` to ensure complete tenant isolation. Middleware enforces this at the API layer, and database foreign keys ensure referential integrity.

### Service Communication
- **API ↔ AI Processor**: Asynchronous via AWS Lambda invocation
- **Frontend ↔ API**: REST over HTTPS with JWT authentication
- **Frontend ↔ Collaboration**: WebSocket with JWT authentication (P1)

### Security
- JWT-based authentication with refresh tokens
- bcrypt password hashing (cost factor 12)
- All file uploads scanned for viruses
- S3 signed URLs with 1-hour expiration
- Multi-tenant data isolation enforced

## AWS Infrastructure

Infrastructure is managed with Terraform in the `infrastructure/` directory (PR-003).

Key AWS services:
- **Lambda**: Serverless compute for API and AI processing
- **API Gateway**: HTTP/WebSocket API endpoints
- **RDS PostgreSQL**: Relational data storage
- **S3**: Document storage
- **Bedrock**: Claude AI model access
- **CloudWatch**: Logging and monitoring
- **Secrets Manager**: Secure credential storage

## Contributing

### Code Standards
- **Function size**: Maximum 75 lines
- **File size**: Maximum 750 lines
- **Formatting**: Prettier with 100 character line width
- **Linting**: ESLint with TypeScript rules
- **Testing**: >80% code coverage for critical paths

### Commit Guidelines
- Use clear, descriptive commit messages
- Reference PR numbers in commits
- Run tests before committing
- Ensure CI passes before merging

## Documentation

- **[docs/prd.md](docs/prd.md)**: Product requirements and specifications
- **[docs/task-list.md](docs/task-list.md)**: Project tasks and progress
- **[docs/memory/](docs/memory/)**: Architecture decisions and context
- **[.claude/rules/](.claude/rules/)**: Development rules and patterns

## Support

For technical questions or issues:
1. Check documentation in `docs/`
2. Review memory bank in `docs/memory/`
3. Search existing issues
4. Contact the development team

## License

PROPRIETARY - All rights reserved
