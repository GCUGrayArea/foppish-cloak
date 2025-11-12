# Comprehensive Monitoring Infrastructure
# CloudWatch Dashboards, Log Groups, and Metric Filters

# Enhanced CloudWatch Dashboard for detailed system monitoring
resource "aws_cloudwatch_dashboard" "detailed_monitoring" {
  dashboard_name = "${local.name_prefix}-detailed-monitoring"

  dashboard_body = jsonencode({
    widgets = [
      # API Performance Section
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "API Response Times (P50, P95, P99)"
          region = var.aws_region
          metrics = [
            ["${var.project_name}/${var.environment}", "ApiLatency", { stat = "p50", label = "P50" }],
            ["...", { stat = "p95", label = "P95" }],
            ["...", { stat = "p99", label = "P99" }]
          ]
          period = 300
          yAxis = {
            left = {
              label = "Milliseconds"
            }
          }
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "API Request Count by Endpoint"
          region = var.aws_region
          metrics = [
            ["${var.project_name}/${var.environment}", "ApiRequestCount", "Endpoint", "/api/documents"],
            ["...", "/api/letters"],
            ["...", "/api/templates"],
            ["...", "/api/users"]
          ]
          period = 300
          stat   = "Sum"
        }
      },

      # Error Tracking Section
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "Error Rates by Type"
          region = var.aws_region
          metrics = [
            ["${var.project_name}/${var.environment}", "ErrorCount", "ErrorType", "VALIDATION_ERROR"],
            ["...", "AUTHENTICATION_ERROR"],
            ["...", "AUTHORIZATION_ERROR"],
            ["...", "INTERNAL_ERROR"]
          ]
          period = 300
          stat   = "Sum"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "Error Rate Percentage"
          region = var.aws_region
          metrics = [
            [{ expression = "(m2/m1)*100", label = "Error Rate %", id = "e1" }],
            ["${var.project_name}/${var.environment}", "ApiRequestCount", { id = "m1", visible = false }],
            ["${var.project_name}/${var.environment}", "ErrorCount", { id = "m2", visible = false }]
          ]
          period = 300
          yAxis = {
            left = {
              label = "Percent"
            }
          }
        }
      },

      # Bedrock Cost Tracking Section
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "Bedrock Token Usage"
          region = var.aws_region
          metrics = [
            ["${var.project_name}/${var.environment}", "BedrockInputTokens", { stat = "Sum", label = "Input Tokens" }],
            ["...", "BedrockOutputTokens", { stat = "Sum", label = "Output Tokens" }]
          ]
          period = 3600
          stat   = "Sum"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "Bedrock API Cost (USD)"
          region = var.aws_region
          metrics = [
            ["${var.project_name}/${var.environment}", "BedrockCost", { stat = "Sum", label = "Total Cost" }],
            ["...", { stat = "Sum", label = "By Firm", groupBy = "FirmId" }]
          ]
          period = 3600
          stat   = "Sum"
          yAxis = {
            left = {
              label = "USD"
            }
          }
        }
      },

      # Database Performance Section
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "Database Query Performance"
          region = var.aws_region
          metrics = [
            ["${var.project_name}/${var.environment}", "DatabaseQueryDuration", { stat = "Average", label = "Avg Duration" }],
            ["...", { stat = "p95", label = "P95 Duration" }],
            ["...", { stat = "p99", label = "P99 Duration" }]
          ]
          period = 300
          yAxis = {
            left = {
              label = "Milliseconds"
            }
          }
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "Database Connection Pool Usage"
          region = var.aws_region
          metrics = [
            ["${var.project_name}/${var.environment}", "DatabaseConnectionPoolTotal", { stat = "Average", label = "Total" }],
            ["...", "DatabaseConnectionPoolIdle", { stat = "Average", label = "Idle" }],
            ["...", "DatabaseConnectionPoolWaiting", { stat = "Average", label = "Waiting" }]
          ]
          period = 300
          stat   = "Average"
        }
      },

      # Document Processing Section
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "Document Processing Duration"
          region = var.aws_region
          metrics = [
            ["${var.project_name}/${var.environment}", "DocumentProcessingDuration", "Type", "upload"],
            ["...", "analysis"],
            ["...", "generation"]
          ]
          period = 300
          stat   = "Average"
          yAxis = {
            left = {
              label = "Milliseconds"
            }
          }
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "Document Processing Success Rate"
          region = var.aws_region
          metrics = [
            [{ expression = "(m1/(m1+m2))*100", label = "Success Rate %", id = "e1" }],
            ["${var.project_name}/${var.environment}", "DocumentProcessingCount", "Success", "true", { id = "m1", visible = false }],
            ["...", "false", { id = "m2", visible = false }]
          ]
          period = 300
          yAxis = {
            left = {
              label = "Percent"
            }
          }
        }
      },

      # Lambda Performance Section
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "Lambda Cold Starts"
          region = var.aws_region
          metrics = [
            ["${var.project_name}/${var.environment}", "LambdaColdStartCount", { stat = "Sum", label = "Cold Start Count" }],
            ["...", "LambdaColdStartDuration", { stat = "Average", label = "Avg Duration (ms)" }]
          ]
          period = 300
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "Lambda Memory Usage"
          region = var.aws_region
          metrics = [
            ["${var.project_name}/${var.environment}", "LambdaMemoryUsagePercent", { stat = "Average", label = "Memory Usage %" }]
          ]
          period = 300
          yAxis = {
            left = {
              label = "Percent",
              min   = 0,
              max   = 100
            }
          }
        }
      },

      # Business Metrics Section
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "Demand Letters Generated"
          region = var.aws_region
          metrics = [
            ["${var.project_name}/${var.environment}", "LetterGenerationCount", "Success", "true", { stat = "Sum", label = "Successful" }],
            ["...", "false", { stat = "Sum", label = "Failed" }]
          ]
          period = 3600
          stat   = "Sum"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "User Sessions"
          region = var.aws_region
          metrics = [
            ["${var.project_name}/${var.environment}", "UserSessions", "Event", "login", { stat = "Sum", label = "Logins" }],
            ["...", "logout", { stat = "Sum", label = "Logouts" }],
            ["...", "timeout", { stat = "Sum", label = "Timeouts" }]
          ]
          period = 3600
          stat   = "Sum"
        }
      }
    ]
  })

  depends_on = [
    aws_cloudwatch_log_group.api_lambda,
    aws_cloudwatch_log_group.ai_lambda
  ]
}

