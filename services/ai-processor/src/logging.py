"""
Structured logging for AI processor service

Provides centralized logging configuration with:
- JSON structured logging for CloudWatch Logs Insights
- Correlation ID support for request tracking
- Multiple log levels
- Lambda-optimized logging (stdout/stderr)
- Context enrichment (environment, service, Lambda context)
"""

import logging
import json
import sys
import os
from datetime import datetime
from typing import Any, Dict, Optional
from functools import wraps

# Environment configuration
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()
ENVIRONMENT = os.environ.get('NODE_ENV', 'development')
IS_LAMBDA = bool(os.environ.get('AWS_LAMBDA_FUNCTION_NAME'))


class StructuredFormatter(logging.Formatter):
    """Custom formatter that outputs JSON structured logs"""

    def format(self, record: logging.LogRecord) -> str:
        # Base log structure
        log_data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'message': record.getMessage(),
            'service': 'ai-processor',
            'environment': ENVIRONMENT,
        }

        # Add correlation ID if present
        if hasattr(record, 'correlation_id'):
            log_data['correlationId'] = record.correlation_id

        # Add Lambda context if available
        if IS_LAMBDA:
            log_data['lambda'] = {
                'functionName': os.environ.get('AWS_LAMBDA_FUNCTION_NAME'),
                'functionVersion': os.environ.get('AWS_LAMBDA_FUNCTION_VERSION'),
                'memoryLimit': os.environ.get('AWS_LAMBDA_FUNCTION_MEMORY_SIZE'),
                'requestId': os.environ.get('AWS_REQUEST_ID'),
            }

        # Add exception info if present
        if record.exc_info:
            log_data['error'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
                'stack': self.formatException(record.exc_info),
            }

        # Add any extra fields from the log record
        if hasattr(record, 'extra_fields'):
            log_data.update(record.extra_fields)

        return json.dumps(log_data)


class DevelopmentFormatter(logging.Formatter):
    """Human-readable formatter for development"""

    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        correlation_id = f"[{record.correlation_id}]" if hasattr(record, 'correlation_id') else ""
        message = f"{timestamp} {record.levelname} {correlation_id}: {record.getMessage()}"

        if record.exc_info:
            message += "\n" + self.formatException(record.exc_info)

        if hasattr(record, 'extra_fields'):
            message += "\n" + json.dumps(record.extra_fields, indent=2)

        return message


def setup_logger() -> logging.Logger:
    """Configure and return the root logger"""
    logger = logging.getLogger('ai-processor')
    logger.setLevel(getattr(logging, LOG_LEVEL))

    # Remove existing handlers
    logger.handlers = []

    # Create console handler
    handler = logging.StreamHandler(sys.stdout)

    # Use JSON formatter in production, human-readable in development
    if ENVIRONMENT == 'development':
        handler.setFormatter(DevelopmentFormatter())
    else:
        handler.setFormatter(StructuredFormatter())

    logger.addHandler(handler)

    # Don't propagate to root logger
    logger.propagate = False

    return logger


# Create global logger instance
logger = setup_logger()


class LoggerAdapter(logging.LoggerAdapter):
    """Logger adapter that adds correlation ID and extra fields"""

    def process(self, msg: str, kwargs: Dict) -> tuple:
        # Add correlation ID if available
        if 'correlation_id' in self.extra:
            kwargs.setdefault('extra', {})['correlation_id'] = self.extra['correlation_id']

        # Add any extra fields
        extra_fields = {k: v for k, v in self.extra.items() if k != 'correlation_id'}
        if extra_fields:
            kwargs.setdefault('extra', {})['extra_fields'] = extra_fields

        return msg, kwargs


def get_logger(correlation_id: Optional[str] = None, **extra_fields) -> LoggerAdapter:
    """
    Get a logger with correlation ID and extra context

    Args:
        correlation_id: Unique ID to track requests
        **extra_fields: Additional fields to include in logs

    Returns:
        LoggerAdapter instance with context
    """
    context = extra_fields.copy()
    if correlation_id:
        context['correlation_id'] = correlation_id

    return LoggerAdapter(logger, context)


def log_error(error: Exception, context: Optional[Dict[str, Any]] = None):
    """
    Log an error with full context

    Args:
        error: Exception object
        context: Additional context about the error
    """
    extra = context or {}
    logger.error(
        str(error),
        exc_info=True,
        extra={'extra_fields': extra}
    )


