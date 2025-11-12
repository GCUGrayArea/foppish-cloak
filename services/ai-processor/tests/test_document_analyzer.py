"""
Tests for DocumentAnalyzer

Tests document analysis and extraction functionality.
"""

import os
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch

import pytest

from src.document_analyzer import DocumentAnalyzer
from src.schemas.extraction import (
    ExtractedData,
    DocumentMetadata,
    Party,
    PartyType,
    Incident,
    Damage,
    DamageType,
    CaseFact,
    ConfidenceLevel,
)


@pytest.fixture
def mock_bedrock_client():
    """Create a mock Bedrock client."""
    client = Mock()
    return client


@pytest.fixture
def document_analyzer(mock_bedrock_client):
    """Create DocumentAnalyzer with mock client."""
    return DocumentAnalyzer(bedrock_client=mock_bedrock_client)


@pytest.fixture
def sample_police_report_text():
    """Load sample police report fixture."""
    fixture_path = Path(__file__).parent / "fixtures" / "sample_police_report.txt"
    with open(fixture_path, "r", encoding="utf-8") as f:
        return f.read()


@pytest.fixture
def sample_extracted_data():
    """Create sample extracted data for testing."""
    return ExtractedData(
        metadata=DocumentMetadata(
            document_type="police_report",
            document_date="2024-01-15",
            author="Sergeant John Martinez",
            document_number="SPD-2024-001234",
        ),
        parties=[
            Party(
                name="Sarah Johnson",
                party_type=PartyType.PLAINTIFF,
                contact_info="123 Maple Street, Springfield, IL 62701, (217) 555-0123",
                insurance_company="State Farm Insurance",
                policy_number="SF-789456123",
                confidence=ConfidenceLevel.HIGH,
            ),
            Party(
                name="Robert Williams",
                party_type=PartyType.DEFENDANT,
                contact_info="456 Oak Drive, Springfield, IL 62702, (217) 555-0456",
                insurance_company="Allstate Insurance",
                policy_number="AS-456789321",
                confidence=ConfidenceLevel.HIGH,
            ),
            Party(
                name="Emily Davis",
                party_type=PartyType.WITNESS,
                contact_info="789 Pine Lane, Springfield, IL 62703, (217) 555-7890",
                confidence=ConfidenceLevel.HIGH,
            ),
        ],
        incident=Incident(
            incident_date="2024-01-15",
            incident_location="Intersection of Main Street and Oak Avenue, Springfield, IL",
            description="Two-vehicle traffic accident. Vehicle 2 (Ford F-150) ran red light and struck Vehicle 1 (Honda Accord) which had green light.",
            incident_type="car accident",
            police_report_number="SPD-2024-001234",
            confidence=ConfidenceLevel.HIGH,
        ),
        damages=[
            Damage(
                damage_type=DamageType.PROPERTY,
                description="Damage to Honda Accord - driver's side doors and quarter panel",
                amount=8500.0,
                amount_is_estimate=True,
                confidence=ConfidenceLevel.HIGH,
            ),
            Damage(
                damage_type=DamageType.PROPERTY,
                description="Damage to Ford F-150 - front bumper, hood, and right fender",
                amount=6200.0,
                amount_is_estimate=True,
                confidence=ConfidenceLevel.HIGH,
            ),
            Damage(
                damage_type=DamageType.MEDICAL,
                description="Medical treatment for neck and back pain",
                confidence=ConfidenceLevel.MEDIUM,
            ),
        ],
        case_facts=[
            CaseFact(
                fact="Robert Williams was cited for Failure to Obey Traffic Control Device and Distracted Driving",
                category="liability",
                importance="high",
                confidence=ConfidenceLevel.HIGH,
            ),
            CaseFact(
                fact="Witness Emily Davis stated Vehicle 2 proceeded through red light",
                category="liability",
                importance="high",
                confidence=ConfidenceLevel.HIGH,
            ),
            CaseFact(
                fact="Robert Williams admitted he may have been distracted by his phone",
                category="liability",
                importance="high",
                confidence=ConfidenceLevel.HIGH,
            ),
        ],
        summary="Police report documenting a traffic accident where Robert Williams ran a red light and struck Sarah Johnson's vehicle. Williams was cited for traffic violations and admitted to being distracted by his phone.",
        total_damages_estimate=14700.0,
    )


