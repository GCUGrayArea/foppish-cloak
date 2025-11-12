"""
Tests for refinement/feedback_handler.py

Tests the iterative refinement functionality including:
- Refinement session management
- Feedback application
- Batch feedback processing
- Version history and rollback
- Improvement suggestions
"""

import pytest
from unittest.mock import Mock, MagicMock

from src.refinement.feedback_handler import FeedbackHandler
from src.letter_generator import LetterGenerator
from src.schemas.letter import (
    GeneratedLetter,
    LetterHeader,
    LetterIntroduction,
    LetterFacts,
    LetterLiability,
    LetterDamages,
    LetterDemand,
    LetterClosing,
    RefinementFeedback,
    RefinementResult,
    ConversationHistory,
    LetterSection,
)


@pytest.fixture
def mock_letter_generator():
    """Create a mock letter generator."""
    generator = Mock(spec=LetterGenerator)
    return generator


@pytest.fixture
def sample_letter():
    """Create a sample letter for testing."""
    return GeneratedLetter(
        header=LetterHeader(
            date="January 15, 2025",
            recipient_name="Claims Adjuster",
            recipient_address="Insurance Co.\n456 Insurance Way\nCity, ST 12345",
            subject_line="Re: Claim #12345",
        ),
        introduction=LetterIntroduction(
            content="This firm represents Jane Doe.",
            client_name="Jane Doe",
        ),
        facts=LetterFacts(
            content="On January 1, 2025, an accident occurred.",
            key_facts_count=1,
        ),
        liability=LetterLiability(
            content="The defendant is liable for negligence.",
            legal_theories=["negligence"],
        ),
        damages=LetterDamages(
            content="Our client has incurred damages.",
            medical_expenses=5000.0,
            total_damages=5000.0,
        ),
        demand=LetterDemand(
            content="We demand payment of $5,000.",
            demand_amount=5000.0,
        ),
        closing=LetterClosing(
            content="We look forward to your response.",
            signature_block="John Smith, Esq.",
        ),
    )


@pytest.fixture
def sample_refined_letter(sample_letter):
    """Create a refined version of the sample letter."""
    refined = sample_letter.model_copy(deep=True)
    refined.facts.content = "On January 1, 2025, a serious accident occurred on Main Street."
    refined.facts.key_facts_count = 2
    return refined


