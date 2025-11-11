# AWS Bedrock Configuration
# Permissions and configuration for AWS Bedrock (Claude model access)

# IMPORTANT NOTES:
# 1. AWS Bedrock requires account-level access request and approval
# 2. Not all regions support Bedrock - verify region availability
# 3. Model access must be requested separately in the Bedrock console
# 4. Bedrock pricing is pay-per-token (input + output)

# Data source to verify Bedrock model access (optional)
# This will fail if the model is not available in the account/region
# Uncomment after Bedrock access is granted:
# data "aws_bedrock_foundation_model" "claude" {
#   model_id = var.bedrock_model_id
# }

# IAM policy for Bedrock access is defined in iam.tf
# See aws_iam_policy.lambda_ai for the Bedrock permissions

# CloudWatch Log Group for Bedrock invocation logs (optional)
# Bedrock can log all API calls to CloudWatch
# Uncomment to enable Bedrock logging:
# resource "aws_cloudwatch_log_group" "bedrock" {
#   name              = "/aws/bedrock/${local.name_prefix}"
#   retention_in_days = var.log_retention_days
#
#   tags = merge(
#     local.common_tags,
#     {
#       Name = "${local.name_prefix}-bedrock-logs"
#     }
#   )
# }

# CloudWatch alarm for Bedrock throttling
# This alarm triggers if Bedrock API calls are being throttled
resource "aws_cloudwatch_metric_alarm" "bedrock_throttling" {
  alarm_name          = "${local.name_prefix}-bedrock-throttled"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ModelInvocationThrottles"
  namespace           = "AWS/Bedrock"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Bedrock API calls are being throttled - consider requesting limit increase"
  alarm_actions       = [] # Add SNS topic ARN for notifications
  treat_missing_data  = "notBreaching"

  dimensions = {
    ModelId = var.bedrock_model_id
  }

  tags = local.common_tags
}

# CloudWatch alarm for Bedrock client errors
resource "aws_cloudwatch_metric_alarm" "bedrock_client_errors" {
  alarm_name          = "${local.name_prefix}-bedrock-client-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ModelInvocationClientErrors"
  namespace           = "AWS/Bedrock"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "Bedrock API calls have too many client errors"
  alarm_actions       = [] # Add SNS topic ARN for notifications
  treat_missing_data  = "notBreaching"

  dimensions = {
    ModelId = var.bedrock_model_id
  }

  tags = local.common_tags
}

# Documentation comments for Bedrock setup:
#
# TO ENABLE BEDROCK ACCESS:
#
# 1. Open AWS Console → Amazon Bedrock → Model access
# 2. Request access to "Anthropic" models
# 3. Wait for approval (usually instant for most accounts)
# 4. Verify the specific model (claude-3-5-sonnet) is enabled
# 5. Check Bedrock service quotas and request increases if needed
#
# REGION AVAILABILITY:
# As of 2024, Bedrock is available in these regions:
# - us-east-1 (N. Virginia)
# - us-west-2 (Oregon)
# - ap-southeast-1 (Singapore)
# - eu-central-1 (Frankfurt)
# - eu-west-3 (Paris)
#
# Verify current availability: https://aws.amazon.com/bedrock/pricing/
#
# COST ESTIMATION:
# Claude 3.5 Sonnet pricing (approximate, verify current rates):
# - Input: $3 per 1M tokens
# - Output: $15 per 1M tokens
#
# Typical demand letter generation:
# - Document analysis: 5K input + 2K output = $0.045
# - Letter generation: 3K input + 4K output = $0.069
# - Total per letter: ~$0.11
#
# For 1000 letters/month: ~$110/month in Bedrock costs
