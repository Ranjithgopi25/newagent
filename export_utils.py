from typing import Dict, List, Optional
import json

from langchain.tools import tool
from langchain.messages import HumanMessage
from app.core.deps import get_llm_client_agent

from .schema import (
    DocumentStructure,
    DocumentBlock,
    FeedbackItem,
    EditorResult,
    BlockEditResult,
    EditorName,
    ListedBlockEditResult,
    SingleEditorFeedback,
    DevelopmentEditorValidationResult
)

from .prompt import (
    BRAND_EDITOR_PROMPT,
    COPY_EDITOR_PROMPT,
    LINE_EDITOR_PROMPT,
    CONTENT_EDITOR_PROMPT,
    DEVELOPMENT_EDITOR_PROMPT,
    DEVELOPMENT_EDITOR_VALIDATION_PROMPT
)
import logging

logger = logging.getLogger(__name__)


# ----------------------------------------------------------------------
# GLOBAL LLM INSTANCE
# ----------------------------------------------------------------------
llm = get_llm_client_agent()


# ----------------------------------------------------------------------
# EDITOR PROMPT MAP
# ----------------------------------------------------------------------
PROMPTS_BY_EDITOR: Dict[str, str] = {
    "development": DEVELOPMENT_EDITOR_PROMPT,
    "content": CONTENT_EDITOR_PROMPT,
    "copy": COPY_EDITOR_PROMPT,
    "line": LINE_EDITOR_PROMPT,
    "brand": BRAND_EDITOR_PROMPT,
    "brand-alignment": BRAND_EDITOR_PROMPT,
}


