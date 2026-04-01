from typing import List
import os
import re

from dotenv import load_dotenv
from docx import Document

from langchain.agents import create_agent
from langchain_openai import ChatOpenAI
from langchain.agents.structured_output import ToolStrategy
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.messages import HumanMessage
from app.core.deps import get_llm_client_agent

from .schema import DocumentStructure, DocumentBlock, BlockType, EditorResult



llm = get_llm_client_agent()


SYSTEM_PROMPT = """
You are a document structure analyzer.

Objective:
Break down the provided document into an ordered list of structured blocks:
- Title
- Section headings
- Paragraphs
- Bullet items

You MUST output valid JSON matching the DocumentStructure schema provided below.

-----------------------------------------
Schema Requirements (MANDATORY)
-----------------------------------------

DocumentStructure:
- blocks: Array<DocumentBlock>

DocumentBlock:
- id: string (b1, b2, b3, ...)
- type: one of ["title", "heading", "paragraph", "bullet_item"]
- level:
    * 0 for title
    * 1–3 for headings (1=main, 2=sub, 3=sub-sub)
    * 0 for paragraphs and bullet items
- text: string (exact original text including any bullet prefix character; do NOT strip • - * – from the start)

-----------------------------------------
Parsing Rules (MANDATORY)
-----------------------------------------

- Process the document strictly top-to-bottom. Never reorder or move content.
- Preserve all original text exactly, including leading bullet prefix characters (•, -, *, –, —, ➤, ✓).
- If a line begins with a bullet prefix (•, -, *, –, —, ➤, ✓), classify it as type "bullet_item"
  and preserve the prefix character at the start of the "text" field exactly as written.
  Example: "• Reduce costs" → { "type": "bullet_item", "text": "• Reduce costs" }
  Example: "- Improve margins" → { "type": "bullet_item", "text": "- Improve margins" }
  Do NOT strip the bullet character from the text field.
- Merge multi-line paragraphs.
- A heading must appear alone on a line and look like a heading.
- Extract bullet items one-by-one.
- Assign IDs sequentially based on appearance.

-----------------------------------------
Special Filtering Rule (MANDATORY)
-----------------------------------------

- If a line is a generic placeholder heading such as:
  "Content", "Contents", or "Table of Contents",
  then IGNORE this line completely and do NOT include it as a block.

- A placeholder heading is defined strictly as:
  * A standalone line (not part of a paragraph or sentence)
  * Contains only 1–3 words
  * Matches exactly one of:
      "Content"
      "Contents"
      "Table of Contents"
  * May optionally end with a colon (e.g., "Contents:")

- This rule applies ONLY when the line exactly matches the above patterns.

- Do NOT remove or modify:
  * Headings like "Content Strategy", "Content Overview", "Content Marketing"
  * Any paragraph or sentence containing the word "content"
  * Any actual document content under these headings

- Only skip the placeholder heading line itself. All following content must still be processed normally.

-----------------------------------------
Output:
Return ONLY the JSON for DocumentStructure. No explanation, no commentary.
"""


class Context:
    user_id: str = "1"


checkpointer = InMemorySaver()


agent = create_agent(
    model=llm,
    system_prompt=SYSTEM_PROMPT,
    tools=[],
    context_schema=Context,
    response_format=ToolStrategy(DocumentStructure),
    checkpointer=checkpointer,
)


# Word bullet style names — extend this set if your docx uses custom styles
BULLET_STYLES = {
    "List Bullet",
    "List Bullet 2",
    "List Bullet 3",
    "List Bullet 4",
    "List Bullet 5",
    "List Paragraph",   # Word's default indented bullet when no explicit style is set
    "List Continue",
    "List Continue 2",
    "List Continue 3",
}

# Characters that unambiguously mark a line as a bullet when at position 0
BULLET_CHARS = ("•", "-", "*", "–", "—", "➤", "✓")


def _paragraph_is_bullet(paragraph) -> bool:
    """
    Return True if a python-docx Paragraph is a bullet/list item.

    Checks THREE independent signals (any one is sufficient):
    1. The paragraph style name is in BULLET_STYLES.
    2. The paragraph XML has <w:numPr> (Word automatic list, any style name).
    3. The paragraph text starts with a known bullet character.
       This catches manually-typed bullets in Normal-style paragraphs
       where the author typed "• text" without using Word's list feature
       — those have numPr=False and style='Normal' yet are visually bullets.
    """
    style_name = paragraph.style.name if paragraph.style else ""
    if style_name in BULLET_STYLES:
        return True

    # Check for numPr in paragraph properties (covers custom bullet styles)
    pPr = paragraph._element.pPr
    if pPr is not None and pPr.numPr is not None:
        return True

    # FIX: detect manually-typed bullet chars in Normal paragraphs
    text = paragraph.text.strip()
    if text and text[0] in BULLET_CHARS:
        return True

    return False


def _detect_bullet_char(paragraph) -> str:
    """
    Return the bullet character to prepend, or '' if the text already
    has one (to avoid double-prefixing like '•• text').
    """
    text = paragraph.text.strip()
    if text and text[0] in BULLET_CHARS:
        return ""   # already has a bullet prefix — do not add another
    return "•"


