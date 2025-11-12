#!/usr/bin/env python3
"""
Quick test script to verify AWS Bedrock access
Tests connectivity to Claude 3.5 Sonnet before deployment
"""

import sys
import json

try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
except ImportError:
    print("[ERROR] Error: boto3 not installed")
    print("\nInstall with: pip install boto3")
    sys.exit(1)

def test_bedrock_access():
    """Test Bedrock access by invoking Claude 3.5 Sonnet"""

    print("Testing AWS Bedrock Access...\n")

    # Check AWS credentials
    try:
        sts = boto3.client('sts')
        identity = sts.get_caller_identity()
        print("[OK] AWS Credentials Valid")
        print(f"   Account: {identity['Account']}")
        print(f"   User/Role: {identity['Arn'].split('/')[-1]}")
        print()
    except NoCredentialsError:
        print("[ERROR] No AWS credentials found")
        print("\nConfigure credentials with: aws configure")
        return False
    except Exception as e:
        print(f"[ERROR] Error checking credentials: {e}")
        return False

    # Test Bedrock - List Models
    try:
        bedrock = boto3.client('bedrock', region_name='us-east-1')
        print("Listing available Claude models...")

        response = bedrock.list_foundation_models(
            byProvider='Anthropic'
        )

        claude_models = [
            model for model in response.get('modelSummaries', [])
            if 'claude' in model['modelId'].lower()
        ]

        if claude_models:
            print(f"[OK] Found {len(claude_models)} Claude models:")
            for model in claude_models[:5]:  # Show first 5
                print(f"   - {model['modelId']}")
        else:
            print("[WARN] No Claude models found")
        print()

    except Exception as e:
        print(f"[WARN] Could not list models: {e}")
        print("   (This is non-critical, continuing with invoke test...)\n")

    # Test Bedrock Runtime - Invoke Model
    try:
        bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')

        # Use inference profile (required for on-demand access)
        # Latest: Claude Sonnet 4.5
        model_id = 'us.anthropic.claude-sonnet-4-5-20250929-v1:0'

        print(f"Testing model invocation: {model_id}")
        print("   Sending test prompt: 'What is 2+2? Answer in one word.'")

        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "messages": [
                {
                    "role": "user",
                    "content": "What is 2+2? Answer in one word."
                }
            ],
            "max_tokens": 10,
            "temperature": 0
        }

        response = bedrock_runtime.invoke_model(
            modelId=model_id,
            body=json.dumps(request_body)
        )

        # Parse response
        response_body = json.loads(response['body'].read())

        if 'content' in response_body and len(response_body['content']) > 0:
            answer = response_body['content'][0]['text']
            print(f"\n[SUCCESS] Bedrock is working!")
            print(f"   Claude responded: '{answer}'")
            print(f"\n   Model: {model_id}")
            print(f"   Region: us-east-1")
            print(f"   Input tokens: {response_body.get('usage', {}).get('input_tokens', 'N/A')}")
            print(f"   Output tokens: {response_body.get('usage', {}).get('output_tokens', 'N/A')}")
            return True
        else:
            print(f"[WARN] Unexpected response format: {response_body}")
            return False

    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']

        print(f"\n[ERROR] Bedrock invocation failed")
        print(f"   Error Code: {error_code}")
        print(f"   Error Message: {error_message}")

        if error_code == 'AccessDeniedException':
            print("\nPossible solutions:")
            print("   1. IAM user/role needs 'bedrock:InvokeModel' permission")
            print("   2. Try a different AWS region (Bedrock isn't in all regions)")
            print("   3. Check if model access is enabled in Bedrock console")
        elif error_code == 'ResourceNotFoundException':
            print("\nModel not found. Trying fallback model...")
            # Try older version
            return test_fallback_model(bedrock_runtime)
        elif error_code == 'ValidationException':
            print("\nRequest validation error - check request format")

        return False
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
        print(f"   Type: {type(e).__name__}")
        return False

def test_fallback_model(bedrock_runtime):
    """Try older Claude 3.5 Sonnet v1 as fallback"""
    try:
        model_id = 'anthropic.claude-3-5-sonnet-20240620-v1:0'
        print(f"\n   Trying fallback model: {model_id}")

        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "messages": [{"role": "user", "content": "Say 'hello'"}],
            "max_tokens": 10
        }

        response = bedrock_runtime.invoke_model(
            modelId=model_id,
            body=json.dumps(request_body)
        )

        response_body = json.loads(response['body'].read())
        if 'content' in response_body:
            answer = response_body['content'][0]['text']
            print(f"   [OK] Fallback model works! Response: '{answer}'")
            print(f"\n   Note: Update terraform to use this model ID:")
            print(f"   bedrock_model_id = \"{model_id}\"")
            return True
    except Exception as e:
        print(f"   [ERROR] Fallback also failed: {e}")

    return False

if __name__ == "__main__":
    print("=" * 60)
    print("AWS Bedrock Access Test")
    print("=" * 60)
    print()

    success = test_bedrock_access()

    print()
    print("=" * 60)
    if success:
        print("[PASS] TEST PASSED - Ready to deploy!")
        print("\nYou can proceed with:")
        print("  bash scripts/deploy-infrastructure.sh dev")
        sys.exit(0)
    else:
        print("[FAIL] TEST FAILED - Fix issues before deploying")
        print("\nTroubleshooting:")
        print("  1. Check AWS credentials: aws sts get-caller-identity")
        print("  2. Verify region has Bedrock: us-east-1, us-west-2, etc.")
        print("  3. Check IAM permissions for bedrock:InvokeModel")
        print("  4. Review error messages above")
        sys.exit(1)
