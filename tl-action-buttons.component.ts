import json
import os
import logging
from typing import Dict, List, Any

from langchain_core.messages import HumanMessage

from app.core.deps import get_llm_client_agent
from app.common.document_utils import (
    extract_text_from_docx,
    extract_text_from_pdf,
    extract_text_from_pptx,
    extract_text_from_xlsx,
)
from .prompt import build_field_extraction_prompt

logger = logging.getLogger(__name__)

FIELD_MAPPING_PATH = os.path.join(os.path.dirname(__file__), "field_mapping.json")

llm = get_llm_client_agent()


def load_field_mapping() -> dict:
    with open(FIELD_MAPPING_PATH, "r") as f:
        return json.load(f)


_EXTRACTORS = {
    ".docx": extract_text_from_docx,
    ".doc": extract_text_from_docx,
    ".pdf": extract_text_from_pdf,
    ".pptx": extract_text_from_pptx,
    ".xlsx": extract_text_from_xlsx,
}


def extract_document_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    """Extract text from raw file bytes using the filename extension."""
    ext = os.path.splitext(filename)[1].lower()
    if not ext:
        raise ValueError(f"Could not determine file type from filename: {filename}")

    extractor = _EXTRACTORS.get(ext)
    if not extractor:
        raise ValueError(
            f"Unsupported file type: {ext}. Supported: {list(_EXTRACTORS.keys())}"
        )

    if isinstance(file_bytes, bytearray):
        file_bytes = bytes(file_bytes)

    text = extractor(file_bytes)
    logger.info("[EXTRACT] Extracted %d characters from %s", len(text), filename)
    return text


def extract_document_text(file_path: str) -> str:
    """Read a document from disk and extract text based on file extension."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Document not found: {file_path}")

    with open(file_path, "rb") as f:
        file_bytes = f.read()

    name = os.path.basename(file_path)
    return extract_document_text_from_bytes(file_bytes, name if name else file_path)


async def ask_llm_to_extract_fields(
    document_text: str, field_definitions: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Send document text + field definitions to LLM, get back extracted field values."""
    prompt = build_field_extraction_prompt(document_text, field_definitions)

    response = await llm.ainvoke([HumanMessage(content=prompt)])
    raw = response.content if hasattr(response, "content") else str(response)

    try:
        raw_clean = raw.strip()
        if raw_clean.startswith("```"):
            raw_clean = raw_clean.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        extracted = json.loads(raw_clean)
        if not isinstance(extracted, dict):
            logger.warning("[LLM_EXTRACT] LLM returned non-dict, got %s", type(extracted))
            return {}
        return extracted
    except (json.JSONDecodeError, TypeError) as e:
        logger.warning("[LLM_EXTRACT] Failed to parse LLM response: %s", e)
        return {}


def validate_extracted_fields(
    extracted_fields: Dict[str, Any], field_definitions: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Check extracted fields against field_mapping definitions. Return validation result."""
    missing_fields = []

    for field_def in field_definitions:
        if not field_def.get("required"):
            continue

        field_key = field_def["field_key"]
        value = extracted_fields.get(field_key)

        if value is None or (isinstance(value, str) and not value.strip()):
            missing_fields.append({
                "field_key": field_key,
                "label": field_def.get("label", field_key),
                "type": field_def.get("type", "text"),
                "prompt_hint": field_def.get("prompt_hint", ""),
                "options": field_def.get("options"),
            })

    return {
        "valid": len(missing_fields) == 0,
        "missing_fields": missing_fields,
        "extracted_fields": extracted_fields,
    }