def log_security_event(event: str, details: Dict[str, Any]):
    """
    Log a security event

    Args:
        event: Security event type
        details: Event details
    """
    logger.warning(
        f"SECURITY: {event}",
        extra={'extra_fields': {
            'securityEvent': True,
            'eventType': event,
            **details
        }}
    )


def log_bedrock_request(
    model: str,
    input_tokens: int,
    output_tokens: int,
    duration: float,
    firm_id: str,
    operation: str,
    correlation_id: Optional[str] = None
):
    """
    Log AWS Bedrock API request for cost tracking

    Args:
        model: Bedrock model ID
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens
        duration: Request duration in seconds
        firm_id: Firm ID for cost allocation
        operation: Operation type (analysis, generation, etc.)
        correlation_id: Request correlation ID
    """
    # Estimate cost (Claude 3.5 Sonnet: $3/MTok input, $15/MTok output)
    input_cost = (input_tokens / 1_000_000) * 3
    output_cost = (output_tokens / 1_000_000) * 15
    total_cost = input_cost + output_cost

    log_context = {
        'correlation_id': correlation_id
    } if correlation_id else {}

    adapter = get_logger(**log_context)
    adapter.info(
        'AWS Bedrock request',
        extra={'extra_fields': {
            'aws': {
                'service': 'Bedrock',
                'operation': operation,
                'model': model,
                'inputTokens': input_tokens,
                'outputTokens': output_tokens,
                'totalTokens': input_tokens + output_tokens,
                'duration': duration,
                'firmId': firm_id,
                'cost': {
                    'input': input_cost,
                    'output': output_cost,
                    'total': total_cost,
                    'currency': 'USD'
                }
            }
        }}
    )


def log_lambda_invocation(
    function_name: str,
    duration: float,
    success: bool,
    correlation_id: Optional[str] = None
):
    """
    Log Lambda function invocation metrics

    Args:
        function_name: Lambda function name
        duration: Invocation duration in seconds
        success: Whether invocation succeeded
        correlation_id: Request correlation ID
    """
    log_context = {
        'correlation_id': correlation_id
    } if correlation_id else {}

    adapter = get_logger(**log_context)
    level = 'info' if success else 'error'
    getattr(adapter, level)(
        f"Lambda invocation {'succeeded' if success else 'failed'}",
        extra={'extra_fields': {
            'lambda': {
                'function': function_name,
                'duration': duration,
                'success': success
            }
        }}
    )


def log_document_processing(
    operation: str,
    document_type: str,
    size_bytes: int,
    duration: float,
    success: bool,
    correlation_id: Optional[str] = None
):
    """
    Log document processing event

    Args:
        operation: Operation type (upload, analysis, extraction)
        document_type: Document MIME type or extension
        size_bytes: Document size in bytes
        duration: Processing duration in seconds
        success: Whether processing succeeded
        correlation_id: Request correlation ID
    """
    log_context = {
        'correlation_id': correlation_id
    } if correlation_id else {}

    adapter = get_logger(**log_context)
    level = 'info' if success else 'error'
    getattr(adapter, level)(
        f"Document processing: {operation}",
        extra={'extra_fields': {
            'document': {
                'operation': operation,
                'type': document_type,
                'sizeBytes': size_bytes,
                'duration': duration,
                'success': success
            }
        }}
    )


def with_logging(operation_name: str):
    """
    Decorator to log function execution with timing

    Args:
        operation_name: Name of the operation for logging

    Example:
        @with_logging('document_analysis')
        def analyze_document(doc_id: str):
            # ... implementation
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = datetime.utcnow()
            correlation_id = kwargs.get('correlation_id')

            adapter = get_logger(correlation_id) if correlation_id else logger

            try:
                adapter.info(f"Starting {operation_name}")
                result = func(*args, **kwargs)
                duration = (datetime.utcnow() - start_time).total_seconds()
                adapter.info(
                    f"Completed {operation_name}",
                    extra={'extra_fields': {'duration': duration, 'success': True}}
                )
                return result
            except Exception as e:
                duration = (datetime.utcnow() - start_time).total_seconds()
                adapter.error(
                    f"Failed {operation_name}: {str(e)}",
                    exc_info=True,
                    extra={'extra_fields': {'duration': duration, 'success': False}}
                )
                raise

        return wrapper
    return decorator


# Export main logger and utilities
__all__ = [
    'logger',
    'get_logger',
    'log_error',
    'log_security_event',
    'log_bedrock_request',
    'log_lambda_invocation',
    'log_document_processing',
    'with_logging',
]
