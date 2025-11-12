"""
Fact Extractor

Specialized extractor for identifying and extracting case facts from documents.
"""

import logging
from typing import Optional

from ..bedrock.client import BedrockClient
from ..bedrock.tools import pydantic_to_tool_schema, extract_tool_result
from ..schemas.extraction import CaseFact
from pydantic import BaseModel


class FactsResult(BaseModel):
    """Result of fact extraction."""

    facts: list[CaseFact]


class FactExtractor:
    """
    Extracts factual statements relevant to the case from document text.

    This extractor focuses on identifying facts related to:
    - Liability
    - Causation
    - Damages
    - Witness observations
    - Expert opinions
    """

    def __init__(
        self,
        bedrock_client: BedrockClient | None = None,
        logger: logging.Logger | None = None,
    ):
        """
        Initialize fact extractor.

        Args:
            bedrock_client: Bedrock client instance
            logger: Logger instance
        """
        self.bedrock_client = bedrock_client or BedrockClient()
        self.logger = logger or logging.getLogger("extractor.facts")

    def extract_facts(
        self,
        document_text: str,
        focus_area: Optional[str] = None,
    ) -> list[CaseFact]:
        """
        Extract case facts from document text.

        Args:
            document_text: Full text of the document
            focus_area: Optional focus (e.g., "liability", "causation", "damages")

        Returns:
            List of extracted case facts

        Raises:
            ValueError: If extraction fails
        """
        system_prompt = """You are an expert at identifying legally relevant facts in documents.

Extract factual statements that are relevant to the case, focusing on:
- Liability: Facts showing fault or negligence
- Causation: Facts linking the incident to damages
- Damages: Facts supporting claimed losses
- Witness observations: What witnesses saw or heard
- Expert opinions: Professional assessments
- Timelines: Sequence of events
- Conditions: Environmental or situational factors

For each fact:
- State it clearly and concisely
- Categorize it (liability, causation, damages, witness, etc.)
- Assess its importance (high, medium, low)
- Assign confidence level
- Include source text"""

        focus_instruction = ""
        if focus_area:
            focus_instruction = f"\n\nFocus specifically on facts related to: {focus_area}"

        user_message = f"""Extract all legally relevant facts from this document{focus_instruction}:

{document_text}

For each fact, provide:
1. The factual statement (clear and concise)
2. Category (liability, causation, damages, witness statement, etc.)
3. Importance level (high/medium/low)
4. Confidence level
5. Source text from the document"""

        tool_schema = pydantic_to_tool_schema(
            FactsResult,
            name="extract_facts",
            description="Extract legally relevant facts from the document",
        )

        try:
            response = self.bedrock_client.invoke(
                messages=[{"role": "user", "content": user_message}],
                system=system_prompt,
                tools=[tool_schema],
                tool_choice={"type": "tool", "name": "extract_facts"},
            )

            result = extract_tool_result(response, FactsResult)
            self.logger.info(f"Extracted {len(result.facts)} case facts")
            return result.facts

        except Exception as e:
            self.logger.error(f"Fact extraction failed: {e}")
            raise ValueError(f"Failed to extract facts: {e}") from e