# Cost Tracking Dashboard
resource "aws_cloudwatch_dashboard" "cost_tracking" {
  dashboard_name = "${local.name_prefix}-cost-tracking"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 24
        height = 6
        properties = {
          title  = "Bedrock Cost by Firm (Last 24 Hours)"
          region = var.aws_region
          metrics = [
            ["${var.project_name}/${var.environment}", "BedrockCost", { stat = "Sum", label = "Total Cost", period = 86400 }]
          ]
          period = 86400
          stat   = "Sum"
          yAxis = {
            left = {
              label = "USD"
            }
          }
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "Bedrock Input Tokens by Model"
          region = var.aws_region
          metrics = [
            ["${var.project_name}/${var.environment}", "BedrockInputTokens", "Model", "anthropic.claude-3-5-sonnet", { stat = "Sum" }]
          ]
          period = 3600
          stat   = "Sum"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "Bedrock Output Tokens by Model"
          region = var.aws_region
          metrics = [
            ["${var.project_name}/${var.environment}", "BedrockOutputTokens", "Model", "anthropic.claude-3-5-sonnet", { stat = "Sum" }]
          ]
          period = 3600
          stat   = "Sum"
        }
      },
      {
        type   = "metric"
        width  = 24
        height = 6
        properties = {
          title  = "S3 Data Transfer Costs"
          region = var.aws_region
          metrics = [
            ["${var.project_name}/${var.environment}", "S3DataTransfer", "Operation", "PutObject", { stat = "Sum", label = "Upload (bytes)" }],
            ["...", "GetObject", { stat = "Sum", label = "Download (bytes)" }]
          ]
          period = 3600
          stat   = "Sum"
        }
      }
    ]
  })
}

# Log Metric Filters for structured logging

# Security Events Filter
resource "aws_cloudwatch_log_metric_filter" "security_events" {
  name           = "${local.name_prefix}-security-events"
  log_group_name = aws_cloudwatch_log_group.api_lambda.name
  pattern        = "{ $.securityEvent = true }"

  metric_transformation {
    name      = "SecurityEvents"
    namespace = "${var.project_name}/${var.environment}"
    value     = "1"
    unit      = "Count"
    dimensions = {
      EventType = "$.eventType"
    }
  }
}

# Authentication Failures Filter
resource "aws_cloudwatch_log_metric_filter" "auth_failures" {
  name           = "${local.name_prefix}-auth-failures"
  log_group_name = aws_cloudwatch_log_group.api_lambda.name
  pattern        = "{ $.error.code = \"AUTHENTICATION_ERROR\" }"

  metric_transformation {
    name      = "AuthenticationFailures"
    namespace = "${var.project_name}/${var.environment}"
    value     = "1"
    unit      = "Count"
  }
}

# Slow Requests Filter (> 1 second)
resource "aws_cloudwatch_log_metric_filter" "slow_requests" {
  name           = "${local.name_prefix}-slow-requests"
  log_group_name = aws_cloudwatch_log_group.api_lambda.name
  pattern        = "{ ($.http.duration > 1000) && ($.message = \"Request completed\") }"

  metric_transformation {
    name      = "SlowRequests"
    namespace = "${var.project_name}/${var.environment}"
    value     = "1"
    unit      = "Count"
    dimensions = {
      Endpoint = "$.http.path"
    }
  }
}

# Database Connection Pool Exhaustion Filter
resource "aws_cloudwatch_log_metric_filter" "connection_pool_exhaustion" {
  name           = "${local.name_prefix}-connection-pool-exhaustion"
  log_group_name = aws_cloudwatch_log_group.api_lambda.name
  pattern        = "{ $.database.connectionPoolUsagePercent > 90 }"

  metric_transformation {
    name      = "ConnectionPoolExhaustion"
    namespace = "${var.project_name}/${var.environment}"
    value     = "1"
    unit      = "Count"
  }
}

# 5xx Error Rate Filter
resource "aws_cloudwatch_log_metric_filter" "server_errors" {
  name           = "${local.name_prefix}-server-errors"
  log_group_name = aws_cloudwatch_log_group.api_lambda.name
  pattern        = "{ ($.http.statusCode >= 500) && ($.http.statusCode < 600) }"

  metric_transformation {
    name      = "ServerErrors"
    namespace = "${var.project_name}/${var.environment}"
    value     = "1"
    unit      = "Count"
    dimensions = {
      StatusCode = "$.http.statusCode"
      Endpoint   = "$.http.path"
    }
  }
}

# Outputs for reference
output "detailed_monitoring_dashboard_url" {
  description = "URL to the detailed monitoring dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.detailed_monitoring.dashboard_name}"
}

output "cost_tracking_dashboard_url" {
  description = "URL to the cost tracking dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.cost_tracking.dashboard_name}"
}
