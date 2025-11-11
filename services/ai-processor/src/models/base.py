"""
Base model class for SQLAlchemy models.

This module provides the declarative base and common mixins
for all database models in the AI processor service.
"""

from datetime import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import UUID
import uuid

# Create declarative base
Base = declarative_base()


class TimestampMixin:
    """Mixin for created_at and updated_at timestamps"""

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class UUIDPrimaryKeyMixin:
    """Mixin for UUID primary key"""

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False
    )


class FirmScopedMixin:
    """Mixin for firm-scoped models (multi-tenant)"""

    firm_id = Column(
        UUID(as_uuid=True),
        nullable=False,
        index=True
    )


__all__ = [
    "Base",
    "TimestampMixin",
    "UUIDPrimaryKeyMixin",
    "FirmScopedMixin",
]
