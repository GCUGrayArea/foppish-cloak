"""Bedrock-specific configuration and helpers."""

from dataclasses import dataclass

from ..config import get_settings


@dataclass
class BedrockConfig:
    """Bedrock configuration with convenient access to settings."""

    model_id: str
    max_tokens: int
    temperature_extraction: float
    temperature_generation: float
    max_retries: int
    retry_base_delay: float
    retry_max_delay: float
    cost_per_input_token: float
    cost_per_output_token: float
    aws_region: str

    @classmethod
    def from_settings(cls) -> "BedrockConfig":
        """Create configuration from application settings."""
        settings = get_settings()
        return cls(
            model_id=settings.bedrock_model_id,
            max_tokens=settings.bedrock_max_tokens,
            temperature_extraction=settings.bedrock_temperature_extraction,
            temperature_generation=settings.bedrock_temperature_generation,
            max_retries=settings.bedrock_max_retries,
            retry_base_delay=settings.bedrock_retry_base_delay,
            retry_max_delay=settings.bedrock_retry_max_delay,
            cost_per_input_token=settings.bedrock_cost_per_input_token,
            cost_per_output_token=settings.bedrock_cost_per_output_token,
            aws_region=settings.aws_region,
        )

    def calculate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """
        Calculate estimated cost for token usage.

        Args:
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens

        Returns:
            Estimated cost in USD
        """
        input_cost = input_tokens * self.cost_per_input_token
        output_cost = output_tokens * self.cost_per_output_token
        return input_cost + output_cost
