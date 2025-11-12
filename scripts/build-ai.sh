#!/bin/bash
# Build AI processor service for Lambda deployment
# Creates a deployment package with Python dependencies

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

# Configuration
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
AI_DIR="$PROJECT_ROOT/services/ai-processor"
PACKAGE_DIR="$AI_DIR/package"
OUTPUT_ZIP="$PROJECT_ROOT/deploy/ai-lambda.zip"

log_info "Building AI processor service for Lambda deployment"

# Check dependencies
check_dependencies python3 pip zip

# Validate AI directory exists
if [ ! -d "$AI_DIR" ]; then
  die "AI processor directory not found: $AI_DIR"
fi

# Clean previous build
log_info "Cleaning previous build artifacts"
rm -rf "$PACKAGE_DIR" "$OUTPUT_ZIP"
mkdir -p "$PACKAGE_DIR" "$(dirname "$OUTPUT_ZIP")"

# Install dependencies to package directory
log_info "Installing Python dependencies"
pip install \
  --requirement "$AI_DIR/requirements.txt" \
  --target "$PACKAGE_DIR" \
  --upgrade \
  --quiet || die "Failed to install Python dependencies"

# Copy source code
log_info "Copying source code"
cp -r "$AI_DIR/src"/* "$PACKAGE_DIR/"

# Create ZIP archive
log_info "Creating deployment package"
cd "$PACKAGE_DIR"
zip -r -q "$OUTPUT_ZIP" . || die "Failed to create ZIP archive"

# Get package size
PACKAGE_SIZE=$(du -h "$OUTPUT_ZIP" | cut -f1)
log_success "AI Lambda package created: $OUTPUT_ZIP ($PACKAGE_SIZE)"

# Check if package exceeds Lambda limit (50MB zipped, 250MB unzipped)
PACKAGE_SIZE_MB=$(stat -c%s "$OUTPUT_ZIP" 2>/dev/null || stat -f%z "$OUTPUT_ZIP" 2>/dev/null)
PACKAGE_SIZE_MB=$((PACKAGE_SIZE_MB / 1024 / 1024))

if [ "$PACKAGE_SIZE_MB" -gt 50 ]; then
  log_warning "Package size exceeds 50MB ($PACKAGE_SIZE_MB MB)"
  log_warning "Consider using Lambda layers or container images"
fi

# Cleanup
log_info "Cleaning up temporary files"
rm -rf "$PACKAGE_DIR"

log_success "AI processor service build complete"
