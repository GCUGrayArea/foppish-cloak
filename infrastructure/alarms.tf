# CloudWatch Alarms and SNS Topics for Alerting

# SNS Topic for Critical Alarms
resource "aws_sns_topic" "critical_alarms" {
  name              = "${local.name_prefix}-critical-alarms"
  display_name      = "Critical Alarms for ${var.project_name} ${var.environment}"
  kms_master_key_id = "alias/aws/sns" # Use default AWS managed key

  tags = merge(
    local.common_tags,
    {
      Name     = "${local.name_prefix}-critical-alarms-topic"
      Severity = "Critical"
    }
  )
}

# SNS Topic for Warning Alarms
resource "aws_sns_topic" "warning_alarms" {
  name              = "${local.name_prefix}-warning-alarms"
  display_name      = "Warning Alarms for ${var.project_name} ${var.environment}"
  kms_master_key_id = "alias/aws/sns"

  tags = merge(
    local.common_tags,
    {
      Name     = "${local.name_prefix}-warning-alarms-topic"
      Severity = "Warning"
    }
  )
}

# Email subscriptions (commented out - requires manual confirmation)
# Uncomment and set email addresses to enable email notifications
# resource "aws_sns_topic_subscription" "critical_alarms_email" {
#   topic_arn = aws_sns_topic.critical_alarms.arn
#   protocol  = "email"
#   endpoint  = var.alert_email_critical
# }
#
# resource "aws_sns_topic_subscription" "warning_alarms_email" {
#   topic_arn = aws_sns_topic.warning_alarms.arn
#   protocol  = "email"
#   endpoint  = var.alert_email_warnings
# }

# ============================================
# API Lambda Alarms
# ============================================

# High Error Rate Alarm
resource "aws_cloudwatch_metric_alarm" "api_lambda_high_errors" {
  alarm_name          = "${local.name_prefix}-api-lambda-high-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "API Lambda function has high error rate (>10 errors in 5 minutes)"
  alarm_actions       = [aws_sns_topic.critical_alarms.arn]
  ok_actions          = [aws_sns_topic.critical_alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.api.function_name
  }

  tags = local.common_tags
}

# Slow Response Time Alarm
resource "aws_cloudwatch_metric_alarm" "api_lambda_slow_duration" {
  alarm_name          = "${local.name_prefix}-api-lambda-slow-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Average"
  threshold           = 3000 # 3 seconds
  alarm_description   = "API Lambda average duration is too high (>3 seconds)"
  alarm_actions       = [aws_sns_topic.warning_alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.api.function_name
  }

  tags = local.common_tags
}

# Throttled Invocations Alarm
resource "aws_cloudwatch_metric_alarm" "api_lambda_throttles" {
  alarm_name          = "${local.name_prefix}-api-lambda-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "API Lambda function is being throttled"
  alarm_actions       = [aws_sns_topic.critical_alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.api.function_name
  }

  tags = local.common_tags
}

# ============================================
# AI Lambda Alarms
# ============================================

# High Error Rate Alarm
resource "aws_cloudwatch_metric_alarm" "ai_lambda_high_errors" {
  alarm_name          = "${local.name_prefix}-ai-lambda-high-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "AI Lambda function has high error rate (>5 errors in 5 minutes)"
  alarm_actions       = [aws_sns_topic.critical_alarms.arn]
  ok_actions          = [aws_sns_topic.critical_alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.ai_processor.function_name
  }

  tags = local.common_tags
}

# Very Slow Processing Alarm
resource "aws_cloudwatch_metric_alarm" "ai_lambda_very_slow" {
  alarm_name          = "${local.name_prefix}-ai-lambda-very-slow"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Average"
  threshold           = 30000 # 30 seconds
  alarm_description   = "AI Lambda average duration is too high (>30 seconds)"
  alarm_actions       = [aws_sns_topic.warning_alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.ai_processor.function_name
  }

  tags = local.common_tags
}

# ============================================
# RDS Database Alarms
# ============================================

