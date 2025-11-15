#!/bin/bash
# Import existing AWS resources into Terraform state

set -e

cd "$(dirname "$0")"

# CloudWatch Log Groups
echo "Importing CloudWatch Log Groups..."
terraform import -var-file="environments/dev.tfvars" aws_cloudwatch_log_group.websocket_lambda /aws/lambda/demand-letters-dev-websocket-handler
terraform import -var-file="environments/dev.tfvars" aws_cloudwatch_log_group.websocket_api /aws/apigateway/demand-letters-dev-websocket-dev
terraform import -var-file="environments/dev.tfvars" aws_cloudwatch_log_group.api_gateway /aws/apigateway/demand-letters-dev-api-dev
terraform import -var-file="environments/dev.tfvars" aws_cloudwatch_log_group.ai_lambda /aws/lambda/demand-letters-dev-ai-processor
terraform import -var-file="environments/dev.tfvars" aws_cloudwatch_log_group.api_lambda /aws/lambda/demand-letters-dev-api
terraform import -var-file="environments/dev.tfvars" aws_cloudwatch_log_group.websocket_collaboration /aws/lambda/demand-letters-dev-websocket-collaboration

# ECR Repository
echo "Importing ECR Repository..."
terraform import -var-file="environments/dev.tfvars" aws_ecr_repository.ai_processor demand-letters-dev-ai-processor

# S3 Buckets
echo "Importing S3 Buckets..."
terraform import -var-file="environments/dev.tfvars" aws_s3_bucket.documents demand-letters-dev-documents
terraform import -var-file="environments/dev.tfvars" aws_s3_bucket.lambda_deployments demand-letters-dev-lambda-deployments

# Secrets Manager
echo "Importing Secrets Manager secrets..."
terraform import -var-file="environments/dev.tfvars" aws_secretsmanager_secret.db_credentials demand-letters-dev/database/master
terraform import -var-file="environments/dev.tfvars" aws_secretsmanager_secret.jwt_secret demand-letters-dev/jwt/secret
terraform import -var-file="environments/dev.tfvars" aws_secretsmanager_secret.api_keys demand-letters-dev/api/keys

# RDS resources
echo "Importing RDS resources..."
terraform import -var-file="environments/dev.tfvars" aws_db_subnet_group.main demand-letters-dev-db-subnet-group

# KMS (need to get key ID first)
echo "Getting KMS key ID for alias..."
KMS_KEY_ID=$(aws kms describe-key --key-id alias/demand-letters-dev-rds --query 'KeyMetadata.KeyId' --output text 2>/dev/null || echo "")
if [ -n "$KMS_KEY_ID" ]; then
    echo "Importing KMS key: $KMS_KEY_ID"
    terraform import -var-file="environments/dev.tfvars" aws_kms_key.rds "$KMS_KEY_ID"
    terraform import -var-file="environments/dev.tfvars" aws_kms_alias.rds alias/demand-letters-dev-rds
fi

# Security Groups (need to get SG IDs)
echo "Getting security group IDs..."
LAMBDA_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=demand-letters-dev-lambda-sg" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "")
RDS_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=demand-letters-dev-rds-sg" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "")

if [ -n "$LAMBDA_SG_ID" ] && [ "$LAMBDA_SG_ID" != "None" ]; then
    echo "Importing Lambda security group: $LAMBDA_SG_ID"
    terraform import -var-file="environments/dev.tfvars" aws_security_group.lambda "$LAMBDA_SG_ID"
fi

if [ -n "$RDS_SG_ID" ] && [ "$RDS_SG_ID" != "None" ]; then
    echo "Importing RDS security group: $RDS_SG_ID"
    terraform import -var-file="environments/dev.tfvars" aws_security_group.rds "$RDS_SG_ID"
fi

# VPC Endpoint (need to get endpoint ID)
echo "Getting VPC endpoint ID..."
VPC_ENDPOINT_ID=$(aws ec2 describe-vpc-endpoints --filters "Name=service-name,Values=com.amazonaws.us-east-1.s3" "Name=vpc-id,Values=vpc-03cd6462b46350c8e" --query 'VpcEndpoints[0].VpcEndpointId' --output text 2>/dev/null || echo "")
if [ -n "$VPC_ENDPOINT_ID" ] && [ "$VPC_ENDPOINT_ID" != "None" ]; then
    echo "Importing VPC endpoint: $VPC_ENDPOINT_ID"
    terraform import -var-file="environments/dev.tfvars" aws_vpc_endpoint.s3 "$VPC_ENDPOINT_ID"
fi

# IAM Policies
echo "Importing IAM policies..."
terraform import -var-file="environments/dev.tfvars" aws_iam_policy.websocket_rds_access arn:aws:iam::971422717446:policy/demand-letters-dev-websocket-rds-access
terraform import -var-file="environments/dev.tfvars" aws_iam_policy.xray arn:aws:iam::971422717446:policy/demand-letters-dev-xray-policy

# X-Ray Sampling Rules
echo "Importing X-Ray sampling rules..."
terraform import -var-file="environments/dev.tfvars" aws_xray_sampling_rule.main demand-letters-dev-main
terraform import -var-file="environments/dev.tfvars" aws_xray_sampling_rule.errors demand-letters-dev-errors

# X-Ray Groups
echo "Importing X-Ray groups..."
terraform import -var-file="environments/dev.tfvars" aws_xray_group.api_service demand-letters-dev-api-service
terraform import -var-file="environments/dev.tfvars" aws_xray_group.ai_processor demand-letters-dev-ai-processor
terraform import -var-file="environments/dev.tfvars" aws_xray_group.errors demand-letters-dev-errors
terraform import -var-file="environments/dev.tfvars" aws_xray_group.slow_traces demand-letters-dev-slow-traces
terraform import -var-file="environments/dev.tfvars" aws_xray_group.bedrock_calls demand-letters-dev-bedrock-calls

echo "Import complete!"
