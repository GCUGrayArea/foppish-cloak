"""
Letter Generator

Main module for generating demand letters using Claude and extracted case data.
"""

import logging
import time
from datetime import datetime, timedelta, UTC
from typing import Optional

from .bedrock.client import BedrockClient
from .bedrock.tools import pydantic_to_tool_schema, extract_tool_result
from .prompts.generation_prompts import (
    GENERATION_SYSTEM_PROMPT,
    get_generation_prompt,
    get_refinement_prompt,
    get_section_regeneration_prompt,
    get_tone_adjustment_prompt,
)
from .schemas.letter import (
    GeneratedLetter,
    LetterGenerationRequest,
    LetterGenerationResult,
    RefinementFeedback,
    RefinementResult,
    ConversationHistory,
    LetterSection,
    ToneStyle,
)


class LetterGenerator:
    """
    Generates and refines demand letters using AI.

    Features:
    - Initial letter generation from extracted case data
    - Iterative refinement based on attorney feedback
    - Section-specific regeneration
    - Tone adjustment
    - Conversation history for context
    """

    def __init__(
        self,
        bedrock_client: BedrockClient | None = None,
        logger: logging.Logger | None = None,
    ):
        """
        Initialize letter generator.

        Args:
            bedrock_client: Bedrock client instance (creates default if None)
            logger: Logger instance (creates default if None)
        """
        self.bedrock_client = bedrock_client or BedrockClient()
        self.logger = logger or logging.getLogger("letter_generator")

    def generate_letter(
        self,
        request: LetterGenerationRequest,
        firm_id: int | None = None,
        user_id: int | None = None,
    ) -> LetterGenerationResult:
        """
        Generate a demand letter from case data.

        Args:
            request: Letter generation request with case data and preferences
            firm_id: Firm ID for multi-tenancy
            user_id: User ID for tracking

        Returns:
            Letter generation result with structured letter

        Raises:
            ValueError: If generation fails
        """
        start_time = time.time()

        try:
            self.logger.info(
                f"Starting letter generation for case {request.case_id}",
                extra={
                    "case_id": request.case_id,
                    "firm_id": firm_id,
                    "tone": request.tone,
                },
            )

            # Build generation prompt
            user_message = get_generation_prompt(
                extracted_data=request.extracted_data,
                template_variables=request.template_variables.model_dump(),
                tone=request.tone.value,
                custom_instructions=request.custom_instructions,
                include_settlement_deadline=request.include_settlement_deadline,
                deadline_days=request.deadline_days,
            )

            # Create tool schema for structured output
            tool_schema = pydantic_to_tool_schema(
                GeneratedLetter,
                name="generate_demand_letter",
                description="Generate a structured demand letter with all required sections",
            )

            # Invoke Claude with tool calling for structured generation
            response = self.bedrock_client.invoke(
                messages=[{"role": "user", "content": user_message}],
                system=GENERATION_SYSTEM_PROMPT,
                tools=[tool_schema],
                tool_choice={"type": "tool", "name": "generate_demand_letter"},
                temperature=self.bedrock_client.config.temperature_generation,
                firm_id=firm_id,
                user_id=user_id,
            )

            # Extract structured letter from tool use
            generated_letter = extract_tool_result(response, GeneratedLetter)

            # Calculate processing time
            processing_time = time.time() - start_time

            # Get token usage from response
            usage = response.get("usage", {})
            token_usage = {
                "input_tokens": usage.get("inputTokens", 0),
                "output_tokens": usage.get("outputTokens", 0),
            }

            # Build generation result
            result = LetterGenerationResult(
                case_id=request.case_id,
                letter=generated_letter,
                generation_timestamp=datetime.now(UTC).isoformat().replace('+00:00', 'Z'),
                model_id=self.bedrock_client.config.model_id,
                token_usage=token_usage,
                processing_time_seconds=round(processing_time, 2),
                version=1,
                success=True,
            )

            self.logger.info(
                f"Successfully generated letter for case {request.case_id}",
                extra={
                    "case_id": request.case_id,
                    "processing_time": processing_time,
                    "input_tokens": token_usage["input_tokens"],
                    "output_tokens": token_usage["output_tokens"],
                    "version": 1,
                },
            )

            return result

        except Exception as e:
            processing_time = time.time() - start_time
            error_message = str(e)

            self.logger.error(
                f"Letter generation failed for case {request.case_id}: {error_message}",
                extra={"case_id": request.case_id, "error": error_message},
            )

            # Return failed result with empty letter
            from .schemas.letter import (
                LetterHeader,
                LetterIntroduction,
                LetterFacts,
                LetterLiability,
                LetterDamages,
                LetterDemand,
                LetterClosing,
            )

            empty_letter = GeneratedLetter(
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

            return LetterGenerationResult(
                case_id=request.case_id,
                letter=empty_letter,
                generation_timestamp=datetime.now(UTC).isoformat().replace('+00:00', 'Z'),
                model_id=self.bedrock_client.config.model_id,
                token_usage={"input_tokens": 0, "output_tokens": 0},
                processing_time_seconds=round(processing_time, 2),
                version=0,
                success=False,
                error_message=error_message,
            )

    def refine_letter(
        self,
        current_letter: GeneratedLetter,
        feedback: RefinementFeedback,
        conversation_history: ConversationHistory | None = None,
        current_version: int = 1,
        firm_id: int | None = None,
        user_id: int | None = None,
    ) -> RefinementResult:
        """
        Refine an existing letter based on attorney feedback.

        Args:
            current_letter: Current letter to refine
            feedback: Refinement feedback from attorney
            conversation_history: Conversation history for context (optional)
            current_version: Current version number
            firm_id: Firm ID for multi-tenancy
            user_id: User ID for tracking

        Returns:
            Refinement result with refined letter and change summary

        Raises:
            ValueError: If refinement fails
        """
        self.logger.info(
            f"Starting letter refinement (version {current_version} -> {current_version + 1})",
            extra={
                "current_version": current_version,
                "target_section": feedback.target_section,
                "firm_id": firm_id,
            },
        )

        # Initialize conversation history if not provided
        if conversation_history is None:
            conversation_history = ConversationHistory()

        # Build refinement prompt
        user_message = get_refinement_prompt(
            current_letter=current_letter.model_dump(),
            feedback_instruction=feedback.instruction,
            target_section=feedback.target_section.value if feedback.target_section else None,
            additional_context=feedback.context,
        )

        # Add to conversation history
        conversation_history.add_message("user", user_message)

        # Create tool schema for structured output
        tool_schema = pydantic_to_tool_schema(
            GeneratedLetter,
            name="refine_demand_letter",
            description="Refine the demand letter based on attorney feedback",
        )

        # Invoke Claude with conversation history
        response = self.bedrock_client.invoke(
            messages=conversation_history.messages,
            system=GENERATION_SYSTEM_PROMPT,
            tools=[tool_schema],
            tool_choice={"type": "tool", "name": "refine_demand_letter"},
            temperature=self.bedrock_client.config.temperature_generation,
            firm_id=firm_id,
            user_id=user_id,
        )

        # Extract refined letter
        refined_letter = extract_tool_result(response, GeneratedLetter)

        # Determine which sections were modified
        sections_modified = self._compare_letters(current_letter, refined_letter)

        # Generate change summary
        changes_summary = self._generate_change_summary(
            current_letter, refined_letter, sections_modified, feedback.instruction
        )

        # Add assistant response to conversation history
        assistant_message = f"Letter refined. Changes: {changes_summary}"
        conversation_history.add_message("assistant", assistant_message)

        # Add version to history
        conversation_history.add_version(
            version=current_version + 1,
            letter=refined_letter,
            changes_summary=changes_summary,
        )

        self.logger.info(
            f"Letter refinement completed (version {current_version + 1})",
            extra={
                "new_version": current_version + 1,
                "sections_modified": [s.value for s in sections_modified],
            },
        )

        return RefinementResult(
            refined_letter=refined_letter,
            changes_summary=changes_summary,
            sections_modified=sections_modified,
        )

    def regenerate_section(
        self,
        current_letter: GeneratedLetter,
        section: LetterSection,
        instruction: str,
        case_data: dict | None = None,
        firm_id: int | None = None,
        user_id: int | None = None,
    ) -> GeneratedLetter:
        """
        Regenerate a specific section of the letter.

        Args:
            current_letter: Current letter
            section: Section to regenerate
            instruction: Instructions for regeneration
            case_data: Original case data for reference (optional)
            firm_id: Firm ID for multi-tenancy
            user_id: User ID for tracking

        Returns:
            Letter with regenerated section

        Raises:
            ValueError: If section regeneration fails
        """
        self.logger.info(
            f"Regenerating section: {section.value}",
            extra={"section": section.value, "firm_id": firm_id},
        )

        # Build section regeneration prompt
        user_message = get_section_regeneration_prompt(
            current_letter=current_letter.model_dump(),
            section_name=section.value,
            regeneration_instruction=instruction,
            case_context=case_data,
        )

        # For section regeneration, we still need the full letter structure
        # So we use the same tool schema
        tool_schema = pydantic_to_tool_schema(
            GeneratedLetter,
            name="regenerate_letter_section",
            description=f"Regenerate the {section.value} section of the demand letter",
        )

        # Invoke Claude
        response = self.bedrock_client.invoke(
            messages=[{"role": "user", "content": user_message}],
            system=GENERATION_SYSTEM_PROMPT,
            tools=[tool_schema],
            tool_choice={"type": "tool", "name": "regenerate_letter_section"},
            temperature=self.bedrock_client.config.temperature_generation,
            firm_id=firm_id,
            user_id=user_id,
        )

        # Extract refined letter
        refined_letter = extract_tool_result(response, GeneratedLetter)

        self.logger.info(
            f"Section regeneration completed: {section.value}",
            extra={"section": section.value},
        )

        return refined_letter

    def adjust_tone(
        self,
        current_letter: GeneratedLetter,
        new_tone: ToneStyle,
        reason: Optional[str] = None,
        firm_id: int | None = None,
        user_id: int | None = None,
    ) -> GeneratedLetter:
        """
        Adjust the tone of an existing letter.

        Args:
            current_letter: Current letter
            new_tone: Desired new tone
            reason: Reason for tone change (optional)
            firm_id: Firm ID for multi-tenancy
            user_id: User ID for tracking

        Returns:
            Letter with adjusted tone

        Raises:
            ValueError: If tone adjustment fails
        """
        self.logger.info(
            f"Adjusting letter tone to: {new_tone.value}",
            extra={"new_tone": new_tone.value, "firm_id": firm_id},
        )

        # Build tone adjustment prompt
        user_message = get_tone_adjustment_prompt(
            current_letter=current_letter.model_dump(),
            new_tone=new_tone.value,
            reason=reason,
        )

        # Create tool schema
        tool_schema = pydantic_to_tool_schema(
            GeneratedLetter,
            name="adjust_letter_tone",
            description=f"Adjust the letter tone to {new_tone.value}",
        )

        # Invoke Claude
        response = self.bedrock_client.invoke(
            messages=[{"role": "user", "content": user_message}],
            system=GENERATION_SYSTEM_PROMPT,
            tools=[tool_schema],
            tool_choice={"type": "tool", "name": "adjust_letter_tone"},
            temperature=self.bedrock_client.config.temperature_generation,
            firm_id=firm_id,
            user_id=user_id,
        )

        # Extract adjusted letter
        adjusted_letter = extract_tool_result(response, GeneratedLetter)

        self.logger.info(
            f"Tone adjustment completed: {new_tone.value}",
            extra={"new_tone": new_tone.value},
        )

        return adjusted_letter

    def _compare_letters(
        self, original: GeneratedLetter, modified: GeneratedLetter
    ) -> list[LetterSection]:
        """
        Compare two letters to identify modified sections.

        Args:
            original: Original letter
            modified: Modified letter

        Returns:
            List of sections that were modified
        """
        modified_sections = []

        # Compare each section
        section_comparisons = {
            LetterSection.HEADER: (
                original.header.model_dump(),
                modified.header.model_dump(),
            ),
            LetterSection.INTRODUCTION: (
                original.introduction.content,
                modified.introduction.content,
            ),
            LetterSection.FACTS: (original.facts.content, modified.facts.content),
            LetterSection.LIABILITY: (
                original.liability.content,
                modified.liability.content,
            ),
            LetterSection.DAMAGES: (
                original.damages.content,
                modified.damages.content,
            ),
            LetterSection.DEMAND: (original.demand.content, modified.demand.content),
            LetterSection.CLOSING: (
                original.closing.content,
                modified.closing.content,
            ),
        }

        for section, (orig_content, mod_content) in section_comparisons.items():
            if orig_content != mod_content:
                modified_sections.append(section)

        return modified_sections

    def _generate_change_summary(
        self,
        original: GeneratedLetter,
        modified: GeneratedLetter,
        sections_modified: list[LetterSection],
        feedback_instruction: str,
    ) -> str:
        """
        Generate a summary of changes made during refinement.

        Args:
            original: Original letter
            modified: Modified letter
            sections_modified: List of modified sections
            feedback_instruction: Original feedback instruction

        Returns:
            Human-readable change summary
        """
        if not sections_modified:
            return "No changes made (letter unchanged)"

        section_names = [s.value.replace("_", " ").title() for s in sections_modified]

        summary = f"Modified {len(sections_modified)} section(s) based on feedback: '{feedback_instruction[:100]}...'. "
        summary += f"Sections changed: {', '.join(section_names)}."

        return summary

    def get_letter_preview(self, letter: GeneratedLetter, max_length: int = 500) -> str:
        """
        Generate a preview of the letter.

        Args:
            letter: Generated letter
            max_length: Maximum length of preview

        Returns:
            Preview text
        """
        full_text = letter.to_full_text()
        if len(full_text) <= max_length:
            return full_text

        return full_text[:max_length] + "..."

    def validate_letter_completeness(self, letter: GeneratedLetter) -> dict[str, bool]:
        """
        Validate that all required sections are complete.

        Args:
            letter: Generated letter

        Returns:
            Dictionary of section completeness checks
        """
        checks = {
            "has_header": bool(letter.header.recipient_name and letter.header.subject_line),
            "has_introduction": len(letter.introduction.content.strip()) > 50,
            "has_facts": len(letter.facts.content.strip()) > 100,
            "has_liability": len(letter.liability.content.strip()) > 100,
            "has_damages": len(letter.damages.content.strip()) > 50 and letter.damages.total_damages > 0,
            "has_demand": len(letter.demand.content.strip()) > 50 and letter.demand.demand_amount > 0,
            "has_closing": bool(letter.closing.content and letter.closing.signature_block),
        }

        checks["is_complete"] = all(checks.values())

        return checks
