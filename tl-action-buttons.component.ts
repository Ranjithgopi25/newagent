import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.infrastructure.llm.llm_service import LLMService

logger = logging.getLogger(__name__)

APIM_SUBSCRIPTION_KEY = "fdf33c3ce6b7411f93f17840088ba384"
TOTAL_PAGES = 4


def get_llm_service() -> LLMService:
    """Return the shared LLM service instance."""
    return LLMService()


class CommercialHubService:
    """
    Commercial Hub client: fetch offering IDs, select best match via LLM, fetch offering detail by ID.
    """

    BASE_URL = "https://gif-apim-glb.pwcinternal.com/commercialhub"

    def __init__(
        self,
        llm_service: Optional[LLMService] = None,
        subscription_key: Optional[str] = None,
        timeout: float = 30.0,
    ) -> None:
        self.llm_service = llm_service or get_llm_service()
        self.subscription_key = subscription_key or APIM_SUBSCRIPTION_KEY
        self.request_timeout = timeout

    def build_request_headers(self) -> Dict[str, str]:
        return {
            "Ocp-Apim-Subscription-Key": self.subscription_key,
            "Content-Type": "application/json",
        }

    async def fetch_offerings_page(
        self,
        client: httpx.AsyncClient,
        page_number: int,
    ) -> List[Dict[str, Any]]:
        """Fetch a single page of offerings and return the list of items."""
        url = f"{self.BASE_URL}/offerings"
        try:
            response = await client.get(
                url,
                headers=self.build_request_headers(),
                params={"page": page_number},
                timeout=self.request_timeout,
            )
            response.raise_for_status()
            payload = response.json()
            if isinstance(payload, list):
                return payload
            return payload.get("data") or payload.get("offerings") or payload.get("results") or []
        except Exception as error:
            logger.error("Error fetching offerings page %s: %s", page_number, error)
            return []

    async def fetch_all_offering_ids(
        self,
        pages: Optional[List[int]] = None,
    ) -> List[Tuple[str, int]]:
        """
        Fetch all offering IDs across pages 1–4 in parallel.
        Returns list of (offering_id, page_number).
        """
        page_numbers = pages if pages is not None else list(range(1, TOTAL_PAGES + 1))

        async with httpx.AsyncClient() as client:
            page_results = await asyncio.gather(
                *[self.fetch_offerings_page(client, page_no) for page_no in page_numbers]
            )

        offering_id_page_pairs: List[Tuple[str, int]] = []
        for current_page, items in zip(page_numbers, page_results):
            for item in items:
                if not isinstance(item, dict):
                    continue
                offering_id = item.get("offering_id") or item.get("id") or item.get("offeringId")
                if offering_id:
                    offering_id_page_pairs.append((str(offering_id), current_page))

        id_total = len(offering_id_page_pairs)
        logger.info("Fetched %d offering IDs across pages %s", id_total, page_numbers)
        print(f"[CommercialHub] ID total: {id_total}")
        print(f"[CommercialHub] Offering IDs: {[pair[0] for pair in offering_id_page_pairs]}")
        return offering_id_page_pairs

    async def fetch_offering_detail(self, offering_id: str) -> Optional[Dict[str, Any]]:
        """Fetch full detail for a single offering by ID."""
        if not offering_id:
            return None

        url = f"{self.BASE_URL}/offering/{offering_id}"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    headers=self.build_request_headers(),
                    timeout=self.request_timeout,
                )
                response.raise_for_status()
                data = response.json()
                return data if isinstance(data, dict) else None
            except Exception as error:
                logger.error("Error fetching offering detail for %s: %s", offering_id, error)
                return None

    async def choose_best_offering_id(
        self,
        user_query: str,
        pages: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """
        Fetch offering IDs, get full details, ask LLM for best match.
        Returns: {"offering_id": "<id>", "page": <1-4>}.
        """
        offering_id_page_pairs = await self.fetch_all_offering_ids(pages=pages)
        if not offering_id_page_pairs:
            return {"offering_id": None, "page": None}

        offering_id_to_page = {offering_id: current_page for offering_id, current_page in offering_id_page_pairs}

        offering_ids = [pair[0] for pair in offering_id_page_pairs]
        details = await asyncio.gather(*[self.fetch_offering_detail(oid) for oid in offering_ids])

        offerings_for_llm = [
            {"offering_id": offering_id, "page": current_page, "detail": detail}
            for (offering_id, current_page), detail in zip(offering_id_page_pairs, details)
            if isinstance(detail, dict)
        ]

        if not offerings_for_llm:
            return {"offering_id": None, "page": None}

        system_prompt = (
            "You are a PwC Commercial Hub assistant.\n"
            "You will receive a user query and a list of offering objects.\n"
            "Each object has: offering_id, page, and a 'detail' dict from the API.\n"
            "Your ONLY task is to return the single best-matching offering_id from this list.\n"
            "Do not explain your choice. Respond with the ID only."
        )
        user_prompt = json.dumps({"user_query": user_query, "offerings": offerings_for_llm}, indent=2)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        try:
            llm_response = await self.llm_service.chat_completion(messages=messages, temperature=0.0)
            selected_offering_id = (llm_response or "").strip()
        except Exception as error:
            logger.error("LLM call failed: %s", error)
            selected_offering_id = ""

        selected_page = offering_id_to_page.get(selected_offering_id) if selected_offering_id else None
        matched = next((o for o in offerings_for_llm if o.get("offering_id") == selected_offering_id), None)
        detail = (matched.get("detail") or {}) if matched else {}
        matched_name = detail.get("offering_name") or detail.get("name") or detail.get("title")
        logger.info("LLM selected offering ID: %s (page %s)", selected_offering_id, selected_page)
        print(f"[CommercialHub] Matched offering: offering_id={selected_offering_id}, offering_name={matched_name}")

        return {"offering_id": selected_offering_id, "page": selected_page}


if __name__ == "__main__":
    """
    Manual test runner.
    Usage: python -m app.features.chat.services.data_source_agent.commercial_hub_service
    """

    async def run_main() -> None:
        query = "tax advisory services for large enterprises"
        service = CommercialHubService()
        print(f"[CommercialHub] Query: {query}\n")
        result = await service.choose_best_offering_id(user_query=query)
        print("\n=== Commercial Hub Test Result ===")
        print(json.dumps(result, indent=2))

    asyncio.run(run_main())
