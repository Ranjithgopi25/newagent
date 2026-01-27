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
    ArticleAnalysis
)

from .tools import (
    development_editor_tool,
    content_editor_tool,
    line_editor_tool,
    copy_editor_tool,
    brand_editor_tool,
    run_editor_engine,
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
    article_analysis: Optional[ArticleAnalysis]  # Article-level analysis for Development Editor


# ---------------------------------------------------------------------
# ARTICLE-LEVEL ANALYSIS AND VALIDATION HELPERS
# ---------------------------------------------------------------------
def analyze_article(document: DocumentStructure) -> ArticleAnalysis:
    """
    Analyze the entire article to extract article-level metadata.
    This provides context for the Development Editor to enforce article-level requirements.
    """
    logger.info("ANALYZING ARTICLE FOR DEVELOPMENT EDITOR")
    
    # Calculate article length
    full_text = " ".join([block.text for block in document.blocks])
    word_count = len(full_text.split())
    
    # Count sections (headings)
    section_count = sum(1 for block in document.blocks if block.type == "heading")
    
    # Create analysis prompt
    analysis_prompt = f"""Analyze the following article and extract article-level metadata.

ARTICLE:
{full_text}

Provide a JSON response with:
1. central_argument: The article's central argument in ONE clear, assertive sentence
2. primary_pov: The primary point of view (e.g., "advisor/collaborator", "observer", "analyst")
3. repetition_patterns: List of core ideas/concepts that appear in multiple sections (be specific)
4. has_redundancy: true/false - whether the article has redundant or repetitive content

Return ONLY valid JSON in this format:
{{
  "central_argument": "...",
  "primary_pov": "...",
  "repetition_patterns": ["...", "..."],
  "has_redundancy": true/false
}}
"""
    
    try:
        response = llm.invoke([HumanMessage(content=analysis_prompt)])
        content = response.content if hasattr(response, 'content') else str(response)
        
        # Parse JSON from response
        if isinstance(content, str):
            # Try to extract JSON from markdown code blocks if present
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                content = json_match.group(0)
            
            analysis_data = json.loads(content)
        else:
            analysis_data = content
        
        return ArticleAnalysis(
            central_argument=analysis_data.get("central_argument", "Not identified"),
            primary_pov=analysis_data.get("primary_pov", "Not identified"),
            repetition_patterns=analysis_data.get("repetition_patterns", []),
            original_length=word_count,
            section_count=section_count,
            has_redundancy=analysis_data.get("has_redundancy", False)
        )
    except Exception as e:
        logger.error(f"Error analyzing article: {e}")
        # Return default analysis on error
        return ArticleAnalysis(
            central_argument="Analysis unavailable",
            primary_pov="Not identified",
            repetition_patterns=[],
            original_length=word_count,
            section_count=section_count,
            has_redundancy=False
        )


def validate_article_compliance(
    original_analysis: ArticleAnalysis,
    edited_result: EditorResult,
    original_document: DocumentStructure
) -> List[str]:
    """
    Validate that Development Editor output meets article-level requirements.
    Returns list of validation warnings (empty if compliant).
    """
    logger.info("VALIDATING ARTICLE-LEVEL COMPLIANCE")
    warnings = []
    
    # Calculate edited article length
    edited_text = " ".join([
        block.suggested_text or block.original_text 
        for block in edited_result.blocks
    ])
    edited_word_count = len(edited_text.split())
    
    # Check 1: Article length reduction (if redundancy existed)
    if original_analysis.has_redundancy:
        reduction_percent = ((original_analysis.original_length - edited_word_count) / 
                            original_analysis.original_length * 100) if original_analysis.original_length > 0 else 0
        if reduction_percent < 5:  # Less than 5% reduction
            warnings.append(
                f"Article length reduction insufficient: Only {reduction_percent:.1f}% reduction "
                f"({original_analysis.original_length} → {edited_word_count} words). "
                "Expected visible reduction due to redundancy elimination."
            )
    
    # Check 2: Central argument visibility (check if it appears in introduction)
    intro_blocks = [b for b in edited_result.blocks[:5] if b.type in ["paragraph", "heading"]]
    intro_text = " ".join([b.suggested_text or b.original_text for b in intro_blocks]).lower()
    central_arg_lower = original_analysis.central_argument.lower()
    
    # Check if key terms from central argument appear in introduction
    key_terms = [word for word in central_arg_lower.split() if len(word) > 4]
    if key_terms:
        matches = sum(1 for term in key_terms if term in intro_text)
        if matches < len(key_terms) * 0.3:  # Less than 30% of key terms
            warnings.append(
                "Central argument may not be clearly visible in introduction. "
                "Ensure the central argument is explicitly stated early in the article."
            )
    
    # Check 3: Repetition patterns - verify they were addressed
    if original_analysis.repetition_patterns:
        edited_full_text = edited_text.lower()
        still_repeated = []
        for pattern in original_analysis.repetition_patterns[:3]:  # Check first 3 patterns
            pattern_lower = pattern.lower()
            # Count occurrences in edited text
            count = edited_full_text.count(pattern_lower)
            if count > 2:  # Still appears more than twice
                still_repeated.append(pattern)
        
        if still_repeated:
            warnings.append(
                f"Repetition patterns may not be fully addressed: {', '.join(still_repeated[:2])}. "
                "Ensure repeated concepts are consolidated or removed."
            )
    
    return warnings


# ---------------------------------------------------------------------
# EDITOR NODES (EXECUTE EXACTLY ONCE)
# ---------------------------------------------------------------------
def development_editor_node(state: SupervisorState) -> SupervisorState:
    logger.info("RUNNING: development_editor_tool")
    
    # Get article analysis if available
    article_analysis = state.get("article_analysis")
    
    # Run editor engine with article analysis
    result = run_editor_engine("development", state["document"].blocks, article_analysis)

    return {
        "editor_results": state["editor_results"] + [result]
    }


def content_editor_node(state: SupervisorState) -> SupervisorState:
    logger.info("RUNNING: content_editor_tool")
    raw_blocks = content_editor_tool.invoke(
        {"blocks": state["document"].blocks}
    )

    result = normalize_editor_output("content", raw_blocks)

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
    """
    Analyze the article before Development Editor runs.
    Stores analysis in state for use by Development Editor.
    """
    logger.info("RUNNING: article_analysis_node")
    
    analysis = analyze_article(state["document"])
    
    return {
        "article_analysis": analysis
    }


# ---------------------------------------------------------------------
# ARTICLE-LEVEL VALIDATION NODE (runs after Development Editor)
# ---------------------------------------------------------------------
def article_validation_node(state: SupervisorState) -> SupervisorState:
    """
    Validate that Development Editor output meets article-level requirements.
    Adds validation warnings to the editor result if non-compliant.
    """
    logger.info("RUNNING: article_validation_node")
    
    article_analysis = state.get("article_analysis")
    if not article_analysis:
        logger.warning("No article analysis found for validation")
        return {}
    
    editor_results = state.get("editor_results", [])
    if not editor_results:
        logger.warning("No editor results found for validation")
        return {}
    
    # Find Development Editor result (should be the last one)
    dev_editor_result = None
    for result in reversed(editor_results):
        if result.editor_type == "development":
            dev_editor_result = result
            break
    
    if not dev_editor_result:
        logger.warning("Development Editor result not found for validation")
        return {}
    
    # Validate compliance
    warnings = validate_article_compliance(
        article_analysis,
        dev_editor_result,
        state["document"]
    )
    
    # Add warnings to the Development Editor result
    if warnings:
        dev_editor_result.warnings.extend(warnings)
        logger.warning(f"Article-level validation found {len(warnings)} issues")
    
    # Update the editor result in state
    updated_results = []
    for result in editor_results:
        if result.editor_type == "development":
            updated_results.append(dev_editor_result)
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
    """
    Route to the current editor based on current_editor_index.
    Used for sequential execution mode.
    
    Special handling for Development Editor:
    - If Development Editor is next and no analysis exists: route to article_analysis_node
    - After analysis: route to development_editor_tool
    - After Development Editor: route to article_validation_node
    """
    current_idx = state.get("current_editor_index", 0)
    selected_editors = state.get("selected_editors", [])
    
    if current_idx >= len(selected_editors):
        return "merge"  # All editors done, go to merge
    
    editor_name = selected_editors[current_idx]
    logger.info(f"ROUTING TO SEQUENTIAL EDITOR: {editor_name} (index {current_idx})")
    
    # Special handling for Development Editor: check if analysis needed
    if editor_name == "development":
        article_analysis = state.get("article_analysis")
        # Check if we just completed analysis (by checking if analysis exists but no editor results yet)
        editor_results = state.get("editor_results", [])
        has_dev_result = any(r.editor_type == "development" for r in editor_results)
        
        if not article_analysis and not has_dev_result:
            # Need to run analysis first
            logger.info("ROUTING TO ARTICLE ANALYSIS (before Development Editor)")
            return "article_analysis"
        elif article_analysis and not has_dev_result:
            # Analysis done, now run Development Editor
            logger.info("ROUTING TO DEVELOPMENT EDITOR (after analysis)")
            return "development_editor_tool"
        elif has_dev_result:
            # Development Editor done, now validate
            logger.info("ROUTING TO ARTICLE VALIDATION (after Development Editor)")
            return "article_validation"
    
    # Map editor name to node name for other editors
    editor_node_map = {
        "content": "content_editor_tool",
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
    
    # REUSE existing nodes
    graph.add_node("development_editor_tool", development_editor_node)
    graph.add_node("content_editor_tool", content_editor_node)
    graph.add_node("line_editor_tool", line_editor_node)
    graph.add_node("copy_editor_tool", copy_editor_node)
    graph.add_node("brand_editor_tool", brand_editor_node)
    graph.add_node("article_analysis", article_analysis_node)  # Article analysis before Development Editor
    graph.add_node("article_validation", article_validation_node)  # Article validation after Development Editor
    graph.add_node("merge", sequential_merge_node)  # Sequential merge (filters to current editor)
    
    # Set entry point - use conditional routing directly
    graph.set_conditional_entry_point(
        route_sequential_editor,
        {
            "development_editor_tool": "development_editor_tool",
            "content_editor_tool": "content_editor_tool",
            "line_editor_tool": "line_editor_tool",
            "copy_editor_tool": "copy_editor_tool",
            "brand_editor_tool": "brand_editor_tool",
            "article_analysis": "article_analysis",
            "article_validation": "article_validation",
            "merge": "merge",  # All editors done
        }
    )
    
    # Article analysis goes to Development Editor
    graph.add_edge("article_analysis", "development_editor_tool")
    
    # Development Editor goes to validation
    graph.add_edge("development_editor_tool", "article_validation")
    
    # Article validation goes to merge
    graph.add_edge("article_validation", "merge")
    
    # All other editor nodes go to merge
    for node in [
        "content_editor_tool",
        "line_editor_tool",
        "copy_editor_tool",
        "brand_editor_tool",
    ]:
        graph.add_edge(node, "merge")
    
    # Compile with SHARED checkpointer and request an interrupt after merge
    return graph.compile(checkpointer=_sequential_checkpointer, interrupt_after=["merge"]) 
