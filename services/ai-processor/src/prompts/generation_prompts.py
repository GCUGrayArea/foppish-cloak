"""
Prompts for demand letter generation using Claude.

These prompts guide the AI to generate professional demand letters based on
extracted facts and attorney preferences.
"""

from typing import Optional


GENERATION_SYSTEM_PROMPT = """You are an expert legal writer specializing in demand letters for personal injury and civil litigation cases. You have extensive experience drafting persuasive, professional demand letters that effectively communicate:
- The facts of the case
- Legal theories of liability
- The extent of damages
- Settlement demands

Your writing is clear, organized, and persuasive. You maintain appropriate legal tone while being accessible to both legal and non-legal audiences.

Guidelines for demand letter writing:
1. **Structure**: Follow standard demand letter format (introduction, facts, liability, damages, demand, closing)
2. **Tone**: Adapt tone based on instructions (formal, assertive, diplomatic, or aggressive)
3. **Persuasion**: Build a compelling narrative that establishes liability and justifies damages
4. **Precision**: Use specific facts, dates, and amounts from the case file
5. **Legal terminology**: Use appropriate legal terms without excessive jargon
6. **Professional**: Maintain professional courtesy even in assertive letters
7. **Evidence**: Reference specific documents and evidence to support claims
8. **Damages**: Clearly itemize all categories of damages with supporting documentation
9. **Demand**: Make a clear, specific settlement demand with reasonable deadline
10. **Consequences**: Appropriately communicate consequences of non-settlement (litigation)

Quality standards:
- Clear, logical organization
- Persuasive but factual narrative
- Specific and detailed damage calculations
- Professional language appropriate for the audience
- Strong opening and closing
- Compliance with legal writing conventions"""


TONE_STYLE_GUIDANCE = {
    "formal": """
Tone: FORMAL
- Use traditional legal language and formalities
- Maintain professional distance and objectivity
- Use phrases like "we respectfully submit," "it is our position that"
- Balanced presentation of facts and legal theories
- Professional throughout, avoiding emotional language
- Suitable for insurance companies and corporate defendants
""",
    "assertive": """
Tone: ASSERTIVE
- Use confident, strong language
- Clearly state liability and expectations
- Use phrases like "it is clear that," "the evidence demonstrates," "we will pursue"
- Emphasize strength of case and likelihood of litigation success
- Direct and businesslike, avoiding excessive pleasantries
- Suitable when you have a strong case and want to convey confidence
""",
    "diplomatic": """
Tone: DIPLOMATIC
- Use balanced, professional language
- Acknowledge complexity while stating your position
- Use phrases like "we believe," "the facts suggest," "we hope to resolve"
- Emphasize willingness to negotiate and mutual benefit of settlement
- Courteous and respectful throughout
- Suitable when relationship preservation matters or facts are complex
""",
    "aggressive": """
Tone: AGGRESSIVE
- Use forceful, direct language
- Emphasize defendant's wrongdoing and consequences
- Use phrases like "your client's negligence," "we will not hesitate to," "substantial liability"
- Explicitly state litigation intentions and potential outcomes
- Minimal pleasantries, focus on strength of claims
- Suitable for clear liability cases or uncooperative defendants
- CAUTION: Do not make threats or use unprofessional language
""",
}


