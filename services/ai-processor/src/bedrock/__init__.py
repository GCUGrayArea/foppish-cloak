"""AWS Bedrock integration for Claude AI."""

from .client import BedrockClient
from .config import BedrockConfig
from .exceptions import (
    BedrockClientError,
    BedrockConfigurationError,
    BedrockError,
    BedrockServerError,
    BedrockThrottlingError,
    BedrockValidationError,
)
from .tools import (
    ExampleExtraction,
    ExtractedFact,
    create_tool_choice,
    extract_tool_result,
    pydantic_to_tool_schema,
)

__all__ = [
    "BedrockClient",
    "BedrockConfig",
    "BedrockError",
    "BedrockClientError",
    "BedrockServerError",
    "BedrockThrottlingError",
    "BedrockValidationError",
    "BedrockConfigurationError",
    "pydantic_to_tool_schema",
    "create_tool_choice",
    "extract_tool_result",
    "ExtractedFact",
    "ExampleExtraction",
]
