"""
Metrics collection for AI processor service

Tracks performance and cost metrics for:
- AWS Bedrock API usage and costs
- Document processing performance
- Lambda invocation metrics
- Error rates

Metrics are logged in structured format for CloudWatch Metrics aggregation.
"""

import time
from datetime import datetime
from typing import Dict, Optional, Any
from contextlib import contextmanager
from .structured_logging import logger


class MetricsCollector:
    """Centralized metrics collector for AI processor"""

    def __init__(self, namespace: str = 'DemandLetterGenerator'):
        self.namespace = namespace
        self.environment = 'development'  # Will be set from env

    def record_metric(
        self,
        metric_name: str,
        value: float,
        unit: str = 'Count',
        dimensions: Optional[Dict[str, str]] = None
    ):
        """
        Record a metric value

        Args:
            metric_name: Name of the metric
            value: Metric value
            unit: Unit of measurement
            dimensions: Additional dimensions for the metric
        """
        metric_data = {
            'namespace': self.namespace,
            'metricName': metric_name,
            'value': value,
            'unit': unit,
            'dimensions': dimensions or {},
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }

        # Log metric in structured format
        logger.debug('Metric recorded', extra={'extra_fields': {'metric': metric_data}})

    def record_bedrock_invocation(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int,
        duration: float,
        firm_id: str,
        success: bool = True
    ):
        """
        Record AWS Bedrock API invocation metrics

        Args:
            model: Bedrock model ID
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            duration: Request duration in seconds
            firm_id: Firm ID for cost allocation
            success: Whether invocation succeeded
        """
        dimensions = {
            'Model': model,
            'FirmId': firm_id,
            'Success': str(success)
        }

        # Record token usage
        self.record_metric('BedrockInputTokens', input_tokens, 'Count', dimensions)
        self.record_metric('BedrockOutputTokens', output_tokens, 'Count', dimensions)
        self.record_metric('BedrockTotalTokens', input_tokens + output_tokens, 'Count', dimensions)

        # Record duration
        self.record_metric('BedrockInvocationDuration', duration * 1000, 'Milliseconds', dimensions)

        # Estimate and record cost
        # Claude 3.5 Sonnet pricing: $3/MTok input, $15/MTok output
        input_cost = (input_tokens / 1_000_000) * 3
        output_cost = (output_tokens / 1_000_000) * 15
        total_cost = input_cost + output_cost

        self.record_metric('BedrockCost', total_cost, 'None', dimensions)  # USD

        # Record invocation count
        self.record_metric('BedrockInvocations', 1, 'Count', dimensions)

    def record_document_analysis(
        self,
        document_type: str,
        size_bytes: int,
        duration: float,
        success: bool,
        firm_id: str
    ):
        """
        Record document analysis metrics

        Args:
            document_type: Type of document analyzed
            size_bytes: Document size in bytes
            duration: Analysis duration in seconds
            success: Whether analysis succeeded
            firm_id: Firm ID
        """
        dimensions = {
            'DocumentType': document_type,
            'FirmId': firm_id,
            'Success': str(success)
        }

        self.record_metric('DocumentAnalysisDuration', duration * 1000, 'Milliseconds', dimensions)
        self.record_metric('DocumentAnalysisSize', size_bytes, 'Bytes', dimensions)
        self.record_metric('DocumentAnalysisCount', 1, 'Count', dimensions)

    def record_letter_generation(
        self,
        duration: float,
        success: bool,
        firm_id: str,
        letter_length: Optional[int] = None
    ):
        """
        Record demand letter generation metrics

        Args:
            duration: Generation duration in seconds
            success: Whether generation succeeded
            firm_id: Firm ID
            letter_length: Length of generated letter in characters
        """
        dimensions = {
            'FirmId': firm_id,
            'Success': str(success)
        }

        self.record_metric('LetterGenerationDuration', duration * 1000, 'Milliseconds', dimensions)
        self.record_metric('LetterGenerationCount', 1, 'Count', dimensions)

        if letter_length is not None:
            self.record_metric('LetterLength', letter_length, 'Count', dimensions)

    def record_extraction_accuracy(
        self,
        extraction_type: str,
        fields_extracted: int,
        fields_expected: int,
        firm_id: str
    ):
        """
        Record data extraction accuracy metrics

        Args:
            extraction_type: Type of extraction (parties, dates, damages, etc.)
            fields_extracted: Number of fields successfully extracted
            fields_expected: Number of fields expected
            firm_id: Firm ID
        """
        accuracy = (fields_extracted / fields_expected * 100) if fields_expected > 0 else 0

        dimensions = {
            'ExtractionType': extraction_type,
            'FirmId': firm_id
        }

        self.record_metric('ExtractionAccuracy', accuracy, 'Percent', dimensions)
        self.record_metric('FieldsExtracted', fields_extracted, 'Count', dimensions)
        self.record_metric('FieldsExpected', fields_expected, 'Count', dimensions)

    def record_error(
        self,
        error_type: str,
        operation: str,
        firm_id: Optional[str] = None
    ):
        """
        Record error occurrence

        Args:
            error_type: Type of error
            operation: Operation where error occurred
            firm_id: Firm ID if available
        """
        dimensions = {
            'ErrorType': error_type,
            'Operation': operation
        }
        if firm_id:
            dimensions['FirmId'] = firm_id

        self.record_metric('ErrorCount', 1, 'Count', dimensions)

    def record_lambda_cold_start(self, duration: float):
        """
        Record Lambda cold start duration

        Args:
            duration: Cold start duration in seconds
        """
        self.record_metric('LambdaColdStartDuration', duration * 1000, 'Milliseconds')
        self.record_metric('LambdaColdStartCount', 1, 'Count')

    def record_lambda_memory_usage(self, used_mb: float, allocated_mb: float):
        """
        Record Lambda memory usage

        Args:
            used_mb: Memory used in MB
            allocated_mb: Memory allocated in MB
        """
        usage_percent = (used_mb / allocated_mb * 100) if allocated_mb > 0 else 0

        self.record_metric('LambdaMemoryUsed', used_mb, 'Megabytes')
        self.record_metric('LambdaMemoryAllocated', allocated_mb, 'Megabytes')
        self.record_metric('LambdaMemoryUsagePercent', usage_percent, 'Percent')


