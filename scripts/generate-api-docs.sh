#!/bin/bash

#
# API Documentation Generator
#
# Validates and bundles the OpenAPI specification
#
# Usage: ./scripts/generate-api-docs.sh
#

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SPEC_FILE="$PROJECT_ROOT/services/api/openapi.yaml"

echo -e "${GREEN}Validating and generating API documentation...${NC}"

# Check if OpenAPI spec exists
if [ ! -f "$SPEC_FILE" ]; then
    echo -e "${RED}Error: OpenAPI spec not found at $SPEC_FILE${NC}"
    exit 1
fi

# Validate using Node script
echo -e "${GREEN}Validating OpenAPI specification...${NC}"
if node "$SCRIPT_DIR/validate-openapi.js"; then
    echo -e "${GREEN}✓ OpenAPI specification is valid${NC}"
else
    echo -e "${RED}✗ OpenAPI specification validation failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ API documentation is ready!${NC}"
echo ""
echo "To view the documentation:"
echo "  1. Start the API server: cd services/api && npm run dev"
echo "  2. Open browser: http://localhost:3000/api/docs"
echo ""
echo "OpenAPI spec files:"
echo "  - YAML: $SPEC_FILE"
echo "  - JSON: http://localhost:3000/api/docs/spec"
echo "  - YAML URL: http://localhost:3000/api/docs/spec.yaml"
