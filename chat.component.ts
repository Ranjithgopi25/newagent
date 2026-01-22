# ============================================================
# LangGraph orchestration for Refine Content
# ============================================================

from typing import Optional, Dict, Any, List, Literal
from pydantic import BaseModel, Field
import json
import logging

from langgraph.graph import StateGraph, END
from langchain_core.runnables import RunnableConfig

from app.utils.market_intelligence_agent.graph import get_market_insights
from app.features.thought_leadership.services.refine_content.prompt import (
    build_suggestions_prompt,
    build_tone_prompt,
    build_expansion_prompt,
    build_compression_prompt,
    build_research_enrich_prompt,
    build_edit_prompt,
    word_count,
)

logger = logging.getLogger(__name__)


# ============================================================
# STATE
# ============================================================

class RefineGraphState(BaseModel):
    original_content: str
    services: Dict[str, Any]

    # flags
    is_expand: bool = False
    is_compress: bool = False
    apply_tone: bool = False
    apply_research: bool = False
    apply_edit: bool = False
    editors: Optional[List] = None
    apply_suggestions: bool = False
    trim_applied: bool = False

    tone: Optional[str] = None

    # targets
    hard_target_word_count: Optional[int] = None
    ideal_word_count: Optional[int] = None

    # validation band (absolute)
    min_allowed_word_count: Optional[int] = None
    max_allowed_word_count: Optional[int] = None

    # reference
    original_word_count: Optional[int] = None

    # content
    cleaned_content: Optional[str] = None
    grown_content: Optional[str] = None
    final_output: Optional[str] = None
    suggestions: Optional[str] = None

    # context
    market_insights: Optional[str] = None
    expand_supporting_doc: Optional[str] = None
    supporting_doc_instructions: Optional[str] = None


    # metrics
    current_word_count: Optional[int] = None
    retry_count: int = 0
    max_retries: int = 3

    # control
    next_step: Optional[
        Literal[
            "SEMANTIC_CLEAN",
            "MARKET_INSIGHTS",
            "RESEARCH_ENRICH",
            "EXPAND_GROW",
            "TONE_ADJUST",
            "EDIT_SEQUENCE",
            "EXPAND_TRIM",
            "COMPRESS_ENFORCE",
            "VALIDATE",
            "SUGGESTIONS_ONLY",
            "COMPLETE",
            "FAIL",
        ]
    ] = "SEMANTIC_CLEAN"

    warnings: List[str] = Field(default_factory=list)

    class Config:
        extra = "forbid"


# ============================================================
# HELPERS
# ============================================================

def _latest_text(state: RefineGraphState) -> str:
    return (
        state.final_output
        or state.grown_content
        or state.cleaned_content
        or state.original_content
    )


# ============================================================
# PLANNER
# ============================================================

