from fastapi import APIRouter, Depends
import logging
from app.features.chat import router
from app.features.thought_leadership.services.edit_content import edit_content_agent
from app.features.thought_leadership.agents import mi_agent, tl_agent

from app.features.thought_leadership.workflows import (
    draft_content,
    conduct_research,
    refine_content,
    format_translator,
    podcast,
    research_materials,
    update_section,
    prep_client_meeting,
    pov,
    proposal_insights,
    industry_insights
)
from app.features.thought_leadership.services.demo.router import router as contract_draft_router
logger = logging.getLogger(__name__)
from app.services.auth_service import validate_jwt_token

def get_router() -> APIRouter:
    """Create and configure Thought Leadership router with all workflow sub-routers"""
    router = APIRouter(prefix="/tl", tags=["MI-DOCSTUDIO"], dependencies=[Depends(validate_jwt_token)])

    # DocStudio Routers
    router.include_router(draft_content.router, prefix="/draft-content", tags=["DocStudio - Draft Content"])
    router.include_router(conduct_research.router, prefix="/conduct-research", tags=["DocStudio - Conduct Research"])
    router.include_router(edit_content_agent.router, prefix="/edit-content", tags=["DocStudio - Edit Content"])
    router.include_router(refine_content.router, prefix="/refine-content", tags=["DocStudio - Refine Content"])
    router.include_router(format_translator.router, prefix="/format-translator", tags=["DocStudio - Format Translator"])
    router.include_router(podcast.router, prefix="/generate-podcast", tags=["DocStudio - Podcast"])

    # Market Intelligence Routers
    router.include_router(research_materials.router, prefix="/research-with-materials", tags=["MI - Research Materials"])
    router.include_router(prep_client_meeting.router, prefix="/prep-client-meeting", tags=["MI - Prep Client Meeting"])
    router.include_router(pov.router, prefix="/pov", tags=["MI - POV"])
    router.include_router(proposal_insights.router, prefix="/proposal_insights", tags=["MI - Proposal Insights"])
    router.include_router(industry_insights.router, prefix="/industry_insights", tags=["MI - Industry Insights"])

    router.include_router(contract_draft_router, prefix="/contract", tags=["TL - Contract Draft"])

    # Quick Request Routers
    router.include_router(mi_agent.router, prefix="/mi_chat_agent", tags=["MI-QS"])
    router.include_router(tl_agent.router, prefix="/tl_chat_agent", tags=["DocStudio-QS"])

    # Deprecated
    router.include_router(update_section.router, prefix="/update-section", tags=["TL - Canvas Update Section"])
    logger.info(f"adding all routes..................")
    return router
