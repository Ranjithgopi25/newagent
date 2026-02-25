import asyncio
import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

# ── Gateway config ────────────────────────────────────────────────────────────
APIM_BASE_URL = "https://gif-apim-glb.pwcinternal.com/commercialhub"
APIM_HEADERS = {
    "Ocp-Apim-Subscription-Key": "fdf33c3ce6b7411f93f17840088ba384",
    "Content-Type": "application/json",
}
TOTAL_PAGES = 4


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _fetch_offerings_page(client: httpx.AsyncClient, page: int) -> list[dict]:
    """Fetch a single page of offerings and return the list of items."""
    url = f"{APIM_BASE_URL}/offerings"
    params = {"page": page}
    try:
        response = await client.get(url, headers=APIM_HEADERS, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        # Support both {"data": [...]} and plain list responses
        if isinstance(data, list):
            return data
        return data.get("data", data.get("offerings", data.get("results", [])))
    except Exception as exc:
        logger.error(f"Error fetching offerings page {page}: {exc}")
        return []


async def fetch_all_offering_ids() -> list[str]:
    """
    Fetch all offering IDs across all 4 pages in parallel.
    Returns a flat list of offering_id strings.
    """
    async with httpx.AsyncClient() as client:
        tasks = [_fetch_offerings_page(client, page) for page in range(1, TOTAL_PAGES + 1)]
        pages = await asyncio.gather(*tasks)

    all_ids: list[str] = []
    for page_items in pages:
        for item in page_items:
            if isinstance(item, dict):
                # Try common key names for the ID field
                oid = (
                    item.get("offering_id")
                    or item.get("id")
                    or item.get("offeringId")
                )
                if oid:
                    all_ids.append(str(oid))
            elif isinstance(item, str):
                all_ids.append(item)

    logger.info(f"Fetched {len(all_ids)} offering IDs across {TOTAL_PAGES} pages.")
    return all_ids


async def fetch_offering_detail(offering_id: str) -> Optional[dict]:
    """Fetch full detail for a single offering."""
    url = f"{APIM_BASE_URL}/offering/{offering_id}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=APIM_HEADERS, timeout=30)
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            logger.error(f"Error fetching offering detail for {offering_id}: {exc}")
            return None


# ── LLM integration ───────────────────────────────────────────────────────────

def get_llm_service():
    """
    Returns the LLM service instance.
    Import path assumed from your project structure — adjust if needed.
    """
    from app.services.llm_service import LLMService  # noqa: WPS433
    return LLMService()


async def find_best_matching_offering(user_query: str) -> Optional[str]:
    """
    Full pipeline:
      1. Fetch all offering IDs from all 4 pages.
      2. Ask the LLM to pick the best matching offering ID for the user query.
      3. Return the best offering_id.
    """
    # Step 1 – get all IDs
    offering_ids = await fetch_all_offering_ids()
    if not offering_ids:
        logger.warning("No offering IDs found.")
        return None

    logger.info(f"Total offering IDs collected: {len(offering_ids)}")
    print(f"[CommercialHub] Offering IDs fetched ({len(offering_ids)} total): {offering_ids}")

    # Step 2 – ask LLM for best match
    ids_formatted = "\n".join(f"- {oid}" for oid in offering_ids)
    prompt = (
        f"You are a PwC Commercial Hub assistant.\n\n"
        f"User query: \"{user_query}\"\n\n"
        f"Below is the list of available offering IDs:\n{ids_formatted}\n\n"
        f"Based on the user query, return ONLY the single best matching offering ID "
        f"from the list above. Do not include any explanation — just the ID."
    )

    llm = get_llm_service()
    # Adjust the call signature to match your LLMService interface
    llm_response: str = await llm.generate(prompt)
    best_id = llm_response.strip()

    print(f"[CommercialHub] LLM selected offering ID: {best_id}")
    logger.info(f"LLM best match offering ID: {best_id}")
    return best_id


# ── Public entry point ────────────────────────────────────────────────────────

async def handle_commercial_hub_query(user_query: str) -> dict:
    """
    Main service function called by the chat/data-source agent.

    Returns:
        {
            "offering_id": "<best match id>",
            "offering_detail": { ... }   # full detail from the offering endpoint
        }
    """
    best_offering_id = await find_best_matching_offering(user_query)
    if not best_offering_id:
        return {"error": "Could not determine a matching offering."}

    detail = await fetch_offering_detail(best_offering_id)
    return {
        "offering_id": best_offering_id,
        "offering_detail": detail,
    }


# ── Quick local test ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    query = sys.argv[1] if len(sys.argv) > 1 else "tax advisory services for large enterprises"
    result = asyncio.run(handle_commercial_hub_query(query))
    print("\n=== Result ===")
    import json
    print(json.dumps(result, indent=2))
