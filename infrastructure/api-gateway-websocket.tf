# API Gateway WebSocket API Configuration
# Creates WebSocket API for real-time collaboration (P1 Feature)

# WebSocket API
resource "aws_apigatewayv2_api" "websocket" {
  name                       = "${local.name_prefix}-websocket"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
  description                = "WebSocket API for real-time collaboration"

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-websocket"
    }
  )
}

# DynamoDB Table for Connection Management
# Tracks active WebSocket connections
resource "aws_dynamodb_table" "websocket_connections" {
  name         = "${local.name_prefix}-websocket-connections"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "connectionId"

  attribute {
    name = "connectionId"
    type = "S"
  }

  # TTL for automatic cleanup of stale connections
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-websocket-connections"
    }
  )
}

# Placeholder Lambda for WebSocket connection handling
# Note: This will be replaced by actual collaboration service Lambda in PR-019
data "archive_file" "websocket_placeholder" {
  type        = "zip"
  output_path = "${path.module}/.terraform/lambda-websocket-placeholder.zip"

  source {
    content  = <<-EOT
      exports.handler = async (event) => {
        console.log('WebSocket event:', JSON.stringify(event, null, 2));

        const { requestContext: { routeKey } } = event;

        return {
          statusCode: 200,
          body: JSON.stringify({
            message: `WebSocket $${routeKey} - placeholder`,
            routeKey
          })
        };
      };
    EOT
    filename = "index.js"
  }
}

# WebSocket Connection Lambda Function
resource "aws_lambda_function" "websocket_handler" {
  function_name = "${local.name_prefix}-websocket-handler"
  description   = "WebSocket connection handler for real-time collaboration"

  filename         = data.archive_file.websocket_placeholder.output_path
  source_code_hash = data.archive_file.websocket_placeholder.output_base64sha256

  runtime = var.lambda_runtime_nodejs
  handler = "index.handler"
  role    = aws_iam_role.websocket_lambda.arn

  memory_size = 512
  timeout     = 30

  environment {
    variables = {
      ENVIRONMENT            = var.environment
      CONNECTIONS_TABLE_NAME = aws_dynamodb_table.websocket_connections.name
      AWS_REGION_CUSTOM      = var.aws_region
    }
  }

  tags = merge(
    local.common_tags,
    {
      Name    = "${local.name_prefix}-websocket-handler"
      Service = "Collaboration"
    }
  )

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
      last_modified
    ]
  }
}

# IAM Role for WebSocket Lambda
resource "aws_iam_role" "websocket_lambda" {
  name = "${local.name_prefix}-websocket-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-websocket-lambda-role"
    }
  )
}

# IAM Policy for WebSocket Lambda
resource "aws_iam_policy" "websocket_lambda" {
  name        = "${local.name_prefix}-websocket-lambda-policy"
  description = "Policy for WebSocket Lambda function"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.name_prefix}-websocket-handler:*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = aws_dynamodb_table.websocket_connections.arn
      },
      {
        Effect = "Allow"
        Action = [
          "execute-api:ManageConnections"
        ]
        Resource = "${aws_apigatewayv2_api.websocket.execution_arn}/*/*/@connections/*"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "websocket_lambda" {
  role       = aws_iam_role.websocket_lambda.name
  policy_arn = aws_iam_policy.websocket_lambda.arn
}

# CloudWatch Log Group for WebSocket Lambda
resource "aws_cloudwatch_log_group" "websocket_lambda" {
  name              = "/aws/lambda/${local.name_prefix}-websocket-handler"
  retention_in_days = var.log_retention_days

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-websocket-handler-logs"
    }
  )
}

# Lambda Permission for API Gateway to invoke
resource "aws_lambda_permission" "websocket_connect" {
  statement_id  = "AllowWebSocketAPIInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.websocket_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/*"
}

# WebSocket Routes
# NOTE: These routes now use the collaboration service integrations defined in lambda-websocket.tf
resource "aws_apigatewayv2_route" "connect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.collaboration_connect.id}"

  # Authorization handled in Lambda via JWT token in query string
}

resource "aws_apigatewayv2_route" "disconnect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.collaboration_disconnect.id}"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.collaboration_default.id}"
}

# WebSocket Stage
resource "aws_apigatewayv2_stage" "websocket" {
  api_id      = aws_apigatewayv2_api.websocket.id
  name        = var.environment
  auto_deploy = true

  # CloudWatch Logs
  default_route_settings {
    logging_level            = "INFO"
    data_trace_enabled       = var.environment == "prod" ? false : true
    throttling_rate_limit    = 100
    throttling_burst_limit   = 50
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.websocket_api.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      connectionId   = "$context.connectionId"
      integrationErrorMessage = "$context.integrationErrorMessage"
    })
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-websocket-${var.environment}"
    }
  )
}

# CloudWatch Log Group for WebSocket API
resource "aws_cloudwatch_log_group" "websocket_api" {
  name              = "/aws/apigateway/${local.name_prefix}-websocket-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-websocket-api-logs"
    }
  )
}

# WebSocket Authorizer (optional, uncomment to enable JWT auth)
# resource "aws_apigatewayv2_authorizer" "websocket" {
#   api_id           = aws_apigatewayv2_api.websocket.id
#   authorizer_type  = "REQUEST"
#   name             = "${local.name_prefix}-websocket-authorizer"
#   authorizer_uri   = aws_lambda_function.websocket_authorizer.invoke_arn
#   identity_sources = ["route.request.querystring.token"]
# }
