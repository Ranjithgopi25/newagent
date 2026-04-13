import json
import logging
import os
from typing import Dict, Any, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from pydantic import BaseModel, Field

from .graph import run_contract_draft_graph, resume_contract_draft_graph
from .validation import load_field_mapping

logger = logging.getLogger(__name__)

router = APIRouter()

SUPPORTED_PRIMARY = [".doc", ".docx", ".pdf", ".pptx", ".xlsx"]
SUPPORTED_SECONDARY = [".doc", ".docx", ".pdf", ".pptx"]


# ============================================================
# GET /field-mapping/{contract_type}
# ============================================================

@router.get("/field-mapping/{contract_type}")
async def get_field_mapping(contract_type: str):
    """Return field definitions for a given contract type."""
    data = load_field_mapping()

    mapping_contract_type = data.get("contract_type", "")
    if mapping_contract_type.upper() != contract_type.upper():
        raise HTTPException(
            status_code=404,
            detail=f"No field mapping found for contract type: {contract_type}",
        )

    field_definitions = data.get("field_definitions", [])

    required_fields = [f for f in field_definitions if f.get("required")]
    optional_fields = [f for f in field_definitions if not f.get("required")]

    return {
        "contract_type": contract_type.upper(),
        "total_fields": len(field_definitions),
        "required_count": len(required_fields),
        "optional_count": len(optional_fields),
        "field_definitions": field_definitions,
    }


# ============================================================
# POST /draft — browser uploads (multipart). Graph uses document_upload.file_bytes.
# ============================================================

class DraftContractRequest(BaseModel):
    contract_type: Dict[str, bool]
    document_upload: Dict[str, Any]
    supporting_document: Optional[Dict[str, Any]] = Field(default_factory=dict)
    prid: str
    flex_id: str
    template: Optional[Dict[str, Any]] = Field(default_factory=dict)
    lookup_in_icertis: bool = False


@router.post("/draft")
async def draft_contract(
    document_file: UploadFile = File(..., description="Primary contract document (SOW / proposal)"),
    contract_type: str = Form(
        ...,
        description='JSON object of booleans, e.g. {"statement_of_work":true,"engagement_letter":false,...}',
    ),
    prid: str = Form(...),
    flex_id: str = Form(...),
    lookup_in_icertis: str = Form("false"),
    supporting_document_file: Optional[UploadFile] = File(None),
    template_file: Optional[UploadFile] = File(None),
):
    """Multipart upload from the browser; passes file bytes into the graph (no separate /draft/multipart)."""
    try:
        contract_type_dict = json.loads(contract_type)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid contract_type JSON: {e}") from e

    if not isinstance(contract_type_dict, dict):
        raise HTTPException(status_code=400, detail="contract_type must be a JSON object")

    lookup_flag = str(lookup_in_icertis).lower() in ("1", "true", "yes", "on")

    doc_name = document_file.filename or "document"
    doc_bytes = await document_file.read()
    doc_ext = os.path.splitext(doc_name)[1].lower() or ""

    document_upload: Dict[str, Any] = {
        "file_name": doc_name,
        "file_bytes": doc_bytes,
        "file_type": doc_ext,
        "supported_formats": SUPPORTED_PRIMARY,
    }

    supporting_document: Dict[str, Any] = {}
    if supporting_document_file and supporting_document_file.filename:
        sup_name = supporting_document_file.filename
        supporting_document = {
            "file_name": sup_name,
            "file_bytes": await supporting_document_file.read(),
            "file_type": os.path.splitext(sup_name)[1].lower() or "",
            "supported_formats": SUPPORTED_SECONDARY,
        }

    template: Dict[str, Any] = {}
    if template_file and template_file.filename:
        tpl_name = template_file.filename
        template = {
            "file_name": tpl_name,
            "file_bytes": await template_file.read(),
            "file_type": os.path.splitext(tpl_name)[1].lower() or "",
            "supported_formats": SUPPORTED_SECONDARY,
        }

    input_data = {
        "contract_type": contract_type_dict,
        "document_upload": document_upload,
        "supporting_document": supporting_document,
        "prid": prid,
        "flex_id": flex_id,
        "template": template,
        "lookup_in_icertis": lookup_flag,
    }

    result = await run_contract_draft_graph(input_data)
    return result


# ============================================================
# POST /draft/json — server-side paths (e.g. Draft.json with file_path), not for browser file picker
# ============================================================


@router.post("/draft/json")
async def draft_contract_from_json(request: DraftContractRequest):
    """JSON body with document_upload.file_path on disk — same graph as multipart /draft."""
    result = await run_contract_draft_graph(request.model_dump())
    return result


# ============================================================
# POST /draft/resume — Step 2: User fills missing fields, resume draft generation
# ============================================================

class ResumeDraftRequest(BaseModel):
    contract_type: Dict[str, bool]
    prid: str
    flex_id: str
    extracted_fields: Dict[str, Any]
    user_filled_fields: Dict[str, Any]


@router.post("/draft/resume")
async def resume_draft_contract(request: ResumeDraftRequest):
    """Step 2: User provides missing field values → re-validate → generate draft."""
    result = await resume_contract_draft_graph(request.model_dump())
    return result
