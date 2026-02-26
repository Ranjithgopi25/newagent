"""
LangGraph Agent for Data Source Integration.
Uses tool calling to intelligently fetch data from multiple sources.
"""
import time
import os
import json
import logging
from typing import List, Dict, Any, Optional, AsyncIterator, Annotated, TypedDict
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from app.core.deps import get_llm_service
from app.infrastructure.llm.llm_service import LLMService
from .prompts import SYSTEM_PROMPT
from .tools import get_all_tools, set_services
from .factiva_service import FactivaService
from .capitaliq_service import CapitalIQService
from .boardex_service import BoardExService
from .ai_search_service import AISearchService
from .connected_source import PassageRetrievalService
from .tavily_service import TavilyService
from .benchmarking_service import BenchmarkingAPIClient
from .css_service import CSSService
from app.features.thought_leadership.services.refine_content_service import RefineContentService
from app.core.config import get_settings
settings = get_settings()
AI_SEARCH_CONFIG = {
    "endpoint": settings.AI_SEARCH_ENDPOINT,
    "index_name": settings.AI_SEARCH_INDEX_NAME,
    "api_key": settings.AI_SEARCH_API_KEY
}

logger = logging.getLogger(__name__)

class AgentState(TypedDict):
    """State for the agent graph."""
    messages: Annotated[List[BaseMessage], add_messages]

llm_service = get_llm_service()

