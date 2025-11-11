# CloudWatch Configuration
# Additional CloudWatch resources beyond those defined in other files

# CloudWatch Dashboard for overall system monitoring
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${local.name_prefix}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", { stat = "Sum", label = "API Lambda Invocations" }],
            ["AWS/Lambda", "Invocations", { stat = "Sum", label = "AI Lambda Invocations" }]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Lambda Invocations"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/Lambda", "Errors", { stat = "Sum", label = "API Lambda Errors" }],
            ["AWS/Lambda", "Errors", { stat = "Sum", label = "AI Lambda Errors" }]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Lambda Errors"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/Lambda", "Duration", { stat = "Average", label = "API Lambda Duration" }],
            ["AWS/Lambda", "Duration", { stat = "Average", label = "AI Lambda Duration" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Lambda Duration (ms)"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", { stat = "Average" }],
            ["AWS/RDS", "DatabaseConnections", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "RDS Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApiGateway", "Count", { stat = "Sum", label = "API Requests" }],
            ["AWS/ApiGateway", "5XXError", { stat = "Sum", label = "5XX Errors" }],
            ["AWS/ApiGateway", "4XXError", { stat = "Sum", label = "4XX Errors" }]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "API Gateway Metrics"
        }
      }
    ]
  })
}

# SNS Topic for CloudWatch Alarms (optional)
# Uncomment to enable alarm notifications
# resource "aws_sns_topic" "alarms" {
#   name = "${local.name_prefix}-alarms"
#
#   tags = merge(
#     local.common_tags,
#     {
#       Name = "${local.name_prefix}-alarms-topic"
#     }
#   )
# }
#
# resource "aws_sns_topic_subscription" "alarms_email" {
#   topic_arn = aws_sns_topic.alarms.arn
#   protocol  = "email"
#   endpoint  = "ops@example.com" # Replace with actual email
# }

# CloudWatch Composite Alarm for system health
resource "aws_cloudwatch_composite_alarm" "system_health" {
  alarm_name          = "${local.name_prefix}-system-health"
  alarm_description   = "Composite alarm for overall system health"
  actions_enabled     = true
  alarm_actions       = [] # Add SNS topic ARN for notifications

  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.api_lambda_errors.alarm_name}) OR ALARM(${aws_cloudwatch_metric_alarm.ai_lambda_errors.alarm_name}) OR ALARM(${aws_cloudwatch_metric_alarm.rds_cpu.alarm_name})"

  tags = local.common_tags
}

# CloudWatch Log Metric Filter for application errors
# This is in addition to the Bedrock token tracking in lambda-ai.tf
resource "aws_cloudwatch_log_metric_filter" "api_errors" {
  name           = "${local.name_prefix}-api-errors"
  log_group_name = aws_cloudwatch_log_group.api_lambda.name
  pattern        = "[timestamp, request_id, level=ERROR*, ...]"

  metric_transformation {
    name      = "ApplicationErrors"
    namespace = "${var.project_name}/${var.environment}"
    value     = "1"
    unit      = "Count"
  }
}

# Alarm for application errors
resource "aws_cloudwatch_metric_alarm" "application_errors" {
  alarm_name          = "${local.name_prefix}-application-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ApplicationErrors"
  namespace           = "${var.project_name}/${var.environment}"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "Application has too many errors"
  alarm_actions       = [] # Add SNS topic ARN for notifications
  treat_missing_data  = "notBreaching"

  tags = local.common_tags
}
