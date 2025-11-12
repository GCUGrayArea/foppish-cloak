"""
Document Analyzer

Main module for analyzing documents and extracting structured information using Claude.
"""

import logging
import time
from datetime import datetime
from pathlib import Path
from typing import BinaryIO

import PyPDF2

from .bedrock.client import BedrockClient
from .bedrock.tools import pydantic_to_tool_schema, extract_tool_result
from .prompts.extraction_prompts import (
    SYSTEM_PROMPT,
    get_extraction_prompt,
    get_document_type_guidelines,
)
from .schemas.extraction import (
    ExtractedData,
    ExtractionResult,
    DocumentMetadata,
)


class DocumentAnalyzer:
    """
    Analyzes documents and extracts structured information.

    Supports multiple document types:
    - PDF documents (text extraction)
    - Text files
    - (Future: DOCX, images with OCR)
    """

    def __init__(
        self,
        bedrock_client: BedrockClient | None = None,
        logger: logging.Logger | None = None,
    ):
        """
        Initialize document analyzer.

        Args:
            bedrock_client: Bedrock client instance (creates default if None)
            logger: Logger instance (creates default if None)
        """
        self.bedrock_client = bedrock_client or BedrockClient()
        self.logger = logger or logging.getLogger("document_analyzer")

    def extract_text_from_pdf(self, pdf_file: BinaryIO | Path) -> str:
        """
        Extract text from a PDF file.

        Args:
            pdf_file: PDF file object or path

        Returns:
            Extracted text from all pages

        Raises:
            ValueError: If PDF cannot be read
        """
        try:
            if isinstance(pdf_file, Path):
                with open(pdf_file, "rb") as f:
                    return self._extract_pdf_text(f)
            else:
                return self._extract_pdf_text(pdf_file)
        except Exception as e:
            self.logger.error(f"Failed to extract text from PDF: {e}")
            raise ValueError(f"PDF extraction failed: {e}") from e

    def _extract_pdf_text(self, pdf_file: BinaryIO) -> str:
        """
        Internal method to extract text from PDF file object.

        Args:
            pdf_file: PDF file object

        Returns:
            Extracted text
        """
        reader = PyPDF2.PdfReader(pdf_file)
        text_parts = []

        for page_num, page in enumerate(reader.pages):
            try:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(f"--- Page {page_num + 1} ---\n{page_text}\n")
            except Exception as e:
                self.logger.warning(
                    f"Failed to extract text from page {page_num + 1}: {e}"
                )
                text_parts.append(
                    f"--- Page {page_num + 1} ---\n[Text extraction failed]\n"
                )

        if not text_parts:
            raise ValueError("No text could be extracted from PDF")

        return "\n".join(text_parts)

    def analyze_document(
        self,
        document_id: str,
        document_text: str,
        document_type: str | None = None,
        firm_id: int | None = None,
        user_id: int | None = None,
    ) -> ExtractionResult:
        """
        Analyze a document and extract structured information.

        Args:
            document_id: Unique identifier for the document
            document_text: Full text of the document
            document_type: Type of document (helps with context)
            firm_id: Firm ID for multi-tenancy
            user_id: User ID for tracking

        Returns:
            Extraction result with structured data

        Raises:
            ValueError: If extraction fails
        """
        start_time = time.time()

        try:
            # Build system prompt with document-type-specific guidelines
            system_prompt = SYSTEM_PROMPT
            if document_type:
                guidelines = get_document_type_guidelines(document_type)
                if guidelines:
                    system_prompt += f"\n\n{guidelines}"

            # Build user message with extraction instructions
            user_message = get_extraction_prompt(document_text, document_type)

            # Create tool schema for structured output
            tool_schema = pydantic_to_tool_schema(
                ExtractedData,
                name="extract_document_data",
                description="Extract structured information from the legal document",
            )

            # Invoke Claude with tool calling
            self.logger.info(
                f"Starting document extraction for document {document_id}",
                extra={"document_id": document_id, "firm_id": firm_id},
            )

            response = self.bedrock_client.invoke(
                messages=[{"role": "user", "content": user_message}],
                system=system_prompt,
                tools=[tool_schema],
                tool_choice={"type": "tool", "name": "extract_document_data"},
                firm_id=firm_id,
                user_id=user_id,
            )

            # Extract structured data from tool use
            extracted_data = extract_tool_result(response, ExtractedData)

            # Calculate processing time
            processing_time = time.time() - start_time

            # Get token usage from response
            usage = response.get("usage", {})
            token_usage = {
                "input_tokens": usage.get("input_tokens", 0),
                "output_tokens": usage.get("output_tokens", 0),
            }

            # Build extraction result
            result = ExtractionResult(
                document_id=document_id,
                extracted_data=extracted_data,
                processing_time_seconds=round(processing_time, 2),
                token_usage=token_usage,
                model_id=self.bedrock_client.config.model_id,
                extraction_timestamp=datetime.utcnow().isoformat() + "Z",
                success=True,
            )

            self.logger.info(
                f"Successfully extracted data from document {document_id}",
                extra={
                    "document_id": document_id,
                    "processing_time": processing_time,
                    "input_tokens": token_usage["input_tokens"],
                    "output_tokens": token_usage["output_tokens"],
                    "parties_found": len(extracted_data.parties),
                    "damages_found": len(extracted_data.damages),
                    "facts_found": len(extracted_data.case_facts),
                },
            )

            return result

        except Exception as e:
            processing_time = time.time() - start_time
            error_message = str(e)

            self.logger.error(
                f"Document extraction failed for {document_id}: {error_message}",
                extra={"document_id": document_id, "error": error_message},
            )

            # Return failed result
            return ExtractionResult(
                document_id=document_id,
                extracted_data=ExtractedData(
                    metadata=DocumentMetadata(document_type=document_type or "unknown"),
                    summary="Extraction failed",
                ),
                processing_time_seconds=round(processing_time, 2),
                token_usage={"input_tokens": 0, "output_tokens": 0},
                model_id=self.bedrock_client.config.model_id,
                extraction_timestamp=datetime.utcnow().isoformat() + "Z",
                success=False,
                error_message=error_message,
            )

    def analyze_pdf_document(
        self,
        document_id: str,
        pdf_file: BinaryIO | Path,
        document_type: str | None = None,
        firm_id: int | None = None,
        user_id: int | None = None,
    ) -> ExtractionResult:
        """
        Analyze a PDF document end-to-end.

        This is a convenience method that combines PDF text extraction
        and structured information extraction.

        Args:
            document_id: Unique identifier for the document
            pdf_file: PDF file object or path
            document_type: Type of document
            firm_id: Firm ID for multi-tenancy
            user_id: User ID for tracking

        Returns:
            Extraction result with structured data

        Raises:
            ValueError: If PDF cannot be read or extraction fails
        """
        # Extract text from PDF
        self.logger.info(f"Extracting text from PDF for document {document_id}")
        document_text = self.extract_text_from_pdf(pdf_file)

        # Check if extracted text is reasonable
        if len(document_text.strip()) < 100:
            self.logger.warning(
                f"Very short text extracted from PDF ({len(document_text)} chars)"
            )

        # Analyze the document text
        return self.analyze_document(
            document_id=document_id,
            document_text=document_text,
            document_type=document_type,
            firm_id=firm_id,
            user_id=user_id,
        )

    def get_extraction_summary(self, result: ExtractionResult) -> dict:
        """
        Generate a human-readable summary of extraction results.

        Args:
            result: Extraction result

        Returns:
            Summary dictionary
        """
        if not result.success:
            return {
                "success": False,
                "error": result.error_message,
                "document_id": result.document_id,
            }

        data = result.extracted_data
        confidence_counts = data.get_high_confidence_items()

        return {
            "success": True,
            "document_id": result.document_id,
            "document_type": data.metadata.document_type,
            "summary": data.summary,
            "parties_found": len(data.parties),
            "damages_found": len(data.damages),
            "facts_found": len(data.case_facts),
            "high_confidence_items": confidence_counts,
            "total_damages": data.calculate_total_damages(),
            "incident_date": (
                data.incident.incident_date.isoformat()
                if data.incident and data.incident.incident_date
                else None
            ),
            "processing_time": result.processing_time_seconds,
            "tokens_used": sum(result.token_usage.values()),
            "extraction_notes": data.extraction_notes,
        }
