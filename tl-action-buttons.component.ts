import json

def build_field_extraction_prompt(
    document_text: str,
    field_definitions: list,
) -> str:
    fields_spec = "\n".join(
        f'- "{fd["field_key"]}": {fd.get("prompt_hint", fd["label"])} '
        f'(type: {fd.get("type", "text")}'
        f'{", options: " + str(fd["options"]) if fd.get("options") else ""})'
        for fd in field_definitions
    )

    return f"""You are a contract analysis assistant. Extract structured field values from the following document text.

DOCUMENT TEXT:
{document_text}

FIELDS TO EXTRACT:
{fields_spec}

INSTRUCTIONS:
1. Read the document carefully and extract a value for each field listed above.
2. If a field value is clearly stated in the document, provide the exact value.
3. If a field has predefined options, choose the closest matching option.
4. If a field value cannot be determined from the document, set it to null.
5. For date fields, use ISO format (YYYY-MM-DD).
6. For number fields, provide numeric values without currency symbols.
7. For boolean fields, use true or false.
8. For array fields, return a JSON array of strings.

Return ONLY a valid JSON object with field_key as keys and extracted values. No other text.
"""


def build_sow_generation_prompt(
    extracted_fields: dict,
    contract_type: str,
    template_text: str = "",
) -> str:
    """Build a prompt that generates a real, complete SOW document."""

    party_1 = extracted_fields.get("primary_party_name", "[____]")
    party_1_type = extracted_fields.get("primary_party_type", "[____]")
    party_2 = extracted_fields.get("counterparty_name", "[____]")
    party_2_type = extracted_fields.get("counterparty_type", "[____]")
    contact_email = extracted_fields.get("contact_email", "[____]")

    agreement_title = extracted_fields.get("agreement_title", f"{contract_type} Agreement")
    effective_date = extracted_fields.get("effective_date", "[____]")
    expiration_date = extracted_fields.get("expiration_date", "[____]")
    jurisdiction = extracted_fields.get("jurisdiction", "[____]")
    governing_law = extracted_fields.get("governing_law", "[____]")

    payment_terms = extracted_fields.get("payment_terms", "[____]")
    currency = extracted_fields.get("currency", "USD")
    total_value = extracted_fields.get("total_value", 0) or 0
    pricing_model = extracted_fields.get("pricing_model", "[____]")

    scope_description = extracted_fields.get("scope_description", "[____]")
    deliverables = extracted_fields.get("deliverables", [])
    timeline_start = extracted_fields.get("timeline_start", "[____]")
    timeline_end = extracted_fields.get("timeline_end", "[____]")

    confidentiality_required = extracted_fields.get("confidentiality_required", False)
    liability_cap_type = extracted_fields.get("liability_cap_type", "[____]")
    liability_cap_value = extracted_fields.get("liability_cap_value", "[____]")
    termination_notice = extracted_fields.get("termination_notice_period", "[____]")
    indemnity_required = extracted_fields.get("indemnity_required", False)

    # Build deliverables as numbered list (LLM will format into table)
    deliverables_list = ""
    if isinstance(deliverables, list) and deliverables:
        for i, d in enumerate(deliverables, 1):
            deliverables_list += f"  {i}. {d}\n"
    else:
        deliverables_list = "  1. As described in the Scope of Work\n"

    template_guidance = ""
    if template_text and template_text.strip():
        template_guidance = f"""
TEMPLATE-DRIVEN FORMAT REQUIREMENT:
- A user-provided SOW template is supplied below.
- Keep the template's section structure, heading style, numbering style, and formatting pattern as closely as possible.
- Replace template placeholders with extracted values when available.
- If template content conflicts with extracted values, extracted values take priority.
- Keep legal completeness and enforceability in final output.

<USER_TEMPLATE>
{template_text}
</USER_TEMPLATE>
"""

    return f"""You are a senior legal contract drafter. Generate a COMPLETE, REAL Statement of Work (SOW) document — not a template or outline. Write the full legal text for every section, ready for signature.

Use the extracted contract data below to populate the document. Where data is marked [____], keep the placeholder.
{template_guidance}

---

NOW GENERATE THE FULL SOW DOCUMENT IN THIS EXACT FORMAT:

---

**STATEMENT OF WORK**

**{agreement_title}**

**SOW Reference No.:** [Auto-generated]
**Effective Date:** {effective_date}
**Expiration Date:** {expiration_date}

---

**PARTIES**

This Statement of Work ("SOW") is entered into as of {effective_date} ("Effective Date") by and between:

**"{party_1}"** ({party_1_type}), hereinafter referred to as the "Service Provider"

AND

**"{party_2}"** ({party_2_type}), hereinafter referred to as the "Client"
Contact: {contact_email}

(each a "Party" and collectively the "Parties")

---

Write the following sections with FULL legal text (not bullet points or outlines):

**1. RECITALS**
Write 2-3 paragraphs explaining why the Parties are entering this SOW, the business context, and the purpose of the engagement.

**2. DEFINITIONS**
Define at least these terms with proper legal definitions: "Confidential Information", "Deliverables", "Intellectual Property", "Services", "Work Product", "Acceptance Criteria", "Change Order", "Project Manager".

**3. SCOPE OF WORK**
Use this scope description and expand it into formal legal language with numbered sub-sections:
{scope_description}

**4. DELIVERABLES AND MILESTONES**
Present deliverables in a table format:

Deliverables extracted from the document:
{deliverables_list}
Based on the above deliverables, generate a detailed table with these columns: #, Deliverable Name, Description, Due Date, Acceptance Criteria. Fill in realistic details for each deliverable based on the scope and timeline ({timeline_start} to {timeline_end}).

Add an "Acceptance Process" sub-section: Client has 10 business days to review. Written acceptance or rejection with reasons. Deemed accepted if no response within review period.

**5. PROJECT TIMELINE**
State Project Start as {timeline_start} and Project End as {timeline_end}, and include a milestone schedule table based on the deliverables above.

**6. COMMERCIAL TERMS AND PAYMENT**
Write full payment clauses covering:
- Total Contract Value: {currency} {total_value:,}
- Pricing Model: {pricing_model}
- Payment Terms: {payment_terms}
- Invoice submission process, payment due dates
- Late payment penalties (1.5% per month on overdue amounts)
- Expense reimbursement policy (pre-approved expenses only)

**7. CONFIDENTIALITY**
{"Write a full mutual confidentiality clause covering: definition of Confidential Information, obligations of receiving party, permitted disclosures, return/destruction of information, survival period of 3 years after termination." if confidentiality_required else "No confidentiality clause required for this SOW."}

**8. INTELLECTUAL PROPERTY**
Write clauses covering:
- All Work Product created under this SOW belongs to Client upon full payment
- Service Provider retains ownership of pre-existing IP
- Service Provider grants Client a perpetual, non-exclusive license to pre-existing IP embedded in Deliverables
- No open-source software without prior written approval

**9. LIABILITY AND INDEMNIFICATION**
- Liability Cap Type: {liability_cap_type}
- Liability Cap Value: {liability_cap_value}
- Write full limitation of liability clause with carve-outs for gross negligence, willful misconduct, and IP infringement
{"- Write mutual indemnification clause covering third-party claims, IP infringement, and breach of confidentiality" if indemnity_required else ""}

**10. TERM AND TERMINATION**
- Term: {effective_date} to {expiration_date}
- Termination for convenience: {termination_notice}
- Termination for cause: 30 days written notice with cure period
- Write effects of termination: payment for work completed, return of materials, survival clauses

**11. GOVERNING LAW AND DISPUTE RESOLUTION**
- Governing Law: {governing_law}
- Jurisdiction: {jurisdiction}
- Write dispute resolution process: negotiation (30 days) → mediation → binding arbitration

**12. GENERAL PROVISIONS**
Write standard clauses for: Force Majeure, Assignment, Amendments, Entire Agreement, Severability, Waiver, Notices, Independent Contractor, Counterparts.

**13. SIGNATURE BLOCK**

IN WITNESS WHEREOF, the Parties have executed this Statement of Work as of the Effective Date.

| | **{party_1}** | **{party_2}** |
|---|---|---|
| **Signature** | _________________________ | _________________________ |
| **Name** | [____] | [____] |
| **Title** | [____] | [____] |
| **Date** | [____] | [____] |

---

CRITICAL INSTRUCTIONS:
- Write REAL legal text, not summaries or bullet lists
- Keep the exact section headings and order shown above (1 through 13)
- Every section must have complete, enforceable contract language
- Use "shall" for obligations, "may" for permissions
- Cross-reference other sections where appropriate (e.g., "as defined in Section 2")
- Use consistent defined terms throughout (capitalize them)
- The output must be a complete, signable SOW document
- Use prose paragraphs for clauses; include tables only where explicitly requested above
- Do NOT include any commentary, notes, explanations, or markdown code fences
- Output ONLY the final SOW document text
"""


