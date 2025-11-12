# AWS Deployment - Next Steps

**Status:** Pre-deployment - Bedrock verified, ready to deploy infrastructure
**Last Updated:** 2025-11-12

---

## Current State

✅ **Completed:**
- QC check on 16 Complete PRs (test failures documented, non-blocking)
- Bedrock access verified (Claude Sonnet 4.5 working)
- Terraform configurations updated with correct model IDs
- Deployment scripts ready (`scripts/*.sh`)
- GitHub Actions workflows configured

⏳ **Not Yet Done:**
- AWS infrastructure not deployed
- Database not created
- Lambda functions not deployed
- Frontend not deployed

---

## Step-by-Step Deployment Guide

### Phase 1: Deploy Infrastructure (15-25 minutes)

**Command:**
```bash
bash scripts/deploy-infrastructure.sh dev
```

**What this does:**
1. Runs `terraform init`
2. Validates configuration
3. Creates execution plan
4. **Waits for your approval** ← You review and press Enter
5. Creates all AWS resources:
   - VPC with public/private subnets in 2 AZs
   - RDS PostgreSQL (db.t3.micro, 20GB)
   - S3 buckets (documents, Lambda deployments)
   - Lambda placeholders (API, AI, Collaboration)
   - API Gateway (REST + WebSocket)
   - IAM roles and policies
   - Secrets Manager (DB password, JWT secret)
   - CloudWatch log groups and alarms

**Expected Output:**
```
Terraform will perform the following actions:
  # aws_vpc.main will be created
  # aws_db_instance.postgres will be created
  ... (many more resources)

Plan: 50+ to add, 0 to change, 0 to destroy.
```

**Checkpoint:**
After completion, capture outputs:
```bash
cd infrastructure
terraform output > ../terraform-outputs.txt
terraform output -json > ../terraform-outputs.json
cd ..
```

**Key outputs you'll need:**
- `api_gateway_rest_api_endpoint` - API base URL
- `rds_endpoint` - Database host
- `documents_bucket_name` - S3 bucket
- `lambda_api_function_name` - Lambda names
- `rds_secret_arn` - Database password location

---

### Phase 2: Setup Database (5 minutes)

**Get database password from Secrets Manager:**
```bash
cd infrastructure

# Get secret ARN
SECRET_ARN=$(terraform output -raw rds_secret_arn)

# Get password
DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id $SECRET_ARN \
  --query SecretString \
  --output text | jq -r .password)

# Construct DATABASE_URL
DB_HOST=$(terraform output -raw rds_endpoint | cut -d: -f1)
DB_NAME=$(terraform output -raw rds_database_name)
export DATABASE_URL="postgresql://dbadmin:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}"

# Save it for later
echo "DATABASE_URL=$DATABASE_URL" > ../.env.local
cd ..
```

**Run database migrations:**
```bash
bash scripts/run-migrations.sh dev
```

**Expected Output:**
```
Running migrations on dev environment...
Connecting to: postgresql://dbadmin:***@xxx.rds.amazonaws.com:5432/demand_letters_dev
Migration 001_initial_schema.sql - SUCCESS
Created tables: firms, users, templates, documents, demand_letters, etc.
```

**Verify database:**
```bash
psql $DATABASE_URL -c "\dt"
```

Should show 9 tables.

---

### Phase 3: Build Application Packages (10 minutes)

**Build all services:**
```bash
# API service (Node.js)
bash scripts/build-api.sh
# Output: deploy/api-lambda.zip (~5-10 MB)

# AI processor (Python)
bash scripts/build-ai.sh
# Output: deploy/ai-lambda.zip (~15-25 MB)

# Collaboration service (Node.js)
bash scripts/build-collaboration.sh
# Output: deploy/collaboration-lambda.zip (~3-5 MB)

# Frontend (React)
bash scripts/build-frontend.sh
# Output: frontend/dist/ (built static files)
```

**Expected Issues:**
- If AI Lambda > 50MB: Use container image deployment (already configured in `services/ai-processor/Dockerfile`)
- If build fails: Check dependencies installed (`npm install`, `pip install -r requirements.txt`)

---

### Phase 4: Deploy Lambda Functions (5 minutes)

