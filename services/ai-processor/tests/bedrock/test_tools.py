"""Unit tests for tool calling functionality."""

from typing import Any

import pytest
from pydantic import BaseModel, Field

from src.bedrock.exceptions import BedrockValidationError
from src.bedrock.tools import (
    ExampleExtraction,
    create_tool_choice,
    extract_tool_result,
    pydantic_to_tool_schema,
)


class SimpleModel(BaseModel):
    """Simple test model."""

    name: str
    age: int


class ComplexModel(BaseModel):
    """Complex test model with nested structure."""

    title: str
    items: list[str]
    metadata: dict[str, Any]
    count: int = Field(default=0, description="Item count")


class TestToolSchema:
    """Test Pydantic to tool schema conversion."""

    def test_simple_model_conversion(self):
        """Test converting simple Pydantic model to tool schema."""
        tool = pydantic_to_tool_schema(
            SimpleModel, "simple_tool", "A simple tool"
        )

        assert "toolSpec" in tool
        assert tool["toolSpec"]["name"] == "simple_tool"
        assert tool["toolSpec"]["description"] == "A simple tool"
        assert "inputSchema" in tool["toolSpec"]
        assert "json" in tool["toolSpec"]["inputSchema"]

    def test_complex_model_conversion(self):
        """Test converting complex model with nested fields."""
        tool = pydantic_to_tool_schema(
            ComplexModel, "complex_tool", "A complex tool"
        )

        schema = tool["toolSpec"]["inputSchema"]["json"]
        properties = schema.get("properties", {})

        # Check all fields are present
        assert "title" in properties
        assert "items" in properties
        assert "metadata" in properties
        assert "count" in properties

        # Check types
        assert properties["title"]["type"] == "string"
        assert properties["items"]["type"] == "array"
        assert properties["metadata"]["type"] == "object"

    def test_tool_choice_creation(self):
        """Test creating tool choice directive."""
        choice = create_tool_choice("my_tool")

        assert "tool" in choice
        assert choice["tool"]["name"] == "my_tool"


class TestToolResultExtraction:
    """Test extracting tool results from responses."""

    def test_extract_valid_tool_result(
        self, mock_bedrock_responses: dict[str, Any]
    ):
        """Test extracting valid tool result."""
        response = mock_bedrock_responses["tool_use_response"]

        result = extract_tool_result(response, ExampleExtraction)

        assert isinstance(result, ExampleExtraction)
        assert len(result.facts) == 2
        assert result.facts[0].fact_type == "party"
        assert result.facts[0].content == "John Doe"
        assert result.summary == "Test extraction summary"

    def test_extract_missing_tool_use(self):
        """Test error when response has no tool use."""
        response = {
            "output": {
                "message": {
                    "content": [
                        {"text": "Just text, no tool use"}
                    ]
                }
            }
        }

        with pytest.raises(BedrockValidationError, match="No tool use found"):
            extract_tool_result(response, ExampleExtraction)

    def test_extract_invalid_tool_output(self):
        """Test error when tool output doesn't match schema."""
        response = {
            "output": {
                "message": {
                    "content": [
                        {
                            "toolUse": {
                                "toolUseId": "test",
                                "name": "test_tool",
                                "input": {
                                    "facts": "invalid",  # Should be list
                                    "summary": 123,  # Should be string
                                }
                            }
                        }
                    ]
                }
            }
        }

        with pytest.raises(BedrockValidationError, match="validation failed"):
            extract_tool_result(response, ExampleExtraction)

    def test_extract_partial_tool_output(self):
        """Test extracting when only some fields are present."""
        response = {
            "output": {
                "message": {
                    "content": [
                        {
                            "toolUse": {
                                "toolUseId": "test",
                                "name": "test_tool",
                                "input": {
                                    "facts": [],
                                    "summary": "Empty facts",
                                }
                            }
                        }
                    ]
                }
            }
        }

        result = extract_tool_result(response, ExampleExtraction)

        assert isinstance(result, ExampleExtraction)
        assert len(result.facts) == 0
        assert result.summary == "Empty facts"


class TestExampleSchemas:
    """Test example schema definitions."""

    def test_example_extraction_model(self):
        """Test ExampleExtraction model validation."""
        data = {
            "facts": [
                {
                    "fact_type": "test",
                    "content": "content",
                    "confidence": 0.9,
                }
            ],
            "summary": "Test summary",
        }

        model = ExampleExtraction.model_validate(data)

        assert len(model.facts) == 1
        assert model.facts[0].fact_type == "test"
        assert model.summary == "Test summary"

    def test_extracted_fact_validation(self):
        """Test ExtractedFact validation."""
        from src.bedrock.tools import ExtractedFact

        # Valid fact
        fact = ExtractedFact(
            fact_type="party", content="John Doe", confidence=0.95
        )

        assert fact.fact_type == "party"
        assert fact.confidence == 0.95

        # Confidence should be between 0 and 1 (but Pydantic allows any float)
        # If we want to enforce this, we'd need validators
