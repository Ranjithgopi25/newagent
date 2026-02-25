import asyncio
import logging
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

# ── Gateway constants ─────────────────────────────────────────────────────────
APIM_BASE_URL = "https://gif-apim-glb.pwcinternal.com/commercialhub"
APIM_SUBSCRIPTION_KEY = "fdf33c3ce6b7411f93f17840088ba384"
TOTAL_PAGES = 4


# ── LLM factory (keeps the rest of your codebase's convention) ────────────────
def get_llm_service():
    """Return the shared LLM service instance."""
    from app.infrastructure.llm.llm_service import LLMService  # noqa: WPS433
    return LLMService()


# ─────────────────────────────────────────────────────────────────────────────
class CommercialHubService:
    """
    Commercial Hub client:
      1. Fetch offering IDs from pages 1-4 (parallel).
      2. Use the LLM to pick the best-matching ID for a user query.
      3. Fetch offering detail by ID.
    """

    def __init__(
        self,
        llm_service=None,
        base_url: Optional[str] = None,
        subscription_key: Optional[str] = None,
        timeout: float = 30.0,
    ) -> None:
        # Accept an injected llm_service or fall back to the factory
        self.llm_service = llm_service or get_llm_service()
        self.base_url = base_url or APIM_BASE_URL
        self.subscription_key = subscription_key or APIM_SUBSCRIPTION_KEY
        self._timeout = timeout

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _headers(self) -> Dict[str, str]:
        return {
            "Ocp-Apim-Subscription-Key": self.subscription_key,
            "Content-Type": "application/json",
        }

    async def _fetch_offerings_page(
        self,
        client: httpx.AsyncClient,
        page: int,
    ) -> List[Dict[str, Any]]:
        """Fetch one page of offerings; return an empty list on any error."""
        url = f"{self.base_url}/offerings"
        try:
            response = await client.get(
                url,
                headers=self._headers(),
                params={"page": page},
                timeout=self._timeout,
            )
            response.raise_for_status()
            data = response.json()

            if isinstance(data, list):
                return data

            # Support common envelope shapes
            return (
                data.get("data")
                or data.get("offerings")
                or data.get("results")
                or []
            )
        except Exception as exc:
            logger.error("Error fetching offerings page %d: %s", page, exc)
            return []

    # ── Public API ────────────────────────────────────────────────────────────

    async def fetch_all_offering_ids(
        self,
        pages: Optional[List[int]] = None,
    ) -> List[str]:
        """
        Fetch all offering IDs across pages 1-4 in parallel.
        Returns a flat, deduplicated list of ID strings.
        """
        if pages is None:
            pages = list(range(1, TOTAL_PAGES + 1))

        async with httpx.AsyncClient() as client:
            # Parallel fetch — one coroutine per page
            results: List[List[Dict[str, Any]]] = await asyncio.gather(
                *[self._fetch_offerings_page(client, page) for page in pages]
            )

        all_ids: List[str] = []
        seen = set()
        for page_items in results:
            for item in page_items:
                if not isinstance(item, dict):
                    continue
                oid = (
                    item.get("offering_id")
                    or item.get("id")
                    or item.get("offeringId")
                )
                if oid and str(oid) not in seen:
                    seen.add(str(oid))
                    all_ids.append(str(oid))

        logger.info("Fetched %d unique offering IDs across pages %s", len(all_ids), pages)
        print(f"[CommercialHub] Offering IDs fetched ({len(all_ids)} total): {all_ids}")
        return all_ids

    async def fetch_offering_detail(self, offering_id: str) -> Optional[Dict[str, Any]]:
        """Fetch full detail for a single offering by ID."""
        if not offering_id:
            return None

        url = f"{self.base_url}/offering/{offering_id}"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    headers=self._headers(),
                    timeout=self._timeout,
                )
                response.raise_for_status()
                data = response.json()
                return data if isinstance(data, dict) else None
            except Exception as exc:
                logger.error("Error fetching offering detail for %s: %s", offering_id, exc)
                return None

    async def choose_best_offering_id(
        self,
        user_query: str,
        pages: Optional[List[int]] = None,
    ) -> Dict[str, Optional[str]]:
        """
        Full pipeline:
          1. Fetch all offering IDs (parallel, pages 1-4).
          2. Ask the LLM to return the single best-matching ID.

        Returns:
            {
                "offering_id": "<best id>",   # None if nothing found
                "reason":      None,          # reserved for future use
                "offering":    None,          # reserved for future use
            }
        """
        offering_ids = await self.fetch_all_offering_ids(pages=pages)
        if not offering_ids:
            logger.warning("No offering IDs available for LLM selection")
            return {"offering_id": None, "reason": "No offerings available", "offering": None}

        ids_formatted = "\n".join(f"- {oid}" for oid in offering_ids)

        system_prompt = (
            "You are a PwC Commercial Hub assistant.\n"
            "You will receive a user query and a list of offering IDs.\n"
            "Your ONLY task is to return the single best-matching offering ID from the list - "
            "no explanation, no extra text."
        )
        user_prompt = (
            f'User query: "{user_query}"\n\n'
            f"Available offering IDs:\n{ids_formatted}\n\n"
            "Return ONLY the best matching offering ID."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ]

        # ── Call the LLM ──────────────────────────────────────────────────────
        # NOTE: Adjust method name to match your LLMService interface:
        #   e.g.  chat_completion / generate / invoke / complete
        try:
            raw = await self.llm_service.chat_completion(
                messages=messages,
                temperature=0.0,
            )
            best_id = (raw or "").strip()
        except Exception as exc:
            logger.error("LLM call failed: %s", exc)
            best_id = ""

        logger.info("LLM selected offering ID: %s", best_id)
        print(f"[CommercialHub] LLM selected offering ID: {best_id}")

        return {
            "offering_id": best_id or None,
            "reason": None,
            "offering": None,
        }


# ── Manual test runner ────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Usage (from project root):
    #   python -m app.features.chat.services.data_source_agent.commercial_hub_service "your query"

    import json
    import sys

    async def _main() -> None:
        query = sys.argv[1] if len(sys.argv) > 1 else "tax advisory services for large enterprises"

        service = CommercialHubService()   # uses get_llm_service() internally

        print(f"[CommercialHub] Query: {query}\n")
        result = await service.choose_best_offering_id(user_query=query)

        print("\n=== Result ===")
        print(json.dumps(result, indent=2))

    asyncio.run(_main())
