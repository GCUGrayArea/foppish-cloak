"""
Tests for letter_generator.py

Tests the demand letter generation functionality including:
- Initial letter generation
- Section completeness validation
- Letter preview generation
- Integration with Bedrock client
"""

import pytest
from unittest.mock import Mock, MagicMock, patch
from datetime import datetime

from src.letter_generator import LetterGenerator
from src.schemas.letter import (
    GeneratedLetter,
    LetterGenerationRequest,
    LetterGenerationResult,
    TemplateVariables,
    ToneStyle,
    LetterHeader,
    LetterIntroduction,
    LetterFacts,
    LetterLiability,
    LetterDamages,
    LetterDemand,
    LetterClosing,
    LetterSection,
    RefinementFeedback,
)
from src.schemas.extraction import ExtractedData, DocumentMetadata


@pytest.fixture
def mock_bedrock_client():
    """Create a mock Bedrock client."""
    client = Mock()
    client.config = Mock()
    client.config.model_id = "anthropic.claude-3-5-sonnet-20241022-v2:0"
    client.config.temperature_generation = 0.7
    return client


@pytest.fixture
def sample_extracted_data():
    """Create sample extracted data for testing."""
    return ExtractedData(
        metadata=DocumentMetadata(document_type="police_report"),
        parties=[],
        damages=[],
        case_facts=[],
        summary="A car accident occurred on Main Street.",
    )


@pytest.fixture
def sample_template_variables():
    """Create sample template variables."""
    return TemplateVariables(
        attorney_name="John Smith",
        law_firm="Smith & Associates",
        firm_address="123 Legal Ave, City, ST 12345",
        firm_phone="(555) 123-4567",
        firm_email="john@smithlaw.com",
        client_name="Jane Doe",
    )


@pytest.fixture
def sample_generation_request(sample_extracted_data, sample_template_variables):
    """Create sample generation request."""
    return LetterGenerationRequest(
        case_id="CASE-001",
        extracted_data=sample_extracted_data.model_dump(),
        template_variables=sample_template_variables,
        tone=ToneStyle.FORMAL,
    )


@pytest.fixture
def sample_generated_letter():
    """Create sample generated letter."""
    return GeneratedLetter(
        header=LetterHeader(
            date="January 15, 2025",
            recipient_name="Claims Adjuster",
            recipient_address="Insurance Co.\n456 Insurance Way\nCity, ST 12345",
            subject_line="Re: Claim #12345",
            salutation="Dear Claims Adjuster:",
        ),
        introduction=LetterIntroduction(
            content="This firm represents Jane Doe in connection with a personal injury claim.",
            client_name="Jane Doe",
            attorney_name="John Smith",
            law_firm="Smith & Associates",
        ),
        facts=LetterFacts(
            content="On January 1, 2025, our client was involved in a motor vehicle accident on Main Street. The collision occurred when the defendant failed to stop at a red light and struck our client's vehicle.",
            key_facts_count=2,
        ),
        liability=LetterLiability(
            content="The defendant is liable for negligence. The defendant breached their duty of care by running a red light, directly causing the accident and our client's injuries.",
            legal_theories=["negligence"],
        ),
        damages=LetterDamages(
            content="Our client has incurred significant damages including medical expenses, lost wages, and pain and suffering.",
            medical_expenses=5000.0,
            lost_wages=3000.0,
            pain_suffering=10000.0,
            total_damages=18000.0,
        ),
        demand=LetterDemand(
            content="We demand payment of $18,000.00 to settle this matter within 30 days.",
            demand_amount=18000.0,
            response_deadline="February 14, 2025",
            consequences_stated=True,
        ),
        closing=LetterClosing(
            content="We look forward to your prompt response.",
            signature_block="John Smith, Esq.\nSmith & Associates",
            closing_phrase="Sincerely,",
        ),
    )


