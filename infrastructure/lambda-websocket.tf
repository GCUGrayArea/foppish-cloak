# Lambda Function for Collaboration Service (Yjs WebSocket)
# Replaces the placeholder Lambda with real collaboration implementation

# Build collaboration service
data "archive_file" "collaboration_service" {
  type        = "zip"
  output_path = "${path.module}/.terraform/lambda-collaboration.zip"
  source_dir  = "${path.module}/../services/collaboration/dist"

  depends_on = [
    # Assumes collaboration service is built before terraform apply
    # Run: cd services/collaboration && npm run build
  ]
}

# Update WebSocket Lambda to use collaboration service
resource "aws_lambda_function" "websocket_collaboration" {
  function_name = "${local.name_prefix}-websocket-collaboration"
  description   = "Real-time collaboration service using Yjs CRDT"

  filename         = data.archive_file.collaboration_service.output_path
  source_code_hash = data.archive_file.collaboration_service.output_base64sha256

  runtime = var.lambda_runtime_nodejs
  handler = "index.handler"
  role    = aws_iam_role.websocket_lambda.arn

  memory_size = 1024
  timeout     = 30

  environment {
    variables = {
      ENVIRONMENT            = var.environment
      CONNECTIONS_TABLE_NAME = aws_dynamodb_table.websocket_connections.name
      DATABASE_URL           = "postgresql://${aws_db_instance.postgres.username}:${random_password.db_password.result}@${aws_db_instance.postgres.endpoint}/${aws_db_instance.postgres.db_name}"
      JWT_SECRET             = random_password.jwt_secret.result
      AWS_REGION_CUSTOM      = var.aws_region
      NODE_ENV               = var.environment
    }
  }

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  tags = merge(
    local.common_tags,
    {
      Name    = "${local.name_prefix}-websocket-collaboration"
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

# Update WebSocket integrations to use collaboration Lambda
resource "aws_apigatewayv2_integration" "collaboration_connect" {
  api_id             = aws_apigatewayv2_api.websocket.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.websocket_collaboration.invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_integration" "collaboration_disconnect" {
  api_id             = aws_apigatewayv2_api.websocket.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.websocket_collaboration.invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_integration" "collaboration_default" {
  api_id             = aws_apigatewayv2_api.websocket.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.websocket_collaboration.invoke_arn
  integration_method = "POST"
}

# Lambda permission for collaboration service
resource "aws_lambda_permission" "websocket_collaboration" {
  statement_id  = "AllowWebSocketAPIInvokeCollaboration"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.websocket_collaboration.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/*"
}

# CloudWatch Log Group for collaboration Lambda
resource "aws_cloudwatch_log_group" "websocket_collaboration" {
  name              = "/aws/lambda/${local.name_prefix}-websocket-collaboration"
  retention_in_days = var.log_retention_days

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-websocket-collaboration-logs"
    }
  )
}

# IAM policy addition for RDS access
resource "aws_iam_policy" "websocket_rds_access" {
  name        = "${local.name_prefix}-websocket-rds-access"
  description = "Allow WebSocket Lambda to access RDS PostgreSQL"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds:DescribeDBInstances",
          "rds:DescribeDBClusters"
        ]
        Resource = "*"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "websocket_rds_access" {
  role       = aws_iam_role.websocket_lambda.name
  policy_arn = aws_iam_policy.websocket_rds_access.arn
}

# VPC Endpoint for Lambda to access RDS
resource "aws_iam_role_policy_attachment" "websocket_vpc_execution" {
  role       = aws_iam_role.websocket_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}
