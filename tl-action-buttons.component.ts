import json
import os
from typing import Dict, Any, Optional, List

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from pydantic import BaseModel, Field

from .graph import (
    run_contract_draft_graph,
    resume_contract_draft_graph,
    resume_contract_draft_targeted_edit_graph,
)

router = APIRouter()

SUPPORTED_PRIMARY = [".doc", ".docx", ".pdf", ".pptx", ".xlsx"]
SUPPORTED_SECONDARY = [".doc", ".docx", ".pdf", ".pptx"]


# ============================================================
# POST /draft — browser uploads (multipart). Graph uses document_upload.file_bytes.
# ============================================================


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
        tpl_bytes = await template_file.read()
        template = {
            "file_name": tpl_name,
            "file_bytes": tpl_bytes,
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


class ResumeEditDraftRequest(BaseModel):
    contract_type: Dict[str, bool]
    prid: str
    flex_id: str
    extracted_fields: Dict[str, Any]
    user_filled_fields: Dict[str, Any]
    previous_draft_content: str
    changed_field_keys: List[str] = Field(default_factory=list)


@router.post("/draft/resume-edit")
async def resume_edit_draft_contract(request: ResumeEditDraftRequest):
    """Step 2b: User updates specific fields; perform strict targeted edits only."""
    result = await resume_contract_draft_targeted_edit_graph(request.model_dump())
    return result
