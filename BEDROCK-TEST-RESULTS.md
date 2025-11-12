# AWS Bedrock Access Test Results

**Date:** 2025-11-12
**Project:** Steno Demand Letter Generator
**Status:** ✅ PASSED - Ready for Deployment

---

## Executive Summary

AWS Bedrock access has been **verified and confirmed working**. Your AWS account has automatic access to all Claude models, including the latest **Claude Sonnet 4.5**. All Terraform configurations have been updated with the correct model IDs.

**Key Finding:** AWS now requires **inference profile IDs** (with regional prefixes like `us.` or `global.`) instead of direct model IDs for on-demand access.

---

## Test Procedure

### 1. Initial Attempt

**Command:**
```bash
aws bedrock invoke-model --model-id anthropic.claude-3-5-sonnet-20241022-v2:0 --region us-east-1
```

**Result:** ❌ Failed - AWS CLI version too old (needs v2.13+)

### 2. Python Test Script Created

**File:** `test-bedrock.py`

**Purpose:** Verify Bedrock access using Python boto3 (same SDK the Lambda functions will use)

**Test Steps:**
1. Verify AWS credentials
2. List available Claude models
3. Invoke Claude with test prompt: "What is 2+2? Answer in one word."
4. Validate response

### 3. Discovery: Inference Profiles Required

**Initial Error:**
```
ValidationException: Invocation of model ID anthropic.claude-3-5-sonnet-20241022-v2:0
with on-demand throughput isn't supported. Retry your request with the ID or ARN of an
inference profile that contains this model.
```

**Solution Found:**
```python
# List inference profiles
aws bedrock list-inference-profiles --region us-east-1

# Result: Model IDs need regional prefix
# Old: anthropic.claude-sonnet-4-5-20250929-v1:0
# New: us.anthropic.claude-sonnet-4-5-20250929-v1:0
```

### 4. Successful Test

**Final Command:**
```bash
python test-bedrock.py
```

**Output:**
```
============================================================
AWS Bedrock Access Test
============================================================

Testing AWS Bedrock Access...

[OK] AWS Credentials Valid
   Account: 971422717446
   User/Role: tgrahammor@gmail.com

Listing available Claude models...
[OK] Found 24 Claude models:
   - anthropic.claude-sonnet-4-20250514-v1:0
   - anthropic.claude-haiku-4-5-20251001-v1:0
   - anthropic.claude-sonnet-4-5-20250929-v1:0
   - anthropic.claude-opus-4-1-20250805-v1:0
   - anthropic.claude-instant-v1:2:100k

Testing model invocation: us.anthropic.claude-sonnet-4-5-20250929-v1:0
   Sending test prompt: 'What is 2+2? Answer in one word.'

[SUCCESS] Bedrock is working!
   Claude responded: 'Four'

   Model: us.anthropic.claude-sonnet-4-5-20250929-v1:0
   Region: us-east-1
   Input tokens: 19
   Output tokens: 4

============================================================
[PASS] TEST PASSED - Ready to deploy!
```

---

## Available Models

Your AWS account has access to these Claude inference profiles in us-east-1:

### Claude 4.x Series (Latest - Recommended)

| Inference Profile ID | Model Version | Notes |
|---------------------|---------------|-------|
| `us.anthropic.claude-sonnet-4-5-20250929-v1:0` | Sonnet 4.5 | ⭐ **Currently Configured** - Best balance |
| `us.anthropic.claude-opus-4-1-20250805-v1:0` | Opus 4.1 | Most capable, slower |
| `us.anthropic.claude-haiku-4-5-20251001-v1:0` | Haiku 4.5 | Fastest, cheapest |
| `us.anthropic.claude-sonnet-4-20250514-v1:0` | Sonnet 4 | Older Sonnet 4 |

### Claude 3.x Series (Stable)

