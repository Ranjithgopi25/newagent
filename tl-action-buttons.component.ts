from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional
from langchain_core.messages import HumanMessage

# Reuse existing components
from app.features.thought_leadership.services.edit_content.graph import build_sequential_graph
from app.features.thought_leadership.services.edit_content.utils import (
    segment_document_with_llm,
    apply_decisions_to_document
)
from app.features.thought_leadership.services.edit_content.schema import (
    ConsolidateResult,
    EditorResult
)
from app.core.deps import get_llm_client_agent

import json
import logging
import asyncio
import uuid
from dotenv import load_dotenv

load_dotenv(".env", override=True)

# ---------------------------------------------------------------------
# GLOBAL SETUP
# ---------------------------------------------------------------------
llm = get_llm_client_agent()
logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------
# REQUEST MODELS
# ---------------------------------------------------------------------
class EditContentRequest(BaseModel):
    """Initial request to start sequential editing workflow"""
    messages: List[dict]
    editor_types: Optional[List[str]] = None


class NextEditorRequest(BaseModel):
    """Request to continue to next editor after user approval"""
    thread_id: str
    paragraph_edits: List[dict]
    decisions: List[dict]
    accept_all: bool = False
    reject_all: bool = False


class FinalArticleRequest(BaseModel):
    """Request to generate final article from all decisions"""
    original_content: str
    paragraph_edits: List[dict]
    decisions: List[dict]
    accept_all: bool = False
    reject_all: bool = False


# ---------------------------------------------------------------------
# FRONTEND CONVERSION HELPER
# ---------------------------------------------------------------------
def convert_into_frontend(
    result: ConsolidateResult,
    original: str,
    current_editor: str = None
) -> dict:
    """
    Convert ConsolidateResult to frontend format.
    
    If current_editor is provided, show ONLY that editor's feedback.
    Otherwise, show all feedback (for final view).
    
    Args:
        result: ConsolidateResult from graph
        original: Original content text
        current_editor: Name of current editor to filter feedback (optional)
    
    Returns:
        Formatted dict for frontend consumption
    """
    paragraphs = []
    final_text = []
    
    # helper to normalize editor names used in models vs UI
    def _normalize_editor_name(e: str) -> str:
        if not e:
            return e
        # The pydantic schema uses 'brand' as the attribute but elsewhere we
        # use 'brand-alignment' as the editor id. Normalize to attribute name.
        mapping = {
            "brand-alignment": "brand"
        }
        return mapping.get(e, e)

    for i, block in enumerate(result.blocks):
        # Collect feedback - ONLY from current editor if specified
        all_feedback = []
        
        if current_editor:
            # Show ONLY current editor's feedback
            normalized = _normalize_editor_name(current_editor)
            editor_feedback_list = getattr(block.editorial_feedback, normalized, [])
            for feedback_item in editor_feedback_list:
                all_feedback.append({
                    "editor": normalized,
                    "issue": feedback_item.issue,
                    "fix": feedback_item.fix,
                    "impact": feedback_item.impact,
                    "rule_used": feedback_item.rule_used,
                    "priority": feedback_item.priority
                })
        else:
            # Show all feedback (for final view)
            for editor_name in ["development", "content", "copy", "line", "brand"]:
                editor_feedback_list = getattr(block.editorial_feedback, editor_name, [])
                for feedback_item in editor_feedback_list:
                    all_feedback.append({
                        "editor": editor_name,
                        "issue": feedback_item.issue,
                        "fix": feedback_item.fix,
                        "impact": feedback_item.impact,
                        "rule_used": feedback_item.rule_used,
                        "priority": feedback_item.priority
                    })
        
        # Check if paragraph is unchanged for auto-approval
        is_unchanged = block.original_text.strip() == block.final_text.strip()
        
        # Filter editorial_feedback to only include current editor if specified
        if current_editor:
            # Only include current editor's feedback in editorial_feedback structure
            filtered_editorial_feedback = {
                "development": [],
                "content": [],
                "copy": [],
                "line": [],
                "brand": []
            }
            # Populate only the current editor's feedback (use normalized key)
            normalized = _normalize_editor_name(current_editor)
            editor_feedback_list = getattr(block.editorial_feedback, normalized, [])
            filtered_editorial_feedback[normalized] = [
                {
                    "issue": fb.issue,
                    "fix": fb.fix,
                    "impact": fb.impact,
                    "rule_used": fb.rule_used,
                    "priority": fb.priority
                }
                for fb in editor_feedback_list
            ]
            editorial_feedback_to_send = filtered_editorial_feedback
        else:
            # Show all feedback (for final view)
            editorial_feedback_to_send = block.editorial_feedback.model_dump()
        
        paragraphs.append({
            "index": i,
            "block_id": block.id,
            "block_type": block.type,
            "level": block.level,
            "original": block.original_text,  # This will be updated doc for next editor
            "edited": block.final_text,
            "has_changes": block.original_text != block.final_text,
            "tags": [],
            "feedback": all_feedback,  # ONLY current editor's feedback (if specified)
            "editorial_feedback": editorial_feedback_to_send,  # Filtered to current editor only
            "approved": True if is_unchanged else None,  # Auto-approve unchanged paragraphs
            "autoApproved": is_unchanged  # Mark unchanged paragraphs as auto-approved
        })
        final_text.append(block.final_text)
    
    return {
        "type": "editor_complete" if current_editor else "final_complete",
        "original_content": original,
        "final_revised": "\n\n".join(final_text),
        "paragraph_edits": paragraphs,
        "total_blocks": len(paragraphs),
        "total_feedback_items": sum(len(p["feedback"]) for p in paragraphs)
    }


