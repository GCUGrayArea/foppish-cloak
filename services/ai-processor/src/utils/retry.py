"""Exponential backoff retry decorator for AWS Bedrock."""

import functools
import random
import time
from typing import Any, Callable, TypeVar

from botocore.exceptions import ClientError

from ..bedrock.exceptions import BedrockServerError, BedrockThrottlingError

# Type variable for generic decorator
F = TypeVar("F", bound=Callable[..., Any])


def exponential_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    jitter: bool = True,
) -> Callable[[F], F]:
    """
    Retry decorator with exponential backoff for Bedrock API calls.

    Args:
        max_retries: Maximum number of retry attempts (default: 3)
        base_delay: Initial delay in seconds (default: 1.0)
        max_delay: Maximum delay in seconds (default: 60.0)
        jitter: Add random jitter to prevent thundering herd (default: True)

    Returns:
        Decorated function with retry logic

    Retries on:
        - ThrottlingException (429)
        - ServiceUnavailableException (503)
        - InternalServerException (500)

    Does NOT retry on:
        - ValidationException (400)
        - AccessDeniedException (403)
        - ResourceNotFoundException (404)
        - Other client errors (4xx)
    """

    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            last_exception: Exception | None = None

            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)

                except ClientError as e:
                    error_code = e.response.get("Error", {}).get("Code", "")
                    status_code = e.response.get("ResponseMetadata", {}).get(
                        "HTTPStatusCode", 0
                    )

                    # Map AWS errors to custom exceptions
                    if error_code == "ThrottlingException" or status_code == 429:
                        last_exception = BedrockThrottlingError(
                            f"Rate limit exceeded: {e}"
                        )
                        should_retry = True
                    elif status_code >= 500:
                        last_exception = BedrockServerError(
                            f"Server error (status {status_code}): {e}", status_code
                        )
                        should_retry = True
                    else:
                        # Client errors (4xx) should not be retried
                        raise

                    # Don't retry if we've exhausted attempts
                    if not should_retry or attempt >= max_retries:
                        raise last_exception

                    # Calculate delay with exponential backoff
                    delay = min(base_delay * (2**attempt), max_delay)

                    # Add jitter to prevent thundering herd
                    if jitter:
                        delay = delay * (0.5 + random.random() * 0.5)

                    time.sleep(delay)

                except (BedrockThrottlingError, BedrockServerError) as e:
                    last_exception = e

                    if attempt >= max_retries:
                        raise

                    # Calculate delay
                    delay = min(base_delay * (2**attempt), max_delay)
                    if jitter:
                        delay = delay * (0.5 + random.random() * 0.5)

                    time.sleep(delay)

            # Should never reach here, but just in case
            if last_exception:
                raise last_exception

        return wrapper  # type: ignore

    return decorator
