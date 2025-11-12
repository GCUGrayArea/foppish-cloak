"""
Pydantic schemas for document extraction.

These schemas define the structured output format for AI-powered document analysis.
Using Pydantic ensures type safety and validation of extracted data.
"""

from datetime import date
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


class PartyType(str, Enum):
    """Type of party in a legal case."""

    PLAINTIFF = "plaintiff"
    DEFENDANT = "defendant"
    WITNESS = "witness"
    INSURANCE_COMPANY = "insurance_company"
    OTHER = "other"


class DamageType(str, Enum):
    """Type of damages claimed."""

    MEDICAL = "medical"
    PROPERTY = "property"
    LOST_WAGES = "lost_wages"
    PAIN_SUFFERING = "pain_and_suffering"
    PUNITIVE = "punitive"
    OTHER = "other"


class ConfidenceLevel(str, Enum):
    """Confidence level for extracted data."""

    HIGH = "high"  # 90%+ confidence
    MEDIUM = "medium"  # 70-89% confidence
    LOW = "low"  # 50-69% confidence
    UNCERTAIN = "uncertain"  # <50% confidence


class Party(BaseModel):
    """A party involved in the case."""

    name: str = Field(..., description="Full name of the party")
    party_type: PartyType = Field(..., description="Role of the party in the case")
    contact_info: Optional[str] = Field(
        None, description="Contact information if available (address, phone, email)"
    )
    insurance_company: Optional[str] = Field(
        None, description="Insurance company name if applicable"
    )
    policy_number: Optional[str] = Field(
        None, description="Insurance policy number if available"
    )
    confidence: ConfidenceLevel = Field(
        default=ConfidenceLevel.MEDIUM,
        description="Confidence level in this extraction",
    )
    source_text: Optional[str] = Field(
        None, description="Relevant text from document that led to this extraction"
    )


class Incident(BaseModel):
    """Incident or event details."""

    incident_date: Optional[date] = Field(
        None, description="Date when the incident occurred"
    )
    incident_location: Optional[str] = Field(
        None, description="Location where the incident occurred"
    )
    description: str = Field(
        ..., description="Description of what happened in the incident"
    )
    incident_type: Optional[str] = Field(
        None,
        description="Type of incident (e.g., car accident, slip and fall, medical malpractice)",
    )
    police_report_number: Optional[str] = Field(
        None, description="Police report number if available"
    )
    confidence: ConfidenceLevel = Field(
        default=ConfidenceLevel.MEDIUM,
        description="Confidence level in this extraction",
    )
    source_text: Optional[str] = Field(
        None, description="Relevant text from document that led to this extraction"
    )

    @field_validator("incident_date", mode="before")
    @classmethod
    def parse_date_string(cls, v: Any) -> Optional[date]:
        """Parse date from various string formats."""
        if v is None or isinstance(v, date):
            return v
        if isinstance(v, str):
            # Handle various date formats
            from datetime import datetime

            formats = [
                "%Y-%m-%d",
                "%m/%d/%Y",
                "%m-%d-%Y",
                "%B %d, %Y",
                "%b %d, %Y",
                "%d/%m/%Y",
            ]
            for fmt in formats:
                try:
                    return datetime.strptime(v, fmt).date()
                except ValueError:
                    continue
            # If no format worked, return None rather than error
            return None
        return None


class Damage(BaseModel):
    """Damage or loss claimed."""

    damage_type: DamageType = Field(..., description="Type of damage")
    description: str = Field(..., description="Description of the damage")
    amount: Optional[float] = Field(
        None, description="Monetary amount of damage if specified"
    )
    amount_is_estimate: bool = Field(
        default=True,
        description="Whether the amount is an estimate or exact figure",
    )
    date_incurred: Optional[date] = Field(
        None, description="Date when the damage was incurred"
    )
    provider: Optional[str] = Field(
        None, description="Provider of service (e.g., hospital name, repair shop)"
    )
    confidence: ConfidenceLevel = Field(
        default=ConfidenceLevel.MEDIUM,
        description="Confidence level in this extraction",
    )
    source_text: Optional[str] = Field(
        None, description="Relevant text from document that led to this extraction"
    )

    @field_validator("date_incurred", mode="before")
    @classmethod
    def parse_date_string(cls, v: Any) -> Optional[date]:
        """Parse date from various string formats."""
        if v is None or isinstance(v, date):
            return v
        if isinstance(v, str):
            from datetime import datetime

            formats = [
                "%Y-%m-%d",
                "%m/%d/%Y",
                "%m-%d-%Y",
                "%B %d, %Y",
                "%b %d, %Y",
                "%d/%m/%Y",
            ]
            for fmt in formats:
                try:
                    return datetime.strptime(v, fmt).date()
                except ValueError:
                    continue
            return None
        return None


