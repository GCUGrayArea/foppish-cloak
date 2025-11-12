"""
Pydantic schemas for demand letter generation.

These schemas define the structured output format for AI-generated demand letters
and the refinement feedback system.
"""

from datetime import datetime, UTC
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class LetterSection(str, Enum):
    """Sections of a demand letter."""

    HEADER = "header"
    INTRODUCTION = "introduction"
    FACTS = "facts"
    LIABILITY = "liability"
    DAMAGES = "damages"
    DEMAND = "demand"
    CLOSING = "closing"


class ToneStyle(str, Enum):
    """Tone styles for letter generation."""

    FORMAL = "formal"  # Traditional legal language
    ASSERTIVE = "assertive"  # Strong, confident tone
    DIPLOMATIC = "diplomatic"  # Balanced, professional tone
    AGGRESSIVE = "aggressive"  # Forceful, threatening litigation


class LetterHeader(BaseModel):
    """Header section of demand letter."""

    date: str = Field(..., description="Letter date (formatted)")
    recipient_name: str = Field(..., description="Name of recipient")
    recipient_address: str = Field(..., description="Recipient's address")
    recipient_title: Optional[str] = Field(
        None, description="Recipient's title (e.g., Claims Adjuster)"
    )
    subject_line: str = Field(..., description="Subject line (e.g., Re: Claim #12345)")
    salutation: str = Field(
        default="Dear Sir or Madam:", description="Letter salutation"
    )


class LetterIntroduction(BaseModel):
    """Introduction section establishing representation and purpose."""

    content: str = Field(..., description="Introduction paragraph(s)")
    attorney_name: Optional[str] = Field(None, description="Attorney name mentioned")
    law_firm: Optional[str] = Field(None, description="Law firm name mentioned")
    client_name: str = Field(..., description="Client being represented")


class LetterFacts(BaseModel):
    """Facts section describing the incident."""

    content: str = Field(..., description="Facts paragraph(s)")
    incident_date: Optional[str] = Field(None, description="Incident date mentioned")
    key_facts_count: int = Field(
        default=0, description="Number of key facts included"
    )


class LetterLiability(BaseModel):
    """Liability section establishing fault."""

    content: str = Field(..., description="Liability analysis paragraph(s)")
    legal_theories: list[str] = Field(
        default_factory=list,
        description="Legal theories mentioned (e.g., negligence, breach of contract)",
    )
    evidence_citations: list[str] = Field(
        default_factory=list, description="Evidence cited"
    )


class LetterDamages(BaseModel):
    """Damages section detailing losses."""

    content: str = Field(..., description="Damages paragraph(s)")
    medical_expenses: Optional[float] = Field(
        None, description="Total medical expenses claimed"
    )
    lost_wages: Optional[float] = Field(None, description="Total lost wages claimed")
    property_damage: Optional[float] = Field(
        None, description="Total property damage claimed"
    )
    pain_suffering: Optional[float] = Field(
        None, description="Pain and suffering amount claimed"
    )
    total_damages: float = Field(..., description="Total damages demanded")


class LetterDemand(BaseModel):
    """Demand section with settlement amount and deadline."""

    content: str = Field(..., description="Demand paragraph(s)")
    demand_amount: float = Field(..., description="Settlement amount demanded")
    response_deadline: Optional[str] = Field(
        None, description="Deadline for response"
    )
    consequences_stated: bool = Field(
        default=False, description="Whether litigation consequences are stated"
    )


class LetterClosing(BaseModel):
    """Closing section."""

    content: str = Field(..., description="Closing paragraph")
    signature_block: str = Field(..., description="Signature block with attorney info")
    closing_phrase: str = Field(
        default="Sincerely,", description="Closing phrase (e.g., Sincerely, Very truly yours)"
    )


class GeneratedLetter(BaseModel):
    """Complete structured demand letter."""

    header: LetterHeader = Field(..., description="Letter header section")
    introduction: LetterIntroduction = Field(
        ..., description="Introduction section"
    )
    facts: LetterFacts = Field(..., description="Facts section")
    liability: LetterLiability = Field(..., description="Liability section")
    damages: LetterDamages = Field(..., description="Damages section")
    demand: LetterDemand = Field(..., description="Demand section")
    closing: LetterClosing = Field(..., description="Closing section")

    def to_full_text(self) -> str:
        """
        Convert structured letter to full text format.

        Returns:
            Complete letter as formatted text
        """
        sections = []

        # Header
        header_text = f"{self.header.date}\n\n"
        header_text += f"{self.header.recipient_name}\n"
        if self.header.recipient_title:
            header_text += f"{self.header.recipient_title}\n"
        header_text += f"{self.header.recipient_address}\n\n"
        header_text += f"{self.header.subject_line}\n\n"
        header_text += f"{self.header.salutation}\n"
        sections.append(header_text)

        # Body sections
        sections.append(self.introduction.content)
        sections.append(self.facts.content)
        sections.append(self.liability.content)
        sections.append(self.damages.content)
        sections.append(self.demand.content)

        # Closing
        closing_text = f"{self.closing.content}\n\n"
        closing_text += f"{self.closing.closing_phrase}\n\n"
        closing_text += self.closing.signature_block
        sections.append(closing_text)

        return "\n\n".join(sections)

    def get_section_text(self, section: LetterSection) -> str:
        """
        Get text for a specific section.

        Args:
            section: Section to retrieve

        Returns:
            Section text
        """
        section_map = {
            LetterSection.HEADER: f"{self.header.date}\n{self.header.recipient_name}\n{self.header.recipient_address}\n{self.header.subject_line}",
            LetterSection.INTRODUCTION: self.introduction.content,
            LetterSection.FACTS: self.facts.content,
            LetterSection.LIABILITY: self.liability.content,
            LetterSection.DAMAGES: self.damages.content,
            LetterSection.DEMAND: self.demand.content,
            LetterSection.CLOSING: f"{self.closing.content}\n{self.closing.closing_phrase}\n{self.closing.signature_block}",
        }
        return section_map.get(section, "")


