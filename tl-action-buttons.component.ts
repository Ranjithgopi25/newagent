from typing import TypedDict, List, Dict, Optional, Annotated, Iterator, Tuple, Sequence, Any
import operator
import json
import pickle
import re
from datetime import datetime, timezone
from langgraph.graph import StateGraph
from langchain_core.messages import BaseMessage, HumanMessage
from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.base import (
    BaseCheckpointSaver,
    Checkpoint,
    CheckpointMetadata,
    CheckpointTuple,
    ChannelVersions,
)
from redis import Redis
from app.core.config import config
from app.core.deps import get_llm_client_agent
import logging

from .schema import (
    DocumentStructure,
    EditorResult,
    ConsolidateResult,
    ConsolidatedBlockEdit,
    BlockEditResult,
    EditorFeedback,
    DevelopmentEditorValidationResult,
    ContentEditorValidationResult,
    DocumentBlock,
    FeedbackItem,
    SingleEditorFeedback
)

from .prompt import (
    DEVELOPMENT_CONTENT_RESOLVE_CONFLICTS_PROMPT,
    LINE_COPY_RESOLVE_CONFLICTS_PROMPT,
)
from .tools import (
    development_editor_tool,
    content_editor_tool,
    line_editor_tool,
    copy_editor_tool,
    brand_editor_tool,
    run_editor_engine,
    validate_development_editor,
    validate_content_editor,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------
# LLM (shared)
# ---------------------------------------------------------------------
llm = get_llm_client_agent()

# ---------------------------------------------------------------------
# GRAPH STATE
# ---------------------------------------------------------------------
class SupervisorState(TypedDict):
    messages: List[BaseMessage]
    document: DocumentStructure
    selected_editors: List[str]
    editor_results: Annotated[List[EditorResult], operator.add]
    final_result: Optional[ConsolidateResult]
    current_editor_index: Optional[int]  # For sequential execution
    thread_id: Optional[str]  # For checkpointing
    article_analysis: Optional[str]  # Article-level analysis text for Development Editor (LLM-based, not schema)
    cross_paragraph_analysis: Optional[str]  # Cross-paragraph analysis text for Content Editor (LLM-based, not schema)
    dev_editor_retry_count: Optional[int]  # Retry count for Development Editor (retries until score >= 8, max 2 retries)
    content_editor_retry_count: Optional[int]  # Retry count for Content Editor (retries until score >= 8, max 2 retries)
    content_validation_result: Optional[ContentEditorValidationResult]  # Validation result for Content Editor
    validation_result: Optional[DevelopmentEditorValidationResult]  # Validation result for Development Editor


# ---------------------------------------------------------------------
# ARTICLE-LEVEL ANALYSIS AND VALIDATION HELPERS
# ---------------------------------------------------------------------
def analyze_article(document: DocumentStructure) -> str:
    """
    Analyze the entire article using LLM.
    Returns formatted text analysis for Development Editor guidance.
    No schema parsing - direct LLM text response.
    """
    logger.info("ANALYZING ARTICLE FOR DEVELOPMENT EDITOR")
    
    # Calculate article length
    full_text = " ".join([block.text for block in document.blocks])
    word_count = len(full_text.split())
    
    # Count sections (headings)
    section_count = sum(1 for block in document.blocks if block.type == "heading")
    
    # Create analysis prompt - request formatted text, not JSON
    analysis_prompt = f"""Analyze the following article for Development Editor guidance.

ARTICLE:
{full_text}

Provide article-level analysis in the following format:

CENTRAL ARGUMENT:
[Articulate the article's central argument in ONE clear, assertive sentence. This must appear explicitly in the introduction.]

PRIMARY POINT OF VIEW:
[Identify the primary point of view: advisor/collaborator, observer, analyst, etc.]

REPETITION PATTERNS:
[List specific core ideas/concepts that appear in multiple sections. Be specific about what concepts are repeated and where they appear.]

ARTICLE METRICS:
- Original length: {word_count} words
- Sections: {section_count}
- Has redundancy: [yes/no - indicate if the article has redundant or repetitive content]

ACTIONABLE GUIDANCE:
[Provide specific guidance on what needs to be addressed: which sections need consolidation, which ideas are repeated, what POV should be maintained, etc.]

Provide clear, actionable guidance for the Development Editor to work at the article level, not paragraph-by-paragraph.
"""
    
    try:
        response = llm.invoke([HumanMessage(content=analysis_prompt)])
        analysis_text = response.content if hasattr(response, 'content') else str(response)
        
        if not analysis_text or analysis_text.strip() == "":
            logger.info("Article analysis returned empty response")
            return ""
        
        return analysis_text
    except Exception as e:
        logger.error(f"Error analyzing article: {e}")
        # Return empty string on error - no fallback values
        return ""


def analyze_cross_paragraph_logic(document: DocumentStructure) -> str:
    """
    Analyze cross-paragraph progression using LLM.
    Returns formatted text analysis for Content Editor guidance.
    No schema parsing - direct LLM text response.
    """
    logger.info("ANALYZING CROSS-PARAGRAPH LOGIC FOR CONTENT EDITOR")
    
    # Extract paragraphs (paragraph and bullet_item blocks)
    paragraphs = []
    for i, block in enumerate(document.blocks):
        if block.type in ["paragraph", "bullet_item"]:
            paragraphs.append({
                "id": block.id,
                "index": i,
                "text": block.text
            })
    
    if len(paragraphs) < 2:
        logger.info("Not enough paragraphs for cross-paragraph analysis")
        return ""
    
    # Build paragraph sequence text
    paragraph_sequence = "\n\n".join([
        f"PARAGRAPH {i+1} (ID: {p['id']}):\n{p['text']}"
        for i, p in enumerate(paragraphs)
    ])
    
    # Create analysis prompt
    analysis_prompt = f"""Analyze the following paragraph sequence for Content Editor cross-paragraph enforcement guidance.

PARAGRAPH SEQUENCE:
{paragraph_sequence}

Provide cross-paragraph analysis in the following format:

Cross-Paragraph Logic Issues:
[List specific instances where paragraphs soft-reset, re-introduce context, or fail to build on preceding paragraphs. Identify which paragraphs have these issues and what context is being unnecessarily reintroduced.]

Redundancy Patterns (Non-Structural):
[Identify paragraphs that materially repeat ideas already established in earlier paragraphs. Specify which paragraphs repeat which concepts, and whether later mentions increase specificity, consequence, or decision relevance, or merely restate.]

Executive Signal Hierarchy:
[Map the progression of executive signal strength across paragraphs. Identify which paragraphs should convey clearer implications, priorities, or decision relevance than earlier ones. Note if later paragraphs fail to escalate appropriately or if the final paragraph lacks sufficient executive signal.]

Actionable Guidance:
[Provide specific guidance for Content Editor: which paragraphs need edits to eliminate soft resets, which redundant language should be reduced, and how to strengthen executive signal hierarchy through sentence-level edits only.]

Provide clear, actionable guidance for the Content Editor to work across paragraphs using sentence-level edits only.
"""
    
    try:
        response = llm.invoke([HumanMessage(content=analysis_prompt)])
        analysis_text = response.content if hasattr(response, 'content') else str(response)
        
        if not analysis_text or analysis_text.strip() == "":
            logger.info("Cross-paragraph analysis returned empty response")
            return ""
        
        return analysis_text
    except Exception as e:
        logger.error(f"Error analyzing cross-paragraph logic: {e}")
        # Return empty string on error - no fallback values
        return ""




def validate_cross_paragraph_compliance(
    original_analysis_text: str,
    edited_result: EditorResult,
    original_document: DocumentStructure
) -> List[str]:
    """
    Use LLM to validate that Content Editor output meets cross-paragraph enforcement requirements.
    Returns list of validation warnings (empty if compliant).
    """
    logger.info("VALIDATING CROSS-PARAGRAPH COMPLIANCE USING LLM")
    
    if not original_analysis_text or not original_analysis_text.strip():
        logger.info("No original cross-paragraph analysis text available for validation")
        return []
    
    # Extract paragraphs from original and edited documents
    original_paragraphs = []
    for block in original_document.blocks:
        if block.type in ["paragraph", "bullet_item"]:
            original_paragraphs.append(block.text)
    
    edited_paragraphs = []
    for block in edited_result.blocks:
        if block.type in ["paragraph", "bullet_item"]:
            edited_paragraphs.append(block.suggested_text or block.original_text)
    
    original_text = "\n\n".join(original_paragraphs)
    edited_text = "\n\n".join(edited_paragraphs)
    
    # Create validation prompt for LLM - uses exact CROSS-PARAGRAPH ENFORCEMENT requirements
    validation_prompt = f"""You are validating that the Content Editor output meets the CROSS-PARAGRAPH ENFORCEMENT requirements.

ORIGINAL CROSS-PARAGRAPH ANALYSIS (provided to Content Editor):
{original_analysis_text}

ORIGINAL PARAGRAPH SEQUENCE:
{original_text}

EDITED PARAGRAPH SEQUENCE (Content Editor output):
{edited_text}

============================================================
CROSS-PARAGRAPH ENFORCEMENT REQUIREMENTS — VALIDATE AGAINST THESE
============================================================

The Content Editor MUST have:

1. Cross-Paragraph Logic
   Each paragraph MUST assume and build on the reader's understanding from the preceding paragraph. The Content Editor MUST have eliminated soft resets, re-introductions, or restatement of previously established context.

2. Redundancy Awareness (Non-Structural)
   If a paragraph materially repeats an idea already established elsewhere in the article, the Content Editor MUST have reduced reinforcement language and avoided adding emphasis or framing that increases redundancy. The Content Editor MUST NOT have removed or merged ideas across blocks.

3. Executive Signal Hierarchy
   The Content Editor MUST have calibrated emphasis so that later sections convey clearer implications, priorities, or decision relevance than earlier sections, without introducing new conclusions or shifting the author's intent.

============================================================
VALIDATION TASK
============================================================

Analyze the EDITED PARAGRAPH SEQUENCE against the ORIGINAL CROSS-PARAGRAPH ANALYSIS and the requirements above.

For EACH requirement (1-3), check if it was met:
- If met: No warning needed
- If NOT met: Provide a specific warning explaining what requirement failed and what needs to be fixed

Return your response as a JSON array of warnings. If all requirements are met, return an empty array [].
Format: ["Warning 1: [specific requirement and issue]", "Warning 2: [specific requirement and issue]", ...]

Be specific and actionable in your warnings. Reference the actual paragraph content where possible.
"""
    
    try:
        response = llm.invoke([HumanMessage(content=validation_prompt)])
        content = response.content if hasattr(response, 'content') else str(response)
        
        # Parse warnings from LLM response
        warnings = []
        
        if isinstance(content, str):
            # Try to extract JSON array from response
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                try:
                    warnings = json.loads(json_match.group(0))
                    if not isinstance(warnings, list):
                        warnings = []
                except json.JSONDecodeError:
                    # If JSON parsing fails, try to extract warnings from text
                    # Look for list-like patterns
                    lines = content.split('\n')
                    for line in lines:
                        line = line.strip()
                        if line.startswith('-') or line.startswith('•') or (line.startswith('"') and line.endswith('"')):
                            # Extract warning text
                            warning = line.lstrip('-•"').rstrip('"').strip()
                            if warning:
                                warnings.append(warning)
            else:
                # If no JSON found, check if response indicates compliance
                content_lower = content.lower()
                if "compliant" in content_lower or "no issues" in content_lower or "all requirements met" in content_lower:
                    warnings = []
                elif "warning" in content_lower or "issue" in content_lower or "failed" in content_lower:
                    # Extract warnings from text format
                    lines = content.split('\n')
                    for line in lines:
                        if any(keyword in line.lower() for keyword in ['warning', 'issue', 'failed', 'not met', 'missing']):
                            warning = line.strip().lstrip('-•1234567890.').strip()
                            if warning and len(warning) > 10:  # Filter out very short lines
                                warnings.append(warning)
        
        if warnings:
            logger.info(f"Cross-paragraph validation found {len(warnings)} issues")
        else:
            logger.info("Cross-paragraph validation: All requirements met")
        
        return warnings if isinstance(warnings, list) else []
        
    except Exception as e:
        logger.error(f"Error validating cross-paragraph compliance: {e}")
        # Return empty list on error - don't block workflow
        return []


# ---------------------------------------------------------------------
# EDITOR NODES (EXECUTE EXACTLY ONCE)
# ---------------------------------------------------------------------
def development_editor_node(state: SupervisorState) -> SupervisorState:
    logger.info("RUNNING: development_editor_tool")
    
    article_analysis = state.get("article_analysis")
    result = run_editor_engine("development", state["document"].blocks, article_analysis)

    return {
        "editor_results": state["editor_results"] + [result]
    }


# ---------------------------------------------------------------------
# DEVELOPMENT EDITOR RETRY NODE
# ---------------------------------------------------------------------
def development_editor_retry_node(state: SupervisorState) -> SupervisorState:
    """Retry Development Editor using validation score and feedback to improve."""
    retry_count = state.get("dev_editor_retry_count", 0) + 1
    logger.info(f"RUNNING: development_editor_retry_node (attempt {retry_count})")
    
    article_analysis = state.get("article_analysis")
    validation_result = state.get("validation_result")
    validation_feedback = None
    validation_score = None
    
    if validation_result:
        if hasattr(validation_result, 'feedback_remarks'):
            validation_feedback = validation_result.feedback_remarks
        if hasattr(validation_result, 'score'):
            validation_score = validation_result.score
            logger.info(f"Using previous validation score: {validation_score}/10 to improve")
        
        if validation_feedback:
            failed_criteria = [fb for fb in validation_feedback if not fb.passed]
            passed_criteria = [fb for fb in validation_feedback if fb.passed]
            logger.info(f"Parsed validation feedback: {len(failed_criteria)} failed, {len(passed_criteria)} passed")
            
            if failed_criteria:
                logger.info("Failed criteria to address:")
                for i, fb in enumerate(failed_criteria[:3], 1):  # Show first 3
                    logger.info(f"  {i}. {fb.feedback[:80]}...")
        else:
            logger.info("No validation feedback found in previous result")
    else:
        logger.info("No previous validation result found in state")
    
    # Always use ORIGINAL document blocks for retry (not previously edited blocks)
    # This ensures each retry starts from the same baseline
    result = run_editor_engine(
        "development", 
        state["document"].blocks,  # Original blocks
        article_analysis,
        validation_feedback=validation_feedback,
        validation_score=validation_score
    )

    return {
        "editor_results": state["editor_results"] + [result],
        "dev_editor_retry_count": retry_count
    }


def content_editor_node(state: SupervisorState) -> SupervisorState:
    logger.info("RUNNING: content_editor_tool")
    
    # Get cross-paragraph analysis if available
    cross_paragraph_analysis = state.get("cross_paragraph_analysis")
    
    # Get validation feedback if retrying
    validation_result = state.get("content_validation_result")
    validation_feedback = None
    validation_score = None
    
    if validation_result:
        if hasattr(validation_result, 'feedback_remarks'):
            validation_feedback = validation_result.feedback_remarks
        if hasattr(validation_result, 'score'):
            validation_score = validation_result.score
            logger.info(f"Using previous validation score: {validation_score}/10 to improve")
        
        if validation_feedback:
            failed_count = sum(1 for fb in validation_feedback if not fb.passed)
            logger.info(f"Addressing {failed_count} failed validation criteria")
    
    # Run editor engine with cross-paragraph analysis and validation feedback
    result = run_editor_engine(
        "content", 
        state["document"].blocks, 
        cross_paragraph_analysis_text=cross_paragraph_analysis,
        validation_feedback=validation_feedback,
        validation_score=validation_score
    )

    return {
        "editor_results": state["editor_results"] + [result]
    }


# ---------------------------------------------------------------------
def content_editor_retry_node(state: SupervisorState) -> SupervisorState:
    """Retry Content Editor using validation score and feedback to improve."""
    retry_count = state.get("content_editor_retry_count", 0) + 1
    logger.info(f"RUNNING: content_editor_retry_node (attempt {retry_count})")
    
    cross_paragraph_analysis = state.get("cross_paragraph_analysis")
    validation_result = state.get("content_validation_result")
    validation_feedback = None
    validation_score = None
    
    if validation_result:
        if hasattr(validation_result, 'feedback_remarks'):
            validation_feedback = validation_result.feedback_remarks
        if hasattr(validation_result, 'score'):
            validation_score = validation_result.score
            logger.info(f"Using previous validation score: {validation_score}/10 to improve")
        
        if validation_feedback:
            failed_criteria = [fb for fb in validation_feedback if not fb.passed]
            passed_criteria = [fb for fb in validation_feedback if fb.passed]
            logger.info(f"Parsed validation feedback: {len(failed_criteria)} failed, {len(passed_criteria)} passed")
            
            if failed_criteria:
                logger.info("Failed criteria to address:")
                for i, fb in enumerate(failed_criteria[:3], 1):  # Show first 3
                    logger.info(f"  {i}. {fb.feedback[:80]}...")
        else:
            logger.info("No validation feedback found in previous result")
    else:
        logger.info("No previous validation result found in state")
    
    # Always use ORIGINAL document blocks for retry (not previously edited blocks)
    result = run_editor_engine(
        "content", 
        state["document"].blocks,  # Original blocks
        cross_paragraph_analysis_text=cross_paragraph_analysis,
        validation_feedback=validation_feedback,
        validation_score=validation_score
    )

    return {
        "editor_results": state["editor_results"] + [result],
        "content_editor_retry_count": retry_count
    }


def line_editor_node(state: SupervisorState) -> SupervisorState:
    logger.info("RUNNING: line_editor_tool")
    raw_blocks = line_editor_tool.invoke(
        {"blocks": state["document"].blocks}
    )

    result = normalize_editor_output("line", raw_blocks)

    return {
        "editor_results": state["editor_results"] + [result]
    }


def copy_editor_node(state: SupervisorState) -> SupervisorState:
    logger.info("RUNNING: copy_editor_tool")
    raw_blocks = copy_editor_tool.invoke(
        {"blocks": state["document"].blocks}
    )

    result = normalize_editor_output("copy", raw_blocks)

    return {
        "editor_results": state["editor_results"] + [result]
    }


def brand_editor_node(state: SupervisorState) -> SupervisorState:
    logger.info("RUNNING: brand_editor_tool")
    raw_blocks = brand_editor_tool.invoke(
        {"blocks": state["document"].blocks}
    )

    result = normalize_editor_output("brand-alignment", raw_blocks)

    return {
        "editor_results": state["editor_results"] + [result]
    }


# ---------------------------------------------------------------------
# MERGE TWO EDITOR RESULTS INTO ONE
# ---------------------------------------------------------------------
def merge_two_editor_results(
    result1: EditorResult,
    result2: EditorResult,
    combined_editor_type: str
) -> EditorResult:
    """Merge two EditorResult objects into one, combining feedback and suggestions."""
    logger.info(f"MERGING {result1.editor_type} + {result2.editor_type} into {combined_editor_type}")
    
    result1_blocks = {blk.id: blk for blk in result1.blocks}
    result2_blocks = {blk.id: blk for blk in result2.blocks}
    all_block_ids = set(result1_blocks.keys()) | set(result2_blocks.keys())
    
    merged_blocks = []
    for block_id in sorted(all_block_ids, key=lambda x: int(x[1:]) if x[1:].isdigit() else 999):
        blk1 = result1_blocks.get(block_id)
        blk2 = result2_blocks.get(block_id)
        
        original_text = blk1.original_text if blk1 else (blk2.original_text if blk2 else "")
        suggested_text = (blk2.suggested_text if blk2 and blk2.suggested_text 
                         else blk1.suggested_text if blk1 and blk1.suggested_text 
                         else original_text)
        
        combined_feedback = []
        if blk1 and blk1.feedback_edit:
            combined_feedback.extend(blk1.feedback_edit)
        if blk2 and blk2.feedback_edit:
            combined_feedback.extend(blk2.feedback_edit)
        
        merged_blocks.append(
            BlockEditResult(
                id=block_id,
                type=blk1.type if blk1 else (blk2.type if blk2 else "paragraph"),
                level=blk1.level if blk1 else (blk2.level if blk2 else 0),
                original_text=original_text,
                suggested_text=suggested_text,
                has_changes=suggested_text != original_text,
                feedback_edit=combined_feedback
            )
        )
    
    return EditorResult(
        editor_type=combined_editor_type,
        blocks=merged_blocks,
        warnings=list(result1.warnings) + list(result2.warnings),
        raw_output=None
    )


# ---------------------------------------------------------------------
# COMBINED EDITOR NODES (reuse existing nodes)
# ---------------------------------------------------------------------
def development_content_combined_node(state: SupervisorState) -> SupervisorState:
    """Run Development + Content editors together by reusing existing nodes."""
    logger.info("RUNNING: development_content_combined_node")
    
    original_results = state.get("editor_results", [])
    original_document = state["document"]  # Preserve original for validation
    
    # Run article analysis if needed
    if not state.get("article_analysis"):
        state = {**state, **article_analysis_node(state)}
    
    # Run Development Editor
    dev_state = development_editor_node(state)
    dev_result = dev_state["editor_results"][-1]
    
    # Validate Development Editor result using article_validation_node
    # Ensure original document is used for validation
    # IMPORTANT: dev_state must come last to preserve editor_results with development editor result
    validation_input_state = {
        **state,
        **dev_state,  # dev_state comes last to preserve editor_results (includes development editor result)
        "document": original_document  # Explicitly use original document
    }
    # Debug: Log editor_results to verify development editor result is present
    editor_results_count = len(validation_input_state.get("editor_results", []))
    validation_state = article_validation_node(validation_input_state)
    dev_state = {**dev_state, **validation_state}
    
    # Update document with Development's suggestions for Content Editor
    updated_doc = DocumentStructure(blocks=[
        DocumentBlock(id=b.id, type=b.type, level=b.level, 
                     text=b.suggested_text or b.original_text)
        for b in dev_result.blocks
    ])
    
    # Run cross-paragraph analysis if needed (using validated dev_result document)
    if not state.get("cross_paragraph_analysis"):
        analysis_state = cross_paragraph_analysis_node({"document": updated_doc, **state})
        state = {**state, **analysis_state}
    
    # Run Content Editor on updated document (with validation result and cross-paragraph analysis in state)
    content_state = content_editor_node({
        **dev_state,
        **state,
        "document": updated_doc  # Use updated document for Content Editor
    })
    content_result = content_state["editor_results"][-1]
    
    # Validate Content Editor result using content_validation_node
    # Ensure original document is used for validation (not updated_doc)
    # IMPORTANT: content_state must come last to preserve editor_results with content editor result
    content_validation_input_state = {
        **state,
        **content_state,  # content_state comes last to preserve editor_results (includes content editor result)
        "document": original_document  # Explicitly use original document for validation
    }
    # Debug: Log editor_results to verify content editor result is present
    editor_results_count = len(content_validation_input_state.get("editor_results", []))
    logger.info(f"Validating content editor: {editor_results_count} editor results in state")
    content_validation_state = content_validation_node(content_validation_input_state)
    content_state = {**content_state, **content_validation_state}
    
    # Merge results (after both validations)
    merged_result = merge_two_editor_results(dev_result, content_result, "development+content")
    
    return {
        "editor_results": original_results + [merged_result],
        "article_analysis": state.get("article_analysis"),
        "cross_paragraph_analysis": state.get("cross_paragraph_analysis")
    }


def line_copy_combined_node(state: SupervisorState) -> SupervisorState:
    """Run Line + Copy editors together by reusing existing nodes."""
    logger.info("RUNNING: line_copy_combined_node")
    
    original_results = state.get("editor_results", [])
    original_document = state["document"]  # Preserve original document
    
    # Run Line Editor
    line_state = line_editor_node(state)
    line_result = line_state["editor_results"][-1]
    
    # Run Copy Editor on ORIGINAL document (not Line Editor's updated document)
    copy_state = copy_editor_node({**line_state, "document": original_document})
    copy_result = copy_state["editor_results"][-1]
    
    # Merge results
    merged_result = merge_two_editor_results(line_result, copy_result, "line+copy")
    
    return {
        "editor_results": original_results + [merged_result]
    }


# ---------------------------------------------------------------------
# RESOLVE COMBINED EDITOR CONFLICTS (consolidate node via prompt)
# Used for development+content (content priority) and line+copy (line priority).
# ---------------------------------------------------------------------
def resolve_combined_editor_conflicts_node(state: SupervisorState) -> SupervisorState:
    """
    After merging two editors, call LLM with the appropriate prompt to resolve conflicts.
    development+content: Content editor takes priority on same span.
    line+copy: Line editor takes priority on same span.
    Replaces the last editor_result with the resolved result.
    """
    editor_results = state.get("editor_results", [])
    if not editor_results:
        return state
    last = editor_results[-1]
    combined_type = last.editor_type
    if combined_type == "development+content":
        resolve_prompt = DEVELOPMENT_CONTENT_RESOLVE_CONFLICTS_PROMPT
    elif combined_type == "line+copy":
        resolve_prompt = LINE_COPY_RESOLVE_CONFLICTS_PROMPT
    else:
        return state

    logger.info(f"RUNNING: resolve_combined_editor_conflicts_node ({combined_type})")
    merged_result = last
    blocks_by_id = {b.id: b for b in merged_result.blocks}

    input_blocks = []
    for b in merged_result.blocks:
        feedback_edit = [
            {"editor": sef.editor, "items": [item.model_dump() for item in sef.items]}
            for sef in (b.feedback_edit or [])
        ]
        input_blocks.append({
            "id": b.id,
            "original_text": b.original_text,
            "suggested_text": b.suggested_text or b.original_text,
            "feedback_edit": feedback_edit,
        })
    input_payload = {"blocks": input_blocks}
    prompt_text = f"""{resolve_prompt}

INPUT (merged feedback; resolve and return resolved feedback_edit per block):

{json.dumps(input_payload, indent=2)}
"""

    try:
        response = llm.invoke([HumanMessage(content=prompt_text)])
        raw = response.content if hasattr(response, "content") else str(response)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```\s*$", "", raw)
        data = json.loads(raw)
        resolved_blocks_data = data.get("blocks", [])
    except (json.JSONDecodeError, TypeError) as e:
        logger.warning(f"Resolve conflicts LLM output parse failed, keeping merged result: {e}")
        return state

    resolved_blocks = []
    for blk_data in resolved_blocks_data:
        block_id = blk_data.get("id")
        orig_block = blocks_by_id.get(block_id)
        if not orig_block:
            continue
        suggested_text = blk_data.get("suggested_text") or orig_block.original_text
        feedback_edit = []
        for sef_data in blk_data.get("feedback_edit", []):
            editor_name = sef_data.get("editor")
            items_data = sef_data.get("items", [])
            try:
                items = [FeedbackItem(**item) for item in items_data]
                feedback_edit.append(SingleEditorFeedback(editor=editor_name, items=items))
            except (TypeError, ValueError):
                continue
        resolved_blocks.append(
            BlockEditResult(
                id=orig_block.id,
                type=orig_block.type,
                level=orig_block.level,
                original_text=orig_block.original_text,
                suggested_text=suggested_text,
                has_changes=suggested_text != orig_block.original_text,
                feedback_edit=feedback_edit,
            )
        )

    resolved_result = EditorResult(
        editor_type=combined_type,
        blocks=resolved_blocks,
        warnings=list(merged_result.warnings),
        raw_output=None,
    )
    new_editor_results = list(editor_results[:-1]) + [resolved_result]
    return {"editor_results": new_editor_results}


# ---------------------------------------------------------------------
# ARTICLE-LEVEL ANALYSIS NODE (runs before Development Editor)
# ---------------------------------------------------------------------
def article_analysis_node(state: SupervisorState) -> SupervisorState:
    """Analyze article before Development Editor runs."""
    logger.info("RUNNING: article_analysis_node")
    
    analysis = analyze_article(state["document"])
    
    return {
        "article_analysis": analysis
    }


# ---------------------------------------------------------------------
# ARTICLE-LEVEL VALIDATION NODE (runs after Development Editor)
# ---------------------------------------------------------------------
def article_validation_node(state: SupervisorState) -> SupervisorState:
    """Validate Development Editor output and return score."""
    retry_count = state.get("dev_editor_retry_count", 0)
    attempt_label = "initial" if retry_count == 0 else f"retry {retry_count}"
    logger.info(f"RUNNING: article_validation_node ({attempt_label})")
    
    article_analysis_text = state.get("article_analysis") or ""
    editor_results = state.get("editor_results", [])
    
    dev_editor_result = None
    for result in reversed(editor_results):
        if result.editor_type == "development":
            dev_editor_result = result
            break
    
    if not dev_editor_result:
        logger.error("No Development Editor result found for validation")
        return {
            "validation_result": DevelopmentEditorValidationResult(
                score=0,
                feedback_remarks=[]
            )
        }
    
    validation_result = validate_development_editor(
        article_analysis_text,
        dev_editor_result,
        state["document"]
    )
    
    score = validation_result.score
    previous_score = None
    previous_validation = state.get("validation_result")
    if previous_validation and hasattr(previous_validation, 'score'):
        previous_score = previous_validation.score
    
    if previous_score is not None:
        score_change = score - previous_score
        change_indicator = "↑" if score_change > 0 else "↓" if score_change < 0 else "→"
        logger.info(f"Development Editor validation ({attempt_label}): score={score}/10 {change_indicator} (previous: {previous_score}/10, change: {score_change:+d})")
    else:
        logger.info(f"Development Editor validation ({attempt_label}): score={score}/10")
    
    return {
        "validation_result": validation_result
    }


# ---------------------------------------------------------------------
# CROSS-PARAGRAPH ANALYSIS NODE (runs before Content Editor)
# ---------------------------------------------------------------------
def cross_paragraph_analysis_node(state: SupervisorState) -> SupervisorState:
    """
    Analyze cross-paragraph logic before Content Editor runs.
    Stores analysis in state for use by Content Editor.
    """
    logger.info("RUNNING: cross_paragraph_analysis_node")
    
    analysis = analyze_cross_paragraph_logic(state["document"])
    
    return {
        "cross_paragraph_analysis": analysis
    }


# ---------------------------------------------------------------------
# CROSS-PARAGRAPH VALIDATION NODE (runs after Content Editor)
# ---------------------------------------------------------------------
def content_validation_node(state: SupervisorState) -> SupervisorState:
    """Validate Content Editor output and return score."""
    retry_count = state.get("content_editor_retry_count", 0)
    attempt_label = "initial" if retry_count == 0 else f"retry {retry_count}"
    logger.info(f"RUNNING: content_validation_node ({attempt_label})")
    
    cross_paragraph_analysis_text = state.get("cross_paragraph_analysis") or ""
    editor_results = state.get("editor_results", [])
    
    content_editor_result = None
    for result in reversed(editor_results):
        if result.editor_type == "content":
            content_editor_result = result
            break
    
    if not content_editor_result:
        logger.error("No Content Editor result found for validation")
        return {
            "content_validation_result": ContentEditorValidationResult(
                score=0,
                feedback_remarks=[]
            )
        }
    
    validation_result = validate_content_editor(
        cross_paragraph_analysis_text,
        content_editor_result,
        state["document"]
    )
    
    score = validation_result.score
    previous_score = None
    previous_validation = state.get("content_validation_result")
    if previous_validation and hasattr(previous_validation, 'score'):
        previous_score = previous_validation.score
    
    if previous_score is not None:
        score_change = score - previous_score
        change_indicator = "↑" if score_change > 0 else "↓" if score_change < 0 else "→"
        logger.info(f"Content Editor validation ({attempt_label}): score={score}/10 {change_indicator} (previous: {previous_score}/10, change: {score_change:+d})")
    else:
        logger.info(f"Content Editor validation ({attempt_label}): score={score}/10")
    
    return {
        "content_validation_result": validation_result
    }


def normalize_editor_output(
    editor_type: str,
    raw_output,
) -> EditorResult:
    """
    Normalize editor tool output into EditorResult.
    Handles:
      - JSON string
      - list[dict]
      - {"blocks": list[dict]}
    """

    # ---------------------------
    # Step 1: Parse JSON string
    # ---------------------------
    if isinstance(raw_output, str):
        try:
            raw_output = json.loads(raw_output)
        except json.JSONDecodeError as e:
            raise ValueError(
                f"{editor_type} editor returned invalid JSON"
            ) from e

    # ---------------------------
    # Step 2: Unwrap dict form
    # ---------------------------
    if isinstance(raw_output, dict):
        if "blocks" in raw_output:
            raw_blocks = raw_output["blocks"]
        else:
            raise TypeError(
                f"{editor_type} editor dict output missing 'blocks' key"
            )
    else:
        raw_blocks = raw_output

    # ---------------------------
    # Step 3: Validate list
    # ---------------------------
    if not isinstance(raw_blocks, list):
        raise TypeError(
            f"{editor_type} editor output must be a list of blocks, "
            f"got {type(raw_blocks)}"
        )

    # ---------------------------
    # Step 4: Convert to models
    # ---------------------------
    block_results = []
    for blk in raw_blocks:
        if not isinstance(blk, dict):
            raise TypeError(
                f"{editor_type} editor block must be dict, got {type(blk)}"
            )
        block_results.append(BlockEditResult(**blk))

    return EditorResult(
        editor_type=editor_type,
        blocks=block_results,
        warnings=[],
    )

# ---------------------------------------------------------------------
# MERGE NODE (FINAL STEP)
# ---------------------------------------------------------------------
def merge_node(state: SupervisorState) -> SupervisorState:
    logger.info("MERGING EDITOR RESULTS")
    # Keyed by block id to ensure true merging
    blocks_by_id: dict[str, ConsolidatedBlockEdit] = {}

    # Map incoming editor names to internal EditorFeedback attribute names
    editor_attr_map = {
        "development": "development",
        "content": "content",
        "copy": "copy",
        "line": "line",
        # external editor name maps to internal 'brand'
        "brand": "brand",
        "brand-alignment": "brand",
    }

    for editor in state.get("editor_results", []):
        for blk in editor.blocks:

            # Initialize consolidated block once
            if blk.id not in blocks_by_id:
                blocks_by_id[blk.id] = ConsolidatedBlockEdit(
                    id=blk.id,
                    type=blk.type,
                    level=blk.level,
                    original_text=blk.original_text,
                    final_text=blk.suggested_text or blk.original_text,
                    editorial_feedback=EditorFeedback(),
                )

            consolidated = blocks_by_id[blk.id]
            feedback = consolidated.editorial_feedback

            # If editor returned feedback, merge it
            if blk.feedback_edit:
                for sef in blk.feedback_edit:
                    attr = editor_attr_map.get(sef.editor)
                    if not attr:
                        # unknown editor, skip
                        continue
                    getattr(feedback, attr).extend(sef.items)

            # prefer explicit suggested_text as final text
            if blk.suggested_text:
                consolidated.final_text = blk.suggested_text

    final = ConsolidateResult(
        blocks=list(blocks_by_id.values())
    )
    return {"final_result": final}


# ---------------------------------------------------------------------
# SEQUENTIAL ROUTER (routes to single editor based on index)
# ---------------------------------------------------------------------
def route_sequential_editor(state: SupervisorState):
    """Route to current editor based on current_editor_index."""
    current_idx = state.get("current_editor_index", 0)
    selected_editors = state.get("selected_editors", [])
    
    if current_idx >= len(selected_editors):
        return "merge"
    
    editor_name = selected_editors[current_idx]
    
    # Handle combined editor types first
    if editor_name == "development+content":
        # Check if we've already run the combined node
        editor_results = state.get("editor_results", [])
        has_combined_result = any(r.editor_type == "development+content" for r in editor_results)
        
        if has_combined_result:
            # Already ran, proceed to merge
            return "merge"
        
        # Check if we need article analysis first
        article_analysis = state.get("article_analysis")
        if not article_analysis:
            return "article_analysis"
        
        # Analysis done, run combined node
        return "development_content_combined"
    
    if editor_name == "line+copy":
        # Check if we've already run the combined node
        editor_results = state.get("editor_results", [])
        has_combined_result = any(r.editor_type == "line+copy" for r in editor_results)
        
        if not has_combined_result:
            return "line_copy_combined"
        else:
            # Already ran, proceed to merge
            return "merge"
    
    # Handle individual editors (for backward compatibility)
    if editor_name == "development":
        article_analysis = state.get("article_analysis")
        editor_results = state.get("editor_results", [])
        has_dev_result = any(r.editor_type == "development" for r in editor_results)
        
        if not article_analysis and not has_dev_result:
            return "article_analysis"
        elif article_analysis and not has_dev_result:
            return "development_editor_tool"
        elif has_dev_result:
            return "article_validation"
    
    # Special handling for Content Editor: check if analysis needed
    if editor_name == "content":
        cross_paragraph_analysis = state.get("cross_paragraph_analysis")
        # Check if we just completed analysis (by checking if analysis exists but no editor results yet)
        editor_results = state.get("editor_results", [])
        has_content_result = any(r.editor_type == "content" for r in editor_results)
        
        if not cross_paragraph_analysis and not has_content_result:
            # Need to run analysis first
            logger.info("ROUTING TO CROSS-PARAGRAPH ANALYSIS (before Content Editor)")
            return "cross_paragraph_analysis"
        elif cross_paragraph_analysis and not has_content_result:
            # Analysis done, now run Content Editor
            logger.info("ROUTING TO CONTENT EDITOR (after analysis)")
            return "content_editor_tool"
        elif has_content_result:
            # Content Editor done, now validate
            logger.info("ROUTING TO CONTENT VALIDATION (after Content Editor)")
            return "content_validation"
    
    # Map editor name to node name for other editors
    editor_node_map = {
        "line": "line_editor_tool",
        "copy": "copy_editor_tool",
        "brand-alignment": "brand_editor_tool",
    }
    
    return editor_node_map.get(editor_name, "merge")


# ---------------------------------------------------------------------
# SEQUENTIAL MERGE NODE (merges only current editor result)
# ---------------------------------------------------------------------
def sequential_merge_node(state: SupervisorState) -> SupervisorState:
    """
    Merge only the current editor's result for sequential flow.
    Reuses existing merge_node logic but filters to current editor only.
    """
    logger.info("MERGING CURRENT EDITOR RESULT (SEQUENTIAL)")
    
    current_idx = state.get("current_editor_index", 0)
    editor_results = state.get("editor_results", [])
    
    if not editor_results:
        return {"final_result": None}
    
    # Get only the current editor's result (last one added)
    current_editor_result = editor_results[-1]
    
    # Create temporary state with only current editor for merging
    temp_state = {
        **state,
        "editor_results": [current_editor_result],  # Only current editor
    }
    
    # Reuse existing merge_node
    merged = merge_node(temp_state)
    
    return merged


# ---------------------------------------------------------------------
# ROUTER AFTER CONTENT VALIDATION
# ---------------------------------------------------------------------
def route_after_content_validation(state: SupervisorState) -> str:
    """After validation: retry if score < 8 (max 2 retries), else merge when score >= 8."""
    validation_result = state.get("content_validation_result")
    retry_count = state.get("content_editor_retry_count", 0)
    MAX_RETRIES = 2
    
    if validation_result:
        score = validation_result.score
        logger.info(f"Content validation score: {score}/10, Retry count: {retry_count}/{MAX_RETRIES}")
        
        # Merge if score >= 8 (passing threshold)
        if score >= 8:
            logger.info(f"Score {score} >= 8, proceeding to merge")
            return "merge"
        
        # Retry if score < 8 and retries remaining
        if retry_count < MAX_RETRIES:
            logger.info(f"Score {score} < 8, retrying (attempt {retry_count + 1}/{MAX_RETRIES})")
            return "content_editor_retry"
        else:
            logger.info(f"Score {score} < 8 but max retries ({MAX_RETRIES}) reached, proceeding to merge")
            return "merge"
    
    # No validation result, proceed to merge
    return "merge"


# ---------------------------------------------------------------------
# ROUTER AFTER VALIDATION
# ---------------------------------------------------------------------
def route_after_validation(state: SupervisorState) -> str:
    """After validation: retry if score < 8 (max 2 retries), else merge when score >= 8."""
    validation_result = state.get("validation_result")
    retry_count = state.get("dev_editor_retry_count", 0)
    MAX_RETRIES = 2
    
    if validation_result:
        score = validation_result.score
        logger.info(f"Validation score: {score}/10, Retry count: {retry_count}/{MAX_RETRIES}")
        
        # Merge if score >= 8 (passing threshold)
        if score >= 8:
            logger.info(f"Score {score} >= 8, proceeding to merge")
            return "merge"
        
        # Retry if score < 8 and retries remaining
        if retry_count < MAX_RETRIES:
            logger.info(f"Score {score} < 8, retrying (attempt {retry_count + 1}/{MAX_RETRIES})")
            return "development_editor_retry"
        else:
            logger.info(f"Score {score} < 8 but max retries ({MAX_RETRIES}) reached, proceeding to merge")
            return "merge"
    
    # No validation result, proceed to merge
    return "merge"


# ---------------------------------------------------------------------
# ROUTER FOR SEQUENTIAL FLOW (after merge)
# ---------------------------------------------------------------------
def route_sequential_after_merge(state: SupervisorState):
    """
    After merging current editor result, interrupt for user approval.
    """
    current_idx = state.get("current_editor_index", 0)
    selected_editors = state.get("selected_editors", [])
    
    if current_idx >= len(selected_editors):
        return "end"
    
    # Interrupt for user approval
    return "__interrupt__"


# ---------------------------------------------------------------------
# CUSTOM REDIS CHECKPOINTER (for multi-pod deployments)
# ---------------------------------------------------------------------
import pickle

class CustomRedisCheckpointer(BaseCheckpointSaver):
    """
    Custom Redis checkpointer that behaves EXACTLY like MemorySaver.
    Drop-in replacement for MemorySaver with Redis persistence.
    Uses pickle for serialization to preserve Python object types.
    """
    
    def __init__(self, redis_client: Redis, ttl_seconds: int = 86400):
        super().__init__()
        self.redis = redis_client
        self.ttl_seconds = ttl_seconds
        logger.info(f"CustomRedisCheckpointer initialized with TTL={ttl_seconds}s")
    
    def _make_redis_key(
        self, 
        thread_id: str, 
        checkpoint_ns: str = "", 
        checkpoint_id: Optional[str] = None,
        suffix: Optional[str] = None
    ) -> str:
        """Generate Redis key matching MemorySaver's internal key structure."""
        parts = ["checkpoint", thread_id, checkpoint_ns]
        parts.append(checkpoint_id if checkpoint_id else "latest")
        if suffix:
            parts.append(suffix)
        return ":".join(parts)
    
    def _parse_config(self, config: Optional[RunnableConfig]) -> Tuple[str, str, Optional[str]]:
        """Extract thread_id, checkpoint_ns, and checkpoint_id from config."""
        if not config:
            raise ValueError("Config is required")
        
        configurable = config.get("configurable", {})
        thread_id = configurable.get("thread_id")
        
        if not thread_id:
            raise ValueError("thread_id is required in config.configurable")
        
        checkpoint_ns = configurable.get("checkpoint_ns", "")
        checkpoint_id = configurable.get("checkpoint_id")
        
        return thread_id, checkpoint_ns, checkpoint_id
    
    def put(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: Optional[Dict[str, Any]] = None,
    ) -> RunnableConfig:
        """Save checkpoint to Redis. Matches MemorySaver.put() exactly."""
        try:
            thread_id, checkpoint_ns, _ = self._parse_config(config)
            
            # Generate checkpoint_id using microsecond timestamp (like MemorySaver)
            checkpoint_id = checkpoint.get("id")
            if not checkpoint_id:
                checkpoint_id = str(int(datetime.now(timezone.utc).timestamp() * 1_000_000))
            
            # Ensure checkpoint has the ID
            if isinstance(checkpoint, dict):
                checkpoint["id"] = checkpoint_id
            
            # Build parent_config if parent_checkpoint_id exists
            parent_config = None
            if metadata and metadata.get("parent_checkpoint_id"):
                parent_checkpoint_id = metadata["parent_checkpoint_id"]
                parent_config = {
                    "configurable": {
                        "thread_id": thread_id,
                        "checkpoint_ns": checkpoint_ns,
                        "checkpoint_id": parent_checkpoint_id
                    }
                }
            
            # pending_writes is always empty list - writes stored separately via put_writes()
            checkpoint_tuple_data = {
                "checkpoint": checkpoint,
                "metadata": metadata if metadata else {},
                "parent_config": parent_config,
                "pending_writes": []
            }
            
            # Store checkpoint data using pickle to preserve types
            checkpoint_key = self._make_redis_key(thread_id, checkpoint_ns, checkpoint_id)
            serialized = pickle.dumps(checkpoint_tuple_data)
            self.redis.setex(checkpoint_key, self.ttl_seconds, serialized)
            
            # Update "latest" pointer (store as string)
            latest_key = self._make_redis_key(thread_id, checkpoint_ns, None)
            self.redis.setex(latest_key, self.ttl_seconds, checkpoint_id.encode('utf-8'))
            
            # Add to sorted set for chronological listing
            list_key = self._make_redis_key(thread_id, checkpoint_ns, suffix="list")
            score = float(checkpoint_id) if checkpoint_id.replace('.', '', 1).isdigit() else 0
            self.redis.zadd(list_key, {checkpoint_id: score})
            self.redis.expire(list_key, self.ttl_seconds)
            
            logger.debug(f"Saved checkpoint: thread={thread_id}, ns={checkpoint_ns}, id={checkpoint_id}")
            
            # Return updated config
            return {
                "configurable": {
                    "thread_id": thread_id,
                    "checkpoint_ns": checkpoint_ns,
                    "checkpoint_id": checkpoint_id
                }
            }
            
        except Exception as e:
            logger.error(f"CustomRedisCheckpointer.put failed: {e}", exc_info=True)
            raise
    
    def get_tuple(self, config: RunnableConfig) -> Optional[CheckpointTuple]:
        """Retrieve checkpoint tuple from Redis. Matches MemorySaver.get_tuple() exactly."""
        try:
            thread_id, checkpoint_ns, checkpoint_id = self._parse_config(config)
            
            # If no checkpoint_id specified, get the latest one
            if not checkpoint_id:
                latest_key = self._make_redis_key(thread_id, checkpoint_ns, None)
                latest_checkpoint_id_bytes = self.redis.get(latest_key)
                
                if not latest_checkpoint_id_bytes:
                    logger.debug(f"No checkpoints found: thread={thread_id}, ns={checkpoint_ns}")
                    return None
                
                checkpoint_id = (
                    latest_checkpoint_id_bytes.decode('utf-8') 
                    if isinstance(latest_checkpoint_id_bytes, bytes) 
                    else latest_checkpoint_id_bytes
                )
            
            # Retrieve checkpoint data
            checkpoint_key = self._make_redis_key(thread_id, checkpoint_ns, checkpoint_id)
            data_bytes = self.redis.get(checkpoint_key)
            
            if not data_bytes:
                logger.debug(f"Checkpoint not found: {checkpoint_key}")
                return None
            
            # Deserialize using pickle to preserve types
            checkpoint_tuple_data = pickle.loads(data_bytes)
            
            # Load pending_writes from separate put_writes() calls
            pending_writes = []
            writes_pattern = self._make_redis_key(thread_id, checkpoint_ns, checkpoint_id, suffix="writes:*")
            
            # Get all write keys for this checkpoint
            write_keys = self.redis.keys(writes_pattern)
            for write_key_bytes in write_keys:
                write_key = write_key_bytes.decode('utf-8') if isinstance(write_key_bytes, bytes) else write_key_bytes
                write_data_bytes = self.redis.get(write_key)
                
                if write_data_bytes:
                    # Deserialize writes using pickle
                    write_data = pickle.loads(write_data_bytes)
                    
                    task_id = write_data.get("task_id")
                    writes_list = write_data.get("writes", [])
                    
                    # Convert to MemorySaver format: (task_id, channel, value)
                    for channel, value in writes_list:
                        pending_writes.append((task_id, channel, value))
            
            # Build config for this checkpoint
            current_config = {
                "configurable": {
                    "thread_id": thread_id,
                    "checkpoint_ns": checkpoint_ns,
                    "checkpoint_id": checkpoint_id
                }
            }
            
            # Return CheckpointTuple with pending_writes as list
            return CheckpointTuple(
                config=current_config,
                checkpoint=checkpoint_tuple_data["checkpoint"],
                metadata=checkpoint_tuple_data.get("metadata", {}),
                parent_config=checkpoint_tuple_data.get("parent_config"),
                pending_writes=pending_writes
            )
            
        except Exception as e:
            logger.error(f"CustomRedisCheckpointer.get_tuple failed: {e}", exc_info=True)
            return None
    
    def list(
        self,
        config: RunnableConfig,
        *,
        filter: Optional[Dict[str, Any]] = None,
        before: Optional[RunnableConfig] = None,
        limit: Optional[int] = None,
    ) -> Iterator[CheckpointTuple]:
        """List checkpoints in reverse chronological order. Matches MemorySaver.list() exactly."""
        try:
            thread_id, checkpoint_ns, _ = self._parse_config(config)
            
            list_key = self._make_redis_key(thread_id, checkpoint_ns, suffix="list")
            
            # Determine range for iteration
            max_score = "+inf"
            if before:
                before_checkpoint_id = before.get("configurable", {}).get("checkpoint_id")
                if before_checkpoint_id:
                    max_score = f"({before_checkpoint_id}"
            
            # Get checkpoint IDs in reverse chronological order
            checkpoint_ids = self.redis.zrevrangebyscore(
                list_key,
                max_score,
                "-inf",
                start=0,
                num=limit if limit else -1
            )
            
            if not checkpoint_ids:
                logger.debug(f"No checkpoints in list: thread={thread_id}, ns={checkpoint_ns}")
                return
            
            # Yield each checkpoint
            for checkpoint_id_bytes in checkpoint_ids:
                checkpoint_id = (
                    checkpoint_id_bytes.decode('utf-8') 
                    if isinstance(checkpoint_id_bytes, bytes) 
                    else checkpoint_id_bytes
                )
                
                checkpoint_key = self._make_redis_key(thread_id, checkpoint_ns, checkpoint_id)
                data_bytes = self.redis.get(checkpoint_key)
                
                if not data_bytes:
                    continue
                
                # Deserialize using pickle
                checkpoint_tuple_data = pickle.loads(data_bytes)
                
                # Apply metadata filter if provided
                if filter:
                    metadata = checkpoint_tuple_data.get("metadata", {})
                    if not all(metadata.get(k) == v for k, v in filter.items()):
                        continue
                
                # Load pending_writes for this checkpoint
                pending_writes = []
                writes_pattern = self._make_redis_key(thread_id, checkpoint_ns, checkpoint_id, suffix="writes:*")
                write_keys = self.redis.keys(writes_pattern)
                
                for write_key_bytes in write_keys:
                    write_key = write_key_bytes.decode('utf-8') if isinstance(write_key_bytes, bytes) else write_key_bytes
                    write_data_bytes = self.redis.get(write_key)
                    
                    if write_data_bytes:
                        # Deserialize using pickle
                        write_data = pickle.loads(write_data_bytes)
                        
                        task_id = write_data.get("task_id")
                        writes_list = write_data.get("writes", [])
                        
                        # Convert to MemorySaver format: (task_id, channel, value)
                        for channel, value in writes_list:
                            pending_writes.append((task_id, channel, value))
                
                current_config = {
                    "configurable": {
                        "thread_id": thread_id,
                        "checkpoint_ns": checkpoint_ns,
                        "checkpoint_id": checkpoint_id
                    }
                }
                
                yield CheckpointTuple(
                    config=current_config,
                    checkpoint=checkpoint_tuple_data["checkpoint"],
                    metadata=checkpoint_tuple_data.get("metadata", {}),
                    parent_config=checkpoint_tuple_data.get("parent_config"),
                    pending_writes=pending_writes
                )
                
        except Exception as e:
            logger.error(f"CustomRedisCheckpointer.list failed: {e}", exc_info=True)
    
    def put_writes(
        self,
        config: RunnableConfig,
        writes: Sequence[Tuple[str, Any]],
        task_id: str,
    ) -> None:
        """Save incremental writes to Redis. Matches MemorySaver.put_writes() exactly."""
        try:
            thread_id, checkpoint_ns, checkpoint_id = self._parse_config(config)
            
            # If no checkpoint_id, get the latest
            if not checkpoint_id:
                latest_key = self._make_redis_key(thread_id, checkpoint_ns, None)
                latest_checkpoint_id_bytes = self.redis.get(latest_key)
                
                if latest_checkpoint_id_bytes:
                    checkpoint_id = (
                        latest_checkpoint_id_bytes.decode('utf-8') 
                        if isinstance(latest_checkpoint_id_bytes, bytes) 
                        else latest_checkpoint_id_bytes
                    )
                else:
                    checkpoint_id = str(int(datetime.now(timezone.utc).timestamp() * 1_000_000))
            
            # Store writes
            writes_key = self._make_redis_key(
                thread_id, 
                checkpoint_ns, 
                checkpoint_id, 
                suffix=f"writes:{task_id}"
            )
            
            # Store writes data using pickle to preserve types
            writes_data = {
                "writes": [[channel, value] for channel, value in writes],
                "task_id": task_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            serialized = pickle.dumps(writes_data)
            self.redis.setex(writes_key, self.ttl_seconds, serialized)
            
            logger.debug(f"Saved writes: thread={thread_id}, checkpoint={checkpoint_id}, task={task_id}")
            
        except Exception as e:
            logger.error(f"CustomRedisCheckpointer.put_writes failed: {e}", exc_info=True)
# ---------------------------------------------------------------------
# SHARED CHECKPOINTER FOR SEQUENTIAL GRAPH
# ---------------------------------------------------------------------
# IMPORTANT: Use a single shared checkpointer instance so state persists
# across multiple graph instances AND multiple pods (initial request and /next requests)

if config.APP_ENV == "local":
    _sequential_checkpointer = MemorySaver()
    logger.info("Using MemorySaver for local development")
else:
    try:
        redis_client = Redis(
            host=config.REDIS_HOST,
            port=config.REDIS_PORT,
            password=config.REDIS_PASSWORD,
            ssl=True,
            decode_responses=False
        )
        # Test connection with PING
        redis_client.ping()
        logger.info(f"Redis connection successful: {config.REDIS_HOST}:{config.REDIS_PORT}")
        
        # Use custom checkpointer that doesn't require JSON module
        _sequential_checkpointer = CustomRedisCheckpointer(
            redis_client=redis_client,
            ttl_seconds=86400  # 24 hour TTL
        )
        logger.info("Using CustomRedisCheckpointer for multi-pod deployment")
        
    except Exception as e:
        logger.error(f"Redis connection failed: {e}")
        logger.warning("FALLBACK: Using MemorySaver - state will NOT persist across pod restarts")
        _sequential_checkpointer = MemorySaver()


# ---------------------------------------------------------------------
# BUILD SEQUENTIAL GRAPH (reuses existing graph nodes)
# ---------------------------------------------------------------------
def build_sequential_graph():
    """
    Build a sequential graph that runs editors one at a time with interrupts.
    REUSES all existing editor nodes, merge_node, and graph structure.
    
    Flow:
    1. route_sequential_editor -> routes to current editor node
    2. editor node -> runs current editor (reuses existing editor nodes)
    3. sequential_merge_node -> merges only current editor result
    4. route_sequential_after_merge -> interrupts for user approval
    5. Resume -> continues to next editor (when state updated externally)
    
    NOTE: All graph instances share the same checkpointer (_sequential_checkpointer)
    to ensure state persistence across requests.
    """
    graph = StateGraph(SupervisorState)
    
    # ---------------------------------------------------------------------
    # ADD NODES (organized by category)
    # ---------------------------------------------------------------------
    
    # Analysis nodes (run before editors)
    graph.add_node("article_analysis", article_analysis_node)
    graph.add_node("cross_paragraph_analysis", cross_paragraph_analysis_node)
    
    # Individual editor nodes
    graph.add_node("development_editor_tool", development_editor_node)
    graph.add_node("development_editor_retry", development_editor_retry_node)
    graph.add_node("content_editor_tool", content_editor_node)
    graph.add_node("content_editor_retry", content_editor_retry_node)
    graph.add_node("line_editor_tool", line_editor_node)
    graph.add_node("copy_editor_tool", copy_editor_node)
    graph.add_node("brand_editor_tool", brand_editor_node)
    
    # Combined editor nodes
    graph.add_node("development_content_combined", development_content_combined_node)
    graph.add_node("line_copy_combined", line_copy_combined_node)
    graph.add_node("resolve_combined_editor_conflicts", resolve_combined_editor_conflicts_node)
    
    # Validation nodes (run after editors)
    graph.add_node("article_validation", article_validation_node)
    graph.add_node("content_validation", content_validation_node)
    
    # Merge node (final step)
    graph.add_node("merge", sequential_merge_node)
    
    # ---------------------------------------------------------------------
    # SET CONDITIONAL ENTRY POINT (routes to appropriate node)
    # ---------------------------------------------------------------------
    graph.set_conditional_entry_point(
        route_sequential_editor,
        {
            # Analysis nodes
            "article_analysis": "article_analysis",
            "cross_paragraph_analysis": "cross_paragraph_analysis",
            
            # Individual editor nodes
            "development_editor_tool": "development_editor_tool",
            "development_editor_retry": "development_editor_retry",
            "content_editor_tool": "content_editor_tool",
            "content_editor_retry": "content_editor_retry",
            "line_editor_tool": "line_editor_tool",
            "copy_editor_tool": "copy_editor_tool",
            "brand_editor_tool": "brand_editor_tool",
            
            # Combined editor nodes
            "development_content_combined": "development_content_combined",
            "line_copy_combined": "line_copy_combined",
            
            # Validation nodes
            "article_validation": "article_validation",
            "content_validation": "content_validation",
            
            # Merge node
            "merge": "merge",
        }
    )
    
    # Article analysis routes conditionally based on editor type
    graph.add_conditional_edges(
        "article_analysis",
        route_sequential_editor,
        {
            "development_editor_tool": "development_editor_tool",
            "development_content_combined": "development_content_combined",
            "merge": "merge"
        }
    )
    graph.add_edge("development_editor_tool", "article_validation")
    
    # Combined editors: run -> same resolve node (prompt) -> merge
    graph.add_edge("development_content_combined", "resolve_combined_editor_conflicts")
    graph.add_edge("line_copy_combined", "resolve_combined_editor_conflicts")
    graph.add_edge("resolve_combined_editor_conflicts", "merge")
    
    graph.add_conditional_edges(
        "article_validation",
        route_after_validation,
        {
            "development_editor_retry": "development_editor_retry",
            "merge": "merge"
        }
    )
    
    graph.add_edge("development_editor_retry", "article_validation")
    
    graph.add_edge("cross_paragraph_analysis", "content_editor_tool")
    graph.add_edge("content_editor_tool", "content_validation")
    
    graph.add_conditional_edges(
        "content_validation",
        route_after_content_validation,
        {
            "content_editor_retry": "content_editor_retry",
            "merge": "merge"
        }
    )
    
    graph.add_edge("content_editor_retry", "content_validation")
    
    for node in ["line_editor_tool", "copy_editor_tool", "brand_editor_tool"]:
        graph.add_edge(node, "merge")
    
    return graph.compile(checkpointer=_sequential_checkpointer, interrupt_after=["merge"]) 