# ----------------------------------------------------------------------
# EDITOR ENGINE — runs the correct prompt, parses JSON, normalizes schema
# ----------------------------------------------------------------------
def run_editor_engine(editor_type: EditorName, blocks: list[DocumentBlock], article_analysis_text: Optional[str] = None, cross_paragraph_analysis_text: Optional[str] = None) -> EditorResult:
    logger.info(f"AM IN EDITOR ENGINE: {editor_type}_editor_tool")
    warnings: List[str] = []
    prompt = PROMPTS_BY_EDITOR[editor_type]
    doc = DocumentStructure(blocks=blocks)

    document_json = doc.model_dump_json(indent=2)
    
    # For Development Editor, inject article analysis context if available
    if editor_type == "development" and article_analysis_text and article_analysis_text.strip():
        # Format analysis text as context section
        analysis_context = f"""
============================================================
ARTICLE-LEVEL ANALYSIS — PRE-EDITING CONTEXT
============================================================

{article_analysis_text}

============================================================
USE THIS ANALYSIS TO GUIDE YOUR EDITING
============================================================

The analysis above provides article-level insights. You MUST use this to:
- Ensure the central argument is explicit in the introduction
- Eliminate repetition patterns identified above
- Maintain the identified POV consistently
- Reduce length if redundancy was identified
- Work at the ARTICLE LEVEL, not paragraph-by-paragraph

"""
        
        # Inject analysis context into prompt
        prompt = prompt.replace("{article_analysis_context}", analysis_context)
    else:
        # For other editors or if no analysis, use empty context
        prompt = prompt.replace("{article_analysis_context}", "")
    
    # For Content Editor, inject cross-paragraph analysis context if available
    if editor_type == "content" and cross_paragraph_analysis_text and cross_paragraph_analysis_text.strip():
        # Format analysis text as context section
        analysis_context = f"""
============================================================
CROSS-PARAGRAPH ANALYSIS — PRE-EDITING CONTEXT
============================================================

{cross_paragraph_analysis_text}

============================================================
USE THIS ANALYSIS TO GUIDE YOUR EDITING
============================================================

The analysis above provides cross-paragraph insights. You MUST use this to:
- Eliminate soft resets and re-introductions identified above
- Reduce redundant reinforcement language where specified
- Strengthen executive signal hierarchy progression as mapped
- Work ACROSS paragraphs using sentence-level edits only

"""
        
        # Inject analysis context into prompt
        prompt = prompt.replace("{cross_paragraph_analysis_context}", analysis_context)
    else:
        # For other editors or if no analysis, use empty context
        prompt = prompt.replace("{cross_paragraph_analysis_context}", "")
    
    messages = [HumanMessage(content=prompt.replace("{document_json}", document_json))]

    response = llm.with_structured_output(ListedBlockEditResult).invoke(messages)
    llm_output = response
    llm_blocks = json.loads(llm_output.model_dump_json())["blocks"]

    def get_block_by_id(block_id: str):
        """
        Returns the block object matching the given block_id from LLM output.
        """
        for block in llm_blocks:
            if isinstance(block, dict) and block.get("id") == block_id:
                return block
        return None
    
    merged_blocks: List[BlockEditResult] = []

    for block in doc.blocks:
        suggestion = get_block_by_id(block.id)

        if suggestion is None:
            merged_blocks.append(
                BlockEditResult(
                    id=block.id,
                    type=block.type,
                    level=block.level,
                    original_text=block.text,
                    suggested_text=block.text,
                    has_changes=False,
                    feedback_edit=[],
                )
            )
            continue

        suggested = suggestion.get("suggested_text", block.text)
        has_changes = suggested != block.text

        raw_feedback = suggestion.get("feedback_edit", [])
        normalized_feedback: List[SingleEditorFeedback] = []

        # Handle feedback_edit - can be list of SingleEditorFeedback or dict
        if isinstance(raw_feedback, list):
            # Already a list, validate and convert
            for fb_item in raw_feedback:
                if isinstance(fb_item, dict):
                    # Try to create SingleEditorFeedback
                    try:
                        normalized_feedback.append(SingleEditorFeedback(**fb_item))
                    except Exception:
                        # If it fails, skip this feedback item
                        pass
        elif isinstance(raw_feedback, dict):
            # Convert dict format to SingleEditorFeedback list
            for editor_name, items in raw_feedback.items():
                if isinstance(items, list):
                    feedback_items = [
                        FeedbackItem(**fb) for fb in items if isinstance(fb, dict)
                    ]
                    if feedback_items:
                        normalized_feedback.append(
                            SingleEditorFeedback(editor=editor_name, items=feedback_items)
                        )

        merged_blocks.append(
            BlockEditResult(
                id=block.id,
                type=block.type,
                level=block.level,
                original_text=block.text,
                suggested_text=suggested,
                has_changes=has_changes,
                feedback_edit=normalized_feedback,
            )
        )
    

    return EditorResult(
        editor_type=editor_type,
        blocks=merged_blocks,  # FIXED: Return merged_blocks instead of llm_blocks
        warnings=warnings,
    )


# ----------------------------------------------------------------------
# FALLBACK RESULT WHEN LLM FAILS
# ----------------------------------------------------------------------
def _fallback_editor_result(editor_type: EditorName,
                            doc: DocumentStructure,
                            warnings: List[str]) -> EditorResult:

    return EditorResult(
        editor_type=editor_type,
        warnings=warnings,
        blocks=[
            BlockEditResult(
                id=b.id,
                type=b.type,
                level=b.level,
                original_text=b.text,
                suggested_text=b.text,
                has_changes=False,
                feedback_edit=[],
            )
            for b in doc.blocks
        ],
    )


