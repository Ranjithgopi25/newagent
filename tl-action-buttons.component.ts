import logging
from typing import Any, Dict, List, Optional

import httpx

from app.infrastructure.llm.llm_service import LLMService

logger = logging.getLogger(__name__)

APIM_BASE_URL = "https://gif-apim-glb.pwcinternal.com/commercialhub"
APIM_SUBSCRIPTION_KEY = "fdf33c3ce6b7411f93f17840088ba384"
TOTAL_PAGES = 4


class CommercialHubService:
    """
    Minimal Commercial Hub client:
    - Fetch offering IDs from pages 1–4
    - Use LLM to pick the best matching ID for a user query
    - Fetch offering detail by ID
    """

    def __init__(
        self,
        llm_service: LLMService,
        base_url: Optional[str] = None,
        subscription_key: Optional[str] = None,
        timeout: float = 30.0,
    ) -> None:
        self.llm_service = llm_service
        self.base_url = base_url or APIM_BASE_URL
        self.subscription_key = subscription_key or APIM_SUBSCRIPTION_KEY
        self._timeout = timeout

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
        """Fetch a single page of offerings and return the list of items."""
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
            return data.get("data") or data.get("offerings") or data.get("results") or []
        except Exception as exc:
            logger.error("Error fetching offerings page %s: %s", page, exc)
            return []

    async def fetch_all_offering_ids(
        self,
        pages: Optional[List[int]] = None,
    ) -> List[str]:
        """
        Fetch all offering IDs across the selected pages.
        Defaults to pages 1–4.
        """
        if pages is None:
            pages = list(range(1, TOTAL_PAGES + 1))

        all_ids: List[str] = []
        async with httpx.AsyncClient() as client:
            for page in pages:
                items = await self._fetch_offerings_page(client, page)
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    oid = (
                        item.get("offering_id")
                        or item.get("id")
                        or item.get("offeringId")
                    )
                    if oid:
                        all_ids.append(str(oid))

        logger.info(
            "Fetched %d offering IDs across pages %s",
            len(all_ids),
            pages,
        )
        # Debug print to show all fetched offering IDs in logs/console
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
                logger.error(
                    "Error fetching offering detail for %s: %s",
                    offering_id,
                    exc,
                )
                return None

    async def choose_best_offering_id(
        self,
        user_query: str,
        pages: Optional[List[int]] = None,
    ) -> Dict[str, Optional[str]]:
        """
        Ask the LLM to pick the single best-matching offering ID for a user query.

        Returns a dict:
            {
                "offering_id": "<best id or None>",
                "reason": "<optional short text>",
                "offering": null  # kept for compatibility with tool contract
            }
        """
        offering_ids = await self.fetch_all_offering_ids(pages=pages)
        if not offering_ids:
            logger.warning("No offering IDs available for selection")
            return {
                "offering_id": None,
                "reason": "No offerings available",
                "offering": None,
            }

        ids_formatted = "\n".join(f"- {oid}" for oid in offering_ids)
        system_prompt = (
            "You are a PwC Commercial Hub assistant.\n"
            "You will receive a user query and a list of offering IDs.\n"
            "Your task is to return ONLY the single best matching offering ID from the list."
        )
        user_prompt = (
            f'User query: "{user_query}"\n\n'
            f"Available offering IDs:\n{ids_formatted}\n\n"
            "Return only the best matching offering ID, with no explanation."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        raw = await self.llm_service.chat_completion(
            messages=messages,
            temperature=0.0,
        )
        best_id = (raw or "").strip()

        logger.info("LLM selected offering ID: %s", best_id)
        # Debug print to show the selected offering ID
        print(f"[CommercialHub] LLM selected offering ID: {best_id}")

        return {
            "offering_id": best_id or None,
            "reason": None,
            "offering": None,
        }


if __name__ == "__main__":
    """
    Simple manual test runner for this module.

    Usage (from project root, with env configured):
        python -m app.features.chat.services.data_source_agent.commercial_hub_service "your query here"
    """
    import asyncio
    import json
    import sys

    async def _main() -> None:
        query = (
            "tax advisory services for large enterprises"
            if len(sys.argv) < 2
            else sys.argv[1]
        )

        from app.infrastructure.llm.llm_service import LLMService as _LLMService

        llm = _LLMService()
        service = CommercialHubService(llm)

        print(f"[CommercialHub] Testing with user query: {query}")
        result = await service.choose_best_offering_id(user_query=query)

        print("\n=== Commercial Hub Test Result ===")
        print(json.dumps(result, indent=2))

    asyncio.run(_main())
