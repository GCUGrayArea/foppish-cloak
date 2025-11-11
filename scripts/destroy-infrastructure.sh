#!/bin/bash
# Destroy Infrastructure Script
# Destroys AWS infrastructure created by Terraform
# WARNING: This will delete all resources! Use with caution!

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${RED}========================================${NC}"
echo -e "${RED}WARNING: Infrastructure Destruction${NC}"
echo -e "${RED}========================================${NC}"
echo ""

# Check if environment argument is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Environment not specified${NC}"
    echo "Usage: ./scripts/destroy-infrastructure.sh [dev|prod]"
    echo ""
    echo "Example:"
    echo "  ./scripts/destroy-infrastructure.sh dev"
    exit 1
fi

ENVIRONMENT=$1

# Validate environment
if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "prod" ]; then
    echo -e "${RED}Error: Invalid environment '${ENVIRONMENT}'${NC}"
    echo "Environment must be either 'dev' or 'prod'"
    exit 1
fi

echo -e "${YELLOW}Environment: ${ENVIRONMENT}${NC}"
echo ""

# Extra warning for production
if [ "$ENVIRONMENT" == "prod" ]; then
    echo -e "${RED}╔════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  WARNING: PRODUCTION ENVIRONMENT      ║${NC}"
    echo -e "${RED}║  This will destroy production data!   ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Type 'destroy-production' to confirm:${NC}"
    read -r CONFIRMATION
    if [ "$CONFIRMATION" != "destroy-production" ]; then
        echo -e "${GREEN}Aborted. No changes made.${NC}"
        exit 0
    fi
else
    echo -e "${YELLOW}This will destroy all infrastructure for ${ENVIRONMENT} environment.${NC}"
    echo -e "${YELLOW}Type 'yes' to confirm:${NC}"
    read -r CONFIRMATION
    if [ "$CONFIRMATION" != "yes" ]; then
        echo -e "${GREEN}Aborted. No changes made.${NC}"
        exit 0
    fi
fi

# Navigate to infrastructure directory
cd "$(dirname "$0")/../infrastructure"

echo ""
echo -e "${YELLOW}Step 1: Terraform Init${NC}"
terraform init

echo ""
echo -e "${YELLOW}Step 2: Terraform Plan (Destroy)${NC}"
terraform plan \
    -destroy \
    -var-file="environments/${ENVIRONMENT}.tfvars" \
    -out="${ENVIRONMENT}-destroy.tfplan"

echo ""
echo -e "${RED}Review the destroy plan above. This is your last chance to cancel!${NC}"
echo -e "${YELLOW}Press Ctrl+C to cancel or any key to continue with destruction...${NC}"
read -n 1 -s

echo ""
echo -e "${RED}Step 3: Terraform Destroy${NC}"
terraform apply "${ENVIRONMENT}-destroy.tfplan"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Infrastructure Destroyed${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Note: Some resources may require manual cleanup:${NC}"
echo "- S3 buckets with versioning (if not empty)"
echo "- RDS final snapshots (check AWS console)"
echo "- CloudWatch log groups (may persist)"
echo "- Secrets in AWS Secrets Manager (may have retention period)"
echo ""
echo -e "${YELLOW}To verify all resources are deleted:${NC}"
echo "  terraform state list"
echo "  aws resourcegroupstaggingapi get-resources --tag-filters Key=Project,Values=demand-letters"
echo ""
