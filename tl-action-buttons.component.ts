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
- text: string (exact original text; do NOT modify wording)

-----------------------------------------
Parsing Rules (MANDATORY)
-----------------------------------------

- Process the document strictly top-to-bottom. Never reorder or move content.
- Preserve all original text exactly.
- Merge multi-line paragraphs.
- A heading must appear alone on a line and look like a heading.
- Extract bullet items one-by-one.
- Assign IDs sequentially based on appearance.

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
- Not exceed 100 characters

Title:"""
    
    try:
        response = llm.invoke([HumanMessage(content=title_prompt)])
        title = response.content.strip() if hasattr(response, 'content') else str(response).strip()
        # Remove quotes if LLM added them
        title = re.sub(r'^["\']|["\']$', '', title)
        # Limit to 100 characters
        title = title[:100].strip()
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
    return "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())


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
