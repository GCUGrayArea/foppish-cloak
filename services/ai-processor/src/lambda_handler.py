"""
AWS Lambda handler for AI processing.

Provides route-based dispatch for document analysis, letter generation, and refinement.
"""

import json
import logging
import os
import traceback
import uuid
from typing import Any, Dict, Optional

# Module-level initialization for reuse across invocations
logger = logging.getLogger()
logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))

# Initialize clients at module level (cold start optimization)
_bedrock_client = None
_document_analyzer = None
_letter_generator = None


def get_bedrock_client():
    """Get or create Bedrock client (singleton pattern)."""
    global _bedrock_client
    if _bedrock_client is None:
        from .bedrock.client import BedrockClient
        from .bedrock.config import BedrockConfig

        config = BedrockConfig()
        _bedrock_client = BedrockClient(config=config)
        logger.info("Bedrock client initialized")
    return _bedrock_client


def get_document_analyzer():
    """Get or create DocumentAnalyzer (singleton pattern)."""
    global _document_analyzer
    if _document_analyzer is None:
        from .document_analyzer import DocumentAnalyzer

        _document_analyzer = DocumentAnalyzer(
            bedrock_client=get_bedrock_client(),
            logger=logger,
        )
        logger.info("DocumentAnalyzer initialized")
    return _document_analyzer


def get_letter_generator():
    """Get or create LetterGenerator (singleton pattern)."""
    global _letter_generator
    if _letter_generator is None:
        from .letter_generator import LetterGenerator

        _letter_generator = LetterGenerator(
            bedrock_client=get_bedrock_client(),
            logger=logger,
        )
        logger.info("LetterGenerator initialized")
    return _letter_generator