def get_generation_prompt(
    extracted_data: dict,
    template_variables: dict,
    tone: str = "formal",
    custom_instructions: Optional[str] = None,
    include_settlement_deadline: bool = True,
    deadline_days: int = 30,
) -> str:
    """
    Generate a prompt for creating a demand letter.

    Args:
        extracted_data: Extracted case data (ExtractedData schema)
        template_variables: Template variables (attorney info, firm info, etc.)
        tone: Desired tone (formal, assertive, diplomatic, aggressive)
        custom_instructions: Additional instructions from attorney
        include_settlement_deadline: Whether to include response deadline
        deadline_days: Number of days for deadline

    Returns:
        Formatted prompt for Claude
    """
    # Get tone guidance
    tone_guidance = TONE_STYLE_GUIDANCE.get(tone, TONE_STYLE_GUIDANCE["formal"])

    # Format extracted data summary
    data_summary = _format_extracted_data_summary(extracted_data)

    # Format template variables
    template_info = _format_template_variables(template_variables)

    # Build custom instructions section
    custom_section = ""
    if custom_instructions:
        custom_section = f"\n\n**Special Instructions from Attorney:**\n{custom_instructions}"

    # Build deadline section
    deadline_section = ""
    if include_settlement_deadline:
        deadline_section = f"\n\n**Settlement Deadline:** Include a response deadline of {deadline_days} days from the letter date."

    prompt = f"""Please draft a comprehensive demand letter based on the following case information.

{tone_guidance}

**Case Information:**
{data_summary}

**Attorney and Firm Information:**
{template_info}
{custom_section}
{deadline_section}

**Required Letter Structure:**
Please generate the letter with the following sections, providing complete content for each:

1. **Header Section:**
   - Date (use current date)
   - Recipient name and address (from extracted data or default to insurance company)
   - Subject line with claim/case reference
   - Appropriate salutation

2. **Introduction:**
   - Establish attorney-client relationship
   - State purpose of letter (settlement demand)
   - Brief overview of claim

3. **Facts:**
   - Chronological narrative of incident
   - Include specific dates, locations, and circumstances
   - Reference key evidence and witnesses
   - Establish what happened clearly and persuasively

4. **Liability:**
   - Legal theories supporting liability (negligence, etc.)
   - Application of law to facts
   - Defendant's duty, breach, causation
   - Reference to supporting evidence

5. **Damages:**
   - Itemized damages by category:
     * Medical expenses (with specific amounts)
     * Lost wages (with calculation)
     * Property damage (if applicable)
     * Pain and suffering (justified by facts)
     * Other damages
   - Total damages calculation
   - Reference to supporting documentation

6. **Demand:**
   - Clear settlement demand amount
   - Response deadline (if required)
   - Consequences of non-response (litigation)
   - Preservation of rights statement

7. **Closing:**
   - Professional closing paragraph
   - Attorney signature block
   - Contact information

**Important:**
- Use specific facts and amounts from the case information
- Make the narrative compelling and persuasive
- Ensure all damages are properly supported and justified
- Use appropriate legal terminology
- Maintain professional standards throughout
- The letter should be ready to send with minimal editing"""

    return prompt


def get_refinement_prompt(
    current_letter: dict,
    feedback_instruction: str,
    target_section: Optional[str] = None,
    additional_context: Optional[str] = None,
) -> str:
    """
    Generate a prompt for refining an existing letter.

    Args:
        current_letter: Current letter content (GeneratedLetter schema)
        feedback_instruction: Attorney's instruction for changes
        target_section: Specific section to modify (if applicable)
        additional_context: Additional context for refinement

    Returns:
        Formatted refinement prompt
    """
    # Format current letter
    letter_text = _format_letter_for_refinement(current_letter)

    # Build section focus
    section_focus = ""
    if target_section:
        section_focus = f"\n\n**Focus on Section:** {target_section}"

    # Build context section
    context_section = ""
    if additional_context:
        context_section = f"\n\n**Additional Context:**\n{additional_context}"

    prompt = f"""Please refine the following demand letter based on the attorney's feedback.

**Current Letter:**
---
{letter_text}
---

**Attorney's Instruction:**
{feedback_instruction}
{section_focus}
{context_section}

**Instructions:**
1. Make the requested changes to the letter
2. Maintain consistency with unchanged sections
3. Preserve the overall structure and professional tone
4. If modifying one section, ensure it still flows well with other sections
5. Return the complete refined letter in structured format

Please provide:
- The complete refined letter (all sections)
- A brief summary of changes made"""

    return prompt


