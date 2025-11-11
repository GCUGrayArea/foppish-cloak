# Main Terraform Configuration
# This file serves as the entry point and documents the overall infrastructure

# Local variables for resource naming and tagging
locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = merge(
    var.additional_tags,
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  )
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}

# Data source for current AWS region
data "aws_region" "current" {}
