"""Tool calling definitions for structured outputs with Claude."""

from typing import Any, Type

from pydantic import BaseModel


def pydantic_to_tool_schema(model: Type[BaseModel], name: str, description: str) -> dict[str, Any]:
    """
    Convert Pydantic model to Bedrock tool calling schema.

    Args:
        model: Pydantic model class
        name: Tool name
        description: Tool description

    Returns:
        Tool schema dictionary for Bedrock API
    """
    # Get JSON schema from Pydantic model
    json_schema = model.model_json_schema()

    # Convert to Bedrock tool format
    tool_schema = {
        "toolSpec": {
            "name": name,
            "description": description,
            "inputSchema": {
                "json": json_schema
            }
        }
    }

    return tool_schema


def create_tool_choice(tool_name: str) -> dict[str, Any]:
    """
    Create tool choice directive to force Claude to use specific tool.

    Args:
        tool_name: Name of the tool to use

    Returns:
        Tool choice configuration for Bedrock API
    """
    return {
        "tool": {
            "name": tool_name
        }
    }


def extract_tool_result(response: dict[str, Any], model: Type[BaseModel]) -> BaseModel:
    """
    Extract and validate tool result from Bedrock response.

    Args:
        response: Bedrock API response
        model: Pydantic model to validate against

    Returns:
        Validated Pydantic model instance

    Raises:
        BedrockValidationError: If response doesn't contain valid tool result
    """
    from .exceptions import BedrockValidationError

    # Navigate response structure
    content = response.get("output", {}).get("message", {}).get("content", [])

    # Find tool use block
    tool_use = None
    for block in content:
        if "toolUse" in block:
            tool_use = block["toolUse"]
            break

    if not tool_use:
        raise BedrockValidationError("No tool use found in response")

    # Extract input data
    tool_input = tool_use.get("input", {})

    # Validate with Pydantic model
    try:
        return model.model_validate(tool_input)
    except Exception as e:
        raise BedrockValidationError(f"Tool output validation failed: {e}") from e


# Example tool schemas (can be used as templates)

class ExtractedFact(BaseModel):
    """Example schema for extracted facts."""

    fact_type: str
    content: str
    confidence: float


class ExampleExtraction(BaseModel):
    """Example schema for document extraction."""

    facts: list[ExtractedFact]
    summary: str
