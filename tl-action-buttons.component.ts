omplete Internal Flow - How It Parses & Works
STEP 1: Frontend calls POST /api/v1/tl/contract/draft
The request hits router.py:60 → draft_contract() which calls run_contract_draft_graph().

STEP 2: LangGraph Executes 4 Nodes in Sequence
The graph in graph.py runs these nodes:


EXTRACT_DOCUMENT → LLM_FIELD_EXTRACTION → VALIDATE_FIELDS → (pass/fail)
Node 1 - EXTRACT_DOCUMENT (graph.py:47)


Takes: document_upload.file_path (e.g., "path/to/file.docx")
Does:  Reads the file bytes, detects extension (.docx/.pdf/.pptx/.xlsx)
       Calls the matching extractor (extract_text_from_docx, etc.)
Returns: document_text = "entire text content of the document as a string"
Node 2 - LLM_FIELD_EXTRACTION (graph.py:63)


Takes: document_text + field_definitions from field_mapping.json
Does:  Builds a prompt like:
         "Here is the DOCUMENT TEXT: <full text>
          Extract these FIELDS:
          - primary_party_name: The legal name... (type: text)
          - pricing_model: Commercial pricing... (type: dropdown, options: [Fixed, T&M, Sub])
          ..."
       Sends this to LLM → LLM returns a JSON object
       Parses the JSON response, strips markdown code fences if present
Returns: extracted_fields = {
           "primary_party_name": "Acme Corp",
           "pricing_model": "Fixed",
           "contact_email": null,      ← LLM couldn't find this in doc
           "total_value": 500000,
           ...
         }
Node 3 - VALIDATE_FIELDS (graph.py:82)


Takes: extracted_fields + field_definitions
Does:  Loops through all field_definitions where required=true
       For each required field, checks if extracted_fields[field_key] is:
         - null → MISSING
         - empty string "" → MISSING
         - has value → OK
Returns: validation_passed = true/false
         missing_fields = [list of missing field definitions]
STEP 3: Decision Point (graph.py:158)

validation_passed == true?
  YES → Continue to DRAFT_GENERATION node
  NO  → Graph ENDS here, returns to run_contract_draft_graph()
STEP 4A: Validation FAILED - Response to Frontend
Back in graph.py:214:


if not result.get("validation_passed", False):
    return {
        "status": "validation_requirement_to_fulfill",
        "missing_fields": [...],        # what the user needs to fill
        "extracted_fields": {...},       # what LLM already found
    }
Frontend should:

Read missing_fields array
For each missing field, render the right input based on type:
"type": "text" → text input
"type": "dropdown" + "options": [...] → select/dropdown
"type": "date" → date picker
"type": "boolean" → checkbox/toggle
"type": "number" → number input
Show prompt_hint as placeholder/helper text
Keep extracted_fields in memory (you'll send it back)
STEP 4B: Frontend calls POST /api/v1/tl/contract/draft/resume
The user fills the missing fields. Frontend sends:


{
  "extracted_fields": { ... from step 4A response ... },
  "user_filled_fields": { "contact_email": "john@acme.com", "pricing_model": "Fixed" }
}
Back in graph.py:225, resume_contract_draft_graph() does:


1. MERGE:  extracted_fields.update(user_filled_fields)
           → now all fields are combined into one dict

2. RE-VALIDATE: checks if still missing anything
   Still missing? → return "validation_requirement_to_fulfill" again
   All good?     → continue

3. RUN GRAPH with validation_passed=True
   → entry router skips straight to DRAFT_GENERATION
STEP 5: DRAFT_GENERATION (graph.py:101)

Takes: extracted_fields + contract_type
Does:  Builds a massive SOW generation prompt that plugs in all field values:
       - Party names, types, emails
       - Dates, jurisdiction, governing law
       - Payment terms, pricing model, total value
       - Scope, deliverables (as numbered list)
       - Confidentiality, liability, termination clauses
       Sends to LLM → LLM generates a FULL legal SOW document
Returns: draft_content = "**STATEMENT OF WORK**\n\n**SOW Agreement**\n..."
STEP 6: ASSEMBLE_RESPONSE (graph.py:124)

Builds final JSON:
{
  "status": "draft_generated",
  "generated_at": "2026-04-13T10:30:00Z",
  "contract_type": "SOW",
  "prid": "ACME-2026-001",
  "flex_id": "FLX-00125",
  "extracted_fields": { all merged fields },
  "draft_content": "full SOW document as markdown text"
}
STEP 7: Frontend Renders Final Response
draft_content is markdown-formatted legal text — render it with a markdown renderer
It contains sections like: Parties, Recitals, Definitions, Scope, Deliverables (table), Payment, Confidentiality, Liability, Termination, Signature Block
extracted_fields can be shown in a sidebar/summary panel
Visual Summary

Frontend                          Backend (LangGraph)
────────                          ───────────────────
POST /draft ──────────────────→  EXTRACT_DOCUMENT
  { document_upload,                  │ read .docx/.pdf
    contract_type, prid }             ↓
                                 LLM_FIELD_EXTRACTION
                                      │ LLM parses text → JSON fields
                                      ↓
                                 VALIDATE_FIELDS
                                      │ check required fields
                                      ↓
                              ┌── validation_passed? ──┐
                              │ NO                     │ YES
                              ↓                        ↓
←─────────────────────────  return               DRAFT_GENERATION
  { status: "validation_     missing                   │ LLM generates
    requirement_to_fulfill", fields                    │ full SOW doc
    missing_fields: [...],                             ↓
    extracted_fields: {...} }                    ASSEMBLE_RESPONSE
                                                       │
User fills form                                        ↓
      │                             ←──────────────  return
      ↓                               { status: "draft_generated",
POST /draft/resume ────────→           draft_content: "..." }
  { extracted_fields,
    user_filled_fields }         merge → re-validate → DRAFT_GENERATION
                                                          ↓
←───────────────────────────────────────────────  final SOW document
The key thing to understand: the document you upload gets read once, the LLM extracts fields once, and if any required fields are missing, the backend returns them so the frontend can collect them from the user. Once all fields are present, the LLM generates the complete contract.
