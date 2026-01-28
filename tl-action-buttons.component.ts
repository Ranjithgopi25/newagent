import logging
import json
from typing import Dict, List
from app.infrastructure.llm.llm_service import LLMService

logger = logging.getLogger(__name__)


class IntentDetectionService:
    """Service for detecting user intent using LLM-based classification."""
    
    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service
    
    async def detect_edit_intent(self, user_input: str) -> Dict[str, any]:
        """
        Detect if user input indicates edit/improve/review intent using LLM.
        Also extracts editor names if mentioned in the user input.
        
        Args:
            user_input: User's input text to analyze
            
        Returns:
            dict with keys: is_edit_intent (bool), confidence (float), reasoning (str), detected_editors (list[str])
        """
        try:
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
UNLESS the word "edit", "editing", "edited", or "editor" is ALSO present:

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
and does NOT contain "edit", "editing", "edited", or "editor"
→ `"is_edit_intent": false`

━━━━━━━━━━━━━━━━━━━━
EDITOR DETECTION (SECONDARY RULE)
━━━━━━━━━━━━━━━━━━━━

ONLY IF `"is_edit_intent": true`:

Check whether the user EXPLICITLY mentions any of the following editors:

- "line"
- "copy"
- "development"
- "content"
- "brand-alignment"

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
            
            # Use low temperature for consistent classification and minimal tokens for speed
            response = await self.llm_service.chat_completion(
                messages=messages,
                max_tokens=30000,
                temperature=0.7
            )
            
            # Parse JSON response
            response_text = response.strip()
            
            # Try to extract JSON from response (handle cases where LLM adds extra text)
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
                        # Direct match or partial match
                        for valid_id in valid_editor_ids:
                            if editor_lower == valid_id or editor_lower.replace(" ", "-") == valid_id:
                                if valid_id not in detected_editors:
                                    detected_editors.append(valid_id)
                                break
                
                # Deterministic override: literal presence of edit/editor etc. always means edit intent
                # (LLM can incorrectly return false e.g. for "can you use line editor")
                input_lower = (user_input or "").lower()
                edit_trigger_words = ["edit", "editing", "edited", "editor"]
                has_edit_trigger = any(w in input_lower for w in edit_trigger_words)
                if has_edit_trigger:
                    is_edit_intent = True
                    reasoning = f"Override: input literally contains one of {edit_trigger_words}."
                    for sub, eid in [
                        ("line", "line"),
                        ("copy", "copy"),
                        ("development", "development"),
                        ("content", "content"),
                        ("brand-alignment", "brand-alignment"),
                        ("brand alignment", "brand-alignment"),
                        ("brand", "brand-alignment"),
                    ]:
                        if sub in input_lower and eid not in detected_editors:
                            detected_editors.append(eid)
                
                logger.info(f"Intent detection result: is_edit_intent={is_edit_intent}, confidence={confidence:.2f}, reasoning={reasoning}, detected_editors={detected_editors}")
                
                return {
                    "is_edit_intent": bool(is_edit_intent),
                    "confidence": confidence,
                    "reasoning": reasoning,
                    "detected_editors": detected_editors
                }
            else:
                # Fallback if JSON parsing fails
                logger.warning(f"Failed to parse JSON from LLM response: {response_text}")
                # Try to infer from response text
                response_lower = response_text.lower()
                input_lower_fb = (user_input or "").lower()
                edit_triggers = ["edit", "editing", "edited", "editor"]
                if "true" in response_lower or "yes" in response_lower or "edit" in response_lower or "editor" in response_lower or any(w in input_lower_fb for w in edit_triggers):
                    return {
                        "is_edit_intent": True,
                        "confidence": 0.6,
                        "reasoning": "Parsed from text response (JSON parsing failed)",
                        "detected_editors": []
                    }
                else:
                    return {
                        "is_edit_intent": False,
                        "confidence": 0.6,
                        "reasoning": "Parsed from text response (JSON parsing failed)",
                        "detected_editors": []
                    }
                    
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error in intent detection: {str(e)}, response: {response_text if 'response_text' in locals() else 'N/A'}")
            return {
                "is_edit_intent": False,
                "confidence": 0.0,
                "reasoning": f"JSON parsing error: {str(e)}",
                "detected_editors": []
            }
        except Exception as e:
            logger.error(f"Error in intent detection: {str(e)}", exc_info=True)
            return {
                "is_edit_intent": False,
                "confidence": 0.0,
                "reasoning": f"Error: {str(e)}",
                "detected_editors": []
            }
        
    async def detect_draft_intent(self, user_input: str) -> Dict[str, any]:
       """
       Detect if user input indicates draft/write/create intent using LLM.
       Also extracts topic, content type, word limit, and audience/tone if mentioned.
       Args:
           user_input: User's input text to analyze
       Returns:
           dict with keys: is_draft_intent (bool), confidence (float), reasoning (str), detected_topic (str|None), detected_content_type (list[str]), word_limit (str|None), audience_tone (str|None)
       """
       try:
           logger.info('intent detection called............................')
           
           # Pre-check for strong draft intent keywords - if these are present, it's definitely a draft intent
           user_input_lower = user_input.lower()
           strong_draft_keywords = ['article', 'whitepaper', 'white paper', 'white-paper', 'blog', 'executive brief', 'executive summary']
           has_strong_keyword = any(keyword in user_input_lower for keyword in strong_draft_keywords)
           
           system_prompt = """You are an intent classification agent. 
Your task is to determine if a user wants to draft, write, create, generate the content, and identify the topic, content type, word limit, and audience/tone.

A draft intent means the user wants to:
- Write a article, blog, white paper, or executive brief
- Draft a document from scratch
- Create content about a specific topic
- Generate a new piece of thought leadership

A draft intent does NOT include:
- Editing existing content (that is edit intent)
- Reviewing or polishing documents
- Fixing grammar or style

Available content types:
- "article"
- "blog" (blog post, web log)
- "executive brief" (brief, memo, summary for execs)
- "white paper" (whitepaper, research paper, deep dive)

Content Detection Rules:
- Extract "topic": The main subject matter the user wants to write about.
- Extract "word_limit": If mentioned (e.g., "2000 words", "within 500 words"), extract just the number as a string.
- Extract "audience_tone": If mentioned (e.g., "for executives", "in warm tone", "for students"), extract the audience or tone description.
- Extract content type IDs ONLY if explicitly mentioned: "article", "blog", "white paper", "executive brief".
- If no content type is explicitly mentioned → detected_content_type: []. Do NOT infer or assign a default.

Your response MUST be valid JSON in this format:
{
  "is_draft_intent": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "detected_topic": "string or null",
  "detected_content_type": ["editor_id1", "editor_id2"],
  "word_limit": "number as string or null",
  "audience_tone": "string or null"
}

Examples:
-"write an article on AI" → {"is_draft_intent": true, "confidence": 0.95, "detected_topic": "AI", "detected_content_type": ["article"], "word_limit": null, "audience_tone": null}
-"write an article on AI within 2000 words" → {"is_draft_intent": true, "confidence": 0.95, "detected_topic": "AI", "detected_content_type": ["article"], "word_limit": "2000", "audience_tone": null}
-"write an article on AI for students in warm tone" → {"is_draft_intent": true, "confidence": 0.95, "detected_topic": "AI", "detected_content_type": ["article"], "word_limit": null, "audience_tone": "students in warm tone"}
-"write a blog about digital transformation for C-suite executives within 1500 words" → {"is_draft_intent": true, "confidence": 0.95, "detected_topic": "digital transformation", "detected_content_type": ["blog"], "word_limit": "1500", "audience_tone": "C-suite executives"}
-"write an article on "Machine Learning" focus on cybersecurity" -> {"is_draft_intent": true, "confidence": 0.95, "detected_topic": "Machine Learning", "detected_content_type": ["article"], "word_limit": null, "audience_tone": null}
-"Write an informative, analytical article on “AI Governance in Pharma ”
Focus on immediate priorities such as governance, data readiness, clinical trust, cybersecurity, workforce adoption, and ROI-driven use cases.
Maintain a neutral, balanced tone with real-world examples that are accessible to healthcare and technology leaders.
Structure the article around a clear central thesis, logical flow, and timely relevance, avoiding deep technical jargon.
Emphasize clarity, accuracy, and practical decision-making over hype or future speculation." -> {"is_draft_intent": true, "confidence": 0.95, "detected_topic": "AI Governance in Pharma", "detected_content_type": ["article"], "word_limit": null, "audience_tone": "neutral, balanced tone with real-world examples that are accessible to healthcare and technology leaders"}

"""
           user_prompt = f"Analyze this user input and determine if it indicates draft/write/create intent and extract metadata:\n\n\"{user_input}\""
           messages = [
               {"role": "system", "content": system_prompt},
               {"role": "user", "content": user_prompt}
           ] 
           # Use low temperature for consistent classification
           response = await self.llm_service.chat_completion(
               messages=messages,
               max_tokens=30000,
               temperature=0.8
           )
           # Parse JSON response
           response_text = response.strip()

           # Try to extract JSON from response
           json_start = response_text.find('{')
           json_end = response_text.rfind('}') + 1

           if json_start != -1 and json_end > json_start:
               json_text = response_text[json_start:json_end]
               result = json.loads(json_text)

               if not isinstance(result, dict):
                   raise ValueError("Invalid response format: not a dictionary")
               
               is_draft_intent = result.get("is_draft_intent", False)
               confidence = float(result.get("confidence", 0.5))
               reasoning = result.get("reasoning", "No reasoning provided")
               detected_topic = result.get("detected_topic")
               detected_content_type_raw = result.get("detected_content_type", [])
               word_limit = result.get("word_limit")
               audience_tone = result.get("audience_tone")
        
               # Clamp confidence
               confidence = max(0.0, min(1.0, confidence))

               valid_editor_ids = ["article", "blog", "whitepaper", "executive brief"]
               detected_content_type = []
               
               # Mapping from backend values to frontend values
               content_type_mapping = {
                   "article": "Article",
                   "blog": "Blog",
                   "whitepaper": "White Paper",
                   "white paper": "White Paper",
                   "executive brief": "Executive Brief"
               }

               if isinstance(detected_content_type_raw, list):
                    for editor in detected_content_type_raw:
                        editor_lower = str(editor).lower().strip()
                        # Direct match or partial match
                        for valid_id in valid_editor_ids:
                            if editor_lower == valid_id or editor_lower.replace(" ", "-") == valid_id or editor_lower.replace("-", " ") == valid_id:
                                # Map to frontend format
                                frontend_value = content_type_mapping.get(valid_id, valid_id)
                                if frontend_value not in detected_content_type:
                                    detected_content_type.append(frontend_value)
                                break

               # Fallback keyword detection if LLM did not return a content type
               if not detected_content_type:
                   user_lower = user_input.lower()
                   if 'whitepaper' in user_lower or 'white paper' in user_lower or 'white-paper' in user_lower:
                       detected_content_type.append('White Paper')
                   elif 'executive brief' in user_lower or 'executive summary' in user_lower or 'brief' in user_lower:
                       detected_content_type.append('Executive Brief')
                   elif 'blog' in user_lower:
                       detected_content_type.append('Blog')
                   elif 'article' in user_lower:
                       detected_content_type.append('Article')
               
               # Override draft intent if strong keywords are present but LLM said no
               if has_strong_keyword and not is_draft_intent:
                   is_draft_intent = True
                   confidence = max(confidence, 0.9)
                   reasoning = f"{reasoning}. Overridden due to presence of draft keywords: article/whitepaper/blog/executive brief"
                   logger.info("Overriding LLM decision - strong draft keywords detected")

               logger.info(f"Draft intent detection result: is_draft_intent={is_draft_intent}, confidence={confidence:.2f}, reasoning={reasoning}, detected_topic={detected_topic}, detected_content_type={detected_content_type}, word_limit={word_limit}, audience_tone={audience_tone}")
               return {
                   "is_draft_intent": bool(is_draft_intent),
                   "confidence": confidence,
                   "reasoning": reasoning,
                   "detected_topic": detected_topic,
                   "detected_content_type": detected_content_type,
                   "word_limit": word_limit,
                   "audience_tone": audience_tone
               }
           else:
               # Fallback
               logger.warning(f"Failed to parse JSON from LLM response for write: {response_text}")
               response_lower = response_text.lower()
               
               # Check for strong draft keywords in fallback case
               detected_content_type = []
               user_lower = user_input.lower()
               if 'whitepaper' in user_lower or 'white paper' in user_lower or 'white-paper' in user_lower:
                   detected_content_type.append('White Paper')
               if 'executive brief' in user_lower or 'executive summary' in user_lower:
                   detected_content_type.append('Executive Brief')
               if 'blog' in user_lower:
                   detected_content_type.append('Blog')
               if 'article' in user_lower:
                   detected_content_type.append('Article')
               
               # If strong keywords are present, mark as draft intent
               if has_strong_keyword or "true" in response_lower or "yes" in response_lower or "create" in response_lower or "write" in response_lower or "draft" in response_lower:
                   return {
                       "is_draft_intent": True,
                       "confidence": 0.9 if has_strong_keyword else 0.6,
                       "reasoning": "Draft keywords detected" if has_strong_keyword else "Parsed from text response (JSON parsing failed)",
                       "detected_topic": None,
                       "detected_content_type": detected_content_type if detected_content_type else None,
                       "word_limit": None,
                       "audience_tone": None
                   }
               else:
                   return {
                       "is_draft_intent": False,
                       "confidence": 0.6,
                       "reasoning": "Parsed from text response (JSON parsing failed)",
                       "detected_topic": None,
                       "detected_content_type": None,
                       "word_limit": None,
                       "audience_tone": None
                   }
       except Exception as e:
           logger.error(f"Error in draft intent detection: {str(e)}", exc_info=True)
           return {
               "is_draft_intent": False,
               "confidence": 0.0,
               "reasoning": f"Error: {str(e)}",
               "detected_topic": None,
               "detected_content_type": None
           }