class TestFeedbackHandler:
    """Test suite for FeedbackHandler class."""

    def test_initialization(self):
        """Test feedback handler initialization."""
        handler = FeedbackHandler()
        assert handler.letter_generator is not None
        assert handler.logger is not None
        assert len(handler.conversation_histories) == 0

    def test_initialization_with_generator(self, mock_letter_generator):
        """Test initialization with custom letter generator."""
        handler = FeedbackHandler(letter_generator=mock_letter_generator)
        assert handler.letter_generator == mock_letter_generator

    def test_start_refinement_session(self, sample_letter):
        """Test starting a new refinement session."""
        handler = FeedbackHandler()
        session_id = handler.start_refinement_session("CASE-001", sample_letter)

        assert session_id == "CASE-001_refinement"
        assert session_id in handler.conversation_histories

        # Verify initial version was added
        history = handler.conversation_histories[session_id]
        assert len(history.version_history) == 1
        assert history.version_history[0]["version"] == 1
        assert history.version_history[0]["changes_summary"] == "Initial generation"

    def test_apply_feedback_success(
        self, mock_letter_generator, sample_letter, sample_refined_letter
    ):
        """Test successful feedback application."""
        # Setup mock
        mock_refinement_result = RefinementResult(
            refined_letter=sample_refined_letter,
            changes_summary="Updated facts section",
            sections_modified=[LetterSection.FACTS],
        )
        mock_letter_generator.refine_letter.return_value = mock_refinement_result

        handler = FeedbackHandler(letter_generator=mock_letter_generator)
        session_id = handler.start_refinement_session("CASE-001", sample_letter)

        feedback = RefinementFeedback(
            instruction="Add more detail to facts",
            target_section=LetterSection.FACTS,
        )

        result = handler.apply_feedback(session_id, sample_letter, feedback)

        # Verify result
        assert result.refined_letter == sample_refined_letter
        assert LetterSection.FACTS in result.sections_modified

        # Verify mock was called correctly
        mock_letter_generator.refine_letter.assert_called_once()

    def test_apply_feedback_session_not_found(self, mock_letter_generator, sample_letter):
        """Test feedback application with invalid session."""
        handler = FeedbackHandler(letter_generator=mock_letter_generator)

        feedback = RefinementFeedback(instruction="Test")

        with pytest.raises(ValueError, match="Refinement session not found"):
            handler.apply_feedback("invalid_session", sample_letter, feedback)

    def test_apply_batch_feedback(
        self, mock_letter_generator, sample_letter, sample_refined_letter
    ):
        """Test applying multiple feedback items in batch."""
        # Setup mocks for each feedback item
        mock_result_1 = RefinementResult(
            refined_letter=sample_refined_letter,
            changes_summary="Updated facts",
            sections_modified=[LetterSection.FACTS],
        )
        mock_result_2 = RefinementResult(
            refined_letter=sample_refined_letter,
            changes_summary="Updated damages",
            sections_modified=[LetterSection.DAMAGES],
        )

        mock_letter_generator.refine_letter.side_effect = [mock_result_1, mock_result_2]

        handler = FeedbackHandler(letter_generator=mock_letter_generator)
        session_id = handler.start_refinement_session("CASE-001", sample_letter)

        feedback_list = [
            RefinementFeedback(
                instruction="Add more detail to facts",
                target_section=LetterSection.FACTS,
                priority="high",
            ),
            RefinementFeedback(
                instruction="Clarify damages",
                target_section=LetterSection.DAMAGES,
                priority="medium",
            ),
        ]

        result = handler.apply_batch_feedback(session_id, sample_letter, feedback_list)

        # Verify batch results
        assert len(result.sections_modified) > 0
        assert "Updated facts" in result.changes_summary
        assert "Updated damages" in result.changes_summary

        # Verify refine_letter was called twice
        assert mock_letter_generator.refine_letter.call_count == 2

    def test_apply_batch_feedback_priority_order(
        self, mock_letter_generator, sample_letter, sample_refined_letter
    ):
        """Test that batch feedback is applied in priority order."""
        mock_result = RefinementResult(
            refined_letter=sample_refined_letter,
            changes_summary="Updated",
            sections_modified=[],
        )
        mock_letter_generator.refine_letter.return_value = mock_result

        handler = FeedbackHandler(letter_generator=mock_letter_generator)
        session_id = handler.start_refinement_session("CASE-001", sample_letter)

        # Create feedback with different priorities
        feedback_list = [
            RefinementFeedback(instruction="Low priority", priority="low"),
            RefinementFeedback(instruction="High priority", priority="high"),
            RefinementFeedback(instruction="Medium priority", priority="medium"),
        ]

        handler.apply_batch_feedback(session_id, sample_letter, feedback_list)

        # Verify calls were made in priority order (high, medium, low)
        calls = mock_letter_generator.refine_letter.call_args_list
        assert len(calls) == 3

        # Check that high priority was first
        first_feedback = calls[0][1]["feedback"]
        assert first_feedback.instruction == "High priority"

    def test_apply_batch_feedback_empty_list(
        self, mock_letter_generator, sample_letter
    ):
        """Test batch feedback with empty list."""
        handler = FeedbackHandler(letter_generator=mock_letter_generator)
        session_id = handler.start_refinement_session("CASE-001", sample_letter)

        with pytest.raises(ValueError, match="Feedback list is empty"):
            handler.apply_batch_feedback(session_id, sample_letter, [])

    def test_get_version_history(self, sample_letter):
        """Test retrieving version history."""
        handler = FeedbackHandler()
        session_id = handler.start_refinement_session("CASE-001", sample_letter)

        history = handler.get_version_history(session_id)

        assert len(history) == 1
        assert history[0]["version"] == 1
        assert "timestamp" in history[0]
        assert "changes_summary" in history[0]

    def test_get_version_history_invalid_session(self):
        """Test version history with invalid session."""
        handler = FeedbackHandler()

        with pytest.raises(ValueError, match="Refinement session not found"):
            handler.get_version_history("invalid_session")

    def test_rollback_to_version(self, sample_letter):
        """Test rolling back to a previous version."""
        handler = FeedbackHandler()
        session_id = handler.start_refinement_session("CASE-001", sample_letter)

        # Rollback to version 1
        letter = handler.rollback_to_version(session_id, 1)

        assert isinstance(letter, GeneratedLetter)
        assert letter.introduction.client_name == "Jane Doe"

    def test_rollback_to_invalid_version(self, sample_letter):
        """Test rollback to non-existent version."""
        handler = FeedbackHandler()
        session_id = handler.start_refinement_session("CASE-001", sample_letter)

        with pytest.raises(ValueError, match="Version 99 not found"):
            handler.rollback_to_version(session_id, 99)

    def test_compare_versions(self, sample_letter, sample_refined_letter):
        """Test comparing two versions of a letter."""
        handler = FeedbackHandler()
        session_id = handler.start_refinement_session("CASE-001", sample_letter)

        # Add a second version manually for testing
        conversation_history = handler.conversation_histories[session_id]
        conversation_history.add_version(
            version=2,
            letter=sample_refined_letter,
            changes_summary="Updated facts",
        )

        # Compare versions
        comparison = handler.compare_versions(session_id, 1, 2)

        assert comparison["version_a"] == 1
        assert comparison["version_b"] == 2
        assert "modified_sections" in comparison
        assert "timestamp_a" in comparison
        assert "timestamp_b" in comparison

    def test_get_conversation_context(self, sample_letter):
        """Test retrieving conversation context."""
        handler = FeedbackHandler()
        session_id = handler.start_refinement_session("CASE-001", sample_letter)

        # Add some messages
        conversation_history = handler.conversation_histories[session_id]
        conversation_history.add_message("user", "Please update the facts")
        conversation_history.add_message("assistant", "Facts updated")

        context = handler.get_conversation_context(session_id)

        assert len(context) == 2
        assert context[0]["role"] == "user"
        assert context[1]["role"] == "assistant"

    def test_clear_session(self, sample_letter):
        """Test clearing a refinement session."""
        handler = FeedbackHandler()
        session_id = handler.start_refinement_session("CASE-001", sample_letter)

        assert session_id in handler.conversation_histories

        handler.clear_session(session_id)

        assert session_id not in handler.conversation_histories

    def test_get_refinement_stats(self, sample_letter):
        """Test getting refinement statistics."""
        handler = FeedbackHandler()
        session_id = handler.start_refinement_session("CASE-001", sample_letter)

        # Add some messages
        conversation_history = handler.conversation_histories[session_id]
        conversation_history.add_message("user", "Update facts")
        conversation_history.add_message("assistant", "Done")

        stats = handler.get_refinement_stats(session_id)

        assert stats["session_id"] == session_id
        assert stats["total_versions"] == 1
        assert stats["current_version"] == 1
        assert stats["total_messages"] == 2
        assert stats["refinement_count"] == 1

    def test_suggest_improvements_complete_letter(self, sample_letter):
        """Test improvement suggestions for complete letter."""
        handler = FeedbackHandler()
        suggestions = handler.suggest_improvements(sample_letter)

        # Complete letter should have few or no suggestions
        # (may have some like adding deadline)
        assert isinstance(suggestions, list)

    def test_suggest_improvements_incomplete_letter(self):
        """Test improvement suggestions for incomplete letter."""
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

        handler = FeedbackHandler()
        suggestions = handler.suggest_improvements(incomplete_letter)

        # Should have many suggestions
        assert len(suggestions) > 3
        assert any("Header" in s for s in suggestions)
        assert any("Introduction" in s for s in suggestions)

    def test_suggest_improvements_damages_mismatch(self):
        """Test suggestions when damages don't match."""
        letter = GeneratedLetter(
            header=LetterHeader(
                date="Jan 1",
                recipient_name="Adjuster",
                recipient_address="Address",
                subject_line="Re: Claim",
            ),
            introduction=LetterIntroduction(
                content="This firm represents the client.",
                client_name="Client",
            ),
            facts=LetterFacts(
                content="Facts about the case are described here in detail.",
            ),
            liability=LetterLiability(
                content="Liability is established through negligence and breach of duty.",
            ),
            damages=LetterDamages(
                content="Damages described.",
                medical_expenses=5000.0,
                lost_wages=3000.0,
                total_damages=10000.0,  # Should be 8000
            ),
            demand=LetterDemand(
                content="We demand payment.",
                demand_amount=10000.0,
            ),
            closing=LetterClosing(
                content="We await your response.",
                signature_block="Attorney",
            ),
        )

        handler = FeedbackHandler()
        suggestions = handler.suggest_improvements(letter)

        # Should suggest fixing damages mismatch
        assert any("Itemized damages" in s and "don't match" in s for s in suggestions)

    def test_suggest_improvements_demand_less_than_damages(self):
        """Test suggestions when demand is less than damages."""
        letter = GeneratedLetter(
            header=LetterHeader(
                date="Jan 1",
                recipient_name="Adjuster",
                recipient_address="Address",
                subject_line="Re: Claim",
            ),
            introduction=LetterIntroduction(
                content="This firm represents the client.",
                client_name="Client",
            ),
            facts=LetterFacts(
                content="Facts about the case are described here in detail.",
            ),
            liability=LetterLiability(
                content="Liability is established through negligence and breach of duty.",
            ),
            damages=LetterDamages(
                content="Damages described.",
                total_damages=10000.0,
            ),
            demand=LetterDemand(
                content="We demand payment.",
                demand_amount=5000.0,  # Less than damages
            ),
            closing=LetterClosing(
                content="We await your response.",
                signature_block="Attorney",
            ),
        )

        handler = FeedbackHandler()
        suggestions = handler.suggest_improvements(letter)

        # Should suggest fixing demand amount
        assert any("Demand amount" in s and "less than" in s for s in suggestions)