# ---------------------------------------------------------------------
# HELPER: WAIT FOR INTERRUPT + LOAD STATE
# ---------------------------------------------------------------------
def wait_for_interrupt(graph, input_state, config):
    interrupted = False
    for event in graph.stream(input_state, config=config):
        logger.info("STREAM EVENT: %s", event)
        if "__interrupt__" in event:
            interrupted = True
            break

    if not interrupted:
        return None

    checkpoint = graph.get_state(config)
    if not checkpoint or not checkpoint.values:
        return None

    return checkpoint.values


# ---------------------------------------------------------------------
# INITIAL WORKFLOW ENDPOINT
# ---------------------------------------------------------------------
@router.post("")
async def edit_content_workflow(request: EditContentRequest):
    """
    Start sequential editing workflow - runs first editor.
    
    Flow:
    1. Validate input
    2. Segment document
    3. Select and order editors
    4. Generate thread_id for checkpointing
    5. Build graph input state
    6. Invoke graph (stops at interrupt after first editor)
    7. Extract and format result
    8. Stream response to frontend
    """
    if not request.messages:
        raise HTTPException(400, "Messages cannot be empty")

    content = request.messages[-1].get("content", "").strip()
    if not content:
        raise HTTPException(400, "Content cannot be empty")

    async def stream():
        try:
            loop = asyncio.get_event_loop()

            # 1. Segment document
            doc = await loop.run_in_executor(None, segment_document_with_llm, content)

            # 2. Editor selection
            editor_sequence = ["development", "content", "line", "copy", "brand-alignment"]
            requested = request.editor_types or editor_sequence
            selected_editors = [e for e in editor_sequence if e in requested]

            if not selected_editors:
                raise ValueError("No valid editors selected")

            # 3. Thread id
            thread_id = str(uuid.uuid4())

            # 4. Graph input
            graph_input = {
                "messages": [HumanMessage(content=doc.model_dump_json(indent=2))],
                "document": doc,
                "selected_editors": selected_editors,
                "current_editor_index": 0,
                "editor_results": [],
                "final_result": None,
            }

            graph = build_sequential_graph()
            config = {"configurable": {"thread_id": thread_id}}

            # 5. Run until interrupt
            state = wait_for_interrupt(graph, graph_input, config)
            if not state:
                raise ValueError("Expected interrupt but graph completed")

            current_editor = selected_editors[0]

            result = state["final_result"]
            if isinstance(result, dict):
                result = ConsolidateResult.model_validate(result)

            # FRONTEND PAYLOAD
            payload = convert_into_frontend(
                result,
                content,
                current_editor=current_editor
            )
            payload["thread_id"] = thread_id
            payload["current_editor"] = current_editor
            payload["editor_index"] = 0
            payload["total_editors"] = len(selected_editors)

            yield f"data: {json.dumps(payload)}\n\n"
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.exception("Edit content workflow failed")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


