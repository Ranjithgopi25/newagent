from datetime import datetime, timezone
import logging
from typing import Any, Dict, List

from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage

from app.core.deps import get_llm_client_agent

from .schema import ContractDraftState
from .prompt import build_sow_generation_prompt, build_sow_targeted_edit_prompt
from .validation import (
    extract_document_text,
    extract_document_text_from_bytes,
    ask_llm_to_extract_fields,
    validate_extracted_fields,
    load_field_mapping,
)

logger = logging.getLogger(__name__)

llm = get_llm_client_agent()


# ============================================================
# HELPER: resolve active contract type from toggle dict
# ============================================================

def get_active_contract_type(contract_type_dict: Dict[str, bool]) -> str:
    """Return the contract type key that is True (e.g. 'SOW')."""
    type_map = {
        "statement_of_work": "SOW",
        "engagement_letter": "Engagement Letter",
        "master_services_agreement": "MSA",
        "non_disclosure_agreement": "NDA",
        "product_license_agreement": "Product License Agreement",
    }
    for key, active in contract_type_dict.items():
        if active:
            return type_map.get(key, key.upper())
    return "SOW"


def build_draft_generated_response(
    *,
    contract_type_dict: Dict[str, bool],
    prid: str,
    flex_id: str,
    extracted_fields: Dict[str, Any],
    draft_content: str,
) -> Dict[str, Any]:
    """Build a consistent draft_generated response payload."""
    return {
        "status": "draft_generated",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "contract_type": get_active_contract_type(contract_type_dict),
        "prid": prid,
        "flex_id": flex_id,
        "extracted_fields": extracted_fields,
        "draft_content": draft_content,
    }


def build_validation_requirement_response(
    message: str,
    *,
    missing_fields: List[Dict[str, Any]],
    extracted_fields: Dict[str, Any],
) -> Dict[str, Any]:
    """Build a consistent validation_requirement_to_fulfill response payload."""
    return {
        "status": "validation_requirement_to_fulfill",
        "message": message,
        "missing_fields": missing_fields,
        "extracted_fields": extracted_fields,
    }


def validate_required_fields(extracted_fields: Dict[str, Any]) -> Dict[str, Any]:
    """Validate extracted fields against required field mapping definitions."""
    mapping = load_field_mapping()
    field_definitions = mapping.get("field_definitions", [])
    return validate_extracted_fields(extracted_fields, field_definitions)


# ============================================================
# NODE: EXTRACT_DOCUMENT
# ============================================================

def extract_document_node(state: ContractDraftState):
    """Read the uploaded document and extract text content.

    Supports either:
    - Server path: ``document_upload.file_path`` (JSON / CLI)
    - Browser upload: ``document_upload.file_bytes`` + ``file_name`` (multipart, no temp file)
    """
    du = state.document_upload or {}
    file_bytes = du.get("file_bytes")
    file_path = (du.get("file_path") or "").strip()

    if file_bytes is not None:
        file_name = du.get("file_name") or "document"
        if isinstance(file_name, str) and not file_name.strip():
            file_name = "document"
        logger.info("[EXTRACT_DOCUMENT] Extracting text from in-memory upload (%s)", file_name)
        raw = file_bytes if isinstance(file_bytes, (bytes, bytearray)) else bytes(file_bytes)
        document_text = extract_document_text_from_bytes(raw, str(file_name))
    elif file_path:
        logger.info("[EXTRACT_DOCUMENT] Extracting text from path %s", file_path)
        document_text = extract_document_text(file_path)
    else:
        raise ValueError(
            "document_upload must include either 'file_bytes' + 'file_name' (browser) "
            "or 'file_path' (server path)"
        )

    return {
        "document_text": document_text,
    }


# ============================================================
# NODE: LLM_FIELD_EXTRACTION
# ============================================================

async def llm_field_extraction_node(state: ContractDraftState):
    """Use LLM to extract structured fields from document text."""
    logger.info("[LLM_FIELD_EXTRACTION] Extracting fields via LLM")

    mapping = load_field_mapping()
    field_definitions = mapping.get("field_definitions", [])

    extracted = await ask_llm_to_extract_fields(state.document_text, field_definitions)

    logger.info("[LLM_FIELD_EXTRACTION] Extracted %d fields", len(extracted))
    return {
        "extracted_fields": extracted,
    }


# ============================================================
# NODE: VALIDATE_FIELDS
# ============================================================