def planner_node(state: RefineGraphState):
    logger.info("[PLANNER] Starting")

    services = state.services or {}
    input_wc = word_count(state.original_content)
    raw_target = services.get("requested_word_limit")

    suggestions_only = services.get("suggestions") is True
    tone = services.get("audience_tone")
    apply_tone = bool(services.get("tone") and isinstance(tone, str) and tone.strip())
    is_expand = bool(services.get("is_expand"))

    min_wc = None
    max_wc = None
    hard_target = None
    ideal_wc = None

    if raw_target:
        target_wc = int(raw_target)
        delta = abs(target_wc - input_wc)

        tolerance = int(delta * 0.15)

        if target_wc > input_wc:  # EXPAND
            min_wc = input_wc + (delta - tolerance)
            max_wc = input_wc + (delta + tolerance)
        else:  # COMPRESS
            min_wc = input_wc - (delta + tolerance)
            max_wc = input_wc - (delta - tolerance)

        hard_target = target_wc
        
        # Calculate ideal_wc after min_wc and max_wc are set
        if min_wc is not None and max_wc is not None:
            ideal_wc = int((min_wc + max_wc) / 2)
        elif hard_target is not None:
            ideal_wc = hard_target

    # ------------------------------------
    # Suggestions-only (exclusive)
    # ------------------------------------
    if suggestions_only and not any(
        [services.get("is_expand"), services.get("tone"), services.get("research"), services.get("edit")]
    ):
        logger.info("[PLANNER] Suggestions-only mode")
        return {
            "apply_suggestions": True,
            "next_step": "SEMANTIC_CLEAN",
        }

    # ------------------------------------
    # Target resolution
    # ------------------------------------
    if raw_target:
        target = int(raw_target)
        logger.info("[PLANNER] Explicit target=%s", target)
    elif apply_tone:
        target = None
        logger.info("[PLANNER] Tone-only target=%s", target)
    else:
        target = None
        logger.info("[PLANNER] No word constraint")

    is_compress = bool(target) and not is_expand
    # print("supporting document instruction ============== ". services.get("supporting_doc_instructions"))
    return {
        "is_expand": is_expand,
        "is_compress": is_compress,
        "apply_tone": apply_tone,
        "apply_research": bool(services.get("research")),
        "apply_edit": bool(services.get("edit")),
        "editors": list(services.get("editors") or []),
        "apply_suggestions": bool(services.get("suggestions")),
        "tone": tone,
        "original_word_count": input_wc,
        "hard_target_word_count": hard_target,   # now the REAL target
        "min_allowed_word_count": min_wc,
        "max_allowed_word_count": max_wc,
        "ideal_word_count": ideal_wc,
        "expand_supporting_doc": services.get("supporting_doc"),
        "supporting_doc_instructions": services.get("supporting_doc_instructions"),
        "next_step": "SEMANTIC_CLEAN",
    }


# ============================================================
# SEMANTIC CLEAN
# ============================================================

async def semantic_clean_node(state: RefineGraphState, config: RunnableConfig):
    logger.info("[SEMANTIC_CLEAN]")

    llm = config["configurable"]["llm_service"]

    cleaned = await llm.chat_completion(
        [
            {"role": "system", "content": "Clean grammar and clarity only. Do NOT expand or compress."},
            {"role": "user", "content": state.original_content},
        ]
    )

    wc = word_count(cleaned)

    if state.apply_suggestions:
        next_step = "SUGGESTIONS_ONLY"
    else:
        next_step = (
            "MARKET_INSIGHTS"
            if state.apply_research
            else (
                "EXPAND_GROW"
                if state.is_expand
                else (
                    "COMPRESS_ENFORCE"
                    if state.is_compress
                    else ("TONE_ADJUST" if state.apply_tone else "EDIT_SEQUENCE")
                )
            )
        )


    logger.info("[SEMANTIC_CLEAN] Done | wc=%s → %s", wc, next_step)

    return {
        "cleaned_content": cleaned,
        "current_word_count": wc,
        "next_step": next_step,
    }


# ============================================================
# MARKET INSIGHTS
# ============================================================

async def market_insights_node(state: RefineGraphState):
    logger.info("[MARKET_INSIGHTS] Fetching")

    services = state.services or {}
    print("services ==============", services)

    market_input = {
        # ------------------------
        # Core research
        # ------------------------
        "research_topics": services.get("research_topics"),
        "research_guidelines": services.get("research_guidelines"),

        # ------------------------
        # PwC internal content
        # ------------------------
        "pwc_content": {
            "isSelected": bool(services.get("pwc_research_doc")),
            "supportingDoc": services.get("pwc_research_doc"),
            "supportingDoc_instructions": services.get(
                "supporting_doc_instructions"
            ),
            "research_links": services.get("research_links"),
        },

        # ------------------------
        # Proprietary tools 
        # ------------------------
        "proprietary": {
            "isSelected": bool(services.get("proprietary", {}).get("isSelected")),
            "sources": services.get("proprietary", {}).get("sources", []),
        },

        # ------------------------
        # Third-party 
        # ------------------------
        "thirdParty": {
            "isSelected": bool(services.get("thirdParty", {}).get("isSelected")),
            "sources": services.get("thirdParty", {}).get("sources", []),
        },

        # ------------------------
        # External research (Tavily)
        # ------------------------
        "externalResearch": {
            "isSelected": bool(
                services.get("externalResearch", {}).get("isSelected")
            )
        },
    }

    insights = get_market_insights(market_input)
    logger.info("[MARKET_INSIGHTS] Fetched Content")

    return {
        "market_insights": json.dumps(insights, indent=2),
        "next_step": "RESEARCH_ENRICH",
    }


