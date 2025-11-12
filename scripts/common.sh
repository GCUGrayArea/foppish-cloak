#!/bin/bash
# Common deployment utilities and helper functions
# Used by all deployment scripts

set -euo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Exit with error message
die() {
  log_error "$1"
  exit 1
}

# Check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check required dependencies
check_dependencies() {
  local deps=("$@")
  local missing=()

  for dep in "${deps[@]}"; do
    if ! command_exists "$dep"; then
      missing+=("$dep")
    fi
  done

  if [ ${#missing[@]} -gt 0 ]; then
    die "Missing required dependencies: ${missing[*]}"
  fi
}

# Validate environment variable is set
require_env() {
  local var_name="$1"
  local var_value="${!var_name:-}"

  if [ -z "$var_value" ]; then
    die "Required environment variable $var_name is not set"
  fi
}

# Validate environment is valid (dev or prod)
validate_environment() {
  local env="$1"

  if [[ ! "$env" =~ ^(dev|prod)$ ]]; then
    die "Invalid environment: $env. Must be 'dev' or 'prod'"
  fi
}

# Get AWS Lambda function name for environment
get_lambda_function_name() {
  local service="$1"
  local env="$2"

  echo "demand-letters-${service}-${env}"
}

# Get S3 bucket name for environment
get_s3_bucket_name() {
  local bucket_type="$1"  # frontend or deployments
  local env="$2"

  echo "demand-letters-${bucket_type}-${env}"
}

# Get CloudFront distribution ID from AWS
get_cloudfront_distribution_id() {
  local env="$1"
  local bucket_name
  bucket_name=$(get_s3_bucket_name "frontend" "$env")

  aws cloudfront list-distributions \
    --query "DistributionList.Items[?Origins.Items[?contains(DomainName, '${bucket_name}')]].Id | [0]" \
    --output text
}

# Upload file to S3
s3_upload() {
  local file="$1"
  local bucket="$2"
  local key="$3"

  log_info "Uploading $file to s3://$bucket/$key"
  aws s3 cp "$file" "s3://$bucket/$key" || die "Failed to upload to S3"
}

# Update Lambda function code from S3
update_lambda_code() {
  local function_name="$1"
  local s3_bucket="$2"
  local s3_key="$3"

  log_info "Updating Lambda function: $function_name"
  aws lambda update-function-code \
    --function-name "$function_name" \
    --s3-bucket "$s3_bucket" \
    --s3-key "$s3_key" \
    --query 'Version' \
    --output text || die "Failed to update Lambda function"
}

# Publish Lambda version
publish_lambda_version() {
  local function_name="$1"
  local description="${2:-Deployment $(date -u +%Y-%m-%dT%H:%M:%SZ)}"

  log_info "Publishing new version of $function_name"
  aws lambda publish-version \
    --function-name "$function_name" \
    --description "$description" \
    --query 'Version' \
    --output text || die "Failed to publish Lambda version"
}

# Update Lambda alias to point to new version
update_lambda_alias() {
  local function_name="$1"
  local alias_name="$2"
  local version="$3"

  log_info "Updating alias $alias_name to version $version"

  # Check if alias exists
  if aws lambda get-alias \
    --function-name "$function_name" \
    --name "$alias_name" \
    >/dev/null 2>&1; then
    # Update existing alias
    aws lambda update-alias \
      --function-name "$function_name" \
      --name "$alias_name" \
      --function-version "$version" \
      >/dev/null || die "Failed to update Lambda alias"
  else
    # Create new alias
    aws lambda create-alias \
      --function-name "$function_name" \
      --name "$alias_name" \
      --function-version "$version" \
      >/dev/null || die "Failed to create Lambda alias"
  fi
}

# Get current Lambda version from alias
get_lambda_version_from_alias() {
  local function_name="$1"
  local alias_name="$2"

  aws lambda get-alias \
    --function-name "$function_name" \
    --name "$alias_name" \
    --query 'FunctionVersion' \
    --output text 2>/dev/null || echo ""
}

# Invalidate CloudFront distribution
invalidate_cloudfront() {
  local distribution_id="$1"
  local paths="${2:-/*}"

  log_info "Creating CloudFront invalidation for paths: $paths"
  local invalidation_id
  invalidation_id=$(aws cloudfront create-invalidation \
    --distribution-id "$distribution_id" \
    --paths "$paths" \
    --query 'Invalidation.Id' \
    --output text) || die "Failed to create CloudFront invalidation"

  log_info "Invalidation created: $invalidation_id"
  echo "$invalidation_id"
}

# Wait for CloudFront invalidation to complete
wait_for_cloudfront_invalidation() {
  local distribution_id="$1"
  local invalidation_id="$2"
  local max_wait="${3:-300}"  # 5 minutes default

  log_info "Waiting for CloudFront invalidation to complete..."

  local elapsed=0
  while [ $elapsed -lt $max_wait ]; do
    local status
    status=$(aws cloudfront get-invalidation \
      --distribution-id "$distribution_id" \
      --id "$invalidation_id" \
      --query 'Invalidation.Status' \
      --output text)

    if [ "$status" = "Completed" ]; then
      log_success "CloudFront invalidation completed"
      return 0
    fi

    sleep 10
    elapsed=$((elapsed + 10))
  done

  log_warning "CloudFront invalidation still in progress after ${max_wait}s"
  return 1
}

# Check if AWS credentials are configured
check_aws_credentials() {
  if ! aws sts get-caller-identity >/dev/null 2>&1; then
    die "AWS credentials not configured or invalid"
  fi

  log_success "AWS credentials valid"
}

# Create deployment timestamp
get_deployment_timestamp() {
  date -u +%Y%m%d-%H%M%S
}

# Create git commit hash (short)
get_git_commit_hash() {
  git rev-parse --short HEAD 2>/dev/null || echo "unknown"
}

# Create deployment tag for tracking
get_deployment_tag() {
  echo "$(get_deployment_timestamp)-$(get_git_commit_hash)"
}
