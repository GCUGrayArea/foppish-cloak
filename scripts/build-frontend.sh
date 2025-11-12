#!/bin/bash
# Build frontend for S3 + CloudFront deployment
# Creates optimized production build

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

# Configuration
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BUILD_DIR="$FRONTEND_DIR/dist"

log_info "Building frontend for production"

# Check dependencies
check_dependencies npm

# Validate frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
  die "Frontend directory not found: $FRONTEND_DIR"
fi

# Clean previous build
log_info "Cleaning previous build artifacts"
rm -rf "$BUILD_DIR"

# Install dependencies
log_info "Installing dependencies"
cd "$FRONTEND_DIR"
npm ci --silent || die "Failed to install dependencies"

# Build with Vite
log_info "Building with Vite (production mode)"
cd "$FRONTEND_DIR"
npm run build || die "Failed to build frontend"

# Validate build output
if [ ! -d "$BUILD_DIR" ]; then
  die "Build directory not found: $BUILD_DIR"
fi

if [ ! -f "$BUILD_DIR/index.html" ]; then
  die "index.html not found in build directory"
fi

# Get build size
BUILD_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
log_success "Frontend build complete: $BUILD_DIR ($BUILD_SIZE)"

# List main build artifacts
log_info "Build artifacts:"
ls -lh "$BUILD_DIR" 2>/dev/null || true

log_success "Frontend build ready for deployment"
