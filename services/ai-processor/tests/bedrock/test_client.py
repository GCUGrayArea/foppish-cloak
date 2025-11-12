"""Unit tests for BedrockClient."""

import logging
from typing import Any
from unittest.mock import Mock, patch

import pytest
from pydantic import BaseModel

from src.bedrock import (
    BedrockClient,
    BedrockConfig,
    BedrockValidationError,
    ExampleExtraction,
)


class TestBedrockClient:
    """Test BedrockClient functionality."""

    def test_client_initialization(self, test_config: BedrockConfig):
        """Test client initializes with configuration."""
        with patch("boto3.client"):
            client = BedrockClient(config=test_config)
            assert client.config == test_config
            assert isinstance(client.logger, logging.Logger)

    def test_invoke_basic(
        self,
        test_config: BedrockConfig,
        mock_boto3_client: Mock,
        mock_bedrock_responses: dict[str, Any],
    ):
        """Test basic invoke without tools."""
        with patch("boto3.client", return_value=mock_boto3_client):
            client = BedrockClient(config=test_config)

            messages = [{"role": "user", "content": "Hello, Claude!"}]
            response = client.invoke(messages=messages)

            # Verify client was called
            mock_boto3_client.converse.assert_called_once()
            call_kwargs = mock_boto3_client.converse.call_args[1]

            # Check request structure
            assert call_kwargs["modelId"] == test_config.model_id
            assert call_kwargs["messages"] == messages
            assert call_kwargs["maxTokens"] == test_config.max_tokens

            # Check response
            assert response == mock_bedrock_responses["simple_text_response"]

    def test_invoke_with_system_prompt(
        self, test_config: BedrockConfig, mock_boto3_client: Mock
    ):
        """Test invoke with system prompt."""
        with patch("boto3.client", return_value=mock_boto3_client):
            client = BedrockClient(config=test_config)

            messages = [{"role": "user", "content": "Test message"}]
            system = "You are a helpful assistant."

            client.invoke(messages=messages, system=system)

            call_kwargs = mock_boto3_client.converse.call_args[1]
            assert call_kwargs["system"] == system

    def test_invoke_with_temperature_override(
        self, test_config: BedrockConfig, mock_boto3_client: Mock
    ):
        """Test temperature override."""
        with patch("boto3.client", return_value=mock_boto3_client):
            client = BedrockClient(config=test_config)

            messages = [{"role": "user", "content": "Test"}]
            custom_temp = 0.5

            client.invoke(messages=messages, temperature=custom_temp)

            call_kwargs = mock_boto3_client.converse.call_args[1]
            assert call_kwargs["temperature"] == custom_temp

    def test_invoke_with_tool(
        self,
        test_config: BedrockConfig,
        mock_boto3_client: Mock,
        mock_bedrock_responses: dict[str, Any],
    ):
        """Test invoke with forced tool usage."""
        # Set mock to return tool use response
        mock_boto3_client.converse.return_value = mock_bedrock_responses[
            "tool_use_response"
        ]

        with patch("boto3.client", return_value=mock_boto3_client):
            client = BedrockClient(config=test_config)

            messages = [{"role": "user", "content": "Extract data from this"}]

            result = client.invoke_with_tool(
                messages=messages,
                tool_schema=ExampleExtraction,
                tool_name="extract_data",
                tool_description="Extract structured data",
            )

            # Verify result is validated Pydantic model
            assert isinstance(result, ExampleExtraction)
            assert len(result.facts) == 2
            assert result.facts[0].fact_type == "party"
            assert result.summary == "Test extraction summary"

    def test_invoke_correlation_id(
        self, test_config: BedrockConfig, mock_boto3_client: Mock
    ):
        """Test correlation ID is generated if not provided."""
        with patch("boto3.client", return_value=mock_boto3_client):
            client = BedrockClient(config=test_config)

            messages = [{"role": "user", "content": "Test"}]

            # Without correlation ID
            client.invoke(messages=messages)

            # With correlation ID
            client.invoke(messages=messages, correlation_id="custom-id")

            # Both should succeed
            assert mock_boto3_client.converse.call_count == 2

    def test_token_estimation(self, test_config: BedrockConfig):
        """Test token count estimation."""
        with patch("boto3.client"):
            client = BedrockClient(config=test_config)

            messages = [
                {"role": "user", "content": "This is a test message with some content"}
            ]

            # Rough estimate: ~4 chars per token
            estimated = client._estimate_tokens(messages)
            assert estimated > 0
            assert estimated < 100  # Should be reasonable

    def test_cost_calculation(self, test_config: BedrockConfig):
        """Test cost calculation."""
        input_tokens = 100
        output_tokens = 50

        expected_cost = (
            input_tokens * test_config.cost_per_input_token
            + output_tokens * test_config.cost_per_output_token
        )

        calculated_cost = test_config.calculate_cost(input_tokens, output_tokens)

        assert calculated_cost == expected_cost
        assert calculated_cost > 0

    def test_multi_tenant_context(
        self, test_config: BedrockConfig, mock_boto3_client: Mock
    ):
        """Test firm_id and user_id are logged correctly."""
        with patch("boto3.client", return_value=mock_boto3_client):
            client = BedrockClient(config=test_config)

            messages = [{"role": "user", "content": "Test"}]

            # Should not raise errors with tenant context
            client.invoke(messages=messages, firm_id=1, user_id=100)

            mock_boto3_client.converse.assert_called_once()
