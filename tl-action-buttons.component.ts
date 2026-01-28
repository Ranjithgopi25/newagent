from typing import TypedDict, Optional, List, Literal, AsyncGenerator, Dict
from httpcore import request
from langgraph.graph import StateGraph, END
from app.features.thought_leadership.services.format_translator_service import PlusDocsClient
from langchain_openai import AzureChatOpenAI
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
import logging
from pydantic import BaseModel
from app.core.config import config
import json
import re
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# Define workflow schemas
WORKFLOW_SCHEMAS = {
    "detect_edit_intent": {
        "required": ["user_input"],
        "optional": [],
        "description": "Detect if user input indicates edit/improve/review intent and extract editor names"
    },
    "draft_content": {
        "required": ["topic", "content_type", "outline_doc", "audience_tone"],
        "optional": ["word_limit", "supporting_doc"],
        "description": "Draft new content like articles, blogs, or executive briefs"
    },
    "format_translator": {
        "required": ["content", "target_format"],
        "optional": ["source_format", "customization", "word_limit", "num_slides"],
        "description": "Translate content between formats (Social Media Post, Webpage Ready, Placemat, etc.)"
    },
    "conduct_research": {
        "required": ["research_topic"],
        "optional": ["research_scope", "specific_sources", "depth_level"],
        "description": "Conduct extensive research on any topic with citations and source links"
    },
    "expand_compress_content": {
        "required": ["original_content", "service_type", "expected_word_count"],
        "optional": ["supporting_doc", "expansion_section", "expand_guidelines"],
        "description": "Expand or compress content to a target word count"
    },
    "adjust_tone": {
        "required": ["original_content", "audience_tone"],
        "optional": [],
        "description": "Adjust content tone or target audience"
    },
    "provide_suggestions": {
        "required": ["original_content"],
        "optional": [],
        "description": "Get improvement suggestions for content"
    }
    # "refine_content": {
    #     "required": ["original_content", "service_type"],
    #     "optional": ["expected_word_count", "audience_tone", "supporting_doc", "expansion_section", "expand_guidelines"],
    #     "description": "Refine content by expanding, compressing, adjusting tone, adding research, or getting improvement suggestions"
    # }
}

class AgentState(TypedDict):
    messages: List[dict]
    current_workflow: Optional[str]
    collected_params: dict
    missing_params: List[str]
    user_intent: str
    conversation_history: List[dict]
    execution_result: Optional[dict]

class EditAgentRequest(BaseModel):
    messages: List[dict]

class IntentDetectionResponse(BaseModel):
    is_edit_intent: bool
    confidence: float
    detected_editors: List[str]

