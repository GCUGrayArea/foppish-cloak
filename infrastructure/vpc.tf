# VPC and Networking Configuration
# Uses Default VPC for development to avoid VPC limit issues

# Use Default VPC
data "aws_vpc" "default" {
  default = true
}

# Get Default VPC subnets
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Get subnet details
data "aws_subnet" "default" {
  for_each = toset(data.aws_subnets.default.ids)
  id       = each.value
}

# Get Internet Gateway (Default VPC already has one)
data "aws_internet_gateway" "default" {
  filter {
    name   = "attachment.vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds-sg-v2"
  description = "Security group for RDS PostgreSQL instance"
  vpc_id      = data.aws_vpc.default.id

  # Allow PostgreSQL from Lambda security group
  ingress {
    description     = "PostgreSQL from Lambda"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda.id]
  }

  # Allow PostgreSQL from anywhere in VPC (for migrations and debugging)
  ingress {
    description = "PostgreSQL from VPC"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.default.cidr_block]
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-rds-sg"
    }
  )
}

# Security Group for Lambda
resource "aws_security_group" "lambda" {
  name        = "${local.name_prefix}-lambda-sg-v2"
  description = "Security group for Lambda functions"
  vpc_id      = data.aws_vpc.default.id

  # Allow all outbound traffic (for RDS, S3, Bedrock, internet)
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-lambda-sg"
    }
  )
}

# VPC Endpoint for S3 (Gateway Endpoint - free)
# Creates S3 endpoint for the Default VPC to reduce data transfer costs
# Commented out: Route already exists from previous deployment
# resource "aws_vpc_endpoint" "s3" {
#   vpc_id          = data.aws_vpc.default.id
#   service_name    = "com.amazonaws.${var.aws_region}.s3"
#   route_table_ids = [data.aws_vpc.default.main_route_table_id]
#
#   tags = merge(
#     local.common_tags,
#     {
#       Name = "${local.name_prefix}-s3-endpoint"
#     }
#   )
# }

# Note: VPC and subnet outputs are defined in outputs.tf to avoid duplication
