#
# SDK Client Generation Script (PowerShell)
#
# Generates TypeScript and Python client SDKs from OpenAPI specification
# Uses openapi-generator-cli (requires Java runtime)
#
# Usage: .\scripts\generate-clients.ps1
#

$ErrorActionPreference = "Stop"

# Directories
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$SpecFile = Join-Path $ProjectRoot "services\api\openapi.yaml"
$OutputDir = Join-Path $ProjectRoot "clients"

Write-Host "Generating API client SDKs..." -ForegroundColor Green

# Check if OpenAPI spec exists
if (-not (Test-Path $SpecFile)) {
    Write-Host "Error: OpenAPI spec not found at $SpecFile" -ForegroundColor Red
    exit 1
}

# Create output directory if it doesn't exist
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# Check if openapi-generator-cli is available
$GeneratorCmd = Get-Command openapi-generator-cli -ErrorAction SilentlyContinue
if (-not $GeneratorCmd) {
    Write-Host "Warning: openapi-generator-cli not found." -ForegroundColor Yellow
    Write-Host "Install it with: npm install @openapitools/openapi-generator-cli -g"
    Write-Host ""
    Write-Host "Alternative: Use npx to run it without global installation"
    Write-Host ""
    $response = Read-Host "Would you like to use npx? (y/n)"
    if ($response -ne "y") {
        exit 1
    }
    $GeneratorCmd = "npx"
    $GeneratorArgs = "@openapitools/openapi-generator-cli"
} else {
    $GeneratorCmd = "openapi-generator-cli"
    $GeneratorArgs = ""
}

# Generate TypeScript client
Write-Host "Generating TypeScript client..." -ForegroundColor Green
$TypeScriptOutput = Join-Path $OutputDir "typescript"
if ($GeneratorArgs) {
    & $GeneratorCmd $GeneratorArgs generate `
        -i $SpecFile `
        -g typescript-axios `
        -o $TypeScriptOutput `
        --additional-properties=npmName=@demand-letter/api-client,npmVersion=1.0.0,supportsES6=true,withInterfaces=true
} else {
    & $GeneratorCmd generate `
        -i $SpecFile `
        -g typescript-axios `
        -o $TypeScriptOutput `
        --additional-properties=npmName=@demand-letter/api-client,npmVersion=1.0.0,supportsES6=true,withInterfaces=true
}

Write-Host "✓ TypeScript client generated at $TypeScriptOutput" -ForegroundColor Green

# Generate Python client
Write-Host "Generating Python client..." -ForegroundColor Green
$PythonOutput = Join-Path $OutputDir "python"
if ($GeneratorArgs) {
    & $GeneratorCmd $GeneratorArgs generate `
        -i $SpecFile `
        -g python `
        -o $PythonOutput `
        --additional-properties=packageName=demand_letter_api,projectName=demand-letter-api,packageVersion=1.0.0
} else {
    & $GeneratorCmd generate `
        -i $SpecFile `
        -g python `
        -o $PythonOutput `
        --additional-properties=packageName=demand_letter_api,projectName=demand-letter-api,packageVersion=1.0.0
}

Write-Host "✓ Python client generated at $PythonOutput" -ForegroundColor Green

# Create .gitignore for clients directory
$GitignorePath = Join-Path $OutputDir ".gitignore"
@"
# Generated SDK clients (not committed to repo)
*
!.gitignore
!README.md
"@ | Out-File -FilePath $GitignorePath -Encoding UTF8

# Create README for clients
$ReadmePath = Join-Path $OutputDir "README.md"
@"
# Generated API Clients

This directory contains auto-generated API clients for the Demand Letter Generator API.

## TypeScript Client

Location: ``typescript/``

### Installation

``````bash
cd typescript
npm install
npm run build
``````

### Usage

``````typescript
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
``````

## Python Client

Location: ``python/``

### Installation

``````bash
cd python
pip install -e .
``````

### Usage

``````python
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
``````

## Regeneration

To regenerate clients after OpenAPI spec changes:

``````powershell
.\scripts\generate-clients.ps1
``````

## Note

These clients are auto-generated and not committed to the repository.
They should be regenerated whenever the OpenAPI specification changes.
"@ | Out-File -FilePath $ReadmePath -Encoding UTF8

Write-Host ""
Write-Host "✓ All clients generated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Clients are located at: $OutputDir"
Write-Host "See $OutputDir\README.md for usage instructions"
Write-Host ""
Write-Host "Note: Clients are gitignored and should be regenerated when needed." -ForegroundColor Yellow
