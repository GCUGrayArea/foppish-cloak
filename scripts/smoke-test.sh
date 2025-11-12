#!/bin/bash
# Post-deployment smoke tests
# Validates critical functionality after deployment

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
if [ "$ENVIRONMENT" = "prod" ]; then
  API_BASE_URL="${API_BASE_URL_PROD:-https://api.demand-letters-prod.example.com}"
  FRONTEND_URL="${FRONTEND_URL_PROD:-https://demand-letters-prod.example.com}"
else
  API_BASE_URL="${API_BASE_URL_DEV:-https://api.demand-letters-dev.example.com}"
  FRONTEND_URL="${FRONTEND_URL_DEV:-https://demand-letters-dev.example.com}"
fi

TEST_FAILED=0

log_info "Running smoke tests for $ENVIRONMENT environment"
log_info "API URL: $API_BASE_URL"
log_info "Frontend URL: $FRONTEND_URL"

# Test 1: API Health Check
test_api_health() {
  log_info "Test 1: API health check"

  local response
  local status_code

  response=$(curl -s -w "\n%{http_code}" "${API_BASE_URL}/health" || echo "000")
  status_code=$(echo "$response" | tail -n1)

  if [ "$status_code" = "200" ]; then
    log_success "API health check passed (HTTP $status_code)"
    return 0
  else
    log_error "API health check failed (HTTP $status_code)"
    return 1
  fi
}

# Test 2: Database Connectivity
test_database() {
  log_info "Test 2: Database connectivity"

  local response
  local status_code

  response=$(curl -s -w "\n%{http_code}" "${API_BASE_URL}/health/db" || echo "000")
  status_code=$(echo "$response" | tail -n1)

  if [ "$status_code" = "200" ]; then
    log_success "Database connectivity test passed (HTTP $status_code)"
    return 0
  else
    log_error "Database connectivity test failed (HTTP $status_code)"
    return 1
  fi
}

# Test 3: Frontend Accessibility
test_frontend() {
  log_info "Test 3: Frontend accessibility"

  local status_code
  status_code=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || echo "000")

  if [ "$status_code" = "200" ]; then
    log_success "Frontend accessibility test passed (HTTP $status_code)"
    return 0
  else
    log_error "Frontend accessibility test failed (HTTP $status_code)"
    return 1
  fi
}

# Test 4: Frontend index.html content
test_frontend_content() {
  log_info "Test 4: Frontend content validation"

  local content
  content=$(curl -s "$FRONTEND_URL" || echo "")

  if echo "$content" | grep -q "<div id=\"root\">"; then
    log_success "Frontend content validation passed"
    return 0
  else
    log_error "Frontend content validation failed (root div not found)"
    return 1
  fi
}

# Test 5: API CORS headers
test_cors() {
  log_info "Test 5: API CORS headers"

  local headers
  headers=$(curl -s -I -X OPTIONS \
    -H "Origin: ${FRONTEND_URL}" \
    -H "Access-Control-Request-Method: GET" \
    "${API_BASE_URL}/health" || echo "")

  if echo "$headers" | grep -iq "access-control-allow-origin"; then
    log_success "CORS headers test passed"
    return 0
  else
    log_warning "CORS headers test failed (may not be configured yet)"
    return 0  # Don't fail smoke tests for CORS
  fi
}

# Test 6: Authentication endpoint
test_auth_endpoint() {
  log_info "Test 6: Authentication endpoint availability"

  local status_code
  status_code=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    "${API_BASE_URL}/auth/login" || echo "000")

  # Expecting 400 or 401 (no credentials provided), not 500
  if [ "$status_code" = "400" ] || [ "$status_code" = "401" ]; then
    log_success "Authentication endpoint test passed (HTTP $status_code)"
    return 0
  elif [ "$status_code" = "404" ]; then
    log_error "Authentication endpoint not found (HTTP $status_code)"
    return 1
  elif [ "$status_code" -ge 500 ]; then
    log_error "Authentication endpoint server error (HTTP $status_code)"
    return 1
  else
    log_warning "Authentication endpoint returned unexpected status (HTTP $status_code)"
    return 0  # Don't fail for unexpected but non-error statuses
  fi
}

# Run all tests
run_all_tests() {
  local failed=0

  test_api_health || failed=$((failed + 1))
  test_database || failed=$((failed + 1))
  test_frontend || failed=$((failed + 1))
  test_frontend_content || failed=$((failed + 1))
  test_cors || true  # Non-critical
  test_auth_endpoint || failed=$((failed + 1))

  return $failed
}

# Execute tests with timeout
log_info "Starting smoke tests (timeout: 120s)"

if timeout 120 bash -c "$(declare -f run_all_tests); $(declare -f test_api_health); \
  $(declare -f test_database); $(declare -f test_frontend); \
  $(declare -f test_frontend_content); $(declare -f test_cors); \
  $(declare -f test_auth_endpoint); $(declare -f log_info); \
  $(declare -f log_success); $(declare -f log_error); $(declare -f log_warning); \
  run_all_tests"; then
  log_success "All smoke tests passed"
  exit 0
else
  TEST_FAILED=$?
  log_error "Smoke tests failed ($TEST_FAILED tests)"
  exit 1
fi
