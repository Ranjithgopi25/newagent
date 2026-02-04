# ============================================================
# LangGraph orchestration for Refine Content
# ============================================================

from typing import Optional, Dict, Any, List, Literal
from pydantic import BaseModel, Field
import json
import logging

from langgraph.graph import StateGraph, END
from langchain_core.runnables import RunnableConfig

from app.core.deps import get_llm_client_agent
from app.utils.market_intelligence_agent.graph import get_market_insights
from app.features.thought_leadership.services.refine_content.prompt import (
    build_suggestions_prompt,
    build_tone_prompt,
    build_expansion_prompt,
    build_compression_prompt,
    build_research_enrich_prompt,
    build_edit_prompt,
    build_markdown_structure_prompt,
    word_count,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------
# LLM (shared)
# ---------------------------------------------------------------------
llm = get_llm_client_agent()

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
    apply_suggestions: bool = False

    # semantic clean switch (OFF by default)
    apply_semantic_clean: bool = False

    editors: Optional[List] = None
    trim_applied: bool = False
    tone: Optional[str] = None

    # targets
    hard_target_word_count: Optional[int] = None
    ideal_word_count: Optional[int] = None

    # validation band
    min_allowed_word_count: Optional[int] = None
    max_allowed_word_count: Optional[int] = None

    # content
    cleaned_content: Optional[str] = None
    grown_content: Optional[str] = None
    final_output: Optional[str] = None
    suggestions: Optional[str] = None

    # context
    research_topics: Optional[str] = None
    research_input: Optional[Dict[str, Any]] = None
    market_insights: Optional[str] = None
    expand_supporting_doc: Optional[str] = None
    supporting_doc_instructions: Optional[str] = None

    # metrics
    current_word_count: Optional[int] = None
    retry_count: int = 0
    max_retries: int = 0

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
    research_requested = bool(services.get("research"))

    # Expansion ALWAYS implies research
    apply_research = research_requested or is_expand

    if apply_research:
        research_input = build_research_input(services)
    else:
        research_input = None

    min_wc = max_wc = hard_target = ideal_wc = None

    if raw_target:
        target_wc = int(raw_target)
        delta = abs(target_wc - input_wc)
        tolerance = int(delta * 0.15)

        if target_wc > input_wc:
            min_wc = input_wc + (delta - tolerance)
            max_wc = input_wc + (delta + tolerance)
        else:
            min_wc = input_wc - (delta + tolerance)
            max_wc = input_wc - (delta - tolerance)

        hard_target = target_wc
        ideal_wc = hard_target

    if suggestions_only and not any(
        [services.get("is_expand"), services.get("tone"), services.get("research"), services.get("edit")]
    ):
        logger.info("[PLANNER] Suggestions-only mode")
        return {
            "apply_suggestions": True,
            "next_step": "SEMANTIC_CLEAN",
        }

    is_compress = bool(hard_target) and not is_expand

    return {
        "is_expand": is_expand,
        "is_compress": is_compress,
        "apply_tone": apply_tone,
        "apply_research": apply_research,
        "research_input": research_input,
        "apply_edit": bool(services.get("edit")),
        "editors": list(services.get("editors") or []),
        "apply_suggestions": bool(services.get("suggestions")),
        "tone": tone,
        "hard_target_word_count": hard_target,
        "min_allowed_word_count": min_wc,
        "max_allowed_word_count": max_wc,
        "ideal_word_count": ideal_wc,
        "expand_supporting_doc": services.get("supporting_doc"),
        "supporting_doc_instructions": services.get("supporting_doc_instructions"),
        "current_word_count": input_wc,
        "next_step": "SEMANTIC_CLEAN",
    }


# ============================================================
# SEMANTIC CLEAN
# ============================================================

async def semantic_clean_node(state: RefineGraphState, config: RunnableConfig):
    logger.info("[SEMANTIC_CLEAN] apply=%s", state.apply_semantic_clean)

    if not state.apply_semantic_clean:
        wc = word_count(state.original_content)
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

        return {
            "cleaned_content": state.original_content,
            "current_word_count": wc,
            "next_step": next_step,
        }

    cleaned = (await llm.ainvoke(
        [
            {"role": "system", "content": "Clean grammar and clarity only. Do NOT expand or compress."},
            {"role": "user", "content": state.original_content},
        ]
    )).content

    return {
        "cleaned_content": cleaned,
        "current_word_count": word_count(cleaned),
        "next_step": state.next_step,
    }


# ============================================================
# MARKET INSIGHTS
# ============================================================

async def market_insights_node(state: RefineGraphState):
    logger.info("[MARKET_INSIGHTS] Fetching")

    research_input = state.research_input or {}

    # If FE selected research but didn't send topic → derive it
    if not research_input.get("research_topics"):
        topic = await derive_research_topic_from_content(state.original_content)
        research_input["research_topics"] = topic

    insights = get_market_insights(research_input)
    logger.info("[MARKET_INSIGHTS ********************* ] %s", insights)
    logger.info("[MARKET_INSIGHTS] Fetched")
    return {
        "market_insights": json.dumps(insights, indent=2),
        "next_step": "RESEARCH_ENRICH",
    }


# ============================================================
# RESEARCH ENRICH
# ============================================================

async def research_enrich_node(state: RefineGraphState, config: RunnableConfig):
    logger.info("[RESEARCH_ENRICH]")
    
    enriched = (await llm.ainvoke(
        build_research_enrich_prompt(
            content=state.cleaned_content,
            research_topics=state.research_topics,
            market_insights=state.market_insights,
        )
    )).content
    print("research enrich node output ============ ", enriched)
    return {
        "cleaned_content": enriched,
        "current_word_count": word_count(enriched),
        "next_step": "EXPAND_GROW" if state.is_expand else "TONE_ADJUST",
    }


# ============================================================
# EXPAND
# ============================================================

async def expand_grow_node(state: RefineGraphState, config: RunnableConfig):
    logger.info("[EXPAND_GROW] retry=%s", state.retry_count)

    grown = (await llm.ainvoke(
        build_expansion_prompt(
            original_content=state.cleaned_content,
            enriched_content=_latest_text(state),
            target_word_count=state.hard_target_word_count,
            current_word_count=state.current_word_count,
            supporting_doc=state.expand_supporting_doc,
            supporting_doc_instructions=state.supporting_doc_instructions,
            research_topics=state.research_topics,
            research_context=state.market_insights,
        )
    )).content

    wc = word_count(grown)

    if wc > state.max_allowed_word_count:
        return {"grown_content": grown, "current_word_count": wc, "next_step": "EXPAND_TRIM"}

    return {"grown_content": grown, "current_word_count": wc, "next_step": "TONE_ADJUST"}


# ============================================================
# TONE
# ============================================================

async def tone_adjust_node(state: RefineGraphState, config: RunnableConfig):
    if not state.apply_tone:
        return {"next_step": "EDIT_SEQUENCE"}

    toned = (await llm.ainvoke(
        build_tone_prompt(
            content=_latest_text(state),
            tone=state.tone,
            current_word_count=state.current_word_count,
            target_word_count=state.hard_target_word_count,
        )
    )).content

    return {
        "final_output": toned,
        "current_word_count": word_count(toned),
        "next_step": "EDIT_SEQUENCE",
    }


# ============================================================
# EDIT
# ============================================================

async def edit_sequence_node(state: RefineGraphState, config: RunnableConfig):
    if not state.apply_edit:
        return {"next_step": "VALIDATE"}

    edited = (await llm.ainvoke(
        build_edit_prompt(_latest_text(state), state.editors)
    )).content

    return {
        "final_output": edited,
        "current_word_count": word_count(edited),
        "next_step": "VALIDATE",
    }


# ============================================================
# COMPRESS / TRIM
# ============================================================

async def compress_enforce_node(state: RefineGraphState, config: RunnableConfig):
    compressed = (await llm.ainvoke(
        build_compression_prompt(
            content=_latest_text(state),
            target_word_count=state.ideal_word_count or state.hard_target_word_count,
            current_word_count=word_count(_latest_text(state)),
            retry_count=state.retry_count,
            previous_word_count=state.current_word_count,
        )
    )).content

    return {
        "final_output": compressed,
        "current_word_count": word_count(compressed),
        "next_step": "VALIDATE",
    }


# ============================================================
# VALIDATE
# ============================================================

def validate_node(state: RefineGraphState):
    wc = word_count(_latest_text(state))

    if state.min_allowed_word_count is None:
        return {
            "final_output": _latest_text(state),
            "next_step": "SUGGESTIONS_ONLY" if state.apply_suggestions else "COMPLETE",
        }

    if state.min_allowed_word_count <= wc <= state.max_allowed_word_count:
        return {
            "final_output": _latest_text(state),
            "next_step": "SUGGESTIONS_ONLY" if state.apply_suggestions else "COMPLETE",
        }

    if wc > state.max_allowed_word_count and state.retry_count < state.max_retries:
        return {"retry_count": state.retry_count + 1, "next_step": "EXPAND_TRIM"}

    return {
        "final_output": _latest_text(state),
        "warnings": ["Word count convergence failed"],
        "next_step": "COMPLETE",
    }


# ============================================================
# SUGGESTIONS
# ============================================================

async def suggestions_node(state: RefineGraphState, config: RunnableConfig):
    suggestions = (await llm.ainvoke(
        build_suggestions_prompt(_latest_text(state))
    )).content

    return {"final_output": suggestions, "suggestions": suggestions}


# ============================================================
# MARKDOWN STRUCTURE (refined content -> correctly formatted markdown)
# ============================================================

async def markdown_structure_node(state: RefineGraphState, config: RunnableConfig):
    """Convert refined content into correctly formatted markdown (title, headings, subheadings, bullets, citations)."""
    content = _latest_text(state)
    # Skip LLM when empty: avoid unnecessary call and preserve empty response
    if not content or not content.strip():
        return {"final_output": content}

    response = await llm.ainvoke(build_markdown_structure_prompt(content))
    markdown = (response.content or "").strip()
    if markdown.startswith("```"):
        markdown = markdown.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    print("-------markdown---",markdown)
    return {"final_output": markdown}


# ============================================================
# RESEARCH INPUT FUNCTION (backend defaults for sources)
# ============================================================

def build_research_input(services: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "research_topics": services.get("research_topics"),
        "research_guidelines": services.get(
            "research_guidelines",
            "Provide concise, factual market and industry insights relevant to the topic."
        ),

        # PWC INTERNAL CONTENT
        "pwc_content": {
            "isSelected": True,
            "supportingDoc": services.get("pwc_research_doc"),
            "supportingDoc_instructions": services.get(
                "supporting_doc_instructions"
            ),
            "research_links": services.get(
                "research_links",
                [
                    "pwc_industry_edge",
                    "pwc_com",
                    "pwc_insights",
                    "executive_leadership_hub",
                    "the_exchange",
                    "pwc_connected_source",
                    "pwc_benchmarking",
                ],
            ),
        },

        # PWC + INTERNAL PROPRIETARY SOURCES
        "proprietary": {
            "isSelected": True,
            "sources": services.get(
                "proprietary", {}
            ).get(
                "sources",
                [
                    "pwc_industry_edge",
                    "pwc_com",
                    "pwc_insights",
                    "s_b_journal",
                    "executive_leadership_hub",
                    "the_exchange",
                    "pwc_connected_source",
                    "pwc_benchmarking",
                ],
            ),
        },

        # THIRD-PARTY LICENSED SOURCES
        "thirdParty": {
            "isSelected": True,
            "sources": services.get(
                "thirdParty", {}
            ).get(
                "sources",
                [
                    "factiva_wsj_dow_jones",
                    "s_p_global_capital_iq_xpressfeed",
                    "ibis_world",
                    "boardex",
                ],
            ),
        },

        # OPEN WEB / EXTERNAL
        "externalResearch": {
            "isSelected": True
        },
    }

async def derive_research_topic_from_content(content: str) -> str:
    summary = (await llm.ainvoke(
        [
            {
                "role": "system",
                "content": (
                    "Summarize the core topic of the following content in under 200 characters. "
                    "Return ONLY the summary text."
                ),
            },
            {"role": "user", "content": content},
        ]
    )).content
    logger.info("Derived Research Topic %s", summary)
    return summary.strip()[:200]


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
    graph.add_node("EXPAND_TRIM", compress_enforce_node)
    graph.add_node("COMPRESS_ENFORCE", compress_enforce_node)
    graph.add_node("TONE_ADJUST", tone_adjust_node)
    graph.add_node("EDIT_SEQUENCE", edit_sequence_node)
    graph.add_node("VALIDATE", validate_node)
    graph.add_node("SUGGESTIONS_ONLY", suggestions_node)
    graph.add_node("MARKDOWN_STRUCTURE", markdown_structure_node)

    graph.set_entry_point("PLANNER")

    graph.add_edge("PLANNER", "SEMANTIC_CLEAN")
    graph.add_edge("MARKET_INSIGHTS", "RESEARCH_ENRICH")
    graph.add_edge("RESEARCH_ENRICH", "EXPAND_GROW")
    graph.add_edge("EXPAND_GROW", "EDIT_SEQUENCE")
    graph.add_edge("EDIT_SEQUENCE", "VALIDATE")
    graph.add_edge("EXPAND_TRIM", "VALIDATE")
    graph.add_edge("COMPRESS_ENFORCE", "VALIDATE")
    graph.add_edge("SUGGESTIONS_ONLY", "MARKDOWN_STRUCTURE")
    graph.add_edge("MARKDOWN_STRUCTURE", END)

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
            "COMPLETE": "MARKDOWN_STRUCTURE",
            "FAIL": END,
        },
    )

    return graph.compile()


# ============================================================
# PUBLIC API
# ============================================================

async def run_refine_content_graph(*, original_content, services, llm_service):
    graph = build_refine_graph()

    result = await graph.ainvoke(
        RefineGraphState(
            original_content=original_content,
            services=services,
        ),
        config={"configurable": {"llm_service": llm_service}},
    )

    return {
        "content": result.get("final_output"),
        "suggestions": result.get("suggestions"),
        "word_count": result.get("current_word_count"),
        "warnings": result.get("warnings", []),
        "success": result.get("next_step") == "COMPLETE",
    }
