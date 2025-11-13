# RDS PostgreSQL Configuration
# Creates RDS instance with security groups and subnet groups

# Random password for RDS master user
resource "random_password" "db_master_password" {
  length  = 32
  special = true
  # Exclude characters that might cause issues in connection strings
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# DB Subnet Group spanning Default VPC subnets
resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = data.aws_subnets.default.ids

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-db-subnet-group"
    }
  )
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "postgres" {
  identifier = "${local.name_prefix}-postgres"

  # Engine Configuration
  engine               = "postgres"
  engine_version       = var.db_engine_version
  instance_class       = var.db_instance_class
  allocated_storage    = var.db_allocated_storage
  storage_type         = "gp3"
  storage_encrypted    = true
  kms_key_id           = aws_kms_key.rds.arn

  # Database Configuration
  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_master_password.result
  port     = 5432

  # Network Configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # High Availability
  multi_az = var.db_multi_az

  # Backup Configuration
  backup_retention_period = var.db_backup_retention_days
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"
  skip_final_snapshot     = var.environment == "dev" ? true : false
  final_snapshot_identifier = var.environment == "dev" ? null : "${local.name_prefix}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  # Performance Insights (optional, adds cost)
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  performance_insights_enabled    = var.environment == "prod" ? true : false
  performance_insights_retention_period = var.environment == "prod" ? 7 : null

  # Auto Minor Version Upgrade
  auto_minor_version_upgrade = true

  # Deletion Protection
  deletion_protection = var.environment == "prod" ? true : false

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-postgres"
    }
  )

  lifecycle {
    ignore_changes = [
      # Ignore changes to password after creation (will be rotated via Secrets Manager)
      password,
      # Ignore final snapshot identifier timestamp changes
      final_snapshot_identifier
    ]
  }
}

# KMS Key for RDS Encryption
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-rds-kms-key"
    }
  )
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${local.name_prefix}-rds"
  target_key_id = aws_kms_key.rds.key_id
}

# Store RDS credentials in Secrets Manager
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${local.name_prefix}/database/master"
  description = "Master credentials for RDS PostgreSQL"

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-db-credentials"
    }
  )
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id

  secret_string = jsonencode({
    username = aws_db_instance.postgres.username
    password = random_password.db_master_password.result
    engine   = "postgres"
    host     = aws_db_instance.postgres.address
    port     = aws_db_instance.postgres.port
    dbname   = aws_db_instance.postgres.db_name
    # Full connection string for convenience
    database_url = "postgresql://${aws_db_instance.postgres.username}:${random_password.db_master_password.result}@${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}/${aws_db_instance.postgres.db_name}"
  })
}

# Note: CloudWatch alarms for RDS are defined in alarms.tf
# to avoid duplication and ensure proper integration with SNS topics