def get_section_regeneration_prompt(
    current_letter: dict,
    section_name: str,
    regeneration_instruction: str,
    case_context: Optional[dict] = None,
) -> str:
    """
    Generate a prompt for regenerating a specific section.

    Args:
        current_letter: Current letter content
        section_name: Section to regenerate
        regeneration_instruction: Why/how to regenerate
        case_context: Original case data for reference

    Returns:
        Formatted section regeneration prompt
    """
    # Get current section content
    section_content = _get_section_content(current_letter, section_name)

    # Format case context if provided
    context_section = ""
    if case_context:
        context_section = f"\n\n**Case Information for Reference:**\n{_format_extracted_data_summary(case_context)}"

    prompt = f"""Please regenerate the {section_name.upper()} section of this demand letter.

**Current {section_name.title()} Section:**
---
{section_content}
---

**Regeneration Instruction:**
{regeneration_instruction}
{context_section}

**Instructions:**
1. Create a new version of this section based on the instruction
2. Maintain consistency with the rest of the letter
3. Use appropriate tone and legal terminology
4. Ensure the new section flows naturally
5. Keep the same structural format

Please provide the regenerated section content."""

    return prompt


def get_tone_adjustment_prompt(current_letter: dict, new_tone: str, reason: Optional[str] = None) -> str:
    """
    Generate a prompt for adjusting letter tone.

    Args:
        current_letter: Current letter content
        new_tone: Desired new tone
        reason: Reason for tone change (optional)

    Returns:
        Formatted tone adjustment prompt
    """
    letter_text = _format_letter_for_refinement(current_letter)
    tone_guidance = TONE_STYLE_GUIDANCE.get(new_tone, TONE_STYLE_GUIDANCE["formal"])

    reason_section = ""
    if reason:
        reason_section = f"\n\n**Reason for Tone Change:** {reason}"

    prompt = f"""Please rewrite this demand letter with a different tone.

**Current Letter:**
---
{letter_text}
---

**New Tone:**
{tone_guidance}
{reason_section}

**Instructions:**
1. Rewrite the letter maintaining all facts and structure
2. Adjust language and phrasing to match the new tone
3. Keep all specific amounts, dates, and facts unchanged
4. Ensure the new tone is consistent throughout all sections
5. Maintain professional standards regardless of tone

Please provide the complete letter with the new tone."""

    return prompt


# Helper functions for formatting

def _format_extracted_data_summary(extracted_data: dict) -> str:
    """Format extracted data into a readable summary."""
    summary_parts = []

    # Document metadata
    metadata = extracted_data.get("metadata", {})
    if metadata:
        summary_parts.append(f"**Document Type:** {metadata.get('document_type', 'Unknown')}")

    # Parties
    parties = extracted_data.get("parties", [])
    if parties:
        summary_parts.append("\n**Parties Involved:**")
        for party in parties:
            party_info = f"- {party.get('name', 'Unknown')} ({party.get('party_type', 'unknown')})"
            if party.get("insurance_company"):
                party_info += f" - Insured by {party['insurance_company']}"
            summary_parts.append(party_info)

    # Incident
    incident = extracted_data.get("incident", {})
    if incident:
        summary_parts.append("\n**Incident Details:**")
        if incident.get("incident_date"):
            summary_parts.append(f"- Date: {incident['incident_date']}")
        if incident.get("incident_location"):
            summary_parts.append(f"- Location: {incident['incident_location']}")
        if incident.get("description"):
            summary_parts.append(f"- Description: {incident['description']}")

    # Damages
    damages = extracted_data.get("damages", [])
    if damages:
        summary_parts.append("\n**Damages:**")
        total = 0.0
        for damage in damages:
            damage_desc = f"- {damage.get('damage_type', 'Unknown').replace('_', ' ').title()}: {damage.get('description', '')}"
            if damage.get("amount"):
                damage_desc += f" - ${damage['amount']:,.2f}"
                total += damage["amount"]
            summary_parts.append(damage_desc)
        summary_parts.append(f"\n**Total Damages:** ${total:,.2f}")

    # Case facts
    case_facts = extracted_data.get("case_facts", [])
    if case_facts:
        summary_parts.append("\n**Key Facts:**")
        for fact in case_facts[:10]:  # Limit to top 10 facts
            summary_parts.append(f"- {fact.get('fact', '')}")

    # Summary
    if extracted_data.get("summary"):
        summary_parts.append(f"\n**Case Summary:**\n{extracted_data['summary']}")

    return "\n".join(summary_parts)