# ============================================================
# RESEARCH ENRICH
# ============================================================

async def research_enrich_node(state: RefineGraphState, config: RunnableConfig):
    logger.info("[RESEARCH_ENRICH]")

    llm = config["configurable"]["llm_service"]

    messages = build_research_enrich_prompt(
        content=state.cleaned_content,
        pwc_doc=state.services.get("pwc_research_doc"),
        market_insights=state.market_insights,
    )

    enriched = await llm.chat_completion(messages)
    wc = word_count(enriched)

    next_step = (
        "EXPAND_GROW"
        if state.is_expand and state.hard_target_word_count is not None
        else "TONE_ADJUST"
    )

    return {
        "cleaned_content": enriched,
        "current_word_count": wc,
        "next_step": next_step,
    }


# ============================================================
# EXPAND
# ============================================================

async def expand_grow_node(state: RefineGraphState, config: RunnableConfig):
    logger.info("[EXPAND_GROW] retry=%s", state.retry_count)

    llm = config["configurable"]["llm_service"]

    # print("support_instrc-===========", state.supporting_doc_instructions)
    print("hard word count")
    messages = build_expansion_prompt(
        content=_latest_text(state),
        target_word_count=state.hard_target_word_count,
        current_word_count=state.current_word_count,
        supporting_doc=state.expand_supporting_doc,
        supporting_doc_instructions=state.supporting_doc_instructions
    )

    grown = await llm.chat_completion(messages)
    wc = word_count(grown)

    if state.is_expand and wc > state.max_allowed_word_count:
        logger.warning("[EXPAND_GROW] Overshoot → TRIM")
        return {"grown_content": grown, "current_word_count": wc, "next_step": "EXPAND_TRIM"}

    return {"grown_content": grown, "current_word_count": wc, "next_step": "TONE_ADJUST"}


# ============================================================
# TONE
# ============================================================

async def tone_adjust_node(state: RefineGraphState, config: RunnableConfig):
    if not state.apply_tone:
        return {"next_step": "EDIT_SEQUENCE"}

    logger.info("[TONE_ADJUST] tone=%s", state.tone)

    llm = config["configurable"]["llm_service"]

    messages = build_tone_prompt(
        content=_latest_text(state),
        tone=state.tone,
        current_word_count=state.current_word_count,
        target_word_count=state.hard_target_word_count,
    )

    toned = await llm.chat_completion(messages)
    wc = word_count(toned)

    return {"cleaned_content": toned, "final_output": toned, "current_word_count": wc, "next_step": "EDIT_SEQUENCE"}


# ============================================================
# EDIT
# ============================================================

async def edit_sequence_node(state: RefineGraphState, config: RunnableConfig):
    if not state.apply_edit:
        return {"next_step": "VALIDATE"}

    logger.info("[EDIT_SEQUENCE]")

    llm = config["configurable"]["llm_service"]
    edited = await llm.chat_completion(build_edit_prompt(_latest_text(state), state.editors))

    wc = word_count(edited)
    
    logger.info("[COUNT AFTER EDIT_SEQUENCE] ==%s", wc)

    return {"final_output": edited, "current_word_count": wc, "next_step": "VALIDATE"}


# ============================================================
# COMPRESS
# ============================================================

async def compress_enforce_node(state: RefineGraphState, config: RunnableConfig):
    logger.info("[COMPRESS] target=%s, retry=%s", state.hard_target_word_count, state.retry_count)

    llm = config["configurable"]["llm_service"]

    # Get the content to compress and calculate its current word count
    content_to_compress = _latest_text(state)
    current_wc = word_count(content_to_compress)
    
    # Calculate target, but ensure it doesn't exceed max_allowed_word_count
    base_target = state.ideal_word_count or state.hard_target_word_count
    max_wc = state.max_allowed_word_count
    
    # If content exceeds max, target max to ensure we stay within limit
    if max_wc is not None and current_wc > max_wc:
        target_wc = max_wc
        logger.info("[COMPRESS] Content exceeds max (%s > %s), targeting max", current_wc, max_wc)
    else:
        target_wc = base_target
    
    # Get previous word count for retry context
    # If this is a retry, state.current_word_count contains the result from previous attempt
    previous_wc = state.current_word_count if state.retry_count > 0 else None

    compressed = await llm.chat_completion(
        build_compression_prompt(
            content=content_to_compress,
            target_word_count=target_wc,
            current_word_count=current_wc,
            retry_count=state.retry_count,
            previous_word_count=previous_wc,
        )
    )


    wc = word_count(compressed)

    return {"final_output": compressed, "current_word_count": wc, "next_step": "VALIDATE"}