class TLAgent:
    """LangGraph agent for orchestrating edit workflows with conversational parameter collection"""
    
    def __init__(self):
        logger.info("t1----------------------------------")
        self.llm = AzureChatOpenAI(
            azure_endpoint=config.AZURE_OPENAI_ENDPOINT,
            api_key=config.AZURE_OPENAI_API_KEY,
            api_version=config.AZURE_OPENAI_API_VERSION,
            deployment_name=config.AZURE_OPENAI_DEPLOYMENT,
            temperature=0.3
        )
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow"""
        workflow = StateGraph(AgentState)
        
        # Add nodes
        workflow.add_node("identify_intent", self._identify_intent)
        workflow.add_node("extract_parameters", self._extract_parameters)
        workflow.add_node("check_completeness", self._check_completeness)
        workflow.add_node("execute_workflow", self._execute_workflow)
        
        # Define edges
        workflow.set_entry_point("identify_intent")
        workflow.add_edge("identify_intent", "extract_parameters")
        workflow.add_edge("extract_parameters", "check_completeness")
        
        # Conditional routing
        workflow.add_conditional_edges(
            "check_completeness",
            self._should_execute,
            {
                "execute": "execute_workflow",
                "ask": END
            }
        )
        
        workflow.add_edge("execute_workflow", END)

        return workflow.compile()
    
    def _identify_intent(self, state: AgentState) -> AgentState:
        """Identify user's workflow intent based on keywords"""
        user_message = state["messages"]
        
        intent_prompt = f"""Analyze the user's request and identify which workflow they need:

    Available workflows:
    {self._format_workflow_descriptions()}

    User message: {user_message}

    Previous workflow: {state.get('current_workflow', 'None')}

    IMPORTANT DISTINCTIONS:
    - If user input contains the words "change", "edit", "editing", "editor", "edits", "revision" or "edited" (case-insensitive), return "detect_edit_intent"
    - If user input contains words like "reformat", "adapt", "repurpose", "social post", "deck", "slide", "slides", "presentation", "placemat", "webpage", "web article", "web", "podcast", return "format_translator"
    - If user input contains words like "whitepaper", "thoughtpaper", "thought leadership article/blog/paper/brief","compose", "author", "produce content", "new article/blog/brief", "draft article/blog/paper/brief", "create article/blog/paper/brief", "write article/blog/paper/brief", "generate article/blog/paper/brief" , return "draft_content"
    - If user says "I want to expand my content", "lengthen", "shorten", "extend", "reduce", "condense", "expand", "compress", "make longer", "make shorter", "shrink"→ return "expand_compress_content"
    - If user says "rephrase", "rewrite for", "tailor to", "audience shift", "adjust tone", "change tone", "different audience" → return "adjust_tone"
    - If user says "guidance", "critique", "recommendations", "what can be improved", "advice", "suggestions", "feedback", "improvements", "review" → return "provide_suggestions"
    - If user says "refine content" or "refine" WITHOUT specifics → return "unclear"

    - If user input contains words like "refine", "improve", "enhance", "polish", "review", "rewrite", "optimize", "update", "fix", "adjust" WITHOUT "edit", return "unclear"
    - If user is having casual conversation, greetings, or small talk, return "unclear"
    - If user input contains words like "reformat", "adapt", "repurpose", "social post", "Adapt content", "translate", "convert", "transform", "change format", "social media post", "webpage", "LinkedIn", "X.com", "Twitter", return "format_translator"
    - If user asks factual questions, requests information, data, statistics, or wants to know about anything (e.g., "what is temp of goa today", "what were sales of maruti 800 in 2008", "tell me about X"), return "conduct_research"
    Examples requiring conduct_research: "find information", "look up", "search for", "gather data", "investigate", "what is temperature in goa", "sales data for maruti 800", "climate change information", "latest AI trends", "what happened yesterday", "tell me about quantum computing"
    Return ONLY the workflow name (e.g., "draft_content") or "unclear" if uncertain.
    If the user is providing information for an ongoing workflow, return the current workflow name.
    """
        
        response = self.llm.invoke([{"role": "user", "content": intent_prompt}])
        identified_workflow = response.content.strip().lower()
        
        if identified_workflow in WORKFLOW_SCHEMAS:
            if state.get("current_workflow") != identified_workflow:
                logger.info(f"Workflow changed: {state.get('current_workflow')} -> {identified_workflow}")
                state["current_workflow"] = identified_workflow
                state["collected_params"] = {}
            else:
                state["current_workflow"] = identified_workflow
        
        state["user_intent"] = identified_workflow
        return state

    async def _detect_follow_up_request(self, state: AgentState) -> dict:
            """
            Use LLM to detect if the current request is referring to previous content
            
            Returns:
                dict with keys:
                    - is_follow_up: bool
                    - confidence: float (0.0-1.0)
                    - reasoning: str
                    - needs_previous_content: bool
            """
            current_message = state["messages"][-1] if state["messages"] else {}
            current_content = current_message.get("content", "")
            
            # Get last few messages for context (exclude current)
            recent_history = state["messages"][-5:-1] if len(state["messages"]) > 1 else []
            
            detection_prompt = f"""Analyze if the user's current request is referring to previously generated content.

        **Current user message:**
        {current_content}

        **Recent conversation history:**
        {json.dumps(recent_history, indent=2)}

        **Detection Criteria:**

        A request is a FOLLOW-UP if:
        1. User uses referential language like "this", "that", "it", "the article", "the content" without providing new content
        2. User asks to transform/convert/modify something without specifying what
        3. User requests a different format/version of something previously generated
        4. Context clearly indicates they're referring to prior output

        Examples of FOLLOW-UP requests:
        - "write a linkedin post for this"
        - "convert it to a webpage"
        - "make this shorter"
        - "expand on that"
        - "create a social media version"
        - "compress the article"

        Examples of NON-FOLLOW-UP requests:
        - "write a linkedin post about crypto" (new request)
        - "convert [pasted content] to webpage" (content provided)
        - User uploads a new document
        - User starts a completely new topic

        **RESPONSE FORMAT (JSON ONLY):**
        {{
            "is_follow_up": true/false,
            "confidence": 0.0-1.0,
            "reasoning": "brief explanation",
            "needs_previous_content": true/false
        }}

        **CRITICAL:** Set "needs_previous_content" to true ONLY if:
        - is_follow_up is true AND
        - User has NOT provided new content in their current message
        """
            
            try:
                response_text = await self.llm.ainvoke([{"role": "user", "content": detection_prompt}])
                response_content = response_text.content.strip()
                
                # Extract JSON from response
                json_start = response_content.find('{')
                json_end = response_content.rfind('}') + 1
                
                if json_start != -1 and json_end > json_start:
                    json_text = response_content[json_start:json_end]
                    result = json.loads(json_text)
                    
                    logger.info(f"[FOLLOW_UP_DETECTION] is_follow_up={result.get('is_follow_up')}, confidence={result.get('confidence')}, needs_content={result.get('needs_previous_content')}")
                    return result
                else:
                    raise ValueError("No valid JSON found in response")
                    
            except Exception as e:
                logger.error(f"[FOLLOW_UP_DETECTION] Error: {e}", exc_info=True)
                # Fallback to safe default
                return {
                    "is_follow_up": False,
                    "confidence": 0.0,
                    "reasoning": "Detection failed, defaulting to non-follow-up",
                    "needs_previous_content": False
                }
    def _extract_previous_content(self, messages: List[dict], min_length: int = 500) -> str:
        """
        Extract the most recent substantial content from assistant messages
        
        Args:
            messages: Conversation history
            min_length: Minimum character length to consider as substantial content
            
        Returns:
            Previous content string or empty string if not found
        """
        # Iterate backwards through messages (excluding the last user message)
        for msg in reversed(messages[:-1]):
            if msg.get("role") == "assistant":
                content = msg.get("content", "")
                
                # Skip metadata/streaming responses
                if content.startswith("data:") or content.startswith("{"):
                    continue
                
                # Check for substantial content
                if len(content) > min_length:
                    logger.info(f"[EXTRACT_PREVIOUS] Found content: {len(content)} chars from assistant message")
                    return content
        
        logger.warning(f"[EXTRACT_PREVIOUS] No substantial previous content found (min_length={min_length})")
        return ""
    async def _extract_parameters(self, state: AgentState) -> AgentState:
        """Extract parameters from user message"""
        if not state.get("current_workflow") or state["current_workflow"] not in WORKFLOW_SCHEMAS:
            return state
        
        workflow_name = state["current_workflow"]
        schema = WORKFLOW_SCHEMAS[workflow_name]
        user_message = state["messages"]
        last_message = user_message[-1] if isinstance(user_message, list) else user_message
        message_content = last_message.get("content", "") if isinstance(last_message, dict) else str(user_message)
        

        follow_up_detection = await self._detect_follow_up_request(state)
        if follow_up_detection.get("is_follow_up") and follow_up_detection.get("needs_previous_content"):
            # Check if we need content for this workflow
            workflow_needs_content = self._workflow_needs_content_param(workflow_name)
            
            if workflow_needs_content:
                previous_content = self._extract_previous_content(state.get("messages", []))
                
                if previous_content:
                    if not state.get("collected_params"):
                        state["collected_params"] = {}
                    
                    # Map to appropriate parameter name based on workflow
                    content_param_name = self._get_content_param_name(workflow_name)
                    
                    if content_param_name not in state["collected_params"]:
                        state["collected_params"][content_param_name] = previous_content
                        logger.info(f"[{workflow_name}] Auto-injected previous content ({len(previous_content)} chars) into '{content_param_name}' parameter")
                else:
                    logger.warning(f"[{workflow_name}] Follow-up detected but no previous content found")

        extracted_doc_content = None
        doc_pattern = re.compile(
            r'(?:'
            r'extracted\s+text\s+from\s+document|'
            r'document\s+uploaded|'
            r'uploaded\s+document|'
            r'extracted\s+text|'
            r'file\s+uploaded|'
            r'\[\d+\s+document\(s\)\s+uploaded'
            r')'
            r'[:\s]*(?:\([^)]+\))?[:\s]*',  # Optional: (filename.pdf)
            re.IGNORECASE | re.DOTALL
        )

        match = doc_pattern.search(message_content)

        if match:
            # Get content after the matched pattern
            content_after_marker = message_content[match.end():]
            extracted_doc_content = content_after_marker.strip()
            
            if extracted_doc_content:
                logger.info(f"[DOCUMENT_EXTRACTION] Extracted {len(extracted_doc_content)} chars using regex")

        # if "Extracted Text From Document" in message_content:
        #     # Extract everything after the document marker
        #     parts = message_content.split("Extracted Text From Document")
        #     if len(parts) > 1:
        #         # Get text after the filename line
        #         doc_text = parts[1].split("\n", 1)
        #         if len(doc_text) > 1:
        #             extracted_doc_content = doc_text[1].strip()

        if extracted_doc_content:
            if not state.get("collected_params"):
                state["collected_params"] = {}
            
            if workflow_name == "format_translator":
                state["collected_params"]["content"] = extracted_doc_content
                # logger.info(f"Auto-extracted document content for format_translator ({len(extracted_doc_content)} chars)")
            
            elif workflow_name == "draft_content":
                # For draft_content, document could be outline_doc or supporting_doc
                # Check what's already collected to determine which one to use
                if "outline_doc" not in state["collected_params"] and "supporting_doc" not in state["collected_params"]:
                    # First document becomes supporting_doc by default
                    state["collected_params"]["supporting_doc"] = extracted_doc_content
                    # logger.info(f"Auto-extracted document as supporting_doc for draft_content ({len(extracted_doc_content)} chars)")
                elif "outline_doc" not in state["collected_params"]:
                    state["collected_params"]["outline_doc"] = extracted_doc_content
                    # logger.info(f"Auto-extracted document as outline_doc for draft_content ({len(extracted_doc_content)} chars)")
                elif workflow_name == "refine_content":
                # Document becomes original_content or supportingDoc
                    if "original_content" not in state["collected_params"]:
                        state["collected_params"]["original_content"] = extracted_doc_content
                        logger.info(f"Auto-extracted document as original_content for refine_content ({len(extracted_doc_content)} chars)")
                    else:
                        # Add as supportingDoc to expand service
                        if "services" not in state["collected_params"]:
                            state["collected_params"]["services"] = []
                        # Find or create expand service
                        expand_service = next((s for s in state["collected_params"]["services"] if s.get("type") == "expand"), None)
                        if expand_service:
                            expand_service["supportingDoc"] = extracted_doc_content
                            logger.info(f"Auto-extracted document as supportingDoc for expand service")

        if workflow_name == "detect_edit_intent":
            extraction_prompt = f"""Extract parameters from the user's message for the detect_edit_intent workflow.

            Required parameters: {', '.join(schema['required'])}

            User message: {user_message}

            Already collected: {state.get('collected_params', {})}

            For detect_edit_intent workflow:
            - user_input: The complete user message text

            Return a JSON object with the user_input parameter.
            Example: {{"user_input": "Please edit this document with line editor"}}
            """
        elif workflow_name == "conduct_research":
            extraction_prompt = f"""Extract parameters from the user's message for the conduct_research workflow.

            Required parameters: {', '.join(schema['required'])}
            Optional parameters: {', '.join(schema['optional'])}

            User message: {user_message}

            Already collected: {state.get('collected_params', {})}

            For conduct_research workflow:
            - research_topic: The main subject/topic to research (be specific and comprehensive)
            - research_scope: Scope of research (e.g., "comprehensive", "specific aspect", "comparative analysis")
            - specific_sources: Any specific sources or databases the user wants to focus on
            - depth_level: Level of detail needed (e.g., "overview", "detailed", "expert-level")

            Return a JSON object with any NEW parameters found. Extract as much context as possible from the user's request.
            Example: {{"research_topic": "Impact of AI on healthcare industry", "research_scope": "comprehensive", "depth_level": "detailed"}}

            If no new parameters found, return {{}}.
            """
        elif workflow_name == "draft_content":
            extraction_prompt = f"""Extract parameters from the user's message for the draft_content workflow.

            Required parameters: {', '.join(schema['required'])}
            Optional parameters: {', '.join(schema['optional'])}

            User message: {user_message}

            Already collected: {state.get('collected_params', {})}

            For draft_content workflow:
            - topic: The main topic or subject for the content
            - content_type: Hard requirement and must be one of: "Article", "Blog", "Executive Brief" only, do not invent or ask for any other content type.
            - outline_doc: Any outline, brief, or structure mentioned
            - audience_tone: Target audience or tone
            - word_limit: Target word count if specified (optional)
            - supporting_doc: Any reference documents mentioned (optional)

            Return a JSON object with any NEW parameters found. Only include parameters that are explicitly mentioned.
            Example: {{"topic": "AI in healthcare", "content_type": "Article", "outline_doc": "Introduction, Benefits, Challenges"}}

            If no new parameters found, return {{}}.
            """
        elif workflow_name == "format_translator":
            extraction_prompt = f"""Extract parameters from the user's message for the format_translator workflow.

            Required parameters: {', '.join(schema['required'])}
            Optional parameters: {', '.join(schema['optional'])}

            User message: {user_message}

            Already collected: {state.get('collected_params', {})}

            For format_translator workflow:
            - content: The content to translate (could be from uploaded document or mentioned in text)
            - target_format: One of: "Social Media Post", "Webpage Ready", "Podcast", "Placemat"
            - source_format: Original format of content (optional)
            - customization: Platform specification (e.g., "LinkedIn", "X.com", "Twitter") for Social Media Post
            - word_limit: Target word count if specified (optional, defaults: 30 for X.com, 200-350 for LinkedIn)
            - num_slides: Number of slides for Placemat format (only for Placemat)

            **SPECIAL KEYWORD DETECTION FOR TARGET_FORMAT:**
            - If user message contains "deck", "slide", "slides", "presentation", "placemat" → set target_format to "Placemat"
            - If user message contains "linkedin" → set target_format to "Social Media Post" and customization to "LinkedIn"
            - If user message contains "x.com", "twitter", "tweet" → set target_format to "Social Media Post" and customization to "X.com"
            - If user message contains "webpage", "web page", "html", "website" → set target_format to "Webpage Ready"

            **CRITICAL: DO NOT extract 'content' parameter unless:**
            1. The user has explicitly pasted/provided content in their message, OR
            2. A document was uploaded (indicated by "Extracted Text From Document" in the message)
            
            If the user ONLY mentions they want to convert to a format (e.g., "convert to webpage ready", "make a webpage"), 
            DO NOT extract any content parameter. The content must be explicitly provided or uploaded.

            Return a JSON object with any NEW parameters found. Only include parameters that are explicitly mentioned or can be inferred from keywords.
            Example: {{"target_format": "Webpage Ready"}}
            Example with content: {{"target_format": "Social Media Post", "customization": "LinkedIn", "content": "actual content text here"}}
            Example for Placemat: {{"target_format": "Placemat", "num_slides": "5"}}
            Example for deck inference: If user says "create a deck", return {{"target_format": "Placemat"}}

            If no new parameters found, return {{}}.
            """
        elif workflow_name == "expand_compress_content" or workflow_name == "adjust_tone" or workflow_name == "provide_suggestions":
            extraction_prompt = f"""Extract parameters from the user's message for the {workflow_name} workflow.
            Required parameters: {', '.join(schema['required'])}
            Optional parameters: {', '.join(schema['optional'])}

            User message: {user_message}

            Already collected: {state.get('collected_params', {})}

            For {workflow_name} workflow:
            - original_content: The content to be refined (from uploaded document or user text)
            - service_type: The type of refinement requested. Must be ONE of:
                * "expand" - make content longer
                * "compress" - make content shorter
                * "adjust_audience_tone" - change the tone/audience
                * "enhanced_with_research" - add research and data
                * "edit_content" - polish and improve writing
                * "improvement_suggestions" - get suggestions only
            - expected_word_count: Target word count (REQUIRED for expand/compress)
            - audience_tone: The desired tone (REQUIRED for adjust_audience_tone)
            - supporting_doc: Supporting document content (REQUIRED for expand)
            - expansion_section: Which section to use for expansion (REQUIRED for expand)
            Common sections: "overview", "key insights", "business implications", "recommended actions", "all sections"
            - expand_guidelines: Instructions for expansion (optional for expand)

            **SERVICE TYPE DETECTION:**
            - "expand", "expand content", "make longer", "add more", "lengthen", "extend" → service_type: "expand"
            - "compress", "shorten", "reduce length", "make shorter", "condense" → service_type: "compress"
            - "tone", "adjust tone", "change tone", "audience", "rephrase for" → service_type: "adjust_audience_tone"
            - "research", "add research", "enhance with data" → service_type: "enhanced_with_research"
            - "edit", "improve", "polish" → service_type: "edit_content"
            - "suggestions", "feedback", "recommendations" → service_type: "improvement_suggestions"

            **IMPORTANT**: If the user input contains "expand" or "expand content" or "make longer", ALWAYS extract service_type as "expand"

            **WORD COUNT EXTRACTION:**
            - Look for phrases like "to 500 words", "500 words", "around 1000 words", etc.
            - If user says "expand" without word count, DO NOT extract expected_word_count yet

            Return a JSON object with extracted parameters. ALWAYS include service_type if it can be detected.
            Example for expand: {{"service_type": "expand"}}
            Example for tone: {{"service_type": "adjust_audience_tone"}}

            If no new parameters found, return {{}}.
            """
        else:
            extraction_prompt = f"""Extract parameters from the user's message for the {workflow_name} workflow.

    Required parameters: {', '.join(schema['required'])}
    Optional parameters: {', '.join(schema['optional'])}

    User message: {user_message}

    Already collected: {state.get('collected_params', {})}

    Return a JSON object with any NEW parameters found. Only include parameters that are explicitly mentioned.

    If no new parameters found, return {{}}.
    """
        
        response = self.llm.invoke([{"role": "user", "content": extraction_prompt}])
        
        try:
            new_params = json.loads(response.content.strip())
            if not state.get("collected_params"):
                state["collected_params"] = {}
            
            if new_params:
                logger.info(f"[{workflow_name}] Extracted new params: {new_params}")
            else:
                logger.warning(f"[{workflow_name}] No new params extracted from user message")
            
            state["collected_params"].update(new_params)
            logger.info(f"Total: {state['collected_params']}")
        except Exception as e:
            logger.error(f"Error parsing extracted params: {e}")
        
        return state
    
    def _workflow_needs_content_param(self, workflow_name: str) -> bool:
        """
        Determine if a workflow requires content as input
        
        Args:
            workflow_name: Name of the workflow
            
        Returns:
            True if workflow needs content parameter
        """
        content_workflows = {
            "format_translator",      # needs 'content'
            "expand_compress_content", # needs 'original_content'
            "adjust_tone",            # needs 'original_content'
            "provide_suggestions",    # needs 'original_content'
            "refine_content"          # needs 'original_content'
        }
        
        return workflow_name in content_workflows

    def _get_content_param_name(self, workflow_name: str) -> str:
        """
        Get the correct content parameter name for a workflow
        
        Args:
            workflow_name: Name of the workflow
            
        Returns:
            Parameter name for content (e.g., 'content', 'original_content')
        """
        param_mapping = {
            "format_translator": "content",
            "expand_compress_content": "original_content",
            "adjust_tone": "original_content",
            "provide_suggestions": "original_content",
            "refine_content": "original_content"
        }
        
        return param_mapping.get(workflow_name, "content")
    
    def _check_completeness(self, state: AgentState) -> AgentState:
        """Check if all required parameters are collected"""
        if not state.get("current_workflow") or state["current_workflow"] not in WORKFLOW_SCHEMAS:
            state["missing_params"] = ["workflow_identification"]
            return state
        
        workflow_name = state["current_workflow"]
        schema = WORKFLOW_SCHEMAS[workflow_name]
        collected = state.get("collected_params", {})
        
        # missing = [param for param in schema["required"] if param not in collected or not collected[param]]
        missing = set()
        for param in schema["required"]:
            if param not in collected or not collected[param]:
                missing.add(param)
        # Special case: for format_translator with Social Media Post, customization is required
        if workflow_name == "format_translator":
            target_format = collected.get("target_format", "").lower()
            # Only add customization if target is Social Media Post
            if "social media" in target_format and ("customization" not in collected or not collected.get("customization")):
                missing.add("customization")
            # Only add num_slides if target is Placemat AND num_slides is missing
            if "placemat" in target_format and ("num_slides" not in collected or not collected.get("num_slides")):
                missing.add("num_slides")

            # Cap num_slides to max 20 if provided
            if "placemat" in target_format and "num_slides" in collected:
                try:
                    num_slides = int(collected.get("num_slides", 1))
                    if num_slides > 10:
                        collected["num_slides"] = 10
                        logger.info(f"[Placemat] num_slides capped from {num_slides} to 20")
                except (ValueError, TypeError):
                    pass

        if workflow_name == "refine_content":
            service_type = collected.get("service_type", "")
            
            # For expand/compress, expected_word_count is required
            if service_type in ["expand", "compress"]:
                if "expected_word_count" not in collected or not collected.get("expected_word_count"):
                    if "expected_word_count" not in missing:  # ← FIX: Check before adding
                        missing.add("expected_word_count")
            
            # For adjust_audience_tone, audience_tone is required
            elif service_type == "adjust_audience_tone":
                if "audience_tone" not in collected or not collected.get("audience_tone"):
                    missing.add("audience_tone")
        
        state["missing_params"] = list(missing)
        
        logger.info(f"Completeness check - Missing: {missing}")
        return state
    
    def _should_execute(self, state: AgentState) -> Literal["execute", "ask"]:
        """Decide whether to execute workflow or ask for more params"""
        if state.get("user_intent") == "unclear":
            return "ask"
        if not state.get("missing_params"):
            return "execute"
        return "ask"


    async def _ask_missing_params_stream(self, state: AgentState) -> AsyncGenerator[str, None]:

        """Generate and stream a conversational request for missing parameters"""
        formatted_workflows = []
        for name, schema in WORKFLOW_SCHEMAS.items():
                display_name = name.replace('_', ' ').title()
                formatted_workflows.append(f"- {display_name}: {schema['description']}")
        workflows_text = "\n".join(formatted_workflows)
        user_message_text = str(state["messages"])
        if state.get("user_intent") == "unclear":
            if "refine" in user_message_text.lower():
                unclear_prompt = f"""The user wants to refine content but hasn't specified how. Generate a friendly response that:
                1. Acknowledges their request
                2. Explains the 3 available refinement options:
                - Expand/Compress: Make content longer or shorter
                - Adjust Tone: Change the tone or target audience
                - Provide Suggestions: Get improvement recommendations
                3. Asks which option they'd like

                Keep it conversational (2-3 sentences)."""
            else:
                unclear_prompt = f"""The user's intent is unclear. Generate a friendly, helpful response that:
                    1. Acknowledges their message
                    2. Lists available workflows naturally in conversation
                    3. Asks what they'd like to do

                    Available workflows:
                    {workflows_text}

                    User message: {state["messages"] if state["messages"] else ""}

                    Keep it conversational and concise (2-3 sentences)."""

            messages = [{"role": "user", "content": unclear_prompt}]
                
            full_content = ""
            async for chunk in self.llm.astream(messages):
                if hasattr(chunk, 'content') and chunk.content:
                    full_content += chunk.content
                    yield f"data: {json.dumps({'type': 'content', 'content': chunk.content})}\n\n"
            
            yield f"data: {json.dumps({'type': 'metadata', 'workflow': None, 'collected_params': {}, 'missing_params': ['workflow_identification'], 'ready_to_execute': False})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'done': True})}\n\n"
            
            state["messages"].append({
                "role": "assistant",
                "content": full_content
            })
        

        else:
            workflow_name = state.get("current_workflow")
            missing = state.get("missing_params", [])
            formatted_missing = [param.replace('_', ' ').title() for param in missing]
            # Define valid options for each workflow parameter
            parameter_options = {
                "format_translator": {
                    "target_format": ["Social Media Post", "Webpage Ready", "Placemat"],
                    "customization": ["LinkedIn", "X.com (Twitter)", "content"]
                },
                "draft_content": {
                    "content_type": ["Article", "Blog", "Executive Brief"]
                }
            }
            
            options_context = ""
            if workflow_name in parameter_options:
                for param in missing:
                    if param in parameter_options[workflow_name]:
                        valid_options = parameter_options[workflow_name][param]
                        options_context += f"\nValid options for {param}: {', '.join(valid_options)}"
            
            if workflow_name == "format_translator" and "num_slides" in missing:
                options_context += "\nNote: Maximum 10 slides allowed for Placemat format"
            
            # Separate prompt handling for draft_content workflow
            if workflow_name == "draft_content":
                ask_prompt = f"""Generate a natural, conversational message asking for the missing parameters.

                Workflow: {workflow_name}
                Missing parameters: {formatted_missing}
                Already provided: {state.get('collected_params', {})}
                {options_context}

                CRITICAL CONSTRAINT FOR CONTENT_TYPE:
                When asking for content_type, ONLY suggest these three options:
                1. Article
                2. Blog
                3. Executive Brief
                
                DO NOT suggest, mention, or ask about any other content types such as:
                - Email
                - Social media post
                - LinkedIn post
                - Newsletter
                - Whitepaper
                - White Paper
                - Case study
                - Report
                - Or any other alternative content types
                
                These three options (Article, Blog, Executive Brief) MUST be presented as the ONLY available choices.
                
                Be friendly and specific. When asking for parameters with specific valid options, ONLY mention those valid options.
                Ask for the most important missing parameter first.
                Keep it concise (1-2 sentences max).
                """
            if workflow_name == "refine_content":
                collected = state.get("collected_params", {})
                
                if "original_content" in missing:
                    ask_prompt = """Generate a friendly message asking the user to provide the content they want to refine.
            Instructions:
                    Keep it natural and conversational (2-3 sentences).
                    Example: "Could you paste the content you want me to refine? I can help you expand it, compress it, adjust the tone, add research, polish the writing, or provide improvement suggestions."
                    """

                elif "service_type" in missing:
                    ask_prompt = """Generate a friendly message asking what kind of refinement they want.

            Available options:
            - Expand (make content longer)
            - Compress (make content shorter)
            - Adjust tone (change the audience/tone)
            - Provide suggestions (improvement ideas)
            - Edit (polish the writing)
            - Get suggestions (improvement ideas)

            Keep it friendly (2-3 sentences max).
            Example: "What would you like me to do with your content? I can expand it, compress it, adjust the tone, add research, polish the writing, or provide improvement suggestions."
            """
                
                elif "audience_tone" in missing:
                    ask_prompt = """Generate a friendly message asking for the desired tone or audience.

            Instructions:
            - Use natural language
            - Ask about tone or target audience

            Keep it conversational (1 sentence).
            Example: "What tone or audience should I target (e.g., formal executive, casual blog reader, technical experts)?"
            """
                
                elif "expected_word_count" in missing:
                    service_type = collected.get("service_type", "")
                    
                    # Calculate current word count if we have content
                    current_wc = 0
                    if collected.get("original_content"):
                        current_wc = len(collected["original_content"].split())
                    
                    ask_prompt = f"""Generate a friendly message asking for the target word count.

            Context:
            - Service type: {service_type.replace('_', ' ') if service_type else 'refinement'}
            - Current word count: approximately {current_wc} words

            Instructions:
            - Use natural, conversational language
            - For expand: ask "How many words would you like the expanded version to be?"
            - For compress: ask "How many words should I aim for in the compressed version?"

            Keep it brief and friendly (1-2 sentences max).
            """
            else:
                # Standard prompt for other workflows
                ask_prompt = f"""Generate a natural, conversational message asking for the missing parameters.

                Workflow: {workflow_name}
                Missing parameters: {formatted_missing}
                Already provided: {state.get('collected_params', {})}
                {options_context}

                Be friendly and specific. When asking for parameters with specific valid options, ONLY mention those valid options.
                Ask for the most important missing parameter first.
                Keep it concise (1-2 sentences max).
                """
                
            messages = [{"role": "user", "content": ask_prompt}]
            
            full_content = ""
            async for chunk in self.llm.astream(messages):
                if hasattr(chunk, 'content') and chunk.content:
                    full_content += chunk.content
                    yield f"data: {json.dumps({'type': 'content', 'content': chunk.content})}\n\n"
            
            yield f"data: {json.dumps({'type': 'metadata', 'workflow': workflow_name, 'collected_params': state.get('collected_params', {}), 'missing_params': missing, 'ready_to_execute': False})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'done': True})}\n\n"
            
            state["messages"].append({
                "role": "assistant",
                "content": full_content
            })
    
    async def _execute_workflow(self, state: AgentState) -> AgentState:
        """Execute the identified workflow with collected parameters"""
        workflow_name = state["current_workflow"]
        params = state["collected_params"]
        
        # logger.info(f"Executing workflow: {workflow_name} with params: {params}")
        
        if workflow_name == "detect_edit_intent":
            result = await self._execute_detect_edit_intent(params)
            state["execution_result"] = result
        elif workflow_name == "draft_content":
            result = await self._execute_draft_content(params)
            state["execution_result"] = result
        elif workflow_name == "format_translator":
            result = await self._execute_format_translator(params)
            state["execution_result"] = result
        elif workflow_name == "conduct_research":
            result = await self._execute_conduct_research(params)
            state["execution_result"] = result
        elif workflow_name == "expand_compress_content":
            result = await self._execute_expand_compress_content(params)
            state["execution_result"] = result
        elif workflow_name == "adjust_tone":
            result = await self._execute_adjust_tone(params)
            state["execution_result"] = result
        elif workflow_name == "provide_suggestions":
            result = await self._execute_provide_suggestions(params)
            state["execution_result"] = result
        else:
            result = {"error": f"Workflow {workflow_name} not yet implemented"}
            state["execution_result"] = result
        
        return state
    async def _execute_expand_compress_content(self, params: dict) -> dict:
        """Execute expand/compress content workflow"""
        from app.features.thought_leadership.services.refine_content_service import RefineContentService
        from app.infrastructure.llm.llm_service import LLMService
        
        try:
            logger.info(f"[ExpandCompress] Starting content expansion/compression")
            
            llm_service = LLMService()
            refine_service = RefineContentService(llm_service=llm_service)

            original_content = params.get('original_content', '')
            service_type = params.get('service_type', '')  # "expand" or "compress"
            expected_word_count = params.get('expected_word_count')
            supporting_doc = params.get('supporting_doc')
            expansion_section = params.get('expansion_section')
            expand_guidelines = params.get('expand_guidelines')

            # Validate
            if not original_content or not original_content.strip():
                return {
                    "status": "error",
                    "workflow": "expand_compress_content",
                    "error": "Original content is required"
                }
            
            if not service_type or service_type not in ["expand", "compress"]:
                return {
                    "status": "error",
                    "workflow": "expand_compress_content",
                    "error": "Service type must be either 'expand' or 'compress'"
                }
            
            if not expected_word_count:
                return {
                    "status": "error",
                    "workflow": "expand_compress_content",
                    "error": f"{service_type.title()} requires a target word count"
                }
            
            original_word_count = len(original_content.split())
            services = []
            
            # Build services array
            if service_type == "expand":
                services.append({
                    "isSelected": True,
                    "type": "expand",
                    "original_word_count": original_word_count,
                    "expected_word_count": int(expected_word_count),
                    "supportingDoc": supporting_doc,
                    "expansion_section": expansion_section,
                    "expand_guidelines": expand_guidelines
                })
                services.append({"isSelected": False, "type": "compress"})
            else:  # compress
                services.append({"isSelected": False, "type": "expand"})
                services.append({
                    "isSelected": True,
                    "type": "compress",
                    "original_word_count": original_word_count,
                    "expected_word_count": int(expected_word_count)
                })
            
            # Add unselected services
            services.extend([
                {"isSelected": False, "type": "adjust_audience_tone"},
                {"isSelected": False, "type": "improvement_suggestions"},
                {"isSelected": False, "type": "enhanced_with_research"},
                {"isSelected": False, "type": "edit_content", "editors": []}
            ])
            
            request_data = {
                "original_content": original_content,
                "services": services,
                "stream": True
            }
            
            logger.info(f'Data passed to refine content service: {request_data}')
            return {
                "status": "success",
                "workflow": "expand_compress_content",
                "streaming_response": StreamingResponse(
                    refine_service.refine_content(request_data),
                    media_type="text/event-stream"
                )
            }
            
        except Exception as e:
            logger.error(f"Error executing expand_compress_content: {e}", exc_info=True)
            return {
                "status": "error",
                "workflow": "expand_compress_content",
                "error": str(e)
            }


    async def _execute_adjust_tone(self, params: dict) -> dict:
        """Execute adjust tone workflow"""
        from app.features.thought_leadership.services.refine_content_service import RefineContentService
        from app.infrastructure.llm.llm_service import LLMService
        
        try:
            logger.info(f"[AdjustTone] Starting tone adjustment")
            
            llm_service = LLMService()
            refine_service = RefineContentService(llm_service=llm_service)

            original_content = params.get('original_content', '')
            audience_tone = params.get('audience_tone', '')

            # Validate
            if not original_content or not original_content.strip():
                return {
                    "status": "error",
                    "workflow": "adjust_tone",
                    "error": "Original content is required"
                }
            
            if not audience_tone:
                return {
                    "status": "error",
                    "workflow": "adjust_tone",
                    "error": "Target audience or tone is required"
                }
            
            original_word_count = len(original_content.split())
            
            # Build services array with only adjust_audience_tone selected
            services = [
                {"isSelected": False, "type": "expand"},
                {"isSelected": False, "type": "compress"},
                {
                    "isSelected": True,
                    "type": "adjust_audience_tone",
                    "audience_tone": audience_tone
                },
                {"isSelected": False, "type": "improvement_suggestions"},
                {"isSelected": False, "type": "enhanced_with_research"},
                {"isSelected": False, "type": "edit_content", "editors": []}
            ]
            
            request_data = {
                "original_content": original_content,
                "services": services,
                "stream": True
            }
            
            logger.info(f'Data passed to refine content service: {request_data}')
            return {
                "status": "success",
                "workflow": "adjust_tone",
                "streaming_response": StreamingResponse(
                    refine_service.refine_content(request_data),
                    media_type="text/event-stream"
                )
            }
            
        except Exception as e:
            logger.error(f"Error executing adjust_tone: {e}", exc_info=True)
            return {
                "status": "error",
                "workflow": "adjust_tone",
                "error": str(e)
            }


    async def _execute_provide_suggestions(self, params: dict) -> dict:
        """Execute provide suggestions workflow"""
        from app.features.thought_leadership.services.refine_content_service import RefineContentService
        from app.infrastructure.llm.llm_service import LLMService
        
        try:
            logger.info(f"[ProvideSuggestions] Starting suggestion generation")
            
            llm_service = LLMService()
            refine_service = RefineContentService(llm_service=llm_service)

            original_content = params.get('original_content', '')

            # Validate
            if not original_content or not original_content.strip():
                return {
                    "status": "error",
                    "workflow": "provide_suggestions",
                    "error": "Original content is required"
                }
            
            original_word_count = len(original_content.split())
            
            # Build services array with only improvement_suggestions selected
            services = [
                {"isSelected": False, "type": "expand"},
                {"isSelected": False, "type": "compress"},
                {"isSelected": False, "type": "adjust_audience_tone"},
                {
                    "isSelected": True,
                    "type": "improvement_suggestions",
                    "suggestion_type": "general"
                },
                {"isSelected": False, "type": "enhanced_with_research"},
                {"isSelected": False, "type": "edit_content", "editors": []}
            ]
            
            request_data = {
                "original_content": original_content,
                "services": services,
                "stream": True
            }
            
            logger.info(f'Data passed to refine content service: {request_data}')
            return {
                "status": "success",
                "workflow": "provide_suggestions",
                "streaming_response": StreamingResponse(
                    refine_service.refine_content(request_data),
                    media_type="text/event-stream"
                )
            }
            
        except Exception as e:
            logger.error(f"Error executing provide_suggestions: {e}", exc_info=True)
            return {
                "status": "error",
                "workflow": "provide_suggestions",
                "error": str(e)
            }
    async def _execute_conduct_research(self, params: dict) -> dict:  # Renamed method
        """Execute conduct research workflow and bypass through LLM for streaming"""
        from app.features.chat.services.data_source_agent import create_data_source_agent
        from app.core.config import config
        
        try:
            logger.info(f"[ConductResearch] Starting research on: {params.get('research_topic')}")
            
            agent = create_data_source_agent(
                azure_endpoint=config.AZURE_OPENAI_ENDPOINT,
                api_key=config.AZURE_OPENAI_API_KEY,
                api_version=config.AZURE_OPENAI_API_VERSION,
                deployment_name=config.AZURE_OPENAI_DEPLOYMENT
            )
            
            research_scope = params.get('research_scope', 'comprehensive')
            specific_sources = params.get('specific_sources', '')
            depth_level = params.get('depth_level', 'detailed')
            
            research_prompt = f"""Conduct extensive research on the following topic and provide comprehensive information with all citations and source links.

    **Research Topic:** {params.get('research_topic')}

    **Research Scope:** {research_scope}

    **Depth Level:** {depth_level}

    {f"**Specific Sources to Focus On:** {specific_sources}" if specific_sources else ""}

    **Research Instructions:**
    1. If required: Use ALL available data sources to gather comprehensive information
    2. Provide detailed findings with specific data points, statistics, and facts
    4. ALWAYS cite sources with proper attribution
    5. Organize findings in a clear, structured format
    """
            
            agent_messages = [{"role": "user", "content": research_prompt}]
            logger.info(f"[ConductResearch] Calling data_source_agent")
            
            research_results = await agent.process_query(agent_messages)
            
            if research_results:
                logger.info(f"[ConductResearch] Research completed - bypassing through LLM")
                
                # Bypass through LLM for streaming
                async def stream_bypassed_results():
                    import json
                    
                    # Create LLM prompt to process research results
                    bypass_prompt = f"""You are a helpful research assistant. Based on the following research data, provide a clear, well-structured response to the user's question: "{params.get('research_topic')}"

    Research Data:
    {research_results}

    STRICT INSTRUCTIONS - FOLLOW EXACTLY:
    1. Format your ENTIRE response in Markdown
    2. Present information in a natural, conversational manner
    3. Organize the response logically with clear sections using Markdown headers (##)
    4. Place ALL citations and sources at the end under a "## Sources" section with proper attribution
    5. NEVER mention which data sources failed, how many API calls were made, or any technical details about data fetching
    6. NEVER include phrases like "data source failed", "unable to fetch", "API call", "sources checked", etc.
    7. Focus ONLY on delivering the answer with relevant information
    8. Use Markdown formatting: **bold** for emphasis, bullet points with -, numbered lists with 1., etc.
"""
                    
                    messages = [{"role": "user", "content": bypass_prompt}]
                    
                    # Stream LLM response
                    async for chunk in self.llm.astream(messages):
                        if hasattr(chunk, 'content') and chunk.content:
                            yield f"data: {json.dumps({'type': 'content', 'content': chunk.content})}\n\n"
                    
                    yield f"data: {json.dumps({'type': 'metadata', 'workflow': 'conduct_research', 'topic': params.get('research_topic'), 'ready_to_execute': True})}\n\n"
                    yield f"data: {json.dumps({'type': 'done', 'done': True})}\n\n"
                
                agent.close()
                
                return {
                    "status": "success",
                    "workflow": "conduct_research",
                    "streaming_response": StreamingResponse(stream_bypassed_results(), media_type="text/event-stream")
                }
            else:
                logger.warning(f"[ConductResearch] No results returned from agent")
                agent.close()
                return {
                    "status": "error",
                    "workflow": "conduct_research",
                    "error": "No research results found"
                }
                    
        except Exception as e:
            logger.error(f"Error executing conduct_research: {e}", exc_info=True)
            return {
                "status": "error",
                "workflow": "conduct_research",
                "error": str(e)
            }
    async def _execute_format_translator(self, params: dict) -> dict:
        """Execute format translator workflow and return streaming response"""
        from app.features.thought_leadership.services.format_translator_service import FormatTranslatorService
        from app.infrastructure.llm.llm_service import LLMService
        from app.features.ddc.utils.text_refiner import refine_text_for_placemat
        from app.core.config import get_settings
        
        try:
            logger.info(f"[FormatTranslator] Starting format translation")
            target_format = params.get('target_format', '')
            if target_format.lower() == "placemat":
                try:
                    content = params.get('content', '')
                    num_slides = int(params.get('num_slides', 1))
                    
                    logger.info(f"[Placemat] Refining content for {num_slides} slides")
                    refined_text = refine_text_for_placemat(content, num_slides)
                    
                    prompt_parts = []
                    prompt_parts.append("User wants to create a placemat. [IMPORTANT] Create the placemat such that it has data and an image on either left or right side of the slide(s).")
                    prompt_parts.append(f"Make sure to use this content {refined_text} for preparing the placemat slide(s)")
                    prompt_parts.append(f"""Follow these guidelines while creating the placemat:
                                    Distills the content's key arguments, insights, and takeaways. 
                                    Organizes content into a visually appealing layout that prioritizes charts, diagrams, and images. 
                                    Refines language to be concise, ensuring quick and effective communication of main ideas. 
                                    """)
                    
                    prompt = "\n\n".join(prompt_parts).strip()
                    settings = get_settings()
                    
                    template_id = settings.PLUSDOCS_TEMPLATE_ID
                    API_TOKEN = settings.PLUSDOCS_API_TOKEN
                    
                    client = PlusDocsClient(API_TOKEN)
                    logger.info(f"[Placemat] Calling PlusDocsClient.create_and_wait with {num_slides} slides")
                    
                    download_url = client.create_and_wait(
                        prompt=prompt,
                        numberOfSlides=num_slides,
                        template_id=template_id,
                        poll_interval=5,
                        max_attempts=60
                    )
                    
                    if not download_url:
                        raise Exception("Placemat generation failed - no download URL returned")
                    
                    logger.info(f"[Placemat] Successfully generated: {download_url}")
                    
                    return {
                        "status": "success",
                        "workflow": "format_translator",
                        "return_json": True,
                        "result": {
                            "target_format": "placemat",
                            "status": "success",
                            "message": f"Please click <a href={download_url} target=\"_blank\" rel=\"noopener noreferrer\">here</a> to download your placemat.",
                        }
                    }
                    
                except Exception as e:
                    logger.error(f"[Placemat] Error: {e}", exc_info=True)
                    return {
                        "status": "error",
                        "workflow": "format_translator",
                        "error": f"Placemat generation failed: {str(e)}"
                    }
            llm_service = LLMService()
            format_service = FormatTranslatorService(llm_service=llm_service)
            
            content = params.get('content', '')
            target_format = params.get('target_format', '')
            source_format = params.get('source_format', 'Document')
            customization = params.get('customization', '')
            word_limit = params.get('word_limit', '')
            
            # Set default word limits based on platform
            if target_format.lower() in ["social media post", "social media"]:
                if customization and "linkedin" in customization.lower():
                    if not word_limit:
                        word_limit = "300"
                elif customization and ("x.com" in customization.lower() or "twitter" in customization.lower()):
                    if not word_limit:
                        word_limit = "30"
            
            if target_format.lower() not in ["social media post", "social media", "webpage ready"]:
                return {
                    "status": "error",
                    "workflow": "format_translator",
                    "error": f"Format '{target_format}' not supported. Only 'Social Media Post' and 'Webpage Ready' are available."
                }
            
            async def format_stream():
                if target_format.lower() == "webpage ready":
                    logger.info("Webpage Ready format translation completed.")
                    yield f"data: {json.dumps({'type': 'webpage_ready', 'content': 'completed'})}\n\n"
                async for chunk in format_service.translate_format(
                    content=content,
                    source_format=source_format,
                    target_format=target_format,
                    customization=customization,
                    podcast_style=None,
                    speaker1_name=None,
                    speaker1_voice=None,
                    speaker1_accent=None,
                    speaker2_name=None,
                    speaker2_voice=None,
                    speaker2_accent=None,
                    word_limit=word_limit
                ):
                    yield chunk
                # if target_format.lower() == "webpage ready":
                #     logger.info("Webpage Ready format translation completed.")
                #     yield f"data: {json.dumps({'type': 'webpage_ready', 'content': 'completed'})}\n\n"

            return {
                "status": "success",
                "workflow": "format_translator",
                "streaming_response": StreamingResponse(format_stream(), media_type="text/event-stream")
            }
            
        except Exception as e:
            logger.error(f"Error executing format_translator: {e}", exc_info=True)
            return {
                "status": "error",
                "workflow": "format_translator",
                "error": str(e)
            }
    async def _execute_draft_content(self, params: dict) -> dict:
        """Execute draft content workflow and return streaming response"""
        from app.features.thought_leadership.workflows.draft_content_class import DraftContentResearchService
        from app.features.thought_leadership.services.draft_content_service import DraftContentService
        from app.infrastructure.llm.llm_service import LLMService
        from app.core.config import config
        
        try:
            logger.info(f"[DraftContent] Starting draft content generation")
            
            llm_service = LLMService()
            draft_service = DraftContentService(llm_service=llm_service)
            
            research_service = DraftContentResearchService(
                draft_service=draft_service,
                azure_endpoint=config.AZURE_OPENAI_ENDPOINT,
                api_key=config.AZURE_OPENAI_API_KEY,
                api_version=config.AZURE_OPENAI_API_VERSION,
                deployment_name=config.AZURE_OPENAI_DEPLOYMENT
            )
            # Build user prompt from collected params
            content_type = params.get('content_type', '')
            topic = params.get('topic', '')
            word_limit = params.get('word_limit', '')
            audience_tone = params.get('audience_tone', '')
            outline_doc = params.get('outline_doc', '')
            supporting_doc = params.get('supporting_doc', '')
            
            user_prompt = f"""Content Type: {content_type}
            Topic: {topic}
            Word Limit: {word_limit}
            Audience/Tone: {audience_tone}
            Initial Outline/Concept: {outline_doc}
            Supporting Documents: {supporting_doc}"""
                    
            logger.info(f"[_execute_draft_content] user prompt:\n{user_prompt}")
                    
                    # Create request object
            from app.features.thought_leadership.workflows.draft_content_class import DraftContentRequest
            request = DraftContentRequest(
                messages=[{"role": "user", "content": user_prompt}],
                content_type=params.get('content_type'),
                topic=params.get('topic'),
                word_limit=str(params.get('word_limit', '')),
                audience_tone=params.get('audience_tone', ''),
                outline_doc=params.get('outline_doc', ''),
                supporting_doc=params.get('supporting_doc', ''),
                use_factiva_research=False
            )
            
            
            streaming_response = await research_service.generate_draft_content(
                request=request,
                user_prompt=user_prompt,
                is_improvement=False
            )
            
            return {
                "status": "success",
                "workflow": "draft_content",
                "streaming_response": streaming_response
            }
            
        except Exception as e:
            logger.error(f"Error executing draft_content: {e}", exc_info=True)
            return {
                "status": "error",
                "workflow": "draft_content",
                "error": str(e)
            }
    async def _execute_detect_edit_intent(self, params: dict) -> dict:
        """Execute detect edit intent workflow - returns JSON without streaming"""
        try:
            user_input = params.get("user_input", "")
            system_prompt = """YOU ARE AN INTENT CLASSIFICATION AGENT.

YOUR TASK:
Detect **EDIT INTENT ONLY WHEN THE USER INPUT LITERALLY CONTAINS**
ONE OR MORE OF THE FOLLOWING WORDS:

- "edit"
- "editing"
- "edited"
- "editor"

Matching is:
- case-insensitive
- based on literal string presence
- valid anywhere in the input text

━━━━━━━━━━━━━━━━━━━━
DETECTION RULES (STRICT, NON-NEGOTIABLE)
━━━━━━━━━━━━━━━━━━━━

1. IF the input text contains "edit", "editing", "edited", or "editor"
   → set `"is_edit_intent": true`

2. IF NONE of these words appear
   → set `"is_edit_intent": false`

3. DO NOT infer meaning, intent, or user goals.
4. DO NOT use semantic similarity.
5. DO NOT treat related or synonymous words as edit.
6. ONLY literal string matching is allowed.

━━━━━━━━━━━━━━━━━━━━
WORDS THAT MUST NOT TRIGGER EDIT INTENT
━━━━━━━━━━━━━━━━━━━━

The following words or phrases MUST NEVER trigger edit intent
UNLESS the word "edit", "editing", "editor" or "edited" is ALSO present:

- refine
- improve
- enhance
- polish
- review
- rewrite
- optimize
- update
- fix
- adjust
- draft
- drafting
- create
- write

If the input contains ONLY these terms
and does NOT contain "edit", "editing", "editor" or "edited"
→ `"is_edit_intent": false`

━━━━━━━━━━━━━━━━━━━━
EDITOR DETECTION (SECONDARY RULE)
━━━━━━━━━━━━━━━━━━━━

ONLY IF `"is_edit_intent": true`:

Check whether the user EXPLICITLY mentions any of the following editors:

- "line" (line editor)
- "copy" (copy editor)
- "development" (development editor)
- "content" (content editor)
- "brand" or "brand-alignment" (brand alignment editor)

            Add ONLY the editors that appear verbatim in the input text.
            DO NOT infer, assume, or default editors.

            ━━━━━━━━━━━━━━━━━━━━
            OUTPUT FORMAT (STRICT)
            ━━━━━━━━━━━━━━━━━━━━

            RESPOND WITH ONLY VALID JSON:

            {
            "is_edit_intent": true/false,
            "confidence": 0.0-1.0,
            "reasoning": "short literal explanation",
            "detected_editors": []
            }

━━━━━━━━━━━━━━━━━━━━
ABSOLUTE PROHIBITIONS
━━━━━━━━━━━━━━━━━━━━

- NEVER infer intent
- NEVER guess user goals
- NEVER use semantic interpretation
- NEVER expand the edit trigger list
- NEVER add text outside the JSON response


        """
            

            user_prompt = f"Analyze this user input and determine if it indicates edit/improve/review intent:\n\n\"{user_input}\""

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            response = self.llm.invoke(messages)
            response_text = response.content.strip()
            
            # Extract JSON from response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            
            if json_start != -1 and json_end > json_start:
                json_text = response_text[json_start:json_end]
                result = json.loads(json_text)
                
                # Validate result structure
                if not isinstance(result, dict):
                    raise ValueError("Invalid response format: not a dictionary")
                
                is_edit_intent = result.get("is_edit_intent", False)
                confidence = float(result.get("confidence", 0.5))
                reasoning = result.get("reasoning", "No reasoning provided")
                detected_editors_raw = result.get("detected_editors", [])
                
                # Clamp confidence to valid range
                confidence = max(0.0, min(1.0, confidence))
                
                # Validate and map detected editors to valid IDs
                valid_editor_ids = ["line", "copy", "development", "content", "brand-alignment"]
                detected_editors = []
                
                if isinstance(detected_editors_raw, list):
                    for editor in detected_editors_raw:
                        editor_lower = str(editor).lower().strip()
                        for valid_id in valid_editor_ids:
                            if editor_lower == valid_id or editor_lower.replace(" ", "-") == valid_id:
                                if valid_id not in detected_editors:
                                    detected_editors.append(valid_id)
                                break
                
                logger.info(f"Intent detection result: is_edit_intent={is_edit_intent}, confidence={confidence:.2f}, reasoning={reasoning}, detected_editors={detected_editors}")
                
                return {
                    "status": "success",
                    "workflow": "detect_edit_intent",
                    "return_json": True,
                    "result": {
                        "is_edit_intent": bool(is_edit_intent),
                        "confidence": confidence,
                        "detected_editors": detected_editors
                    }
                }
            else:
                raise ValueError("No valid JSON found in response")
                
        except Exception as e:
            logger.error(f"Error executing detect_edit_intent: {e}", exc_info=True)
            return {
                "status": "error",
                "workflow": "detect_edit_intent",
                "error": str(e)
            }
    
    def _format_workflow_descriptions(self) -> str:
        """Format workflow descriptions for display"""
        descriptions = []
        for name, schema in WORKFLOW_SCHEMAS.items():
            desc = f"• {name}: {schema['description']}"
            descriptions.append(desc)
        return "\n".join(descriptions)
    
    async def process(self, messages: List[dict]) -> dict:
        """Process user request through the agent"""
        initial_state = {
            "messages": messages,
            "current_workflow": None,
            "collected_params": {},
            "missing_params": [],
            "user_intent": "",
            "conversation_history": []
        }
        
        result = await self.graph.ainvoke(initial_state)
        return result

