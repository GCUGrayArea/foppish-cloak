#!/bin/bash
# Rollback Lambda function to previous version
# Emergency rollback for failed deployments

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

# Parse arguments
usage() {
  echo "Usage: $0 <service> <environment> [version]"
  echo ""
  echo "Arguments:"
  echo "  service       Service name (api, ai, collaboration, all)"
  echo "  environment   Target environment (dev, prod)"
  echo "  version       (Optional) Specific version to rollback to"
  echo "                If not provided, rolls back to previous version"
  echo ""
  echo "Examples:"
  echo "  $0 api dev              # Rollback API to previous version"
  echo "  $0 all prod             # Rollback all services to previous versions"
  echo "  $0 ai dev 5             # Rollback AI service to version 5"
  exit 1
}

if [ $# -lt 2 ]; then
  usage
fi

SERVICE="$1"
ENVIRONMENT="$2"
TARGET_VERSION="${3:-}"

# Validate inputs
validate_environment "$ENVIRONMENT"

if [[ ! "$SERVICE" =~ ^(api|ai|collaboration|all)$ ]]; then
  die "Invalid service: $SERVICE. Must be 'api', 'ai', 'collaboration', or 'all'"
fi

ALIAS_NAME="live"

log_info "Initiating rollback for $SERVICE in $ENVIRONMENT environment"

# Check AWS credentials
check_aws_credentials

# Rollback a single service
rollback_service() {
  local service="$1"
  local target_version="$2"

  local function_name
  function_name=$(get_lambda_function_name "$service" "$ENVIRONMENT")

  log_info "Rolling back $function_name"

  # Get current version
  local current_version
  current_version=$(get_lambda_version_from_alias "$function_name" "$ALIAS_NAME")

  if [ -z "$current_version" ]; then
    log_error "Could not determine current version for $function_name"
    return 1
  fi

  log_info "Current version: $current_version"

  # Determine target version
  if [ -z "$target_version" ]; then
    # Get previous version (one before current)
    local all_versions
    all_versions=$(aws lambda list-versions-by-function \
      --function-name "$function_name" \
      --query 'Versions[?Version!=`$LATEST`].Version' \
      --output text | tr '\t' '\n' | sort -rn)

    # Find version before current
    target_version=$(echo "$all_versions" | grep -A1 "^${current_version}$" | tail -n1)

    if [ -z "$target_version" ] || [ "$target_version" = "$current_version" ]; then
      log_error "Could not determine previous version for rollback"
      log_info "Available versions:"
      echo "$all_versions"
      return 1
    fi
  fi

  log_info "Target version: $target_version"

  # Confirm rollback for production
  if [ "$ENVIRONMENT" = "prod" ] && [ -t 0 ]; then
    echo ""
    log_warning "About to rollback $function_name in PRODUCTION"
    log_warning "  From version: $current_version"
    log_warning "  To version: $target_version"
    echo ""
    read -r -p "Continue with rollback? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
      log_info "Rollback cancelled by user"
      return 1
    fi
  fi

  # Verify target version exists
  if ! aws lambda get-function \
    --function-name "$function_name:$target_version" \
    >/dev/null 2>&1; then
    log_error "Version $target_version does not exist for $function_name"
    return 1
  fi

  # Update alias to point to target version
  update_lambda_alias "$function_name" "$ALIAS_NAME" "$target_version"

  log_success "Rollback complete for $function_name"
  log_success "  Previous version: $current_version"
  log_success "  Current version: $target_version"

  return 0
}

# Rollback logic
if [ "$SERVICE" = "all" ]; then
  log_info "Rolling back all services"

  FAILED_SERVICES=()

  for svc in api ai collaboration; do
    if ! rollback_service "$svc" "$TARGET_VERSION"; then
      FAILED_SERVICES+=("$svc")
    fi
  done

  if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
    log_error "Rollback failed for services: ${FAILED_SERVICES[*]}"
    exit 1
  fi

  log_success "All services rolled back successfully"
else
  if ! rollback_service "$SERVICE" "$TARGET_VERSION"; then
    die "Rollback failed for $SERVICE"
  fi
fi

log_success "Rollback complete"
log_warning "Remember to run smoke tests to verify the rollback"
