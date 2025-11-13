# ECR Repository for AI Processor Lambda Container Images

resource "aws_ecr_repository" "ai_processor" {
  name                 = "${local.name_prefix}-ai-proc-v2"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(
    local.common_tags,
    {
      Name    = "${local.name_prefix}-ai-processor"
      Service = "AI"
    }
  )
}

# Lifecycle policy to keep only recent images
resource "aws_ecr_lifecycle_policy" "ai_processor" {
  repository = aws_ecr_repository.ai_processor.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["latest"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Delete untagged images after 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# Output ECR repository URL
output "ecr_ai_processor_url" {
  description = "ECR repository URL for AI processor Lambda images"
  value       = aws_ecr_repository.ai_processor.repository_url
}