# Global agent instance
agent_instance = None

def get_agent():
    global agent_instance
    if agent_instance is None:
        agent_instance = TLAgent()
    return agent_instance

@router.post("")
async def tl_agent_endpoint(request: EditAgentRequest):
    """
    Conversational edit agent that identifies intent and collects parameters
    """
    try:
        agent = get_agent()
        # Remove welcome message if it's the first message from assistant
        if (request.messages and 
            len(request.messages) > 0 and 
            request.messages[0].get("role") == "assistant" and 
            request.messages[0].get("content", "").startswith("👋 Welcome! Here's what I can help you with in")):
            request.messages.pop(0)
            logger.info("Removed welcome message from messages array")
        # Process through the graph
        initial_state = {
            "messages": request.messages,
            "current_workflow": None,
            "collected_params": {},
            "missing_params": [],
            "user_intent": "",
            "conversation_history": []
        }
        
        result = await agent.graph.ainvoke(initial_state)
        
        # If workflow execution returns JSON (detect_edit_intent case)
        if result.get("execution_result") and result["execution_result"].get("return_json"):
            workflow_name = result["execution_result"].get("workflow")
            if workflow_name == "detect_edit_intent":
                return IntentDetectionResponse(
                    is_edit_intent=result["execution_result"]["result"].get("is_edit_intent", False),
                    confidence=result["execution_result"]["result"].get("confidence", 0.0),
                    detected_editors=result["execution_result"]["result"].get("detected_editors", [])
                )
            elif workflow_name == "format_translator":
                return JSONResponse(result["execution_result"]["result"])
        
        # If workflow is ready to execute and has streaming response
        elif result.get("execution_result") and result["execution_result"].get("streaming_response"):
            return result["execution_result"]["streaming_response"]
        
        # If we need to ask for parameters, stream that
        elif result.get("missing_params"):
            async def stream_ask_params():
                async for chunk in agent._ask_missing_params_stream(result):
                    yield chunk
            
            return StreamingResponse(stream_ask_params(), media_type="text/event-stream")
        
        # Fallback
        else:
            async def stream_fallback():
                yield f"data: {json.dumps({'type': 'content', 'content': 'I am ready to help. What would you like to do?'})}\n\n"
                yield f"data: {json.dumps({'type': 'done', 'done': True})}\n\n"
            
            return StreamingResponse(stream_fallback(), media_type="text/event-stream")
        
    except Exception as e:
        logger.error(f"Edit Agent error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