| Inference Profile ID | Model Version | Notes |
|---------------------|---------------|-------|
| `us.anthropic.claude-3-5-sonnet-20241022-v2:0` | 3.5 Sonnet v2 | Latest 3.x Sonnet |
| `us.anthropic.claude-3-5-sonnet-20240620-v1:0` | 3.5 Sonnet v1 | Previous version |
| `us.anthropic.claude-3-5-haiku-20241022-v1:0` | 3.5 Haiku | Fast, affordable |
| `us.anthropic.claude-3-opus-20240229-v1:0` | 3 Opus | Most capable 3.x |
| `us.anthropic.claude-3-haiku-20240307-v1:0` | 3 Haiku | Entry-level |

### Global Profiles (Cross-Region)

| Inference Profile ID | Model Version |
|---------------------|---------------|
| `global.anthropic.claude-sonnet-4-5-20250929-v1:0` | Sonnet 4.5 |
| `global.anthropic.claude-haiku-4-5-20251001-v1:0` | Haiku 4.5 |
| `global.anthropic.claude-sonnet-4-20250514-v1:0` | Sonnet 4 |

**Note:** `us.` profiles are region-specific (us-east-1), `global.` profiles route to available regions automatically.

---

## Configuration Updates Made

### 1. infrastructure/variables.tf

**Changed:**
```hcl
# OLD
variable "bedrock_model_id" {
  description = "AWS Bedrock model ID"
  type        = string
  default     = "anthropic.claude-3-5-sonnet-20240620-v1:0"
}

# NEW
variable "bedrock_model_id" {
  description = "AWS Bedrock model ID (inference profile)"
  type        = string
  default     = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"  # Claude Sonnet 4.5 (latest)
}
```

### 2. infrastructure/environments/dev.tfvars

**Changed:**
```hcl
# OLD
bedrock_model_id = "anthropic.claude-3-5-sonnet-20240620-v1:0"

# NEW
bedrock_model_id = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"  # Claude Sonnet 4.5
```

**Note:** This file is gitignored (contains environment-specific configs). Update manually for prod.

### 3. test-bedrock.py (Added)

**Purpose:** Pre-deployment Bedrock verification script

**Usage:**
```bash
# Install dependencies (if needed)
pip install boto3

# Run test
python test-bedrock.py
```

**What it tests:**
- AWS credentials validity
- Bedrock API access
- Model invocation
- Response parsing
- Token usage tracking

---

## Cost Analysis

### Test Cost
- Input tokens: 19
- Output tokens: 4
- **Total cost: ~$0.0001** (essentially free)

### Projected Costs (Claude Sonnet 4.5)

**Pricing (approximate):**
- Input: $3 per million tokens
- Output: $15 per million tokens

**Typical Demand Letter Generation:**
- Input: ~3,000 tokens (documents + template + instructions)
- Output: ~2,000 tokens (generated letter)
- **Cost per letter: ~$0.04** (4 cents)

**Monthly Estimates:**
- 100 letters/month: ~$4
- 500 letters/month: ~$20
- 1,000 letters/month: ~$40

**Dev Environment (Low Usage):**
- Testing + development: ~$2-5/month

---

## Verification Steps for Future Use

### Quick Test
```bash
python test-bedrock.py
```

### Manual AWS CLI Test (if CLI updated to v2.15+)
```bash
aws bedrock invoke-model \
  --model-id us.anthropic.claude-sonnet-4-5-20250929-v1:0 \
  --region us-east-1 \
  --body '{"anthropic_version":"bedrock-2023-05-31","messages":[{"role":"user","content":"Hello"}],"max_tokens":10}' \
  --cli-binary-format raw-in-base64-out \
  /tmp/test.json

cat /tmp/test.json | jq
```

### List Available Profiles
```bash
# Via Python
python -c "import boto3; c=boto3.client('bedrock',region_name='us-east-1'); print([p['inferenceProfileId'] for p in c.list_inference_profiles()['inferenceProfileSummaries']])"

# Via AWS CLI (v2.15+)
aws bedrock list-inference-profiles --region us-east-1 --query "inferenceProfileSummaries[].inferenceProfileId"
```

