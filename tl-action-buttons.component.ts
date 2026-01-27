from typing import TypedDict, List, Optional, Annotated
import operator
import json
import re
from langgraph.graph import StateGraph
from langchain_core.messages import BaseMessage, HumanMessage
from langgraph.checkpoint.memory import MemorySaver
from app.core.deps import get_llm_client_agent
import logging

from .schema import (
    DocumentStructure,
    EditorResult,
    ConsolidateResult,
    ConsolidatedBlockEdit,
    BlockEditResult,
    EditorFeedback,
    DevelopmentEditorValidationResult
)

from .tools import (
    development_editor_tool,
    content_editor_tool,
    line_editor_tool,
    copy_editor_tool,
    brand_editor_tool,
    run_editor_engine,
    validate_development_editor,
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
    dev_editor_retry_count: Optional[int]  # Retry count for Development Editor (retries until score >= 8, max 5 retries)
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
            logger.warning("Article analysis returned empty response")
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
            logger.warning("Cross-paragraph analysis returned empty response")
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
        logger.warning("No original cross-paragraph analysis text available for validation")
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
            logger.warning(f"Cross-paragraph validation found {len(warnings)} issues")
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
    """Retry Development Editor using validation feedback to improve."""
    logger.info("RUNNING: development_editor_retry_node")
    
    article_analysis = state.get("article_analysis")
    validation_result = state.get("validation_result")
    validation_feedback = None
    
    if validation_result and hasattr(validation_result, 'feedback_remarks'):
        validation_feedback = validation_result.feedback_remarks
    
    result = run_editor_engine(
        "development", 
        state["document"].blocks, 
        article_analysis,
        validation_feedback=validation_feedback
    )
    retry_count = state.get("dev_editor_retry_count", 0) + 1

    return {
        "editor_results": state["editor_results"] + [result],
        "dev_editor_retry_count": retry_count
    }


def content_editor_node(state: SupervisorState) -> SupervisorState:
    logger.info("RUNNING: content_editor_tool")
    
    # Get cross-paragraph analysis if available
    cross_paragraph_analysis = state.get("cross_paragraph_analysis")
    
    # Run editor engine with cross-paragraph analysis
    result = run_editor_engine("content", state["document"].blocks, cross_paragraph_analysis_text=cross_paragraph_analysis)

    return {
        "editor_results": state["editor_results"] + [result]
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
    logger.info("RUNNING: article_validation_node")
    
    article_analysis_text = state.get("article_analysis")
    editor_results = state.get("editor_results", [])
    
    dev_editor_result = None
    for result in reversed(editor_results):
        if result.editor_type == "development":
            dev_editor_result = result
            break
    
    validation_result = validate_development_editor(
        article_analysis_text,
        dev_editor_result,
        state["document"]
    )
    
    logger.info(f"Development Editor validation: score={validation_result.score}")
    
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
def cross_paragraph_validation_node(state: SupervisorState) -> SupervisorState:
    """
    Validate that Content Editor output meets cross-paragraph enforcement requirements using LLM.
    Adds validation warnings to the editor result if non-compliant.
    """
    logger.info("RUNNING: cross_paragraph_validation_node")
    
    cross_paragraph_analysis_text = state.get("cross_paragraph_analysis")
    if not cross_paragraph_analysis_text or not cross_paragraph_analysis_text.strip():
        logger.warning("No cross-paragraph analysis text found for validation")
        return {}
    
    editor_results = state.get("editor_results", [])
    if not editor_results:
        logger.warning("No editor results found for validation")
        return {}
    
    # Find Content Editor result (should be the last one)
    content_editor_result = None
    for result in reversed(editor_results):
        if result.editor_type == "content":
            content_editor_result = result
            break
    
    if not content_editor_result:
        logger.warning("Content Editor result not found for validation")
        return {}
    
    # Validate compliance using LLM
    warnings = validate_cross_paragraph_compliance(
        cross_paragraph_analysis_text,
        content_editor_result,
        state["document"]
    )
    
    # Add warnings to the Content Editor result
    if warnings:
        content_editor_result.warnings.extend(warnings)
        logger.warning(f"Cross-paragraph validation found {len(warnings)} issues: {warnings}")
    else:
        logger.info("Cross-paragraph validation: All requirements met")
    
    # Update the editor result in state
    updated_results = []
    for result in editor_results:
        if result.editor_type == "content":
            updated_results.append(content_editor_result)
        else:
            updated_results.append(result)
    
    return {
        "editor_results": updated_results
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
            logger.info("ROUTING TO CROSS-PARAGRAPH VALIDATION (after Content Editor)")
            return "cross_paragraph_validation"
    
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
# ROUTER AFTER VALIDATION
# ---------------------------------------------------------------------
def route_after_validation(state: SupervisorState) -> str:
    """After validation: retry if score < 8 (max 5 retries), else merge."""
    validation_result = state.get("validation_result")
    retry_count = state.get("dev_editor_retry_count", 0)
    MAX_RETRIES = 5
    
    if validation_result and validation_result.score < 8 and retry_count < MAX_RETRIES:
        return "development_editor_retry"
    
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
# SHARED CHECKPOINTER FOR SEQUENTIAL GRAPH
# ---------------------------------------------------------------------
# IMPORTANT: Use a single shared checkpointer instance so state persists
# across multiple graph instances (initial request and /next requests)
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
    
    graph.add_node("development_editor_tool", development_editor_node)
    graph.add_node("development_editor_retry", development_editor_retry_node)
    graph.add_node("content_editor_tool", content_editor_node)
    graph.add_node("line_editor_tool", line_editor_node)
    graph.add_node("copy_editor_tool", copy_editor_node)
    graph.add_node("brand_editor_tool", brand_editor_node)
    graph.add_node("article_analysis", article_analysis_node)
    graph.add_node("article_validation", article_validation_node)
    graph.add_node("cross_paragraph_analysis", cross_paragraph_analysis_node)
    graph.add_node("cross_paragraph_validation", cross_paragraph_validation_node)
    graph.add_node("merge", sequential_merge_node)
    
    # Set entry point - use conditional routing directly
    graph.set_conditional_entry_point(
        route_sequential_editor,
        {
            "development_editor_tool": "development_editor_tool",
            "development_editor_retry": "development_editor_retry",
            "content_editor_tool": "content_editor_tool",
            "line_editor_tool": "line_editor_tool",
            "copy_editor_tool": "copy_editor_tool",
            "brand_editor_tool": "brand_editor_tool",
            "article_analysis": "article_analysis",
            "article_validation": "article_validation",
            "cross_paragraph_analysis": "cross_paragraph_analysis",
            "cross_paragraph_validation": "cross_paragraph_validation",
            "merge": "merge",  # All editors done
        }
    )
    
    graph.add_edge("article_analysis", "development_editor_tool")
    graph.add_edge("development_editor_tool", "article_validation")
    
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
    graph.add_edge("content_editor_tool", "cross_paragraph_validation")
    graph.add_edge("cross_paragraph_validation", "merge")
    
    for node in ["line_editor_tool", "copy_editor_tool", "brand_editor_tool"]:
        graph.add_edge(node, "merge")
    
    return graph.compile(checkpointer=_sequential_checkpointer, interrupt_after=["merge"]) 
