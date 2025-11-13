# Lambda Function Configuration - AI Processor Service
# Defines the Python AI processor Lambda function using container image

# AI Processor Lambda Function
resource "aws_lambda_function" "ai_processor" {
  function_name = "${local.name_prefix}-ai-processor"
  description   = "AI processor Lambda function for document analysis and letter generation"

  # Container image deployment
  package_type = "Image"
  image_uri    = "${aws_ecr_repository.ai_processor.repository_url}:latest"

  # Architecture
  architectures = ["arm64"]

  # Role
  role = aws_iam_role.lambda_ai.arn

  # Performance configuration
  # AI processing requires more memory and longer timeout
  memory_size = var.lambda_ai_memory
  timeout     = var.lambda_ai_timeout

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
      BEDROCK_REGION      = var.bedrock_region
      BEDROCK_MODEL_ID    = var.bedrock_model_id
      DATABASE_SECRET_ARN = aws_secretsmanager_secret.db_credentials.arn
      S3_BUCKET_DOCUMENTS = aws_s3_bucket.documents.id
      LOG_LEVEL           = var.environment == "prod" ? "INFO" : "DEBUG"
    }
  }

  # Tracing configuration (AWS X-Ray)
  tracing_config {
    mode = var.environment == "prod" ? "Active" : "PassThrough"
  }

  # Reserved concurrent executions (optional)
  # Uncomment to limit concurrent executions and control Bedrock costs
  # reserved_concurrent_executions = var.environment == "prod" ? 5 : 2

  # Ephemeral storage (optional, for processing large documents)
  ephemeral_storage {
    size = 1024 # MB (default is 512, max is 10240)
  }

  tags = merge(
    local.common_tags,
    {
      Name    = "${local.name_prefix}-ai-processor"
      Service = "AI"
    }
  )

  lifecycle {
    ignore_changes = [
      # Ignore changes to image after initial creation (CI/CD will update)
      image_uri,
      last_modified
    ]
  }
}

# CloudWatch Log Group for AI Lambda
resource "aws_cloudwatch_log_group" "ai_lambda" {
  name              = "/aws/lambda/${local.name_prefix}-ai-processor"
  retention_in_days = var.log_retention_days

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-ai-processor-logs"
    }
  )
}

# Lambda Alias for versioning
resource "aws_lambda_alias" "ai_live" {
  name             = "live"
  description      = "Live alias for AI Processor Lambda"
  function_name    = aws_lambda_function.ai_processor.function_name
  function_version = "$LATEST"

  lifecycle {
    ignore_changes = [
      function_version
    ]
  }
}

# Note: CloudWatch alarms for AI Lambda (errors, throttles, duration) are defined in alarms.tf
# to avoid duplication and ensure proper integration with SNS topics

# CloudWatch Metric Filter for Bedrock Token Usage (for cost tracking)
resource "aws_cloudwatch_log_metric_filter" "bedrock_tokens" {
  name           = "${local.name_prefix}-bedrock-token-usage"
  log_group_name = aws_cloudwatch_log_group.ai_lambda.name
  pattern        = "[timestamp, request_id, level, msg=\"Bedrock tokens used\", input_tokens, output_tokens]"

  metric_transformation {
    name      = "BedrockInputTokens"
    namespace = "${var.project_name}/${var.environment}"
    value     = "$input_tokens"
    unit      = "Count"
  }
}

# Alarm for high Bedrock token usage (cost control)
resource "aws_cloudwatch_metric_alarm" "bedrock_high_usage" {
  alarm_name          = "${local.name_prefix}-bedrock-high-token-usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "BedrockInputTokens"
  namespace           = "${var.project_name}/${var.environment}"
  period              = "3600" # 1 hour
  statistic           = "Sum"
  threshold           = "100000" # 100K tokens per hour
  alarm_description   = "Bedrock token usage is unusually high - check for issues"
  alarm_actions       = [] # Add SNS topic ARN for notifications
  treat_missing_data  = "notBreaching"

  tags = local.common_tags
}
