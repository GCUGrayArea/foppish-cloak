# AWS X-Ray Configuration for Distributed Tracing
# Provides end-to-end visibility across Lambda, API Gateway, and other AWS services

# X-Ray Sampling Rule - controls which requests are traced
resource "aws_xray_sampling_rule" "main" {
  rule_name      = "${var.project_name}-${var.environment}-main"
  priority       = 1000
  version        = 1
  reservoir_size = 1 # Always trace at least 1 request per second
  fixed_rate     = 0.1 # Trace 10% of requests after reservoir is exhausted
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"

  attributes = {
    Environment = var.environment
  }
}

# Higher sampling rate for error traces
resource "aws_xray_sampling_rule" "errors" {
  rule_name      = "${var.project_name}-${var.environment}-errors"
  priority       = 100 # Higher priority (lower number)
  version        = 1
  reservoir_size = 5
  fixed_rate     = 1.0 # Trace 100% of error requests
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"

  attributes = {
    Environment  = var.environment
    ResponseCode = "5*" # Match 5xx errors
  }
}

# X-Ray Group for API service traces
resource "aws_xray_group" "api_service" {
  group_name        = "${local.name_prefix}-api-service"
  filter_expression = "service(\"${local.name_prefix}-api\") AND annotation.environment = \"${var.environment}\""

  insights_configuration {
    insights_enabled      = true
    notifications_enabled = false
  }

  tags = merge(
    local.common_tags,
    {
      Name    = "${local.name_prefix}-api-service-group"
      Service = "api"
    }
  )
}

# X-Ray Group for AI processor traces
resource "aws_xray_group" "ai_processor" {
  group_name        = "${local.name_prefix}-ai-processor"
  filter_expression = "service(\"${local.name_prefix}-ai-processor\") AND annotation.environment = \"${var.environment}\""

  insights_configuration {
    insights_enabled      = true
    notifications_enabled = false
  }

  tags = merge(
    local.common_tags,
    {
      Name    = "${local.name_prefix}-ai-processor-group"
      Service = "ai-processor"
    }
  )
}

# X-Ray Group for error traces
resource "aws_xray_group" "errors" {
  group_name        = "${local.name_prefix}-errors"
  filter_expression = "error = true OR fault = true OR throttle = true"

  insights_configuration {
    insights_enabled      = true
    notifications_enabled = false
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-errors-group"
      Type = "Errors"
    }
  )
}

# X-Ray Group for slow traces (> 3 seconds)
resource "aws_xray_group" "slow_traces" {
  group_name        = "${local.name_prefix}-slow-traces"
  filter_expression = "duration > 3"

  insights_configuration {
    insights_enabled      = true
    notifications_enabled = false
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-slow-traces-group"
      Type = "Performance"
    }
  )
}

# X-Ray Group for Bedrock API calls
resource "aws_xray_group" "bedrock_calls" {
  group_name        = "${local.name_prefix}-bedrock-calls"
  filter_expression = "service(\"Bedrock\") OR annotation.service = \"bedrock\""

  insights_configuration {
    insights_enabled      = true
    notifications_enabled = false
  }

  tags = merge(
    local.common_tags,
    {
      Name    = "${local.name_prefix}-bedrock-calls-group"
      Service = "bedrock"
    }
  )
}

# Note: Lambda functions in lambda-api.tf and lambda-ai.tf should have:
# - tracing_config { mode = "Active" }
# - X-Ray SDK integrated in the application code
# - IAM permissions for xray:PutTraceSegments and xray:PutTelemetryRecords

# IAM Policy for X-Ray (if not already in lambda IAM roles)
data "aws_iam_policy_document" "xray_policy" {
  statement {
    effect = "Allow"
    actions = [
      "xray:PutTraceSegments",
      "xray:PutTelemetryRecords",
      "xray:GetSamplingRules",
      "xray:GetSamplingTargets",
      "xray:GetSamplingStatisticSummaries"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "xray" {
  name        = "${local.name_prefix}-xray-policy"
  description = "IAM policy for X-Ray tracing"
  policy      = data.aws_iam_policy_document.xray_policy.json

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-xray-policy"
    }
  )
}

# Attach X-Ray policy to Lambda execution roles
resource "aws_iam_role_policy_attachment" "api_lambda_xray" {
  role       = aws_iam_role.lambda_api.name
  policy_arn = aws_iam_policy.xray.arn
}

resource "aws_iam_role_policy_attachment" "ai_lambda_xray" {
  role       = aws_iam_role.lambda_ai.name
  policy_arn = aws_iam_policy.xray.arn
}

# Outputs
output "xray_api_service_group_arn" {
  description = "ARN of the API service X-Ray group"
  value       = aws_xray_group.api_service.arn
}

output "xray_ai_processor_group_arn" {
  description = "ARN of the AI processor X-Ray group"
  value       = aws_xray_group.ai_processor.arn
}

output "xray_console_url" {
  description = "URL to X-Ray console for this environment"
  value       = "https://${var.aws_region}.console.aws.amazon.com/xray/home?region=${var.aws_region}#/service-map"
}
