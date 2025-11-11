"""
Demand Letter model for AI processor service.

This model represents demand letter projects and their workflow state.
"""

from sqlalchemy import Column, String, Text, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin, FirmScopedMixin


class LetterStatus(str, enum.Enum):
    """Demand letter workflow status"""
    DRAFT = "draft"
    ANALYZING = "analyzing"
    GENERATING = "generating"
    REFINING = "refining"
    COMPLETE = "complete"
    ARCHIVED = "archived"


class DemandLetter(Base, UUIDPrimaryKeyMixin, FirmScopedMixin, TimestampMixin):
    """Demand Letter model"""

    __tablename__ = "demand_letters"

    # Foreign keys
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    template_id = Column(UUID(as_uuid=True), ForeignKey("templates.id"))

    # Letter metadata
    title = Column(String(500), nullable=False)
    status = Column(
        Enum(LetterStatus, name="letter_status"),
        default=LetterStatus.DRAFT,
        nullable=False
    )

    # Letter content
    current_content = Column(Text)

    # Extracted data from document analysis (JSONB)
    extracted_data = Column(JSONB, default={}, nullable=False)

    # AI generation metadata (JSONB)
    # Stores: model used, tokens consumed, generation params, etc.
    generation_metadata = Column(JSONB, default={}, nullable=False)

    def __repr__(self):
        return f"<DemandLetter(id={self.id}, title='{self.title}', status={self.status.value}, firm_id={self.firm_id})>"

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            "id": str(self.id),
            "firm_id": str(self.firm_id),
            "created_by": str(self.created_by),
            "template_id": str(self.template_id) if self.template_id else None,
            "title": self.title,
            "status": self.status.value,
            "current_content": self.current_content,
            "extracted_data": self.extracted_data,
            "generation_metadata": self.generation_metadata,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


__all__ = ["DemandLetter", "LetterStatus"]
