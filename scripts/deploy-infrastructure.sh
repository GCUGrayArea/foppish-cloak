#!/bin/bash
# Deploy Infrastructure Script
# Deploys AWS infrastructure using Terraform

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}AWS Infrastructure Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if environment argument is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Environment not specified${NC}"
    echo "Usage: ./scripts/deploy-infrastructure.sh [dev|prod]"
    echo ""
    echo "Example:"
    echo "  ./scripts/deploy-infrastructure.sh dev"
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

# Navigate to infrastructure directory
cd "$(dirname "$0")/../infrastructure"

echo -e "${YELLOW}Step 1: Terraform Init${NC}"
terraform init

echo ""
echo -e "${YELLOW}Step 2: Terraform Format Check${NC}"
terraform fmt -check || {
    echo -e "${YELLOW}Warning: Terraform files are not formatted. Run 'terraform fmt' to fix.${NC}"
}

echo ""
echo -e "${YELLOW}Step 3: Terraform Validate${NC}"
terraform validate

echo ""
echo -e "${YELLOW}Step 4: Terraform Plan${NC}"
terraform plan \
    -var-file="environments/${ENVIRONMENT}.tfvars" \
    -out="${ENVIRONMENT}.tfplan"

echo ""
echo -e "${YELLOW}Review the plan above. Press Ctrl+C to cancel or any key to continue...${NC}"
read -n 1 -s

echo ""
echo -e "${YELLOW}Step 5: Terraform Apply${NC}"
terraform apply "${ENVIRONMENT}.tfplan"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Copy Terraform outputs to your .env file"
echo "2. Run 'terraform output' to see all output values"
echo "3. Update environment variables in AWS Lambda functions"
echo "4. Deploy application code to Lambda functions"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  terraform output                          # Show all outputs"
echo "  terraform output -json > outputs.json     # Export outputs as JSON"
echo "  terraform show                            # Show current state"
echo "  terraform state list                      # List all resources"
echo ""