def _format_template_variables(template_vars: dict) -> str:
    """Format template variables into a readable string."""
    parts = []

    if template_vars.get("attorney_name"):
        parts.append(f"**Attorney:** {template_vars['attorney_name']}")
    if template_vars.get("law_firm"):
        parts.append(f"**Law Firm:** {template_vars['law_firm']}")
    if template_vars.get("firm_address"):
        parts.append(f"**Address:** {template_vars['firm_address']}")
    if template_vars.get("firm_phone"):
        parts.append(f"**Phone:** {template_vars['firm_phone']}")
    if template_vars.get("firm_email"):
        parts.append(f"**Email:** {template_vars['firm_email']}")
    if template_vars.get("client_name"):
        parts.append(f"**Client:** {template_vars['client_name']}")
    if template_vars.get("case_number"):
        parts.append(f"**Case Number:** {template_vars['case_number']}")

    return "\n".join(parts)


def _format_letter_for_refinement(letter: dict) -> str:
    """Format a structured letter for refinement prompt."""
    parts = []

    # Header
    if "header" in letter:
        header = letter["header"]
        parts.append(f"**HEADER:**")
        parts.append(f"{header.get('date', '')}")
        parts.append(f"{header.get('recipient_name', '')}")
        parts.append(f"{header.get('recipient_address', '')}")
        parts.append(f"{header.get('subject_line', '')}")
        parts.append(f"{header.get('salutation', '')}")
        parts.append("")

    # Introduction
    if "introduction" in letter:
        parts.append("**INTRODUCTION:**")
        parts.append(letter["introduction"].get("content", ""))
        parts.append("")

    # Facts
    if "facts" in letter:
        parts.append("**FACTS:**")
        parts.append(letter["facts"].get("content", ""))
        parts.append("")

    # Liability
    if "liability" in letter:
        parts.append("**LIABILITY:**")
        parts.append(letter["liability"].get("content", ""))
        parts.append("")

    # Damages
    if "damages" in letter:
        parts.append("**DAMAGES:**")
        parts.append(letter["damages"].get("content", ""))
        parts.append("")

    # Demand
    if "demand" in letter:
        parts.append("**DEMAND:**")
        parts.append(letter["demand"].get("content", ""))
        parts.append("")

    # Closing
    if "closing" in letter:
        parts.append("**CLOSING:**")
        parts.append(letter["closing"].get("content", ""))
        parts.append(f"\n{letter['closing'].get('closing_phrase', '')}")
        parts.append(letter["closing"].get("signature_block", ""))

    return "\n".join(parts)


def _get_section_content(letter: dict, section_name: str) -> str:
    """Get content for a specific section."""
    section_map = {
        "header": lambda: f"{letter['header'].get('date', '')}\n{letter['header'].get('recipient_name', '')}\n{letter['header'].get('recipient_address', '')}\n{letter['header'].get('subject_line', '')}",
        "introduction": lambda: letter["introduction"].get("content", ""),
        "facts": lambda: letter["facts"].get("content", ""),
        "liability": lambda: letter["liability"].get("content", ""),
        "damages": lambda: letter["damages"].get("content", ""),
        "demand": lambda: letter["demand"].get("content", ""),
        "closing": lambda: f"{letter['closing'].get('content', '')}\n{letter['closing'].get('closing_phrase', '')}\n{letter['closing'].get('signature_block', '')}",
    }

    section_func = section_map.get(section_name.lower())
    if section_func:
        return section_func()
    return ""
