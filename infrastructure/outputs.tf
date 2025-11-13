# Terraform Outputs
# Values exported for use by services and deployment scripts

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC (Default VPC)"
  value       = data.aws_vpc.default.id
}

output "private_subnet_ids" {
  description = "IDs of subnets (using Default VPC subnets)"
  value       = data.aws_subnets.default.ids
}

output "public_subnet_ids" {
  description = "IDs of public subnets (using Default VPC subnets)"
  value       = data.aws_subnets.default.ids
}

# RDS Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = true
}

output "rds_database_name" {
  description = "Name of the database"
  value       = aws_db_instance.postgres.db_name
}

output "rds_secret_arn" {
  description = "ARN of the secret containing RDS credentials"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

# S3 Outputs
output "documents_bucket_name" {
  description = "Name of the documents S3 bucket"
  value       = aws_s3_bucket.documents.id
}

output "documents_bucket_arn" {
  description = "ARN of the documents S3 bucket"
  value       = aws_s3_bucket.documents.arn
}

output "lambda_deployments_bucket_name" {
  description = "Name of the Lambda deployments S3 bucket"
  value       = aws_s3_bucket.lambda_deployments.id
}

# Lambda Outputs
output "lambda_api_function_name" {
  description = "Name of the API Lambda function"
  value       = aws_lambda_function.api.function_name
}

output "lambda_api_function_arn" {
  description = "ARN of the API Lambda function"
  value       = aws_lambda_function.api.arn
}

output "lambda_ai_function_name" {
  description = "Name of the AI Lambda function"
  value       = aws_lambda_function.ai_processor.function_name
}

output "lambda_ai_function_arn" {
  description = "ARN of the AI Lambda function"
  value       = aws_lambda_function.ai_processor.arn
}

# API Gateway Outputs
output "api_gateway_rest_api_id" {
  description = "ID of the REST API Gateway"
  value       = aws_api_gateway_rest_api.main.id
}

output "api_gateway_rest_api_endpoint" {
  description = "Endpoint URL of the REST API Gateway"
  value       = aws_api_gateway_deployment.main.invoke_url
}

output "api_gateway_websocket_api_id" {
  description = "ID of the WebSocket API Gateway"
  value       = aws_apigatewayv2_api.websocket.id
}

output "api_gateway_websocket_endpoint" {
  description = "Endpoint URL of the WebSocket API Gateway"
  value       = aws_apigatewayv2_stage.websocket.invoke_url
}

# Secrets Manager Outputs
output "jwt_secret_arn" {
  description = "ARN of the JWT secret"
  value       = aws_secretsmanager_secret.jwt_secret.arn
}

# CloudWatch Outputs
output "api_log_group_name" {
  description = "Name of the API Lambda log group"
  value       = aws_cloudwatch_log_group.api_lambda.name
}

output "ai_log_group_name" {
  description = "Name of the AI Lambda log group"
  value       = aws_cloudwatch_log_group.ai_lambda.name
}

# IAM Outputs
output "lambda_api_role_arn" {
  description = "ARN of the API Lambda execution role"
  value       = aws_iam_role.lambda_api.arn
}

output "lambda_ai_role_arn" {
  description = "ARN of the AI Lambda execution role"
  value       = aws_iam_role.lambda_ai.arn
}

# General Outputs
output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "aws_account_id" {
  description = "AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}