class TestDocumentAnalyzer:
    """Test DocumentAnalyzer class."""

    def test_analyze_document_success(
        self, document_analyzer, sample_police_report_text, sample_extracted_data
    ):
        """Test successful document analysis."""
        # Mock Bedrock response with correct structure
        document_analyzer.bedrock_client.invoke.return_value = {
            "output": {
                "message": {
                    "content": [
                        {
                            "toolUse": {
                                "name": "extract_document_data",
                                "input": sample_extracted_data.model_dump(mode="json"),
                            }
                        }
                    ]
                }
            },
            "usage": {"input_tokens": 1500, "output_tokens": 800},
        }
        document_analyzer.bedrock_client.config = Mock(
            model_id="anthropic.claude-3-5-sonnet-20240620-v1:0"
        )

        # Analyze document
        result = document_analyzer.analyze_document(
            document_id="test-doc-001",
            document_text=sample_police_report_text,
            document_type="police_report",
            firm_id=1,
            user_id=100,
        )

        # Assertions
        assert result.success is True
        assert result.document_id == "test-doc-001"
        assert result.token_usage["input_tokens"] == 1500
        assert result.token_usage["output_tokens"] == 800
        assert result.processing_time_seconds > 0
        assert len(result.extracted_data.parties) == 3
        assert len(result.extracted_data.damages) == 3
        assert len(result.extracted_data.case_facts) == 3

    def test_analyze_document_failure(self, document_analyzer, sample_police_report_text):
        """Test document analysis with Bedrock failure."""
        # Mock Bedrock to raise exception
        document_analyzer.bedrock_client.invoke.side_effect = Exception(
            "Bedrock API error"
        )
        document_analyzer.bedrock_client.config = Mock(
            model_id="anthropic.claude-3-5-sonnet-20240620-v1:0"
        )

        # Analyze document
        result = document_analyzer.analyze_document(
            document_id="test-doc-002",
            document_text=sample_police_report_text,
            document_type="police_report",
        )

        # Assertions
        assert result.success is False
        assert result.error_message == "Bedrock API error"
        assert result.document_id == "test-doc-002"

    def test_extract_text_from_pdf_success(self, document_analyzer):
        """Test PDF text extraction."""
        # This would require a real PDF file or more complex mocking
        # For now, we'll skip this test
        pytest.skip("PDF extraction requires real PDF file or complex mocking")

    def test_get_extraction_summary(self, document_analyzer, sample_extracted_data):
        """Test extraction summary generation."""
        from src.schemas.extraction import ExtractionResult

        result = ExtractionResult(
            document_id="test-doc-003",
            extracted_data=sample_extracted_data,
            processing_time_seconds=5.2,
            token_usage={"input_tokens": 1500, "output_tokens": 800},
            model_id="anthropic.claude-3-5-sonnet-20240620-v1:0",
            extraction_timestamp="2024-01-15T10:30:00Z",
            success=True,
        )

        summary = document_analyzer.get_extraction_summary(result)

        assert summary["success"] is True
        assert summary["document_id"] == "test-doc-003"
        assert summary["document_type"] == "police_report"
        assert summary["parties_found"] == 3
        assert summary["damages_found"] == 3
        assert summary["facts_found"] == 3
        assert summary["total_damages"] == 14700.0
        assert summary["processing_time"] == 5.2
        assert summary["tokens_used"] == 2300

    def test_get_extraction_summary_failed(self, document_analyzer):
        """Test extraction summary for failed extraction."""
        from src.schemas.extraction import ExtractionResult

        result = ExtractionResult(
            document_id="test-doc-004",
            extracted_data=ExtractedData(
                metadata=DocumentMetadata(document_type="unknown"),
                summary="Extraction failed",
            ),
            processing_time_seconds=0.5,
            token_usage={"input_tokens": 0, "output_tokens": 0},
            model_id="anthropic.claude-3-5-sonnet-20240620-v1:0",
            extraction_timestamp="2024-01-15T10:30:00Z",
            success=False,
            error_message="Test error",
        )

        summary = document_analyzer.get_extraction_summary(result)

        assert summary["success"] is False
        assert summary["error"] == "Test error"
        assert summary["document_id"] == "test-doc-004"


class TestExtractedData:
    """Test ExtractedData schema methods."""

    def test_calculate_total_damages(self, sample_extracted_data):
        """Test damage calculation."""
        total = sample_extracted_data.calculate_total_damages()
        assert total == 14700.0

    def test_get_high_confidence_items(self, sample_extracted_data):
        """Test high confidence item counting."""
        counts = sample_extracted_data.get_high_confidence_items()

        assert counts["parties"] == 3  # All parties are HIGH confidence
        assert counts["damages"] == 2  # 2 property damages are HIGH
        assert counts["facts"] == 3  # All facts are HIGH
        assert counts["incident"] == 1  # Incident is HIGH confidence


# Integration tests (require real Bedrock access)
@pytest.mark.integration
class TestDocumentAnalyzerIntegration:
    """Integration tests with real Bedrock API."""

    def test_analyze_real_police_report(self, sample_police_report_text):
        """Test analysis with real Bedrock API."""
        # Skip if no AWS credentials
        if not os.getenv("AWS_ACCESS_KEY_ID"):
            pytest.skip("AWS credentials not available")

        analyzer = DocumentAnalyzer()

        result = analyzer.analyze_document(
            document_id="integration-test-001",
            document_text=sample_police_report_text,
            document_type="police_report",
        )

        # Basic assertions
        assert result.success is True
        assert len(result.extracted_data.parties) >= 2  # At least plaintiff and defendant
        assert result.extracted_data.incident is not None
        assert len(result.extracted_data.damages) > 0
        assert result.processing_time_seconds < 30  # Should complete in <30 seconds

        # Log results for inspection
        summary = analyzer.get_extraction_summary(result)
        print("\n=== Integration Test Results ===")
        print(f"Document Type: {summary['document_type']}")
        print(f"Parties Found: {summary['parties_found']}")
        print(f"Damages Found: {summary['damages_found']}")
        print(f"Facts Found: {summary['facts_found']}")
        print(f"Total Damages: ${summary['total_damages']:.2f}")
        print(f"Processing Time: {summary['processing_time']}s")
        print(f"Tokens Used: {summary['tokens_used']}")