class CaseFact(BaseModel):
    """A factual statement relevant to the case."""

    fact: str = Field(..., description="The factual statement")
    category: Optional[str] = Field(
        None,
        description="Category of fact (e.g., liability, causation, damages, witness statement)",
    )
    importance: str = Field(
        default="medium",
        description="Importance level: high, medium, or low",
    )
    confidence: ConfidenceLevel = Field(
        default=ConfidenceLevel.MEDIUM,
        description="Confidence level in this extraction",
    )
    source_text: Optional[str] = Field(
        None, description="Relevant text from document that led to this extraction"
    )


class DocumentMetadata(BaseModel):
    """Metadata about the source document."""

    document_type: str = Field(
        ..., description="Type of document (e.g., police report, medical record, contract)"
    )
    document_date: Optional[date] = Field(None, description="Date of the document")
    author: Optional[str] = Field(None, description="Author or issuer of the document")
    document_number: Optional[str] = Field(
        None, description="Document ID or reference number"
    )

    @field_validator("document_date", mode="before")
    @classmethod
    def parse_date_string(cls, v: Any) -> Optional[date]:
        """Parse date from various string formats."""
        if v is None or isinstance(v, date):
            return v
        if isinstance(v, str):
            from datetime import datetime

            formats = [
                "%Y-%m-%d",
                "%m/%d/%Y",
                "%m-%d-%Y",
                "%B %d, %Y",
                "%b %d, %Y",
                "%d/%m/%Y",
            ]
            for fmt in formats:
                try:
                    return datetime.strptime(v, fmt).date()
                except ValueError:
                    continue
            return None
        return None


class ExtractedData(BaseModel):
    """Complete extracted data from a document."""

    metadata: DocumentMetadata = Field(..., description="Document metadata")
    parties: list[Party] = Field(
        default_factory=list, description="All parties mentioned in the document"
    )
    incident: Optional[Incident] = Field(
        None, description="Primary incident or event details"
    )
    damages: list[Damage] = Field(
        default_factory=list, description="All damages claimed or identified"
    )
    case_facts: list[CaseFact] = Field(
        default_factory=list, description="Key facts from the document"
    )
    summary: str = Field(
        ..., description="Brief summary of the document content (2-3 sentences)"
    )
    total_damages_estimate: Optional[float] = Field(
        None, description="Estimated total monetary damages if calculable"
    )
    extraction_notes: Optional[str] = Field(
        None,
        description="Any notes or caveats about the extraction (e.g., unclear sections, missing information)",
    )

    def calculate_total_damages(self) -> float:
        """Calculate total damages from all damage entries."""
        total = 0.0
        for damage in self.damages:
            if damage.amount is not None:
                total += damage.amount
        return total

    def get_high_confidence_items(self) -> dict[str, int]:
        """Get count of high-confidence extractions by category."""
        counts = {
            "parties": len(
                [p for p in self.parties if p.confidence == ConfidenceLevel.HIGH]
            ),
            "damages": len(
                [d for d in self.damages if d.confidence == ConfidenceLevel.HIGH]
            ),
            "facts": len(
                [f for f in self.case_facts if f.confidence == ConfidenceLevel.HIGH]
            ),
        }
        if self.incident and self.incident.confidence == ConfidenceLevel.HIGH:
            counts["incident"] = 1
        else:
            counts["incident"] = 0
        return counts


class ExtractionResult(BaseModel):
    """Result of document extraction process."""

    document_id: str = Field(..., description="ID of the document that was analyzed")
    extracted_data: ExtractedData = Field(
        ..., description="The extracted structured data"
    )
    processing_time_seconds: float = Field(
        ..., description="Time taken to process the document"
    )
    token_usage: dict[str, int] = Field(
        ..., description="Token usage statistics (input_tokens, output_tokens)"
    )
    model_id: str = Field(..., description="AI model used for extraction")
    extraction_timestamp: str = Field(
        ..., description="ISO timestamp of when extraction occurred"
    )
    success: bool = Field(default=True, description="Whether extraction succeeded")
    error_message: Optional[str] = Field(
        None, description="Error message if extraction failed"
    )