def generate_title_from_content(document_text: str) -> str:
    """
    Generate a title based on the entire document content using LLM.
    Used when no title is found in the segmented document.
    """
    title_prompt = f"""Based on the following document content, generate a concise and descriptive title (maximum 100 characters).

Document Content:
\"\"\"{document_text}\"\"\"

Generate only the title text, nothing else. The title should:
- Be clear and descriptive
- Capture the main topic or theme
- Be professional and appropriate
- Not exceed 200 characters

Title:"""
    
    try:
        response = llm.invoke([HumanMessage(content=title_prompt)])
        title = response.content.strip() if hasattr(response, "content") else str(response).strip()
        # Remove quotes if LLM added them
        title = re.sub(r'^["\']|["\']$', "", title)
        # Limit to 200 characters
        title = title[:200].strip()
        return title if title else "Document"
    except Exception as e:
        # Fallback: use first sentence or first 50 chars
        first_sentence = document_text.split('.')[0].strip()[:100]
        return first_sentence if first_sentence else "Document"


def segment_document_with_llm(document_text: str, thread_id: str = "doc-1") -> DocumentStructure:
    response = agent.invoke(
        {
            "messages": [
                {
                    "role": "user",
                    "content": f"DOCUMENT:\n\"\"\"{document_text}\"\"\"",
                }
            ]
        },
        config={"configurable": {"thread_id": thread_id}},
        context=Context(),
    )

    doc_struct: DocumentStructure = response["structured_response"]
    
    # Check if there's a title block
    has_title = any(block.type == "title" for block in doc_struct.blocks)
    
    if not has_title:
        # Generate title from all paragraph content
        # Collect all text from paragraphs and headings
        all_content = []
        for block in doc_struct.blocks:
            if block.type in ["paragraph", "heading"]:
                all_content.append(block.text)
        
        # If no paragraphs/headings, use the original document text
        content_for_title = "\n\n".join(all_content) if all_content else document_text
        
        # Generate title
        generated_title = generate_title_from_content(content_for_title)
        
        # Create title block as first block
        title_block = DocumentBlock(
            id="b1",
            type="title",
            level=0,
            text=generated_title
        )
        
        # Renumber all existing blocks (b1 -> b2, b2 -> b3, etc.)
        renumbered_blocks = [title_block]
        for block in doc_struct.blocks:
            # Extract number from existing id (e.g., "b1" -> 1)
            match = re.match(r'b(\d+)', block.id)
            if match:
                old_num = int(match.group(1))
                new_num = old_num + 1
                new_id = f"b{new_num}"
            else:
                # Fallback: if id doesn't match pattern, use index + 2 (since title is b1)
                new_id = f"b{len(renumbered_blocks) + 1}"
            
            renumbered_blocks.append(
                DocumentBlock(
                    id=new_id,
                    type=block.type,
                    level=block.level,
                    text=block.text
                )
            )
        
        doc_struct = DocumentStructure(blocks=renumbered_blocks)
    
    return doc_struct


def read_docx_text(path: str) -> str:
    doc = Document(path)
    lines = []

    for paragraph in doc.paragraphs:
        text = paragraph.text.strip()
        if not text:
            continue

        if _paragraph_is_bullet(paragraph):
            # FIX: use _detect_bullet_char so we never double-prefix
            prefix = _detect_bullet_char(paragraph)
            lines.append(f"{prefix} {text}" if prefix else text)
        else:
            lines.append(text)

    return "\n\n".join(lines)


def apply_decisions_to_document(
    original_doc: DocumentStructure,
    editor_result: EditorResult,
    paragraph_edits: List[dict],
    decisions: List[dict],
    accept_all: bool = False,
    reject_all: bool = False
) -> DocumentStructure:
    """
    Apply user decisions (approve/reject) to update the document.
    The updated document becomes the base for the next editor.
    
    Args:
        original_doc: The original document structure
        editor_result: The current editor's result
        paragraph_edits: List of paragraph edit objects from frontend
        decisions: List of decision objects with index and approved status
        accept_all: Global flag to accept all edits
        reject_all: Global flag to reject all edits
    
    Returns:
        Updated DocumentStructure with approved/rejected changes applied
    """
    # Build decision map for quick lookup
    decision_map = {
        d["index"]: d.get("approved")
        for d in decisions
    }
    
    # Create a map of block_id to updated text from editor_result
    # Ensure we have BlockEditResult objects with proper attributes
    editor_block_map = {}
    for block in editor_result.blocks:
        # Handle both BlockEditResult objects and dicts (for safety)
        if hasattr(block, 'id'):
            block_id = block.id
            suggested = getattr(block, 'suggested_text', None) or getattr(block, 'original_text', None)
        elif isinstance(block, dict):
            block_id = block.get('id')
            suggested = block.get('suggested_text') or block.get('original_text')
        else:
            continue
        
        if block_id:
            editor_block_map[block_id] = suggested
    
    # Update blocks based on decisions
    updated_blocks = []
    for i, block in enumerate(original_doc.blocks):
        # Get decision for this block (by index)
        approved = decision_map.get(i)
        auto_approved = paragraph_edits[i].get("autoApproved", False) if i < len(paragraph_edits) else False
        
        # Determine final text based on user decisions
        if reject_all:
            # Reject all: use original
            final_text = block.text
        elif accept_all:
            # Accept all: use edited version (fallback to original if not found)
            final_text = editor_block_map.get(block.id, block.text)
        elif approved is True:
            # Explicitly approved: use edited (fallback to original if not found)
            final_text = editor_block_map.get(block.id, block.text)
        elif approved is False:
            # Explicitly rejected: use original
            final_text = block.text
        elif approved is None and auto_approved:
            # Auto-approved (unchanged): use edited (which should be same as original)
            final_text = editor_block_map.get(block.id, block.text)
        else:
            # Default: use original
            final_text = block.text
        
        # Create updated block with new text
        updated_blocks.append(
            DocumentBlock(
                id=block.id,
                type=block.type,
                level=block.level,
                text=final_text
            )
        )
    
    return DocumentStructure(blocks=updated_blocks)
