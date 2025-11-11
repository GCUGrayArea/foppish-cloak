# AWS Secrets Manager Configuration
# Manages sensitive configuration and credentials

# JWT Secret for authentication
resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "${local.name_prefix}/jwt/secret"
  description = "JWT signing secret for authentication"

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-jwt-secret"
    }
  )
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id = aws_secretsmanager_secret.jwt_secret.id

  secret_string = jsonencode({
    secret          = random_password.jwt_secret.result
    algorithm       = "HS256"
    expires_in      = "1h"
    refresh_expires = "30d"
  })
}

# API Keys Secret (placeholder for future use)
resource "aws_secretsmanager_secret" "api_keys" {
  name        = "${local.name_prefix}/api/keys"
  description = "API keys for third-party integrations"

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-api-keys"
    }
  )
}

resource "aws_secretsmanager_secret_version" "api_keys" {
  secret_id = aws_secretsmanager_secret.api_keys.id

  secret_string = jsonencode({
    email_service_key = "PLACEHOLDER-REPLACE-IN-AWS-CONSOLE"
    # Add other API keys as needed
  })

  lifecycle {
    ignore_changes = [
      # Don't overwrite manual updates to API keys
      secret_string
    ]
  }
}

# Note: RDS credentials are stored in secrets.tf within rds.tf
# See aws_secretsmanager_secret.db_credentials for database credentials
