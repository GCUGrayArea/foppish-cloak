"""Pytest configuration and fixtures for AI processor tests."""

import json
import os
from pathlib import Path
from typing import Any
from unittest.mock import Mock

import pytest

from src.bedrock import BedrockConfig


@pytest.fixture
def test_config() -> BedrockConfig:
    """Provide test Bedrock configuration."""
    return BedrockConfig(
        model_id="anthropic.claude-3-5-sonnet-20241022-v2:0",
        max_tokens=4096,
        temperature_extraction=0.0,
        temperature_generation=0.7,
        max_retries=3,
        retry_base_delay=0.1,  # Faster for tests
        retry_max_delay=1.0,  # Lower for tests
        cost_per_input_token=0.000003,
        cost_per_output_token=0.000015,
        aws_region="us-east-1",
    )


@pytest.fixture
def mock_bedrock_responses() -> dict[str, Any]:
    """Load mock Bedrock response fixtures."""
    fixtures_path = Path(__file__).parent / "fixtures" / "bedrock_responses.json"
    with open(fixtures_path, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture
def mock_boto3_client(mock_bedrock_responses: dict[str, Any]) -> Mock:
    """Create mock boto3 Bedrock client."""
    mock_client = Mock()

    # Default to simple text response
    mock_client.converse.return_value = mock_bedrock_responses["simple_text_response"]

    return mock_client


@pytest.fixture(autouse=True)
def set_test_env():
    """Set test environment variables."""
    os.environ["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test"
    os.environ["AWS_REGION"] = "us-east-1"
    os.environ["BEDROCK_MODEL_ID"] = "anthropic.claude-3-5-sonnet-20241022-v2:0"
    os.environ["LOG_LEVEL"] = "DEBUG"
    yield
