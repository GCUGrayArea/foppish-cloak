"""
Damage Extractor

Specialized extractor for identifying and extracting damage/loss information from documents.
"""

import logging
from typing import Optional

from ..bedrock.client import BedrockClient
from ..bedrock.tools import pydantic_to_tool_schema, extract_tool_result
from ..schemas.extraction import Damage
from pydantic import BaseModel


class DamagesResult(BaseModel):
    """Result of damage extraction."""

    damages: list[Damage]
    total_estimated: Optional[float] = None


class DamageExtractor:
    """
    Extracts damage and loss information from document text.

    This is useful for detailed damage analysis, especially when dealing with
    medical bills, property damage estimates, or wage loss statements.
    """

    def __init__(
        self,
        bedrock_client: BedrockClient | None = None,
        logger: logging.Logger | None = None,
    ):
        """
        Initialize damage extractor.

        Args:
            bedrock_client: Bedrock client instance
            logger: Logger instance
        """
        self.bedrock_client = bedrock_client or BedrockClient()
        self.logger = logger or logging.getLogger("extractor.damages")

    def extract_damages(
        self,
        document_text: str,
        document_type: Optional[str] = None,
    ) -> DamagesResult:
        """
        Extract all damages from document text.

        Args:
            document_text: Full text of the document
            document_type: Type of document (helps with context)

        Returns:
            Damages result with list of damages and total

        Raises:
            ValueError: If extraction fails
        """
        system_prompt = """You are an expert at identifying and quantifying damages in legal cases.

Extract all damages and losses mentioned in the document, including:
- Medical expenses (itemized)
- Property damage
- Lost wages and income
- Pain and suffering
- Punitive damages
- Out-of-pocket expenses
- Future damages

For each damage:
- Specify the type of damage
- Extract the exact amount if stated
- Note whether it's an estimate or actual amount
- Identify the provider or source
- Include the date if available
- Assign confidence level"""

        doc_context = f" (Type: {document_type})" if document_type else ""
        user_message = f"""Extract all damages and losses from this document{doc_context}:

{document_text}

For each damage entry, provide:
1. Type of damage (medical, property, lost wages, etc.)
2. Description
3. Amount (if stated)
4. Whether amount is estimate or actual
5. Provider/source
6. Date incurred
7. Confidence level
8. Source text

Also calculate the total estimated damages if possible."""

        tool_schema = pydantic_to_tool_schema(
            DamagesResult,
            name="extract_damages",
            description="Extract all damages and losses from the document",
        )

        try:
            response = self.bedrock_client.invoke(
                messages=[{"role": "user", "content": user_message}],
                system=system_prompt,
                tools=[tool_schema],
                tool_choice={"type": "tool", "name": "extract_damages"},
            )

            result = extract_tool_result(response, DamagesResult)
            self.logger.info(
                f"Extracted {len(result.damages)} damage entries, "
                f"total: ${result.total_estimated or 0:.2f}"
            )
            return result

        except Exception as e:
            self.logger.error(f"Damage extraction failed: {e}")
            raise ValueError(f"Failed to extract damages: {e}") from e