class TemplateVariables(BaseModel):
    """Variables that can be used in letter templates."""

    attorney_name: str = Field(..., description="Attorney's name")
    attorney_title: Optional[str] = Field(None, description="Attorney's title")
    law_firm: str = Field(..., description="Law firm name")
    firm_address: str = Field(..., description="Firm's address")
    firm_phone: str = Field(..., description="Firm's phone number")
    firm_email: str = Field(..., description="Firm's email")
    client_name: str = Field(..., description="Client's name")
    case_number: Optional[str] = Field(None, description="Internal case number")
    claim_number: Optional[str] = Field(None, description="Insurance claim number")


class RefinementFeedback(BaseModel):
    """Feedback for refining a generated letter."""

    instruction: str = Field(
        ..., description="Attorney's instruction for refinement"
    )
    target_section: Optional[LetterSection] = Field(
        None, description="Specific section to modify (if applicable)"
    )
    priority: str = Field(
        default="medium",
        description="Priority level: high, medium, or low",
    )
    context: Optional[str] = Field(
        None, description="Additional context for the instruction"
    )


class RefinementResult(BaseModel):
    """Result of letter refinement."""

    refined_letter: GeneratedLetter = Field(..., description="Refined letter")
    changes_summary: str = Field(
        ..., description="Summary of changes made"
    )
    sections_modified: list[LetterSection] = Field(
        ..., description="Sections that were modified"
    )


class LetterGenerationRequest(BaseModel):
    """Request to generate a demand letter."""

    case_id: str = Field(..., description="Case identifier")
    extracted_data: dict = Field(
        ..., description="Extracted data from documents (ExtractedData schema)"
    )
    template_variables: TemplateVariables = Field(
        ..., description="Template variables for the letter"
    )
    tone: ToneStyle = Field(
        default=ToneStyle.FORMAL, description="Desired tone for the letter"
    )
    custom_instructions: Optional[str] = Field(
        None, description="Additional instructions from attorney"
    )
    include_settlement_deadline: bool = Field(
        default=True, description="Whether to include a response deadline"
    )
    deadline_days: int = Field(
        default=30, description="Number of days for response deadline"
    )


class LetterGenerationResult(BaseModel):
    """Result of letter generation."""

    case_id: str = Field(..., description="Case identifier")
    letter: GeneratedLetter = Field(..., description="Generated letter")
    generation_timestamp: str = Field(
        ..., description="ISO timestamp of generation"
    )
    model_id: str = Field(..., description="AI model used for generation")
    token_usage: dict[str, int] = Field(
        ..., description="Token usage statistics (input_tokens, output_tokens)"
    )
    processing_time_seconds: float = Field(
        ..., description="Time taken to generate"
    )
    version: int = Field(
        default=1, description="Version number (increments with refinements)"
    )
    success: bool = Field(default=True, description="Whether generation succeeded")
    error_message: Optional[str] = Field(
        None, description="Error message if generation failed"
    )


class ConversationHistory(BaseModel):
    """Conversation history for iterative refinement."""

    messages: list[dict] = Field(
        default_factory=list, description="Conversation messages in Claude format"
    )
    version_history: list[dict] = Field(
        default_factory=list,
        description="History of letter versions with timestamps and changes",
    )

    def add_message(self, role: str, content: str) -> None:
        """
        Add a message to conversation history.

        Args:
            role: Message role (user or assistant)
            content: Message content
        """
        self.messages.append({"role": role, "content": content})

    def add_version(
        self, version: int, letter: GeneratedLetter, changes_summary: str
    ) -> None:
        """
        Add a letter version to history.

        Args:
            version: Version number
            letter: Generated letter
            changes_summary: Summary of changes from previous version
        """
        self.version_history.append(
            {
                "version": version,
                "timestamp": datetime.now(UTC).isoformat().replace('+00:00', 'Z'),
                "changes_summary": changes_summary,
                "letter_snapshot": letter.model_dump(),
            }
        )

    def get_latest_version(self) -> int:
        """
        Get the latest version number.

        Returns:
            Latest version number (0 if no versions)
        """
        if not self.version_history:
            return 0
        return max(v["version"] for v in self.version_history)
