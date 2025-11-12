"""Application configuration using pydantic-settings."""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    database_url: str = Field(
        ..., description="PostgreSQL connection URL (including credentials)"
    )

    # AWS Configuration
    aws_region: str = Field(default="us-east-1", description="AWS region for services")

    # Bedrock Configuration
    bedrock_model_id: str = Field(
        default="anthropic.claude-3-5-sonnet-20241022-v2:0",
        description="Claude model ID for Bedrock",
    )
    bedrock_max_tokens: int = Field(
        default=4096, description="Maximum tokens for Bedrock responses"
    )
    bedrock_temperature_extraction: float = Field(
        default=0.0, description="Temperature for extraction (deterministic)"
    )
    bedrock_temperature_generation: float = Field(
        default=0.7, description="Temperature for generation (creative)"
    )

    # Retry Configuration
    bedrock_max_retries: int = Field(
        default=3, description="Maximum retry attempts for Bedrock API calls"
    )
    bedrock_retry_base_delay: float = Field(
        default=1.0, description="Base delay for exponential backoff (seconds)"
    )
    bedrock_retry_max_delay: float = Field(
        default=60.0, description="Maximum delay for exponential backoff (seconds)"
    )

    # Cost Tracking (Claude 3.5 Sonnet pricing as of 2024)
    bedrock_cost_per_input_token: float = Field(
        default=0.000003, description="Cost per input token (USD)"
    )
    bedrock_cost_per_output_token: float = Field(
        default=0.000015, description="Cost per output token (USD)"
    )

    # Logging Configuration
    log_level: str = Field(default="INFO", description="Logging level")

    # Environment
    environment: str = Field(
        default="development", description="Environment (development, production)"
    )


# Singleton settings instance
_settings: Settings | None = None


def get_settings() -> Settings:
    """Get settings instance (singleton pattern)."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def reset_settings() -> None:
    """Reset settings (useful for testing)."""
    global _settings
    _settings = None