# Global metrics collector instance
metrics = MetricsCollector()


@contextmanager
def time_operation(
    operation_name: str,
    record_metric: bool = True,
    dimensions: Optional[Dict[str, str]] = None
):
    """
    Context manager to time an operation and optionally record metric

    Args:
        operation_name: Name of the operation
        record_metric: Whether to record timing metric
        dimensions: Additional dimensions for the metric

    Yields:
        dict: Result dictionary with 'duration' key set after completion

    Example:
        with time_operation('document_analysis', firm_id='123') as result:
            # ... do work
            pass
        print(f"Duration: {result['duration']} seconds")
    """
    start_time = time.time()
    result = {'duration': 0.0}

    try:
        yield result
        duration = time.time() - start_time
        result['duration'] = duration
        result['success'] = True

        if record_metric:
            metrics.record_metric(
                f'{operation_name}Duration',
                duration * 1000,
                'Milliseconds',
                dimensions
            )

    except Exception as e:
        duration = time.time() - start_time
        result['duration'] = duration
        result['success'] = False

        if record_metric:
            error_dimensions = dimensions.copy() if dimensions else {}
            error_dimensions['Success'] = 'false'
            metrics.record_metric(
                f'{operation_name}Duration',
                duration * 1000,
                'Milliseconds',
                error_dimensions
            )

        raise


def calculate_bedrock_cost(input_tokens: int, output_tokens: int, model: str = 'claude-3.5-sonnet') -> Dict[str, float]:
    """
    Calculate Bedrock API cost

    Args:
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens
        model: Model name (for different pricing)

    Returns:
        dict: Cost breakdown (input, output, total in USD)
    """
    # Pricing per million tokens
    pricing = {
        'claude-3.5-sonnet': {'input': 3.0, 'output': 15.0},
        'claude-3-haiku': {'input': 0.25, 'output': 1.25},
        'claude-3-opus': {'input': 15.0, 'output': 75.0},
    }

    # Default to Sonnet pricing if model not found
    model_pricing = pricing.get(model, pricing['claude-3.5-sonnet'])

    input_cost = (input_tokens / 1_000_000) * model_pricing['input']
    output_cost = (output_tokens / 1_000_000) * model_pricing['output']
    total_cost = input_cost + output_cost

    return {
        'input': round(input_cost, 6),
        'output': round(output_cost, 6),
        'total': round(total_cost, 6),
        'currency': 'USD'
    }


def format_cost(cost: float) -> str:
    """
    Format cost for display

    Args:
        cost: Cost in USD

    Returns:
        str: Formatted cost string
    """
    if cost < 0.01:
        return f"${cost:.6f}"
    return f"${cost:.4f}"


# Export main utilities
__all__ = [
    'metrics',
    'MetricsCollector',
    'time_operation',
    'calculate_bedrock_cost',
    'format_cost',
]
