"""Custom exceptions for AWS Bedrock integration."""


class BedrockError(Exception):
    """Base exception for Bedrock-related errors."""

    pass


class BedrockClientError(BedrockError):
    """Client-side errors (4xx) - user input issues."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


class BedrockServerError(BedrockError):
    """Server-side errors (5xx) - AWS service issues."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


class BedrockThrottlingError(BedrockError):
    """Rate limiting/throttling errors (429)."""

    def __init__(self, message: str, retry_after: int | None = None):
        super().__init__(message)
        self.retry_after = retry_after


class BedrockValidationError(BedrockError):
    """Tool output validation errors."""

    pass


class BedrockConfigurationError(BedrockError):
    """Configuration or initialization errors."""

    pass
