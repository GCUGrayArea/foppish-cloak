# AWS Deployment Notes

**Date:** 2025-11-13
**Region:** us-east-1 (NOTE: Originally planned for us-east-2)

## Region Decision

**Deployed to us-east-1 instead of us-east-2**

### Why the Change
- Terraform was configured with `aws_region = "us-east-1"` in `infrastructure/environments/dev.tfvars`
- AWS CLI was configured for us-east-2 by default
- Discovered the mismatch mid-deployment after significant infrastructure was already created
- Decision: Continue in us-east-1 to avoid 30+ minutes of redeployment time

### Impact
- AWS CLI commands must specify `--region us-east-1` or set `export AWS_DEFAULT_REGION=us-east-1`
- Alternatively, update `~/.aws/config` to default to us-east-1
- Future deployments should align region configuration across all tools

### Resources Deployed to us-east-1
- ✅ ECR repository: demand-letters-dev-ai-proc-v2
- ✅ Security Groups (Lambda, RDS)  
- ✅ RDS PostgreSQL 17 database
- ✅ IAM roles and policies
- ✅ S3 buckets
- ✅ Secrets Manager secrets
- ✅ API Gateway (REST and WebSocket)
- ✅ DynamoDB tables
- ⏳ Lambda functions (deploying)

## Docker Image Notes

**AI Lambda Docker Image:**
- Built with `--provenance=false --sbom=false` flags
- Required to avoid "unsupported media type" error in Lambda
- Image: `971422717446.dkr.ecr.us-east-1.amazonaws.com/demand-letters-dev-ai-proc-v2:latest`
- Size: 315MB
- Platform: linux/arm64


## Deployment Complete ✅

**Completion Time:** 2025-11-13 17:45 UTC  
**Total Duration:** ~26 minutes (from identity claim to working API)

### Successfully Deployed Resources

**Compute:**
- ✅ Lambda Function: demand-letters-dev-api (Node.js, placeholder)
- ✅ Lambda Function: demand-letters-dev-ai-processor (Python, Docker/ECR)
- ✅ Lambda permissions for API Gateway

**Database:**
- ✅ RDS PostgreSQL 17 (db.t3.micro)
  - Instance ID: db-T4KXAGXHCILM25Q7XL3JFWI2LU
  - Encrypted with KMS
  - 7-day backup retention

**Networking:**
- ✅ Lambda Security Group (sg-0249f1db137593d3a)
- ✅ RDS Security Group (sg-09e500cc61ff887e4)
- ✅ VPC: Default VPC (vpc-03cd6462b46350c8e)
- ✅ 6 subnets across availability zones

**API Gateway:**
- ✅ REST API: 0t0mc3c8p6
- ✅ API Deployment & Stage: dev
- ✅ Endpoint: https://0t0mc3c8p6.execute-api.us-east-1.amazonaws.com/dev/
- ✅ WebSocket API: x3dmeqo1te (endpoint exists)

**Storage:**
- ✅ ECR: demand-letters-dev-ai-proc-v2 (with Docker image)
- ✅ S3: demand-letters-dev-documents
- ✅ S3: demand-letters-dev-lambda-deployments
- ✅ DynamoDB: websocket-connections

**Security:**
- ✅ Secrets Manager: database credentials, JWT secret, API keys
- ✅ KMS key for RDS encryption
- ✅ IAM roles: lambda-api-role, lambda-ai-role

### Test Results

**API Gateway Test:**
```bash
curl https://0t0mc3c8p6.execute-api.us-east-1.amazonaws.com/dev/
```
**Response:** `HTTP 200 OK` - Placeholder Lambda responding

### Known Issues

1. **API Lambda**: Currently placeholder code, needs actual API implementation deployed
2. **Database Migrations**: Not yet run (need to connect to RDS and run migrations)
3. **Region Mismatch**: Deployed to us-east-1 instead of intended us-east-2

### Next Steps

1. Deploy actual API Lambda code (replace placeholder)
2. Run database migrations to create schema
3. Deploy WebSocket Lambda code
4. Test end-to-end functionality
5. Update AWS CLI config to default to us-east-1 (or redeploy to us-east-2 in future)

### Critical Troubleshooting Note

**"Ghost Resources" were actually a region mismatch!**
- Resources appeared to not exist because AWS CLI was querying us-east-2
- Terraform was creating in us-east-1
- Always specify `--region us-east-1` when using AWS CLI for this project

