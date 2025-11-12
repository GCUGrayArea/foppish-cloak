#!/bin/bash
# Run database migrations safely with backup
# Supports rollback on failure

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
MIGRATIONS_DIR="$PROJECT_ROOT/services/api/migrations"

log_info "Running database migrations for $ENVIRONMENT environment"

# Validate migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
  die "Migrations directory not found: $MIGRATIONS_DIR"
fi

# Check required environment variables
require_env DATABASE_URL

log_info "Database: ${DATABASE_URL%%\?*}"  # Hide password in output

# Create backup (prod only)
if [ "$ENVIRONMENT" = "prod" ]; then
  log_info "Creating database backup before migration"

  BACKUP_NAME="pre-migration-$(get_deployment_timestamp)"

  # Extract database details from URL
  DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*//[^/]*/\([^?]*\).*|\1|p')

  if command_exists pg_dump; then
    BACKUP_FILE="$PROJECT_ROOT/backups/${BACKUP_NAME}.sql"
    mkdir -p "$(dirname "$BACKUP_FILE")"

    log_info "Backing up to: $BACKUP_FILE"
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE" || {
      log_warning "Backup failed, but continuing with migration"
    }

    if [ -f "$BACKUP_FILE" ]; then
      log_success "Backup created successfully"
    fi
  else
    log_warning "pg_dump not found, skipping backup"
  fi
fi

# Check for pending migrations
log_info "Checking for pending migrations"
cd "$PROJECT_ROOT/services/api"

# Acquire migration lock to prevent concurrent migrations
LOCK_ACQUIRED=false
LOCK_TIMEOUT=300  # 5 minutes
LOCK_START=$(date +%s)

log_info "Acquiring migration lock"
while [ $LOCK_ACQUIRED = false ]; do
  # Try to acquire lock in database
  if psql "$DATABASE_URL" -c "SELECT pg_advisory_lock(123456789)" >/dev/null 2>&1; then
    LOCK_ACQUIRED=true
    log_success "Migration lock acquired"
  else
    ELAPSED=$(($(date +%s) - LOCK_START))
    if [ $ELAPSED -gt $LOCK_TIMEOUT ]; then
      die "Failed to acquire migration lock after ${LOCK_TIMEOUT}s"
    fi

    log_info "Waiting for migration lock... (${ELAPSED}s elapsed)"
    sleep 5
  fi
done

# Run migrations
log_info "Running migrations"
npm run migrate || {
  EXIT_CODE=$?
  log_error "Migration failed with exit code: $EXIT_CODE"

  # Release lock
  psql "$DATABASE_URL" -c "SELECT pg_advisory_unlock(123456789)" >/dev/null 2>&1 || true

  if [ "$ENVIRONMENT" = "prod" ] && [ -f "$BACKUP_FILE" ]; then
    log_error "Migration failed! Backup available at: $BACKUP_FILE"
    log_error "To rollback, run: psql $DATABASE_URL < $BACKUP_FILE"
  fi

  exit $EXIT_CODE
}

# Release lock
psql "$DATABASE_URL" -c "SELECT pg_advisory_unlock(123456789)" >/dev/null 2>&1 || true

log_success "Migrations completed successfully"

# Show current migration status
log_info "Current migration status:"
npm run migrate:status || true
