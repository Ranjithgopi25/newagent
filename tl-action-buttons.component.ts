"""
Commercial Hub API Service.
Production-hardened async client for PwC Commercial Hub gateway.
"""

import asyncio
import logging
import os
from typing import Any, Dict, List, Optional, Tuple, Union

import httpx

logger = logging.getLogger(__name__)

JsonType = Union[Dict[str, Any], List[Any]]

BASE_URL = "https://gif-apim-glb.pwcinternal.com/commercialhub"
ENV_SUBSCRIPTION_KEY = "COMMERCIAL_HUB_SUBSCRIPTION_KEY"
ENV_CA_PATH = "COMMERCIAL_HUB_CA_PATH"

# Max retries for transient HTTP errors
MAX_RETRIES = 3
SUMMARY_TEXT_MAX_LEN = 500


class CommercialHubService:
    """Fetch offerings and related data from Commercial Hub API; logs parse hints."""

    def __init__(
        self,
        base_url: str = BASE_URL,
        subscription_key: Optional[str] = None,
        timeout: float = 60.0,
        verify: Union[bool, str] = True,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.subscription_key = subscription_key or os.getenv(ENV_SUBSCRIPTION_KEY)
        if not self.subscription_key:
            raise ValueError(
                "COMMERCIAL_HUB_SUBSCRIPTION_KEY is required: set env or pass subscription_key"
            )
        self.timeout = timeout
        self._verify = os.getenv(ENV_CA_PATH) or verify
        self._headers = {
            "Ocp-Apim-Subscription-Key": self.subscription_key,
            "Accept": "application/json",
        }
        self._client: Optional[httpx.AsyncClient] = None

    def build_url(self, path: str) -> str:
        return f"{self.base_url}/{path.lstrip('/')}"

    async def get_http_client(self) -> httpx.AsyncClient:
        """Lazily create and reuse a single AsyncClient."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                headers=self._headers,
                timeout=self.timeout,
                verify=self._verify,
            )
            logger.debug("[CommercialHub] AsyncClient created")
        return self._client

    async def aclose(self) -> None:
        """Close the HTTP client. Call when shutting down the app."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None
            logger.debug("[CommercialHub] AsyncClient closed")

    async def _get(
        self,
        path: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> JsonType:
        url = self.build_url(path)
        last_error: Optional[Exception] = None
        for attempt in range(MAX_RETRIES):
            try:
                logger.info("[CommercialHub] GET %s (attempt %s)", url, attempt + 1)
                client = await self.get_http_client()
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json()
            except (httpx.HTTPStatusError, httpx.TimeoutException) as e:
                last_error = e
                status = getattr(e, "response", None)
                status_code = status.status_code if status else None
                logger.error(
                    "[CommercialHub] Request failed %s status=%s error=%s",
                    url,
                    status_code,
                    e,
                )
                if attempt == MAX_RETRIES - 1:
                    raise
                delay = 2**attempt
                logger.info("[CommercialHub] Retry in %s s", delay)
                await asyncio.sleep(delay)
        if last_error:
            raise last_error
        raise RuntimeError("[CommercialHub] Unexpected retry loop exit")

    @staticmethod
    def log_parse_structure(label: str, data: Any) -> None:
        """Log response shape and basic parse guidance."""
        logger.debug("[CommercialHub] %s type: %s", label, type(data).__name__)
        if isinstance(data, list):
            logger.debug("[CommercialHub] %s length: %s", label, len(data))
            if data and isinstance(data[0], dict):
                logger.debug(
                    "[CommercialHub] %s first item keys: %s",
                    label,
                    list(data[0].keys()),
                )
                logger.debug(
                    "[CommercialHub] Parse: for item in data: item.get('<key>')"
                )
        elif isinstance(data, dict):
            keys = list(data.keys())
            logger.debug("[CommercialHub] %s keys: %s", label, keys)
            for k, v in data.items():
                if isinstance(v, dict):
                    logger.debug(
                        "[CommercialHub] data[%r] keys: %s", k, list(v.keys())
                    )
                    break
                if isinstance(v, list) and v and isinstance(v[0], dict):
                    logger.debug(
                        "[CommercialHub] data[%r][0] keys: %s",
                        k,
                        list(v[0].keys()),
                    )
                    break
            logger.debug(
                "[CommercialHub] Parse: data.get('<key>') or "
                "data.get('<key>', {}).get('<nested>')"
            )

    @staticmethod
    def normalize_offerings(data: Any) -> List[Dict[str, Any]]:
        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict)]
        if isinstance(data, dict):
            for key in ("offerings", "items", "results"):
                value = data.get(key)
                if isinstance(value, list):
                    return [item for item in value if isinstance(item, dict)]
            logger.warning(
                "[CommercialHub] Could not locate offerings list; top-level keys: %s",
                list(data.keys()),
            )
        else:
            logger.warning(
                "[CommercialHub] Could not locate offerings list; response type: %s",
                type(data).__name__,
            )
        return []

    @staticmethod
    def find_best_offering(
        offerings: List[Dict[str, Any]],
        query: str,
    ) -> Optional[Dict[str, Any]]:
        q = query.lower().strip()
        if not q or not offerings:
            return None
        q_tokens = set(q.split())
        fields = ["name", "title", "offeringName", "displayName"]
        best_score = 0.0
        best_offering: Optional[Dict[str, Any]] = None
        for offer in offerings:
            for field in fields:
                value = offer.get(field)
                if not isinstance(value, str):
                    continue
                v = value.lower()
                # Exact / prefix / substring bonus
                if v == q:
                    score = 10.0
                elif v.startswith(q):
                    score = 5.0
                elif q in v:
                    score = 2.0
                else:
                    v_tokens = set(v.split())
                    overlap = len(q_tokens & v_tokens) if q_tokens else 0
                    score = (overlap / len(q_tokens)) * 3.0 if q_tokens else 0.0
                if score > 0:
                    logger.debug(
                        "[CommercialHub] Match on %r: %r (score=%.2f)",
                        field,
                        value,
                        score,
                    )
                if score > best_score:
                    best_score = score
                    best_offering = offer
        if best_offering:
            oid = CommercialHubService.get_offering_id(best_offering)
            logger.debug("[CommercialHub] Selected offering id: %s (score=%.2f)", oid, best_score)
        return best_offering

    @staticmethod
    def get_offering_id(offer: Dict[str, Any]) -> Optional[str]:
        """Extract offering identifier from common field names."""
        for key in ("offeringId", "id", "offering_id", "code"):
            value = offer.get(key)
            if value is not None:
                return str(value)
        return None

    async def fetch_offerings(self) -> JsonType:
        data = await self._get("/offerings")
        self.log_parse_structure("/offerings", data)
        return data

    async def get_offering(self, offering_id: str) -> JsonType:
        data = await self._get(f"/offering/{offering_id}")
        self.log_parse_structure(f"/offering/{offering_id}", data)
        return data

    async def get_offering_tree(self, offering_id: str) -> JsonType:
        data = await self._get(f"/offering/{offering_id}/tree")
        self.log_parse_structure(f"/offering/{offering_id}/tree", data)
        return data

    async def get_offering_content(self, offering_id: str) -> JsonType:
        data = await self._get(f"/offering/{offering_id}/content")
        self.log_parse_structure(f"/offering/{offering_id}/content", data)
        return data

    async def get_offering_metadata(self, offering_id: str) -> JsonType:
        data = await self._get(f"/offering/{offering_id}/metadata")
        self.log_parse_structure(f"/offering/{offering_id}/metadata", data)
        return data

    async def find_offering_by_query(
        self,
        query: str,
    ) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
        """Resolve user query to an offering id and record."""
        raw_data = await self.fetch_offerings()
        offerings = self.normalize_offerings(raw_data)
        if not offerings:
            logger.warning("[CommercialHub] No offerings in /offerings response.")
            return None, None

        best = self.find_best_offering(offerings, query)
        if not best:
            logger.warning("[CommercialHub] No offering matched query: %s", query)
            return None, None

        offering_id = self.get_offering_id(best)
        if offering_id:
            logger.info("[CommercialHub] Using offering id: %s", offering_id)
        else:
            logger.warning(
                "[CommercialHub] Matched offering has no id field; inspect record manually."
            )
            logger.debug("[CommercialHub] Offering record: %s", best)
        return offering_id, best

    async def fetch_full_offering_for_query(
        self,
        query: str,
    ) -> Dict[str, Any]:
        """High-level helper: query → offering id → all related endpoints (parallel)."""
        logger.info("[CommercialHub] Resolving query to offering id: %s", query)
        offering_id, offering_record = await self.find_offering_by_query(query)
        if not offering_id:
            logger.warning("[CommercialHub] No offering found for query.")
            return {
                "error": "No offering found",
                "query": query,
                "offering": offering_record,
            }

        logger.info("[CommercialHub] Fetching full data for offering_id: %s", offering_id)
        offering, tree, content, metadata = await asyncio.gather(
            self.get_offering(offering_id),
            self.get_offering_tree(offering_id),
            self.get_offering_content(offering_id),
            self.get_offering_metadata(offering_id),
        )
        logger.debug(
            "[CommercialHub] Result keys: result['offering'], result['tree'], "
            "result['content'], result['metadata']"
        )
        return {
            "query": query,
            "offering_id": offering_id,
            "offering": offering,
            "offering_record_from_search": offering_record,
            "tree": tree,
            "content": content,
            "metadata": metadata,
        }


