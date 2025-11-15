# AWS Deployment Checklist for Demand Letter Generator

**Date:** 2025-11-12
**Project:** Steno Demand Letter Generator
**Deployment Target:** Dev Environment (us-east-1)

---

## 📋 Pre-Deployment Review

### ✅ Infrastructure Code Review (PR-003)

**Status:** Code Complete ✅

**Terraform Files Present:**
- ✅ 21 Terraform files in `infrastructure/`
- ✅ Provider configuration (AWS v5.0, Terraform >= 1.5.0)
- ✅ Dev and Prod environment tfvars
- ✅ Backend configuration (commented out for initial deploy)
- ✅ All major resources defined:
  - VPC with public/private subnets
  - RDS PostgreSQL (db.t3.micro, 20GB)
  - S3 buckets (documents, Lambda deployments)
  - Lambda functions (API Node.js, AI Python, Collaboration)
  - API Gateway (REST + WebSocket)
  - IAM roles and policies
  - CloudWatch logs and alarms
  - AWS Bedrock permissions
  - Secrets Manager
  - X-Ray tracing

**Variables Configuration:**
- ✅ Default values defined for all variables
- ✅ Dev environment tfvars ready
- ✅ Bedrock model: `anthropic.claude-3-5-sonnet-20240620-v1:0`
- ✅ Lambda timeouts: API 30s, AI 300s
- ✅ Lambda memory: API 1GB, AI 2GB

### ✅ Deployment Scripts Review (PR-025)

**Status:** Code Complete ✅

**Scripts Available:**
- ✅ `scripts/deploy-infrastructure.sh` - Terraform apply automation
- ✅ `scripts/build-api.sh` - Package Node.js Lambda
- ✅ `scripts/build-ai.sh` - Package Python Lambda
- ✅ `scripts/build-collaboration.sh` - Package Collaboration Lambda
- ✅ `scripts/build-frontend.sh` - Build React app
- ✅ `scripts/deploy-lambda.sh` - Deploy Lambda with versioning
- ✅ `scripts/deploy-frontend.sh` - Deploy to S3 + CloudFront
- ✅ `scripts/run-migrations.sh` - Database migrations
- ✅ `scripts/smoke-test.sh` - Post-deployment verification
- ✅ `scripts/rollback.sh` - Rollback mechanism

**GitHub Actions Workflows:**
- ✅ `.github/workflows/ci.yml` - CI pipeline
- ✅ `.github/workflows/deploy-dev.yml` - Auto-deploy on main
- ✅ `.github/workflows/deploy-prod.yml` - Manual prod deploy
- ✅ `.github/workflows/rollback.yml` - Emergency rollback

---

## 🚀 Deployment Steps

### Phase 1: AWS Account Setup (One-Time)

**Prerequisites:**
- [ ] AWS Account with admin access
- [ ] AWS CLI v2 installed locally
- [ ] Terraform CLI >= 1.5.0 installed
- [ ] Valid AWS credentials configured

**Verification Commands:**
```bash
# Check AWS CLI
aws --version  # Should be >= 2.x

# Check Terraform
terraform version  # Should be >= 1.5.0

# Verify AWS credentials
aws sts get-caller-identity

# Verify region
aws configure get region
```

**AWS Bedrock Access:**
- [ ] Request Bedrock model access in AWS Console
- [ ] Navigate to: AWS Console → Bedrock → Model access
- [ ] Request access to: `Claude 3.5 Sonnet`
- [ ] Wait for approval (usually instant)
- [ ] Verify access:
```bash
aws bedrock list-foundation-models --region us-east-1 | grep claude-3-5-sonnet
```

---

### Phase 2: Backend Bootstrap (One-Time)

**Terraform State Backend:**

The backend is currently **commented out** in `infrastructure/backend.tf`.

**Option A: Local State (Quick Start)**
- ✅ Leave backend commented out
- ⚠️ State file will be local
- ⚠️ Not recommended for team collaboration

