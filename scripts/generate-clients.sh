#!/bin/bash

#
# SDK Client Generation Script
#
# Generates TypeScript and Python client SDKs from OpenAPI specification
# Uses openapi-generator-cli (requires Java runtime)
#
# Usage: ./scripts/generate-clients.sh
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
OUTPUT_DIR="$PROJECT_ROOT/clients"

echo -e "${GREEN}Generating API client SDKs...${NC}"

# Check if OpenAPI spec exists
if [ ! -f "$SPEC_FILE" ]; then
    echo -e "${RED}Error: OpenAPI spec not found at $SPEC_FILE${NC}"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Check if openapi-generator-cli is available
if ! command -v openapi-generator-cli &> /dev/null; then
    echo -e "${YELLOW}Warning: openapi-generator-cli not found.${NC}"
    echo "Install it with: npm install @openapitools/openapi-generator-cli -g"
    echo ""
    echo "Alternative: Use npx to run it without global installation:"
    echo "  npx @openapitools/openapi-generator-cli generate ..."
    echo ""
    read -p "Would you like to use npx? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    GENERATOR_CMD="npx @openapitools/openapi-generator-cli"
else
    GENERATOR_CMD="openapi-generator-cli"
fi

# Generate TypeScript client
echo -e "${GREEN}Generating TypeScript client...${NC}"
$GENERATOR_CMD generate \
    -i "$SPEC_FILE" \
    -g typescript-axios \
    -o "$OUTPUT_DIR/typescript" \
    --additional-properties=npmName=@demand-letter/api-client,npmVersion=1.0.0,supportsES6=true,withInterfaces=true

echo -e "${GREEN}✓ TypeScript client generated at $OUTPUT_DIR/typescript${NC}"

# Generate Python client
echo -e "${GREEN}Generating Python client...${NC}"
$GENERATOR_CMD generate \
    -i "$SPEC_FILE" \
    -g python \
    -o "$OUTPUT_DIR/python" \
    --additional-properties=packageName=demand_letter_api,projectName=demand-letter-api,packageVersion=1.0.0

echo -e "${GREEN}✓ Python client generated at $OUTPUT_DIR/python${NC}"

# Create .gitignore for clients directory
cat > "$OUTPUT_DIR/.gitignore" << EOF
# Generated SDK clients (not committed to repo)
*
!.gitignore
!README.md
EOF

# Create README for clients
cat > "$OUTPUT_DIR/README.md" << EOF
# Generated API Clients

This directory contains auto-generated API clients for the Demand Letter Generator API.

## TypeScript Client

Location: \`typescript/\`

### Installation

\`\`\`bash
cd typescript
npm install
npm run build
\`\`\`

### Usage

\`\`\`typescript
import { Configuration, AuthenticationApi, DemandLettersApi } from '@demand-letter/api-client';

const config = new Configuration({
  basePath: 'https://api.demandlettergenerator.com/v1',
  accessToken: 'your-jwt-token',
});

const authApi = new AuthenticationApi(config);
const lettersApi = new DemandLettersApi(config);

// Login
const loginResponse = await authApi.login({
  email: 'user@example.com',
  password: 'password',
  firmId: 'firm-id',
});

// Create demand letter
const letter = await lettersApi.createDemandLetter({
  title: 'New Demand Letter',
});
\`\`\`

## Python Client

Location: \`python/\`

### Installation

\`\`\`bash
cd python
pip install -e .
\`\`\`

### Usage

\`\`\`python
import demand_letter_api
from demand_letter_api.api import authentication_api, demand_letters_api
from demand_letter_api.model.login_request import LoginRequest
from demand_letter_api.model.create_demand_letter_request import CreateDemandLetterRequest

# Configure API client
configuration = demand_letter_api.Configuration(
    host="https://api.demandlettergenerator.com/v1"
)

# Login
with demand_letter_api.ApiClient(configuration) as api_client:
    auth_api_instance = authentication_api.AuthenticationApi(api_client)
    login_request = LoginRequest(
        email="user@example.com",
        password="password",
        firm_id="firm-id"
    )
    login_response = auth_api_instance.login(login_request)

    # Set access token
    configuration.access_token = login_response.access_token

# Create demand letter
with demand_letter_api.ApiClient(configuration) as api_client:
    letters_api_instance = demand_letters_api.DemandLettersApi(api_client)
    create_request = CreateDemandLetterRequest(
        title="New Demand Letter"
    )
    letter = letters_api_instance.create_demand_letter(create_request)
    print(f"Created letter: {letter.id}")
\`\`\`

## Regeneration

To regenerate clients after OpenAPI spec changes:

\`\`\`bash
./scripts/generate-clients.sh
\`\`\`

## Note

These clients are auto-generated and not committed to the repository.
They should be regenerated whenever the OpenAPI specification changes.
EOF

echo ""
echo -e "${GREEN}✓ All clients generated successfully!${NC}"
echo ""
echo "Clients are located at: $OUTPUT_DIR"
echo "See $OUTPUT_DIR/README.md for usage instructions"
echo ""
echo -e "${YELLOW}Note: Clients are gitignored and should be regenerated when needed.${NC}"
