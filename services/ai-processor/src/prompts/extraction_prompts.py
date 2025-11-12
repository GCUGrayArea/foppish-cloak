"""
Prompts for document extraction using Claude.

These prompts guide the AI to extract structured information from legal documents.
"""

SYSTEM_PROMPT = """You are an expert legal document analyst specialized in extracting structured information from various types of legal documents including:
- Police reports
- Medical records
- Insurance claims
- Contracts and agreements
- Correspondence
- Witness statements
- Accident reports

Your task is to carefully read the provided document and extract key information in a structured format.

Guidelines:
1. Extract information accurately - only include information explicitly stated in the document
2. Assign confidence levels based on how clearly information is stated
3. Include source text for important extractions to enable verification
4. If information is unclear or missing, note this rather than making assumptions
5. Pay special attention to:
   - Names and roles of all parties
   - Dates (incident date, document date, damage dates)
   - Monetary amounts and damages
   - Key facts relevant to liability and damages
   - Contact information and insurance details

Quality standards:
- HIGH confidence: Information clearly and explicitly stated
- MEDIUM confidence: Information implied or partially stated
- LOW confidence: Information inferred from context
- UNCERTAIN: Information unclear or contradictory

Be thorough but concise. Focus on information relevant to a demand letter or legal claim."""


def get_extraction_prompt(document_text: str, document_type: str | None = None) -> str:
    """
    Generate extraction prompt for a document.

    Args:
        document_text: Full text of the document
        document_type: Type of document if known (helps with context)

    Returns:
        Formatted prompt for Claude
    """
    doc_type_context = ""
    if document_type:
        doc_type_context = f"\n\nDocument type: {document_type}"

    return f"""Please analyze the following document and extract all relevant structured information.{doc_type_context}

Document text:
---
{document_text}
---

Extract the following information:
1. **Parties involved**: Names, roles, contact information, insurance details
2. **Incident details**: Date, location, description, incident type
3. **Damages**: Medical expenses, property damage, lost wages, pain and suffering, etc.
4. **Case facts**: Key factual statements relevant to the case
5. **Document metadata**: Document type, date, author, reference numbers

For each piece of extracted information:
- Assign an appropriate confidence level (high/medium/low/uncertain)
- Include relevant source text for verification
- Note any ambiguities or missing information

Provide a brief 2-3 sentence summary of the document's content.

If the document is difficult to parse or contains unclear information, note this in the extraction_notes field."""


def get_focused_extraction_prompt(
    document_text: str, focus_area: str, additional_context: str | None = None
) -> str:
    """
    Generate a focused extraction prompt for specific information.

    This is useful when you need to extract specific types of information
    from a document in a follow-up pass.

    Args:
        document_text: Full text of the document
        focus_area: Specific area to focus on (e.g., "medical expenses", "witness statements")
        additional_context: Additional context to guide extraction

    Returns:
        Formatted prompt for Claude
    """
    context_section = ""
    if additional_context:
        context_section = f"\n\nAdditional context: {additional_context}"

    return f"""Please analyze the following document with a specific focus on: {focus_area}{context_section}

Document text:
---
{document_text}
---

Extract all information related to {focus_area}, including:
- Specific details and amounts
- Dates and timeframes
- Parties or entities involved
- Supporting evidence or documentation mentioned
- Any caveats or conditions

For each piece of information:
- Assign confidence level
- Include source text for verification
- Note any gaps or ambiguities"""


def get_validation_prompt(
    document_text: str, extracted_data: dict, validation_question: str
) -> str:
    """
    Generate a validation prompt to verify or clarify extracted information.

    This can be used for a second pass to validate uncertain extractions.

    Args:
        document_text: Original document text
        extracted_data: Previously extracted data (as dict)
        validation_question: Specific question to validate

    Returns:
        Formatted validation prompt
    """
    return f"""I previously extracted the following information from a document:

Extracted data:
{extracted_data}

Original document:
---
{document_text}
---

Validation question: {validation_question}

Please review the document and answer the validation question.
Provide your confidence level and cite specific text from the document to support your answer."""


def get_multi_document_synthesis_prompt(
    document_summaries: list[dict], synthesis_goal: str
) -> str:
    """
    Generate a prompt to synthesize information from multiple documents.

    This is useful when building a comprehensive case view from multiple sources.

    Args:
        document_summaries: List of summaries from individual documents
        synthesis_goal: What to synthesize (e.g., "complete timeline", "total damages")

    Returns:
        Formatted synthesis prompt
    """
    summaries_text = "\n\n".join(
        [
            f"Document {i+1} ({doc.get('type', 'Unknown')}):\n{doc.get('summary', '')}"
            for i, doc in enumerate(document_summaries)
        ]
    )

    return f"""Please synthesize information from multiple documents to {synthesis_goal}.

Document summaries:
{summaries_text}

Synthesis task: {synthesis_goal}

Provide:
1. Synthesized information addressing the goal
2. Conflicts or inconsistencies between documents
3. Confidence level in the synthesis
4. Gaps in information that require additional documents"""


# Example document-type-specific guidelines
DOCUMENT_TYPE_GUIDELINES = {
    "police_report": """
For police reports, pay special attention to:
- Report number and date
- Officer name and badge number
- All parties involved (drivers, witnesses, victims)
- Accident location and conditions
- Citations or violations issued
- Officer's narrative and diagrams
- Insurance information
- Vehicle information (make, model, license plates)
""",
    "medical_record": """
For medical records, pay special attention to:
- Patient name and date of birth
- Date of service
- Treating physician or facility
- Diagnosis and ICD codes
- Treatment provided
- Prescribed medications
- Follow-up appointments
- Total charges and amounts billed
- Causation statements (if injury is linked to an incident)
""",
    "insurance_claim": """
For insurance claims, pay special attention to:
- Claim number and date filed
- Policy number and coverage details
- Insurance company name and adjuster
- Claimant and insured party names
- Description of loss or damage
- Claimed amounts by category
- Coverage determinations
- Payment information
- Denial reasons (if applicable)
""",
    "medical_bill": """
For medical bills, pay special attention to:
- Provider name and billing information
- Patient name
- Date(s) of service
- CPT/HCPCS procedure codes
- Itemized charges
- Total amount billed
- Insurance payments
- Patient responsibility
- Payment due date
""",
    "wage_loss_statement": """
For wage loss statements, pay special attention to:
- Employee name and employer
- Period of absence from work
- Hourly rate or salary
- Hours or days missed
- Total wages lost
- Benefits lost
- Return to work date (if applicable)
- Employer contact information
""",
}


def get_document_type_guidelines(document_type: str) -> str:
    """
    Get specific guidelines for a document type.

    Args:
        document_type: Type of document

    Returns:
        Guidelines string or empty string if no specific guidelines
    """
    return DOCUMENT_TYPE_GUIDELINES.get(document_type.lower(), "")