def summarize_for_prompt(result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build a compact summary for LLM prompt (avoids token explosion and leakage).
    Production pipelines should use central LLM service and retrieval layer.
    """
    summary: Dict[str, Any] = {}
    offering = result.get("offering")
    if isinstance(offering, dict):
        name = offering.get("name") or offering.get("title") or offering.get("offeringName")
        desc = offering.get("description") or offering.get("summary") or ""
        if isinstance(desc, str) and len(desc) > SUMMARY_TEXT_MAX_LEN:
            desc = desc[:SUMMARY_TEXT_MAX_LEN] + "..."
        summary["offering_name"] = name
        summary["offering_description"] = desc
    content = result.get("content")
    if isinstance(content, list):
        summary["content_count"] = len(content)
        snippets = []
        for i, item in enumerate(content[:3]):
            if isinstance(item, dict):
                text = item.get("text") or item.get("body") or item.get("title") or str(item)[:200]
                if isinstance(text, str) and len(text) > 200:
                    text = text[:200] + "..."
                snippets.append(text)
        summary["content_preview"] = snippets
    else:
        summary["content_count"] = 0
    meta = result.get("metadata")
    if isinstance(meta, dict):
        summary["metadata_keys"] = list(meta.keys())
    return summary


async def test_user_query(
    query: str = "could you please write about captial workhub parse",
) -> None:
    """
    Dev helper: user query → Commercial Hub fetch → compact prompt for LLM → simulated response.
    Production LLM pipeline should use central LLM service and retrieval layer.
    """
    service = CommercialHubService()
    try:
        logger.info("[CommercialHub] User query: %s", query)
        result = await service.fetch_full_offering_for_query(query)
        logger.info("[CommercialHub] Result keys: %s", list(result.keys()))
        if "error" in result:
            logger.warning("[CommercialHub] Error: %s", result["error"])
            return

        offering_id = result.get("offering_id")
        logger.info("[CommercialHub] offering_id: %s", offering_id)
        summary = summarize_for_prompt(result)
        prompt = (
            "You are an assistant that answers questions using PwC Commercial Hub data.\n"
            f"User query: {query}\n"
            f"Offering id: {offering_id}\n"
            "Use the summary below to answer clearly (do not invent data).\n"
            f"Summary: {summary}"
        )
        logger.info("[CommercialHub] Prompt to LLM (compact summary): %s", prompt[:500] + "..." if len(prompt) > 500 else prompt)
        simulated_response = (
            "LLM would use the summary above to generate a natural language answer."
        )
        logger.info("[CommercialHub] Simulated LLM response: %s", simulated_response)
    finally:
        await service.aclose()


if __name__ == "__main__":
    asyncio.run(test_user_query())
