"""AWS Bedrock client for Claude AI integration."""

import json
import logging
import time
from typing import Any, Type

import boto3
from botocore.config import Config
from pydantic import BaseModel

from ..utils import (
    exponential_backoff,
    generate_correlation_id,
    log_bedrock_error,
    log_bedrock_request,
    log_bedrock_response,
)
from .config import BedrockConfig
from .exceptions import BedrockClientError, BedrockConfigurationError
from .tools import create_tool_choice, extract_tool_result, pydantic_to_tool_schema


class BedrockClient:
    """
    AWS Bedrock client for Claude AI with structured outputs.

    Features:
    - Tool calling for structured data extraction
    - Automatic retry with exponential backoff
    - Token usage tracking and cost estimation
    - Comprehensive logging for debugging
    - Support for conversation history
    """

    def __init__(
        self,
        config: BedrockConfig | None = None,
        logger: logging.Logger | None = None,
    ):
        """
        Initialize Bedrock client.

        Args:
            config: Bedrock configuration (uses default if None)
            logger: Logger instance (creates default if None)
        """
        self.config = config or BedrockConfig.from_settings()
        self.logger = logger or logging.getLogger("bedrock.client")

        # Initialize boto3 client
        try:
            boto_config = Config(
                region_name=self.config.aws_region,
                retries={"max_attempts": 0},  # We handle retries ourselves
            )
            self.client = boto3.client("bedrock-runtime", config=boto_config)
        except Exception as e:
            raise BedrockConfigurationError(
                f"Failed to initialize Bedrock client: {e}"
            ) from e

    @exponential_backoff(max_retries=3, base_delay=1.0, max_delay=60.0)
    def invoke(
        self,
        messages: list[dict[str, Any]],
        system: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        tools: list[dict[str, Any]] | None = None,
        tool_choice: dict[str, Any] | None = None,
        correlation_id: str | None = None,
        firm_id: int | None = None,
        user_id: int | None = None,
    ) -> dict[str, Any]:
        """
        Invoke Claude via Bedrock with comprehensive logging.

        Args:
            messages: Conversation messages in Claude format
            system: System prompt (optional)
            temperature: Temperature override (uses config default if None)
            max_tokens: Max tokens override (uses config default if None)
            tools: Tool definitions for structured outputs
            tool_choice: Force specific tool usage
            correlation_id: Request correlation ID for tracing
            firm_id: Firm context for multi-tenancy
            user_id: User context

        Returns:
            Bedrock API response

        Raises:
            BedrockClientError: For client-side errors (4xx)
            BedrockServerError: For server-side errors (5xx)
            BedrockThrottlingError: For rate limiting (429)
        """
        # Generate correlation ID if not provided
        if correlation_id is None:
            correlation_id = generate_correlation_id()

        # Build request body
        request_body = {
            "anthropicVersion": "bedrock-2023-05-31",
            "messages": messages,
            "maxTokens": max_tokens or self.config.max_tokens,
            "temperature": temperature
            if temperature is not None
            else self.config.temperature_extraction,
        }

        # Add optional parameters
        if system:
            request_body["system"] = system
        if tools:
            request_body["tools"] = tools
        if tool_choice:
            request_body["toolChoice"] = tool_choice

        # Estimate input tokens (rough approximation)
        prompt_tokens = self._estimate_tokens(messages, system)

        # Log request
        log_bedrock_request(
            self.logger,
            model_id=self.config.model_id,
            prompt_tokens=prompt_tokens,
            correlation_id=correlation_id,
            firm_id=firm_id,
            user_id=user_id,
            temperature=request_body["temperature"],
            max_tokens=request_body["maxTokens"],
            has_tools=tools is not None,
            tool_count=len(tools) if tools else 0,
        )

        # Invoke Bedrock API
        start_time = time.time()
        try:
            response = self.client.converse(
                modelId=self.config.model_id, **request_body
            )

            # Calculate latency
            latency_ms = (time.time() - start_time) * 1000

            # Extract token usage
            usage = response.get("usage", {})
            input_tokens = usage.get("inputTokens", prompt_tokens)
            output_tokens = usage.get("outputTokens", 0)

            # Calculate cost
            cost = self.config.calculate_cost(input_tokens, output_tokens)

            # Check for tool usage
            tool_used = None
            content = response.get("output", {}).get("message", {}).get("content", [])
            for block in content:
                if "toolUse" in block:
                    tool_used = block["toolUse"].get("name")
                    break

            # Log response
            log_bedrock_response(
                self.logger,
                model_id=self.config.model_id,
                prompt_tokens=input_tokens,
                completion_tokens=output_tokens,
                latency_ms=latency_ms,
                correlation_id=correlation_id,
                firm_id=firm_id,
                user_id=user_id,
                cost_estimate=cost,
                tool_used=tool_used,
            )

            return response

        except Exception as e:
            # Log error
            log_bedrock_error(
                self.logger,
                error=e,
                model_id=self.config.model_id,
                correlation_id=correlation_id,
                firm_id=firm_id,
                user_id=user_id,
            )
            raise

    def invoke_with_tool(
        self,
        messages: list[dict[str, Any]],
        tool_schema: Type[BaseModel],
        tool_name: str,
        tool_description: str,
        system: str | None = None,
        temperature: float | None = None,
        correlation_id: str | None = None,
        firm_id: int | None = None,
        user_id: int | None = None,
    ) -> BaseModel:
        """
        Invoke Claude with forced tool usage for structured outputs.

        Args:
            messages: Conversation messages
            tool_schema: Pydantic model defining expected output
            tool_name: Name of the tool
            tool_description: Description of what the tool does
            system: System prompt
            temperature: Temperature override
            correlation_id: Request correlation ID
            firm_id: Firm context
            user_id: User context

        Returns:
            Validated Pydantic model instance

        Raises:
            BedrockValidationError: If response doesn't match schema
        """
        # Create tool definition
        tool = pydantic_to_tool_schema(tool_schema, tool_name, tool_description)

        # Force tool usage
        tool_choice = create_tool_choice(tool_name)

        # Invoke Bedrock
        response = self.invoke(
            messages=messages,
            system=system,
            temperature=temperature,
            tools=[tool],
            tool_choice=tool_choice,
            correlation_id=correlation_id,
            firm_id=firm_id,
            user_id=user_id,
        )

        # Extract and validate result
        return extract_tool_result(response, tool_schema)

    def _estimate_tokens(
        self, messages: list[dict[str, Any]], system: str | None = None
    ) -> int:
        """
        Estimate token count for messages (rough approximation).

        Args:
            messages: Conversation messages
            system: System prompt

        Returns:
            Estimated token count
        """
        # Rough approximation: 4 characters per token
        char_count = 0

        if system:
            char_count += len(system)

        for message in messages:
            content = message.get("content", "")
            if isinstance(content, str):
                char_count += len(content)
            elif isinstance(content, list):
                for block in content:
                    if isinstance(block, dict):
                        if "text" in block:
                            char_count += len(block["text"])

        return char_count // 4
