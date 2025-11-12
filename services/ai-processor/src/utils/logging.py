"""Structured logging for AWS CloudWatch."""

import json
import logging
import sys
import time
from datetime import datetime
from typing import Any
from uuid import uuid4


class StructuredFormatter(logging.Formatter):
    """JSON formatter for CloudWatch structured logging."""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add correlation ID if present
        if hasattr(record, "correlation_id"):
            log_data["correlation_id"] = record.correlation_id

        # Add extra fields
        if hasattr(record, "extra_data") and record.extra_data:
            log_data.update(record.extra_data)

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data)


def setup_logging(level: str = "INFO") -> logging.Logger:
    """
    Configure structured logging for CloudWatch.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger("bedrock")
    logger.setLevel(getattr(logging, level.upper()))

    # Remove existing handlers
    logger.handlers = []

    # Create console handler with structured formatter
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredFormatter())
    logger.addHandler(handler)

    # Don't propagate to root logger
    logger.propagate = False

    return logger


def log_bedrock_request(
    logger: logging.Logger,
    model_id: str,
    prompt_tokens: int,
    correlation_id: str | None = None,
    firm_id: int | None = None,
    user_id: int | None = None,
    **kwargs: Any,
) -> None:
    """
    Log Bedrock API request.

    Args:
        logger: Logger instance
        model_id: Claude model identifier
        prompt_tokens: Number of input tokens
        correlation_id: Request correlation ID
        firm_id: Firm context for multi-tenancy
        user_id: User context
        **kwargs: Additional fields (temperature, max_tokens, tools, etc.)
    """
    extra_data = {
        "event_type": "bedrock_request",
        "model_id": model_id,
        "prompt_tokens": prompt_tokens,
        "firm_id": firm_id,
        "user_id": user_id,
        **kwargs,
    }

    logger.info(
        f"Bedrock request: {model_id}",
        extra={"correlation_id": correlation_id, "extra_data": extra_data},
    )


def log_bedrock_response(
    logger: logging.Logger,
    model_id: str,
    prompt_tokens: int,
    completion_tokens: int,
    latency_ms: float,
    correlation_id: str | None = None,
    firm_id: int | None = None,
    user_id: int | None = None,
    cost_estimate: float | None = None,
    tool_used: str | None = None,
    **kwargs: Any,
) -> None:
    """
    Log Bedrock API response with token usage and cost.

    Args:
        logger: Logger instance
        model_id: Claude model identifier
        prompt_tokens: Number of input tokens
        completion_tokens: Number of output tokens
        latency_ms: Request latency in milliseconds
        correlation_id: Request correlation ID
        firm_id: Firm context
        user_id: User context
        cost_estimate: Estimated cost in USD
        tool_used: Name of tool used (if any)
        **kwargs: Additional fields
    """
    extra_data = {
        "event_type": "bedrock_response",
        "model_id": model_id,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": prompt_tokens + completion_tokens,
        "latency_ms": latency_ms,
        "firm_id": firm_id,
        "user_id": user_id,
        "cost_estimate": cost_estimate,
        "tool_used": tool_used,
        **kwargs,
    }

    logger.info(
        f"Bedrock response: {completion_tokens} tokens in {latency_ms:.1f}ms",
        extra={"correlation_id": correlation_id, "extra_data": extra_data},
    )


def log_bedrock_error(
    logger: logging.Logger,
    error: Exception,
    model_id: str,
    correlation_id: str | None = None,
    firm_id: int | None = None,
    user_id: int | None = None,
    **kwargs: Any,
) -> None:
    """
    Log Bedrock API error.

    Args:
        logger: Logger instance
        error: Exception that occurred
        model_id: Claude model identifier
        correlation_id: Request correlation ID
        firm_id: Firm context
        user_id: User context
        **kwargs: Additional fields
    """
    extra_data = {
        "event_type": "bedrock_error",
        "model_id": model_id,
        "error_type": type(error).__name__,
        "error_message": str(error),
        "firm_id": firm_id,
        "user_id": user_id,
        **kwargs,
    }

    logger.error(
        f"Bedrock error: {type(error).__name__}",
        extra={"correlation_id": correlation_id, "extra_data": extra_data},
        exc_info=True,
    )


def generate_correlation_id() -> str:
    """Generate unique correlation ID for request tracing."""
    return str(uuid4())