# High CPU Utilization Alarm
resource "aws_cloudwatch_metric_alarm" "rds_high_cpu" {
  alarm_name          = "${local.name_prefix}-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU utilization is high (>80%)"
  alarm_actions       = [aws_sns_topic.warning_alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = local.common_tags
}

# High Database Connections Alarm
resource "aws_cloudwatch_metric_alarm" "rds_high_connections" {
  alarm_name          = "${local.name_prefix}-rds-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80 # Adjust based on instance size
  alarm_description   = "RDS has too many active connections (>80)"
  alarm_actions       = [aws_sns_topic.warning_alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = local.common_tags
}

# Low Free Storage Space Alarm
resource "aws_cloudwatch_metric_alarm" "rds_low_storage" {
  alarm_name          = "${local.name_prefix}-rds-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5368709120 # 5 GB in bytes
  alarm_description   = "RDS free storage space is low (<5GB)"
  alarm_actions       = [aws_sns_topic.critical_alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = local.common_tags
}

# ============================================
# API Gateway Alarms
# ============================================

# High 5xx Error Rate Alarm
resource "aws_cloudwatch_metric_alarm" "api_gateway_5xx_errors" {
  alarm_name          = "${local.name_prefix}-api-gateway-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "API Gateway has high 5xx error rate (>10 in 5 minutes)"
  alarm_actions       = [aws_sns_topic.critical_alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiName = "${local.name_prefix}-api"
  }

  tags = local.common_tags
}

# High 4xx Error Rate Alarm (potential client issues or attacks)
resource "aws_cloudwatch_metric_alarm" "api_gateway_4xx_errors" {
  alarm_name          = "${local.name_prefix}-api-gateway-4xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 100 # Higher threshold for expected client errors
  alarm_description   = "API Gateway has high 4xx error rate (>100 in 5 minutes)"
  alarm_actions       = [aws_sns_topic.warning_alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiName = "${local.name_prefix}-api"
  }

  tags = local.common_tags
}

# High Latency Alarm
resource "aws_cloudwatch_metric_alarm" "api_gateway_high_latency" {
  alarm_name          = "${local.name_prefix}-api-gateway-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Average"
  threshold           = 2000 # 2 seconds
  alarm_description   = "API Gateway average latency is high (>2 seconds)"
  alarm_actions       = [aws_sns_topic.warning_alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiName = "${local.name_prefix}-api"
  }

  tags = local.common_tags
}

# ============================================
# Application-Level Alarms (Custom Metrics)
# ============================================

# High Authentication Failure Rate
resource "aws_cloudwatch_metric_alarm" "high_auth_failures" {
  alarm_name          = "${local.name_prefix}-high-auth-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "AuthenticationFailures"
  namespace           = "${var.project_name}/${var.environment}"
  period              = 300
  statistic           = "Sum"
  threshold           = 20
  alarm_description   = "High number of authentication failures (>20 in 5 minutes) - potential brute force attack"
  alarm_actions       = [aws_sns_topic.critical_alarms.arn]
  treat_missing_data  = "notBreaching"

  tags = local.common_tags
}

# High Bedrock Cost Alarm
resource "aws_cloudwatch_metric_alarm" "high_bedrock_cost" {
  alarm_name          = "${local.name_prefix}-high-bedrock-cost"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BedrockCost"
  namespace           = "${var.project_name}/${var.environment}"
  period              = 3600 # 1 hour
  statistic           = "Sum"
  threshold           = 10 # $10 per hour
  alarm_description   = "Bedrock API cost is high (>$10/hour) - check for runaway processes"
  alarm_actions       = [aws_sns_topic.warning_alarms.arn]
  treat_missing_data  = "notBreaching"

  tags = local.common_tags
}

# Connection Pool Exhaustion Alarm
resource "aws_cloudwatch_metric_alarm" "connection_pool_exhaustion" {
  alarm_name          = "${local.name_prefix}-connection-pool-exhaustion"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ConnectionPoolExhaustion"
  namespace           = "${var.project_name}/${var.environment}"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Database connection pool is frequently exhausted (>5 occurrences in 5 minutes)"
  alarm_actions       = [aws_sns_topic.critical_alarms.arn]
  treat_missing_data  = "notBreaching"

  tags = local.common_tags
}

# High Server Error Rate
resource "aws_cloudwatch_metric_alarm" "high_server_errors" {
  alarm_name          = "${local.name_prefix}-high-server-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ServerErrors"
  namespace           = "${var.project_name}/${var.environment}"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "High number of server errors (>10 in 5 minutes)"
  alarm_actions       = [aws_sns_topic.critical_alarms.arn]
  treat_missing_data  = "notBreaching"

  tags = local.common_tags
}

# Slow Request Alarm
resource "aws_cloudwatch_metric_alarm" "slow_requests" {
  alarm_name          = "${local.name_prefix}-slow-requests"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "SlowRequests"
  namespace           = "${var.project_name}/${var.environment}"
  period              = 300
  statistic           = "Sum"
  threshold           = 20
  alarm_description   = "High number of slow requests (>20 requests >1s in 5 minutes)"
  alarm_actions       = [aws_sns_topic.warning_alarms.arn]
  treat_missing_data  = "notBreaching"

  tags = local.common_tags
}

# ============================================
# Composite Alarms
# ============================================

# Overall System Health Alarm
resource "aws_cloudwatch_composite_alarm" "overall_system_health" {
  alarm_name          = "${local.name_prefix}-overall-system-health"
  alarm_description   = "Composite alarm for overall system health - triggers if multiple critical alarms are active"
  actions_enabled     = true
  alarm_actions       = [aws_sns_topic.critical_alarms.arn]
  ok_actions          = [aws_sns_topic.critical_alarms.arn]

  alarm_rule = join(" OR ", [
    "ALARM(${aws_cloudwatch_metric_alarm.api_lambda_high_errors.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.ai_lambda_high_errors.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.rds_high_cpu.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.rds_low_storage.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.api_gateway_5xx_errors.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.connection_pool_exhaustion.alarm_name})"
  ])

  tags = local.common_tags
}

# API Performance Degradation Alarm
resource "aws_cloudwatch_composite_alarm" "api_performance_degradation" {
  alarm_name          = "${local.name_prefix}-api-performance-degradation"
  alarm_description   = "API performance is degraded - multiple performance alarms active"
  actions_enabled     = true
  alarm_actions       = [aws_sns_topic.warning_alarms.arn]

  alarm_rule = join(" OR ", [
    "ALARM(${aws_cloudwatch_metric_alarm.api_lambda_slow_duration.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.api_gateway_high_latency.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.slow_requests.alarm_name})"
  ])

  tags = local.common_tags
}

# Outputs
output "critical_alarms_topic_arn" {
  description = "ARN of the critical alarms SNS topic"
  value       = aws_sns_topic.critical_alarms.arn
}

output "warning_alarms_topic_arn" {
  description = "ARN of the warning alarms SNS topic"
  value       = aws_sns_topic.warning_alarms.arn
}
