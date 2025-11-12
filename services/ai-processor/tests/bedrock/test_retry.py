"""Unit tests for retry logic."""

import time
from unittest.mock import Mock

import pytest
from botocore.exceptions import ClientError

from src.bedrock.exceptions import BedrockServerError, BedrockThrottlingError
from src.utils.retry import exponential_backoff


class TestExponentialBackoff:
    """Test exponential backoff retry decorator."""

    def test_success_on_first_attempt(self):
        """Test function succeeds on first attempt."""

        @exponential_backoff(max_retries=3)
        def successful_function():
            return "success"

        result = successful_function()
        assert result == "success"

    def test_retry_on_throttling_error(self):
        """Test retries on throttling exception."""
        mock_func = Mock()
        mock_func.side_effect = [
            ClientError(
                {"Error": {"Code": "ThrottlingException"}},
                "test_operation",
            ),
            ClientError(
                {"Error": {"Code": "ThrottlingException"}},
                "test_operation",
            ),
            "success",
        ]

        @exponential_backoff(max_retries=3, base_delay=0.01)
        def throttled_function():
            return mock_func()

        start_time = time.time()
        result = throttled_function()
        elapsed = time.time() - start_time

        assert result == "success"
        assert mock_func.call_count == 3
        # Should have some delay due to backoff
        assert elapsed > 0.01

    def test_retry_on_server_error(self):
        """Test retries on server error (5xx)."""
        mock_func = Mock()
        mock_func.side_effect = [
            ClientError(
                {
                    "Error": {"Code": "InternalServerException"},
                    "ResponseMetadata": {"HTTPStatusCode": 500},
                },
                "test_operation",
            ),
            "success",
        ]

        @exponential_backoff(max_retries=3, base_delay=0.01)
        def server_error_function():
            return mock_func()

        result = server_error_function()
        assert result == "success"
        assert mock_func.call_count == 2

    def test_no_retry_on_client_error(self):
        """Test does not retry on client error (4xx)."""
        mock_func = Mock()
        mock_func.side_effect = ClientError(
            {
                "Error": {"Code": "ValidationException"},
                "ResponseMetadata": {"HTTPStatusCode": 400},
            },
            "test_operation",
        )

        @exponential_backoff(max_retries=3, base_delay=0.01)
        def client_error_function():
            return mock_func()

        with pytest.raises(ClientError):
            client_error_function()

        # Should only call once (no retries)
        assert mock_func.call_count == 1

    def test_max_retries_exceeded(self):
        """Test raises error after max retries."""
        mock_func = Mock()
        mock_func.side_effect = BedrockThrottlingError("Rate limit exceeded")

        @exponential_backoff(max_retries=2, base_delay=0.01)
        def always_fails():
            return mock_func()

        with pytest.raises(BedrockThrottlingError):
            always_fails()

        # Should try initial + 2 retries = 3 times
        assert mock_func.call_count == 3

    def test_exponential_delay_increase(self):
        """Test delay increases exponentially."""
        delays = []

        def track_delay():
            delays.append(time.time())
            if len(delays) < 3:
                raise BedrockServerError("Server error", 500)
            return "success"

        @exponential_backoff(max_retries=3, base_delay=0.1, jitter=False)
        def delayed_function():
            return track_delay()

        delayed_function()

        # Calculate delays between attempts
        if len(delays) >= 3:
            delay1 = delays[1] - delays[0]
            delay2 = delays[2] - delays[1]

            # Second delay should be approximately 2x first delay
            # Allow some tolerance
            assert delay2 > delay1 * 1.5

    def test_jitter_adds_randomness(self):
        """Test jitter adds randomness to delays."""
        delays_with_jitter = []
        delays_without_jitter = []

        def create_test_func(jitter: bool):
            delays_list = delays_with_jitter if jitter else delays_without_jitter

            @exponential_backoff(max_retries=2, base_delay=0.1, jitter=jitter)
            def test_func():
                delays_list.append(time.time())
                if len(delays_list) < 2:
                    raise BedrockServerError("Error", 500)
                return "success"

            return test_func

        # Run with jitter
        create_test_func(jitter=True)()

        # Run without jitter
        create_test_func(jitter=False)()

        # With jitter, delays should vary
        # This is probabilistic, but should hold in practice
        if len(delays_with_jitter) >= 2 and len(delays_without_jitter) >= 2:
            jitter_delay = delays_with_jitter[1] - delays_with_jitter[0]
            no_jitter_delay = delays_without_jitter[1] - delays_without_jitter[0]

            # Delays should be different (with very high probability)
            assert abs(jitter_delay - no_jitter_delay) > 0.001

    def test_max_delay_cap(self):
        """Test delay is capped at max_delay."""
        delays = []

        def track_delay():
            delays.append(time.time())
            if len(delays) < 4:
                raise BedrockServerError("Server error", 500)
            return "success"

        @exponential_backoff(
            max_retries=4, base_delay=10.0, max_delay=0.2, jitter=False
        )
        def capped_delay_function():
            return track_delay()

        capped_delay_function()

        # Even with high base_delay, actual delay should be capped
        if len(delays) >= 2:
            for i in range(1, len(delays)):
                delay = delays[i] - delays[i - 1]
                # Should not exceed max_delay significantly
                assert delay < 0.5  # Some tolerance for execution time
