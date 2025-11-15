# Import remaining resources
cd $PSScriptRoot

$imports = @(
    @{resource="aws_s3_bucket.documents"; id="demand-letters-dev-documents"},
    @{resource="aws_s3_bucket.lambda_deployments"; id="demand-letters-dev-lambda-deployments"},
    @{resource="aws_secretsmanager_secret.db_credentials"; id="demand-letters-dev/database/master"},
    @{resource="aws_secretsmanager_secret.jwt_secret"; id="demand-letters-dev/jwt/secret"},
    @{resource="aws_secretsmanager_secret.api_keys"; id="demand-letters-dev/api/keys"},
    @{resource="aws_db_subnet_group.main"; id="demand-letters-dev-db-subnet-group"},
    @{resource="aws_iam_policy.websocket_rds_access"; id="arn:aws:iam::971422717446:policy/demand-letters-dev-websocket-rds-access"},
    @{resource="aws_iam_policy.xray"; id="arn:aws:iam::971422717446:policy/demand-letters-dev-xray-policy"},
    @{resource="aws_xray_sampling_rule.main"; id="demand-letters-dev-main"},
    @{resource="aws_xray_sampling_rule.errors"; id="demand-letters-dev-errors"},
    @{resource="aws_xray_group.api_service"; id="demand-letters-dev-api-service"},
    @{resource="aws_xray_group.ai_processor"; id="demand-letters-dev-ai-processor"},
    @{resource="aws_xray_group.errors"; id="demand-letters-dev-errors"},
    @{resource="aws_xray_group.slow_traces"; id="demand-letters-dev-slow-traces"},
    @{resource="aws_xray_group.bedrock_calls"; id="demand-letters-dev-bedrock-calls"}
)

foreach ($import in $imports) {
    Write-Host "Importing $($import.resource)..." -ForegroundColor Cyan
    terraform import -var-file="environments/dev.tfvars" $import.resource $import.id 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Success" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Failed" -ForegroundColor Red
    }
}

# Get and import security groups
Write-Host "Getting security group IDs..." -ForegroundColor Cyan
$lambdaSgId = (aws ec2 describe-security-groups --filters "Name=group-name,Values=demand-letters-dev-lambda-sg" --query 'SecurityGroups[0].GroupId' --output text)
$rdsSgId = (aws ec2 describe-security-groups --filters "Name=group-name,Values=demand-letters-dev-rds-sg" --query 'SecurityGroups[0].GroupId' --output text)

if ($lambdaSgId -and $lambdaSgId -ne "None") {
    Write-Host "Importing Lambda security group: $lambdaSgId" -ForegroundColor Cyan
    terraform import -var-file="environments/dev.tfvars" aws_security_group.lambda $lambdaSgId 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Host "  ✓ Success" -ForegroundColor Green } else { Write-Host "  ✗ Failed" -ForegroundColor Red }
}

if ($rdsSgId -and $rdsSgId -ne "None") {
    Write-Host "Importing RDS security group: $rdsSgId" -ForegroundColor Cyan
    terraform import -var-file="environments/dev.tfvars" aws_security_group.rds $rdsSgId 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Host "  ✓ Success" -ForegroundColor Green } else { Write-Host "  ✗ Failed" -ForegroundColor Red }
}

# Get and import VPC endpoint
Write-Host "Getting VPC endpoint ID..." -ForegroundColor Cyan
$vpcEndpointId = (aws ec2 describe-vpc-endpoints --filters "Name=service-name,Values=com.amazonaws.us-east-1.s3" "Name=vpc-id,Values=vpc-03cd6462b46350c8e" --query 'VpcEndpoints[0].VpcEndpointId' --output text)
if ($vpcEndpointId -and $vpcEndpointId -ne "None") {
    Write-Host "Importing VPC endpoint: $vpcEndpointId" -ForegroundColor Cyan
    terraform import -var-file="environments/dev.tfvars" aws_vpc_endpoint.s3 $vpcEndpointId 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Host "  ✓ Success" -ForegroundColor Green } else { Write-Host "  ✗ Failed" -ForegroundColor Red }
}

# Get and import KMS key
Write-Host "Getting KMS key ID..." -ForegroundColor Cyan
$kmsKeyId = (aws kms describe-key --key-id alias/demand-letters-dev-rds --query 'KeyMetadata.KeyId' --output text 2>$null)
if ($kmsKeyId) {
    Write-Host "Importing KMS key: $kmsKeyId" -ForegroundColor Cyan
    terraform import -var-file="environments/dev.tfvars" aws_kms_key.rds $kmsKeyId 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Host "  ✓ Success" -ForegroundColor Green } else { Write-Host "  ✗ Failed" -ForegroundColor Red }

    Write-Host "Importing KMS alias..." -ForegroundColor Cyan
    terraform import -var-file="environments/dev.tfvars" aws_kms_alias.rds alias/demand-letters-dev-rds 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Host "  ✓ Success" -ForegroundColor Green } else { Write-Host "  ✗ Failed" -ForegroundColor Red }
}

Write-Host "`nImport complete!" -ForegroundColor Green