def build_sow_targeted_edit_prompt(
    previous_draft_content: str,
    changed_fields: dict,
    contract_type: str,
) -> str:
    """Build a strict surgical-edit prompt that preserves unchanged text."""
    changed_fields_json = json.dumps(changed_fields, indent=2, ensure_ascii=True)

    return f"""You are a senior legal contract editor.

Your task is to perform a STRICT, SURGICAL edit of an existing {contract_type} draft.

IMPORTANT EDIT INPUTS
- Existing draft (source of truth): between <EXISTING_DRAFT> tags.
- Changed extracted fields only: between <CHANGED_FIELDS_JSON> tags.

<CHANGED_FIELDS_JSON>
{changed_fields_json}
</CHANGED_FIELDS_JSON>

<EXISTING_DRAFT>
{previous_draft_content}
</EXISTING_DRAFT>

STRICT EDITING RULES
1. Edit ONLY the portions directly impacted by the changed fields.
2. Preserve ALL unrelated text exactly as-is:
   - same section order and headings
   - same paragraph structure
   - same tables and signature block layout
3. Do NOT rewrite, paraphrase, or improve unrelated sections.
4. Do NOT add new sections or remove existing sections.
5. Keep legal tone and existing formatting consistent with the original draft.
6. If a changed field appears in multiple places (e.g. parties/signature), update those references only.
7. If no meaningful edits are required, return the original draft unchanged.

OUTPUT FORMAT
- Return ONLY the final revised draft text.
- No preface, no explanations, no markdown code fences.
"""