**Get Lambda function names from Terraform:**
```bash
cd infrastructure
API_FUNCTION=$(terraform output -raw lambda_api_function_name)
AI_FUNCTION=$(terraform output -raw lambda_ai_function_name)
COLLAB_FUNCTION=$(terraform output -raw lambda_collaboration_function_name)
cd ..
```

**Deploy each Lambda:**
```bash
# API Lambda
bash scripts/deploy-lambda.sh api dev deploy/api-lambda.zip

# AI Lambda (may use container image if too large)
bash scripts/deploy-lambda.sh ai dev deploy/ai-lambda.zip

# Collaboration Lambda
bash scripts/deploy-lambda.sh collaboration dev deploy/collaboration-lambda.zip
```

**Configure Lambda environment variables:**
```bash
cd infrastructure
DOC_BUCKET=$(terraform output -raw documents_bucket_name)
JWT_SECRET_ARN=$(terraform output -raw jwt_secret_arn)

# API Lambda
aws lambda update-function-configuration \
  --function-name $API_FUNCTION \
  --environment "Variables={
    NODE_ENV=production,
    DATABASE_URL=$DATABASE_URL,
    AI_LAMBDA_NAME=$AI_FUNCTION,
    DOCUMENTS_BUCKET=$DOC_BUCKET,
    AWS_REGION=us-east-1
  }"

# AI Lambda
aws lambda update-function-configuration \
  --function-name $AI_FUNCTION \
  --environment "Variables={
    BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-5-20250929-v1:0,
    BEDROCK_REGION=us-east-1,
    AWS_REGION=us-east-1
  }"

# Collaboration Lambda
aws lambda update-function-configuration \
  --function-name $COLLAB_FUNCTION \
  --environment "Variables={
    DATABASE_URL=$DATABASE_URL,
    JWT_SECRET_ARN=$JWT_SECRET_ARN,
    NODE_ENV=production
  }"

cd ..
```

---

### Phase 5: Deploy Frontend (5 minutes)

**Deploy to S3:**
```bash
bash scripts/deploy-frontend.sh dev
```

**What this does:**
1. Uploads `frontend/dist/` to S3 bucket
2. Sets cache headers (index.html: no-cache, assets: 1 year)
3. Makes files publicly readable
4. (Optional) Invalidates CloudFront cache if CDN configured

**Get frontend URL:**
```bash
cd infrastructure
FRONTEND_BUCKET=$(terraform output -raw frontend_bucket_name)
echo "Frontend URL: http://${FRONTEND_BUCKET}.s3-website-us-east-1.amazonaws.com"
cd ..
```

---

### Phase 6: Smoke Tests (2 minutes)

**Set environment variables:**
```bash
cd infrastructure
export API_BASE_URL=$(terraform output -raw api_gateway_rest_api_endpoint)
export FRONTEND_URL="http://$(terraform output -raw frontend_bucket_name).s3-website-us-east-1.amazonaws.com"
cd ..
```

**Run automated smoke tests:**
```bash
bash scripts/smoke-test.sh dev
```

**Expected checks:**
- ✅ API health endpoint responding
- ✅ Database connection working
- ✅ Frontend accessible
- ✅ AI Lambda invokable

**Manual verification:**
```bash
# Test API
curl $API_BASE_URL/health
# Expected: {"status":"ok"}

# Test AI Lambda directly
aws lambda invoke \
  --function-name $AI_FUNCTION \
  --payload '{"action":"health"}' \
  /tmp/response.json

cat /tmp/response.json
# Expected: {"status":"healthy"}

# Test frontend
curl -I $FRONTEND_URL
# Expected: HTTP/1.1 200 OK
```

---

### Phase 7: Configure GitHub Actions (10 minutes)

**Create IAM user for CI/CD:**
```bash
# Create user
aws iam create-user --user-name github-actions-deploy-dev

# Attach policies
aws iam attach-user-policy \
  --user-name github-actions-deploy-dev \
  --policy-arn arn:aws:iam::aws:policy/AWSLambda_FullAccess

aws iam attach-user-policy \
  --user-name github-actions-deploy-dev \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-user-policy \
  --user-name github-actions-deploy-dev \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite

# Create access key
aws iam create-access-key --user-name github-actions-deploy-dev
# Save AccessKeyId and SecretAccessKey
```

**Configure GitHub Secrets:**