def create_response(
    status_code: int,
    body: Dict[str, Any],
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Create standardized Lambda response.

    Args:
        status_code: HTTP status code
        body: Response body dict
        correlation_id: Optional correlation ID for tracing

    Returns:
        Lambda response dict
    """
    headers = {
        "Content-Type": "application/json",
        "X-Correlation-ID": correlation_id or str(uuid.uuid4()),
    }

    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(body),
    }


def handle_analyze(event: Dict[str, Any], correlation_id: str) -> Dict[str, Any]:
    """
    Handle document analysis request.

    Expected event body:
    {
        "document_id": str,
        "document_text": str,
        "document_type": str (optional),
        "firm_id": int,
        "user_id": int (optional)
    }
    """
    logger.info(
        "Processing analyze request",
        extra={"correlation_id": correlation_id},
    )

    try:
        body = json.loads(event.get("body", "{}"))

        # Validate required fields
        required_fields = ["document_id", "document_text", "firm_id"]
        missing_fields = [f for f in required_fields if f not in body]
        if missing_fields:
            return create_response(
                400,
                {"error": f"Missing required fields: {', '.join(missing_fields)}"},
                correlation_id,
            )

        # Perform document analysis
        analyzer = get_document_analyzer()
        result = analyzer.analyze_document(
            document_id=body["document_id"],
            document_text=body["document_text"],
            document_type=body.get("document_type"),
            firm_id=body["firm_id"],
            user_id=body.get("user_id"),
        )

        # Convert result to dict
        response_body = {
            "success": result.success,
            "document_id": result.document_id,
            "extracted_data": result.extracted_data.model_dump(mode="json"),
            "processing_time_seconds": result.processing_time_seconds,
            "token_usage": result.token_usage,
            "model_id": result.model_id,
            "extraction_timestamp": result.extraction_timestamp,
        }

        if not result.success:
            response_body["error_message"] = result.error_message

        logger.info(
            "Document analysis completed",
            extra={
                "correlation_id": correlation_id,
                "document_id": body["document_id"],
                "success": result.success,
                "processing_time": result.processing_time_seconds,
            },
        )

        return create_response(
            200 if result.success else 500,
            response_body,
            correlation_id,
        )

    except Exception as e:
        logger.error(
            "Error in analyze handler",
            extra={
                "correlation_id": correlation_id,
                "error": str(e),
                "traceback": traceback.format_exc(),
            },
        )
        return create_response(
            500,
            {"error": "Internal server error", "message": str(e)},
            correlation_id,
        )


def handle_generate(event: Dict[str, Any], correlation_id: str) -> Dict[str, Any]:
    """
    Handle letter generation request.

    Expected event body:
    {
        "case_id": str,
        "extracted_data": dict,
        "template_variables": dict,
        "tone": str (optional, default: "formal"),
        "custom_instructions": str (optional),
        "firm_id": int,
        "user_id": int (optional)
    }
    """
    logger.info(
        "Processing generate request",
        extra={"correlation_id": correlation_id},
    )

    try:
        body = json.loads(event.get("body", "{}"))

        # Validate required fields
        required_fields = ["case_id", "extracted_data", "template_variables"]
        missing_fields = [f for f in required_fields if f not in body]
        if missing_fields:
            return create_response(
                400,
                {"error": f"Missing required fields: {', '.join(missing_fields)}"},
                correlation_id,
            )

        # Import schemas
        from .schemas.letter import LetterGenerationRequest

        # Create generation request (validation happens in Pydantic model)
        gen_request = LetterGenerationRequest.model_validate(body)

        # Generate letter
        generator = get_letter_generator()
        result = generator.generate_letter(
            request=gen_request,
            firm_id=body.get("firm_id"),
            user_id=body.get("user_id"),
        )

        # Convert result to dict
        response_body = {
            "success": result.success,
            "letter": result.letter.model_dump(mode="json") if result.letter else None,
            "processing_time_seconds": result.processing_time_seconds,
            "token_usage": result.token_usage,
            "model_id": result.model_id,
            "generation_timestamp": result.generation_timestamp,
        }

        if not result.success:
            response_body["error_message"] = result.error_message

        logger.info(
            "Letter generation completed",
            extra={
                "correlation_id": correlation_id,
                "letter_id": body["letter_id"],
                "success": result.success,
                "processing_time": result.processing_time_seconds,
            },
        )

        return create_response(
            200 if result.success else 500,
            response_body,
            correlation_id,
        )

    except Exception as e:
        logger.error(
            "Error in generate handler",
            extra={
                "correlation_id": correlation_id,
                "error": str(e),
                "traceback": traceback.format_exc(),
            },
        )
        return create_response(
            500,
            {"error": "Internal server error", "message": str(e)},
            correlation_id,
        )


def handle_refine(event: Dict[str, Any], correlation_id: str) -> Dict[str, Any]:
    """
    Handle letter refinement request.

    Expected event body:
    {
        "letter_id": str,
        "current_letter": dict (GeneratedLetter),
        "feedback": dict (RefinementFeedback),
        "conversation_history": dict (optional),
        "firm_id": int,
        "user_id": int (optional)
    }
    """
    logger.info(
        "Processing refine request",
        extra={"correlation_id": correlation_id},
    )

    try:
        body = json.loads(event.get("body", "{}"))

        # Validate required fields
        required_fields = ["letter_id", "current_letter", "feedback", "firm_id"]
        missing_fields = [f for f in required_fields if f not in body]
        if missing_fields:
            return create_response(
                400,
                {"error": f"Missing required fields: {', '.join(missing_fields)}"},
                correlation_id,
            )

        # Convert dicts to models
        from .schemas.letter import GeneratedLetter, RefinementFeedback, ConversationHistory

        current_letter = GeneratedLetter.model_validate(body["current_letter"])
        feedback = RefinementFeedback.model_validate(body["feedback"])
        conversation_history = None
        if body.get("conversation_history"):
            conversation_history = ConversationHistory.model_validate(
                body["conversation_history"]
            )

        # Refine letter
        generator = get_letter_generator()
        result = generator.refine_letter(
            letter_id=body["letter_id"],
            current_letter=current_letter,
            feedback=feedback,
            conversation_history=conversation_history,
            firm_id=body["firm_id"],
            user_id=body.get("user_id"),
        )

        # Convert result to dict
        response_body = {
            "success": result.success,
            "refined_letter": result.refined_letter.model_dump(mode="json")
            if result.refined_letter
            else None,
            "changes_summary": result.changes_summary,
            "processing_time_seconds": result.processing_time_seconds,
            "token_usage": result.token_usage,
            "model_id": result.model_id,
            "refinement_timestamp": result.refinement_timestamp,
            "conversation_history": result.conversation_history.model_dump(mode="json")
            if result.conversation_history
            else None,
        }

        if not result.success:
            response_body["error_message"] = result.error_message

        logger.info(
            "Letter refinement completed",
            extra={
                "correlation_id": correlation_id,
                "letter_id": body["letter_id"],
                "success": result.success,
                "processing_time": result.processing_time_seconds,
            },
        )

        return create_response(
            200 if result.success else 500,
            response_body,
            correlation_id,
        )

    except Exception as e:
        logger.error(
            "Error in refine handler",
            extra={
                "correlation_id": correlation_id,
                "error": str(e),
                "traceback": traceback.format_exc(),
            },
        )
        return create_response(
            500,
            {"error": "Internal server error", "message": str(e)},
            correlation_id,
        )


def handle_health(event: Dict[str, Any], correlation_id: str) -> Dict[str, Any]:
    """Handle health check request."""
    logger.info("Health check", extra={"correlation_id": correlation_id})

    return create_response(
        200,
        {
            "status": "healthy",
            "service": "ai-processor",
            "version": os.getenv("SERVICE_VERSION", "unknown"),
            "environment": os.getenv("ENVIRONMENT", "unknown"),
        },
        correlation_id,
    )


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler for AI processing requests.

    Provides route-based dispatch for:
    - POST /analyze - Document analysis
    - POST /generate - Letter generation
    - POST /refine - Letter refinement
    - GET /health - Health check

    Args:
        event: Lambda event object (API Gateway proxy format)
        context: Lambda context object

    Returns:
        API Gateway proxy response
    """
    # Extract correlation ID from headers or generate new one
    headers = event.get("headers", {})
    correlation_id = (
        headers.get("X-Correlation-ID")
        or headers.get("x-correlation-id")
        or str(uuid.uuid4())
    )

    logger.info(
        "Lambda invocation started",
        extra={
            "correlation_id": correlation_id,
            "request_id": context.aws_request_id if context else "unknown",
            "path": event.get("path"),
            "http_method": event.get("httpMethod"),
        },
    )

    try:
        # Route based on path and method
        path = event.get("path", "")
        method = event.get("httpMethod", "")

        # Route mapping
        if method == "POST" and path.endswith("/analyze"):
            return handle_analyze(event, correlation_id)
        elif method == "POST" and path.endswith("/generate"):
            return handle_generate(event, correlation_id)
        elif method == "POST" and path.endswith("/refine"):
            return handle_refine(event, correlation_id)
        elif method == "GET" and path.endswith("/health"):
            return handle_health(event, correlation_id)
        else:
            logger.warning(
                "Route not found",
                extra={
                    "correlation_id": correlation_id,
                    "path": path,
                    "method": method,
                },
            )
            return create_response(
                404,
                {"error": "Not found", "path": path, "method": method},
                correlation_id,
            )

    except Exception as e:
        logger.error(
            "Unhandled error in Lambda handler",
            extra={
                "correlation_id": correlation_id,
                "error": str(e),
                "traceback": traceback.format_exc(),
            },
        )
        return create_response(
            500,
            {"error": "Internal server error", "message": str(e)},
            correlation_id,
        )