**Option B: S3 Backend (Recommended)**
```bash
# 1. Create S3 bucket
aws s3 mb s3://demand-letters-terraform-state --region us-east-1

# 2. Enable versioning
aws s3api put-bucket-versioning --bucket demand-letters-terraform-state --versioning-configuration Status=Enabled

# 3. Enable encryption
aws s3api put-bucket-encryption --bucket demand-letters-terraform-state --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# 4. Create DynamoDB table
aws dynamodb create-table --table-name terraform-state-lock --attribute-definitions AttributeName=LockID,AttributeType=S --key-schema AttributeName=LockID,KeyType=HASH --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 --region us-east-1

# 5. Uncomment backend in infrastructure/backend.tf
# 6. Run: terraform init -migrate-state
```

- [ ] Backend setup complete

---

### Phase 3: Infrastructure Deployment

**Deploy Infrastructure:**

```bash
# Run deployment script
bash scripts/deploy-infrastructure.sh dev
```

**Duration:** 15-25 minutes (RDS is slowest)

**Checkpoint:**
- [ ] Terraform apply completed
- [ ] No errors
- [ ] All resources created

**Capture Outputs:**
```bash
cd infrastructure
terraform output > ../terraform-outputs.txt
terraform output -json > ../terraform-outputs.json
```

**Key Outputs:**
- `api_gateway_rest_api_endpoint` - API base URL
- `api_gateway_websocket_endpoint` - WebSocket URL
- `rds_endpoint` - Database host
- `documents_bucket_name` - S3 bucket
- `lambda_api_function_name` - API Lambda
- `lambda_ai_function_name` - AI Lambda

- [ ] Outputs captured

---

### Phase 4: Database Setup

**Create DATABASE_URL:**

```bash
cd infrastructure

# Get database info
DB_HOST=$(terraform output -raw rds_endpoint | cut -d: -f1)
DB_NAME=$(terraform output -raw rds_database_name)

# Get password from Secrets Manager
SECRET_ARN=$(terraform output -raw rds_secret_arn)
DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id $SECRET_ARN --query SecretString --output text | jq -r .password)

# Construct connection string
export DATABASE_URL="postgresql://dbadmin:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}"
echo $DATABASE_URL
```

**Run Migrations:**
```bash
bash scripts/run-migrations.sh dev
```

**Verify:**
```bash
psql $DATABASE_URL -c "\dt"
# Should show: firms, users, templates, documents, demand_letters, etc.
```

- [ ] Migrations completed
- [ ] Tables created

---

### Phase 5: Application Deployment

**Build Packages:**

```bash
bash scripts/build-api.sh
bash scripts/build-ai.sh
bash scripts/build-collaboration.sh
bash scripts/build-frontend.sh
```

**Expected Output:**
- `deploy/api-lambda.zip` (~5-10 MB)
- `deploy/ai-lambda.zip` (~15-25 MB)
- `deploy/collaboration-lambda.zip` (~3-5 MB)
- `frontend/dist/` (built React app)

- [ ] All builds completed

**Deploy Lambdas:**

```bash
bash scripts/deploy-lambda.sh api dev deploy/api-lambda.zip
bash scripts/deploy-lambda.sh ai dev deploy/ai-lambda.zip
bash scripts/deploy-lambda.sh collaboration dev deploy/collaboration-lambda.zip
```

- [ ] Lambdas deployed

**Update Environment Variables:**

```bash
cd infrastructure
API_FUNCTION=$(terraform output -raw lambda_api_function_name)
AI_FUNCTION=$(terraform output -raw lambda_ai_function_name)
DOC_BUCKET=$(terraform output -raw documents_bucket_name)

# API Lambda env vars
aws lambda update-function-configuration --function-name $API_FUNCTION --environment "Variables={NODE_ENV=production,DATABASE_URL=$DATABASE_URL,AI_LAMBDA_NAME=$AI_FUNCTION,DOCUMENTS_BUCKET=$DOC_BUCKET,AWS_REGION=us-east-1}"

# AI Lambda env vars
aws lambda update-function-configuration --function-name $AI_FUNCTION --environment "Variables={BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0,BEDROCK_REGION=us-east-1,AWS_REGION=us-east-1}"
```

- [ ] Environment variables set

