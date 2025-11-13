# Lambda Function Configuration - API Service
# Defines the Node.js API Lambda function

# Placeholder Lambda deployment package
# Note: This creates a minimal placeholder. Real deployment will come from CI/CD
data "archive_file" "lambda_api_placeholder" {
  type        = "zip"
  output_path = "${path.module}/.terraform/lambda-api-placeholder.zip"

  source {
    content  = <<-EOT
      exports.handler = async (event) => {
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: 'API Lambda placeholder - deploy actual code via CI/CD',
            environment: process.env.ENVIRONMENT
          })
        };
      };
    EOT
    filename = "index.js"
  }
}

# API Lambda Function
resource "aws_lambda_function" "api" {
  function_name = "${local.name_prefix}-api"
  description   = "API service Lambda function for demand letter generator"

  # Deployment package
  filename         = data.archive_file.lambda_api_placeholder.output_path
  source_code_hash = data.archive_file.lambda_api_placeholder.output_base64sha256

  # Runtime configuration
  runtime = var.lambda_runtime_nodejs
  handler = "index.handler"
  role    = aws_iam_role.lambda_api.arn

  # Performance configuration
  memory_size = var.lambda_api_memory
  timeout     = var.lambda_api_timeout

  # VPC configuration for RDS access
  vpc_config {
    subnet_ids         = data.aws_subnets.default.ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  # Environment variables
  environment {
    variables = {
      ENVIRONMENT         = var.environment
      AWS_REGION_CUSTOM   = var.aws_region
      DATABASE_SECRET_ARN = aws_secretsmanager_secret.db_credentials.arn
      JWT_SECRET_ARN      = aws_secretsmanager_secret.jwt_secret.arn
      S3_BUCKET_DOCUMENTS = aws_s3_bucket.documents.id
      AI_LAMBDA_ARN       = aws_lambda_function.ai_processor.arn
      NODE_ENV            = var.environment == "prod" ? "production" : "development"
      LOG_LEVEL           = var.environment == "prod" ? "info" : "debug"
    }
  }

  # Tracing configuration (AWS X-Ray)
  tracing_config {
    mode = var.environment == "prod" ? "Active" : "PassThrough"
  }

  # Reserved concurrent executions (optional, uncomment for prod)
  # reserved_concurrent_executions = var.environment == "prod" ? 10 : -1

  tags = merge(
    local.common_tags,
    {
      Name    = "${local.name_prefix}-api"
      Service = "API"
    }
  )

  lifecycle {
    ignore_changes = [
      # Ignore changes to the code after initial creation (CI/CD will update)
      filename,
      source_code_hash,
      last_modified
    ]
  }
}

# Lambda Function URL (alternative to API Gateway for simple cases)
# Uncomment if you want to use Lambda Function URLs instead of API Gateway
# resource "aws_lambda_function_url" "api" {
#   function_name      = aws_lambda_function.api.function_name
#   authorization_type = "NONE"
#
#   cors {
#     allow_credentials = true
#     allow_origins     = ["*"] # TODO: Replace with actual frontend domain
#     allow_methods     = ["*"]
#     allow_headers     = ["*"]
#     max_age           = 86400
#   }
# }

# CloudWatch Log Group for API Lambda
resource "aws_cloudwatch_log_group" "api_lambda" {
  name              = "/aws/lambda/${local.name_prefix}-api"
  retention_in_days = var.log_retention_days

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-api-logs"
    }
  )
}

# Lambda Alias for versioning (optional, useful for blue/green deployments)
resource "aws_lambda_alias" "api_live" {
  name             = "live"
  description      = "Live alias for API Lambda"
  function_name    = aws_lambda_function.api.function_name
  function_version = "$LATEST"

  lifecycle {
    ignore_changes = [
      # Ignore version changes (will be managed by deployment pipeline)
      function_version
    ]
  }
}

# Lambda permission for API Gateway to invoke
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*"
}

# Note: CloudWatch alarms for API Lambda are defined in alarms.tf
# to avoid duplication and ensure proper integration with SNS topics