# ----------------------------------------------------------------------
# TOOL WRAPPERS FOR SUPERVISOR AGENT
# ----------------------------------------------------------------------
# NOTE: These tool wrappers are for standalone tool usage.
# When used through the graph (development_editor_node), article_analysis
# is automatically injected from state. These tools don't have state access,
# so they run without article analysis (for backward compatibility).
@tool(
        "development_editor_tool", 
        args_schema=DocumentStructure,
        description="Applies Development Editor to the document structure. Note: For article-level analysis, use through the graph flow (development_editor_node) which automatically includes article analysis."
)
def development_editor_tool(blocks: list[DocumentBlock]) -> dict:
    """
    Standalone tool wrapper for Development Editor.
    NOTE: This tool does NOT include article analysis (no state access).
    For article-level analysis, use through graph flow (development_editor_node).
    """
    # Tool wrappers don't have state access, so article_analysis_text will be None by default
    # The graph node (development_editor_node) handles article analysis injection
    result = run_editor_engine("development", blocks)
    return result.model_dump()

@tool(
        "content_editor_tool", 
        args_schema=DocumentStructure,
        description="Applies Content Editor to the document structure. Note: For cross-paragraph analysis, use through the graph flow (content_editor_node) which automatically includes cross-paragraph analysis."
)
def content_editor_tool(blocks: list[DocumentBlock]) -> dict:
    """
    Standalone tool wrapper for Content Editor.
    NOTE: This tool does NOT include cross-paragraph analysis (no state access).
    For cross-paragraph analysis, use through graph flow (content_editor_node).
    """
    # Tool wrappers don't have state access, so cross_paragraph_analysis_text will be None by default
    # The graph node (content_editor_node) handles cross-paragraph analysis injection
    result = run_editor_engine("content", blocks)
    return result.model_dump()


@tool(
        "line_editor_tool", 
        args_schema=DocumentStructure,
        description="Applies Line Editor to the document structure."
)
def line_editor_tool(blocks: list[DocumentBlock]) -> dict:
    result = run_editor_engine("line", blocks)
    return result.model_dump()


@tool(
        "copy_editor_tool", 
        args_schema=DocumentStructure,
        description="Applies Copy Editor to the document structure."
)
def copy_editor_tool(blocks: list[DocumentBlock]) -> dict:
    result = run_editor_engine("copy", blocks)
    return result.model_dump()


@tool(
        "brand_editor_tool", 
        args_schema=DocumentStructure,
        description="Applies Brand Editor to the document structure."
)
def brand_editor_tool(blocks: list[DocumentBlock]) -> dict:
    result = run_editor_engine("brand-alignment", blocks)
    return result.model_dump()


# ----------------------------------------------------------------------
# VALIDATION TOOL FOR DEVELOPMENT EDITOR
# ----------------------------------------------------------------------
def validate_development_editor(
    original_analysis_text: str,
    edited_result: EditorResult,
    original_document: DocumentStructure
) -> DevelopmentEditorValidationResult:
    """
    Validate Development Editor output using ARTICLE-LEVEL ENFORCEMENT criteria.
    Returns structured Pydantic result with score (0-10) and feedback.
    """
    logger.info("VALIDATING DEVELOPMENT EDITOR OUTPUT")
    
    # Calculate original and edited article text
    original_text = " ".join([block.text for block in original_document.blocks])
    original_word_count = len(original_text.split())
    
    edited_text = " ".join([
        block.suggested_text or block.original_text 
        for block in edited_result.blocks
    ])
    edited_word_count = len(edited_text.split())
    
    # Format validation prompt
    validation_prompt = DEVELOPMENT_EDITOR_VALIDATION_PROMPT.format(
        original_analysis=original_analysis_text,
        original_article=original_text,
        original_word_count=original_word_count,
        edited_article=edited_text,
        edited_word_count=edited_word_count
    )
    
    try:
        # Use structured output to get validation result
        response = llm.with_structured_output(DevelopmentEditorValidationResult).invoke(
            [HumanMessage(content=validation_prompt)]
        )
        
        logger.info(f"Development Editor validation completed: score={response.score}")
        return response
        
    except Exception as e:
        logger.error(f"Error validating development editor: {e}")
        return DevelopmentEditorValidationResult(
            score=0,
            feedback_remarks=[]
        )