Go to: GitHub Repo → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:
```
AWS_ACCESS_KEY_ID_DEV = <from above>
AWS_SECRET_ACCESS_KEY_DEV = <from above>
DATABASE_URL_DEV = <your DATABASE_URL>
API_BASE_URL_DEV = <your API_BASE_URL>
FRONTEND_URL_DEV = <your FRONTEND_URL>
SLACK_WEBHOOK_URL = <optional, for notifications>
```

**Test GitHub Actions:**
```bash
# Push to main to trigger deploy-dev.yml
git add .
git commit -m "Test: Trigger automated deployment"
git push origin main

# Monitor at: https://github.com/<org>/<repo>/actions
```

---

## Post-Deployment Tasks

### 1. Cost Monitoring

**Set up billing alarm:**
```bash
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget '{
    "BudgetName": "demand-letters-dev-budget",
    "BudgetLimit": {"Amount": "50", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }'
```

### 2. CloudWatch Monitoring

**View logs:**
```bash
# API logs
aws logs tail /aws/lambda/demand-letters-dev-api --follow

# AI logs
aws logs tail /aws/lambda/demand-letters-dev-ai --follow
```

**Check dashboard:**
- AWS Console → CloudWatch → Dashboards → `demand-letters-dev-dashboard`

### 3. Create First User

**Via psql:**
```bash
psql $DATABASE_URL

-- Create firm
INSERT INTO firms (id, name, subscription_tier)
VALUES (gen_random_uuid(), 'Test Firm', 'trial')
RETURNING id;

-- Create user (password: test123 hashed with bcrypt)
INSERT INTO users (id, firm_id, email, password_hash, role, first_name, last_name)
VALUES (
  gen_random_uuid(),
  '<firm_id_from_above>',
  'test@example.com',
  '$2a$12$...',  -- bcrypt hash of 'test123'
  'admin',
  'Test',
  'User'
);
```

**Or via API:**
```bash
curl -X POST $API_BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "firstName": "Test",
    "lastName": "User",
    "firmName": "Test Firm"
  }'
```

### 4. Test Complete Workflow

1. **Login:** `POST /api/auth/login`
2. **Upload document:** `POST /api/documents/upload`
3. **Create template:** `POST /api/templates`
4. **Generate letter:** `POST /api/demand-letters`
5. **Export to Word:** `GET /api/demand-letters/:id/export/docx`

---

## Rollback Procedure

If something goes wrong:

**Rollback Lambda:**
```bash
bash scripts/rollback.sh dev
```

**Rollback Database (manual):**
```bash
# Database rollback requires manual SQL
psql $DATABASE_URL
-- Run reverse migration SQL
```

**Destroy Infrastructure (nuclear option):**
```bash
cd infrastructure
terraform destroy -var-file="environments/dev.tfvars"
cd ..
```

---

## Troubleshooting

### Lambda Timeout Errors
**Problem:** Lambda times out during request
**Solution:** Increase timeout in `infrastructure/variables.tf`:
```hcl
variable "lambda_ai_timeout" {
  default = 300  # Increase to 600 for large documents
}
```
Then re-run `terraform apply`.

### Database Connection Refused
**Problem:** Lambda can't connect to RDS
**Solution:** Check security group allows Lambda access:
```bash
cd infrastructure
terraform output rds_security_group_id
# Verify Lambda security group is allowed
```

### Bedrock Access Denied
**Problem:** AI Lambda gets AccessDeniedException
**Solution:** Verify IAM role has Bedrock permissions:
```bash
aws iam list-attached-role-policies \
  --role-name demand-letters-dev-lambda-ai-role
```

### Frontend 403 Errors
**Problem:** S3 bucket not publicly readable
**Solution:** Run deploy script again or manually update bucket policy:
```bash
bash scripts/deploy-frontend.sh dev
```

---

## Known Limitations

1. **No CloudFront CDN** - Frontend served directly from S3
   - Add CloudFront distribution for production
   - Improves performance and enables HTTPS

2. **No Custom Domain** - Using AWS default URLs
   - Configure Route53 hosted zone
   - Get ACM certificate
   - Add custom domain to API Gateway and CloudFront

3. **RDS in Private Subnet** - Can't access database directly
   - Good for security
   - Need bastion host or VPN for direct access
   - Use Lambda or EC2 in VPC to manage database