def validate_fields_node(state: ContractDraftState):
    """Validate extracted fields against field_mapping.json required fields."""
    logger.info("[VALIDATE_FIELDS] Validating extracted fields")

    mapping = load_field_mapping()
    field_definitions = mapping.get("field_definitions", [])

    result = validate_extracted_fields(state.extracted_fields, field_definitions)

    return {
        "validation_passed": result["valid"],
        "missing_fields": result["missing_fields"],
    }


# ============================================================
# NODE: DRAFT_GENERATION
# ============================================================

async def draft_generation_node(state: ContractDraftState):
    """Use LLM to generate SOW contract draft from extracted fields."""
    active_type = get_active_contract_type(state.contract_type)

    logger.info("[DRAFT_GENERATION] Generating %s draft", active_type)

    prompt = build_sow_generation_prompt(
        extracted_fields=state.extracted_fields,
        contract_type=active_type,
    )

    response = await llm.ainvoke([HumanMessage(content=prompt)])
    draft_text = response.content if hasattr(response, "content") else str(response)

    return {
        "draft_content": draft_text,
    }


# ============================================================
# NODE: ASSEMBLE_RESPONSE
# ============================================================

def assemble_response_node(state: ContractDraftState):
    """Build the final response JSON."""
    logger.info("[ASSEMBLE_RESPONSE] Building final response")

    return {
        "final_response": build_draft_generated_response(
            contract_type_dict=state.contract_type,
            prid=state.prid,
            flex_id=state.flex_id,
            extracted_fields=state.extracted_fields,
            draft_content=state.draft_content,
        ),
    }


# ============================================================
# BUILD GRAPH (single graph for both initial and resume flows)
# ============================================================

def build_contract_draft_graph():
    graph = StateGraph(ContractDraftState)

    graph.add_node("EXTRACT_DOCUMENT", extract_document_node)
    graph.add_node("LLM_FIELD_EXTRACTION", llm_field_extraction_node)
    graph.add_node("VALIDATE_FIELDS", validate_fields_node)
    graph.add_node("DRAFT_GENERATION", draft_generation_node)
    graph.add_node("ASSEMBLE_RESPONSE", assemble_response_node)

    # Entry: route based on whether we already have validated fields
    graph.set_conditional_entry_point(
        lambda state: "DRAFT_GENERATION"
        if state.validation_passed and state.extracted_fields
        else "EXTRACT_DOCUMENT"
    )

    # Extraction flow
    graph.add_edge("EXTRACT_DOCUMENT", "LLM_FIELD_EXTRACTION")
    graph.add_edge("LLM_FIELD_EXTRACTION", "VALIDATE_FIELDS")
    graph.add_conditional_edges(
        "VALIDATE_FIELDS",
        lambda state: "DRAFT_GENERATION" if state.validation_passed else END,
    )

    # Draft generation flow
    graph.add_edge("DRAFT_GENERATION", "ASSEMBLE_RESPONSE")
    graph.add_edge("ASSEMBLE_RESPONSE", END)

    return graph.compile()


# ============================================================
# PUBLIC API
# ============================================================

async def run_contract_draft_graph(input_data: dict) -> dict:
    """Step 1: Extract document, extract fields via LLM, validate.
    Returns missing fields if validation fails, or the generated draft if all fields are present."""
    graph = build_contract_draft_graph()

    initial_state = ContractDraftState(
        contract_type=input_data.get("contract_type", {}),
        document_upload=input_data.get("document_upload", {}),
        supporting_document=input_data.get("supporting_document", {}),
        prid=input_data.get("prid", ""),
        flex_id=input_data.get("flex_id", ""),
        template=input_data.get("template", {}),
        lookup_in_icertis=input_data.get("lookup_in_icertis", False),
    )

    result = await graph.ainvoke(initial_state)

    if not result.get("validation_passed", False):
        return build_validation_requirement_response(
            "Required fields are missing. Please provide the following fields.",
            missing_fields=result.get("missing_fields", []),
            extracted_fields=result.get("extracted_fields", {}),
        )

    return result.get("final_response", {})


async def resume_contract_draft_graph(input_data: dict) -> dict:
    """Step 2: User provides the missing fields. Merge into extracted_fields,
    re-validate, and proceed to draft generation using the same graph."""

    extracted_fields = dict(input_data.get("extracted_fields", {}) or {})
    user_filled_fields = input_data.get("user_filled_fields", {})

    # Merge user-provided values into extracted fields
    extracted_fields.update(user_filled_fields)

    # Re-validate before invoking graph
    validation = validate_required_fields(extracted_fields)

    if not validation["valid"]:
        return build_validation_requirement_response(
            "Required fields are still missing. Please provide the following fields.",
            missing_fields=validation["missing_fields"],
            extracted_fields=extracted_fields,
        )

    # Validation passed — same graph, but entry router skips to DRAFT_GENERATION
    graph = build_contract_draft_graph()

    initial_state = ContractDraftState(
        contract_type=input_data.get("contract_type", {}),
        prid=input_data.get("prid", ""),
        flex_id=input_data.get("flex_id", ""),
        extracted_fields=extracted_fields,
        validation_passed=True,
    )

    result = await graph.ainvoke(initial_state)
    return result.get("final_response", {})


