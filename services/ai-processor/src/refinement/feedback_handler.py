"""
Feedback Handler

Manages iterative refinement of demand letters based on attorney feedback.
Handles conversation history, version tracking, and refinement workflows.
"""

import logging
from typing import Optional

from ..letter_generator import LetterGenerator
from ..schemas.letter import (
    GeneratedLetter,
    LetterGenerationResult,
    RefinementFeedback,
    RefinementResult,
    ConversationHistory,
    LetterSection,
    ToneStyle,
)


class FeedbackHandler:
    """
    Manages iterative refinement of demand letters.

    Features:
    - Conversation history management
    - Version tracking and rollback
    - Batch feedback processing
    - Refinement workflow orchestration
    """

    def __init__(
        self,
        letter_generator: LetterGenerator | None = None,
        logger: logging.Logger | None = None,
    ):
        """
        Initialize feedback handler.

        Args:
            letter_generator: Letter generator instance (creates default if None)
            logger: Logger instance (creates default if None)
        """
        self.letter_generator = letter_generator or LetterGenerator()
        self.logger = logger or logging.getLogger("feedback_handler")
        self.conversation_histories: dict[str, ConversationHistory] = {}

    def start_refinement_session(
        self,
        case_id: str,
        initial_letter: GeneratedLetter,
    ) -> str:
        """
        Start a new refinement session.

        Args:
            case_id: Case identifier
            initial_letter: Initial letter to refine

        Returns:
            Session ID for tracking
        """
        session_id = f"{case_id}_refinement"

        # Initialize conversation history
        conversation_history = ConversationHistory()
        conversation_history.add_version(
            version=1,
            letter=initial_letter,
            changes_summary="Initial generation",
        )

        self.conversation_histories[session_id] = conversation_history

        self.logger.info(
            f"Started refinement session for case {case_id}",
            extra={"case_id": case_id, "session_id": session_id},
        )

        return session_id

    def apply_feedback(
        self,
        session_id: str,
        current_letter: GeneratedLetter,
        feedback: RefinementFeedback,
        firm_id: int | None = None,
        user_id: int | None = None,
    ) -> RefinementResult:
        """
        Apply attorney feedback to refine the letter.

        Args:
            session_id: Refinement session ID
            current_letter: Current letter version
            feedback: Refinement feedback
            firm_id: Firm ID for multi-tenancy
            user_id: User ID for tracking

        Returns:
            Refinement result with refined letter

        Raises:
            ValueError: If session not found or refinement fails
        """
        # Get conversation history
        conversation_history = self.conversation_histories.get(session_id)
        if conversation_history is None:
            raise ValueError(f"Refinement session not found: {session_id}")

        # Get current version
        current_version = conversation_history.get_latest_version()

        self.logger.info(
            f"Applying feedback to session {session_id} (version {current_version})",
            extra={
                "session_id": session_id,
                "current_version": current_version,
                "priority": feedback.priority,
            },
        )

        # Apply refinement
        result = self.letter_generator.refine_letter(
            current_letter=current_letter,
            feedback=feedback,
            conversation_history=conversation_history,
            current_version=current_version,
            firm_id=firm_id,
            user_id=user_id,
        )

        self.logger.info(
            f"Feedback applied successfully (version {current_version + 1})",
            extra={
                "session_id": session_id,
                "new_version": current_version + 1,
                "sections_modified": [s.value for s in result.sections_modified],
            },
        )

        return result

    def apply_batch_feedback(
        self,
        session_id: str,
        current_letter: GeneratedLetter,
        feedback_list: list[RefinementFeedback],
        firm_id: int | None = None,
        user_id: int | None = None,
    ) -> RefinementResult:
        """
        Apply multiple feedback items in sequence.

        Feedback items are applied in priority order (high -> medium -> low).

        Args:
            session_id: Refinement session ID
            current_letter: Current letter version
            feedback_list: List of feedback items
            firm_id: Firm ID for multi-tenancy
            user_id: User ID for tracking

        Returns:
            Final refinement result after all feedback applied

        Raises:
            ValueError: If session not found or refinement fails
        """
        if not feedback_list:
            raise ValueError("Feedback list is empty")

        # Sort feedback by priority
        priority_order = {"high": 0, "medium": 1, "low": 2}
        sorted_feedback = sorted(
            feedback_list,
            key=lambda f: priority_order.get(f.priority, 1),
        )

        self.logger.info(
            f"Applying batch feedback: {len(sorted_feedback)} items",
            extra={
                "session_id": session_id,
                "feedback_count": len(sorted_feedback),
            },
        )

        # Apply each feedback item sequentially
        working_letter = current_letter
        all_sections_modified = set()
        change_summaries = []

        for i, feedback in enumerate(sorted_feedback):
            self.logger.info(
                f"Applying feedback {i + 1}/{len(sorted_feedback)}: {feedback.instruction[:50]}...",
                extra={"session_id": session_id, "feedback_index": i + 1},
            )

            result = self.apply_feedback(
                session_id=session_id,
                current_letter=working_letter,
                feedback=feedback,
                firm_id=firm_id,
                user_id=user_id,
            )

            working_letter = result.refined_letter
            all_sections_modified.update(result.sections_modified)
            change_summaries.append(result.changes_summary)

        # Combine all change summaries
        combined_summary = " | ".join(change_summaries)

        self.logger.info(
            f"Batch feedback completed: {len(sorted_feedback)} items applied",
            extra={
                "session_id": session_id,
                "total_sections_modified": len(all_sections_modified),
            },
        )

        return RefinementResult(
            refined_letter=working_letter,
            changes_summary=combined_summary,
            sections_modified=list(all_sections_modified),
        )

    def get_version_history(self, session_id: str) -> list[dict]:
        """
        Get version history for a refinement session.

        Args:
            session_id: Refinement session ID

        Returns:
            List of version history entries

        Raises:
            ValueError: If session not found
        """
        conversation_history = self.conversation_histories.get(session_id)
        if conversation_history is None:
            raise ValueError(f"Refinement session not found: {session_id}")

        return conversation_history.version_history

    def rollback_to_version(
        self, session_id: str, target_version: int
    ) -> GeneratedLetter:
        """
        Rollback to a previous letter version.

        Args:
            session_id: Refinement session ID
            target_version: Version number to rollback to

        Returns:
            Letter from the target version

        Raises:
            ValueError: If session or version not found
        """
        conversation_history = self.conversation_histories.get(session_id)
        if conversation_history is None:
            raise ValueError(f"Refinement session not found: {session_id}")

        # Find target version in history
        for version_entry in conversation_history.version_history:
            if version_entry["version"] == target_version:
                letter_data = version_entry["letter_snapshot"]
                letter = GeneratedLetter.model_validate(letter_data)

                self.logger.info(
                    f"Rolled back to version {target_version}",
                    extra={"session_id": session_id, "target_version": target_version},
                )

                return letter

        raise ValueError(
            f"Version {target_version} not found in session {session_id}"
        )

    def compare_versions(
        self, session_id: str, version_a: int, version_b: int
    ) -> dict:
        """
        Compare two versions of a letter.

        Args:
            session_id: Refinement session ID
            version_a: First version to compare
            version_b: Second version to compare

        Returns:
            Comparison summary

        Raises:
            ValueError: If session or versions not found
        """
        letter_a = self.rollback_to_version(session_id, version_a)
        letter_b = self.rollback_to_version(session_id, version_b)

        # Use the letter generator's comparison logic
        modified_sections = self.letter_generator._compare_letters(letter_a, letter_b)

        # Get version entries for timestamps and summaries
        conversation_history = self.conversation_histories[session_id]
        entry_a = next(
            (v for v in conversation_history.version_history if v["version"] == version_a),
            None,
        )
        entry_b = next(
            (v for v in conversation_history.version_history if v["version"] == version_b),
            None,
        )

        return {
            "version_a": version_a,
            "version_b": version_b,
            "timestamp_a": entry_a["timestamp"] if entry_a else None,
            "timestamp_b": entry_b["timestamp"] if entry_b else None,
            "changes_summary_a": entry_a["changes_summary"] if entry_a else None,
            "changes_summary_b": entry_b["changes_summary"] if entry_b else None,
            "modified_sections": [s.value for s in modified_sections],
            "section_count_modified": len(modified_sections),
        }

    def get_conversation_context(self, session_id: str) -> list[dict]:
        """
        Get conversation messages for a session.

        Args:
            session_id: Refinement session ID

        Returns:
            List of conversation messages

        Raises:
            ValueError: If session not found
        """
        conversation_history = self.conversation_histories.get(session_id)
        if conversation_history is None:
            raise ValueError(f"Refinement session not found: {session_id}")

        return conversation_history.messages

    def clear_session(self, session_id: str) -> None:
        """
        Clear a refinement session and free memory.

        Args:
            session_id: Refinement session ID
        """
        if session_id in self.conversation_histories:
            del self.conversation_histories[session_id]
            self.logger.info(
                f"Cleared refinement session {session_id}",
                extra={"session_id": session_id},
            )

    def get_refinement_stats(self, session_id: str) -> dict:
        """
        Get statistics about a refinement session.

        Args:
            session_id: Refinement session ID

        Returns:
            Statistics dictionary

        Raises:
            ValueError: If session not found
        """
        conversation_history = self.conversation_histories.get(session_id)
        if conversation_history is None:
            raise ValueError(f"Refinement session not found: {session_id}")

        version_count = len(conversation_history.version_history)
        message_count = len(conversation_history.messages)

        # Count sections modified across all versions
        all_sections_modified = set()
        for version_entry in conversation_history.version_history:
            # This is a simplified count - in real implementation,
            # we would track which sections were modified in each version
            pass

        return {
            "session_id": session_id,
            "total_versions": version_count,
            "current_version": conversation_history.get_latest_version(),
            "total_messages": message_count,
            "refinement_count": message_count // 2,  # Approximate (user + assistant pairs)
        }

    def suggest_improvements(self, letter: GeneratedLetter) -> list[str]:
        """
        Analyze a letter and suggest potential improvements.

        This is a rule-based analysis, not AI-powered.

        Args:
            letter: Letter to analyze

        Returns:
            List of improvement suggestions
        """
        suggestions = []

        # Check completeness
        completeness = self.letter_generator.validate_letter_completeness(letter)
        if not completeness["is_complete"]:
            if not completeness["has_header"]:
                suggestions.append("Header section is incomplete or missing")
            if not completeness["has_introduction"]:
                suggestions.append("Introduction section is too short or missing")
            if not completeness["has_facts"]:
                suggestions.append("Facts section needs more detail")
            if not completeness["has_liability"]:
                suggestions.append("Liability section needs more detail")
            if not completeness["has_damages"]:
                suggestions.append("Damages section is incomplete or total is missing")
            if not completeness["has_demand"]:
                suggestions.append("Demand section is incomplete or amount is missing")
            if not completeness["has_closing"]:
                suggestions.append("Closing section is incomplete")

        # Check damages consistency
        if letter.damages.total_damages > 0:
            calculated_total = 0.0
            if letter.damages.medical_expenses:
                calculated_total += letter.damages.medical_expenses
            if letter.damages.lost_wages:
                calculated_total += letter.damages.lost_wages
            if letter.damages.property_damage:
                calculated_total += letter.damages.property_damage
            if letter.damages.pain_suffering:
                calculated_total += letter.damages.pain_suffering

            # Check if itemized damages match total (with tolerance for rounding)
            if calculated_total > 0 and abs(calculated_total - letter.damages.total_damages) > 1.0:
                suggestions.append(
                    f"Itemized damages (${calculated_total:,.2f}) don't match total damages (${letter.damages.total_damages:,.2f})"
                )

        # Check demand amount vs damages
        if letter.demand.demand_amount < letter.damages.total_damages:
            suggestions.append(
                f"Demand amount (${letter.demand.demand_amount:,.2f}) is less than total damages (${letter.damages.total_damages:,.2f})"
            )

        # Check for deadline
        if not letter.demand.response_deadline:
            suggestions.append("Consider adding a response deadline to the demand")

        # Check liability section for legal theories
        if not letter.liability.legal_theories:
            suggestions.append("Liability section should identify legal theories (e.g., negligence)")

        return suggestions
