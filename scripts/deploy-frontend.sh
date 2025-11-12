#!/bin/bash
# Deploy frontend to S3 and invalidate CloudFront cache
# Sets appropriate cache headers for different file types

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

# Parse arguments
usage() {
  echo "Usage: $0 <environment>"
  echo ""
  echo "Arguments:"
  echo "  environment   Target environment (dev, prod)"
  echo ""
  echo "Example:"
  echo "  $0 dev"
  exit 1
}

if [ $# -ne 1 ]; then
  usage
fi

ENVIRONMENT="$1"

# Validate inputs
validate_environment "$ENVIRONMENT"

# Configuration
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_ROOT/frontend/dist"
S3_BUCKET=$(get_s3_bucket_name "frontend" "$ENVIRONMENT")

log_info "Deploying frontend to $ENVIRONMENT environment"

# Check AWS credentials
check_aws_credentials

# Validate build directory exists
if [ ! -d "$BUILD_DIR" ]; then
  die "Build directory not found: $BUILD_DIR. Run build-frontend.sh first"
fi

if [ ! -f "$BUILD_DIR/index.html" ]; then
  die "index.html not found in build directory"
fi

# Upload files with appropriate cache headers
log_info "Uploading files to S3: $S3_BUCKET"

# Upload index.html (no cache)
log_info "Uploading index.html (no-cache)"
aws s3 cp "$BUILD_DIR/index.html" "s3://$S3_BUCKET/index.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html" \
  || die "Failed to upload index.html"

# Upload assets (long cache with hashed filenames)
log_info "Uploading assets (1 year cache)"
aws s3 sync "$BUILD_DIR/assets" "s3://$S3_BUCKET/assets" \
  --cache-control "public, max-age=31536000, immutable" \
  --delete \
  || die "Failed to upload assets"

# Upload other static files (moderate cache)
log_info "Uploading static files"
for file in "$BUILD_DIR"/*; do
  filename=$(basename "$file")

  # Skip already uploaded files
  if [ "$filename" = "index.html" ] || [ "$filename" = "assets" ]; then
    continue
  fi

  # Set content type based on extension
  case "$filename" in
    *.json)
      content_type="application/json"
      cache_control="no-cache"
      ;;
    *.txt)
      content_type="text/plain"
      cache_control="public, max-age=3600"
      ;;
    *.ico)
      content_type="image/x-icon"
      cache_control="public, max-age=86400"
      ;;
    *)
      content_type="application/octet-stream"
      cache_control="public, max-age=3600"
      ;;
  esac

  if [ -f "$file" ]; then
    log_info "Uploading $filename"
    aws s3 cp "$file" "s3://$S3_BUCKET/$filename" \
      --cache-control "$cache_control" \
      --content-type "$content_type" \
      || die "Failed to upload $filename"
  fi
done

log_success "All files uploaded to S3"

# Get CloudFront distribution ID
log_info "Looking up CloudFront distribution"
DISTRIBUTION_ID=$(get_cloudfront_distribution_id "$ENVIRONMENT")

if [ -z "$DISTRIBUTION_ID" ] || [ "$DISTRIBUTION_ID" = "None" ]; then
  log_warning "CloudFront distribution not found for environment: $ENVIRONMENT"
  log_warning "Skipping cache invalidation"
else
  log_info "CloudFront distribution ID: $DISTRIBUTION_ID"

  # Invalidate CloudFront cache
  INVALIDATION_ID=$(invalidate_cloudfront "$DISTRIBUTION_ID" "/*")

  # Wait for invalidation (optional, can be skipped for faster deployments)
  if [ "${WAIT_FOR_INVALIDATION:-true}" = "true" ]; then
    wait_for_cloudfront_invalidation "$DISTRIBUTION_ID" "$INVALIDATION_ID" 300 || true
  else
    log_info "Skipping invalidation wait (WAIT_FOR_INVALIDATION=false)"
  fi
fi

# Get S3 bucket URL
BUCKET_URL="http://${S3_BUCKET}.s3-website-${AWS_REGION:-us-east-1}.amazonaws.com"
log_info "S3 website URL: $BUCKET_URL"

log_success "Frontend deployment complete"