def _has_required_sow_headings(content: str) -> bool:
    """Basic guard that checks top-level sections still exist."""
    required_headings = (
        "**PARTIES**",
        "**3. SCOPE OF WORK**",
        "**6. COMMERCIAL TERMS AND PAYMENT**",
        "**13. SIGNATURE BLOCK**",
    )
    return all(h in content for h in required_headings)


async def resume_contract_draft_targeted_edit_graph(input_data: dict) -> dict:
    """Step 2b: Apply surgical edits to prior draft using changed fields only."""
    extracted_fields = dict(input_data.get("extracted_fields", {}) or {})
    user_filled_fields = dict(input_data.get("user_filled_fields", {}) or {})
    previous_draft_content = str(input_data.get("previous_draft_content", "") or "")
    changed_field_keys = input_data.get("changed_field_keys", [])
    original_extracted_fields = dict(input_data.get("extracted_fields", {}) or {})
    contract_type_dict = input_data.get("contract_type", {})
    prid = input_data.get("prid", "")
    flex_id = input_data.get("flex_id", "")

    if not previous_draft_content.strip():
        return {
            "status": "error",
            "message": "previous_draft_content is required for targeted resume-edit.",
        }

    if not user_filled_fields:
        # Nothing changed: return previous draft unchanged and keep response shape.
        return build_draft_generated_response(
            contract_type_dict=contract_type_dict,
            prid=prid,
            flex_id=flex_id,
            extracted_fields=extracted_fields,
            draft_content=previous_draft_content,
        )

    extracted_fields.update(user_filled_fields)
    effective_changed_keys = changed_field_keys or list(user_filled_fields.keys())
    if not any(original_extracted_fields.get(key) != extracted_fields.get(key) for key in effective_changed_keys):
        return build_draft_generated_response(
            contract_type_dict=contract_type_dict,
            prid=prid,
            flex_id=flex_id,
            extracted_fields=extracted_fields,
            draft_content=previous_draft_content,
        )

    validation = validate_required_fields(extracted_fields)
    if not validation["valid"]:
        return build_validation_requirement_response(
            "Required fields are still missing. Please provide the following fields.",
            missing_fields=validation["missing_fields"],
            extracted_fields=extracted_fields,
        )

    active_type = get_active_contract_type(contract_type_dict)
    changed_fields_payload = {
        key: {
            "old": original_extracted_fields.get(key),
            "new": extracted_fields.get(key),
        }
        for key in effective_changed_keys
    }
    prompt = build_sow_targeted_edit_prompt(
        previous_draft_content=previous_draft_content,
        changed_fields=changed_fields_payload,
        contract_type=active_type,
    )
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    draft_text = response.content if hasattr(response, "content") else str(response)
    draft_text = str(draft_text).strip()
    if draft_text.startswith("```"):
        draft_text = draft_text.strip("`")
        if draft_text.lower().startswith("markdown"):
            draft_text = draft_text[8:].strip()

    if not draft_text or not _has_required_sow_headings(draft_text):
        logger.warning(
            "[TARGETED_RESUME_EDIT] Invalid targeted-edit output; retrying with full regenerate prompt."
        )
        full_prompt = build_sow_generation_prompt(
            extracted_fields=extracted_fields,
            contract_type=active_type,
        )
        full_response = await llm.ainvoke([HumanMessage(content=full_prompt)])
        draft_text = full_response.content if hasattr(full_response, "content") else str(full_response)
        draft_text = str(draft_text).strip()
        if draft_text.startswith("```"):
            draft_text = draft_text.strip("`")
            if draft_text.lower().startswith("markdown"):
                draft_text = draft_text[8:].strip()

    if not draft_text:
        logger.warning(
            "[TARGETED_RESUME_EDIT] Empty regenerate output; using previous draft as last fallback."
        )
        draft_text = previous_draft_content.strip()

    return build_draft_generated_response(
        contract_type_dict=contract_type_dict,
        prid=prid,
        flex_id=flex_id,
        extracted_fields=extracted_fields,
        draft_content=draft_text,
    )