class DataSourceLangGraphAgent:
    """
    LangGraph-based agent for data source integration.
    Uses tool calling for intelligent routing to data sources.
    """
    
    def __init__(
        self,
        azure_endpoint: Optional[str] = None,
        api_key: Optional[str] = None,
        api_version: Optional[str] = None,
        deployment_name: Optional[str] = None
    ):
        """Initialize the agent with Azure OpenAI and data source services."""
        
        # Get config from environment if not provided
        self.azure_endpoint = azure_endpoint or os.getenv("AI_ENDPOINT")
        self.api_key = api_key or os.getenv("AI_API_KEY")
        self.api_version = api_version or os.getenv("AI_API_VERSION", "2024-08-01-preview")
        self.deployment_name = deployment_name or os.getenv("AI_MODEL_NAME", "gpt-4o")
        self.passage_retrieval_service = PassageRetrievalService(
                api_url=settings.PASSAGE_RETRIEVAL_API_URL,
                subscription_key=settings.PASSAGE_RETRIEVAL_SUBSCRIPTION_KEY,
                sc_apikey=settings.PASSAGE_RETRIEVAL_SC_APIKEY
            )
        
        if not self.azure_endpoint or not self.api_key:
            raise ValueError("Azure OpenAI endpoint and API key are required")
        
        # Initialize LLM
        self.llm = AzureChatOpenAI(
            azure_endpoint=self.azure_endpoint,
            api_key=self.api_key,
            api_version=self.api_version,
            azure_deployment=self.deployment_name,
            temperature=0.3,
            streaming=True
        )
        self.ai_search_service = AISearchService(
            endpoint=AI_SEARCH_CONFIG["endpoint"],
            index_name=AI_SEARCH_CONFIG["index_name"],
            api_key=AI_SEARCH_CONFIG["api_key"]
        )
        # Initialize data source services
        self.factiva_service = FactivaService()
        self.capitaliq_service = CapitalIQService()
        self.boardex_service = BoardExService()
        self.refine_service = RefineContentService(llm_service=LLMService())
        self.passage_retrieval_service = PassageRetrievalService()
        self.tavily_service = TavilyService(api_key=settings.TAVILY_API_KEY)
        self.benchmarking_service = BenchmarkingAPIClient()
        self.css_service = CSSService()
        # logger.info("[DataSourceAgent] Tavily service initialized")
        self.tool_usage_tracker = []
        
        # Inject services into tools
        set_services(
            factiva=self.factiva_service,
            capitaliq=self.capitaliq_service,
            boardex=self.boardex_service,
            ai_search=self.ai_search_service,
            refine=self.refine_service,
            passage_retrieval=self.passage_retrieval_service,
            tavily=self.tavily_service,
            benchmarking=self.benchmarking_service,
            css=self.css_service
        )
        
        # Get tools and bind to LLM
        self.tools = get_all_tools()
        tool_names = [tool.name for tool in self.tools]
        logger.info(f"[DataSourceAgent] Tools registered: {tool_names}")
        self.llm_with_tools = self.llm.bind_tools(self.tools)
        
        # Build the graph
        self.graph = self._build_graph()
        
        # logger.info(f"[DataSourceAgent] Initialized with {len(self.tools)} tools")
    
    def clear_tool_tracker(self):
        """Clear tool usage tracker for new request."""
        self.tool_usage_tracker = []
        logger.debug("[DataSourceAgent] Tool tracker cleared")
    
    def get_tool_usage_summary(self) -> str:
        """Generate a summary of which tools were used."""
        if not self.tool_usage_tracker:
            return ""
        
        tool_counts = {}
        for usage in self.tool_usage_tracker:
            tool_name = usage['tool']
            tool_counts[tool_name] = tool_counts.get(tool_name, 0) + 1
        
        # Map tool names to human-readable descriptions
        tool_descriptions = {
            'search_factiva_news': 'Factiva News (external news and media coverage)',
            'search_internal_knowledge': 'Internal Knowledge Base (company documents)',
            'query_capitaliq_financials': 'CapitalIQ Financials (income statements)',
            'query_capitaliq_balance_sheet': 'CapitalIQ Balance Sheets (assets & liabilities)',
            'query_boardex_advisors': 'BoardEx Advisors (auditor relationships)',
            'query_boardex_achievements': 'BoardEx Achievements (executive awards)',
            'retrieve_knowledge_passages': 'Connected Source (PwC knowledge base)',
            'extract_web_content': 'Web Extraction (URL content)',
            'search_benchmarking': 'Benchmarking API (operational KPIs)',
            'search_web_tavily': 'Tavily Web Search (comprehensive web results)',
            'search_css_stories': 'Client Success Stories (CSS - PwC engagement examples)',
            'generate_powerpoint_presentation': 'PowerPoint Generation',
            'refine_content': 'Content Refinement',
            'translate_content_format': 'Format Translation'
        }
        
        summary_lines = ["**Information Sources:**"]
        for tool_name, count in tool_counts.items():
            description = tool_descriptions.get(tool_name, tool_name)
            summary_lines.append(f"- {description} ({count} call{'s' if count > 1 else ''})")
        
        return "\n".join(summary_lines)
    
    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow."""
        
        # Create graph
        graph_builder = StateGraph(AgentState)
        
        # Add nodes
        graph_builder.add_node("agent", self._agent_node)
        graph_builder.add_node("tools", ToolNode(tools=self.tools))
        
        # Add edges
        graph_builder.add_edge(START, "agent")
        graph_builder.add_conditional_edges(
            "agent",
            self._should_continue,
            {
                "continue": "tools",
                "end": END
            }
        )
        graph_builder.add_edge("tools", "agent")
        
        # Compile
        return graph_builder.compile()
    

    def _filter_competitor_sources(self, sources: Dict[str, str]) -> Dict[str, str]:
            """Remove competitor domains from sources."""
            competitor_domains = [
                'deloitte.com',
                'mckinsey.com',
                'ey.com',
                'kpmg.com',
                'bcg.com'
            ]
            filtered = {}
            for url, title in sources.items():
                if not any(domain in url.lower() for domain in competitor_domains):
                    filtered[url] = title
                else:
                    logger.info(f"[DataSourceAgent] Filtered competitor URL: {url}")
            return filtered
    
    async def _agent_node(self, state: AgentState) -> Dict[str, Any]:
        """Agent node that decides what to do next."""
        messages = state["messages"]
        
        # Add system prompt if not present
        if not any(isinstance(m, SystemMessage) for m in messages):
            messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages
        
        response = await self.llm_with_tools.ainvoke(messages)
        
        if hasattr(response, 'tool_calls') and response.tool_calls:
            for tool_call in response.tool_calls:
                tool_name = tool_call.get('name') or tool_call.get('function', {}).get('name')
                if tool_name:
                    self.tool_usage_tracker.append({
                        'tool': tool_name,
                        'timestamp': __import__('datetime').datetime.now().isoformat()
                    })
                    logger.info(f"[Agent] Tool tracked: {tool_name}")

            else:
                logger.warning(f"[DataSourceAgent]   ⚠️ NO TOOL CALLS - LLM decided not to use tools")
        
        return {"messages": [response]}
    
    def _should_continue(self, state: AgentState) -> str:
        """Determine if we should continue to tools or end."""
        last_message = state["messages"][-1]
        
        # If there are tool calls, continue to tools node
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "continue"
        
        return "end"
    
    def _extract_sources_with_titles(self, content: str) -> Dict[str, str]:
        """
        Extract source titles and URLs from tool output content.
        Returns dict mapping URL -> Title
        
        Handles multiple formats:
        1. **1. Title** (Relevance: 0.89)\n**URL:** https://...
        2. **Title**\n**URL:** https://...
        3. [Title](URL)
        4. Plain URLs in **Sources:** section
        """
        import re
        
        sources = {}  # {URL: Title}
        
        # Pattern 1: Numbered results with titles and URLs
        # **1. General information: Overview, definition, and example - Cobrief** (Relevance: 0.89)
        # **URL:** https://www.cobrief.app/...
        pattern1 = r'\*\*\d+\.\s+([^*]+?)\*\*[^\n]*?\n\*\*URL:\*\*\s+(https?://[^\s\)]+)'
        matches1 = re.findall(pattern1, content, re.DOTALL)
        for title, url in matches1:
            title = title.strip()
            # Remove relevance score from title if present
            title = re.sub(r'\s*\(Relevance:.*?\)$', '', title)
            sources[url] = title
        
        # Pattern 2: Connected Source format (if applicable)
        # Look for document titles and entity URLs from passage retrieval
        # This pattern may vary based on your actual Connected Source output format
        passage_pattern = r'"document":\s*\{\s*"title":\s*"([^"]+)"[^}]*"entityurl":\s*"([^"]+)"'
        matches2 = re.findall(passage_pattern, content)
        for title, url in matches2:
            sources[url] = title
        
        # Pattern 3: Markdown links [Title](URL)
        pattern3 = r'\[([^\]]+)\]\((https?://[^\)]+)\)'
        matches3 = re.findall(pattern3, content)
        for title, url in matches3:
            if url not in sources:  # Don't overwrite better titles
                sources[url] = title
        
        # Pattern 4: Plain URLs (fallback - no title available)
        # Only capture URLs that aren't already in sources
        pattern4 = r'https?://[^\s\)\]\n]+'
        matches4 = re.findall(pattern4, content)
        for url in matches4:
            if url not in sources:
                sources[url] = ""  # Empty title
        
        # Clean up titles
        for url in sources:
            if sources[url]:
                # Remove extra whitespace and truncate if too long
                sources[url] = sources[url].strip()
                if len(sources[url]) > 100:
                    sources[url] = sources[url][:97] + "..."
        
        logger.info(f"[DataSourceAgent] Extracted {len(sources)} sources from tool output")
        
        return sources
    
    def _convert_messages(self, messages: List[Dict[str, Any]]) -> List[BaseMessage]:
        """Convert dict messages to LangChain message objects."""
        converted = []
        
        for msg in messages:
            # Handle both dict and Pydantic message objects
            if isinstance(msg, dict):
                role = msg.get("role", "user")
                content = msg.get("content", "")
            else:
                # Assume it's a Pydantic message object with role and content attributes
                role = getattr(msg, "role", "user")
                content = getattr(msg, "content", "")
            
            if role == "user":
                converted.append(HumanMessage(content=content))
            elif role == "assistant":
                converted.append(AIMessage(content=content))
            elif role == "system":
                converted.append(SystemMessage(content=content))
        
        return converted
    
    async def invoke(self, messages: List[Dict[str, Any]]) -> str:
        """
        Invoke the agent synchronously (non-streaming).
        
        Args:
            messages: List of message dicts with 'role' and 'content'
        
        Returns:
            The agent's final response
        """
        return await self.process_query(messages)
    
    async def process_query(self, messages: List[Dict[str, Any]]) -> str:
        """
        Process a query through the agent.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
        
        Returns:
            The agent's final response
        """
        try:
            start_time = time.time()
            langchain_messages = self._convert_messages(messages)
            
            logger.info(f"[DataSourceAgent] Processing {len(messages)} messages")
            
            # Run the graph
            result = await self.graph.ainvoke({
                "messages": langchain_messages
            })
            
            
            response_content = ""
            collected_sources = {}
            if result and "messages" in result:
                # Extract response and collect URLs from tool calls
                for msg in result["messages"]:
                    # Check if message contains tool results
                    if hasattr(msg, 'content') and isinstance(msg.content, str):
                        # Extract source name and URL pairs from tool results
                        sources = self._extract_sources_with_titles(msg.content)
                        sources = self._filter_competitor_sources(sources)
                        collected_sources.update(sources)
                    
                    # Get final AI response
                    if isinstance(msg, AIMessage) and not msg.tool_calls:
                        response_content = msg.content

            if collected_sources and "**Sources:**" not in response_content:
                response_content += "\n\n**Sources:**\n"
                for url, title in collected_sources.items():
                    if title:
                        response_content += f"- [{title}]({url})\n"
                    else:
                        response_content += f"- {url}\n"
            
            # Append tool usage summary
            tool_summary = self.get_tool_usage_summary()
            if tool_summary:
                logger.info(f"[DataSourceAgent] Tool Usage Summary:\n{tool_summary}")
                response_content += f"\n\n---\n{tool_summary}"
            elapsed = time.time() - start_time
            logger.info(f"[DataSourceAgent] Query processed in {elapsed:.2f} seconds")
            return response_content
            
        except Exception as e:
            elapsed = time.time() - start_time
            logger.info(f"[DataSourceAgent] Query failed after {elapsed:.2f} seconds")
            logger.error(f"[DataSourceAgent] Error: {e}", exc_info=True)
            raise
    
    async def stream_query(self, messages: List[Dict[str, Any]]) -> AsyncIterator[Dict[str, Any]]:
        """
        Stream a query through the agent.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
        
        Yields:
            Event dicts with type and content
        """
        try:
            langchain_messages = self._convert_messages(messages)
            
            # logger.info(f"[DataSourceAgent] Streaming {len(messages)} messages")
            
            async for event in self.graph.astream_events(
                {"messages": langchain_messages},
                version="v2"
            ):
                kind = event.get("event")
                
                if kind == "on_chat_model_stream":
                    content = event.get("data", {}).get("chunk")
                    if hasattr(content, "content") and content.content:
                        yield {"type": "content", "data": content.content}
                
                elif kind == "on_tool_start":
                    tool_name = event.get("name", "unknown")
                    yield {"type": "tool_start", "data": f"Searching {tool_name}..."}
                
                elif kind == "on_tool_end":
                    tool_name = event.get("name", "unknown")
                    yield {"type": "tool_end", "data": f"Completed {tool_name}"}
            
            yield {"type": "done", "data": None}
            
        except Exception as e:
            logger.error(f"[DataSourceAgent] Streaming error: {e}", exc_info=True)
            yield {"type": "error", "data": str(e)}
    
    async def stream_invoke(self, messages: List[Dict[str, Any]]) -> AsyncIterator[str]:
        """
        Stream invoke the agent (returns SSE formatted strings for frontend).
        
        Args:
            messages: List of message dicts with 'role' and 'content'
        
        Yields:
            SSE formatted strings: "data: {json}\n\n"
        """
        try:
            async for event in self.stream_query(messages):
                event_type = event.get("type", "")
                event_data = event.get("data", "")
                
                if event_type == "content" and event_data:
                    # Yield content chunks in SSE format
                    yield f"data: {json.dumps({'type': 'content', 'content': event_data})}\n\n"
                elif event_type == "done":
                    # Signal completion
                    yield f"data: {json.dumps({'type': 'done', 'done': True})}\n\n"
                elif event_type == "error":
                    # Signal error
                    yield f"data: {json.dumps({'type': 'error', 'error': event_data})}\n\n"
        except Exception as e:
            logger.error(f"[DataSourceAgent] Stream invoke error: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
    
    def close(self):
        """Close all service connections."""
        self.capitaliq_service.close()
        self.boardex_service.close()


def create_data_source_agent(
    azure_endpoint: Optional[str] = None,
    api_key: Optional[str] = None,
    api_version: Optional[str] = None,
    deployment_name: Optional[str] = None
) -> DataSourceLangGraphAgent:
    """Factory function to create a DataSourceLangGraphAgent."""
    return DataSourceLangGraphAgent(
        azure_endpoint=azure_endpoint,
        api_key=api_key,
        api_version=api_version,
        deployment_name=deployment_name
    )