4. **AI Lambda Container Image** - If package > 50MB
   - Already configured in `Dockerfile` and `ecr.tf`
   - Deploy script handles automatically
   - May need to build and push to ECR manually first time

---

## Next Steps After Dev Deployment

### 1. Test Thoroughly in Dev
- Generate test demand letters
- Test document upload
- Test template management
- Test collaboration features
- Verify all workflows end-to-end

### 2. Fix Test Issues (Optional)
- PR-029: Test Quality Fixes (6 test files)
- PR-030: Coding Standards Refactoring (5 functions)
- These don't block functionality but improve quality

### 3. Deploy to Production
```bash
# Update prod environment variables
cp infrastructure/environments/dev.tfvars infrastructure/environments/prod.tfvars
# Edit prod.tfvars: change to db.t3.small, multi_az=true, etc.

# Deploy prod infrastructure
bash scripts/deploy-infrastructure.sh prod

# Configure GitHub Secrets for prod (AWS_*_PROD, etc.)

# Manual deploy via GitHub Actions workflow_dispatch
# Or use: bash scripts/deploy-lambda.sh api prod deploy/api-lambda.zip
```

### 4. Production Hardening
- [ ] Add CloudFront CDN
- [ ] Configure custom domain
- [ ] Enable WAF for security
- [ ] Set up CloudWatch alarms
- [ ] Configure RDS automated backups
- [ ] Enable X-Ray tracing
- [ ] Add rate limiting
- [ ] Set up VPN for database access
- [ ] Enable MFA for AWS account
- [ ] Review and tighten IAM policies

---

## Quick Reference

**Deployment Command:**
```bash
bash scripts/deploy-infrastructure.sh dev
```

**Check Status:**
```bash
cd infrastructure
terraform show
terraform output
cd ..
```

**View Logs:**
```bash
aws logs tail /aws/lambda/demand-letters-dev-api --follow
```

**Redeploy Lambda:**
```bash
bash scripts/build-api.sh
bash scripts/deploy-lambda.sh api dev deploy/api-lambda.zip
```

**Run Smoke Tests:**
```bash
bash scripts/smoke-test.sh dev
```

**Get Outputs:**
```bash
cd infrastructure
terraform output -json | jq
cd ..
```

---

## Cost Estimates

**Dev Environment (Low Usage):**
- RDS db.t3.micro: $15-20/month
- Lambda invocations: $0-5/month
- S3 storage: $1-3/month
- API Gateway: $0-5/month
- Bedrock (100 letters): $4-10/month
- Data transfer: $1-5/month
- **Total: ~$25-50/month**

**Production (Moderate Usage, 1000 letters/month):**
- RDS db.t3.small: $30-40/month
- Lambda: $10-20/month
- S3: $5-10/month
- API Gateway: $10-20/month
- Bedrock: $40-80/month
- Data transfer: $10-20/month
- CloudFront: $5-10/month
- **Total: ~$110-200/month**

---

## Support Resources

**Documentation:**
- `AWS-DEPLOYMENT-CHECKLIST.md` - Full deployment checklist
- `BEDROCK-TEST-RESULTS.md` - Bedrock verification results
- `docs/task-list.md` - All PRs and their status
- `/tmp/qc-report-2025-11-12.md` - QC findings

**Scripts:**
- `scripts/deploy-infrastructure.sh` - Deploy Terraform
- `scripts/build-*.sh` - Build packages
- `scripts/deploy-lambda.sh` - Deploy Lambda
- `scripts/deploy-frontend.sh` - Deploy frontend
- `scripts/run-migrations.sh` - Run DB migrations
- `scripts/smoke-test.sh` - Test deployment
- `scripts/rollback.sh` - Rollback deployment

**Terraform:**
- `infrastructure/*.tf` - Infrastructure as code
- `infrastructure/environments/*.tfvars` - Environment configs

**GitHub Actions:**
- `.github/workflows/ci.yml` - CI pipeline
- `.github/workflows/deploy-dev.yml` - Auto-deploy dev
- `.github/workflows/deploy-prod.yml` - Manual prod deploy

---

**Ready to Deploy:** Yes ✅
**Start Command:** `bash scripts/deploy-infrastructure.sh dev`
**Estimated Time:** 45-60 minutes total
**Cost:** ~$25-50/month for dev environment