# ============================================================
# TRIM
# ============================================================

async def expand_trim_node(state: RefineGraphState, config: RunnableConfig):
    logger.info("[EXPAND_TRIM]")

    latest_wc = state.current_word_count
    max_wc = state.max_allowed_word_count

    # When content exceeds max, always target max_allowed_word_count to stay within limit
    if max_wc is not None and latest_wc is not None and latest_wc > max_wc:
        target_wc = max_wc
        logger.info("[EXPAND_TRIM] Content exceeds max (%s > %s), targeting max", latest_wc, max_wc)
    else:
        # Fallback logic for edge cases
        large_overshoot = (
            max_wc is not None
            and latest_wc is not None
            and latest_wc > int(max_wc * 1.1)  # >10% above band
        )

        target_wc = (
            state.min_allowed_word_count
            if large_overshoot and state.min_allowed_word_count is not None
            else state.ideal_word_count
            if state.ideal_word_count is not None
            else state.hard_target_word_count
        )

    content_to_trim = _latest_text(state)
    current_wc = word_count(content_to_trim)
    
    prompt = build_compression_prompt(
        content=content_to_trim,
        target_word_count=target_wc,
        current_word_count=current_wc,
        retry_count=0,  # Trim is not part of compression retry loop
        previous_word_count=None,
    )

    llm = config["configurable"]["llm_service"]
    trimmed = await llm.chat_completion(prompt)

    wc = word_count(trimmed)

    return {
        "final_output": trimmed,
        "current_word_count": wc,
        "trim_applied": True,
        "next_step": "VALIDATE",
    }


# ============================================================
# VALIDATE
# ============================================================

def validate_node(state: RefineGraphState):
    latest_text = _latest_text(state)
    wc = word_count(latest_text)

    min_wc = state.min_allowed_word_count
    max_wc = state.max_allowed_word_count

    logger.info(
        "[VALIDATE] wc=%s | min=%s | max=%s | retry=%s",
        wc,
        min_wc,
        max_wc,
        state.retry_count,
    )

    # --------------------------------------------------------
    # No word-count constraint → accept immediately
    # --------------------------------------------------------
    if min_wc is None or max_wc is None:
        return {
            "final_output": latest_text,
            "next_step": "SUGGESTIONS_ONLY" if state.apply_suggestions else "COMPLETE",
        }

    # --------------------------------------------------------
    # Within tolerance band → ACCEPT
    # --------------------------------------------------------
    if min_wc <= wc <= max_wc:
        return {
            "final_output": latest_text,
            "next_step": "SUGGESTIONS_ONLY" if state.apply_suggestions else "COMPLETE",
        }

    # --------------------------------------------------------
    # Below minimum → EXPAND
    # --------------------------------------------------------
    if wc < min_wc and state.retry_count < state.max_retries:
        return {
            "retry_count": state.retry_count + 1,
            "next_step": "EXPAND_GROW",
        }

    # --------------------------------------------------------
    # Above maximum → TRIM / COMPRESS
    # --------------------------------------------------------
    if wc > max_wc and state.retry_count < state.max_retries:
        return {
            "retry_count": state.retry_count + 1,
            "next_step": "EXPAND_TRIM" if state.is_expand else "COMPRESS_ENFORCE",
        }

    # --------------------------------------------------------
    # Retries exhausted → move forward, do NOT loop forever
    # --------------------------------------------------------
    if state.apply_tone:
        logger.warning(
            "[VALIDATE] Max retries reached (wc=%s, band=%s-%s). Applying tone.",
            wc,
            min_wc,
            max_wc,
        )
        return {
            "next_step": "TONE_ADJUST",
        }

    # --------------------------------------------------------
    # Final fallback → COMPLETE with warning
    # --------------------------------------------------------
    return {
        "final_output": latest_text,
        "warnings": [
            f"Could not converge word count within tolerance range "
            f"({min_wc}-{max_wc}); final count={wc}"
        ],
        "next_step": "COMPLETE",
    }



