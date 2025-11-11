# Lambda Function Configuration - AI Processor Service
# Defines the Python AI processor Lambda function

# Placeholder Lambda deployment package for AI processor
data "archive_file" "lambda_ai_placeholder" {
  type        = "zip"
  output_path = "${path.module}/.terraform/lambda-ai-placeholder.zip"

  source {
    content  = <<-EOT
      import json
      import os

      def handler(event, context):
          return {
              'statusCode': 200,
              'body': json.dumps({
                  'message': 'AI Processor Lambda placeholder - deploy actual code via CI/CD',
                  'environment': os.environ.get('ENVIRONMENT', 'unknown')
              })
          }
    EOT
    filename = "lambda_function.py"
  }
}

# AI Processor Lambda Function
resource "aws_lambda_function" "ai_processor" {
  function_name = "${local.name_prefix}-ai-processor"
  description   = "AI processor Lambda function for document analysis and letter generation"

  # Deployment package
  filename         = data.archive_file.lambda_ai_placeholder.output_path
  source_code_hash = data.archive_file.lambda_ai_placeholder.output_base64sha256

  # Runtime configuration
  runtime = var.lambda_runtime_python
  handler = "lambda_function.handler"
  role    = aws_iam_role.lambda_ai.arn

  # Performance configuration
  # AI processing requires more memory and longer timeout
  memory_size = var.lambda_ai_memory
  timeout     = var.lambda_ai_timeout

  # VPC configuration for RDS access
  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
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
      # Ignore changes to the code after initial creation (CI/CD will update)
      filename,
      source_code_hash,
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

# CloudWatch Alarms for AI Lambda
resource "aws_cloudwatch_metric_alarm" "ai_lambda_errors" {
  alarm_name          = "${local.name_prefix}-ai-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "AI Lambda function has too many errors"
  alarm_actions       = [] # Add SNS topic ARN for notifications

  dimensions = {
    FunctionName = aws_lambda_function.ai_processor.function_name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "ai_lambda_throttles" {
  alarm_name          = "${local.name_prefix}-ai-lambda-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "3"
  alarm_description   = "AI Lambda function is being throttled"
  alarm_actions       = [] # Add SNS topic ARN for notifications

  dimensions = {
    FunctionName = aws_lambda_function.ai_processor.function_name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "ai_lambda_duration" {
  alarm_name          = "${local.name_prefix}-ai-lambda-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Average"
  threshold           = "270000" # 270 seconds (out of 300 second timeout)
  alarm_description   = "AI Lambda function duration is too high"
  alarm_actions       = [] # Add SNS topic ARN for notifications

  dimensions = {
    FunctionName = aws_lambda_function.ai_processor.function_name
  }

  tags = local.common_tags
}

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