---

## Troubleshooting Guide

### Error: "No AWS credentials found"
**Solution:**
```bash
aws configure
# Enter: Access Key ID, Secret Access Key, us-east-1, json
```

### Error: "AccessDeniedException"
**Solution:** Add IAM policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "bedrock:InvokeModel",
    "Resource": "arn:aws:bedrock:*::foundation-model/*"
  }]
}
```

### Error: "ValidationException: ... not supported with on-demand throughput"
**Solution:** Use inference profile ID with regional prefix:
- ❌ `anthropic.claude-sonnet-4-5-20250929-v1:0`
- ✅ `us.anthropic.claude-sonnet-4-5-20250929-v1:0`

### Error: "ResourceNotFoundException"
**Solution:**
1. Check model ID spelling
2. Verify region has Bedrock (us-east-1, us-west-2, eu-west-1, etc.)
3. List available profiles to find correct ID

---

## Important Notes

1. **Automatic Access:** AWS Bedrock now provides automatic access to all serverless foundation models. No manual approval needed.

2. **Regional Availability:** Bedrock is available in limited regions. Your config uses us-east-1 which has full Claude model availability.

3. **Inference Profiles:** Always use inference profile IDs (with `us.` or `global.` prefix) for on-demand access.

4. **Model Updates:** AWS regularly adds new models. Use `list-inference-profiles` to see latest available models.

5. **Pricing Changes:** Bedrock pricing may change. Check AWS Bedrock pricing page for current rates.

6. **Production Considerations:**
   - Consider using Provisioned Throughput for high-volume production use
   - Set up CloudWatch alarms for cost monitoring
   - Implement request throttling to control costs
   - Log all Bedrock API calls for audit trail

---

## Git Commit Summary

**Committed Changes:**
```
commit 9f64a7c
Update Bedrock model to use inference profile (Claude Sonnet 4.5)

- AWS now requires inference profile IDs with region prefix
- Updated from claude-3-5-sonnet to claude-sonnet-4-5 (latest)
- Verified working with test-bedrock.py script
- Model ID: us.anthropic.claude-sonnet-4-5-20250929-v1:0
- Note: dev.tfvars updated locally (gitignored)

Files changed:
- test-bedrock.py (new)
- infrastructure/variables.tf (modified)
- infrastructure/environments/dev.tfvars (modified, not committed - gitignored)
```

---

## Next Steps

### Immediate: Ready to Deploy ✅

You have confirmed Bedrock access and updated all configurations. You can now proceed with AWS infrastructure deployment:

```bash
bash scripts/deploy-infrastructure.sh dev
```

### Optional: Model Selection

If you want to use a different model, update these files:

**For faster/cheaper processing (Haiku 4.5):**
```hcl
bedrock_model_id = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
```

**For maximum capability (Opus 4.1):**
```hcl
bedrock_model_id = "us.anthropic.claude-opus-4-1-20250805-v1:0"
```

**Current (recommended balance - Sonnet 4.5):**
```hcl
bedrock_model_id = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"
```

### Future Testing

Before any major deployment or after AWS account changes:
```bash
python test-bedrock.py
```

Expected output: `[PASS] TEST PASSED - Ready to deploy!`

---

## References

- **Test Script:** `test-bedrock.py`
- **Deployment Checklist:** `AWS-DEPLOYMENT-CHECKLIST.md`
- **QC Report:** `/tmp/qc-report-2025-11-12.md`
- **Task List:** `docs/task-list.md`
- **Terraform Config:** `infrastructure/`

**AWS Documentation:**
- https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html
- https://aws.amazon.com/bedrock/pricing/

---

**Test Completed:** 2025-11-12
**Test Status:** ✅ PASSED
**Deployment Status:** Ready to proceed
