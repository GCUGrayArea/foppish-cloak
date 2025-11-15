# Import additional resources that were missed
cd $PSScriptRoot

$imports = @(
    @{resource="aws_lambda_function.websocket_handler"; id="demand-letters-dev-websocket-handler"},
    @{resource="aws_iam_policy.websocket_lambda_policy"; id="arn:aws:iam::971422717446:policy/demand-letters-dev-websocket-lambda-policy"},
    @{resource="aws_iam_policy.lambda_ai_policy"; id="arn:aws:iam::971422717446:policy/demand-letters-dev-lambda-ai-policy"},
    @{resource="aws_kms_alias.rds"; id="alias/demand-letters-dev-rds"}
)

foreach ($import in $imports) {
    Write-Host "Importing $($import.resource)..." -ForegroundColor Cyan
    terraform import -var-file="environments/dev.tfvars" $import.resource $import.id 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Success" -ForegroundColor Green
    } else {
        Write-Host "  Failed (may already be imported)" -ForegroundColor Yellow
    }
}

# Import security groups
$rdsSgId = (aws ec2 describe-security-groups --filters "Name=group-name,Values=demand-letters-dev-rds-sg" --query 'SecurityGroups[0].GroupId' --output text)
if ($rdsSgId -and $rdsSgId -ne "None") {
    Write-Host "Importing RDS security group: $rdsSgId" -ForegroundColor Cyan
    terraform import -var-file="environments/dev.tfvars" aws_security_group.rds $rdsSgId 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Host "  Success" -ForegroundColor Green } else { Write-Host "  Failed" -ForegroundColor Yellow }
}

# Import VPC endpoint
$vpcEndpointId = (aws ec2 describe-vpc-endpoints --filters "Name=service-name,Values=com.amazonaws.us-east-1.s3" "Name=vpc-id,Values=vpc-03cd6462b46350c8e" --query 'VpcEndpoints[0].VpcEndpointId' --output text)
if ($vpcEndpointId -and $vpcEndpointId -ne "None") {
    Write-Host "Importing VPC endpoint: $vpcEndpointId" -ForegroundColor Cyan
    terraform import -var-file="environments/dev.tfvars" aws_vpc_endpoint.s3 $vpcEndpointId 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Host "  Success" -ForegroundColor Green } else { Write-Host "  Failed" -ForegroundColor Yellow }
}

# Import X-Ray groups - need ARNs
$xrayGroups = @("api-service", "ai-processor", "errors", "slow-traces", "bedrock-calls")
foreach ($groupName in $xrayGroups) {
    $fullName = "demand-letters-dev-$groupName"
    Write-Host "Importing X-Ray group: $fullName" -ForegroundColor Cyan
    $groupArn = (aws xray get-group --group-name $fullName --query 'Group.GroupARN' --output text 2>$null)
    if ($groupArn) {
        $resourceName = $groupName.Replace("-", "_")
        terraform import -var-file="environments/dev.tfvars" "aws_xray_group.$resourceName" $groupArn 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { Write-Host "  Success" -ForegroundColor Green } else { Write-Host "  Failed" -ForegroundColor Yellow }
    }
}

# Import KMS key
$kmsKeyId = (aws kms describe-key --key-id alias/demand-letters-dev-rds --query 'KeyMetadata.KeyId' --output text 2>$null)
if ($kmsKeyId) {
    Write-Host "Importing KMS key: $kmsKeyId" -ForegroundColor Cyan
    terraform import -var-file="environments/dev.tfvars" aws_kms_key.rds $kmsKeyId 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Host "  Success" -ForegroundColor Green } else { Write-Host "  Failed" -ForegroundColor Yellow }
}

Write-Host "`nImport complete!" -ForegroundColor Green
