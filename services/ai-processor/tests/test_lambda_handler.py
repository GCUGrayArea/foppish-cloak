"""Tests for Lambda handler."""

import json
from unittest.mock import Mock, patch
import pytest

from src.lambda_handler import (
    lambda_handler,
    handle_analyze,
    handle_generate,
    handle_health,
    create_response,
)


class TestLambdaHandler:
    """Test main Lambda handler routing."""

    def test_health_check(self):
        """Test health check endpoint."""
        event = {
            "path": "/ai/health",
            "httpMethod": "GET",
            "headers": {},
        }
        context = Mock(request_id="test-request-123")

        response = lambda_handler(event, context)

        assert response["statusCode"] == 200
        body = json.loads(response["body"])
        assert body["status"] == "healthy"
        assert body["service"] == "ai-processor"

    def test_route_not_found(self):
        """Test 404 for invalid route."""
        event = {
            "path": "/ai/invalid",
            "httpMethod": "GET",
            "headers": {},
        }
        context = Mock(request_id="test-request-123")

        response = lambda_handler(event, context)

        assert response["statusCode"] == 404
        body = json.loads(response["body"])
        assert "error" in body

    def test_correlation_id_from_header(self):
        """Test correlation ID is extracted from headers."""
        event = {
            "path": "/ai/health",
            "httpMethod": "GET",
            "headers": {"X-Correlation-ID": "custom-correlation-123"},
        }
        context = Mock(request_id="test-request-123")

        response = lambda_handler(event, context)

        assert response["headers"]["X-Correlation-ID"] == "custom-correlation-123"

    def test_correlation_id_generated(self):
        """Test correlation ID is generated if not provided."""
        event = {
            "path": "/ai/health",
            "httpMethod": "GET",
            "headers": {},
        }
        context = Mock(request_id="test-request-123")

        response = lambda_handler(event, context)

        assert "X-Correlation-ID" in response["headers"]
        assert len(response["headers"]["X-Correlation-ID"]) > 0


class TestHandleAnalyze:
    """Test document analysis handler."""

    @patch("src.lambda_handler.get_document_analyzer")
    def test_analyze_success(self, mock_get_analyzer):
        """Test successful document analysis."""
        # Mock analyzer result
        mock_result = Mock(
            success=True,
            document_id="doc-001",
            extracted_data=Mock(
                model_dump=Mock(return_value={"test": "data"})
            ),
            processing_time_seconds=1.5,
            token_usage={"input_tokens": 100, "output_tokens": 50},
            model_id="claude-3-5-sonnet",
            extraction_timestamp="2024-01-01T00:00:00Z",
        )
        mock_analyzer = Mock()
        mock_analyzer.analyze_document.return_value = mock_result
        mock_get_analyzer.return_value = mock_analyzer

        event = {
            "body": json.dumps({
                "document_id": "doc-001",
                "document_text": "Sample document text",
                "firm_id": 1,
            })
        }

        response = handle_analyze(event, "test-correlation")

        assert response["statusCode"] == 200
        body = json.loads(response["body"])
        assert body["success"] is True
        assert body["document_id"] == "doc-001"
        mock_analyzer.analyze_document.assert_called_once()

    def test_analyze_missing_fields(self):
        """Test analyze with missing required fields."""
        event = {
            "body": json.dumps({
                "document_id": "doc-001",
                # Missing document_text and firm_id
            })
        }

        response = handle_analyze(event, "test-correlation")

        assert response["statusCode"] == 400
        body = json.loads(response["body"])
        assert "error" in body
        assert "Missing required fields" in body["error"]

    @patch("src.lambda_handler.get_document_analyzer")
    def test_analyze_exception(self, mock_get_analyzer):
        """Test analyze handler exception handling."""
        mock_analyzer = Mock()
        mock_analyzer.analyze_document.side_effect = Exception("Test error")
        mock_get_analyzer.return_value = mock_analyzer

        event = {
            "body": json.dumps({
                "document_id": "doc-001",
                "document_text": "Sample text",
                "firm_id": 1,
            })
        }

        response = handle_analyze(event, "test-correlation")

        assert response["statusCode"] == 500
        body = json.loads(response["body"])
        assert "error" in body


class TestHandleGenerate:
    """Test letter generation handler."""

    def test_generate_missing_fields(self):
        """Test generate with missing required fields."""
        event = {
            "body": json.dumps({
                "case_id": "case-001",
                # Missing extracted_data, template_variables
            })
        }

        response = handle_generate(event, "test-correlation")

        assert response["statusCode"] == 400
        body = json.loads(response["body"])
        assert "error" in body


class TestCreateResponse:
    """Test response creation helper."""

    def test_create_response_success(self):
        """Test creating successful response."""
        response = create_response(200, {"message": "Success"}, "test-correlation")

        assert response["statusCode"] == 200
        assert response["headers"]["Content-Type"] == "application/json"
        assert response["headers"]["X-Correlation-ID"] == "test-correlation"
        body = json.loads(response["body"])
        assert body["message"] == "Success"

    def test_create_response_error(self):
        """Test creating error response."""
        response = create_response(500, {"error": "Internal error"})

        assert response["statusCode"] == 500
        body = json.loads(response["body"])
        assert body["error"] == "Internal error"

    def test_create_response_generates_correlation_id(self):
        """Test correlation ID is generated if not provided."""
        response = create_response(200, {"message": "Success"})

        assert "X-Correlation-ID" in response["headers"]
        assert len(response["headers"]["X-Correlation-ID"]) > 0
