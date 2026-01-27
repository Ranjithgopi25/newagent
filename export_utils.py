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
    SingleEditorFeedback
)

from .prompt import (
    BRAND_EDITOR_PROMPT,
    COPY_EDITOR_PROMPT,
    LINE_EDITOR_PROMPT,
    CONTENT_EDITOR_PROMPT,
    DEVELOPMENT_EDITOR_PROMPT,
    ARTICLE_ANALYSIS_CONTEXT_TEMPLATE
)
from .schema import ArticleAnalysis
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
def run_editor_engine(editor_type: EditorName, blocks: list[DocumentBlock], article_analysis: Optional[ArticleAnalysis] = None) -> EditorResult:
    logger.info(f"AM IN EDITOR ENGINE: {editor_type}_editor_tool")
    warnings: List[str] = []
    prompt = PROMPTS_BY_EDITOR[editor_type]
    doc = DocumentStructure(blocks=blocks)

    document_json = doc.model_dump_json(indent=2)
    
    # For Development Editor, inject article analysis context if available
    if editor_type == "development" and article_analysis:
        # Format repetition patterns as a list
        repetition_list = "\n     - ".join(article_analysis.repetition_patterns) if article_analysis.repetition_patterns else "None identified"
        if not article_analysis.repetition_patterns:
            repetition_list = "None identified"
        
        # Format repetition patterns for display
        repetition_patterns_display = "\n".join([f"- {pattern}" for pattern in article_analysis.repetition_patterns]) if article_analysis.repetition_patterns else "None identified"
        
        # Build analysis context
        analysis_context = ARTICLE_ANALYSIS_CONTEXT_TEMPLATE.format(
            central_argument=article_analysis.central_argument,
            primary_pov=article_analysis.primary_pov,
            repetition_patterns=repetition_patterns_display,
            repetition_list=repetition_list,
            original_length=article_analysis.original_length,
            section_count=article_analysis.section_count,
            has_redundancy="Yes" if article_analysis.has_redundancy else "No"
        )
        
        # Inject analysis context into prompt
        prompt = prompt.replace("{article_analysis_context}", analysis_context)
    else:
        # For other editors or if no analysis, use empty context
        prompt = prompt.replace("{article_analysis_context}", "")
    
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
@tool(
        "development_editor_tool", 
        args_schema=DocumentStructure,
        description="Applies Development Editor to the document structure."
)
def development_editor_tool(blocks: list[DocumentBlock]) -> dict:
    result = run_editor_engine("development", blocks)
    return result.model_dump()

@tool(
        "content_editor_tool", 
        args_schema=DocumentStructure,
        description="Applies Content Editor to the document structure."
)
def content_editor_tool(blocks: list[DocumentBlock]) -> dict:
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