# ---------------------------------------------------------------------
# NEXT EDITOR ENDPOINT
# ---------------------------------------------------------------------
@router.post("/next")
async def next_editor_workflow(request: NextEditorRequest):
    """
    Continue to next editor after user approval.
    
    Flow:
    1. Load checkpointed state
    2. Get current editor result
    3. Apply user decisions to update document
    4. Check if all editors complete
    5. Update state with approved document
    6. Resume graph execution (runs next editor)
    7. Extract and format next editor result
    8. Stream response to frontend
    """
    async def stream():
        try:
            graph = build_sequential_graph()
            config = {"configurable": {"thread_id": request.thread_id}}

            # 1. Load paused state
            checkpoint = graph.get_state(config)
            if not checkpoint or not checkpoint.values:
                raise ValueError(f"Session not found: {request.thread_id}")

            state = checkpoint.values

            editor_results = state["editor_results"]
            current_idx = state["current_editor_index"]
            selected_editors = state["selected_editors"]
            original_doc = state["document"]

            # 2. Apply decisions
            updated_doc = apply_decisions_to_document(
                original_doc,
                editor_results[-1],
                request.paragraph_edits,
                request.decisions,
                request.accept_all,
                request.reject_all
            )

            next_idx = current_idx + 1
            if next_idx >= len(selected_editors):
                yield f"data: {json.dumps({'type': 'all_complete'})}\n\n"
                yield "data: [DONE]\n\n"
                return

            # 3. Resume graph
            resume_input = {
                **state,
                "document": updated_doc,
                "current_editor_index": next_idx,
                "messages": [
                    HumanMessage(content=updated_doc.model_dump_json(indent=2))
                ],
            }

            next_state = wait_for_interrupt(graph, resume_input, config)
            if not next_state:
                raise ValueError("Expected interrupt after next editor")

            next_editor = selected_editors[next_idx]

            result = next_state["final_result"]
            if isinstance(result, dict):
                result = ConsolidateResult.model_validate(result)

            original_content = "\n\n".join([b.text for b in updated_doc.blocks])

            # FRONTEND PAYLOAD
            payload = convert_into_frontend(
                result,
                original_content,
                current_editor=next_editor
            )
            payload["thread_id"] = request.thread_id
            payload["current_editor"] = next_editor
            payload["editor_index"] = next_idx
            payload["total_editors"] = len(selected_editors)

            yield f"data: {json.dumps(payload)}\n\n"
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.exception("Next editor workflow failed")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


# ---------------------------------------------------------------------
# FINAL ARTICLE GENERATION ENDPOINT 
# ---------------------------------------------------------------------
@router.post("/final")
async def generate_final_article(request: FinalArticleRequest):
    """
    Generate final article from all user decisions.
    
    Decision priority:
    1. Global flags (reject_all > accept_all)
    2. Explicit paragraph decisions (approved=True/False)
    3. Auto-approval (for unchanged paragraphs)
    4. Default to original
    
    Args:
        request: FinalArticleRequest with all paragraph edits and decisions
    
    Returns:
        JSONResponse with final_article text
    """
    if not request.original_content:
        raise HTTPException(400, "Original content cannot be empty")

    if request.accept_all and request.reject_all:
        raise HTTPException(400, "Cannot accept all and reject all")

    decision_map = {d["index"]: d.get("approved") for d in request.decisions}

    final_paragraphs = []
    block_types = []

    for edit in sorted(request.paragraph_edits, key=lambda x: x["index"]):
        idx = edit["index"]
        approved = decision_map.get(idx)
        auto = edit.get("autoApproved", False)

        # Determine which text to use
        if request.reject_all:
            text_to_append = edit["original"]
        elif request.accept_all:
            text_to_append = edit["edited"]
        elif approved is True:
            text_to_append = edit["edited"]
        elif approved is False:
            text_to_append = edit["original"]
        elif auto:
            text_to_append = edit["edited"]
        else:
            text_to_append = edit["original"]
        
        # Only create block_type and append if paragraph is not empty
        # This ensures indices align with split_blocks() which filters empty blocks
        text_stripped = text_to_append.strip() if text_to_append else ""
        if text_stripped:  # Only process non-empty paragraphs
            block_type = edit.get("block_type", "paragraph")
            block_types.append({
                "index": len(final_paragraphs),  # Index matches final_paragraphs position
                "type": block_type,
                "level": edit.get("level", 0)
            })
            final_paragraphs.append(text_to_append)

    # Debug: Log block_types distribution to verify they're not all 'paragraph'
    type_counts = {}
    for bt in block_types:
        bt_type = bt.get("type", "paragraph")
        type_counts[bt_type] = type_counts.get(bt_type, 0) + 1
    logger.info(f"[Final Article] Block types distribution: {type_counts}")
    logger.info(f"[Final Article] Total block_types: {len(block_types)}, Sample: {block_types[:5] if len(block_types) > 5 else block_types}")

    return JSONResponse(
        content={
            "final_article": "\n\n".join(final_paragraphs),
            "block_types": block_types
        }
    )
