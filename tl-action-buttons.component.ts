import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.infrastructure.llm.llm_service import LLMService

logger = logging.getLogger(__name__)

APIM_BASE_URL = "https://gif-apim-glb.pwcinternal.com/commercialhub"
APIM_SUBSCRIPTION_KEY = "fdf33c3ce6b7411f93f17840088ba384"
TOTAL_PAGES = 4


def get_llm_service() -> LLMService:
    """Return the shared LLM service instance."""
    return LLMService()


class CommercialHubService:
    """
    Minimal Commercial Hub client:
    - Fetch offering IDs from pages 1–4
    - Use LLM to pick the best matching ID for a user query
    - Fetch offering detail by ID
    """

    def __init__(
        self,
        llm_service: Optional[LLMService] = None,
        base_url: Optional[str] = None,
        subscription_key: Optional[str] = None,
        timeout: float = 30.0,
    ) -> None:
        self.llm_service = llm_service or get_llm_service()
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
    ) -> List[Tuple[str, int]]:
        """
        Fetch all offering IDs across pages 1–4 in parallel.
        Returns list of (offering_id, page_number) so caller can show which page an ID came from.
        """
        if pages is None:
            pages = list(range(1, TOTAL_PAGES + 1))

        async with httpx.AsyncClient() as client:
            results: List[List[Dict[str, Any]]] = await asyncio.gather(
                *[self._fetch_offerings_page(client, page) for page in pages]
            )

        all_ids: List[Tuple[str, int]] = []
        for page_num, page_items in zip(pages, results):
            for item in page_items:
                if not isinstance(item, dict):
                    continue
                oid = (
                    item.get("offering_id")
                    or item.get("id")
                    or item.get("offeringId")
                )
                if oid:
                    all_ids.append((str(oid), page_num))

        logger.info("Fetched %d offering IDs across pages %s", len(all_ids), pages)
        print(f"[CommercialHub] Offering IDs fetched ({len(all_ids)} total): {[x[0] for x in all_ids]}")
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
    ) -> Dict[str, Any]:
        """
        Fetch offering IDs (pages 1–4), get full offering details,
        and ask the LLM for the best match.

        Returns:
            {
                "offering_id": "<best id or None>",
                "page": <page number 1-4 or None>,
            }
        """
        id_page_list = await self.fetch_all_offering_ids(pages=pages)
        if not id_page_list:
            return {"offering_id": None, "page": None}

        id_to_page = {oid: page for oid, page in id_page_list}

        # Fetch full details for each offering so the LLM can use all fields
        offerings_for_llm: List[Dict[str, Any]] = []
        for oid, page in id_page_list:
            detail = await self.fetch_offering_detail(oid)
            if not isinstance(detail, dict):
                continue
            offerings_for_llm.append(
                {
                    "offering_id": oid,
                    "page": page,
                    "detail": detail,
                }
            )

        if not offerings_for_llm:
            return {"offering_id": None, "page": None}

        system_prompt = (
            "You are a PwC Commercial Hub assistant.\n"
            "You will receive a user query and a list of offering objects.\n"
            "Each object has: offering_id, page, and a 'detail' dict from the API.\n"
            "Your ONLY task is to return the single best-matching offering_id from this list.\n"
            "Do not explain your choice. Respond with the ID only."
        )
        payload = {
            "user_query": user_query,
            "offerings": offerings_for_llm,
        }
        user_prompt = json.dumps(payload, indent=2)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        try:
            raw = await self.llm_service.chat_completion(
                messages=messages,
                temperature=0.0,
            )
            best_id = (raw or "").strip()
        except Exception as exc:
            logger.error("LLM call failed: %s", exc)
            best_id = ""

        page = id_to_page.get(best_id) if best_id else None
        logger.info("LLM selected offering ID: %s (page %s)", best_id, page)
        print(f"[CommercialHub] LLM selected offering ID: {best_id} (page {page})")

        return {"offering_id": best_id or None, "page": page}


if __name__ == "__main__":
    """
    Simple manual test runner for this module.

    Usage (from project root, with env configured):
        python -m app.features.chat.services.data_source_agent.commercial_hub_service "your query here"
    """

    async def _main() -> None:
        query = (
            "tax advisory services for large enterprises"
        )

        service = CommercialHubService()

        print(f"[CommercialHub] Query: {query}\n")
        result = await service.choose_best_offering_id(user_query=query)

        print("\n=== Commercial Hub Test Result ===")
        print(json.dumps(result, indent=2))

    asyncio.run(_main())
