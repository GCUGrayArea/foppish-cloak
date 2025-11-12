#!/bin/bash
#
# Deploy AI Processor Lambda to AWS
# This script builds, pushes, and deploys the Lambda container image
#

set -e  # Exit on error

# Configuration
AWS_REGION="${AWS_REGION:-us-east-2}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPOSITORY="${ECR_REPOSITORY:-steno-ai-processor}"
LAMBDA_FUNCTION_NAME="${LAMBDA_FUNCTION_NAME:-steno-ai-processor}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "local")

# Derived values
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_NAME="${ECR_URI}/${ECR_REPOSITORY}"

echo "=========================================="
echo "AI Processor Lambda Deployment"
echo "=========================================="
echo "AWS Region: ${AWS_REGION}"
echo "AWS Account: ${AWS_ACCOUNT_ID}"
echo "ECR Repository: ${ECR_REPOSITORY}"
echo "Lambda Function: ${LAMBDA_FUNCTION_NAME}"
echo "Image Tag: ${IMAGE_TAG}"
echo "Commit Hash: ${COMMIT_HASH}"
echo "=========================================="

# Step 1: Login to ECR
echo ""
echo "[1/6] Logging into Amazon ECR..."
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${ECR_URI}

# Step 2: Build Docker image
echo ""
echo "[2/6] Building Docker image for arm64..."
cd "$(dirname "$0")"
docker build --platform linux/arm64 -t ${IMAGE_NAME}:${IMAGE_TAG} .

# Step 3: Tag image with commit hash
echo ""
echo "[3/6] Tagging image with commit hash..."
docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:${COMMIT_HASH}

# Step 4: Push images to ECR
echo ""
echo "[4/6] Pushing images to ECR..."
docker push ${IMAGE_NAME}:${IMAGE_TAG}
docker push ${IMAGE_NAME}:${COMMIT_HASH}

# Step 5: Update Lambda function
echo ""
echo "[5/6] Updating Lambda function code..."
aws lambda update-function-code \
  --region ${AWS_REGION} \
  --function-name ${LAMBDA_FUNCTION_NAME} \
  --image-uri ${IMAGE_NAME}:${IMAGE_TAG} \
  --output json

# Step 6: Wait for update to complete
echo ""
echo "[6/6] Waiting for Lambda update to complete..."
aws lambda wait function-updated \
  --region ${AWS_REGION} \
  --function-name ${LAMBDA_FUNCTION_NAME}

echo ""
echo "=========================================="
echo "Deployment completed successfully!"
echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "Function: ${LAMBDA_FUNCTION_NAME}"
echo "=========================================="