**Deploy Frontend:**

```bash
bash scripts/deploy-frontend.sh dev
```

- [ ] Frontend deployed

---

### Phase 6: Smoke Testing

**Run Tests:**

```bash
export API_BASE_URL=$(cd infrastructure && terraform output -raw api_gateway_rest_api_endpoint)
bash scripts/smoke-test.sh dev
```

**Manual Checks:**

```bash
# API health
curl $API_BASE_URL/health

# Database
psql $DATABASE_URL -c "SELECT 1;"

# AI Lambda
aws lambda invoke --function-name $AI_FUNCTION --payload '{"action":"health"}' /tmp/response.json && cat /tmp/response.json
```

- [ ] Smoke tests passed
- [ ] All services responding

---

### Phase 7: GitHub Actions Setup

**Configure Secrets:**

GitHub Repo → Settings → Secrets → Actions

```
AWS_ACCESS_KEY_ID_DEV = <IAM key>
AWS_SECRET_ACCESS_KEY_DEV = <IAM secret>
DATABASE_URL_DEV = <connection string>
API_BASE_URL_DEV = <API Gateway URL>
FRONTEND_URL_DEV = <S3/CloudFront URL>
SLACK_WEBHOOK_URL = <Slack> (optional)
```

**Create IAM User:**
```bash
aws iam create-user --user-name github-actions-deploy-dev
aws iam attach-user-policy --user-name github-actions-deploy-dev --policy-arn arn:aws:iam::aws:policy/AWSLambda_FullAccess
aws iam attach-user-policy --user-name github-actions-deploy-dev --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam create-access-key --user-name github-actions-deploy-dev
```

- [ ] GitHub Secrets configured
- [ ] Test deployment via GitHub Actions

---

## 📊 Post-Deployment

### Monitoring

**CloudWatch Logs:**
```bash
aws logs tail /aws/lambda/demand-letters-dev-api --follow
aws logs tail /aws/lambda/demand-letters-dev-ai --follow
```

- [ ] Logs flowing
- [ ] No errors

### Cost Management

**Expected Monthly Costs (Dev):**
- RDS: ~$15-20
- Lambda: ~$0-5
- S3: ~$1-3
- Bedrock: ~$3-15 (usage dependent)
- **Total: ~$25-50/month**

**Set Budget:**
```bash
aws budgets create-budget --account-id $(aws sts get-caller-identity --query Account --output text) --budget BudgetName=demand-letters-dev,BudgetLimit={Amount=50,Unit=USD},TimeUnit=MONTHLY,BudgetType=COST
```

- [ ] Cost alerts configured

---

## 🔒 Security Checklist

- [ ] Secrets in Secrets Manager (not hardcoded)
- [ ] RDS in private subnet (not public)
- [ ] Security groups properly configured
- [ ] S3 encryption enabled
- [ ] Minimal IAM permissions
- [ ] CloudWatch logs enabled

---

## ✅ Deployment Complete

**All Phases:**
- [ ] AWS setup complete
- [ ] Infrastructure deployed
- [ ] Database migrated
- [ ] Applications deployed
- [ ] Tests passed
- [ ] CI/CD configured
- [ ] Monitoring enabled

---

## 🚨 Known Issues

1. **AI Lambda Size:** May exceed 50MB - use container image if needed (already implemented)
2. **RDS Access:** In private subnet - need VPN or bastion for direct access
3. **No CloudFront:** Frontend on S3 only - add CloudFront for CDN if needed
4. **No Custom Domain:** Using default AWS URLs - configure Route53/ACM for custom domains

---

## 📞 Support

**If Deployment Fails:**
1. Check CloudWatch logs
2. Review Terraform output
3. Verify AWS credentials
4. Check Bedrock access approval

**Next Steps:**
1. Set up production environment
2. Configure custom domains
3. Add CloudFront CDN
4. Enable WAF
5. Configure backups

**Production:**
- Use `bash scripts/deploy-infrastructure.sh prod`
- Separate GitHub Secrets
- Manual approval required
- Test in dev first!

---

**Generated:** 2025-11-12 by QC Agent