class TestLetterGenerator:
    """Test suite for LetterGenerator class."""

    def test_initialization_default(self):
        """Test letter generator initialization with defaults."""
        generator = LetterGenerator()
        assert generator.bedrock_client is not None
        assert generator.logger is not None

    def test_initialization_with_client(self, mock_bedrock_client):
        """Test letter generator initialization with custom client."""
        generator = LetterGenerator(bedrock_client=mock_bedrock_client)
        assert generator.bedrock_client == mock_bedrock_client

    def test_generate_letter_success(
        self, mock_bedrock_client, sample_generation_request, sample_generated_letter
    ):
        """Test successful letter generation."""
        # Mock Bedrock response
        mock_response = {
            "output": {
                "message": {
                    "content": [
                        {
                            "toolUse": {
                                "name": "generate_demand_letter",
                                "input": sample_generated_letter.model_dump(),
                            }
                        }
                    ]
                }
            },
            "usage": {"inputTokens": 1000, "outputTokens": 2000},
        }
        mock_bedrock_client.invoke.return_value = mock_response

        generator = LetterGenerator(bedrock_client=mock_bedrock_client)
        result = generator.generate_letter(sample_generation_request)

        # Verify result
        assert isinstance(result, LetterGenerationResult)
        assert result.success is True
        assert result.case_id == "CASE-001"
        assert result.version == 1
        assert result.token_usage["input_tokens"] == 1000
        assert result.token_usage["output_tokens"] == 2000
        assert result.processing_time_seconds > 0

        # Verify Bedrock client was called
        mock_bedrock_client.invoke.assert_called_once()
        call_args = mock_bedrock_client.invoke.call_args
        assert call_args[1]["temperature"] == 0.7

    def test_generate_letter_failure(
        self, mock_bedrock_client, sample_generation_request
    ):
        """Test letter generation failure handling."""
        # Mock Bedrock error
        mock_bedrock_client.invoke.side_effect = Exception("Bedrock error")

        generator = LetterGenerator(bedrock_client=mock_bedrock_client)
        result = generator.generate_letter(sample_generation_request)

        # Verify error handling
        assert result.success is False
        assert result.error_message == "Bedrock error"
        assert result.version == 0
        assert result.token_usage["input_tokens"] == 0

    def test_refine_letter_success(
        self, mock_bedrock_client, sample_generated_letter
    ):
        """Test successful letter refinement."""
        # Create modified letter
        modified_letter = sample_generated_letter.model_copy(deep=True)
        modified_letter.facts.content = "Updated facts section with more details."

        # Mock Bedrock response
        mock_response = {
            "output": {
                "message": {
                    "content": [
                        {
                            "toolUse": {
                                "name": "refine_demand_letter",
                                "input": modified_letter.model_dump(),
                            }
                        }
                    ]
                }
            },
            "usage": {"inputTokens": 1500, "outputTokens": 1800},
        }
        mock_bedrock_client.invoke.return_value = mock_response

        generator = LetterGenerator(bedrock_client=mock_bedrock_client)
        feedback = RefinementFeedback(
            instruction="Add more details to the facts section",
            target_section=LetterSection.FACTS,
        )

        result = generator.refine_letter(
            current_letter=sample_generated_letter,
            feedback=feedback,
            current_version=1,
        )

        # Verify result
        assert result.refined_letter.facts.content == "Updated facts section with more details."
        assert LetterSection.FACTS in result.sections_modified
        assert len(result.changes_summary) > 0

    def test_compare_letters(self, mock_bedrock_client, sample_generated_letter):
        """Test letter comparison logic."""
        generator = LetterGenerator(bedrock_client=mock_bedrock_client)

        # Create modified letter
        modified_letter = sample_generated_letter.model_copy(deep=True)
        modified_letter.facts.content = "Different facts"
        modified_letter.damages.content = "Different damages"

        # Compare letters
        sections_modified = generator._compare_letters(
            sample_generated_letter, modified_letter
        )

        assert LetterSection.FACTS in sections_modified
        assert LetterSection.DAMAGES in sections_modified
        assert LetterSection.INTRODUCTION not in sections_modified

    def test_validate_letter_completeness_complete(
        self, mock_bedrock_client, sample_generated_letter
    ):
        """Test validation of complete letter."""
        generator = LetterGenerator(bedrock_client=mock_bedrock_client)
        checks = generator.validate_letter_completeness(sample_generated_letter)

        assert checks["has_header"] is True
        assert checks["has_introduction"] is True
        assert checks["has_facts"] is True
        assert checks["has_liability"] is True
        assert checks["has_damages"] is True
        assert checks["has_demand"] is True
        assert checks["has_closing"] is True
        assert checks["is_complete"] is True

    def test_validate_letter_completeness_incomplete(self, mock_bedrock_client):
        """Test validation of incomplete letter."""
        incomplete_letter = GeneratedLetter(
            header=LetterHeader(
                date="",
                recipient_name="",
                recipient_address="",
                subject_line="",
            ),
            introduction=LetterIntroduction(content="", client_name=""),
            facts=LetterFacts(content=""),
            liability=LetterLiability(content=""),
            damages=LetterDamages(content="", total_damages=0.0),
            demand=LetterDemand(content="", demand_amount=0.0),
            closing=LetterClosing(content="", signature_block=""),
        )

        generator = LetterGenerator(bedrock_client=mock_bedrock_client)
        checks = generator.validate_letter_completeness(incomplete_letter)

        assert checks["has_header"] is False
        assert checks["has_damages"] is False
        assert checks["has_demand"] is False
        assert checks["is_complete"] is False

    def test_get_letter_preview_short(
        self, mock_bedrock_client, sample_generated_letter
    ):
        """Test letter preview for short letter."""
        generator = LetterGenerator(bedrock_client=mock_bedrock_client)
        preview = generator.get_letter_preview(sample_generated_letter, max_length=5000)

        full_text = sample_generated_letter.to_full_text()
        assert preview == full_text

    def test_get_letter_preview_long(
        self, mock_bedrock_client, sample_generated_letter
    ):
        """Test letter preview for long letter (truncated)."""
        generator = LetterGenerator(bedrock_client=mock_bedrock_client)
        preview = generator.get_letter_preview(sample_generated_letter, max_length=100)

        assert len(preview) <= 103  # 100 + "..."
        assert preview.endswith("...")

    def test_regenerate_section(self, mock_bedrock_client, sample_generated_letter):
        """Test section regeneration."""
        # Create modified letter with new facts section
        modified_letter = sample_generated_letter.model_copy(deep=True)
        modified_letter.facts.content = "Completely regenerated facts section."

        # Mock Bedrock response
        mock_response = {
            "output": {
                "message": {
                    "content": [
                        {
                            "toolUse": {
                                "name": "regenerate_letter_section",
                                "input": modified_letter.model_dump(),
                            }
                        }
                    ]
                }
            },
            "usage": {"inputTokens": 1200, "outputTokens": 1500},
        }
        mock_bedrock_client.invoke.return_value = mock_response

        generator = LetterGenerator(bedrock_client=mock_bedrock_client)
        result = generator.regenerate_section(
            current_letter=sample_generated_letter,
            section=LetterSection.FACTS,
            instruction="Rewrite with more chronological detail",
        )

        assert result.facts.content == "Completely regenerated facts section."

    def test_adjust_tone(self, mock_bedrock_client, sample_generated_letter):
        """Test tone adjustment."""
        # Create letter with adjusted tone
        adjusted_letter = sample_generated_letter.model_copy(deep=True)
        adjusted_letter.introduction.content = "This firm aggressively represents Jane Doe."

        # Mock Bedrock response
        mock_response = {
            "output": {
                "message": {
                    "content": [
                        {
                            "toolUse": {
                                "name": "adjust_letter_tone",
                                "input": adjusted_letter.model_dump(),
                            }
                        }
                    ]
                }
            },
            "usage": {"inputTokens": 1300, "outputTokens": 1600},
        }
        mock_bedrock_client.invoke.return_value = mock_response

        generator = LetterGenerator(bedrock_client=mock_bedrock_client)
        result = generator.adjust_tone(
            current_letter=sample_generated_letter,
            new_tone=ToneStyle.AGGRESSIVE,
        )

        assert "aggressively" in result.introduction.content.lower()

    def test_generate_change_summary(self, mock_bedrock_client, sample_generated_letter):
        """Test change summary generation."""
        generator = LetterGenerator(bedrock_client=mock_bedrock_client)

        modified_letter = sample_generated_letter.model_copy(deep=True)
        modified_letter.facts.content = "New facts"

        summary = generator._generate_change_summary(
            original=sample_generated_letter,
            modified=modified_letter,
            sections_modified=[LetterSection.FACTS],
            feedback_instruction="Update the facts section",
        )

        assert "1 section" in summary
        assert "Facts" in summary

    def test_letter_to_full_text(self, sample_generated_letter):
        """Test conversion of structured letter to full text."""
        full_text = sample_generated_letter.to_full_text()

        # Verify all sections are present
        assert "January 15, 2025" in full_text
        assert "Claims Adjuster" in full_text
        assert "Re: Claim #12345" in full_text
        assert "Jane Doe" in full_text
        assert "motor vehicle accident" in full_text
        assert "negligence" in full_text
        assert "$18,000" in full_text
        assert "John Smith, Esq." in full_text

    def test_letter_get_section_text(self, sample_generated_letter):
        """Test getting specific section text."""
        intro_text = sample_generated_letter.get_section_text(LetterSection.INTRODUCTION)
        assert "Jane Doe" in intro_text
        assert "personal injury claim" in intro_text

        facts_text = sample_generated_letter.get_section_text(LetterSection.FACTS)
        assert "motor vehicle accident" in facts_text


