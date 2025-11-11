"""
Document model for AI processor service.

This model represents source documents that are analyzed
to extract information for demand letter generation.
"""

from sqlalchemy import Column, String, BigInteger, Enum, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin, FirmScopedMixin


class VirusScanStatus(str, enum.Enum):
    """Virus scan status enum"""
    PENDING = "pending"
    CLEAN = "clean"
    INFECTED = "infected"


class Document(Base, UUIDPrimaryKeyMixin, FirmScopedMixin, TimestampMixin):
    """Document model for source documents"""

    __tablename__ = "documents"

    # Foreign keys
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Document metadata
    filename = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(BigInteger, nullable=False)

    # S3 storage
    s3_bucket = Column(String(255), nullable=False)
    s3_key = Column(String(500), nullable=False)

    # Virus scanning
    virus_scan_status = Column(
        Enum(VirusScanStatus, name="virus_scan_status"),
        default=VirusScanStatus.PENDING,
        nullable=False
    )
    virus_scan_date = Column(DateTime(timezone=True))

    # Flexible metadata storage (JSONB)
    metadata = Column(JSONB, default={}, nullable=False)

    def __repr__(self):
        return f"<Document(id={self.id}, filename='{self.filename}', firm_id={self.firm_id})>"

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            "id": str(self.id),
            "firm_id": str(self.firm_id),
            "uploaded_by": str(self.uploaded_by),
            "filename": self.filename,
            "file_type": self.file_type,
            "file_size": self.file_size,
            "virus_scan_status": self.virus_scan_status.value,
            "virus_scan_date": self.virus_scan_date.isoformat() if self.virus_scan_date else None,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


__all__ = ["Document", "VirusScanStatus"]
