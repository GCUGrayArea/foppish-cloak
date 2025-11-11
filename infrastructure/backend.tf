# Terraform Backend Configuration
# State backend using S3 for storage and DynamoDB for state locking
#
# IMPORTANT: This backend must be bootstrapped manually before first use:
#
# 1. Create S3 bucket for state storage:
#    aws s3 mb s3://demand-letters-terraform-state --region us-east-1
#
# 2. Enable versioning on the bucket:
#    aws s3api put-bucket-versioning --bucket demand-letters-terraform-state \
#      --versioning-configuration Status=Enabled
#
# 3. Enable server-side encryption:
#    aws s3api put-bucket-encryption --bucket demand-letters-terraform-state \
#      --server-side-encryption-configuration '{
#        "Rules": [{
#          "ApplyServerSideEncryptionByDefault": {
#            "SSEAlgorithm": "AES256"
#          }
#        }]
#      }'
#
# 4. Create DynamoDB table for state locking:
#    aws dynamodb create-table --table-name terraform-state-lock \
#      --attribute-definitions AttributeName=LockID,AttributeType=S \
#      --key-schema AttributeName=LockID,KeyType=HASH \
#      --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
#      --region us-east-1
#
# 5. Comment out the backend block below and run:
#    terraform init
#
# 6. Uncomment the backend block and run:
#    terraform init -migrate-state
#
# NOTE: For first-time setup, you may run terraform without a backend by
# commenting out this entire block. State will be stored locally.

# Uncomment after manual backend setup:
# terraform {
#   backend "s3" {
#     bucket         = "demand-letters-terraform-state"
#     key            = "terraform.tfstate"
#     region         = "us-east-1"
#     encrypt        = true
#     dynamodb_table = "terraform-state-lock"
#   }
# }
