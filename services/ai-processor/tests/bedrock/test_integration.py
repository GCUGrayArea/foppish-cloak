"""Integration tests for Bedrock (requires AWS credentials)."""

import os

import pytest
from pydantic import BaseModel

from src.bedrock import BedrockClient, BedrockConfig


# Skip integration tests if not in dev environment or missing credentials
pytestmark = pytest.mark.skipif(
    os.getenv("ENVIRONMENT") != "development"
    or not os.getenv("AWS_REGION")
    or os.getenv("SKIP_INTEGRATION_TESTS") == "true",
    reason="Integration tests only run in dev with AWS credentials",
)


class SimpleExtraction(BaseModel):
    """Simple extraction schema for testing."""

    extracted_text: str
    word_count: int


@pytest.mark.integration
class TestBedrockIntegration:
    """Integration tests with real Bedrock API calls."""

    def test_real_bedrock_invocation(self):
        """Test actual Bedrock API call (dev environment only)."""
        config = BedrockConfig.from_settings()
        client = BedrockClient(config=config)

        messages = [
            {
                "role": "user",
                "content": "Say 'Hello from Bedrock integration test!'",
            }
        ]

        response = client.invoke(messages=messages, temperature=0.0)

        # Verify response structure
        assert "output" in response
        assert "message" in response["output"]
        assert "usage" in response

        # Verify token usage is tracked
        usage = response["usage"]
        assert usage["inputTokens"] > 0
        assert usage["outputTokens"] > 0

    def test_real_tool_calling(self):
        """Test tool calling with real Bedrock API."""
        config = BedrockConfig.from_settings()
        client = BedrockClient(config=config)

        messages = [
            {
                "role": "user",
                "content": "Extract the following text and count words: The quick brown fox jumps over the lazy dog.",
            }
        ]

        result = client.invoke_with_tool(
            messages=messages,
            tool_schema=SimpleExtraction,
            tool_name="extract_and_count",
            tool_description="Extract text and count the number of words",
            temperature=0.0,
        )

        # Verify result
        assert isinstance(result, SimpleExtraction)
        assert result.extracted_text
        assert result.word_count > 0

    def test_real_streaming_response(self):
        """Test streaming response from Bedrock."""
        # Note: Streaming would require converse_stream API
        # This is a placeholder for future implementation
        pytest.skip("Streaming not yet implemented")

    def test_real_rate_limit_retry(self):
        """Test retry logic with real rate limiting."""
        # This test would need to trigger actual rate limits
        # Only run manually when testing retry behavior
        pytest.skip("Manual test for rate limit behavior")

    def test_real_multi_turn_conversation(self):
        """Test multi-turn conversation with Bedrock."""
        config = BedrockConfig.from_settings()
        client = BedrockClient(config=config)

        # First turn
        messages = [
            {
                "role": "user",
                "content": "My name is Alice.",
            }
        ]

        response1 = client.invoke(messages=messages, temperature=0.0)

        # Extract assistant response
        assistant_content = response1["output"]["message"]["content"][0]["text"]

        # Second turn
        messages.append({"role": "assistant", "content": assistant_content})
        messages.append(
            {
                "role": "user",
                "content": "What is my name?",
            }
        )

        response2 = client.invoke(messages=messages, temperature=0.0)

        # Assistant should remember the name
        final_response = response2["output"]["message"]["content"][0]["text"]
        assert "Alice" in final_response or "alice" in final_response.lower()

    def test_cost_tracking_accuracy(self):
        """Test that cost tracking matches actual token usage."""
        config = BedrockConfig.from_settings()
        client = BedrockClient(config=config)

        messages = [
            {
                "role": "user",
                "content": "Count to five.",
            }
        ]

        response = client.invoke(messages=messages, temperature=0.0)

        # Get actual token usage
        usage = response["usage"]
        input_tokens = usage["inputTokens"]
        output_tokens = usage["outputTokens"]

        # Calculate cost
        calculated_cost = config.calculate_cost(input_tokens, output_tokens)

        # Cost should be positive and reasonable
        assert calculated_cost > 0
        assert calculated_cost < 1.0  # Should be less than $1 for simple request

        # Log for manual verification
        print(f"\nToken usage: {input_tokens} in, {output_tokens} out")
        print(f"Estimated cost: ${calculated_cost:.6f}")
