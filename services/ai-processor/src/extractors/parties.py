"""
Party Extractor

Specialized extractor for identifying and extracting party information from documents.
"""

import logging
from typing import Optional

from ..bedrock.client import BedrockClient
from ..bedrock.tools import pydantic_to_tool_schema, extract_tool_result
from ..schemas.extraction import Party
from pydantic import BaseModel


class PartiesResult(BaseModel):
    """Result of party extraction."""

    parties: list[Party]


class PartyExtractor:
    """
    Extracts party information from document text.

    This is a focused extractor that can be used when you need detailed
    party information or want to do a second pass on party extraction.
    """

    def __init__(
        self,
        bedrock_client: BedrockClient | None = None,
        logger: logging.Logger | None = None,
    ):
        """
        Initialize party extractor.

        Args:
            bedrock_client: Bedrock client instance
            logger: Logger instance
        """
        self.bedrock_client = bedrock_client or BedrockClient()
        self.logger = logger or logging.getLogger("extractor.parties")

    def extract_parties(
        self,
        document_text: str,
        document_type: Optional[str] = None,
    ) -> list[Party]:
        """
        Extract all parties from document text.

        Args:
            document_text: Full text of the document
            document_type: Type of document (helps with context)

        Returns:
            List of extracted parties

        Raises:
            ValueError: If extraction fails
        """
        system_prompt = """You are an expert at identifying parties involved in legal cases.

Extract all parties mentioned in the document, including:
- Plaintiffs and defendants
- Witnesses
- Insurance companies and adjusters
- Medical providers
- Employers
- Any other relevant parties

For each party, extract:
- Full name
- Role/type (plaintiff, defendant, witness, etc.)
- Contact information if available
- Insurance information if applicable
- Confidence level based on how clearly they are identified"""

        doc_context = f" (Type: {document_type})" if document_type else ""
        user_message = f"""Extract all parties from this document{doc_context}:

{document_text}

For each party, provide:
1. Full name
2. Role in the case
3. Any contact or insurance information
4. Confidence level
5. Source text showing where you found this information"""

        tool_schema = pydantic_to_tool_schema(
            PartiesResult,
            name="extract_parties",
            description="Extract all parties from the document",
        )

        try:
            response = self.bedrock_client.invoke(
                messages=[{"role": "user", "content": user_message}],
                system=system_prompt,
                tools=[tool_schema],
                tool_choice={"type": "tool", "name": "extract_parties"},
            )

            result = extract_tool_result(response, PartiesResult)
            self.logger.info(f"Extracted {len(result.parties)} parties")
            return result.parties

        except Exception as e:
            self.logger.error(f"Party extraction failed: {e}")
            raise ValueError(f"Failed to extract parties: {e}") from e
