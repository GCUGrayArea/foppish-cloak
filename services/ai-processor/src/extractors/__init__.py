"""
Extractors package.

Specialized extractors for focused information extraction from documents.
"""

from .parties import PartyExtractor
from .damages import DamageExtractor
from .facts import FactExtractor

__all__ = ["PartyExtractor", "DamageExtractor", "FactExtractor"]
