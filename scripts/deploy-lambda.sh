#!/bin/bash
# Deploy Lambda function with versioning and alias management
# Supports rollback to previous versions

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

# Parse arguments
usage() {
  echo "Usage: $0 <service> <environment> <zip-file>"
  echo ""
  echo "Arguments:"
  echo "  service       Service name (api, ai, collaboration)"
  echo "  environment   Target environment (dev, prod)"
  echo "  zip-file      Path to Lambda deployment package"
  echo ""
  echo "Example:"
  echo "  $0 api dev deploy/api-lambda.zip"
  exit 1
}

if [ $# -ne 3 ]; then
  usage
fi

SERVICE="$1"
ENVIRONMENT="$2"
ZIP_FILE="$3"

# Validate inputs
validate_environment "$ENVIRONMENT"

if [ ! -f "$ZIP_FILE" ]; then
  die "ZIP file not found: $ZIP_FILE"
fi

if [[ ! "$SERVICE" =~ ^(api|ai|collaboration)$ ]]; then
  die "Invalid service: $SERVICE. Must be 'api', 'ai', or 'collaboration'"
fi

# Configuration
FUNCTION_NAME=$(get_lambda_function_name "$SERVICE" "$ENVIRONMENT")
S3_BUCKET=$(get_s3_bucket_name "deployments" "$ENVIRONMENT")
DEPLOYMENT_TAG=$(get_deployment_tag)
S3_KEY="lambda/${SERVICE}/${DEPLOYMENT_TAG}.zip"
ALIAS_NAME="live"

log_info "Deploying Lambda function: $FUNCTION_NAME"
log_info "Deployment tag: $DEPLOYMENT_TAG"

# Check AWS credentials
check_aws_credentials

# Upload ZIP to S3
log_info "Uploading deployment package to S3"
s3_upload "$ZIP_FILE" "$S3_BUCKET" "$S3_KEY"

# Get current version (for rollback reference)
PREVIOUS_VERSION=$(get_lambda_version_from_alias "$FUNCTION_NAME" "$ALIAS_NAME")
if [ -n "$PREVIOUS_VERSION" ]; then
  log_info "Previous version: $PREVIOUS_VERSION"
fi

# Update Lambda function code
NEW_VERSION=$(update_lambda_code "$FUNCTION_NAME" "$S3_BUCKET" "$S3_KEY")
log_success "Function code updated"

# Wait for function to be ready
log_info "Waiting for function to be ready..."
sleep 5

# Publish new version
PUBLISHED_VERSION=$(publish_lambda_version "$FUNCTION_NAME" "Deployment $DEPLOYMENT_TAG")
log_success "Published version: $PUBLISHED_VERSION"

# Update alias to point to new version
update_lambda_alias "$FUNCTION_NAME" "$ALIAS_NAME" "$PUBLISHED_VERSION"
log_success "Alias '$ALIAS_NAME' updated to version $PUBLISHED_VERSION"

# Clean up old versions (keep last 5)
log_info "Cleaning up old versions (keeping last 5)"
aws lambda list-versions-by-function \
  --function-name "$FUNCTION_NAME" \
  --query 'Versions[?Version!=`$LATEST`].Version' \
  --output text \
  | tr '\t' '\n' \
  | sort -rn \
  | tail -n +6 \
  | while read -r version; do
    if [ -n "$version" ]; then
      log_info "Deleting old version: $version"
      aws lambda delete-function \
        --function-name "$FUNCTION_NAME:$version" 2>/dev/null || true
    fi
  done

# Store deployment metadata
log_info "Deployment metadata:"
echo "  Function: $FUNCTION_NAME"
echo "  Version: $PUBLISHED_VERSION"
echo "  Alias: $ALIAS_NAME"
echo "  Previous: $PREVIOUS_VERSION"
echo "  S3 Location: s3://$S3_BUCKET/$S3_KEY"

log_success "Lambda deployment complete"