# ============================================================
# SUGGESTIONS
# ============================================================

async def suggestions_node(state: RefineGraphState, config: RunnableConfig):
    logger.info("[SUGGESTIONS]")

    llm = config["configurable"]["llm_service"]
    suggestions = await llm.chat_completion(
        build_suggestions_prompt(_latest_text(state))
    )

    return {"final_output": suggestions, "suggestions": suggestions}


# ============================================================
# BUILD GRAPH
# ============================================================

def build_refine_graph():
    graph = StateGraph(RefineGraphState)

    graph.add_node("PLANNER", planner_node)
    graph.add_node("SEMANTIC_CLEAN", semantic_clean_node)
    graph.add_node("MARKET_INSIGHTS", market_insights_node)
    graph.add_node("RESEARCH_ENRICH", research_enrich_node)
    graph.add_node("EXPAND_GROW", expand_grow_node)
    graph.add_node("EXPAND_TRIM", expand_trim_node)
    graph.add_node("COMPRESS_ENFORCE", compress_enforce_node)
    graph.add_node("TONE_ADJUST", tone_adjust_node)
    graph.add_node("EDIT_SEQUENCE", edit_sequence_node)
    graph.add_node("VALIDATE", validate_node)
    graph.add_node("SUGGESTIONS_ONLY", suggestions_node)

    graph.set_entry_point("PLANNER")

    graph.add_edge("PLANNER", "SEMANTIC_CLEAN")
    graph.add_edge("MARKET_INSIGHTS", "RESEARCH_ENRICH")
    graph.add_edge("RESEARCH_ENRICH", "EXPAND_GROW")
    graph.add_edge("EXPAND_GROW", "EDIT_SEQUENCE")
    graph.add_edge("EDIT_SEQUENCE", "VALIDATE")
    graph.add_edge("EXPAND_TRIM", "VALIDATE")
    graph.add_edge("COMPRESS_ENFORCE", "VALIDATE")
    graph.add_edge("SUGGESTIONS_ONLY", END)

    graph.add_conditional_edges(
        "SEMANTIC_CLEAN",
        lambda s: s.next_step,
        {
            "MARKET_INSIGHTS": "MARKET_INSIGHTS",
            "EXPAND_GROW": "EXPAND_GROW",
            "COMPRESS_ENFORCE": "COMPRESS_ENFORCE",
            "TONE_ADJUST": "TONE_ADJUST",
            "EDIT_SEQUENCE": "EDIT_SEQUENCE",
            "SUGGESTIONS_ONLY": "SUGGESTIONS_ONLY",
        },
    )

    graph.add_conditional_edges(
        "VALIDATE",
        lambda s: s.next_step,
        {
            "EXPAND_GROW": "EXPAND_GROW",
            "EXPAND_TRIM": "EXPAND_TRIM",
            "COMPRESS_ENFORCE": "COMPRESS_ENFORCE",
            "TONE_ADJUST": "TONE_ADJUST",
            "SUGGESTIONS_ONLY": "SUGGESTIONS_ONLY",
            "COMPLETE": END,
            "FAIL": END,
        },
    )

    return graph.compile()


# ============================================================
# PUBLIC API
# ============================================================

async def run_refine_content_graph(*, original_content, services, llm_service):
    graph = build_refine_graph()

    state = RefineGraphState(
        original_content=original_content,
        services=services,
    )

    result = await graph.ainvoke(
        state,
        config={"configurable": {"llm_service": llm_service}},
    )

    return {
        "content": result.get("final_output"),
        "suggestions": result.get("suggestions"),
        "word_count": result.get("current_word_count"),
        "warnings": result.get("warnings", []),
        "success": result.get("next_step") == "COMPLETE",
    }
