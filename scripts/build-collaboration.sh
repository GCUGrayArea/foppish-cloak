#!/bin/bash
# Build collaboration service for Lambda deployment
# Creates a deployment package with all dependencies

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

# Configuration
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COLLAB_DIR="$PROJECT_ROOT/services/collaboration"
BUILD_DIR="$COLLAB_DIR/dist"
PACKAGE_DIR="$COLLAB_DIR/package"
OUTPUT_ZIP="$PROJECT_ROOT/deploy/collaboration-lambda.zip"

log_info "Building collaboration service for Lambda deployment"

# Check dependencies
check_dependencies npm

# Validate collaboration directory exists
if [ ! -d "$COLLAB_DIR" ]; then
  die "Collaboration directory not found: $COLLAB_DIR"
fi

# Clean previous build
log_info "Cleaning previous build artifacts"
rm -rf "$BUILD_DIR" "$PACKAGE_DIR" "$OUTPUT_ZIP"
mkdir -p "$PACKAGE_DIR" "$(dirname "$OUTPUT_ZIP")"

# Install dependencies
log_info "Installing production dependencies"
cd "$COLLAB_DIR"
npm ci --production --silent || die "Failed to install dependencies"

# Build TypeScript
log_info "Compiling TypeScript"
cd "$COLLAB_DIR"
npm run build || die "Failed to build TypeScript"

# Copy compiled code to package directory
log_info "Packaging Lambda function"
cp -r "$BUILD_DIR"/* "$PACKAGE_DIR/"

# Copy node_modules (production only)
cp -r "$COLLAB_DIR/node_modules" "$PACKAGE_DIR/"

# Copy package.json and package-lock.json
cp "$COLLAB_DIR/package.json" "$PACKAGE_DIR/"
cp "$COLLAB_DIR/package-lock.json" "$PACKAGE_DIR/"

# Create ZIP archive
log_info "Creating deployment package"
cd "$PACKAGE_DIR"
zip -r -q "$OUTPUT_ZIP" . || die "Failed to create ZIP archive"

# Get package size
PACKAGE_SIZE=$(du -h "$OUTPUT_ZIP" | cut -f1)
log_success "Collaboration Lambda package created: $OUTPUT_ZIP ($PACKAGE_SIZE)"

# Cleanup
log_info "Cleaning up temporary files"
rm -rf "$PACKAGE_DIR"

log_success "Collaboration service build complete"
