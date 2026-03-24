from typing import List
import re

from docx import Document

from langchain.agents import create_agent
from langchain.agents.structured_output import ToolStrategy
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.messages import HumanMessage
from app.core.deps import get_llm_client_agent

from .schema import DocumentStructure, DocumentBlock, EditorResult


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

How to choose type (mutually exclusive):
- "title": The document's main title line only. Plain text with NO bullet prefix (•, -, *, –, —). One title block if present.
- "heading": Section or subsection labels. NO bullet prefix. Use level 1–3 for outline depth only.
- "paragraph": Normal body text. NO bullet prefix on the line.
- "bullet_item": Any line that begins (after optional whitespace) with a bullet prefix. Always level 0.

-----------------------------------------
Parsing Rules (MANDATORY) — apply in this order
-----------------------------------------

PRIORITY 1 — Bullet prefix (overrides title/heading/paragraph):
- If a logical line begins with a bullet prefix (•, -, *, –, — after optional leading whitespace),
  it MUST be type "bullet_item" with level 0. NEVER use "title", "heading", or "paragraph" for that line.
- Preserve the prefix at the start of "text" exactly as in the source.
  Example: "• Reduce costs" → { "type": "bullet_item", "level": 0, "text": "• Reduce costs" }
  Example: "- Improve margins" → { "type": "bullet_item", "level": 0, "text": "- Improve margins" }

PRIORITY 2 — Structure:
- Process the document strictly top-to-bottom. Never reorder or move content.
- Preserve all original text exactly, including leading bullet prefix characters (•, -, *, –, —).
- Do NOT remove or alter bullet prefixes from the DOCUMENT when copying into each block's "text" field.
- Merge multi-line paragraphs.
- A heading must appear alone on a line and look like a heading (only when PRIORITY 1 does not apply).
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


# Word bullet style names — extend if your docx uses custom styles; numPr also marks lists.
BULLET_STYLES = {
    "List Bullet",
    "List Bullet 2",
    "List Bullet 3",
    "List Bullet 4",
    "List Bullet 5",
    "List Bullet 6",
    "List Paragraph",
    "List Continue",
    "List Continue 2",
    "List Continue 3",
    "List Continue 4",
    "List Continue 5",
    "Bullet List",
    "Bullet List 2",
    "Bullet List 3",
    "List Library Bullet",
}


def _paragraph_is_bullet(paragraph) -> bool:
    """
    True if this python-docx paragraph is a list item: known bullet style, style name contains
    'bullet', or paragraph XML has w:numPr (Word list numbering).
    """
    style_name = paragraph.style.name if paragraph.style else ""
    if style_name in BULLET_STYLES:
        return True
    if style_name and "bullet" in style_name.lower():
        return True
    pPr = paragraph._element.pPr
    if pPr is not None and pPr.numPr is not None:
        return True
    return False


def _text_has_leading_bullet_prefix(text: str) -> bool:
    s = text.strip()
    if not s:
        return False
    return s[0] in ("•", "-", "*", "–", "—")


def _fix_bullet_items_after_llm(
    doc_struct: DocumentStructure, document_text: str
) -> DocumentStructure:
    """
    Bullet-prefixed lines must be bullet_item. Prefer raw DOCUMENT segment when aligned with blocks
    (recovers prefix if the model stripped it).
    """
    segments = [s.strip() for s in document_text.split("\n\n") if s.strip()]
    aligned = len(segments) == len(doc_struct.blocks)
    out: List[DocumentBlock] = []
    for i, block in enumerate(doc_struct.blocks):
        seg = segments[i] if aligned else None
        if seg is not None and _text_has_leading_bullet_prefix(seg):
            t = seg
        elif _text_has_leading_bullet_prefix(block.text):
            t = block.text
        else:
            out.append(block)
            continue
        out.append(DocumentBlock(id=block.id, type="bullet_item", level=0, text=t))
    return DocumentStructure(blocks=out)


def generate_title_from_content(document_text: str) -> str:
    """
    Generate a title when no title block exists in the segmented document.
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
        title = re.sub(r'^["\']|["\']$', "", title)
        title = title[:200].strip()
        return title if title else "Document"
    except Exception:
        first_sentence = document_text.split(".")[0].strip()[:100]
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
    doc_struct = _fix_bullet_items_after_llm(doc_struct, document_text)

    has_title = any(block.type == "title" for block in doc_struct.blocks)

    if not has_title:
        all_content = []
        for block in doc_struct.blocks:
            if block.type in ["paragraph", "heading"]:
                all_content.append(block.text)

        content_for_title = "\n\n".join(all_content) if all_content else document_text
        generated_title = generate_title_from_content(content_for_title)

        title_block = DocumentBlock(
            id="b1",
            type="title",
            level=0,
            text=generated_title,
        )

        renumbered_blocks = [title_block]
        for block in doc_struct.blocks:
            match = re.match(r"b(\d+)", block.id)
            if match:
                old_num = int(match.group(1))
                new_id = f"b{old_num + 1}"
            else:
                new_id = f"b{len(renumbered_blocks) + 1}"

            renumbered_blocks.append(
                DocumentBlock(
                    id=new_id,
                    type=block.type,
                    level=block.level,
                    text=block.text,
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
            # numPr applies to numbered lists too; keep "1. " lines as-is (no extra •).
            if re.match(r"^\s*\d+\.\s", text):
                lines.append(text)
            elif text and text[0] in ("•", "-", "*", "–", "—"):
                lines.append(text)
            else:
                lines.append(f"• {text}")
        else:
            lines.append(text)

    return "\n\n".join(lines)


def apply_decisions_to_document(
    original_doc: DocumentStructure,
    editor_result: EditorResult,
    paragraph_edits: List[dict],
    decisions: List[dict],
    accept_all: bool = False,
    reject_all: bool = False,
) -> DocumentStructure:
    """
    Apply user decisions (approve/reject) to update the document for the next editor pass.
    """
    decision_map = {d["index"]: d.get("approved") for d in decisions}

    editor_block_map = {}
    for block in editor_result.blocks:
        if hasattr(block, "id"):
            block_id = block.id
            suggested = getattr(block, "suggested_text", None) or getattr(
                block, "original_text", None
            )
        elif isinstance(block, dict):
            block_id = block.get("id")
            suggested = block.get("suggested_text") or block.get("original_text")
        else:
            continue

        if block_id:
            editor_block_map[block_id] = suggested

    updated_blocks = []
    for i, block in enumerate(original_doc.blocks):
        approved = decision_map.get(i)
        auto_approved = (
            paragraph_edits[i].get("autoApproved", False) if i < len(paragraph_edits) else False
        )

        if reject_all:
            final_text = block.text
        elif accept_all:
            final_text = editor_block_map.get(block.id, block.text)
        elif approved is True:
            final_text = editor_block_map.get(block.id, block.text)
        elif approved is False:
            final_text = block.text
        elif approved is None and auto_approved:
            final_text = editor_block_map.get(block.id, block.text)
        else:
            final_text = block.text

        updated_blocks.append(
            DocumentBlock(
                id=block.id,
                type=block.type,
                level=block.level,
                text=final_text,
            )
        )

    return DocumentStructure(blocks=updated_blocks)