class TestConversationHistory:
    """Test suite for ConversationHistory class."""

    def test_initialization(self):
        """Test conversation history initialization."""
        history = ConversationHistory()
        assert len(history.messages) == 0
        assert len(history.version_history) == 0

    def test_add_message(self):
        """Test adding messages to history."""
        history = ConversationHistory()
        history.add_message("user", "Hello")
        history.add_message("assistant", "Hi there")

        assert len(history.messages) == 2
        assert history.messages[0]["role"] == "user"
        assert history.messages[1]["content"] == "Hi there"

    def test_add_version(self, sample_letter):
        """Test adding version to history."""
        history = ConversationHistory()
        history.add_version(1, sample_letter, "Initial version")

        assert len(history.version_history) == 1
        assert history.version_history[0]["version"] == 1
        assert "timestamp" in history.version_history[0]
        assert history.version_history[0]["changes_summary"] == "Initial version"

    def test_get_latest_version_empty(self):
        """Test getting latest version with no history."""
        history = ConversationHistory()
        assert history.get_latest_version() == 0

    def test_get_latest_version_with_history(self, sample_letter):
        """Test getting latest version with history."""
        history = ConversationHistory()
        history.add_version(1, sample_letter, "Version 1")
        history.add_version(2, sample_letter, "Version 2")
        history.add_version(3, sample_letter, "Version 3")

        assert history.get_latest_version() == 3