class TestLetterGenerationIntegration:
    """Integration tests for letter generation (requires actual Bedrock access)."""

    @pytest.mark.integration
    def test_full_generation_workflow(
        self, sample_generation_request, sample_generated_letter
    ):
        """
        Integration test for full letter generation workflow.

        This test requires actual Bedrock access and should only run in integration test mode.
        """
        # This would use real BedrockClient
        generator = LetterGenerator()

        # Note: This would actually call Bedrock
        # result = generator.generate_letter(sample_generation_request, firm_id=1, user_id=1)
        # assert result.success is True

        # For now, skip actual call
        pytest.skip("Integration test requires Bedrock access")

    @pytest.mark.integration
    def test_refinement_workflow(self):
        """
        Integration test for letter refinement workflow.

        This test requires actual Bedrock access.
        """
        pytest.skip("Integration test requires Bedrock access")


class TestPerformance:
    """Performance tests for letter generation."""

    def test_generation_performance(
        self, mock_bedrock_client, sample_generation_request, sample_generated_letter
    ):
        """Test that letter generation completes within acceptable time."""
        # Mock Bedrock response
        mock_response = {
            "output": {
                "message": {
                    "content": [
                        {
                            "toolUse": {
                                "name": "generate_demand_letter",
                                "input": sample_generated_letter.model_dump(),
                            }
                        }
                    ]
                }
            },
            "usage": {"inputTokens": 1000, "outputTokens": 2000},
        }
        mock_bedrock_client.invoke.return_value = mock_response

        generator = LetterGenerator(bedrock_client=mock_bedrock_client)

        import time

        start = time.time()
        result = generator.generate_letter(sample_generation_request)
        elapsed = time.time() - start

        # Should complete in <10 seconds (per acceptance criteria)
        # In test with mocks, should be nearly instant
        assert elapsed < 1.0  # Test environment should be very fast
        assert result.processing_time_seconds < 10.0  # Measured time
