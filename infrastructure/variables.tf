# Terraform Variables
# Input variable declarations for infrastructure configuration

# Project Configuration
variable "project_name" {
  description = "Name of the project, used for resource naming"
  type        = string
  default     = "demand-letters"
}

variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be either 'dev' or 'prod'."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

# RDS Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 20
}

variable "db_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.4"
}

variable "db_name" {
  description = "Name of the database"
  type        = string
  default     = "demand_letters"
}

variable "db_username" {
  description = "Master username for RDS"
  type        = string
  default     = "dbadmin"
  sensitive   = true
}

variable "db_backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "db_multi_az" {
  description = "Enable Multi-AZ deployment for RDS"
  type        = bool
  default     = false
}

# Lambda Configuration
variable "lambda_api_memory" {
  description = "Memory allocation for API Lambda function (MB)"
  type        = number
  default     = 1024
}

variable "lambda_api_timeout" {
  description = "Timeout for API Lambda function (seconds)"
  type        = number
  default     = 30
}

variable "lambda_ai_memory" {
  description = "Memory allocation for AI Lambda function (MB)"
  type        = number
  default     = 2048
}

variable "lambda_ai_timeout" {
  description = "Timeout for AI Lambda function (seconds)"
  type        = number
  default     = 300
}

variable "lambda_runtime_nodejs" {
  description = "Node.js runtime version for Lambda"
  type        = string
  default     = "nodejs18.x"
}

variable "lambda_runtime_python" {
  description = "Python runtime version for Lambda"
  type        = string
  default     = "python3.11"
}

# Bedrock Configuration
variable "bedrock_model_id" {
  description = "AWS Bedrock model ID (inference profile)"
  type        = string
  default     = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"  # Claude Sonnet 4.5 (latest)
}

variable "bedrock_region" {
  description = "AWS region for Bedrock (may differ from main region)"
  type        = string
  default     = "us-east-1"
}

# CloudWatch Configuration
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# S3 Configuration
variable "document_bucket_lifecycle_days" {
  description = "Days before transitioning documents to Glacier"
  type        = number
  default     = 90
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}
