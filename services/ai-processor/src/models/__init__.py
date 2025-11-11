"""
Database models for AI processor service.

This module exports all database models used by the AI processor.
"""

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin, FirmScopedMixin
from .document import Document, VirusScanStatus
from .letter import DemandLetter, LetterStatus

__all__ = [
    "Base",
    "TimestampMixin",
    "UUIDPrimaryKeyMixin",
    "FirmScopedMixin",
    "Document",
    "VirusScanStatus",
    "DemandLetter",
    "LetterStatus",
]
