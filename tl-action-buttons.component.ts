import asyncio
import json
import logging
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
import os

load_dotenv()

import httpx

from app.infrastructure.llm.llm_service import LLMService

logger = logging.getLogger(__name__)

BASE_URL = os.environ.get("COMMERCIAL_BASE_URL")
SUBSCRIPTION_KEY = os.environ.get("COMMERCIAL_KEY")
SUBSCRIPTION_VALUE = os.environ.get("COMMERCIAL_VALUE")


def get_llm_service() -> LLMService:
    """Return the shared LLM service instance."""
    return LLMService()


class CommercialHubService:
    """
    Commercial Hub client: fetch offering IDs, select best match via LLM, fetch offering detail by ID.
    """
    def __init__(
        self,
        llm_service: Optional[LLMService] = None,
        timeout: float = 30.0,
    ) -> None:
        self.llm_service = llm_service or get_llm_service()
        self.subscription_key = SUBSCRIPTION_KEY
        self.subscription_value = SUBSCRIPTION_VALUE
        self.request_timeout = timeout

    def build_request_headers(self) -> Dict[str, str]:
        return {
            self.subscription_key: self.subscription_value,
            "Content-Type": "application/json",
        }

    async def fetch_offerings_page(
        self,
        client: httpx.AsyncClient,
        page_number: int,
    ) -> Dict[str, Any]:
        """Fetch a single page of offerings and return the full payload."""
        url = f"{BASE_URL}/offerings"
        try:
            response = await client.get(
                url,
                headers=self.build_request_headers(),
                params={"page": page_number},
                timeout=self.request_timeout,
            )
            response.raise_for_status()
            payload = response.json()
            return payload if isinstance(payload, dict) else {"offerings": payload}
        except Exception as error:
            logger.error("Error fetching offerings page %s: %s", page_number, error)
            return {}

    async def fetch_offering_list(
        self,
        pages: Optional[List[int]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch offering list across all pages dynamically using total_pages from API.
        Fetches page 1 first to discover total_pages, then fetches remaining pages in parallel.
        Returns list of {offering_id, page, offering_name}.
        """
        async with httpx.AsyncClient() as client:
            # Fetch page 1 first to discover total_pages
            first_payload = await self.fetch_offerings_page(client, 1)
            total_pages = first_payload.get("total_pages", 1)
            logger.info("Total pages from API: %s", total_pages)

            # Determine which remaining pages to fetch
            if pages is not None:
                remaining_pages = [p for p in pages if p != 1 and p <= total_pages]
            else:
                remaining_pages = list(range(2, total_pages + 1))

            # Fetch remaining pages in parallel
            extra_payloads = await asyncio.gather(
                *[self.fetch_offerings_page(client, page_no) for page_no in remaining_pages]
            )

        all_payloads = [(1, first_payload)] + list(zip(remaining_pages, extra_payloads))

        offering_list: List[Dict[str, Any]] = []
        for current_page, payload in all_payloads:
            items = (
                payload.get("offerings")
                or payload.get("data")
                or payload.get("results")
                or []
            )
            for item in items:
                if not isinstance(item, dict):
                    continue
                offering_id = item.get("offering_id") or item.get("id") or item.get("offeringId")
                if offering_id:
                    offering_list.append({
                        "offering_id": str(offering_id),
                        "page": current_page,
                        "offering_name": item.get("offering_name") or item.get("name") or item.get("title"),
                    })
        return offering_list

    async def fetch_offering_detail(self, offering_id: str) -> Optional[Dict[str, Any]]:
        """Fetch full detail for a single offering by ID."""
        if not offering_id:
            return None

        url = f"{BASE_URL}/offering/{offering_id}"
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

    async def fetch_offering_tree(self, offering_id: str) -> Optional[Dict[str, Any]]:
        """Fetch tree for a single offering by ID."""
        if not offering_id:
            return None
        url = f"{BASE_URL}/offering/{offering_id}/tree"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    headers=self.build_request_headers(),
                    timeout=self.request_timeout,
                )
                response.raise_for_status()
                data = response.json()
                return data if isinstance(data, dict) else {"raw": data}
            except Exception as error:
                logger.error("Error fetching offering tree for %s: %s", offering_id, error)
                return None

    async def fetch_offering_content(self, offering_id: str) -> Optional[Dict[str, Any]]:
        """Fetch content for a single offering by ID."""
        if not offering_id:
            return None
        url = f"{BASE_URL}/offering/{offering_id}/content"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    headers=self.build_request_headers(),
                    timeout=self.request_timeout,
                )
                response.raise_for_status()
                data = response.json()
                return data if isinstance(data, dict) else {"raw": data}
            except Exception as error:
                logger.error("Error fetching offering content for %s: %s", offering_id, error)
                return None

    async def fetch_offering_metadata(self, offering_id: str) -> Optional[Dict[str, Any]]:
        """Fetch metadata for a single offering by ID."""
        if not offering_id:
            return None
        url = f"{BASE_URL}/offering/{offering_id}/metadata"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    headers=self.build_request_headers(),
                    timeout=self.request_timeout,
                )
                response.raise_for_status()
                data = response.json()
                return data if isinstance(data, dict) else {"raw": data}
            except Exception as error:
                logger.error("Error fetching offering metadata for %s: %s", offering_id, error)
                return None

    async def fetch_offering_tree_content_metadata(
        self, offering_id: str
    ) -> Dict[str, Any]:
        """Fetch tree, content, and metadata for an offering in parallel."""
        tree, content, metadata = await asyncio.gather(
            self.fetch_offering_tree(offering_id),
            self.fetch_offering_content(offering_id),
            self.fetch_offering_metadata(offering_id),
        )
        return {"tree": tree, "content": content, "metadata": metadata}

    async def choose_best_offering_id(
        self,
        user_query: str,
        pages: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """
        Fetch offering list, ask LLM to pick best ID, fetch tree/content/metadata for that offering,
        then ask LLM to generate a final response.

        Returns:
            {
                "offering_id": str | None,
                "page": int | None,
                "offering_data": dict,   # raw tree/content/metadata
                "final_response": str | None,  # human-readable version of all data
            }
        """
        offering_list = await self.fetch_offering_list(pages=pages)
        if not offering_list:
            return {
                "offering_id": None,
                "page": None,
                "offering_data": None,
                "final_response": None,
            }

        offering_id_to_page = {o["offering_id"]: o["page"] for o in offering_list}

        system_prompt = (
            "You are a PwC Commercial Hub assistant.\n"
            "You will receive a user query and a list of offerings (offering_id, page, offering_name).\n"
            "Your ONLY task is to return the single best-matching offering_id from this list.\n"
            "Do not explain. Respond with the ID only."
        )
        user_prompt = json.dumps({"user_query": user_query, "offerings": offering_list}, indent=2)
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
        logger.info("LLM selected offering ID: %s (page %s)", selected_offering_id, selected_page)

        final_response = None
        offering_data: Dict[str, Any] = {}
        if selected_offering_id:
            offering_data = await self.fetch_offering_tree_content_metadata(selected_offering_id)
            response_prompt = (
                "You are a formatting assistant for PwC Commercial Hub data.\n"
                "You will receive structured JSON for a single offering (tree, content, metadata).\n"
                "Your task is to present ALL of this information in a clear, human-readable markdown format.\n"
                "Write it as one coherent explanation for the user, not split into separate sections called 'Tree', 'Content', or 'Metadata'.\n"
                "You may still use bullets and paragraphs, but do not introduce headings named 'Tree', 'Content', or 'Metadata'.\n"
                "If there are links or citations anywhere in the data, include them inline where they are relevant.\n"
                "Very important:\n"
                "- Do NOT drop, skip, or summarize away any information.\n"
                "- Preserve and display all links, citations, bullet points, headings, and sections that already exist in the data.\n"
                "- You may reorder slightly for clarity but every piece of content must appear somewhere.\n"
                "- If something is already human-readable text or HTML, include it as-is (do not strip links).\n"
            )
            response_user = json.dumps(
                {"user_query": user_query, "offering_data": offering_data},
                indent=2,
                default=str,
            )
            try:
                final_response = await self.llm_service.chat_completion(
                    messages=[
                        {"role": "system", "content": response_prompt},
                        {"role": "user", "content": response_user},
                    ],
                    temperature=0.0,
                )
                final_response = (final_response or "").strip()
            except Exception as error:
                logger.error("LLM final response failed: %s", error)
                final_response = None

        return {
            "offering_id": selected_offering_id,
            "page": selected_page,
            "offering_data": offering_data,
            "final_response": final_response,
        }


if __name__ == "__main__":
    async def run_main() -> None:
        query = "explain about ai engineering"
        service = CommercialHubService()
        print(f"[CommercialHub] Query: {query}\n")
        result = await service.choose_best_offering_id(user_query=query)
        print("\n=== Commercial Hub Test Result ===")
        if result.get("final_response"):
            print("\n--- Final response ---\n")
            print(result["final_response"])

    asyncio.run(run_main())
