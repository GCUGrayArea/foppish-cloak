# Collaboration Service

Real-time collaboration service using Yjs CRDT for conflict-free concurrent editing of demand letters.

## Features

- **Yjs CRDT**: Conflict-free replicated data type for collaborative editing
- **WebSocket Communication**: Real-time synchronization via API Gateway WebSocket
- **PostgreSQL Persistence**: Document state persisted to database
- **User Awareness**: Track active users and their cursor positions
- **Multi-tenant**: Firm-scoped document isolation
- **JWT Authentication**: Secure WebSocket connections

## Architecture

### Components

- **Document Manager**: Manages Yjs document lifecycle with caching and auto-save
- **Persistence Adapter**: Saves/loads Yjs state to/from PostgreSQL
- **Awareness Manager**: Tracks user presence and cursor positions
- **Connection Manager**: Tracks WebSocket connections in DynamoDB
- **WebSocket Handlers**:
  - `$connect`: Authenticate and establish connection
  - `$disconnect`: Clean up and save document state
  - `$default`: Handle Yjs sync and awareness messages

### Data Flow

1. Client connects to WebSocket with JWT token and letterId
2. Server authenticates token and validates access
3. Server loads Yjs document from PostgreSQL (or creates new)
4. Client and server exchange Yjs sync messages
5. Server auto-saves document state every 30 seconds
6. Server saves on disconnect

## Environment Variables

```env
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-secret-key
CONNECTIONS_TABLE_NAME=websocket-connections
AWS_REGION=us-east-1
NODE_ENV=production
```

## Development

### Build

```bash
npm install
npm run build
```

### Test

```bash
npm test
```

### Local Development

For local development, you'll need:
- PostgreSQL database
- DynamoDB Local (or AWS account)
- WebSocket client for testing

## Deployment

The service is deployed as an AWS Lambda function:

```bash
# Build the service
npm run build

# Deploy with Terraform
cd ../../infrastructure
terraform apply
```

## WebSocket Protocol

### Connection

```
wss://api.example.com/ws?token=JWT_TOKEN&letterId=LETTER_ID
```

### Message Format

Messages are binary (Uint8Array) following the Yjs protocol:
- Sync Step 1: Client sends state vector
- Sync Step 2: Server sends missing updates
- Update: Document changes
- Awareness: User presence and cursor position

## Performance

- Documents cached in memory for 15 minutes after last activity
- Auto-save debounced to 30 seconds
- Connection data stored in DynamoDB with TTL

## Security

- JWT authentication on connection
- Firm-scoped document access
- Multi-tenant data isolation
- Secure WebSocket (wss://)

## Monitoring

CloudWatch logs capture:
- Connection/disconnection events
- Authentication failures
- Document load/save operations
- Error stack traces
