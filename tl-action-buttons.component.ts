import copy
from csv import writer
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, PageBreak, Flowable, ListFlowable, ListItem, KeepTogether
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_CENTER
from reportlab.lib import colors
import docx
from docx import Document
from docx.shared import Pt as DocxPt, Inches as DocxInches, RGBColor as DocxRGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from pypdf import PdfReader, PdfWriter
from html import unescape
import io
import logging
import os
import re
import zipfile
import itertools
import tempfile
from typing import List, Dict, Optional
from xml.etree import ElementTree as ET
from io import BytesIO
from docx.enum.text import WD_ALIGN_PARAGRAPH
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(BASE_DIR, "..", "assets", "fonts")

pdfmetrics.registerFont(TTFont("DejaVu",os.path.join(FONT_DIR,  "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("DejaVu-Bold",  os.path.join(FONT_DIR,"DejaVuSans-Bold.ttf")))

# Path to PwC templates
PWC_TEMPLATE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))),"app","features","thought_leadership","template", "pwc_doc_template_2025.docx")
PWC_PDF_TEMPLATE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))),"app","features","thought_leadership","template", "pwc_pdf_template_2025.pdf")


def _get_existing_pwc_pdf_template_path() -> str:
    """
    Resolve the PwC PDF template path across common runtime layouts.

    In some deployments the repo is installed as a package (site-packages/app/..),
    while in others it runs from the checked-out source tree. This helper checks a
    small set of likely locations and returns the first hit. If none are present,
    it raises so callers can surface a clear error instead of silently falling
    back to the unbranded PDF.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    candidates = [
        # Standard relative path from this module (source tree or editable install)
        os.path.join(base_dir, "app", "features", "thought_leadership", "template", "pwc_pdf_template_2025.pdf"),
        # If the module is under site-packages/app/, the templates may sit alongside the package
        os.path.join(base_dir, "features", "thought_leadership", "template", "pwc_pdf_template_2025.pdf"),
        # Fallback to current working directory (useful in packaged container layouts)
        os.path.join(os.getcwd(), "app", "features", "thought_leadership", "template", "pwc_pdf_template_2025.pdf"),
    ]

    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate

    logger.error("PwC PDF template not found. Checked: %s", " | ".join(candidates))
    raise FileNotFoundError("PwC PDF template (pwc_pdf_template_2025.pdf) is missing")

_bookmark_counter = itertools.count(1)

def sanitize_text_for_word(text: str) -> str:
    """
    Sanitize text for Word export by ensuring all Unicode characters are properly encoded.
    This fixes encoding issues with special characters like em dashes, smart quotes, etc.
    """
    if not isinstance(text, str):
        text = str(text)
    
    # Ensure the text is valid Unicode
    try:
        # Normalize unicode (NFKC normalization handles most compatibility issues)
        text = text.encode('utf-8', errors='replace').decode('utf-8', errors='replace')
    except Exception as e:
        logger.warning(f"Error sanitizing text: {e}, using as-is")
    
    return text


def _fix_docx_encoding(buffer_bytes: bytes) -> bytes:
    """
    Fix DOCX encoding issues by re-serializing XML with proper UTF-8 encoding.
    This ensures all Unicode characters are properly handled in the Word document.
    """
    try:
        # Work with the bytes directly without temp file to avoid locking issues
        import io as io_module
        
        # Read the DOCX (which is a ZIP) directly from bytes
        try:
            input_zip = io_module.BytesIO(buffer_bytes)
            file_contents = {}
            
            with zipfile.ZipFile(input_zip, 'r') as zip_read:
                # Extract all files
                for name in zip_read.namelist():
                    try:
                        file_contents[name] = zip_read.read(name)
                    except Exception as e:
                        logger.warning(f"Could not read {name} from ZIP: {e}")
                        continue
            
            # Re-create the DOCX with proper UTF-8 encoding
            output_buffer = io_module.BytesIO()
            with zipfile.ZipFile(output_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_write:
                for name, content in file_contents.items():
                    # For XML files, ensure proper encoding
                    if name.endswith('.xml'):
                        try:
                            # Try to parse and re-serialize to ensure UTF-8
                            tree = ET.fromstring(content)
                            # Convert back to string with UTF-8 encoding
                            xml_str = ET.tostring(tree, encoding='unicode')
                            # Prepend XML declaration with UTF-8 encoding if not present
                            if not xml_str.startswith('<?xml'):
                                xml_str = '<?xml version="1.0" encoding="UTF-8"?>' + xml_str
                            content = xml_str.encode('utf-8')
                        except ET.ParseError as e:
                            logger.warning(f"Could not parse XML {name}: {e}, keeping original bytes")
                        except Exception as e:
                            logger.warning(f"Could not re-encode {name}: {e}, keeping original")
                    
                    try:
                        zip_write.writestr(name, content)
                    except Exception as e:
                        logger.warning(f"Could not write {name} to ZIP: {e}")
                        continue
            
            result = output_buffer.getvalue()
            logger.info(f"[_fix_docx_encoding] Successfully re-encoded DOCX with UTF-8, size: {len(result)} bytes")
            return result
        
        except Exception as e:
            logger.warning(f"[_fix_docx_encoding] Error during ZIP processing: {e}, returning original")
            return buffer_bytes
    
    except Exception as e:
        logger.warning(f"[_fix_docx_encoding] Failed to fix DOCX encoding: {e}, returning original")
        return buffer_bytes

def extract_subtitle_from_content(content: str) -> tuple[str, str]:
    """
    Extract subtitle from the first line of content.
    Returns (subtitle, remaining_content)
    
    The first non-empty line (after any markdown heading markers) becomes the subtitle,
    and the rest becomes the content.
    """
    lines = content.strip().split('\n')
    
    if not lines:
        return "", content
    
    # Get first non-empty line
    first_line = ""
    remaining_lines = []
    found_first = False
    
    for line in lines:
        stripped = line.strip()
        if not found_first and stripped:
            # Remove markdown heading markers from first line if present
            first_line = re.sub(r'^#+\s*', '', stripped)
            # Remove bold markers (both paired and stray **)
            first_line = re.sub(r'\*\*(.+?)\*\*', r'\1', first_line)
            # Remove any remaining stray ** characters
            first_line = first_line.replace('**', '')
            found_first = True
        elif found_first:
            remaining_lines.append(line)
    
    # Reconstruct remaining content
    remaining_content = '\n'.join(remaining_lines).strip()
    
    return first_line, remaining_content

def _apply_body_text_style_word(para):
    """
    Apply PwC Body Text style to a Word paragraph.
    Font size: 11pt, Line spacing: 1.5 lines, Space After pre-set.
    """
    para.paragraph_format.space_after = DocxPt(6)  # Pre-set spacing
    if para.runs:
        para.runs[0].font.size = DocxPt(11)
    para.paragraph_format.line_spacing = 1.5

def _detect_list_type(line: str, level: int = 0) -> tuple[str, int]:
    """
    Detect list type from a line of content.
    Returns: (list_type, detected_level)
    list_type: 'bullet', 'number', 'alpha_upper', 'alpha_lower', 'none'
    detected_level: 0 for first level, 1+ for nested (based on indentation)
    """
    line_stripped = line.strip()
    if not line_stripped:
        return 'none', 0
    
    # Check for numbered list (1., 2., 3., etc.)
    number_match = re.match(r'^(\d+)\.\s+(.*)', line_stripped)
    if number_match:
        # Check indentation for nesting level
        indent_level = (len(line) - len(line.lstrip())) // 4  # Approximate: 4 spaces = 1 level
        return 'number', max(0, indent_level)
    
    # Check for uppercase alphabetical list (A., B., C., etc.)
    alpha_upper_match = re.match(r'^([A-Z])\.\s+(.*)', line_stripped)
    if alpha_upper_match:
        indent_level = (len(line) - len(line.lstrip())) // 4
        return 'alpha_upper', max(0, indent_level)
    
    # Check for lowercase alphabetical list (a., b., c., etc.)
    alpha_lower_match = re.match(r'^([a-z])\.\s+(.*)', line_stripped)
    if alpha_lower_match:
        indent_level = (len(line) - len(line.lstrip())) // 4
        return 'alpha_lower', max(0, indent_level)
    
    # Check for bullet list (•, -, *, etc.)
    bullet_match = re.match(r'^[•\-\*]\s+(.*)', line_stripped)
    if bullet_match:
        indent_level = (len(line) - len(line.lstrip())) // 4
        return 'bullet', max(0, indent_level)
    
    return 'none', 0

def _numbering_root(numbering_part):
    """Get the numbering XML root; use public .element (cloud/compat) or fallback to ._numbering."""
    return getattr(numbering_part, 'element', None) or getattr(numbering_part, '_numbering', None)

def _get_next_abstract_num_id(numbering_part):
    """Get the next available abstract numbering ID by finding the maximum existing ID."""
    root = _numbering_root(numbering_part)
    if root is None:
        return 1
    max_id = 0
    for abstract_num in root.findall(qn('w:abstractNum')):
        abstract_num_id_attr = abstract_num.get(qn('w:abstractNumId'))
        if abstract_num_id_attr:
            try:
                max_id = max(max_id, int(abstract_num_id_attr))
            except (ValueError, TypeError):
                pass
    return max_id + 1

def _get_next_num_id(numbering_part):
    """Get the next available numbering ID by finding the maximum existing ID."""
    root = _numbering_root(numbering_part)
    if root is None:
        return 1
    max_id = 0
    for num in root.findall(qn('w:num')):
        num_id_attr = num.get(qn('w:numId'))
        if num_id_attr:
            try:
                max_id = max(max_id, int(num_id_attr))
            except (ValueError, TypeError):
                pass
    return max_id + 1

def _create_new_numbering_instance(doc: Document, list_type: str, level: int = 0):
    """
    Create a new numbering instance for Word lists to reset numbering.
    Returns the num_id to use for the list.
    """
    numbering_part = doc.part.numbering_part
    
    # Create a new abstract numbering definition
    abstract_num_id = _get_next_abstract_num_id(numbering_part)
    
    abstract_num = OxmlElement("w:abstractNum")
    abstract_num.set(qn("w:abstractNumId"), str(abstract_num_id))
    
    lvl = OxmlElement("w:lvl")
    lvl.set(qn("w:ilvl"), str(level))
    
    start = OxmlElement("w:start")
    start.set(qn("w:val"), "1")  # Always start from 1
    
    lvl_restart = OxmlElement("w:lvlRestart")
    lvl_restart.set(qn("w:val"), "1")
    
    num_fmt = OxmlElement("w:numFmt")
    if list_type == 'number':
        num_fmt.set(qn("w:val"), "decimal")
        lvl_text = OxmlElement("w:lvlText")
        lvl_text.set(qn("w:val"), "%1.")
    elif list_type == 'alpha_upper':
        num_fmt.set(qn("w:val"), "upperLetter")
        lvl_text = OxmlElement("w:lvlText")
        lvl_text.set(qn("w:val"), "%1.")
    elif list_type == 'alpha_lower':
        num_fmt.set(qn("w:val"), "lowerLetter")
        lvl_text = OxmlElement("w:lvlText")
        lvl_text.set(qn("w:val"), "%1.")
    else:
        # Bullet list
        num_fmt.set(qn("w:val"), "bullet")
        lvl_text = OxmlElement("w:lvlText")
        lvl_text.set(qn("w:val"), "•")
    
    lvl.extend([start, lvl_restart, num_fmt, lvl_text])
    abstract_num.append(lvl)
    root = _numbering_root(numbering_part)
    if root is not None:
        root.append(abstract_num)
    
    # Create a new numbering instance
    num_id = _get_next_num_id(numbering_part)
    
    num = OxmlElement("w:num")
    num.set(qn("w:numId"), str(num_id))
    
    abstract_ref = OxmlElement("w:abstractNumId")
    abstract_ref.set(qn("w:val"), str(abstract_num_id))
    
    num.append(abstract_ref)
    if root is not None:
        root.append(num)
    
    return num_id

def _add_list_to_document(doc: Document, list_items: list[dict], list_type: str, reset_numbering: bool = False, force_bullet_style: bool = False):
    """
    Add a list of items to Word document with appropriate style based on type and level.
    If reset_numbering is True, creates a new numbering instance to reset numbering to 1.
    If force_bullet_style is True, all lists use bullet icons regardless of list_type (for edit content export).
    """
    if not list_items:
        return
    
    # If forcing bullet style, treat all lists as bullets (for edit content export)
    if force_bullet_style:
        list_type = 'bullet'
    
    # Create new numbering instance if reset is needed (for numbered/alphabetical lists only, not bullets)
    num_id = None
    if reset_numbering and list_type in ['number', 'alpha_upper', 'alpha_lower']:
        num_id = _create_new_numbering_instance(doc, list_type, 0)
    
    # Match URL with or without brackets: stop at ] or whitespace so [https://...] works as clickable link
    url_pattern = re.compile(r'(https?://[^\s\]]+)')
    for item in list_items:
        content = item.get('content', '')
        level = item.get('level', 0)
        parsed = item.get('parsed', parse_bullet(content))
        # Determine style based on list type and level
        if list_type == 'bullet':
            style_name = "List Bullet 2" if level >= 1 else "List Bullet"
        elif list_type == 'number':
            style_name = "List Number 2" if level >= 1 else "List Number"
        elif list_type == 'alpha_upper':
            style_name = "List Alpha 2" if level >= 1 else "List Alpha"
        elif list_type == 'alpha_lower':
            style_name = "List Alpha 2" if level >= 1 else "List Alpha"
        else:
            style_name = "List Bullet" if level == 0 else "List Bullet 2"
        try:
            para = doc.add_paragraph(style=style_name)
        except:
            para = doc.add_paragraph(style="List Bullet")
        if num_id is not None:
            pPr = para._p.get_or_add_pPr()
            numPr = OxmlElement("w:numPr")
            ilvl = OxmlElement("w:ilvl")
            ilvl.set(qn("w:val"), str(level))
            numId_elem = OxmlElement("w:numId")
            numId_elem.set(qn("w:val"), str(num_id))
            numPr.extend([ilvl, numId_elem])
            pPr.append(numPr)
        _apply_body_text_style_word(para)
        clean_content = content
        if force_bullet_style:
            clean_content = re.sub(r'^\d+\.\s+', '', content.strip())
            clean_content = re.sub(r'^[A-Za-z]\.\s+', '', clean_content.strip())
            clean_content = re.sub(r'^[•\-\*]\s+', '', clean_content.strip())
        elif list_type == 'number':
            clean_content = re.sub(r'^\d+\.\s+', '', content.strip())
        elif list_type in ['alpha_upper', 'alpha_lower']:
            clean_content = re.sub(r'^[A-Za-z]\.\s+', '', content.strip())
        elif list_type == 'bullet':
            clean_content = re.sub(r'^[•\-\*]\s+', '', content.strip())
        # If the content contains a URL, add as hyperlink (use add_hyperlink for clickable links)
        match = url_pattern.search(clean_content)
        if match:
            url = match.group(1)
            before_url = clean_content.split(url)[0].strip()
            after_url = clean_content.split(url)[1].strip() if len(clean_content.split(url)) > 1 else ""
            if before_url:
                para.add_run(sanitize_text_for_word(before_url) + " ")
            url_norm = _normalize_citation_url_for_word(url)
            add_hyperlink(para, url_norm, sanitize_text_for_word(url) or url, no_break=True, doc=doc)
            # Ensure there is a run after the hyperlink (Word/Word Online often need this for link to be clickable)
            if after_url:
                para.add_run(" " + sanitize_text_for_word(after_url))
            else:
                para.add_run(" ")
        elif parsed.get('label') and parsed.get('body'):
            run = para.add_run(sanitize_text_for_word(parsed['label']))
            run.bold = True
            para.add_run(f": {sanitize_text_for_word(parsed['body'])}")
        else:
            _add_markdown_text_runs(para, clean_content)

def _add_list_as_paragraphs_word(doc: Document, list_items: list[dict], prev_block_type: str = None, next_block: dict = None):
    """
    Add numbered/alpha list items as body paragraphs with full content (number/letter included).
    Used for edit content export so export matches final article response exactly - no reorder, no re-number.
    """
    if not list_items:
        return
    url_pattern = re.compile(r'(https?://[^\s\]]+)')
    for item in list_items:
        content = item.get('content', '').strip()
        if not content:
            continue
        para = doc.add_paragraph(style="Body Text")
        _apply_body_text_style_word(para)
        para.paragraph_format.space_before = DocxPt(2)
        para.paragraph_format.space_after = DocxPt(3)
        if next_block and (next_block.get('type') == 'list_item' or next_block.get('type') == 'bullet_item'):
            para.paragraph_format.space_after = DocxPt(3)
        match = url_pattern.search(content)
        if match:
            url = match.group(1)
            before_url = content.split(url)[0].strip()
            after_url = content.split(url)[1].strip() if len(content.split(url)) > 1 else ""
            if before_url:
                para.add_run(sanitize_text_for_word(before_url) + " ")
            url_norm = _normalize_citation_url_for_word(url)
            add_hyperlink(para, url_norm, sanitize_text_for_word(url) or url, no_break=True, doc=doc)
            if after_url:
                para.add_run(" " + sanitize_text_for_word(after_url))
            else:
                para.add_run(" ")
        else:
            _add_markdown_text_runs(para, content)

def _add_list_as_paragraphs_pdf(story: list, list_items: list[dict], body_style: ParagraphStyle,
                                 prev_block_type: str = None, next_block: dict = None):
    """
    Add numbered/alpha list items as PDF paragraphs with full content (number/letter included).
    Used for edit content PDF export so export matches final article response exactly - no reorder, no re-number.
    """
    if not list_items:
        return
    url_pattern = re.compile(r'(https?://\S+)')
    space_before = 3 if prev_block_type == 'paragraph' else 6
    space_after = 3 if next_block and next_block.get('type') == 'paragraph' else 6
    for j, item in enumerate(list_items):
        content = item.get('content', '').strip()
        if not content:
            continue
        para_style = ParagraphStyle(
            'PWCListPara',
            parent=body_style,
            spaceBefore=space_before if j == 0 else 3,
            spaceAfter=space_after if j == len(list_items) - 1 else 3,
        )
        match = url_pattern.search(content)
        if match:
            url = match.group(1)
            before_url = content.split(url)[0].strip()
            after_url = content.split(url)[1].strip() if len(content.split(url)) > 1 else ""
            if before_url:
                formatted_text = _format_content_for_pdf(before_url) + " "
            else:
                formatted_text = ""
            formatted_text += f'<a href="{url}">{_format_content_for_pdf(url) or url}</a>'
            if after_url:
                formatted_text += " " + _format_content_for_pdf(after_url)
            else:
                formatted_text += " "
        else:
            formatted_text = _format_content_for_pdf(content)
        story.append(Paragraph(formatted_text, para_style))

def _add_list_to_pdf(story: list, list_items: list[dict], list_type: str, body_style: ParagraphStyle, 
                     prev_block_type: str = None, next_block: dict = None, start_from: int = 1, use_bullet_icons_only: bool = True):
    """
    Add a list of items to PDF story.
    If use_bullet_icons_only is True (default), all lists use bullet icons (legacy behavior).
    If use_bullet_icons_only is False, numbered/alpha lists use numbers/letters; bullet lists use bullet icons (edit content export).
    """
    if not list_items:
        return
    
    from reportlab.platypus import ListFlowable, ListItem
    
    # Create list items; remove number/letter/bullet prefix (list styling adds numbers/bullets)
    pdf_list_items = []
    
    url_pattern = re.compile(r'(https?://\S+)')
    for item in list_items:
        content = item.get('content', '')
        level = item.get('level', 0)
        parsed = item.get('parsed', parse_bullet(content))
        # Remove any existing number/letter/bullet prefix
        clean_content = content
        if list_type == 'number':
            clean_content = re.sub(r'^\d+\.\s+', '', content.strip())
        elif list_type in ['alpha_upper', 'alpha_lower']:
            clean_content = re.sub(r'^[A-Za-z]\.\s+', '', content.strip())
        elif list_type == 'bullet':
            clean_content = re.sub(r'^[•\-\*]\s+', '', content.strip())

        # If the content is a citation with a URL, make it clickable
        # Detect if the content is just a URL or ends with a URL
        match = url_pattern.search(clean_content)
        if match:
            url = match.group(1)
            # If the whole content is just the URL, use it as the link text
            if clean_content.strip() == url:
                formatted_text = f'<a href="{url}">{url}</a>'
            else:
                # Replace the URL in the text with a clickable link
                formatted_text = _format_content_for_pdf(clean_content).replace(url, f'<a href="{url}">{url}</a>')
        elif parsed.get('label') and parsed.get('body'):
            # Format: "Label: Body" with label bold
            formatted_text = f"<b>{_format_content_for_pdf(parsed['label'])}</b>: {_format_content_for_pdf(parsed['body'])}"
        else:
            # No colon, add as-is
            formatted_text = _format_content_for_pdf(clean_content)
        pdf_list_items.append(ListItem(Paragraph(formatted_text, body_style)))
    
    # Determine spacing (same as PDF current logic)
    space_before = 3 if prev_block_type == 'paragraph' else 6
    space_after = 3 if next_block and next_block.get('type') == 'paragraph' else 6
    
    # Use numbers/letters when use_bullet_icons_only is False (edit content); otherwise bullets for all
    if use_bullet_icons_only:
        pdf_bullet_type = 'bullet'
    else:
        if list_type == 'number':
            pdf_bullet_type = '1'
        elif list_type == 'alpha_upper':
            pdf_bullet_type = 'A'
        elif list_type == 'alpha_lower':
            pdf_bullet_type = 'a'
        else:
            pdf_bullet_type = 'bullet'
    left_indent = 24  # 2em equivalent
    
    story.append(
        ListFlowable(
            pdf_list_items,
            bulletType=pdf_bullet_type,
            bulletFontName='Helvetica',
            bulletFontSize=11,
            leftIndent=left_indent,
            bulletIndent=0,
            spaceBefore=space_before,
            spaceAfter=space_after,
        )
    )

def _order_list_items(items: list[dict], start_from: int = 1) -> list[dict]:
    """
    Order list items correctly if they are numbered or alphabetical.
    For numbered lists: ensure 1, 2, 3... sequence starting from start_from
    For alphabetical lists: ensure A, B, C... or a, b, c... sequence starting from start_from
    For bullets: preserve original order (no sorting)
    Returns ordered list of items.
    """
    if not items:
        return items
    
    # Determine list type from first item
    first_item = items[0]
    list_type = first_item.get('list_type', 'bullet')  # Default to bullet if not set
    
    if list_type == 'number':
        # Extract numbers and check if ordering is needed
        numbers = []
        for item in items:
            content = item.get('content', '')
            number_match = re.match(r'^(\d+)\.\s+', content.strip())
            if number_match:
                numbers.append(int(number_match.group(1)))
            else:
                numbers.append(0)
        
        # Check if already in order and starting from correct number
        is_ordered = all(numbers[i] <= numbers[i+1] for i in range(len(numbers)-1))
        starts_correctly = numbers[0] == start_from if numbers else True
        
        if not is_ordered or not starts_correctly:
            # Re-order by number if needed
            if not is_ordered:
                sorted_items = sorted(zip(numbers, items), key=lambda x: x[0])
            else:
                sorted_items = list(zip(numbers, items))
            
            # Re-number sequentially starting from start_from
            ordered_items = []
            for idx, (_, item) in enumerate(sorted_items, start=start_from):
                content = item.get('content', '')
                # Replace number with sequential number
                new_content = re.sub(r'^\d+\.\s+', f'{idx}. ', content.strip())
                new_item = item.copy()
                new_item['content'] = new_content
                ordered_items.append(new_item)
            return ordered_items
    
    elif list_type in ['alpha_upper', 'alpha_lower']:
        # Extract letters and check if ordering is needed
        letters = []
        for item in items:
            content = item.get('content', '')
            alpha_match = re.match(r'^([A-Za-z])\.\s+', content.strip())
            if alpha_match:
                letter = alpha_match.group(1)
                # Convert letter to number for comparison
                if list_type == 'alpha_upper':
                    letter_num = ord(letter.upper()) - ord('A') + 1
                else:
                    letter_num = ord(letter.lower()) - ord('a') + 1
                letters.append(letter_num)
            else:
                letters.append(0)
        
        # Check if already in order and starting from correct letter
        is_ordered = all(letters[i] <= letters[i+1] for i in range(len(letters)-1))
        expected_start_letter_num = start_from
        starts_correctly = letters[0] == expected_start_letter_num if letters else True
        
        if not is_ordered or not starts_correctly:
            # Re-order by letter if needed
            if not is_ordered:
                sorted_items = sorted(zip(letters, items), key=lambda x: x[0])
            else:
                sorted_items = list(zip(letters, items))
            
            # Re-letter sequentially starting from start_from
            ordered_items = []
            for idx, (_, item) in enumerate(sorted_items, start=start_from):
                content = item.get('content', '')
                # Calculate letter based on index
                if list_type == 'alpha_upper':
                    letter = chr(ord('A') + (idx - 1) % 26)
                else:
                    letter = chr(ord('a') + (idx - 1) % 26)
                # Replace letter with sequential letter
                new_content = re.sub(r'^[A-Za-z]\.\s+', f'{letter}. ', content.strip())
                new_item = item.copy()
                new_item['content'] = new_content
                ordered_items.append(new_item)
            return ordered_items
    
    # For bullets or already ordered lists, return as-is
    return items

def export_to_pdf(content: str, title: str = "Document") -> bytes:
    """Export content to PDF format"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    
    story = []
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor='#D04A02',
        spaceAfter=30,
        alignment=TA_LEFT
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=11,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceAfter=12
    )
    heading1_style = ParagraphStyle(
    'Heading1Bold',
    parent=styles['Heading1'],
    fontSize=16,
    leading=18,
    spaceAfter=12,
    alignment=TA_LEFT,
    textColor='black',
    fontName='Helvetica-Bold'
    )

    heading2_style = ParagraphStyle(
        'Heading2Bold',
        parent=styles['Heading2'],
        fontSize=14,
        leading=16,
        spaceAfter=10,
        alignment=TA_LEFT,
        textColor='black',
        fontName='Helvetica-Bold'
    )

    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 0.2 * inch))
    
    paragraphs = content.split('\n\n')
    for para in paragraphs:
        p = para.strip()
        if not p:
            continue
        bold_heading_match = re.match(r'^\*\*(.+?)\*\*$', p)
        if bold_heading_match:
            text = bold_heading_match.group(1).strip()
            # Format and normalize text before rendering
            text = _format_content_for_pdf(text)
            story.append(Paragraph(f"<b>{text}</b>", heading1_style))
            continue

        # Check for bullet lists and render real bullets
        if _is_bullet_list_block(p):
            bullet_items = _parse_bullet_items(p)
            list_items = [ListItem(Paragraph(_format_content_for_pdf(text), body_style)) for indent, text in bullet_items]
            story.append(
                ListFlowable(
                    list_items,
                    bulletType='bullet',
                    bulletFontName='Helvetica',
                    bulletFontSize=11,
                    leftIndent=12,
                    bulletIndent=0,
                )
            )
            continue

        if p.startswith("## "):
            text = p.replace("##", "").strip()
            # Remove ** markers if present
            text = text.replace("**", "")
            # Format and normalize text for PDF rendering
            text = _format_content_for_pdf(text)
            story.append(Paragraph(text, heading2_style))
        elif p.startswith("# "):
            text = p.replace("#", "").strip()
            # Remove ** markers if present
            text = text.replace("**", "")
            # Format and normalize text for PDF rendering
            text = _format_content_for_pdf(text)
            story.append(Paragraph(text, heading1_style))
        else:
            # Intelligently split long paragraphs into smaller chunks
            sentence_count = len(re.findall(r'[.!?]', p))
            if sentence_count > 3:
                # This is a long paragraph, split it into smaller chunks (2-3 sentences each)
                split_paragraphs = _split_paragraph_into_sentences(p, target_sentences=3)
                for split_para in split_paragraphs:
                    if split_para:
                        # Use _format_content_for_pdf for consistent formatting and normalization
                        p_html = _format_content_for_pdf(split_para)
                        story.append(Paragraph(p_html, body_style))
            else:
               # Keep short paragraphs as is, but format for PDF rendering
                p_html = _format_content_for_pdf(p)
                story.append(Paragraph(p_html, body_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def export_to_pdf_with_pwc_template(content: str, title: str = "Document", subtitle: str = "", content_type: Optional[str] = None) -> bytes:
    """
    Export content to PDF format with PWC branded cover page.
    
    VALIDATED with test_branded_pdf.py - This function properly creates:
    1. A branded cover page by overlaying title/subtitle on PWC template
    2. Formatted content pages
    3. Final PDF: Cover (with logo) + Content Pages (with conditional TOC)
    
    Args:
        content: The main content to export (starts from page 2)
        title: Document title (displays on cover page with logo)
        subtitle: Optional subtitle (displays on cover page)
        content_type: Type of content (article, whitepaper, executive-brief, blog)
                     If 'blog' or 'executive_brief', Table of Contents is skipped
    
    Returns:
        Bytes of the final PDF document with cover + TOC (if applicable) + content
    """
    try:
        from reportlab.pdfgen import canvas
        
        logger.info("Creating PWC branded PDF with title, subtitle, and content")
        
        template_path = _get_existing_pwc_pdf_template_path()
        
        # ===== STEP 1: Create branded cover page =====
        logger.info("Step 1: Creating branded cover page")
        
        template_reader = PdfReader(template_path)
        template_page = template_reader.pages[0]
        
        page_width = float(template_page.mediabox.width)
        page_height = float(template_page.mediabox.height)
        
        logger.info(f"Template page size: {page_width:.1f} x {page_height:.1f} points")
        
        # Create overlay with text
        overlay_buffer = io.BytesIO()
        c = canvas.Canvas(overlay_buffer, pagesize=(page_width, page_height))
        
        # Add title
        title_font_size = 32
        if len(title) > 80:
            title_font_size = 20
        elif len(title) > 60:
            title_font_size = 22
        elif len(title) > 40:
            title_font_size = 26
        
        c.setFont("Helvetica-Bold", title_font_size)
        c.setFillColor('#000000')  # Black color
        title_y = page_height * 0.72
        
        # Handle multi-line titles with better word wrapping
        # Maximum width for title (leaving margins on left and right)
        max_title_width = page_width * 0.70  # 70% of page width with margins
        
        # Better character width estimation - more conservative to avoid cutoff
        # Estimate pixels needed per character based on font size
        # At 20pt Helvetica: ~10 pixels per character average
        char_width_at_font = (title_font_size / 20.0) * 10
        max_chars_per_line = int(max_title_width / char_width_at_font)
        
        # Ensure reasonable minimum and maximum
        max_chars_per_line = max(20, min(max_chars_per_line, 50))
        
        words = title.split()
        lines = []
        current_line = []
        
        for word in words:
            test_line = ' '.join(current_line + [word])
            # Use calculated character limit
            if len(test_line) > max_chars_per_line:
                if current_line:
                    lines.append(' '.join(current_line))
                current_line = [word]
            else:
                current_line.append(word)
        
        if current_line:
            lines.append(' '.join(current_line))
        
        # Draw multi-line title
        if len(lines) > 1:
            line_height = title_font_size + 6
            # Center vertically: start higher if multiple lines
            start_y = title_y + (len(lines) - 1) * line_height / 2
            for i, line in enumerate(lines):
                c.drawCentredString(page_width / 2, start_y - (i * line_height), line)
            last_title_y = start_y - (len(lines) * line_height)
        else:
            c.drawCentredString(page_width / 2, title_y, title)
            last_title_y = title_y
        
        logger.info(f"Title added to overlay: {title} ({len(lines)} lines)")
        
        # Add subtitle if provided
        if subtitle:
            # Clean up markdown asterisks from subtitle
            subtitle_clean = subtitle.replace('**', '')
            
            c.setFont("Helvetica-Bold", 14)  # Bold font
            c.setFillColor('#000000')  # Black color
            subtitle_y = last_title_y - 70
            
            # Wrap subtitle text to fit within page width
            # Use a more conservative character limit for subtitle
            # Page width is typically 612 points (8.5 inches) for letter size
            # Helvetica 14pt: approximately 7-8 pixels per character
            max_subtitle_width = page_width * 0.75  # 75% of page width with margins
            subtitle_char_width = 8  # pixels per character at 14pt
            max_chars_per_line = int(max_subtitle_width / subtitle_char_width)
            
            words = subtitle_clean.split()
            lines = []
            current_line = []
            
            for word in words:
                test_line = ' '.join(current_line + [word])
                # Use more conservative line breaking - shorter lines for better visibility
                if len(test_line) > min(50, max_chars_per_line):
                    if current_line:
                        lines.append(' '.join(current_line))
                    current_line = [word]
                else:
                    current_line.append(word)
            
            if current_line:
                lines.append(' '.join(current_line))
            
            # Draw multi-line subtitle with proper centering
            line_height = 22
            # If multiple lines, center vertically
            if len(lines) > 1:
                start_y = subtitle_y + (len(lines) - 1) * line_height / 2
            else:
                start_y = subtitle_y
            
            for i, line in enumerate(lines):
                c.drawCentredString(page_width / 2, start_y - (i * line_height), line)
            
            logger.info(f"Subtitle added to overlay: {subtitle} ({len(lines)} lines)")
        
        c.save()
        overlay_buffer.seek(0)
        
        # Merge overlay with template
        overlay_reader = PdfReader(overlay_buffer)
        overlay_page = overlay_reader.pages[0]
        
        template_page.merge_page(overlay_page)
        logger.info("Overlay merged onto template cover page")
        
        # ===== STEP 2: Create content pages =====
        logger.info("Step 2: Creating formatted content pages")
        
        # First, extract all headings for Table of Contents
        headings = []
        blocks = content.split('\n')
        for block in blocks:
            if not block.strip():
                continue
            block = block.strip()
            
            # Check for various heading formats
            standalone_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*$', block)
            if standalone_bold_match:
                text = standalone_bold_match.group(1).strip()
                # Remove leading numbers like "1. ", "5.1. ", etc.
                text = re.sub(r'^\d+(\.\d+)*\.?\s*', '', text).strip()
                headings.append(text)
                continue
            
            first_line_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*\n', block)
            if first_line_bold_match:
                text = first_line_bold_match.group(1).strip()
                # Remove leading numbers like "1. ", "5.1. ", etc.
                text = re.sub(r'^\d+(\.\d+)*\.?\s*', '', text).strip()
                headings.append(text)
                continue
            
            # Markdown headings
            if block.startswith('#'):
                text = re.sub(r'^#+\s*', '', block.split('\n')[0]).strip()
                # Remove ** markers if present
                text = text.replace('**', '').strip()
                # Remove leading numbers like "1. ", "5.1. ", etc.
                text = re.sub(r'^\d+(\.\d+)*\.?\s*', '', text).strip()
                headings.append(text)
        
        logger.info(f"Extracted {len(headings)} headings for Table of Contents")
        
        content_buffer = io.BytesIO()
        doc = SimpleDocTemplate(content_buffer, pagesize=letter, topMargin=1*inch, bottomMargin=1*inch)
        styles = getSampleStyleSheet()
        
        # Define custom styles
        body_style = ParagraphStyle(
            'PWCBody',
            parent=styles['BodyText'],
            fontSize=11,
            leading=15,
            alignment=TA_JUSTIFY,
            spaceAfter=12,
            fontName='Helvetica'
        )
        
        heading_style = ParagraphStyle(
            'PWCHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor='#D04A02',
            spaceAfter=10,
            spaceBefore=10,
            fontName='Helvetica-Bold'
        )
        
        # Citation style with left alignment (no justify to avoid extra spaces)
        citation_style = ParagraphStyle(
            'PWCCitation',
            parent=styles['BodyText'],
            fontSize=11,
            leading=15,
            alignment=TA_LEFT,
            spaceAfter=12,
            fontName='Helvetica'
        )
        
        story = []
        
        # Parse and add content with formatting
        blocks = content.split('\n\n')
        for block in blocks:
            if not block.strip():
                continue
            
            # Skip separator lines (---, ---, etc.)
            if re.fullmatch(r'\s*-{3,}\s*', block):
                continue
            
            block = block.strip()
            
            # Check for headings (bold text on its own line or markdown style)
            standalone_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*$', block)
            if standalone_bold_match:
                heading_text = standalone_bold_match.group(1).strip()
                story.append(Paragraph(heading_text, heading_style))
                continue
            
            # Check for bold text at start of paragraph
            first_line_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*\n', block)
            if first_line_bold_match:
                heading_text = first_line_bold_match.group(1).strip()
                remaining_content = block[first_line_bold_match.end():].strip()
                # Format and normalize heading text
                heading_text = _format_content_for_pdf(heading_text)
                story.append(Paragraph(heading_text, heading_style))
                if remaining_content:
                    # Check if remaining content is a bullet list
                    if _is_bullet_list_block(remaining_content):
                        bullet_items = _parse_bullet_items(remaining_content)
                        list_items = [ListItem(Paragraph(_format_content_for_pdf(text), body_style)) for indent, text in bullet_items]
                        story.append(
                            ListFlowable(
                                list_items,
                                bulletType='bullet',
                                bulletFontName='Helvetica',
                                bulletFontSize=11,
                                leftIndent=12,
                                bulletIndent=0,
                            )
                        )
                    else:
                        para = Paragraph(_format_content_for_pdf(remaining_content), body_style)
                        story.append(para)
                continue
            
            # Check for markdown headings
            if block.startswith('####'):
                text = block.replace('####', '').strip()
                # Remove ** markers if present
                text = text.replace('**', '')
                # Format and normalize text for PDF rendering
                text = _format_content_for_pdf(text)
                story.append(Paragraph(text, heading_style))
                continue
            elif block.startswith('###'):
                text = block.replace('###', '').strip()
                # Remove ** markers if present
                text = text.replace('**', '')
                # Format and normalize text for PDF rendering
                text = _format_content_for_pdf(text)
                story.append(Paragraph(text, heading_style))
                continue
            elif block.startswith('##'):
                text = block.replace('##', '').strip()
                # Remove ** markers if present
                text = text.replace('**', '')
                # Format and normalize text for PDF rendering
                text = _format_content_for_pdf(text)
                story.append(Paragraph(text, heading_style))
                continue
            elif block.startswith('#'):
                text = block.replace('#', '').strip()
                # Remove ** markers if present
                text = text.replace('**', '')
                # Format and normalize text for PDF rendering
                text = _format_content_for_pdf(text)
                story.append(Paragraph(text, heading_style))
                continue
            
            # Check if block is a bullet list
            if _is_bullet_list_block(block):
                bullet_items = _parse_bullet_items(block)
                list_items = [ListItem(Paragraph(_format_content_for_pdf(text), body_style)) for indent, text in bullet_items]
                story.append(
                    ListFlowable(
                        list_items,
                        bulletType='bullet',
                        bulletFontName='Helvetica',
                        bulletFontSize=11,
                        leftIndent=12,
                        bulletIndent=0,
                    )
                )
                continue
            
            # Check if block contains multiple lines with citation patterns
            # Citations typically look like: [1] text or 1. text
            lines = block.split('\n')
            if len(lines) > 1:
                # Check if this looks like a citation/reference block
                citation_pattern = r'^\s*(\[\d+\]|\d+\.)\s+'
                citation_count = sum(1 for line in lines if re.match(citation_pattern, line.strip()))
                
                # If at least 2 lines match citation pattern, treat as citation block
                if citation_count >= 2:
                    # Process each line separately with left alignment (no justify)
                    for line in lines:
                        line_stripped = line.strip()
                        if line_stripped:
                            para = Paragraph(_format_content_for_pdf(line_stripped), citation_style)
                            story.append(para)
                    continue
            
            # Regular paragraph - intelligently split long paragraphs into smaller chunks
            sentence_count = len(re.findall(r'[.!?]', block))
            if sentence_count > 3:
                # This is a long paragraph, split it into smaller chunks (2-3 sentences each)
                split_paragraphs = _split_paragraph_into_sentences(block, target_sentences=3)
                for split_para in split_paragraphs:
                    if split_para:
                        para = Paragraph(_format_content_for_pdf(split_para), body_style)
                        story.append(para)
            else:
                # Keep short paragraphs as is
                para = Paragraph(_format_content_for_pdf(block), body_style)
                story.append(para)
        
        # Build the content PDF
        doc.build(story)
        content_buffer.seek(0)
        
        # ===== STEP 2.5: Create Table of Contents pages (multi-page support) - CONDITIONAL =====
        # Only generate TOC for Article and White Paper, skip for Blog and Executive Brief
        should_add_toc = content_type and content_type.lower() not in ['blog', 'executive_brief', 'executive-brief']
        toc_pages = []
        
        if headings and should_add_toc:
            logger.info(f"Step 2.5: Creating Table of Contents pages for content_type: {content_type}")
            toc_buffer = io.BytesIO()
            toc_doc = SimpleDocTemplate(toc_buffer, pagesize=(page_width, page_height), topMargin=1*inch, bottomMargin=1*inch)
            toc_styles = getSampleStyleSheet()
            toc_title_style = ParagraphStyle(
                'TOCTitle',
                parent=toc_styles['Heading1'],
                fontSize=24,
                textColor='#000000',
                spaceAfter=24,
                alignment=TA_LEFT,
                fontName='Helvetica-Bold'
            )
            toc_heading_style = ParagraphStyle(
                'TOCHeading',
                parent=toc_styles['BodyText'],
                fontSize=11,
                textColor='#000000',
                spaceAfter=12,
                alignment=TA_LEFT,
                fontName='Helvetica',
                leading=16,
                rightIndent=20
            )
            toc_story = []
            toc_story.append(Paragraph("Contents", toc_title_style))
            toc_story.append(Spacer(1, 0.2 * inch))
            for index, heading in enumerate(headings, start=1):
                # Add serial number before heading (ReportLab will handle text wrapping automatically)
                # Format and normalize heading text to handle dashes properly
                formatted_heading = _format_content_for_pdf(heading)
                toc_story.append(Paragraph(f"{index}. {formatted_heading}", toc_heading_style))
            toc_doc.build(toc_story)
            toc_buffer.seek(0)
            toc_reader = PdfReader(toc_buffer)
            toc_pages = [toc_reader.pages[i] for i in range(len(toc_reader.pages))]
        else:
            logger.info(f"Step 2.5: Skipping Table of Contents for content_type: {content_type}")
        # ===== STEP 3: Merge cover + ToC + content =====
        logger.info("Step 3: Merging cover page, ToC, and content pages")
        
        content_reader = PdfReader(content_buffer)
        
        writer = PdfWriter()
        
        # Add the branded cover page (Page 1)
        writer.add_page(template_page)
        logger.info("Added branded cover page with PWC logo, title, and subtitle")
        
        # Add the Table of Contents pages (Page 2+)
        for idx, toc_page in enumerate(toc_pages):
            writer.add_page(toc_page)
            logger.info(f"Added Table of Contents page {idx+1}")
        
        # Add all content pages (Page 3+)
        for page_num in range(len(content_reader.pages)):
            logger.info(f"Adding content page {page_num + 1}")
            writer.add_page(content_reader.pages[page_num])
        
        # Write final PDF
        output_buffer = io.BytesIO()
        writer.write(output_buffer)
        output_buffer.seek(0)
        
        result_bytes = output_buffer.getvalue()
        logger.info(f"PDF export complete: {len(writer.pages)} pages, {len(result_bytes)} bytes")
        
        return result_bytes
            
    except FileNotFoundError:
        # Bubble up so the API can surface a clear error instead of silently falling back
        raise
    except Exception as e:
        logger.error(f"Error exporting to PDF with PwC template: {e}", exc_info=True)
        # Fallback to basic PDF
        return _generate_pdf_with_title_subtitle(content, title, subtitle)


def _generate_pdf_with_title_subtitle(content: str, title: str, subtitle: str = "") -> bytes:
    """
    Generate a professional PDF with title, subtitle, and content.
    Used as fallback when PWC template is unavailable.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor='#D04A02',
        spaceAfter=20,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor='#666666',
        spaceAfter=40,
        alignment=TA_CENTER,
        fontName='Helvetica'
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=11,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceAfter=12
    )
    
    story = []
    
    # Add title
    story.append(Paragraph(title, title_style))
    
    # Add subtitle
    if subtitle:
        story.append(Paragraph(subtitle, subtitle_style))
    else:
        story.append(Spacer(1, 0.3 * inch))
    
    # Add content with intelligent paragraph splitting
    paragraphs = content.split('\n\n')
    for para in paragraphs:
        if para.strip():
            # Check if this is a long paragraph that should be split
            sentence_count = len(re.findall(r'[.!?]', para.strip()))
            
            if sentence_count > 3:
                # This is a long paragraph, split it into smaller chunks
                split_paragraphs = _split_paragraph_into_sentences(para.strip(), target_sentences=3)
                for split_para in split_paragraphs:
                    if split_para:
                        story.append(Paragraph(split_para, body_style))
            else:
                # Keep short paragraphs as is
                story.append(Paragraph(para.strip(), body_style))
    
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def _format_content_for_pdf(text: str) -> str:
    """
    Format content for PDF by converting markdown-style formatting to HTML-like tags.
    Reportlab supports a subset of HTML/XML tags for styling.
    
    Converts:
    - **bold** to <b>bold</b>
    - *italic* to <i>italic</i>
    - [text](url) to <a href="url" color="blue">text</a>
    - https?://... to <a href="url" color="blue">url</a>
    - Unicode superscript digits (¹²³ etc.) to <sup>1</sup> so they render correctly (not as bullet)
    - Normalizes all Unicode dash variants to standard hyphen for reliable PDF rendering
    """
    # First, handle special quotation marks and other problematic characters BEFORE processing HTML
    # This ensures they are replaced before being wrapped in HTML tags
    text = text.replace('\u201C', '"')  # Left double quotation mark
    text = text.replace('\u201D', '"')  # Right double quotation mark
    text = text.replace('\u2018', "'")  # Left single quotation mark
    text = text.replace('\u2019', "'")  # Right single quotation mark
    text = text.replace('\u2026', '...')  # Ellipsis

    # Convert Unicode superscript digits to <sup>N</sup> so PDF renders them correctly
    # (ReportLab may render ¹²³ as replacement glyphs/bullets; <sup> tag gives proper superscript)
    _SUPERSCRIPT_MAP = {
        '\u00B9': '1', '\u00B2': '2', '\u00B3': '3', '\u2074': '4', '\u2075': '5',
        '\u2076': '6', '\u2077': '7', '\u2078': '8', '\u2079': '9', '\u2070': '0',
    }
    for sup_char, digit in _SUPERSCRIPT_MAP.items():
        text = text.replace(sup_char, f'<sup>{digit}</sup>')
    
    # Normalize all Unicode dash/hyphen variants to standard ASCII hyphen-minus (-)
    # This prevents ReportLab rendering issues with special Unicode characters
    # Must be done BEFORE HTML processing to avoid encoding issues
    dash_variants = [
        '\u2010',  # Hyphen
        '\u2011',  # Non-breaking hyphen
        '\u2012',  # Figure dash
        '\u2013',  # En dash (–)
        '\u2014',  # Em dash (—)
        '\u2015',  # Horizontal bar
        '\u2212',  # Minus sign
        '\u058A',  # Armenian hyphen
        '\u05BE',  # Hebrew maqaf
        '\u1400',  # Canadian syllabics hyphen
        '\u1806',  # Mongolian todo soft hyphen
        '\u2E17',  # Double oblique hyphen
        '\u30A0',  # Katakana-hiragana double hyphen
        '\uFE58',  # Small em dash
        '\uFE63',  # Small hyphen-minus
        '\uFF0D',  # Fullwidth hyphen-minus
    ]
    
    for dash in dash_variants:
        text = text.replace(dash, '-')
    
    # Convert markdown links [text](url) to <a href="url" color="blue">text</a>
    text = re.sub(r'\[([^\]]+?)\]\(([^)]+?)\)', r'<a href="\2" color="blue">\1</a>', text)
    
    # Convert plain URLs to clickable links (but not those already inside HTML tags)
    # Match URLs that are not inside href= attributes or already converted
    text = re.sub(r'(?<![="])(?<![a-zA-Z])(?<!href)(https?://[^\s)>\]]+)', r'<a href="\1" color="blue">\1</a>', text)
    
    # Convert **bold** to <b>bold</b>
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    
    # Convert *italic* to <i>italic</i> (but not if it's part of **bold** or at line start for bullets)
    # Use negative lookbehind/lookahead to avoid double-processing
    text = re.sub(r'(?<!\*)\*([^\*]+?)\*(?!\*)', r'<i>\1</i>', text)
    
    return text


def _is_bullet_list_block(block: str) -> bool:
    """Check if a block contains bullet points"""
    lines = block.split('\n')
    bullet_count = 0
    for line in lines:
        stripped = line.strip()
        if stripped and (stripped.startswith('- ') or stripped.startswith('• ') or stripped.startswith('* ')):
            bullet_count += 1
    return bullet_count > 0


def _parse_bullet_items(block: str) -> list:
    """Parse bullet items from a block and return list of bullet texts"""
    lines = block.split('\n')
    items = []
    for line in lines:
        stripped = line.strip()
        indent = len(line) - len(line.lstrip())
        # if stripped and (stripped.startswith('- ') or stripped.startswith('• ') or stripped.startswith('* ')):
        if stripped.startswith(('- ', '• ', '* ')):
            
            # Remove bullet marker and leading/trailing whitespace
            bullet_text = re.sub(r'^[-•\*]\s+', '', stripped)
            # items.append(bullet_text)
            if bullet_text:
                items.append((indent, bullet_text))

    return items


def _split_paragraph_into_sentences(paragraph: str, target_sentences: int = 3) -> List[str]:
    """
    Split a long paragraph into smaller paragraphs by sentence boundaries.
    
    This ensures that even if content doesn't have explicit paragraph breaks (\n\n),
    long blocks of text are divided into readable chunks of 2-3 sentences each.
    
    Args:
        paragraph: The paragraph text to split
        target_sentences: Target number of sentences per paragraph chunk (default: 3)
    
    Returns:
        List of paragraph strings, each containing roughly target_sentences sentences
    """
    if not paragraph or not paragraph.strip():
        return []
    
    # Split by sentence boundaries (period, question mark, exclamation mark followed by space)
    # This regex splits on . ? ! followed by a space and capital letter, preserving the punctuation
    sentence_pattern = r'(?<=[.!?])\s+(?=[A-Z])'
    sentences = re.split(sentence_pattern, paragraph.strip())
    
    if len(sentences) <= target_sentences:
        # If paragraph has 3 or fewer sentences, keep it as is
        return [paragraph.strip()]
    
    # Group sentences into chunks
    paragraphs = []
    current_chunk = []
    
    for sentence in sentences:
        current_chunk.append(sentence)
        
        # When we have enough sentences, create a new paragraph
        if len(current_chunk) >= target_sentences:
            paragraphs.append(' '.join(current_chunk).strip())
            current_chunk = []
    
    # Add remaining sentences
    if current_chunk:
        paragraphs.append(' '.join(current_chunk).strip())
    
    return paragraphs

def add_hyperlink(paragraph, url, text=None, no_break=False, doc=None): #merge conflict resolved
    """
    Create a hyperlink in a Word paragraph with blue color and underline (same idea as PDF <a href>).
    If no_break is True, add w:noBreak so the URL does not break across lines (e.g. in citation list items).
    If doc is provided (e.g. from edit content list), use doc.part for the relationship so the link is clickable in Word/Word Online.
    """
    if not text:
        text = url
    
    # Sanitize inputs
    text = sanitize_text_for_word(text)
    url = str(url).strip()

    # Use document part when provided (edit content list) so relationship is on main document part - ensures clickable in Word/Word Online
    part = doc.part if doc is not None else paragraph.part
    r_id = part.relate_to(url, docx.opc.constants.RELATIONSHIP_TYPE.HYPERLINK, is_external=True)

    hyperlink = OxmlElement('w:hyperlink')
    hyperlink.set(qn('r:id'), r_id)
    # w:history="1" helps Word/Word Online treat the link as clickable (add to history when followed)
    hyperlink.set(qn('w:history'), '1')

    run = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')

    # Apply Hyperlink character style
    rStyle = OxmlElement('w:rStyle')
    rStyle.set(qn('w:val'), 'Hyperlink')
    rPr.append(rStyle)

    # Style (blue + underline) - ensure color is applied
    u = OxmlElement('w:u')
    u.set(qn('w:val'), 'single')
    rPr.append(u)

    color = OxmlElement('w:color')
    color.set(qn('w:val'), '0000FF')
    rPr.append(color)

    if no_break:
        no_break_elem = OxmlElement('w:noBreak')
        rPr.append(no_break_elem)

    run.append(rPr)
    
    # Add text to run - ensure it's properly encoded
    t = OxmlElement('w:t')
    # Set text with proper XML text handling
    if text:
        t.text = text
    run.append(t)

    hyperlink.append(run)
    paragraph._p.append(hyperlink)

def add_hyperlink_mi(paragraph, url, text=None,bold=False): #merge conflict resolved
    """
    Create a hyperlink in a Word paragraph with blue color and underline.
    """
    if not text:
        text = url
    
    # Sanitize inputs
    text = sanitize_text_for_word(text)
    url = str(url).strip()

    part = paragraph.part
    r_id = part.relate_to(url, docx.opc.constants.RELATIONSHIP_TYPE.HYPERLINK, is_external=True)

    hyperlink = OxmlElement('w:hyperlink')
    hyperlink.set(qn('r:id'), r_id)

    run = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')

    # Apply Hyperlink character style
    rStyle = OxmlElement('w:rStyle')
    rStyle.set(qn('w:val'), 'Hyperlink')
    rPr.append(rStyle)
    b = OxmlElement('w:b')
    b.set(qn('w:val'), 'true' if bold else 'false')
    rPr.append(b)


    # Style (blue + underline) - ensure color is applied
    u = OxmlElement('w:u')
    u.set(qn('w:val'), 'single')
    rPr.append(u)

    color = OxmlElement('w:color')
    color.set(qn('w:val'), '0000FF')
    rPr.append(color)

    run.append(rPr)
    
    # Add text to run - ensure it's properly encoded
    t = OxmlElement('w:t')
    # Set text with proper XML text handling
    if text:
        t.text = text
    run.append(t)

    hyperlink.append(run)
    paragraph._p.append(hyperlink)



def _normalize_citation_url_for_word(url: str) -> str:
    """
    Normalize a citation URL for Word export so the full URL is preserved as one string.
    Prevents breaks after dots (e.g. after www.pwc.) by stripping newlines and ensuring
    the URL is a single contiguous string. Use this for edit content Word citation links.
    """
    if not url:
        return ""
    s = str(url).strip()
    # Remove any newlines, carriage returns, or spaces that could cause Word to break the link
    s = re.sub(r'[\r\n\t\s]+', '', s)
    return s


def add_hyperlink_edit_content_citation(paragraph, url: str):
    """
    Add a citation URL as a single hyperlink in Word for edit content export.
    Uses noBreak on the run so the link does not break after dots (e.g. after www.pwc.);
    the full URL stays one clickable link instead of breaking into link + plain text.
    """
    url = _normalize_citation_url_for_word(url)
    if not url:
        return
    text = sanitize_text_for_word(url)
    part = paragraph.part
    r_id = part.relate_to(url, docx.opc.constants.RELATIONSHIP_TYPE.HYPERLINK, is_external=True)
    hyperlink = OxmlElement('w:hyperlink')
    hyperlink.set(qn('r:id'), r_id)
    run = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')
    rStyle = OxmlElement('w:rStyle')
    rStyle.set(qn('w:val'), 'Hyperlink')
    rPr.append(rStyle)
    u = OxmlElement('w:u')
    u.set(qn('w:val'), 'single')
    rPr.append(u)
    color = OxmlElement('w:color')
    color.set(qn('w:val'), '0000FF')
    rPr.append(color)
    # Prevent line break inside the URL so it doesn't break after a dot
    no_break = OxmlElement('w:noBreak')
    rPr.append(no_break)
    run.append(rPr)
    t = OxmlElement('w:t')
    if text:
        t.text = text
    run.append(t)
    hyperlink.append(run)
    paragraph._p.append(hyperlink)

def _set_footer_with_page_numbers_only(doc: Document):
    """
    Remove footer content from all sections and add page numbers only.
    This removes any branding, text, or other content but keeps page numbering.
    """
    from docx.oxml import parse_xml
    from docx.oxml.ns import nsdecls
    
    for section in doc.sections:
        footer = section.footer
        footer.is_linked_to_previous = False
        
        # Clear all existing footer content
        for para in list(footer.paragraphs):
            p = para._element
            p.getparent().remove(p)
        
        for table in list(footer.tables):
            t = table._element
            t.getparent().remove(t)
        
        # Add a single paragraph with page number only
        footer_para = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
        footer_para.text = ""
        footer_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        # Add page number field
        run = footer_para.add_run()
        
        # Create page number field XML
        fldChar1 = OxmlElement('w:fldChar')
        fldChar1.set(qn('w:fldCharType'), 'begin')
        
        instrText = OxmlElement('w:instrText')
        instrText.set(qn('xml:space'), 'preserve')
        instrText.text = 'PAGE'
        
        fldChar2 = OxmlElement('w:fldChar')
        fldChar2.set(qn('w:fldCharType'), 'end')
        
        run._r.append(fldChar1)
        run._r.append(instrText)
        run._r.append(fldChar2)
        
        logger.info(f"[_set_footer_with_page_numbers_only] Footer set with page numbers only")

def export_to_word(content: str, title: str = "Document") -> bytes:
    """Export content to Word DOCX format using PwC template"""
    try:
        # Load PwC template
        if os.path.exists(PWC_TEMPLATE_PATH):
            doc = Document(PWC_TEMPLATE_PATH)
            logger.info(f"Loaded PwC template from: {PWC_TEMPLATE_PATH}")
        else:
            logger.warning(f"PwC template not found at {PWC_TEMPLATE_PATH}, using default formatting")
            doc = Document()
    except Exception as e:
        logger.warning(f"Failed to load PwC template: {e}, using default formatting")
        doc = Document()
    
    # Remove footers and add page numbers only
    _set_footer_with_page_numbers_only(doc)
    
    # Check if template has proper structure (Title, Subtitle, page breaks)
    has_template_structure = (
        len(doc.paragraphs) > 2 and 
        doc.paragraphs[0].style.name == 'Title' and
        doc.paragraphs[1].style.name == 'Subtitle'
    )
    
    if has_template_structure:
        # Use template structure: update title, clear subtitle, remove page break paragraphs
        # Update title (paragraph 0)
        _set_paragraph_text_with_breaks(doc.paragraphs[0], title)
        
        # Clear subtitle (paragraph 1) - will be empty for basic export
        _set_paragraph_text_with_breaks(doc.paragraphs[1], '')
        
        # Remove ALL template content after title and subtitle (including old TOC and page breaks)
        paragraphs_to_remove = list(doc.paragraphs[2:])
        for para in paragraphs_to_remove:
            p = para._element
            p.getparent().remove(p)

        # Add page break after subtitle
        _ensure_page_break_after_paragraph(doc.paragraphs[1])
        
        # Extract headings from content before adding it
        headings = _extract_headings_from_content(content)
        
        # Add Table of Contents on page 2
        if headings:
            _add_table_of_contents(doc, headings)
        
        # Add a page break before the generated content so it starts after the TOC page
        page_break_para = doc.add_paragraph()
        run = page_break_para.add_run()
        run.add_break(WD_BREAK.PAGE)
        
        # Add content after the page break
        _add_formatted_content(doc, content)
    else:
        # No template structure, clear everything and build from scratch
        for para in doc.paragraphs[:]:
            p = para._element
            p.getparent().remove(p)
        
        # Add title using Title style
        title_para = doc.add_paragraph(title, style='Title')
        
        # Add a blank line after title
        doc.add_paragraph()
        
        # Parse and add content with proper formatting
        _add_formatted_content(doc, content)
    
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    docx_bytes = buffer.getvalue()
    
    # Apply encoding fix to ensure all Unicode characters are properly handled
    docx_bytes = _fix_docx_encoding(docx_bytes)
    
    return docx_bytes

def _add_bookmark_to_paragraph(para, bookmark_name: str):
    """Add a bookmark to a paragraph"""
    # Create bookmark start
    bookmark_id = str(next(_bookmark_counter))
    bookmark_start = OxmlElement('w:bookmarkStart')
    bookmark_start.set(qn('w:id'), bookmark_id)
    bookmark_start.set(qn('w:name'), bookmark_name)
    
    # Create bookmark end
    bookmark_end = OxmlElement('w:bookmarkEnd')
    bookmark_end.set(qn('w:id'), bookmark_id)
    
    # Add to paragraph
    para._element.insert(0, bookmark_start)
    para._element.append(bookmark_end)
    
def is_bullet_line(line: str) -> bool:
    return re.match(r'^\s*[-•]\s+', line) is not None

def export_to_word_pwc_standalone(
    content: str,
    title: str,
    subtitle: str | None = None,
    content_type: str | None = None,
    references: list[dict] | None = None
) -> bytes:
    logger.error("export_to_word_pwc_standalone() IS BEING CALLED")
    doc = Document(PWC_TEMPLATE_PATH) if os.path.exists(PWC_TEMPLATE_PATH) else Document()
    main_heading = None
    toc_items: list[str] = []
    references_heading_added = False
    # _set_paragraph_text_with_breaks(doc.paragraphs[0], sanitize_text_for_word(title))
    _set_paragraph_text_with_breaks(doc.paragraphs[1], sanitize_text_for_word(subtitle or ""))
    # for para in list(doc.paragraphs[2:]):
    #     para._element.getparent().remove(para._element)
    while len(doc.paragraphs) > 2:
        p = doc.paragraphs[-1]
        p._element.getparent().remove(p._element)
    
    # -------- FIRST PASS: collect TOC headings --------
    for block in content.split("\n\n"):
        block = block.strip()
        if not block:
            continue

        # Main / section headings
        if block.startswith("# ") and not block.startswith("##"):
            text = block[2:].strip()
            if not main_heading:
                main_heading = text
            toc_items.append(text.replace(":", ""))
        # Sub-headings
        elif block.startswith("##") and block.strip().lower() not in {"## references"}:
            text = block.replace("##", "").strip()
            # toc_items.append(text)
            toc_items.append(text.replace(":", ""))

        # Bold-only headings (**Heading**)
        else:
            m = re.match(r'^\*\*(.+?)\*\*$', block)
            if m:
                # toc_items.append(m.group(1).strip())
                toc_items.append(m.group(1).strip().replace(":", ""))

    title_para = doc.paragraphs[0]
    title_para.style = "Heading 1"
    print("Setting main heading:", main_heading," title",title_para)
    if main_heading:
        _set_paragraph_text_with_breaks(
            title_para,
            sanitize_text_for_word(main_heading)
        )
    else:
        title_para.text = ""
    
    _ensure_page_break_after_paragraph(doc.paragraphs[1])

    doc.add_paragraph("Contents", style="Heading 1")

    for idx, heading in enumerate(toc_items, start=1):
        p = doc.add_paragraph(style="Normal")
        p.paragraph_format.space_after = DocxPt(6)        
        run = p.add_run(f"{idx} {sanitize_text_for_word(heading)}")
        run.bold = False
    doc.add_page_break()
    for block in content.split("\n\n"):
        block = block.strip()

        if re.fullmatch(r'[-•–—]+', block):
            continue
        if not block:
            continue
        if block.strip().lower() in {"references:", "references"}:
            doc.add_paragraph("References", style="Heading 2")
            references_heading_added = True
            continue
        if block.startswith("##"):
            text = block.replace("##", "").strip()
            p = doc.add_paragraph(style="Heading 2")
            p.add_run(sanitize_text_for_word(text)).bold = True
            continue

        if block.startswith("#") and not block.startswith("##"):
            text = block[2:].strip()
            p = doc.add_paragraph(style="Heading 1")
            p.add_run(sanitize_text_for_word(text)).bold = True
            continue

        m = re.match(r'^\*\*(.+?)\*\*$', block)
        if m:
            p = doc.add_paragraph(style="Heading 1")
            p.add_run(sanitize_text_for_word(m.group(1))).bold = True
            continue
        lines = block.split("\n")
        if all(is_bullet_line(l) for l in lines):
            for line in lines:
                clean = re.sub(r'^\s*[-•]\s+', '', line).strip()
                if clean:
                    para = doc.add_paragraph(style="List Bullet")
                    _add_markdown_text_runs(para, clean)
            continue
        # if block.startswith(("-", "•", "*")):
        #     for line in block.split("\n"):
        #         line = re.sub(r'^[•\-\*]\s*', '', line.strip())
        #         if line:
        #             para = doc.add_paragraph(style="List Bullet")
        #             _add_markdown_text_runs(para, line)
        #             continue

        para = doc.add_paragraph(style="Normal")
        _add_markdown_text_runs(para, block)
    
    # doc.add_page_break()
   

    if references:
        doc.add_page_break()
        if not references_heading_added:
            doc.add_paragraph("References", style="Heading 2")


        for ref in references:
            para = _add_numbered_paragraph(
                doc,
                sanitize_text_for_word(ref.get("title", ""))
            )

            if ref.get("url"):
                add_hyperlink(para, ref["url"])

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return _fix_docx_encoding(buffer.getvalue())


def _add_markdown_text_runs(paragraph, text: str,allow_bold: bool = True):
    """
    Adds text to a paragraph with support for:
    **bold** text
    *italic* text
    [text](url) - markdown links converted to hyperlinks
    Plain URLs - converted to hyperlinks
    """
    if not text:
        return
    
    # Start with markdown links to avoid conflicts with other patterns
    # Replace markdown links [text](url) with a placeholder first
    link_placeholders = {}
    placeholder_counter = 0
    
    def replace_link(match):
        nonlocal placeholder_counter
        link_text = match.group(1)
        link_url = match.group(2)
        placeholder = f"__LINK_PLACEHOLDER_{placeholder_counter}__"
        link_placeholders[placeholder] = (link_text, link_url)
        placeholder_counter += 1
        return placeholder
    
    # Replace all markdown links with placeholders
    text_with_placeholders = re.sub(r'\[([^\]]+?)\]\(([^)]+?)\)', replace_link, text)
    
    # Now process the text with placeholders
    pos = 0
    while pos < len(text_with_placeholders):
        # Check for placeholder (hyperlink)
        placeholder_match = re.search(r'__LINK_PLACEHOLDER_\d+__', text_with_placeholders[pos:])
        # Check for bracketed URL [https://...] so it becomes clickable in Word
        bracketed_url_match = re.search(r'\[(https?://[^\]]+)\]', text_with_placeholders[pos:])
        # Check for bold
        bold_match = re.search(r'\*\*(.+?)\*\*', text_with_placeholders[pos:])
        # Check for italic
        italic_match = re.search(r'(?<!\*)\*([^\*]+?)\*(?!\*)', text_with_placeholders[pos:])
        # Check for plain URL (that wasn't converted to markdown); stop at ] so [https://...] is handled above
        # Match full URL including dots (e.g. https://www.pwc.com/...) so link doesn't break after dot
        url_match = re.search(r'https?://[^\s)\]]+', text_with_placeholders[pos:])
        
        # Collect matches with positions
        matches = []
        if placeholder_match:
            matches.append(('placeholder', pos + placeholder_match.start(), placeholder_match))
        if bracketed_url_match:
            matches.append(('bracketed_url', pos + bracketed_url_match.start(), bracketed_url_match))
        if allow_bold and bold_match:
            matches.append(('bold', pos + bold_match.start(), bold_match))
        if italic_match:
            matches.append(('italic', pos + italic_match.start(), italic_match))
        if url_match:
            matches.append(('url', pos + url_match.start(), url_match))
        
        if not matches:
            # No more patterns, add remaining text
            if pos < len(text_with_placeholders):
                remaining = text_with_placeholders[pos:]
                if remaining:
                    run = paragraph.add_run(sanitize_text_for_word(remaining))
            break
        
        # Process the earliest match
        matches.sort(key=lambda x: x[1])
        match_type, match_pos, match = matches[0]
        
        # Add text before match
        if match_pos > pos:
            before_text = text_with_placeholders[pos:match_pos]
            if before_text:
                run = paragraph.add_run(sanitize_text_for_word(before_text))
        
        # Process the match
        if match_type == 'placeholder':
            placeholder_text = match.group(0)
            if placeholder_text in link_placeholders:
                link_text, link_url = link_placeholders[placeholder_text]
                # Citation refs [1](url), [2](url): make clickable superscript like PDF
                if link_text.isdigit():
                    add_superscript_hyperlink(paragraph, f"[{link_text}]", link_url)
                else:
                    add_hyperlink(paragraph, link_url, link_text)
            pos = match_pos + len(placeholder_text)
        
        elif match_type == 'bracketed_url':
            url = match.group(1).strip()
            add_hyperlink(paragraph, url, url)
            pos = match_pos + len(match.group(0))
        
        elif match_type == 'bold':
            bold_text = match.group(1)
            run = paragraph.add_run(sanitize_text_for_word(bold_text))
            run.bold = True
            pos = match_pos + len(match.group(0))
        
        elif match_type == 'italic':
            italic_text = match.group(1)
            run = paragraph.add_run(sanitize_text_for_word(italic_text))
            run.italic = True
            pos = match_pos + len(match.group(0))
        
        elif match_type == 'url':
            url = match.group(0).rstrip('.,;:')
            # Full URL (regex captures including dots) so entire link is clickable like PDF
            add_hyperlink(paragraph, url, url)
            pos = match_pos + len(url)


def _add_numbered_paragraph(doc: Document, text: str):
    """
    Create a numbered paragraph with a BRAND-NEW numbering instance.
    Always starts from 1. Never interferes with other lists.
    """
    numbering_part = doc.part.numbering_part

    # Create a new abstract numbering definition
    abstract_num_id = _get_next_abstract_num_id(numbering_part)

    abstract_num = OxmlElement("w:abstractNum")
    abstract_num.set(qn("w:abstractNumId"), str(abstract_num_id))

    lvl = OxmlElement("w:lvl")
    lvl.set(qn("w:ilvl"), "0")

    start = OxmlElement("w:start")
    start.set(qn("w:val"), "1")

    lvl_restart = OxmlElement("w:lvlRestart")
    lvl_restart.set(qn("w:val"), "1") 
    num_fmt = OxmlElement("w:numFmt")
    num_fmt.set(qn("w:val"), "decimal")

    lvl_text = OxmlElement("w:lvlText")
    lvl_text.set(qn("w:val"), "%1.")

    lvl.extend([start, lvl_restart, num_fmt, lvl_text])
    abstract_num.append(lvl)
    root = _numbering_root(numbering_part)
    if root is not None:
        root.append(abstract_num)

    # Create a new numbering instance
    num_id = _get_next_num_id(numbering_part)

    num = OxmlElement("w:num")
    num.set(qn("w:numId"), str(num_id))

    abstract_ref = OxmlElement("w:abstractNumId")
    abstract_ref.set(qn("w:val"), str(abstract_num_id))

    num.append(abstract_ref)
    if root is not None:
        root.append(num)

    # Create paragraph using this numbering
    p = doc.add_paragraph()
    pPr = p._p.get_or_add_pPr()

    numPr = OxmlElement("w:numPr")
    ilvl = OxmlElement("w:ilvl")
    ilvl.set(qn("w:val"), "0")
    numId = OxmlElement("w:numId")
    numId.set(qn("w:val"), str(num_id))

    numPr.extend([ilvl, numId])
    pPr.append(numPr)

    p.add_run(text)
    return p

def _add_references_section(doc: Document, references: list[dict]):
    doc.add_page_break()
    doc.add_paragraph("References", style="Heading 2")

    for ref in references:
        title = ref.get("title", "")
        url = ref.get("url", "")
        
        # Create the reference text with URL
        if url:
            display_text = f"{title} (URL: {url})"
        else:
            display_text = title
        
        para = _add_numbered_paragraph(doc, display_text)
        
        # If URL exists, make the URL part a hyperlink
        if url:
            # Clear the paragraph and rebuild with hyperlink
            for run in para.runs[:]:
                run._element.getparent().remove(run._element)
            
            # Add title as plain text
            para.add_run(title)
            para.add_run(" (URL: ")
            
            # Add URL as hyperlink
            add_hyperlink(para, url, url)
            
            para.add_run(")")

def _add_formatted_content(doc: Document, content: str, references: list[dict] | None = None):
    """Parse and add content to document with appropriate styles"""
    
    # Split content into blocks (paragraphs separated by blank lines)
    blocks = content.split('\n\n')
    
    # Pre-process: Merge consecutive numbered list items and citations
    # This handles cases where citations are split across blocks (title and URL on separate blocks)
    merged_blocks = []
    i = 0
    while i < len(blocks):
        block = blocks[i].strip()
        if not block:
            i += 1
            continue
        
        # Check if this is a numbered item
        if re.match(r'^\d+\.', block):
            merged_block = block
            # Look ahead for consecutive numbered items
            j = i + 1
            while j < len(blocks):
                next_block = blocks[j].strip()
                if not next_block:
                    j += 1
                    continue
                
                # Check if next block is also a numbered item
                if re.match(r'^\d+\.', next_block):
                    # Merge with current block
                    merged_block += '\n' + next_block
                    j += 1
                else:
                    # No more numbered items, stop looking
                    break
            
            merged_blocks.append(merged_block)
            i = j
        else:
            merged_blocks.append(block)
            i += 1
    
    # Now process merged blocks
    for block in merged_blocks:
        if not block.strip():
            continue
        
        # Skip separator lines (---, ---, etc.)
        if re.fullmatch(r'\s*-{3,}\s*', block):
            continue
        
        # Check for headings (lines starting with # or **bold** markers)
        block = block.strip()
        
        # Check if the block is a standalone bold text (likely a heading)
        # Pattern: **Text** at the start of a line, possibly followed by newline or end of block
        standalone_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*$', block)
        if standalone_bold_match:
            # This is a standalone bold text, treat as Heading 2
            text = standalone_bold_match.group(1).strip()
            sanitized_text = sanitize_text_for_word(text)
            para = doc.add_paragraph(style='Heading 2')
            # para.add_run(text)
            run = para.add_run(sanitized_text)
            run.bold = True

            # Add bookmark for TOC page number reference
            bookmark_name = text.replace(" ", "_").replace("&", "and")
            _add_bookmark_to_paragraph(para, bookmark_name)
            continue
        
        # Check if the block starts with bold text on first line (likely a section header)
        # Pattern: **Text** followed by newline and more content
        first_line_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*\n', block)
        if first_line_bold_match:
            # Extract the bold heading and remaining content
            heading_text = first_line_bold_match.group(1).strip()
            sanitized_heading = sanitize_text_for_word(heading_text)
            remaining_content = block[first_line_bold_match.end():].strip()
            
            # Add heading
            para = doc.add_paragraph(style='Heading 2')
            # para.add_run(heading_text)
            run = para.add_run(sanitized_heading)
            run.bold = True
            # Add bookmark for TOC page number reference
            bookmark_name = heading_text.replace(" ", "_").replace("&", "and")
            _add_bookmark_to_paragraph(para, bookmark_name)
            
            # Process remaining content recursively
            if remaining_content:
                _add_formatted_content(doc, remaining_content)
            continue
        
        # Detect markdown-style headings
        if block.startswith('####'):
            # Heading 4
            text = block.replace('####', '').strip()
            # Remove ** markers if present
            text = text.replace('**', '')
            para = doc.add_paragraph(style='Heading 4')
            _add_text_with_formatting(para, text)
        elif block.startswith('###'):
            # Heading 3
            text = block.replace('###', '').strip()
            # Remove ** markers if present
            text = text.replace('**', '')
            para = doc.add_paragraph(style='Heading 3')
            _add_text_with_formatting(para, text)
        elif block.startswith('##'):
            # Heading 2
            text = block.replace('##', '').strip()
            # Remove ** markers if present
            text = text.replace('**', '')
            sanitized_text = sanitize_text_for_word(text)
            para = doc.add_paragraph(style='Heading 2')
            run = para.add_run(sanitized_text)
            run.bold = True
        elif block.startswith('#'):
            # Heading 1
            text = block.replace('#', '').strip()
            # Remove ** markers if present
            text = text.replace('**', '')
            para = doc.add_paragraph(style='Heading 1')
            _add_text_with_formatting(para, text)
        
        # Detect bullet lists
        elif block.startswith('•') or block.startswith('- ') or block.startswith('* '):
            lines = block.split('\n')
            for line in lines:
                if line.strip():
                    # Remove bullet markers
                    text = re.sub(r'^[•\-\*]\s*', '', line.strip())
                    para = doc.add_paragraph(style='List Bullet')
                    _add_text_with_formatting(para, text)
        
        # Detect numbered lists and citations
        elif re.match(r'^\d+\.', block):
            lines = block.split('\n')
            logger.debug(f"[_add_formatted_content] Detected numbered block with {len(lines)} lines")
            
            # Check if this is a citation/reference block with URL pattern
            # URLs can be: "URL: https://..." or just "https://..." lines
            is_citation_block = False
            url_pattern = r'(URL:\s*)?https?://'
            if any(re.search(url_pattern, line) for line in lines):
                is_citation_block = True
                logger.debug(f"[_add_formatted_content] Detected citation block (URL-based detection)")
            
            # Also check if this is a citation block by counting numbered lines (PDF-style detection)
            # If at least 2 lines start with a number followed by a period, treat as citations
            if not is_citation_block:
                citation_pattern = r'^\s*\d+\.\s+'
                citation_count = sum(1 for line in lines if re.match(citation_pattern, line.strip()))
                logger.debug(f"[_add_formatted_content] Citation count (PDF-style): {citation_count}")
                if citation_count >= 2:
                    is_citation_block = True
                    logger.debug(f"[_add_formatted_content] Detected citation block (PDF-style detection)")
            
            if is_citation_block:
                logger.debug(f"[_add_formatted_content] Processing citation block with {len(lines)} lines")
                # Process citations/references - keep original numbers, combine title+URL
                citation_entries = []
                
                for line in lines:
                    line_stripped = line.strip()
                    if not line_stripped:
                        continue
                    
                    # Extract complete citation entry (number + title + optional URL all on one line)
                    # Format examples: "1. Title", "1. Title (URL: https://...)", "1. Title [https://...]", "1. Title\nhttps://url"
                    title_match = re.match(r'^(\d+)\.\s+(.*?)(?:\s*\(URL:\s*(https?://[^\)]+)\))?$', line_stripped)
                    if title_match:
                        original_number = title_match.group(1)
                        title_text = title_match.group(2).strip()
                        url_text = title_match.group(3).strip() if title_match.group(3) else None
                        # Also extract URL from square brackets: "Title [https://...]"
                        if not url_text:
                            bracketed_url = re.search(r'\[(https?://[^\]]+)\]', title_text)
                            if bracketed_url:
                                url_text = bracketed_url.group(1).strip()
                                title_text = re.sub(r'\s*\[https?://[^\]]+\]\s*$', '', title_text).strip()
                        logger.debug(f"[_add_formatted_content] Parsed citation: {original_number}. {title_text[:40]}... URL: {url_text[:40] if url_text else 'None'}...")
                        citation_entries.append({
                            'number': original_number,
                            'title': title_text,
                            'url': url_text
                        })
                    # Check if this line is a URL continuation from previous title (plain or in brackets)
                    elif re.match(r'^\s*(?:URL:\s*)?(?:\[)?(https?://[^\s\)\]]+)(?:\])?', line_stripped):
                        # This is a URL line - try to attach to the last entry
                        url_match = re.search(r'(?:URL:\s*)?(?:\[)?(https?://[^\s\)\]]+)(?:\])?', line_stripped)
                        if url_match and citation_entries:
                            citation_entries[-1]['url'] = url_match.group(1).strip()
                            logger.debug(f"[_add_formatted_content] Attached URL to previous citation: {citation_entries[-1]['url'][:40]}...")
                
                logger.debug(f"[_add_formatted_content] Found {len(citation_entries)} citation entries")
                
                # Add entries as paragraphs with hyperlinks
                for idx, entry in enumerate(citation_entries):
                    logger.debug(f"[_add_formatted_content] Adding citation {idx+1}: {entry['number']}. {entry['title'][:30]}...")
                    
                    # Remove ** markers from title
                    title_text = entry['title'].replace('**', '')
                    
                    # Add paragraph with preserved original number
                    para = doc.add_paragraph(style='Body Text')
                    _add_text_with_formatting(para, f"{entry['number']}. {title_text}")
                    
                    # Add URL as hyperlink if it exists
                    if entry['url']:
                        para.add_run(" ")
                        add_hyperlink(para, entry['url'], entry['url'])
                        logger.debug(f"[_add_formatted_content] Added hyperlink: {entry['url'][:40]}...")
                    else:
                        logger.debug(f"[_add_formatted_content] No URL for this citation")

            else:
                # Regular numbered list - PRESERVE original numbers, don't auto-number
                for line in lines:
                    line_stripped = line.strip()
                    if line_stripped and re.match(r'^\d+\.', line_stripped):
                        # Extract the original number
                        number_match = re.match(r'^(\d+)\.\s+(.*)', line_stripped)
                        if number_match:
                            original_number = number_match.group(1)
                            text = number_match.group(2)
                            # Remove ** markers
                            text = text.replace('**', '')
                            # Add paragraph with preserved number, not auto-numbering
                            para = doc.add_paragraph(style='Body Text')
                            para.paragraph_format.left_indent = DocxInches(0.25)
                            _add_text_with_formatting(para, f"{original_number}. {text}")
        
        # Check if block contains multiple lines (multi-line paragraph)
        elif '\n' in block:
            # Check if it's a list within the block
            lines = block.split('\n')
            in_list = False
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Check for bullet points
                if line.startswith('•') or line.startswith('- ') or line.startswith('* '):
                    text = re.sub(r'^[•\-\*]\s*', '', line)
                    para = doc.add_paragraph(style='List Bullet')
                    _add_text_with_formatting(para, text)
                    in_list = True
                # Check for numbered items
                elif re.match(r'^\d+\.', line):
                    # Extract the original number
                    number_match = re.match(r'^(\d+)\.\s+(.*)', line)
                    if number_match:
                        original_number = number_match.group(1)
                        text = number_match.group(2)
                        # Add paragraph with preserved number, not auto-numbering
                        para = doc.add_paragraph(style='Body Text')
                        para.paragraph_format.left_indent = DocxInches(0.25)
                        _add_text_with_formatting(para, f"{original_number}. {text}")
                    in_list = True
                else:
                    # Regular paragraph continuation
                    if in_list:
                        para = doc.add_paragraph(style='List Bullet')
                        _add_text_with_formatting(para, line)
                    else:
                        para = doc.add_paragraph(style='Body Text')
                        _add_text_with_formatting(para, line)
        
        # Regular paragraph
        else:
            # Intelligently split long paragraphs into smaller chunks
            sentence_count = len(re.findall(r'[.!?]', block))
            
            if sentence_count > 3:
                # This is a long paragraph, split it into smaller chunks (2-3 sentences each)
                split_paragraphs = _split_paragraph_into_sentences(block, target_sentences=3)
                for split_para in split_paragraphs:
                    if split_para:
                        para = doc.add_paragraph(style='Body Text')
                        _add_text_with_formatting(para, split_para)
            else:
                # Keep short paragraphs as is
                para = doc.add_paragraph(style='Body Text')
                _add_text_with_formatting(para, block)

    if references:
        _add_references_section(doc, references)

def _set_paragraph_text_with_breaks(para, text):
    """
    Safely set paragraph text with proper line breaks.
    Clears existing runs and adds new text with line breaks where \n appears.
    """
    # Sanitize text first
    text = sanitize_text_for_word(text)
    
    # Clear existing runs
    for run in para.runs[:]:
        run._element.getparent().remove(run._element)
    
    # Split text by newlines and add with proper breaks
    lines = text.split('\n')
    for i, line in enumerate(lines):
        sanitized_line = sanitize_text_for_word(line)
        run = para.add_run(sanitized_line)
        # Add soft line break after each line except the last
        if i < len(lines) - 1:
            run.add_break()

def _ensure_page_break_after_paragraph(para):
    """Add a page break after the given paragraph if one is not already present."""
    # If the last run already ends with a page break, do nothing
    if para.runs:
        last_run = para.runs[-1]
        if getattr(last_run, "break_type", None) == WD_BREAK.PAGE:
            return
    run = para.add_run()
    run.add_break(WD_BREAK.PAGE)

def _extract_headings_from_content(content: str) -> List[str]:
    """
    Extract all headings from content (both markdown # style and **bold** style).
    Returns a list of heading texts in order.
    
    Note: Includes all bold text items and section headers in the table of contents.
    """
    headings = []
    blocks = content.split('\n\n')
    
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        
        # Check for standalone bold text (heading)
        standalone_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*$', block)
        if standalone_bold_match:
            text = standalone_bold_match.group(1).strip()
            # Remove leading numbers like "1. ", "5.1. ", etc.
            text = re.sub(r'^\d+(\.\d+)*\.?\s*', '', text).strip()
            headings.append(text)
            continue
        
        # Check for bold text at start of paragraph
        first_line_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*\n', block)
        if first_line_bold_match:
            text = first_line_bold_match.group(1).strip()
            # Remove leading numbers like "1. ", "5.1. ", etc.
            text = re.sub(r'^\d+(\.\d+)*\.?\s*', '', text).strip()
            headings.append(text)
            continue
        
        # Check for markdown headings
        if block.startswith('####'):
            text = block.replace('####', '').strip()
            # Remove ** markers if present
            text = text.replace('**', '').strip()
            text = re.sub(r'^\d+(\.\d+)*\.?\s*', '', text).strip()
            headings.append(text)
        elif block.startswith('###'):
            text = block.replace('###', '').strip()
            # Remove ** markers if present
            text = text.replace('**', '').strip()
            text = re.sub(r'^\d+(\.\d+)*\.?\s*', '', text).strip()
            headings.append(text)
        elif block.startswith('##'):
            text = block.replace('##', '').strip()
            # Remove ** markers if present
            text = text.replace('**', '').strip()
            text = re.sub(r'^\d+(\.\d+)*\.?\s*', '', text).strip()
            headings.append(text)
        elif block.startswith('#'):
            text = block.replace('#', '').strip()
            # Remove ** markers if present
            text = text.replace('**', '').strip()
            text = re.sub(r'^\d+(\.\d+)*\.?\s*', '', text).strip()
            headings.append(text)
    
    return headings

def _add_table_of_contents(doc: Document, headings: List[str]):
    """
    Add a custom table of contents with the provided headings and page numbers.
    Uses Word bookmarks and page number fields to automatically track page numbers.
    Includes serial numbers (1, 2, 3, ...) before each heading.
    """
    # Add "Contents" heading
    toc_title = doc.add_paragraph("Contents", style='Heading 1')
    doc.add_paragraph()  # Blank line
    
    # Add each heading as a TOC entry with serial number and page number field
    for index, heading in enumerate(headings, start=1):
        # Create a paragraph for the TOC entry
        toc_entry = doc.add_paragraph()
        toc_entry.paragraph_format.left_indent = DocxInches(0.5)
        
        # Add the serial number and heading text
        run = toc_entry.add_run(f"{index}. {heading}")
        run.font.size = DocxPt(11)
        
        # Add page number field that will be populated by Word
        # This uses the PAGEREF field to reference the page where the heading appears
        page_run = toc_entry.add_run()
        page_run.font.size = DocxPt(11)
        
        # Create a page number field using Word's field syntax
        fldChar1 = OxmlElement('w:fldChar')
        fldChar1.set(qn('w:fldCharType'), 'begin')
        
        instrText = OxmlElement('w:instrText')
        instrText.set(qn('xml:space'), 'preserve')
        instrText.text = f'PAGEREF "{heading.replace(" ", "_")}" \\h'
        
        fldChar2 = OxmlElement('w:fldChar')
        fldChar2.set(qn('w:fldCharType'), 'end')
        
        # Add field elements to the run
        page_run._r.append(fldChar1)
        page_run._r.append(instrText)
        page_run._r.append(fldChar2)
        
        # Add a space before page number
        toc_entry.runs[1].text = ' ' + toc_entry.runs[1].text


def _add_text_with_formatting(para, text):
    """
    Add text to a paragraph with inline markdown formatting (bold, italic, hyperlinks).
    Supports **bold**, *italic*, [text](url) markdown links, and plain URLs.
    """
    if not text:
        return
    
    # Start with markdown links to avoid conflicts with other patterns
    # Replace markdown links [text](url) with a placeholder first
    link_placeholders = {}
    placeholder_counter = 0
    
    def replace_link(match):
        nonlocal placeholder_counter
        link_text = match.group(1)
        link_url = match.group(2)
        placeholder = f"__LINK_PLACEHOLDER_{placeholder_counter}__"
        link_placeholders[placeholder] = (link_text, link_url)
        placeholder_counter += 1
        return placeholder
    
    # Replace all markdown links with placeholders
    text_with_placeholders = re.sub(r'\[([^\]]+?)\]\(([^)]+?)\)', replace_link, text)
    
    # Now process the text with placeholders
    pos = 0
    while pos < len(text_with_placeholders):
        # Check for placeholder (hyperlink)
        placeholder_match = re.search(r'__LINK_PLACEHOLDER_\d+__', text_with_placeholders[pos:])
        # Check for bracketed URL [https://...] so it becomes clickable in Word
        bracketed_url_match = re.search(r'\[(https?://[^\]]+)\]', text_with_placeholders[pos:])
        # Check for bold
        bold_match = re.search(r'\*\*(.+?)\*\*', text_with_placeholders[pos:])
        # Check for italic
        italic_match = re.search(r'(?<!\*)\*([^\*]+?)\*(?!\*)', text_with_placeholders[pos:])
        # Check for plain URL (that wasn't converted to markdown)
        # Match https?:// followed by non-whitespace characters, but stop at closing parens/brackets or end of string
        # Note: NOT stopping at dots since dots are normal in URLs
        url_match = re.search(r'https?://[^\s)\]]+(?=[)\]\s]|$)', text_with_placeholders[pos:])
        
        # Collect matches with positions
        matches = []
        if placeholder_match:
            matches.append(('placeholder', pos + placeholder_match.start(), placeholder_match))
        if bracketed_url_match:
            matches.append(('bracketed_url', pos + bracketed_url_match.start(), bracketed_url_match))
        if bold_match:
            matches.append(('bold', pos + bold_match.start(), bold_match))
        if italic_match:
            matches.append(('italic', pos + italic_match.start(), italic_match))
        if url_match:
            matches.append(('url', pos + url_match.start(), url_match))
        
        if not matches:
            # No more patterns, add remaining text
            if pos < len(text_with_placeholders):
                remaining = text_with_placeholders[pos:]
                if remaining:
                    run = para.add_run(sanitize_text_for_word(remaining))
            break
        
        # Process the earliest match
        matches.sort(key=lambda x: x[1])
        match_type, match_pos, match = matches[0]
        
        # Add text before match
        if match_pos > pos:
            before_text = text_with_placeholders[pos:match_pos]
            if before_text:
                run = para.add_run(sanitize_text_for_word(before_text))
        
        # Process the match
        if match_type == 'placeholder':
            placeholder_text = match.group(0)
            if placeholder_text in link_placeholders:
                link_text, link_url = link_placeholders[placeholder_text]
                add_hyperlink(para, link_url, link_text)
            pos = match_pos + len(placeholder_text)
        
        elif match_type == 'bracketed_url':
            url = match.group(1).strip()
            add_hyperlink(para, url, url)
            pos = match_pos + len(match.group(0))
        
        elif match_type == 'bold':
            bold_text = match.group(1)
            run = para.add_run(sanitize_text_for_word(bold_text))
            run.bold = True
            pos = match_pos + len(match.group(0))
        
        elif match_type == 'italic':
            italic_text = match.group(1)
            run = para.add_run(sanitize_text_for_word(italic_text))
            run.italic = True
            pos = match_pos + len(match.group(0))
        
        elif match_type == 'url':
            url = match.group(0).rstrip('.,;:')
            add_hyperlink(para, url, url)
            pos = match_pos + len(url)


def export_to_word_with_metadata(content: str, title: str, subtitle: Optional[str] = None, 
                                   content_type: Optional[str] = None) -> bytes:
    """
    Export content to Word DOCX format using PwC template with metadata
    
    Args:
        content: The main content to export
        title: Document title
        subtitle: Optional subtitle
        content_type: Type of content (article, whitepaper, executive-brief, blog)
    """
    logger.info(f"[export_to_word_with_metadata] Starting export. Title: {title[:50]}, Content length: {len(content)}")
    
    try:
        # Load PwC template
        if os.path.exists(PWC_TEMPLATE_PATH):
            doc = Document(PWC_TEMPLATE_PATH)
            logger.info(f"Loaded PwC template from: {PWC_TEMPLATE_PATH}")
        else:
            logger.warning(f"PwC template not found at {PWC_TEMPLATE_PATH}, using default formatting")
            doc = Document()
    except Exception as e:
        logger.warning(f"Failed to load PwC template: {e}, using default formatting")
        doc = Document()
    
    # Remove footers and add page numbers only
    _set_footer_with_page_numbers_only(doc)
    
    # Check if template has proper structure (Title, Subtitle, page breaks)
    has_template_structure = (
        len(doc.paragraphs) > 2 and 
        doc.paragraphs[0].style.name == 'Title' and
        doc.paragraphs[1].style.name == 'Subtitle'
    )
    
    if has_template_structure:
        # Use template structure: update title and subtitle, remove page break paragraphs
        # Update title (paragraph 0) - clear runs and set text
        _set_paragraph_text_with_breaks(doc.paragraphs[0], title)
        
        # Increase font size of title for better prominence on cover page
        for run in doc.paragraphs[0].runs:
            run.font.size = DocxPt(28)  # Large font for prominent title on cover page
        
        # Set paragraph alignment to center or left with word wrap enabled
        doc.paragraphs[0].alignment = None  # Use default alignment
        doc.paragraphs[0].paragraph_format.widow_control = True  # Better line breaking
        
        # Update subtitle (paragraph 1) with proper line breaks
        if subtitle and content_type:
            subtitle_text = f"{subtitle}\n{content_type.replace('-', ' ').title()}"
        elif subtitle:
            subtitle_text = subtitle
        else:
            # Don't show content_type as subtitle - it's only for metadata/formatting
            subtitle_text = ''
        
        _set_paragraph_text_with_breaks(doc.paragraphs[1], subtitle_text)
        
        # Remove ALL template content after title and subtitle (including old TOC and page breaks)
        paragraphs_to_remove = list(doc.paragraphs[2:])
        for para in paragraphs_to_remove:
            p = para._element
            p.getparent().remove(p)

        # Add page break after subtitle
        _ensure_page_break_after_paragraph(doc.paragraphs[1])
        
        # Extract headings from content before adding it
        headings = _extract_headings_from_content(content)
        
        # Add Table of Contents only for Article and White Paper, skip for Blog and Executive Brief
        should_add_toc = content_type and content_type.lower() not in ['blog', 'executive_brief', 'executive-brief']
        
        if headings and should_add_toc:
            logger.info(f"[export_to_word_with_metadata] Adding Table of Contents for content_type: {content_type}")
            _add_table_of_contents(doc, headings)
            
            # Add a page break before the generated content so it starts after the TOC page
            page_break_para = doc.add_paragraph()
            run = page_break_para.add_run()
            run.add_break(WD_BREAK.PAGE)
        else:
            logger.info(f"[export_to_word_with_metadata] Skipping Table of Contents for content_type: {content_type}")
        
        # Add content after the cover/TOC
        _add_formatted_content(doc, content)
    else:
        # No template structure, clear everything and build from scratch
        for para in doc.paragraphs[:]:
            p = para._element
            p.getparent().remove(p)
        
        # Add title using Title style with sanitization
        sanitized_title = sanitize_text_for_word(title)
        title_para = doc.add_paragraph(sanitized_title, style='Title')
        
        # Add subtitle if provided
        if subtitle:
            sanitized_subtitle = sanitize_text_for_word(subtitle)
            subtitle_para = doc.add_paragraph(sanitized_subtitle, style='Subtitle')
        
        # Add content type if provided
        if content_type:
            sanitized_content_type = sanitize_text_for_word(f"Content Type: {content_type.replace('-', ' ').title()}")
            type_para = doc.add_paragraph(sanitized_content_type, style='Subtitle')
        
        # Add a blank line
        doc.add_paragraph()
        
        # Parse and add content with proper formatting
        _add_formatted_content(doc, content)
    
    buffer = io.BytesIO()
    try:
        doc.save(buffer)
    except UnicodeEncodeError as e:
        logger.error(f"Encoding error while saving document: {e}")
        raise Exception(f"Failed to save Word document due to encoding error: {str(e)}")
    except Exception as e:
        logger.error(f"Error saving Word document: {e}")
        raise Exception(f"Failed to save Word document: {str(e)}")
    
    buffer.seek(0)
    docx_bytes = buffer.getvalue()
    
    logger.info(f"[export_to_word_with_metadata] Document created, size before encoding fix: {len(docx_bytes)} bytes")
    
    # Apply encoding fix to ensure all Unicode characters are properly handled
    try:
        docx_bytes = _fix_docx_encoding(docx_bytes)
        logger.info(f"[export_to_word_with_metadata] Encoding fix applied, final size: {len(docx_bytes)} bytes")
    except Exception as e:
        logger.error(f"[export_to_word_with_metadata] Error during encoding fix: {e}")
        # Continue anyway - the document might still be valid
    
    logger.info(f"[export_to_word_with_metadata] Export completed successfully")
    return docx_bytes

def export_to_text(content: str) -> bytes:
    """Export content to plain text format"""
    return content.encode('utf-8')
   
def _clean_bullet_text(text: str) -> str:
    text = re.sub(r'\*{1,2}', '', text)
    text = re.sub(r'^\s*(bullet|•|-)\s*', '', text, flags=re.IGNORECASE)
    return text.strip()

def _strip_ui_markdown(text: str) -> str:
    """
    Remove UI markdown artifacts (*, **) that should not
    be rendered as formatting in PDF.
    """
    if not text:
        return text
    text = re.sub(r'\*{1,2}', '', text)
    text = re.sub(r'^\s*[-•]\s*', '', text)
    return text.strip()

def export_to_word_ui_plain(content: str, title: str) -> bytes:
    """
    Standalone UI Word export
    - No template
    - No TOC
    - No headers/footers
    """
    doc = Document()

    def tighten_spacing(p):
        p.paragraph_format.space_before = DocxPt(0)
        p.paragraph_format.space_after = DocxPt(4)
        p.paragraph_format.line_spacing = 1

    lines = content.split("\n")

    for line in lines:
        text = line.rstrip()

        if not text:
            p = doc.add_paragraph("")
            tighten_spacing(p)
            continue

        # Bullet points
        if re.match(r"^(\-|\•)\s+", text):
            bullet_text = re.sub(r"^(\-|\•)\s+", "", text)
            p = doc.add_paragraph(style="List Bullet")
            tighten_spacing(p)

            # Bold heading before colon
            if ":" in bullet_text:
                head, rest = bullet_text.split(":", 1)
                r1 = p.add_run(head.strip() + ":")
                r1.bold = True
                p.add_run(rest)
            else:
                p.add_run(bullet_text)

            continue

        # Normal paragraph
        p = doc.add_paragraph()
        tighten_spacing(p)

        # Bold hashtags
        parts = re.split(r"(#\w+)", text)
        for part in parts:
            if part.startswith("#"):
                r = p.add_run(part)
                r.bold = True
            else:
                # Handle **bold**
                subparts = re.split(r"(\*\*.*?\*\*)", part)
                for sub in subparts:
                    if sub.startswith("**") and sub.endswith("**"):
                        r = p.add_run(sub[2:-2])
                        r.bold = True
                    else:
                        p.add_run(sub)

    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()

def normalize_broken_markdown(text: str) -> str:
    text = re.sub(r'\*(\w[^*]+)\*\*', r'**\1**', text)
    text = re.sub(r'\*{3,}', '**', text)
    return text

def _remove_bullets_from_block(text: str) -> str:
    """
    Removes bullet lines from a block of text and returns remaining paragraphs.
    Handles -, –, •, *, and numbered bullets.
    """
    lines = text.splitlines()
    cleaned = []

    bullet_pattern = re.compile(r'^\s*(?:[-–•*]|\d+[.)])\s+')

    for line in lines:
        if bullet_pattern.match(line):
            continue
        cleaned.append(line)

    return "\n".join(cleaned).strip()

def add_superscript_hyperlink(paragraph, text, url):
    run = paragraph.add_run(text)
    run.font.superscript = True
    run.bold = False

    r = run._r
    rPr = r.get_or_add_rPr()

    # Hyperlink XML
    hyperlink = OxmlElement('w:hyperlink')
    hyperlink.set(qn('r:id'), paragraph.part.relate_to(
        url,
        docx.opc.constants.RELATIONSHIP_TYPE.HYPERLINK,
        is_external=True
    ))

    hyperlink.append(r)
    paragraph._p.append(hyperlink)

def export_to_pdf_with_pwc_template_with_bullets(
    content: str,
    title: str,
    subtitle: str | None = None,include_toc: bool = True) -> bytes:
    
    logger.info("[Export] PDF-PWC-BULLETS endpoint hit")
    # title = re.sub(r'\*+', '', title).strip()
    title = re.sub(r'^[#\s]*', '', re.sub(r'\*+', '', title)).strip()

    logger.info(f"[Export] PDF-PWC-BULLETS title",{"title": title})
    subtitle = re.sub(r'\*+', '', subtitle).strip() if subtitle else None
    logger.info("Creating PWC branded PDF with title, subtitle, and content")
    # Check if template exists
    if not os.path.exists(PWC_PDF_TEMPLATE_PATH):
        logger.warning(f"PwC PDF template not found at {PWC_PDF_TEMPLATE_PATH}")
        return _generate_pdf_with_title_subtitle(content, title, subtitle)
    
    # ===== STEP 1: Create branded cover page =====
    logger.info("Step 1: Creating branded cover page")
    template_reader = PdfReader(PWC_PDF_TEMPLATE_PATH)
    template_page = template_reader.pages[0]
    page_width = float(template_page.mediabox.width)
    page_height = float(template_page.mediabox.height)
    logger.info(f"Template page size: {page_width:.1f} x {page_height:.1f} points")
    # Create overlay with text
    overlay_buffer = io.BytesIO()
    c = canvas.Canvas(overlay_buffer, pagesize=(page_width, page_height))
    # Add title
    title_font_size = 28
    if len(title) > 80:
        title_font_size = 20
    elif len(title) > 60:
        title_font_size = 22
    elif len(title) > 40:
        title_font_size = 26
    c.setFont("Helvetica-Bold", title_font_size)
    c.setFillColor('#000000')  # Black color
    title_y = page_height * 0.72
    
    # Handle multi-line titles with better word wrapping
    # Maximum width for title (leaving margins on left and right)
    max_title_width = page_width * 0.70  # 70% of page width with margins
    
    # Better character width estimation - more conservative to avoid cutoff
    # Estimate pixels needed per character based on font size
    # At 20pt Helvetica: ~10 pixels per character average
    char_width_at_font = (title_font_size / 20.0) * 10
    max_chars_per_line = int(max_title_width / char_width_at_font)
    
    # Ensure reasonable minimum and maximum
    max_chars_per_line = max(20, min(max_chars_per_line, 50))
    clean_title = re.sub(r'\*+', '', title).strip()
    words = clean_title.split()
    lines = []
    current_line = []
    for word in words:
        test_line = ' '.join(current_line + [word])
        if len(test_line) > max_chars_per_line:
            if current_line:
                lines.append(' '.join(current_line))
            current_line = [word]
        else:
            current_line.append(word)
    if current_line:
        lines.append(' '.join(current_line))
    # Draw multi-line title
    if len(lines) > 1:
        line_height = title_font_size + 6
        # Center vertically: start higher if multiple lines
        start_y = title_y + (len(lines) - 1) * line_height / 2
        for i, line in enumerate(lines):
            c.drawCentredString(page_width / 2, start_y - (i * line_height), line)
        last_title_y = start_y - (len(lines) * line_height)
    else:
        c.drawCentredString(page_width / 2, title_y, clean_title)
        last_title_y = title_y
    
    logger.info(f"Title added to overlay: {clean_title} ({len(lines)} lines)")
    # Add subtitle if provided
    if subtitle:
        # Clean up markdown asterisks from subtitle
        subtitle_clean = subtitle.replace('**', '')
        c.setFont("Helvetica-Bold", 14)  # Bold font
        c.setFillColor('#000000')  # Black color
        subtitle_y = last_title_y - 70        
        # Wrap subtitle text to fit within page width
        # Use a more conservative character limit for subtitle
        # Page width is typically 612 points (8.5 inches) for letter size
        # Helvetica 14pt: approximately 7-8 pixels per character
        max_subtitle_width = page_width * 0.75  # 75% of page width with margins
        subtitle_char_width = 8  # pixels per character at 14pt
        max_chars_per_line = int(max_subtitle_width / subtitle_char_width)
        words = subtitle_clean.split()
        lines = []
        current_line = []        
        for word in words:
            test_line = ' '.join(current_line + [word])
            # Use more conservative line breaking - shorter lines for better visibility
            if len(test_line) > min(50, max_chars_per_line):
                if current_line:
                    lines.append(' '.join(current_line))
                current_line = [word]
            else:
                current_line.append(word)        
        if current_line:
            lines.append(' '.join(current_line))        
        # Draw multi-line subtitle with proper centering
        line_height = 22
        # If multiple lines, center vertically
        if len(lines) > 1:
            start_y = subtitle_y + (len(lines) - 1) * line_height / 2
        else:
            start_y = subtitle_y        
        for i, line in enumerate(lines):
            c.drawCentredString(page_width / 2, start_y - (i * line_height), line)
        logger.info(f"Subtitle added to overlay: {subtitle_clean} ({len(lines)} lines)")
    c.save()
    overlay_buffer.seek(0)    
    # Merge overlay with template
    overlay_reader = PdfReader(overlay_buffer)
    overlay_page = overlay_reader.pages[0]    
    template_page.merge_page(overlay_page)
    logger.info("Overlay merged onto template cover page")        
    logger.info("Step 2: Creating formatted content pages")
    # First, extract all headings for Table of Contents
    headings = []
    if include_toc:
        # blocks = content.split('\n')
        blocks = re.split(r'\n\s*\n', content)
        for block in blocks:
            if not block.strip():
                continue
            block = block.strip()
            if re.match(r'^\s*[-_]{3,}\s*$', block):
                continue
            # Check for various heading formats
            standalone_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*$', block)
            if standalone_bold_match:
                heading_text = standalone_bold_match.group(1)
                heading_text = re.sub(r'\*+', '', heading_text).rstrip(':').strip()
                if heading_text.lower() == 'references':
                    headings.append('References')
                    continue
                headings.append(heading_text)
                continue
            first_line_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*\n', block)
            if first_line_bold_match:
                heading_text = re.sub(r'\*+', '', first_line_bold_match.group(1)).rstrip(':').strip()
                headings.append(heading_text)
                continue
            # Markdown headings
            if block.startswith('#'):
                text = re.sub(r'^#+\s*', '', block.split('\n')[0]).strip()
                text = re.sub(r'\*+', '', text).rstrip(':').strip()
                # headings.append(text.rstrip(':').strip())
                headings.append(text)
        logger.info(f"Extracted {len(headings)} headings for Table of Contents")
    content_buffer = io.BytesIO()
    doc = SimpleDocTemplate(
    content_buffer,
    pagesize=(page_width, page_height),
    topMargin=1*inch,
    bottomMargin=1*inch,
    leftMargin=1.1*inch,
    rightMargin=1*inch)
    styles = getSampleStyleSheet()
    # Define custom styles
    body_style = ParagraphStyle(
        'PWCBody',
        parent=styles['BodyText'],
        fontSize=11,
        leading=15,
        alignment=TA_JUSTIFY,
        spaceAfter=6,#12
        # fontName='Helvetica'
        fontName='DejaVu'
    )
    body_style.hyphenationLang = None
    table_cell_style = ParagraphStyle(
    'PWCTableCell',
    parent=styles['BodyText'],
    fontName='Helvetica',
    fontSize=10,
    leading=14,
    alignment=TA_LEFT,
    spaceAfter=0,
    spaceBefore=0,
)

    bullet_style = ParagraphStyle(
        'PWCBullet',
        parent=body_style,
        leftIndent=0,
        spaceAfter=6,
        alignment=TA_LEFT
    )
    reference_style = ParagraphStyle(
        'PWCReference',
        parent=styles['BodyText'],
        fontSize=11,
        leading=13,
        alignment=TA_LEFT,
        spaceAfter=4,  
        spaceBefore=0,
        fontName='Helvetica',
        bold = False
    )
    heading_style = ParagraphStyle(
        'PWCHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor='#D04A02',
        spaceAfter=10,
        spaceBefore=10, #10
        # fontName='Helvetica-Bold' #Helvetica
        fontName='DejaVu-Bold'

    )
 
   
    story = []   
    
    # Parse and add content with formatting
    # blocks = content.split('\n')
    blocks = re.split(r'\n\s*\n', content)
    for block in blocks:
        if not block.strip():
            continue
         # ===== TABLE DETECTION (ADD THIS BLOCK) =====
        if "|" in block and re.search(r"\|\s*-{3,}", block):
            rows = [r.strip() for r in block.split("\n") if "|" in r]
            # data = [
            #     [re.sub(r"[*#]+", "", cell).strip() for cell in row.strip("|").split("|")]
            #     for row in rows
            # ]
            data = [
                [
                    Paragraph(
                        re.sub(r"[*#]+", "", cell).strip(),
                        table_cell_style
                    )
                    for cell in row.strip("|").split("|")
                ]
                for row in rows
            ]

            usable_width = page_width - (1.1*inch + 1*inch + 0.3*inch)
            colWidths = [usable_width * 0.3] + [usable_width * 0.7 / (len(data[0]) - 1)] * (len(data[0]) - 1)


            table = Table(
                data,
                # colWidths=[(page_width - 2.1*inch) / len(data[0])] * len(data[0]),
                colWidths=colWidths,
                repeatRows=1
            )
            table.setStyle([
                ('GRID', (0,0), (-1,-1), 0.5, colors.black),
                ('BACKGROUND', (0,0), (-1,0), colors.whitesmoke),
                ('FONT', (0,0), (-1,0), 'Helvetica-Bold'),
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                # ('WORDWRAP', (0,0), (-1,-1), 'CJK'),
                ('LEFTPADDING', (0,0), (-1,-1), 6),
                ('RIGHTPADDING', (0,0), (-1,-1), 6),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                ('NOSPLIT', (0,0), (-1,-1)),
                
                # ('ROWHEIGHT', (0,0), (-1,-1), None),


            ])
            # story.append(table)
            # # story.append(Spacer(1, 12))
            # # story.append(Spacer(1, 20))
            # story.append(Spacer(1, 12))
            # story.append(KeepTogether([table]))
            # story.append(Spacer(1, 18))
            # story.append(Paragraph("&nbsp;", body_style))
            # table.hAlign = 'LEFT'
            story.append(KeepTogether([
                table,
                Spacer(1, 18)
            ]))



            continue
            # ===== END TABLE DETECTION =====        
        block = block.strip()
        if '\n' in block:
            lines = [l.rstrip() for l in block.split('\n') if l.strip()]
            first = lines[0].lstrip()
            rest = lines[1:]

            # ---------- 1️⃣ MARKDOWN HEADINGS ----------
            if first.startswith('#'):
                heading_text = re.sub(r'^#+\s*', '', first)
                heading_text = re.sub(r'\*+', '', heading_text).rstrip(':').strip()

                story.append(Paragraph(heading_text, heading_style))

                # render remaining content normally
                if rest:
                    remaining_block = "\n".join(rest).strip()

                    if _is_bullet_list_block(remaining_block):
                        bullet_items = _parse_bullet_items(remaining_block)
                        story.append(ListFlowable(
                            [
                                ListItem(
                                    Paragraph(
                                        _format_content_for_pdf_mi(
                                            _clean_bullet_text(item)
                                        ),
                                        bullet_style
                                    ),
                                    leftIndent=24 + indent * 12,
                                    bulletText='•'
                                )
                                for indent, item in bullet_items
                            ],
                            bulletType='bullet',
                            leftIndent=24
                        ))
                    else:
                        story.append(
                            Paragraph(
                                _format_content_for_pdf_mi(
                                    _clean_bullet_text(remaining_block)
                                ),
                                body_style
                            )
                        )
                continue

            # ---------- 2️⃣ NON-HEADING MULTI-LINE PARAGRAPHS ----------
            if not _is_bullet_list_block(block) and "|" not in block:
                for line in lines:
                    story.append(
                        Paragraph(
                            _format_content_for_pdf_mi(_clean_bullet_text(line)),
                            body_style
                        )
                    )
                continue

        if re.match(r'^\s*[-_]{3,}\s*$', block):
            continue
        # Check for headings (bold text on its own line or markdown style)
        standalone_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*$', block)
        if standalone_bold_match:
            heading_text = standalone_bold_match.group(1)
            heading_text = re.sub(r'\*+', '', heading_text).rstrip(':').strip()
            if heading_text.lower().rstrip(':') == 'references':
                story.append(Paragraph('References', heading_style))
                continue
            story.append(Paragraph(heading_text, heading_style))
            continue
        # Check for bold text at start of paragraph
        # ---- NUMBERED SECTION HEADING (e.g. 1. Executive Overview) ----
        numbered_heading_match = re.match(
            r'^#*\s*(\d+\.\s+[A-Z][^\n]+)\n+(.*)',
            block,
            re.DOTALL
        )
        if numbered_heading_match:
            heading_text = numbered_heading_match.group(1).strip()
            remaining = numbered_heading_match.group(2).strip()

            story.append(Paragraph(heading_text, heading_style))

            if remaining:
                story.append(Spacer(1, 8))
                story.append(Paragraph(
                    _format_content_for_pdf_mi(_strip_ui_markdown(remaining)),
                    body_style
                ))
            continue

        first_line_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*\n', block)
        if first_line_bold_match:
            heading_text = first_line_bold_match.group(1)
            heading_text = re.sub(r'\*+', '', heading_text).rstrip(':').strip()
            remaining_content = block[first_line_bold_match.end():].strip()
            story.append(Paragraph(heading_text, heading_style))
            if remaining_content:
                # Check if remaining content is a bullet list
                if _is_bullet_list_block(remaining_content):
                    bullet_items = _parse_bullet_items(remaining_content)
                    bullet_flow = ListFlowable(
                        [
                            ListItem(
                                Paragraph(_format_content_for_pdf_mi(_strip_ui_markdown(_clean_bullet_text(text)).lstrip("-–• ")), bullet_style),
                                # leftIndent=24 + indent * 2,
                                leftIndent=18 + indent * 12,
                                bulletText='•'
                            )
                            for indent, text in bullet_items
                        ],
                        bulletType='bullet',
                        leftIndent=24,
                        spaceBefore=4,
                        spaceAfter=8
                    )
                    story.append(bullet_flow)
                    # trailing_text = _remove_bullets_from_block(remaining_content).strip()
                    if not _is_bullet_list_block(remaining_content):
                        trailing_text = remaining_content.strip()
                    else:
                        trailing_text = _remove_bullets_from_block(remaining_content).strip()

                    if trailing_text:
                        story.append(Spacer(1, 6))
                        story.append(Paragraph(
                            _format_content_for_pdf_mi(trailing_text),
                            body_style
                        ))
                else:
                    para = Paragraph(_format_content_for_pdf_mi( _strip_ui_markdown(remaining_content)), body_style)
                    story.append(para)
            continue
        bullet_heading_match = re.match(
            r'^###\s*•\s*(.+?)\s*\n+(.+)',
            block,
            re.DOTALL
        )

        if bullet_heading_match:
            heading_text = bullet_heading_match.group(1).strip()
            body_text = bullet_heading_match.group(2).strip()

            story.append(Paragraph(f"• {heading_text}", heading_style))
            story.append(Spacer(1, 6))
            story.append(Paragraph(
                _format_content_for_pdf_mi(_strip_ui_markdown(body_text)),
                body_style
            ))
            continue
        # Check for markdown headings
        if block.startswith('####'):
            text = block.replace('####', '').strip()
            text = re.sub(r'\*+', '', text).rstrip(':').strip()
            story.append(Paragraph(text, heading_style))
            continue
        elif block.startswith('###'):
            text = block.replace('###', '').strip()
            text = re.sub(r'\*+', '', text).rstrip(':').strip()
            story.append(Paragraph(text, heading_style))
            continue
        elif block.startswith('##'):
            text = block.replace('##', '').strip()
            text = re.sub(r'\*+', '', text).rstrip(':').strip()
            story.append(Paragraph(text, heading_style))
            continue
        elif block.startswith('#'):
            text = block.replace('#', '').strip()
            text = re.sub(r'\*+', '', text).rstrip(':').strip()
            story.append(Paragraph(text, heading_style))
            continue
        
        # Check if block is a bullet list
        if _is_bullet_list_block(block):
            bullet_items = _parse_bullet_items(block)
            bullet_flow = ListFlowable(
                [
                    ListItem(
                        Paragraph(_format_content_for_pdf_mi(_clean_bullet_text(item)), bullet_style),
                        # leftIndent=24 + indent * 2,
                        leftIndent = 24 + indent * 12,
                        # bulletText='•'
                        bulletText = '•' if indent < 2 else '-'
                    )
                    for indent,item in bullet_items
                ],
                # start='bullet',
                bulletType='bullet',
                leftIndent=24
            )
            story.append(bullet_flow)
            continue
        
        # Check if block contains multiple lines with citation patterns
        # Citations typically look like: [1] text or 1. text
        lines = block.split('\n')
        if len(lines) > 1:
            # Check if this looks like a citation/reference block
            citation_pattern = r'^\s*(\[\d+\]|\d+\.)\s+'
            citation_count = sum(1 for line in lines if re.match(citation_pattern, line.strip()))
            
            # If at least 2 lines match citation pattern, treat as citation block
            if citation_count >= 2:
                # Process each line separately with left alignment (no justify)
                for line in lines:
                    line_stripped = line.strip()
                    if line_stripped:
                        clean = _strip_ui_markdown(line_stripped)
                        para = Paragraph(_format_content_for_pdf_mi(clean), reference_style)

                        # para = Paragraph(_format_content_for_pdf_mi( _strip_ui_markdown(line_stripped))+ " ", reference_style)
                        # para = Paragraph(_strip_ui_markdown(line_stripped), reference_style)
                        story.append(Spacer(1, 6))
                        
                        story.append(para)
                        story.append(Spacer(1, 6))
                continue
        
        # Regular paragraph - intelligently split long paragraphs into smaller chunks
        sentence_count = len(re.findall(r'[.!?]', block))
        # if sentence_count > 999:
        if sentence_count > 20:    
            # This is a long paragraph, split it into smaller chunks (2-3 sentences each)
            split_paragraphs = _split_paragraph_into_sentences(block, target_sentences=3)
            for split_para in split_paragraphs:
                if split_para:
                    para = Paragraph(_format_content_for_pdf_mi(split_para), body_style)
                    story.append(para)
        else:
            # Keep short paragraphs as is
            # para = Paragraph(_format_content_for_pdf_mi(_strip_ui_markdown(_clean_bullet_text(block))), body_style)
            # para = Paragraph(_format_content_for_pdf_mi(_clean_bullet_text(block)), body_style)
            para = Paragraph(_format_content_for_pdf_mi(_clean_bullet_text(block)), body_style)

            story.append(para)
    
    # Build the content PDF
    # doc.build(story)
    doc.build(
        story,
        onFirstPage=_add_page_number,
        onLaterPages=_add_page_number
    )
    content_buffer.seek(0)
    if include_toc:
        logger.info("Step 2.5: Creating Table of Contents pages (multi-page)")
        toc_buffer = io.BytesIO()
        toc_doc = SimpleDocTemplate(toc_buffer, pagesize=(page_width, page_height), topMargin=1*inch, bottomMargin=1*inch)
        toc_styles = getSampleStyleSheet()
        toc_title_style = ParagraphStyle(
            'TOCTitle',
            parent=toc_styles['Heading1'],
            fontSize=24,
            textColor='#000000',
            spaceAfter=24,
            alignment=TA_LEFT,
            fontName='Helvetica-Bold'
        )
        toc_heading_style = ParagraphStyle(
            'TOCHeading',
            parent=toc_styles['BodyText'],
            fontSize=11,
            textColor='#000000',
            spaceAfter=6,#12
            alignment=TA_LEFT,
            fontName='Helvetica',
            leading=16,
            rightIndent=20
        )
        toc_story = []
        if not headings:
            toc_pages = []
        toc_story.append(Paragraph("Contents", toc_title_style))
        toc_story.append(Spacer(1, 0.2 * inch))
        seen = set()
        filtered_headings = []
        for h in headings:
            if h not in seen:
                filtered_headings.append(h)
                seen.add(h)
        for index, heading in enumerate(filtered_headings, start=1):
            clean_heading = re.sub(r'^\d+\.\s*', '', heading)
            toc_story.append(Paragraph(f"{index}. {heading}", toc_heading_style))

        toc_doc.build(toc_story)
        toc_buffer.seek(0)
        toc_reader = PdfReader(toc_buffer)
        toc_pages = [toc_reader.pages[i] for i in range(len(toc_reader.pages))]
    logger.info("Step 3: Merging cover page, ToC, and content pages")
    content_reader = PdfReader(content_buffer)
    writer = PdfWriter()
    # Add the branded cover page (Page 1)
    writer.add_page(template_page)
    logger.info("Added branded cover page with PWC logo, title, and subtitle")
        # Add the Table of Contents pages (Page 2+)
    if include_toc:    
        for toc_page in toc_pages:
            writer.add_page(toc_page)
    if not content_reader:
        raise RuntimeError("content_reader was not initialized")

    # Add all content pages (Page 3+)
    for page in content_reader.pages:
        # base_page = copy.deepcopy(template_reader.pages[0])
        # base_page.merge_page(page)
        writer.add_page(page)

    # Write final PDF
    output_buffer = io.BytesIO()
    writer.write(output_buffer)
    output_buffer.seek(0)
    
    result_bytes = output_buffer.getvalue()
    logger.info(f"PDF export complete: {len(writer.pages)} pages, {len(result_bytes)} bytes")
    
    return result_bytes

def _add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor('#666666')

    page_num_text = f"{doc.page}"
    canvas.drawRightString(
        doc.pagesize[0] - 1 * inch,   # right margin
        0.75 * inch,                  # footer height
        page_num_text
    )

    canvas.restoreState()


def _add_page_number_edit_content_pdf(canvas, doc):
    """
    Add page number at bottom of each content page for edit content PDF export.
    Content pages are merged after a single cover page, so display number as doc.page + 1.
    Use only in export_to_pdf_edit_content when building content pages.
    """
    canvas.saveState()
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor('#666666')
    page_num_text = f"{doc.page + 1}"
    canvas.drawRightString(
        doc.pagesize[0] - 1 * inch,
        0.75 * inch,
        page_num_text
    )
    canvas.restoreState()


def export_to_pdf_pwc_no_toc(
    content: str,
    title: str,
    subtitle: str | None = None,
    content_type: str | None = None,client: str | None = None

) -> bytes:
    """
    PwC PDF export WITHOUT Table of Contents.
    Uses same formatting as pdf-pwc-bullets.
    """
    if not os.path.exists(PWC_PDF_TEMPLATE_PATH):
        return _generate_pdf_with_title_subtitle(content, title, subtitle)
    logger.info(f"Generating PDF PwC no ToC for module: {title},{content_type}")
    
    # Reuse COVER creation logic from existing function
    pdf_bytes = export_to_pdf_with_pwc_template_with_bullets(
        content=content,
        title=title,
        subtitle=subtitle,
        include_toc=False
    )

    reader = PdfReader(io.BytesIO(pdf_bytes))
    writer = PdfWriter()
    writer.add_page(reader.pages[0])
    for page in reader.pages[1:]: 
        writer.add_page(page)
    buffer = io.BytesIO()
    writer.write(buffer)
    buffer.seek(0)
    return buffer.getvalue()

def build_cover_title(module: str, client: str | None) -> str:
    module_clean = re.sub(r'generate\s+', '', module, flags=re.IGNORECASE)
    module_clean = module_clean.replace("-", " ").title()
    if not client:
        return module_clean
    return f"{module_clean} on {client.title()}".strip()
    # module_clean = re.sub(r'[*#_`]+', '', module_clean).strip()  

    # if not clientname:
    #     return module_clean

    # return f"{module_clean} on {clientname}".strip()

def classify_block(block: str) -> str:
    """
    Returns one of:
    executive_takeaway
    bullet_heading
    heading_1
    heading_2
    bullet_list
    paragraph
    """
    if re.match(r'^\*\*Executive takeaway:\*\*', block, re.I):
        return "executive_takeaway"

    if re.match(r'^(\*.+\*|- .+)$', block):
        return "bullet_heading"

    if block.startswith("##"):
        return "heading_2"

    if block.startswith("#"):
        return "heading_1"

    if all(is_bullet_line(l) for l in block.split("\n")):
        return "bullet_list"

    return "paragraph"

def split_blocks(text: str) -> list[str]:
    """
    Split content into blocks with consistent normalization.
    
    Rules:
    - Normalize all newline types (\r\n, \r) to \n
    - Split on 2+ consecutive newlines
    - Strip each block
    - Remove empty blocks
    
    This prevents index drift from different newline handling across platforms.
    
    Args:
        text: Raw content string with possible mixed newlines
    
    Returns:
        List of non-empty, stripped content blocks
    """
    if not isinstance(text, str):
        text = str(text)
    
    # Normalize newlines: \r\n and \r become \n
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    
    # Split on 2+ newlines
    blocks = re.split(r"\n{2,}", text)
    
    # Strip and filter empty blocks
    return [b.strip() for b in blocks if b.strip()]


def html_to_marked_text(text: str) -> str:
    """Convert limited HTML to a simple markdown-like text we already support.

    Rules:
    - Decode HTML entities
    - Treat <p> as paragraph breaks and <br> as line breaks
    - Convert <strong>/<b> to **bold** markers (which existing formatters understand)
    - Convert <h1>-<h6> to markdown headings (#)
    - Convert <li> items to bullet format (- bullet)
    - Strip all other tags/attributes (like style="...")
    
    EDIT CONTENT ONLY: This function is specifically for converting HTML from
    formatFinalArticleWithBlockTypes() to plain text before backend processing.
    """
    if not isinstance(text, str):
        text = str(text)

    # Decode entities (&amp;, &nbsp; ...)
    text = unescape(text)

    # Convert headings to markdown: <h1>Text</h1> -> # Text
    text = re.sub(r"<h1[^>]*>([^<]+)</h1>", r"# \1", text, flags=re.IGNORECASE)
    text = re.sub(r"<h2[^>]*>([^<]+)</h2>", r"## \1", text, flags=re.IGNORECASE)
    text = re.sub(r"<h3[^>]*>([^<]+)</h3>", r"### \1", text, flags=re.IGNORECASE)
    text = re.sub(r"<h4[^>]*>([^<]+)</h4>", r"#### \1", text, flags=re.IGNORECASE)
    text = re.sub(r"<h5[^>]*>([^<]+)</h5>", r"##### \1", text, flags=re.IGNORECASE)
    text = re.sub(r"<h6[^>]*>([^<]+)</h6>", r"###### \1", text, flags=re.IGNORECASE)
    
    # Convert <ul> and <ol> lists to plain text
    # <li>content</li> -> - content (bullet format)
    text = re.sub(r"<li[^>]*>([^<]+)</li>", r"- \1", text, flags=re.IGNORECASE)
    text = re.sub(r"</?[ou]l[^>]*>", "", text, flags=re.IGNORECASE)  # Remove ul/ol tags

    # Paragraph and line breaks first so they survive tag stripping
    text = re.sub(r"</p\s*>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)

    # Convert bold tags to ** ** markers
    # Handle nested/overlapping conservatively by doing closing then opening
    text = re.sub(r"<\s*/\s*(strong|b)\s*>", "**", text, flags=re.IGNORECASE)
    text = re.sub(r"<\s*(strong|b)[^>]*>", "**", text, flags=re.IGNORECASE)
    
    # Convert italic tags to * * markers
    text = re.sub(r"<\s*/\s*(em|i)\s*>", "*", text, flags=re.IGNORECASE)
    text = re.sub(r"<\s*(em|i)[^>]*>", "*", text, flags=re.IGNORECASE)

    # Drop all remaining tags (div, span, p with style, etc.)
    text = re.sub(r"<[^>]+>", "", text)

    # Clean up excessive whitespace (but preserve intentional structure)
    # Multiple spaces -> single space (but not newlines)
    text = re.sub(r"[ \t]+", " ", text)
    # Multiple newlines (3+) -> double newline (paragraph break)
    text = re.sub(r"\n{3,}", "\n\n", text)
    
    return text.strip()
def parse_bullet(text: str) -> dict:
    """
    Parse bullet point structure consistently.
    
    Extracts:
    - number: int or None (e.g., 1, 2, 10 from "1.", "2.", "10)")
    - icon: str or None (bullet icon like "•", "-", "*")
    - label: str (bold text before colon, or first sentence)
    - body: str or None (text after colon, or remainder)
    
    This is the single source of truth for bullet semantics.
    Used by both Word and PDF export.
    
    Args:
        text: Raw bullet text (may include number/icon prefix)
    
    Returns:
        dict with keys: number, icon, label, body
    """
    text = text.strip()
    result = {
        "number": None,
        "icon": None,
        "label": "",
        "body": None
    }
    
    # Extract bullet icon first (•, -, *)
    icon_match = re.match(r'^([•\-\*])\s+', text)
    if icon_match:
        result["icon"] = icon_match.group(1)
        text = text[len(icon_match.group(0)):].strip()
    
    # Extract number prefix (1., 2., 10), etc.)
    number_match = re.match(r'^(\d+)[.)]\s+', text)
    if number_match:
        result["number"] = int(number_match.group(1))
        text = text[len(number_match.group(0)):].strip()
    
    # Extract label (before colon) and body (after colon)
    colon_idx = text.find(':')
    if colon_idx > 0:
        result["label"] = text[:colon_idx].strip()
        result["body"] = text[colon_idx + 1:].strip()
    else:
        result["label"] = text
    
    return result

def _format_content_with_block_types_word(doc: Document, content: str, block_types: list[dict] | None = None, use_bullet_icons_only: bool = False):
    """
    Format content in Word document using block type information.
    Applies formatting similar to frontend formatFinalArticleWithBlockTypes.
    Groups consecutive bullet items into lists, handles bullet icons, removes number prefixes.
    
    Content should be final_article format: plain text with "\n\n" separators.
    Uses split_blocks() to split content (same as final article processing).
    block_types should match final article generation structure with sequential indices.
    
    If use_bullet_icons_only is True, all lists (numbered, alphabetical, or bullet) use bullet icons (for edit content export).
    """
    if not block_types:
        # Fallback to default formatting
        for block in split_blocks(content):
            block = block.strip()
            if not block:
                continue
            if block.startswith("##"):
                p = doc.add_paragraph(style="Heading 2")
                p.add_run(sanitize_text_for_word(block.replace("##", "").strip())).bold = True
            elif block.startswith("#"):
                p = doc.add_paragraph(style="Heading 1")
                p.add_run(sanitize_text_for_word(block.replace("#", "").strip())).bold = True
            elif re.match(r'^\*\*(.+?)\*\*$', block):
                m = re.match(r'^\*\*(.+?)\*\*$', block)
                if m:
                    p = doc.add_paragraph(style="Heading 1")
                    p.add_run(sanitize_text_for_word(m.group(1))).bold = True
            else:
                lines = block.split("\n")
                if all(is_bullet_line(l) for l in lines):
                    for line in lines:
                        clean = re.sub(r'^\s*[-•]\s+', '', line).strip()
                        if clean:
                            para = doc.add_paragraph(style="List Bullet")
                            _add_markdown_text_runs(para, clean)
                else:
                    para = doc.add_paragraph(style="Body Text")
                    _add_markdown_text_runs(para, block)
        return
    
    # Use split_blocks() - same as final article processing
    # split_blocks() handles "\n\n" splitting (matches final_article format: "\n\n".join(final_paragraphs))
    paragraphs = split_blocks(content)
    
    # Create block type map - use index from block_types or fallback to position
    # block_types come from final article generation with sequential indices matching paragraphs
    # IMPORTANT: block_types have sequential indices (0, 1, 2, ...) that match paragraph positions
    block_type_map = {}
    for i, bt in enumerate(block_types):
        # Use the index from block_type if present, otherwise use enumeration index
        map_key = bt.get("index") if bt.get("index") is not None else i
        block_type_map[map_key] = bt
    
    # Citation line pattern (e.g. "1. ", "2. ") for splitting citation/reference blocks
    _citation_line_pattern_word = re.compile(r'^\s*\d+\.\s+')

    # First pass: process each paragraph with block type formatting
    formatted_blocks = []
    for idx, block in enumerate(paragraphs):
        block = block.strip()
        if not block:
            continue

        # Citation/reference block: split into one paragraph per line so each has its own line,
        # and merge split URLs ("https:\n//" -> "https://") so links are full and clickable (like PDF)
        lines_in_block = [ln.strip() for ln in block.split('\n') if ln.strip()]
        citation_line_count = sum(1 for ln in lines_in_block if _citation_line_pattern_word.match(ln))
        if len(lines_in_block) >= 2 and citation_line_count >= 2:
            # Merge URL continuations so "https:" on one line + "//url" on next -> "https://url"
            block_merged = re.sub(r'https:\s*\n\s*//', 'https://', block)
            lines_merged = [ln.strip() for ln in block_merged.split('\n') if ln.strip()]
            for line in lines_merged:
                formatted_blocks.append({
                    'type': 'paragraph',
                    'content': line,
                    'level': 0,
                    'raw_content': line
                })
            continue

        # Get block_info - use index from enumerate to match block_types indices
        # block_types indices are sequential (0, 1, 2, ...) matching paragraph positions
        block_info = block_type_map.get(idx)
        if not block_info:
            logger.warning(f"[Export Word] No block_type found for index {idx}, defaulting to paragraph")
            block_info = {"type": "paragraph", "level": 0, "index": idx}
        
        block_type = block_info.get("type")
        if not block_type or block_type == "":
            logger.warning(f"[Export Word] Empty block_type for index {idx}, defaulting to paragraph")
            block_type = "paragraph"
        level = block_info.get("level", 0)
        
        # Skip title blocks - title is already on cover page, don't duplicate in content
        if block_type == "title":
            continue
        
        # Process list items: detect type and preserve original order
        # Check if this is a list item (bullet, number, or alpha)
        # Always detect from content, even if block_type says "bullet_item"
        list_type, detected_level = _detect_list_type(block, level)
        
        # Use level from block_types first, fallback to detected level
        final_level = level if level > 0 else detected_level
        
        if list_type != 'none' or block_type == "bullet_item":
            # This is a list item (detected or from block_type)
            # If detected as 'none' but block_type is "bullet_item", treat as bullet
            if list_type == 'none' and block_type == "bullet_item":
                list_type = 'bullet'
            
            parsed = parse_bullet(block)
            formatted_blocks.append({
                'type': 'list_item',
                'list_type': list_type,
                'content': block,
                'level': final_level,
                'raw_content': block,
                'parsed': parsed
            })
        else:
            formatted_blocks.append({
                'type': block_type,
                'content': block,
                'level': level,
                'raw_content': block
            })
    
    # Second pass: group consecutive list items and apply formatting
    current_list = []
    prev_list_type = None
    prev_block_type = None
    
    for i, block_info in enumerate(formatted_blocks):
        block_type = block_info['type']
        content = block_info['content']
        level = block_info.get('level', 0)
        next_block = formatted_blocks[i + 1] if i + 1 < len(formatted_blocks) else None
        
        if block_type == 'list_item' or block_type == 'bullet_item':
            list_type = block_info.get('list_type', 'bullet')
            
            # Reset numbering if previous block was a heading
            reset_numbering = (prev_block_type == 'heading')
            
            # If previous block was heading, close current list (if any) and start new one with reset
            if reset_numbering and current_list:
                # Edit content: preserve final article order and numbers - no reorder, no re-number
                ordered_list = current_list
                if prev_list_type in ('number', 'alpha_upper', 'alpha_lower'):
                    _add_list_as_paragraphs_word(doc, ordered_list, prev_block_type, block_info)
                else:
                    _add_list_to_document(doc, ordered_list, prev_list_type, reset_numbering=False)
                current_list = []
            
            # Check if we should start a new list (different type or level)
            if current_list:
                first_item_level = current_list[0].get('level', 0)
                if prev_list_type != list_type or first_item_level != level:
                    # Close current list and start new one (preserve order - no reorder for edit content)
                    ordered_list = current_list
                    should_reset = current_list[0].get('_reset_numbering', False) if current_list else False
                    if prev_list_type in ('number', 'alpha_upper', 'alpha_lower'):
                        _add_list_as_paragraphs_word(doc, ordered_list, prev_block_type, block_info)
                    else:
                        _add_list_to_document(doc, ordered_list, prev_list_type, reset_numbering=should_reset)
                    current_list = []
            
            # Add to current list
            current_list.append(block_info)
            # Mark if this list should reset numbering (after heading)
            if reset_numbering and len(current_list) == 1:
                current_list[0]['_reset_numbering'] = True
            prev_list_type = list_type
            prev_block_type = 'list_item'
        else:
            # Close any open list before processing non-list block
            if current_list:
                ordered_list = current_list
                if prev_list_type in ('number', 'alpha_upper', 'alpha_lower'):
                    _add_list_as_paragraphs_word(doc, ordered_list, prev_block_type, next_block)
                else:
                    _add_list_to_document(doc, ordered_list, prev_list_type, reset_numbering=False)
                current_list = []
                prev_list_type = None
            
            # Process non-list blocks (title blocks already skipped in first pass)
            if block_type == "heading":
                # Remove heading numbers if present
                clean_content = re.sub(r'^\d+[.)]\s+', '', content).strip()
                
                # Heading: Based on level (Heading 1-6), bold, font-weight 600 equivalent
                heading_level = min(max(level, 1), 6)
                style_name = f"Heading {heading_level}"
                p = doc.add_paragraph(style=style_name)
                
                # Remove numbering from heading
                p.paragraph_format.left_indent = DocxInches(0)
                # Clear any numbering
                pPr = p._p.get_or_add_pPr()
                numPr = pPr.find(qn('w:numPr'))
                if numPr is not None:
                    pPr.remove(numPr)
                
                run = p.add_run(sanitize_text_for_word(clean_content))
                run.bold = True
                # Set spacing: margin-top: 0.9em equivalent, margin-bottom: 0.2em equivalent
                p.paragraph_format.space_before = DocxPt(11)  # ~0.9em
                p.paragraph_format.space_after = DocxPt(2)     # ~0.2em
            
            elif block_type == "paragraph":
                # Paragraph: proper spacing with Body Text style (matches PDF)
                para = doc.add_paragraph(style="Body Text")
                _add_markdown_text_runs(para, content)
                
                # Apply Body Text style configuration
                _apply_body_text_style_word(para)
                
                # Set spacing to match PDF exactly
                para.paragraph_format.space_before = DocxPt(2)   # ~0.15em (matches PDF spaceBefore=2)
                para.paragraph_format.space_after = DocxPt(8)    # ~0.7em (matches PDF spaceAfter=8)
                # Reduce spacing if followed by list (matches PDF)
                if next_block and (next_block.get('type') == 'list_item' or next_block.get('type') == 'bullet_item'):
                    para.paragraph_format.space_after = DocxPt(3)  # ~0.25em (matches PDF spaceAfter=3)
                # Reduce spacing if following heading (matches PDF)
                if prev_block_type == 'heading':
                    para.paragraph_format.space_before = DocxPt(0)  # Matches PDF spaceBefore=0
            
            prev_block_type = block_type
    
    # Close any remaining list (preserve order and numbers for edit content - no reorder)
    if current_list:
        ordered_list = current_list
        should_reset = current_list[0].get('_reset_numbering', False) if current_list else False
        if prev_list_type in ('number', 'alpha_upper', 'alpha_lower'):
            _add_list_as_paragraphs_word(doc, ordered_list, prev_block_type, None)
        else:
            _add_list_to_document(doc, ordered_list, prev_list_type, reset_numbering=should_reset, force_bullet_style=use_bullet_icons_only)

def export_to_word_edit_content(
    content: str,
    title: str,
    subtitle: str | None = None,
    references: list[dict] | None = None,
    block_types: list[dict] | None = None
) -> bytes:
    """
    PwC Word export specifically for Edit Content workflow.
    Uses block type information for proper formatting (title, heading, bullet_item, paragraph).
    Numbered and alphabetical lists (e.g. Citations and references) are rendered with numbers/letters; bullet lists use bullet icons.
    No Table of Contents is generated for edit content export.
    
    Content should be final_article format: plain text with "\n\n" separators (same as final article generation).
    block_types should match final article generation structure with sequential indices.
    """
    # Content should be plain text final_article (from backend final article generation)
    # Format: "\n\n".join(final_paragraphs) - same as final article generation
    # Safety check: convert HTML to plain text if somehow HTML is present
    if '<' in content and '>' in content:
        logger.warning("HTML detected in export content - converting to plain text. Content should be final_article (plain text).")
        content = html_to_marked_text(content)
    
    # Content and block_types come from backend final article generation - already aligned
    # split_blocks() handles "\n\n" splitting (same as final article processing)
    
    doc = Document(PWC_TEMPLATE_PATH) if os.path.exists(PWC_TEMPLATE_PATH) else Document()

    # ---------- Cover ----------
    clean_title = re.sub(r'\*+', '', title).strip()
    title_para = doc.paragraphs[0]
    _set_paragraph_text_with_breaks(title_para, sanitize_text_for_word(clean_title))

    # Remove footers and add page numbers only
    _set_footer_with_page_numbers_only(doc)
    
    
    # Apply PDF's dynamic font sizing logic (matches PDF exactly)
    title_font_size = 32  # Default
    if len(clean_title) > 80:
        title_font_size = 20
    elif len(clean_title) > 60:
        title_font_size = 22
    elif len(clean_title) > 40:
        title_font_size = 26
    
    # Set font size for all runs in the title paragraph
    for run in title_para.runs:
        run.font.size = DocxPt(title_font_size)
        run.bold = True
    
    # Set center alignment (matches PDF)
    title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # Set title style to "Page 1"
    try:
        title_para.style = "Page 1"
    except:
        # Fallback if style doesn't exist
        title_para.style = "Heading 1"
    _set_paragraph_text_with_breaks(doc.paragraphs[1], sanitize_text_for_word(subtitle or ""))

    # Remove everything after subtitle
    while len(doc.paragraphs) > 2:
        p = doc.paragraphs[-1]
        p._element.getparent().remove(p._element)

    _ensure_page_break_after_paragraph(doc.paragraphs[1])

    # ---------- Content with Block Types ----------
    references_heading_added = False
    
    # Check for references section
    if "references" in content.lower() or "references:" in content.lower():
        # Handle references separately
        parts = re.split(r'\n\n(?:references|references:)\s*\n\n', content, flags=re.IGNORECASE)
        main_content = parts[0] if parts else content
        
        _format_content_with_block_types_word(doc, main_content, block_types, use_bullet_icons_only=False)
        
        if len(parts) > 1:
            doc.add_paragraph("References", style="Heading 2")
            references_heading_added = True
            # Format references section
            _format_content_with_block_types_word(doc, parts[1], None, use_bullet_icons_only=False)
    else:
        _format_content_with_block_types_word(doc, content, block_types, use_bullet_icons_only=False)

    # ---------- References ----------
    if references:
        doc.add_page_break()
        if not references_heading_added:
            doc.add_paragraph("References", style="Heading 2")

        for idx, ref in enumerate(references, start=1):
            title_text = sanitize_text_for_word(ref.get("title", ""))
            para = doc.add_paragraph(style="Body Text")
            para.add_run(f"{idx}. {title_text}")
            if ref.get("url"):
                para.add_run(" ")
                url_norm = _normalize_citation_url_for_word(ref["url"])
                add_hyperlink(para, url_norm, url_norm)

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return _fix_docx_encoding(buffer.getvalue())

def _format_content_with_block_types_pdf(story: list, content: str, block_types: list[dict] | None = None, 
                                         body_style: ParagraphStyle = None, heading_style: ParagraphStyle = None,
                                         use_bullet_icons_only: bool = True):
    """
    Format content for PDF using block type information.
    Applies formatting similar to frontend formatFinalArticleWithBlockTypes.
    Groups consecutive bullet items, handles spacing, font sizes, and colors correctly.
    
    Content should be final_article format: plain text with "\n\n" separators.
    Uses split_blocks() to split content (same as final article processing).
    block_types should match final article generation structure with sequential indices.
    
    If use_bullet_icons_only is False (edit content export), numbered/alpha lists use numbers/letters; bullet lists use bullets.
    """
    from reportlab.lib.styles import getSampleStyleSheet
    styles = getSampleStyleSheet()
    
    if not body_style:
        body_style = ParagraphStyle(
            'PWCBody',
            parent=styles['BodyText'],
            fontSize=11,
            leading=16.5,  # 1.5 line spacing (11 * 1.5 = 16.5)
            alignment=TA_JUSTIFY,
            spaceAfter=6,  # Pre-set spacing
            spaceBefore=2,  # ~0.15em equivalent
            fontName='Helvetica'
        )
    
    if not heading_style:
        heading_style = ParagraphStyle(
            'PWCHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor='black',  # Changed from '#D04A02' (orange) to black
            spaceAfter=2,   # ~0.2em equivalent
            spaceBefore=11, # ~0.9em equivalent
            fontName='Helvetica-Bold'
        )
    
    # Title style (larger, bold, font-weight 700 equivalent)
    title_style = ParagraphStyle(
        'PWCTitle',
        parent=styles['Heading1'],
        fontSize=24,  # Larger than headings
        textColor='#D04A02',  # Orange color
        spaceAfter=4,   # ~0.35em equivalent
        spaceBefore=15, # ~1.25em equivalent
        fontName='Helvetica-Bold'
    )
    
    if not block_types:
        # Fallback to default formatting
        blocks = split_blocks(content)
        for block in blocks:
            if not block.strip():
                continue
            block = block.strip()
            
            if block.startswith('####'):
                text = block.replace('####', '').strip()
                text = _format_content_for_pdf(text)
                story.append(Paragraph(text, heading_style))
            elif block.startswith('###'):
                text = block.replace('###', '').strip()
                text = _format_content_for_pdf(text)
                story.append(Paragraph(text, heading_style))
            elif block.startswith('##'):
                text = block.replace('##', '').strip()
                text = _format_content_for_pdf(text)
                story.append(Paragraph(text, heading_style))
            elif block.startswith('#'):
                text = block.replace('#', '').strip()
                text = _format_content_for_pdf(text)
                story.append(Paragraph(text, heading_style))
            elif _is_bullet_list_block(block):
                bullet_items = _parse_bullet_items(block)
                list_items = [ListItem(Paragraph(_format_content_for_pdf(text), body_style)) for indent, text in bullet_items]
                story.append(
                    ListFlowable(
                        list_items,
                        bulletType='bullet',
                        bulletFontName='Helvetica',
                        bulletFontSize=11,
                        leftIndent=12,
                        bulletIndent=0,
                    )
                )
            else:
                para = Paragraph(_format_content_for_pdf(block), body_style)
                story.append(para)
        return
    
    # Use split_blocks() - same as final article processing
    # split_blocks() handles "\n\n" splitting (matches final_article format: "\n\n".join(final_paragraphs))
    paragraphs = split_blocks(content)
    
    # Create block type map - use index from block_types or fallback to position
    # IMPORTANT: block_types have sequential indices (0, 1, 2, ...) that match paragraph positions
    block_type_map = {}
    for i, bt in enumerate(block_types):
        # Use the index from block_type if present, otherwise use enumeration index
        map_key = bt.get("index") if bt.get("index") is not None else i
        block_type_map[map_key] = bt
    
    # Citation pattern: line starts with number and period (e.g. "1. ", "2. ")
    _citation_line_pattern = re.compile(r'^\s*\d+\.\s+')

    # First pass: process each paragraph with block type formatting
    formatted_blocks = []
    for idx, block in enumerate(paragraphs):
        block = block.strip()
        if not block:
            continue

        # If block has multiple lines that look like citations (1., 2., 3., ...),
        # split into one paragraph per line so each citation starts on its own line in PDF
        lines_in_block = [ln.strip() for ln in block.split('\n') if ln.strip()]
        citation_line_count = sum(1 for ln in lines_in_block if _citation_line_pattern.match(ln))
        if len(lines_in_block) >= 2 and citation_line_count >= 2:
            for line in lines_in_block:
                formatted_blocks.append({
                    'type': 'paragraph',
                    'content': line,
                    'level': 0,
                    'raw_content': line
                })
            continue

        # Get block_info - use index from enumerate to match block_types indices
        # block_types indices are sequential (0, 1, 2, ...) matching paragraph positions
        block_info = block_type_map.get(idx)
        if not block_info:
            block_info = {"type": "paragraph", "level": 0, "index": idx}
        
        # Get block_type - ensure it's not None or empty string
        block_type = block_info.get("type")
        if not block_type or block_type == "":
            block_type = "paragraph"
        level = block_info.get("level", 0)
        
        # Skip title blocks - title is already on cover page, don't duplicate in content
        if block_type == "title":
            continue
        
        # Process list items: detect type and preserve original order (same as Word)
        # Always detect from content, even if block_type says "bullet_item"
        list_type, detected_level = _detect_list_type(block, level)
        
        # Use level from block_types first, fallback to detected level
        final_level = level if level > 0 else detected_level
        
        if list_type != 'none' or block_type == "bullet_item":
            # This is a list item (detected or from block_type)
            # If detected as 'none' but block_type is "bullet_item", treat as bullet
            if list_type == 'none' and block_type == "bullet_item":
                list_type = 'bullet'
            
            parsed = parse_bullet(block)
            formatted_blocks.append({
                'type': 'list_item',
                'list_type': list_type,
                'content': block,
                'level': final_level,
                'raw_content': block,
                'parsed': parsed
            })
        else:
            formatted_blocks.append({
                'type': block_type,
                'content': block,
                'level': level,
                'raw_content': block
            })
    
    # Second pass: group consecutive list items and apply formatting (same as Word)
    current_list = []
    prev_list_type = None
    prev_block_type = None
    
    for i, block_info in enumerate(formatted_blocks):
        block_type = block_info['type']
        content = block_info['content']
        level = block_info.get('level', 0)
        next_block = formatted_blocks[i + 1] if i + 1 < len(formatted_blocks) else None
        
        if block_type == 'list_item' or block_type == 'bullet_item':
            list_type = block_info.get('list_type', 'bullet')
            
            # Reset numbering if previous block was a heading (same as Word)
            reset_numbering = (prev_block_type == 'heading')
            
            # If previous block was heading, close current list (if any) and start new one with reset
            if reset_numbering and current_list:
                # Edit content (use_bullet_icons_only=False): preserve order and numbers - no reorder, no re-number
                if not use_bullet_icons_only and prev_list_type in ('number', 'alpha_upper', 'alpha_lower'):
                    _add_list_as_paragraphs_pdf(story, current_list, body_style, prev_block_type, next_block)
                else:
                    ordered_list = _order_list_items(current_list, start_from=1)
                    _add_list_to_pdf(story, ordered_list, prev_list_type, body_style, prev_block_type, next_block, start_from=1, use_bullet_icons_only=use_bullet_icons_only)
                current_list = []
            
            # Check if we should start a new list (different type or level)
            if current_list:
                first_item_level = current_list[0].get('level', 0)
                if prev_list_type != list_type or first_item_level != level:
                    # Close current list and start new one
                    # Edit content: preserve order and numbers - no reorder, no re-number
                    if not use_bullet_icons_only and prev_list_type in ('number', 'alpha_upper', 'alpha_lower'):
                        _add_list_as_paragraphs_pdf(story, current_list, body_style, prev_block_type, next_block)
                    else:
                        should_reset = current_list[0].get('_reset_numbering', False) if current_list else False
                        start_from_val = 1 if should_reset else 1
                        ordered_list = _order_list_items(current_list, start_from=start_from_val)
                        _add_list_to_pdf(story, ordered_list, prev_list_type, body_style, prev_block_type, next_block, start_from=start_from_val, use_bullet_icons_only=use_bullet_icons_only)
                    current_list = []
            
            # Add to current list
            current_list.append(block_info)
            # Mark if this list should reset numbering (after heading) - same as Word
            if reset_numbering and len(current_list) == 1:
                current_list[0]['_reset_numbering'] = True
            prev_list_type = list_type
            prev_block_type = 'list_item'
        else:
            # Close any open list before processing non-list block
            if current_list:
                # Edit content: preserve order and numbers - no reorder, no re-number
                if not use_bullet_icons_only and prev_list_type in ('number', 'alpha_upper', 'alpha_lower'):
                    _add_list_as_paragraphs_pdf(story, current_list, body_style, prev_block_type, next_block)
                else:
                    should_reset = current_list[0].get('_reset_numbering', False) if current_list else False
                    start_from_val = 1 if should_reset or prev_block_type == 'heading' else 1
                    ordered_list = _order_list_items(current_list, start_from=start_from_val)
                    _add_list_to_pdf(story, ordered_list, prev_list_type, body_style, prev_block_type, next_block, start_from=start_from_val, use_bullet_icons_only=use_bullet_icons_only)
                current_list = []
                prev_list_type = None
            
            # Process non-bullet blocks
            # Title blocks already skipped in first pass, so they won't reach here
            if block_type == "heading":
                # Remove heading numbers if present
                clean_content = re.sub(r'^\d+[.)]\s+', '', content).strip()
                
                # Heading: Based on level, bold, black color, font-weight 600 equivalent
                text = _format_content_for_pdf(clean_content)
                # Adjust font size based on level (14pt base, decrease slightly for higher levels)
                heading_font_size = max(12, 14 - (level - 1))
                level_heading_style = ParagraphStyle(
                    f'PWCHeading{level}',
                    parent=heading_style,
                    fontSize=heading_font_size,
                    textColor='black',  # Changed from '#D04A02' (orange) to black
                    spaceAfter=2,   # ~0.2em
                    spaceBefore=11, # ~0.9em
                    fontName='Helvetica-Bold'
                )
                story.append(Paragraph(text, level_heading_style))
            
            elif block_type == "paragraph":
                # Paragraph: proper spacing
                para_style = ParagraphStyle(
                    'PWCBodyPara',
                    parent=body_style,
                    spaceAfter=8,   # ~0.7em
                    spaceBefore=2,  # ~0.15em
                )
                # Reduce spacing if followed by bullet list
                if next_block and next_block['type'] == 'bullet_item':
                    para_style.spaceAfter = 3  # ~0.25em
                # Reduce spacing if following heading
                if prev_block_type == 'heading':
                    para_style.spaceBefore = 0
                
                para = Paragraph(_format_content_for_pdf(content), para_style)
                story.append(para)
            
            prev_block_type = block_type
    
    # Close any remaining list (edit content: preserve order and numbers - no reorder, no re-number)
    if current_list:
        if not use_bullet_icons_only and prev_list_type in ('number', 'alpha_upper', 'alpha_lower'):
            _add_list_as_paragraphs_pdf(story, current_list, body_style, prev_block_type, None)
        else:
            ordered_list = _order_list_items(current_list, start_from=1)
            _add_list_to_pdf(story, ordered_list, prev_list_type, body_style, prev_block_type, None, start_from=1, use_bullet_icons_only=use_bullet_icons_only)

def export_to_pdf_edit_content(
    content: str,
    title: str,
    subtitle: str | None = None,
    block_types: list[dict] | None = None
) -> bytes:
    """
    PwC PDF export specifically for Edit Content workflow.
    Uses block type information for proper formatting (title, heading, bullet_item, paragraph).
    Numbered and alphabetical lists (e.g. Citations and references) are rendered with numbers/letters; bullet lists use bullet icons.
    No Table of Contents is generated for edit content export.
    
    Content should be final_article format: plain text with "\n\n" separators (same as final article generation).
    block_types should match final article generation structure with sequential indices.
    """
    # Content should be plain text final_article (from backend final article generation)
    # Format: "\n\n".join(final_paragraphs) - same as final article generation
    # Safety check: convert HTML to plain text if somehow HTML is present
    if '<' in content and '>' in content:
        logger.warning("HTML detected in export content - converting to plain text. Content should be final_article (plain text).")
        content = html_to_marked_text(content)
    
    # Content and block_types come from backend final article generation - already aligned
    # split_blocks() handles "\n\n" splitting (same as final article processing)
    
    if not os.path.exists(PWC_PDF_TEMPLATE_PATH):
        return _generate_pdf_with_title_subtitle(content, title, subtitle)

    # ===== STEP 1: Create branded cover page =====
    from reportlab.pdfgen import canvas
    
    template_reader = PdfReader(PWC_PDF_TEMPLATE_PATH)
    template_page = template_reader.pages[0]
    
    page_width = float(template_page.mediabox.width)
    page_height = float(template_page.mediabox.height)
    
    # Create overlay with text
    overlay_buffer = io.BytesIO()
    c = canvas.Canvas(overlay_buffer, pagesize=(page_width, page_height))
    
    # Add title
    title_font_size = 32
    if len(title) > 80:
        title_font_size = 20
    elif len(title) > 60:
        title_font_size = 22
    elif len(title) > 40:
        title_font_size = 26
    
    c.setFont("Helvetica-Bold", title_font_size)
    c.setFillColor('#000000')
    title_y = page_height * 0.72
    
    max_title_width = page_width * 0.70
    char_width_at_font = (title_font_size / 20.0) * 10
    max_chars_per_line = int(max_title_width / char_width_at_font)
    max_chars_per_line = max(20, min(max_chars_per_line, 50))
    
    words = title.split()
    lines = []
    current_line = []
    
    for word in words:
        test_line = ' '.join(current_line + [word])
        if len(test_line) > max_chars_per_line:
            if current_line:
                lines.append(' '.join(current_line))
            current_line = [word]
        else:
            current_line.append(word)
    
    if current_line:
        lines.append(' '.join(current_line))
    
    if len(lines) > 1:
        line_height = title_font_size + 6
        start_y = title_y + (len(lines) - 1) * line_height / 2
        for i, line in enumerate(lines):
            c.drawCentredString(page_width / 2, start_y - (i * line_height), line)
    else:
        c.drawCentredString(page_width / 2, title_y, title)
    
    # Do not add subtitle for edit content PDF export (requirement)
    
    c.save()
    overlay_buffer.seek(0)
    
    # Merge overlay with template
    overlay_reader = PdfReader(overlay_buffer)
    overlay_page = overlay_reader.pages[0]
    template_page.merge_page(overlay_page)
    
    # ===== STEP 2: Create content pages with block types =====
    content_buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        content_buffer,
        pagesize=(page_width, page_height),
        topMargin=1*inch,
        bottomMargin=1*inch,
        leftMargin=1.1*inch,
        rightMargin=1*inch
    )
    
    styles = getSampleStyleSheet()
    
    body_style = ParagraphStyle(
        'PWCBody',
        parent=styles['BodyText'],
        fontSize=11,
        leading=16.5,  # 1.5 line spacing (11 * 1.5 = 16.5)
        alignment=TA_JUSTIFY,
        spaceAfter=6,  # Pre-set spacing
        spaceBefore=2,  # ~0.15em equivalent
        fontName='Helvetica'
    )
    
    heading_style = ParagraphStyle(
        'PWCHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor='black',  # Changed from '#D04A02' (orange) to black
        spaceAfter=2,   # ~0.2em equivalent
        spaceBefore=11, # ~0.9em equivalent
        fontName='Helvetica-Bold'
    )
    
    story = []
    _format_content_with_block_types_pdf(story, content, block_types, body_style, heading_style, use_bullet_icons_only=False)
    
    # Build the content PDF with page numbers at bottom (edit content only)
    doc.build(
        story,
        onFirstPage=_add_page_number_edit_content_pdf,
        onLaterPages=_add_page_number_edit_content_pdf
    )
    content_buffer.seek(0)
    
    # ===== STEP 3: Merge cover + content =====
    content_reader = PdfReader(content_buffer)
    writer = PdfWriter()
    
    # Add the branded cover page (Page 1)
    writer.add_page(template_page)
    logger.info("Added branded cover page")
    
    # Add all content pages (Page 2+)
    for page_num in range(len(content_reader.pages)):
        logger.info(f"Adding content page {page_num + 1}")
        writer.add_page(content_reader.pages[page_num])
    
    # Write final PDF
    output_buffer = io.BytesIO()
    writer.write(output_buffer)
    output_buffer.seek(0)
    
    result_bytes = output_buffer.getvalue()
    logger.info(f"PDF export complete: {len(writer.pages)} pages, {len(result_bytes)} bytes")
    
    return result_bytes

# ======================================

def _format_content_for_pdf_mi(text: str) -> str:
    """
    Format content for PDF by converting markdown-style formatting to HTML-like tags.
    Reportlab supports a subset of HTML/XML tags for styling.
    
    Converts:
    - **bold** to <b>bold</b>
    - *italic* to <i>italic</i>
    - [text](url) to <a href="url" color="blue">text</a>
    - https?://... to <a href="url" color="blue">url</a>
    - Normalizes all Unicode dash variants to standard hyphen for reliable PDF rendering
    """
    if not text:
        return text
    # text = re.sub(
    #     r'\[(\d+)\]\((https?://[^)]+)\)',
    #     r'<super><a href="\2">\1</a></super>',
    #     text
    # )
    text = re.sub(
    r'\[(\d+)\]\((https?://[^)]+)\)',
    r'<a href="\2"><super>[\1]</super></a>',
    text
)

    # First, handle special quotation marks and other problematic characters BEFORE processing HTML
    # This ensures they are replaced before being wrapped in HTML tags
    text = text.replace('\u201C', '"')  # Left double quotation mark
    text = text.replace('\u201D', '"')  # Right double quotation mark
    text = text.replace('\u2018', "'")  # Left single quotation mark
    text = text.replace('\u2019', "'")  # Right single quotation mark
    text = text.replace('\u2026', '...')  # Ellipsis
    text = text.replace('\u00AD', '')
    # Normalize stray bullet/square characters sometimes used as hyphens
    text = text.replace('■', '-')   # U+25A0
    text = text.replace('▪', '-')   # U+25AA
    text = text.replace('●', '-')   # U+25CF
    text = text.replace('•', '-')   # U+2022

    # Normalize all Unicode dash/hyphen variants to standard ASCII hyphen-minus (-)
    # This prevents ReportLab rendering issues with special Unicode characters
    # Must be done BEFORE HTML processing to avoid encoding issues

    # dash_variants = [
    #     '\u2010',  # Hyphen
    #     '\u2011',  # Non-breaking hyphen
    #     '\u2012',  # Figure dash
    #     '\u2013',  # En dash (–)
    #     '\u2014',  # Em dash (—)
    #     '\u2015',  # Horizontal bar
    #     '\u2212',  # Minus sign
    #     '\u058A',  # Armenian hyphen
    #     '\u05BE',  # Hebrew maqaf
    #     '\u1400',  # Canadian syllabics hyphen
    #     '\u1806',  # Mongolian todo soft hyphen
    #     '\u2E17',  # Double oblique hyphen
    #     '\u30A0',  # Katakana-hiragana double hyphen
    #     '\uFE58',  # Small em dash
    #     '\uFE63',  # Small hyphen-minus
    #     '\uFF0D',  # Fullwidth hyphen-minus
    # ]

    dash_variants = [
    # ASCII lookalikes / invisible troublemakers
    '\u00AD',  # Soft hyphen (invisible)

    # Unicode dash punctuation (Pd)
    '\u2010',  # Hyphen
    '\u2011',  # Non-breaking hyphen
    '\u2012',  # Figure dash
    '\u2013',  # En dash
    '\u2014',  # Em dash
    '\u2015',  # Horizontal bar
    '\u2E3A',  # Two-em dash
    '\u2E3B',  # Three-em dash
    '\u2E17',  # Double oblique hyphen

    # Mathematical minus
    '\u2212',  # Minus sign

    # Script-specific hyphens
    '\u058A',  # Armenian hyphen
    '\u05BE',  # Hebrew maqaf
    '\u1400',  # Canadian syllabics hyphen
    '\u1806',  # Mongolian todo soft hyphen
    '\u30A0',  # Katakana-hiragana double hyphen

    # Bullets / symbols sometimes misused as hyphens
    '\u2043',  # Hyphen bullet

    # Compatibility / presentation forms
    '\uFE58',  # Small em dash
    '\uFE63',  # Small hyphen-minus
    '\uFF0D',  # Fullwidth hyphen-minus
]

    for dash in dash_variants:
        text = text.replace(dash, '-')
    # =====SUPERSCRIPTS =====
    text = re.sub(r"\^(\d+)", r"<super>\1</super>", text)
    # ===== END SUPERSCRIPTS =====
    # Convert markdown links [text](url) to <a href="url" color="blue">text</a>
    text = re.sub(r'\[([^\]]+?)\]\(([^)]+?)\)', r'<a href="\2" color="blue">\1</a>', text)
    
    # Convert plain URLs to clickable links (but not those already inside HTML tags)
    # Match URLs that are not inside href= attributes or already converted
    # text = re.sub(r'(?<![="])(?<![a-zA-Z])(?<!href)(https?://[^\s)>\]]+)', r'<a href="\1" color="blue">\1</a>', text)
    text = re.sub(
    r'(?<!href=")(https?://[^\s)>\]]+)',
    r'<a href="\1" color="blue">\1</a>',
    text
    )

    # Convert **bold** to <b>bold</b>
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    
    # Convert *italic* to <i>italic</i> (but not if it's part of **bold** or at line start for bullets)
    # Use negative lookbehind/lookahead to avoid double-processing
    text = re.sub(r'(?<!\*)\*([^\*]+?)\*(?!\*)', r'<i>\1</i>', text)
    
    return text

def remove_paragraph_borders(paragraph):
    pPr = paragraph._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    for edge in ("top", "left", "bottom", "right", "between"):
        elem = OxmlElement(f"w:{edge}")
        elem.set(qn("w:val"), "nil")
        pBdr.append(elem)
    pPr.append(pBdr)

def export_to_word_pwc_no_toc(
    content: str,
    title: str,
    subtitle: str | None = None
) -> bytes:
    # 1. Load PwC template
    doc = Document(PWC_TEMPLATE_PATH) if os.path.exists(PWC_TEMPLATE_PATH) else Document()
    # ---- REMOVE ALL FOOTERS (PwC template cleanup) ----
    for section in doc.sections:
        footer = section.footer
        footer.is_linked_to_previous = False

        for p in footer.paragraphs:
            p.text = ""

        for table in footer.tables:
            for row in table.rows:
                for cell in row.cells:
                    cell.text = ""
    
    for section in doc.sections:
        footer = section.footer

        p = footer.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT

        run = p.add_run()

        fldChar1 = OxmlElement('w:fldChar')
        fldChar1.set(qn('w:fldCharType'), 'begin')

        instrText = OxmlElement('w:instrText')
        instrText.text = 'PAGE'

        fldChar2 = OxmlElement('w:fldChar')
        fldChar2.set(qn('w:fldCharType'), 'end')

        run._r.append(fldChar1)
        run._r.append(instrText)
        run._r.append(fldChar2)
    logger.info(f">>>TITLE AND SUBTITLE:{title}>>>>{subtitle}")
    _set_paragraph_text_with_breaks(doc.paragraphs[1], sanitize_text_for_word(subtitle or ""))
    # 2. Cover page (CLEAN)
    clean_title = re.sub(r'^[#\s]*', '', re.sub(r"\*+", "", title)).strip()
    if doc.paragraphs:
        doc.paragraphs[0].text = clean_title

    # REMOVE subtitle placeholder completely
    if len(doc.paragraphs) > 1:
        doc.paragraphs[1].text = ""
    logger.info(f">>>TITLE>>>>>>>>>>>:{clean_title}")
    
    while len(doc.paragraphs) > 2:
        p = doc.paragraphs[-1]
        p._element.getparent().remove(p._element)

    # Single page break after cover
    doc.add_page_break()
    # 3. Render generated content properly
    content = normalize_headings(content)
    # for raw_line in content.split("\n"):
    for raw_line in re.split(r"\n\s*\n", content):
        original_line = raw_line
        raw_line = re.sub(r"\*+", "", raw_line)
        line = raw_line.strip()
        # for line in raw_line.splitlines():
        if "|" in raw_line and "\n" in raw_line:
            rows = [
                r.strip()
                for r in raw_line.splitlines()
                if "|" in r and not re.match(r'^\s*\|?\s*-{3,}', r)
            ]

            if len(rows) < 2:
                continue
            table_data = [
                [re.sub(r"\*+", "", cell).strip()
                for cell in row.strip("|").split("|")]
                for row in rows
            ]

            table = doc.add_table(rows=len(table_data), cols=len(table_data[0]))
            table.autofit = True
            for i, row in enumerate(table_data):
                for j, cell in enumerate(row):
                    table.cell(i, j).text = cell

            doc.add_paragraph("", style="Body Text")
            continue            
        if re.match(r'^\s*\|?\s*-{3,}\s*\|?\s*$', raw_line):
            continue
        if (
            "style:" in line.lower()
            or line.lower().endswith("style")
            or line.lower() in {...}
        ):
            continue
        if re.fullmatch(r"\s*-{3,}\s*", raw_line):
            continue
        if raw_line.strip().startswith("|---"):
            continue
        # ---------- Headings ----------
        first_line = original_line.lstrip().splitlines()[0]
        # ---------- Handle bullet links under citation headings ----------
        # if first_line.lstrip().startswith(("###", "##")) and "-" in original_line:
            # for sub in original_line.splitlines()[1:]:
            #     sub = sub.strip()
            #     if sub.startswith("- http"):
            #         p = doc.add_paragraph(style="List Bullet")
            #         url = sub.lstrip("- ").strip()
            #         add_hyperlink_mi(p, url, url, bold=False)

        if first_line.lstrip().startswith("###"):
        # if original_line.lstrip().startswith("###"):
            # text = re.sub(r"^#+\s*", "", original_line)
            text = re.sub(r"^#+\s*", "", first_line)
            p = doc.add_heading(text.strip(), level=3)
            for run in p.runs:
                run.bold = True
                
            for sub in original_line.splitlines()[1:]:
                sub = sub.strip()
                # if sub.startswith("-"):
                if sub.lstrip().startswith("-"):

                    url = sub.lstrip("- ").strip()
                    if re.match(r'^(https?://|www\.)', url):
                # if sub.startswith("- http"):
                        bp = doc.add_paragraph(style="List Bullet")
                        # url = sub.lstrip("- ").strip()
                        add_hyperlink_mi(bp, url, url, bold=False)

            continue
        elif first_line.startswith("##"):
        # elif original_line.lstrip().startswith("##"):
            # text = re.sub(r"^#+\s*", "", original_line)
            text = re.sub(r"^#+\s*", "", first_line)
            p = doc.add_heading(text.strip(), level=2)
            for run in p.runs:
                run.bold = True
            for sub in original_line.splitlines()[1:]:
                sub = sub.strip()
                # if sub.startswith("-"):
                if sub.lstrip().startswith("-"):

                    url = sub.lstrip("- ").strip()
                    if re.match(r'^(https?://|www\.)', url):
                # if sub.startswith("- http"):
                        bp = doc.add_paragraph(style="List Bullet")
                        # url = sub.lstrip("- ").strip()
                        add_hyperlink_mi(bp, url, url, bold=False)

            continue
        elif first_line.startswith("#"):
        # elif original_line.lstrip().startswith("#"):
            # text = re.sub(r"^#+\s*", "", original_line)
            text = re.sub(r"^#+\s*", "", first_line)
            p = doc.add_heading(text.strip(), level=1)
            for run in p.runs:
                run.bold = True
            continue
           
        # Skip template style explanation text completely
        # REMOVE PwC style explanation content completely
        # REMOVE ALL PwC template / style description junk (pages 2–4 root cause)
        # logger.info(f"[LINE CHECK] RAW='{raw_line}' | LINE='{line}'")

        if (
            "style:" in line.lower()
            or line.lower().endswith("style")
            or line.lower() in {
                "heading 1 style",
                "heading 2 style",
                "heading 3 style",
                "heading 4 style",
                "chart header",
                "table header",
                "table text",
                "caption",
                "quote",
                "hyperlink followed hyperlink",
                "“",
                "”",
            }
            
            # or line.startswith(("•", "–"))
            # or (line.startswith(("•", "–")) and "http" not in line)
            or (line.startswith(("•", "–")) and not re.search(r'https?://', line, re.I))

        ):   
            # logger.warning(f"[SKIPPED] '{line}'")
            continue
       
        # logger.info(f"[HYPERLINK PARSE] '{line}'")

        if not line:
            continue  # avoid empty paragraphs → extra pages
        # if not first_line.lstrip().startswith("#"):
        line = re.sub(r"^#+\s*", "", line)
       
        # elif raw_line.lstrip().startswith(("-", "*")):
        handled_bullet = False
        lines = raw_line.splitlines()

        # FIRST line → bullet
        first = lines[0]
        # if first.lstrip().startswith(("•", "- ", "* ")):
        if re.match(r"^[\s•\-*]", first):

            handled_bullet = True
            text = re.sub(r'^[\s•–-]+', '', first).strip()

            p = doc.add_paragraph(style="List Bullet")
            p.paragraph_format.keep_together = True

            # clean = re.sub(r"\*+", "", text)
            # if ":" in clean:
            #     head, rest = clean.split(":", 1)
            #     r1 = p.add_run(head.strip() + ": ")
            #     r1.bold = True
            #     p.add_run(rest.strip())
            # else:
            #     p.add_run(clean)
            
            raw = text.strip()
            # FULLY bold bullet (matches UI)
            if re.match(r"^\*\*.+\*\*$", raw):
                run = p.add_run(re.sub(r"\*\*", "", raw))
                run.bold = True

            else:
                clean = re.sub(r"\*+", "", raw)
                if ":" in clean:
                    head, rest = clean.split(":", 1)
                    r1 = p.add_run(head.strip() + ": ")
                    r1.bold = True
                    p.add_run(rest.strip())
                else:
                    p.add_run(clean)

            # 🔑 render remaining lines normally
            for extra in lines[1:]:
                extra = extra.strip()
                if not extra:
                    continue
                bp = doc.add_paragraph("", style="Body Text")
                # tokens = re.split(r'(https?://[^\s]+)', extra + " ")
                tokens = re.split(r'((?:https?://)?(?:www\.)?\S+\.\S+)', extra + " ")

                for token in tokens:
                    # if token.startswith("http"):
                    # if re.match(r'^(https?://|www\.)', token):
                    if re.match(r'^(https?://|www\.|/)', token):
                        add_hyperlink_mi(bp, token, token, bold=False)
                    else:
                        bp.add_run(token)
        #  SAFETY: render any leftover non-empty lines
        # remaining = lines[1:]
        # for r in remaining:
        #     if r.strip():
        #         p = doc.add_paragraph(r.strip(), style="Body Text")
        # if handled_bullet:
        if handled_bullet and len(lines) == 1:
        # if handled_bullet and "http" not in raw_line:
        # if handled_bullet and not re.search(r'https?://', raw_line, re.I):
            continue

       

        # ---------- Citations / References ----------
        if re.match(r'^\s*(\[\d+\]|\d+\.)\s+', line):
            p = doc.add_paragraph(style="List Bullet")
            p.paragraph_format.keep_together = True

            # tokens = re.split(r'(https?://[^\s]+)', line + " ")
            # tokens = re.split(r'(https?://\S+)', line)
            tokens = re.split(r'((?:https?://)?(?:www\.)?\S+\.\S+)', line)


            for token in tokens:
                # if token.startswith("http"):
                if re.match(r'^(https?://|www\.)', token):

                    add_hyperlink_mi(p, token, token, bold=False)
                else:
                    p.add_run(token)

            remove_paragraph_borders(p)
            continue

        # ---------- Normal body text ----------
        else:
            p = doc.add_paragraph("", style="Body Text")
            # is_reference = bool(re.match(r'^(\[\d+\]|\d+\.)', line.strip()))
            is_reference = bool(
                re.match(r'^(\[\d+\]|\d+\.)', line.strip())
                or line.strip().startswith("http")
            )
            line = re.sub(r'^[\s•–-]+', '', line)
            # tokens = re.split(r'(https?://[^\s]+)', line)
            # tokens = re.split(r'(https?://[^\s]+)', line + " ")
            # tokens = [line]
            # tokens = re.split(r'(https?://[^\s]+)', line + " ")
            # tokens = re.split(r'(https?://\S+)', line)
            tokens = re.split(r'((?:https?://)?(?:www\.)?\S+\.\S+)', line)

            for token in tokens:
                # if token.startswith("http://") or token.startswith("https://"):
                # if re.match(r"https?://", token):
                # if token.startswith("http"):
                if re.match(r'^(https?://|www\.)', token):

                    add_hyperlink_mi(p, token, token,bold=not is_reference)
                else:
                    subparts = [token]
                    for sub in subparts:
                        parts = re.split(r"(\[\d+\]\([^)]+\))", sub)

                        for part in parts:
                            m = re.match(r"\[(\d+)\]\(([^)]+)\)", part)
                            if m:
                                num, url = m.groups()
                                add_superscript_hyperlink(p, f"[{num}]", url)
                            else:
                                p.add_run(part)

            remove_paragraph_borders(p)
    # 4. Save exactly like before
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return _fix_docx_encoding(buffer.getvalue())

def normalize_headings(content: str) -> str:
    lines = content.splitlines()
    out = []

    for line in lines:
        l = line.strip()

        # Convert numbered bold headings → markdown heading
        if re.match(r"^\*\*\d+\.\s+.+\*\*$", l):
            text = re.sub(r"^\*\*|\*\*$", "", l)
            text = re.sub(r"^\d+\.\s*", "", text)
            out.append(f"### {text}")
            continue
        # Bold-only headings (UI h3)
        if re.match(r"^\*\*[^*].+[^*]\*\*$", l):
            text = re.sub(r"^\*\*|\*\*$", "", l)
            out.append(f"### {text}")
            continue
        
        # Convert numbered plain headings
        if re.match(r"^\d+\.\s+[A-Z].+", l):
            text = re.sub(r"^\d+\.\s*", "", l)
            out.append(f"### {text}")
            continue

        out.append(line)

    return "\n".join(out)


import copy
from csv import writer
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, PageBreak, Flowable, ListFlowable, ListItem, KeepTogether
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_CENTER
from reportlab.lib import colors
import docx
from docx import Document
from docx.shared import Pt as DocxPt, Inches as DocxInches, RGBColor as DocxRGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from pypdf import PdfReader, PdfWriter
from html import unescape
import io
import logging
import os
import re
import zipfile
import itertools
import tempfile
from typing import List, Dict, Optional
from xml.etree import ElementTree as ET
from io import BytesIO
from docx.enum.text import WD_ALIGN_PARAGRAPH
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(BASE_DIR, "..", "assets", "fonts")

pdfmetrics.registerFont(TTFont("DejaVu",os.path.join(FONT_DIR,  "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("DejaVu-Bold",  os.path.join(FONT_DIR,"DejaVuSans-Bold.ttf")))

# Path to PwC templates
PWC_TEMPLATE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))),"app","features","thought_leadership","template", "pwc_doc_template_2025.docx")
PWC_PDF_TEMPLATE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))),"app","features","thought_leadership","template", "pwc_pdf_template_2025.pdf")


def _get_existing_pwc_pdf_template_path() -> str:
    """
    Resolve the PwC PDF template path across common runtime layouts.

    In some deployments the repo is installed as a package (site-packages/app/..),
    while in others it runs from the checked-out source tree. This helper checks a
    small set of likely locations and returns the first hit. If none are present,
    it raises so callers can surface a clear error instead of silently falling
    back to the unbranded PDF.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    candidates = [
        # Standard relative path from this module (source tree or editable install)
        os.path.join(base_dir, "app", "features", "thought_leadership", "template", "pwc_pdf_template_2025.pdf"),
        # If the module is under site-packages/app/, the templates may sit alongside the package
        os.path.join(base_dir, "features", "thought_leadership", "template", "pwc_pdf_template_2025.pdf"),
        # Fallback to current working directory (useful in packaged container layouts)
        os.path.join(os.getcwd(), "app", "features", "thought_leadership", "template", "pwc_pdf_template_2025.pdf"),
    ]

    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate

    logger.error("PwC PDF template not found. Checked: %s", " | ".join(candidates))
    raise FileNotFoundError("PwC PDF template (pwc_pdf_template_2025.pdf) is missing")

_bookmark_counter = itertools.count(1)

def sanitize_text_for_word(text: str) -> str:
    """
    Sanitize text for Word export by ensuring all Unicode characters are properly encoded.
    This fixes encoding issues with special characters like em dashes, smart quotes, etc.
    """
    if not isinstance(text, str):
        text = str(text)
    
    # Ensure the text is valid Unicode
    try:
        # Normalize unicode (NFKC normalization handles most compatibility issues)
        text = text.encode('utf-8', errors='replace').decode('utf-8', errors='replace')
    except Exception as e:
        logger.warning(f"Error sanitizing text: {e}, using as-is")
    
    return text


def _fix_docx_encoding(buffer_bytes: bytes) -> bytes:
    """
    Fix DOCX encoding issues by re-serializing XML with proper UTF-8 encoding.
    This ensures all Unicode characters are properly handled in the Word document.
    """
    try:
        # Work with the bytes directly without temp file to avoid locking issues
        import io as io_module
        
        # Read the DOCX (which is a ZIP) directly from bytes
        try:
            input_zip = io_module.BytesIO(buffer_bytes)
            file_contents = {}
            
            with zipfile.ZipFile(input_zip, 'r') as zip_read:
                # Extract all files
                for name in zip_read.namelist():
                    try:
                        file_contents[name] = zip_read.read(name)
                    except Exception as e:
                        logger.warning(f"Could not read {name} from ZIP: {e}")
                        continue
            
            # Re-create the DOCX with proper UTF-8 encoding
            output_buffer = io_module.BytesIO()
            with zipfile.ZipFile(output_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_write:
                for name, content in file_contents.items():
                    # For XML files, ensure proper encoding
                    if name.endswith('.xml'):
                        try:
                            # Try to parse and re-serialize to ensure UTF-8
                            tree = ET.fromstring(content)
                            # Convert back to string with UTF-8 encoding
                            xml_str = ET.tostring(tree, encoding='unicode')
                            # Prepend XML declaration with UTF-8 encoding if not present
                            if not xml_str.startswith('<?xml'):
                                xml_str = '<?xml version="1.0" encoding="UTF-8"?>' + xml_str
                            content = xml_str.encode('utf-8')
                        except ET.ParseError as e:
                            logger.warning(f"Could not parse XML {name}: {e}, keeping original bytes")
                        except Exception as e:
                            logger.warning(f"Could not re-encode {name}: {e}, keeping original")
                    
                    try:
                        zip_write.writestr(name, content)
                    except Exception as e:
                        logger.warning(f"Could not write {name} to ZIP: {e}")
                        continue
            
            result = output_buffer.getvalue()
            logger.info(f"[_fix_docx_encoding] Successfully re-encoded DOCX with UTF-8, size: {len(result)} bytes")
            return result
        
        except Exception as e:
            logger.warning(f"[_fix_docx_encoding] Error during ZIP processing: {e}, returning original")
            return buffer_bytes
    
    except Exception as e:
        logger.warning(f"[_fix_docx_encoding] Failed to fix DOCX encoding: {e}, returning original")
        return buffer_bytes

def extract_subtitle_from_content(content: str) -> tuple[str, str]:
    """
    Extract subtitle from the first line of content.
    Returns (subtitle, remaining_content)
    
    The first non-empty line (after any markdown heading markers) becomes the subtitle,
    and the rest becomes the content.
    """
    lines = content.strip().split('\n')
    
    if not lines:
        return "", content
    
    # Get first non-empty line
    first_line = ""
    remaining_lines = []
    found_first = False
    
    for line in lines:
        stripped = line.strip()
        if not found_first and stripped:
            # Remove markdown heading markers from first line if present
            first_line = re.sub(r'^#+\s*', '', stripped)
            # Remove bold markers (both paired and stray **)
            first_line = re.sub(r'\*\*(.+?)\*\*', r'\1', first_line)
            # Remove any remaining stray ** characters
            first_line = first_line.replace('**', '')
            found_first = True
        elif found_first:
            remaining_lines.append(line)
    
    # Reconstruct remaining content
    remaining_content = '\n'.join(remaining_lines).strip()
    
    return first_line, remaining_content

def _apply_body_text_style_word(para):
    """
    Apply PwC Body Text style to a Word paragraph.
    Font size: 11pt, Line spacing: 1.5 lines, Space After pre-set.
    """
    para.paragraph_format.space_after = DocxPt(6)  # Pre-set spacing
    if para.runs:
        para.runs[0].font.size = DocxPt(11)
    para.paragraph_format.line_spacing = 1.5

def _detect_list_type(line: str, level: int = 0) -> tuple[str, int]:
    """
    Detect list type from a line of content.
    Returns: (list_type, detected_level)
    list_type: 'bullet', 'number', 'alpha_upper', 'alpha_lower', 'none'
    detected_level: 0 for first level, 1+ for nested (based on indentation)
    """
    line_stripped = line.strip()
    if not line_stripped:
        return 'none', 0
    
    # Check for numbered list (1., 2., 3., etc.)
    number_match = re.match(r'^(\d+)\.\s+(.*)', line_stripped)
    if number_match:
        # Check indentation for nesting level
        indent_level = (len(line) - len(line.lstrip())) // 4  # Approximate: 4 spaces = 1 level
        return 'number', max(0, indent_level)
    
    # Check for uppercase alphabetical list (A., B., C., etc.)
    alpha_upper_match = re.match(r'^([A-Z])\.\s+(.*)', line_stripped)
    if alpha_upper_match:
        indent_level = (len(line) - len(line.lstrip())) // 4
        return 'alpha_upper', max(0, indent_level)
    
    # Check for lowercase alphabetical list (a., b., c., etc.)
    alpha_lower_match = re.match(r'^([a-z])\.\s+(.*)', line_stripped)
    if alpha_lower_match:
        indent_level = (len(line) - len(line.lstrip())) // 4
        return 'alpha_lower', max(0, indent_level)
    
    # Check for bullet list (•, -, *, etc.)
    bullet_match = re.match(r'^[•\-\*]\s+(.*)', line_stripped)
    if bullet_match:
        indent_level = (len(line) - len(line.lstrip())) // 4
        return 'bullet', max(0, indent_level)
    
    return 'none', 0

def _numbering_root(numbering_part):
    """Get the numbering XML root; use public .element (cloud/compat) or fallback to ._numbering."""
    return getattr(numbering_part, 'element', None) or getattr(numbering_part, '_numbering', None)

def _get_next_abstract_num_id(numbering_part):
    """Get the next available abstract numbering ID by finding the maximum existing ID."""
    root = _numbering_root(numbering_part)
    if root is None:
        return 1
    max_id = 0
    for abstract_num in root.findall(qn('w:abstractNum')):
        abstract_num_id_attr = abstract_num.get(qn('w:abstractNumId'))
        if abstract_num_id_attr:
            try:
                max_id = max(max_id, int(abstract_num_id_attr))
            except (ValueError, TypeError):
                pass
    return max_id + 1

def _get_next_num_id(numbering_part):
    """Get the next available numbering ID by finding the maximum existing ID."""
    root = _numbering_root(numbering_part)
    if root is None:
        return 1
    max_id = 0
    for num in root.findall(qn('w:num')):
        num_id_attr = num.get(qn('w:numId'))
        if num_id_attr:
            try:
                max_id = max(max_id, int(num_id_attr))
            except (ValueError, TypeError):
                pass
    return max_id + 1

def _create_new_numbering_instance(doc: Document, list_type: str, level: int = 0):
    """
    Create a new numbering instance for Word lists to reset numbering.
    Returns the num_id to use for the list.
    """
    numbering_part = doc.part.numbering_part
    
    # Create a new abstract numbering definition
    abstract_num_id = _get_next_abstract_num_id(numbering_part)
    
    abstract_num = OxmlElement("w:abstractNum")
    abstract_num.set(qn("w:abstractNumId"), str(abstract_num_id))
    
    lvl = OxmlElement("w:lvl")
    lvl.set(qn("w:ilvl"), str(level))
    
    start = OxmlElement("w:start")
    start.set(qn("w:val"), "1")  # Always start from 1
    
    lvl_restart = OxmlElement("w:lvlRestart")
    lvl_restart.set(qn("w:val"), "1")
    
    num_fmt = OxmlElement("w:numFmt")
    if list_type == 'number':
        num_fmt.set(qn("w:val"), "decimal")
        lvl_text = OxmlElement("w:lvlText")
        lvl_text.set(qn("w:val"), "%1.")
    elif list_type == 'alpha_upper':
        num_fmt.set(qn("w:val"), "upperLetter")
        lvl_text = OxmlElement("w:lvlText")
        lvl_text.set(qn("w:val"), "%1.")
    elif list_type == 'alpha_lower':
        num_fmt.set(qn("w:val"), "lowerLetter")
        lvl_text = OxmlElement("w:lvlText")
        lvl_text.set(qn("w:val"), "%1.")
    else:
        # Bullet list
        num_fmt.set(qn("w:val"), "bullet")
        lvl_text = OxmlElement("w:lvlText")
        lvl_text.set(qn("w:val"), "•")
    
    lvl.extend([start, lvl_restart, num_fmt, lvl_text])
    abstract_num.append(lvl)
    root = _numbering_root(numbering_part)
    if root is not None:
        root.append(abstract_num)
    
    # Create a new numbering instance
    num_id = _get_next_num_id(numbering_part)
    
    num = OxmlElement("w:num")
    num.set(qn("w:numId"), str(num_id))
    
    abstract_ref = OxmlElement("w:abstractNumId")
    abstract_ref.set(qn("w:val"), str(abstract_num_id))
    
    num.append(abstract_ref)
    if root is not None:
        root.append(num)
    
    return num_id

def _add_list_to_document(doc: Document, list_items: list[dict], list_type: str, reset_numbering: bool = False, force_bullet_style: bool = False):
    """
    Add a list of items to Word document with appropriate style based on type and level.
    If reset_numbering is True, creates a new numbering instance to reset numbering to 1.
    For edit content export: always create a new numbering instance per list (numbered/alpha)
    so each list shows 1, 2, 3... matching frontend; avoids "1111" or "678" continuation.
    If force_bullet_style is True, all lists use bullet icons regardless of list_type (for edit content export).
    """
    if not list_items:
        return
    
    # If forcing bullet style, treat all lists as bullets (for edit content export)
    if force_bullet_style:
        list_type = 'bullet'
    
    # Create new numbering instance for every numbered/alpha list so each list (first or after heading)
    # gets its own 1, 2, 3... matching frontend; do not rely on template or reset_numbering only.
    num_id = None
    if list_type in ['number', 'alpha_upper', 'alpha_lower']:
        num_id = _create_new_numbering_instance(doc, list_type, 0)
    
    # Match URL with or without brackets: stop at ] or whitespace so [https://...] works as clickable link
    url_pattern = re.compile(r'(https?://[^\s\]]+)')
    for item in list_items:
        content = item.get('content', '')
        level = item.get('level', 0)
        parsed = item.get('parsed', parse_bullet(content))
        # Determine style based on list type and level
        if list_type == 'bullet':
            style_name = "List Bullet 2" if level >= 1 else "List Bullet"
        elif list_type == 'number':
            style_name = "List Number 2" if level >= 1 else "List Number"
        elif list_type == 'alpha_upper':
            style_name = "List Alpha 2" if level >= 1 else "List Alpha"
        elif list_type == 'alpha_lower':
            style_name = "List Alpha 2" if level >= 1 else "List Alpha"
        else:
            style_name = "List Bullet" if level == 0 else "List Bullet 2"
        try:
            para = doc.add_paragraph(style=style_name)
        except:
            para = doc.add_paragraph(style="List Bullet")
        if num_id is not None:
            pPr = para._p.get_or_add_pPr()
            numPr = OxmlElement("w:numPr")
            ilvl = OxmlElement("w:ilvl")
            ilvl.set(qn("w:val"), str(level))
            numId_elem = OxmlElement("w:numId")
            numId_elem.set(qn("w:val"), str(num_id))
            numPr.extend([ilvl, numId_elem])
            pPr.append(numPr)
        _apply_body_text_style_word(para)
        clean_content = content
        if force_bullet_style:
            clean_content = re.sub(r'^\d+\.\s+', '', content.strip())
            clean_content = re.sub(r'^[A-Za-z]\.\s+', '', clean_content.strip())
            clean_content = re.sub(r'^[•\-\*]\s+', '', clean_content.strip())
        elif list_type == 'number':
            clean_content = re.sub(r'^\d+\.\s+', '', content.strip())
        elif list_type in ['alpha_upper', 'alpha_lower']:
            clean_content = re.sub(r'^[A-Za-z]\.\s+', '', content.strip())
        elif list_type == 'bullet':
            clean_content = re.sub(r'^[•\-\*]\s+', '', content.strip())
        # If the content contains a URL, add as hyperlink (use add_hyperlink for clickable links)
        match = url_pattern.search(clean_content)
        if match:
            url = match.group(1)
            before_url = clean_content.split(url)[0].strip()
            after_url = clean_content.split(url)[1].strip() if len(clean_content.split(url)) > 1 else ""
            if before_url:
                para.add_run(sanitize_text_for_word(before_url) + " ")
            url_norm = _normalize_citation_url_for_word(url)
            add_hyperlink(para, url_norm, sanitize_text_for_word(url) or url, no_break=True, doc=doc)
            # Ensure there is a run after the hyperlink (Word/Word Online often need this for link to be clickable)
            if after_url:
                para.add_run(" " + sanitize_text_for_word(after_url))
            else:
                para.add_run(" ")
        elif parsed.get('label') and parsed.get('body'):
            run = para.add_run(sanitize_text_for_word(parsed['label']))
            run.bold = True
            para.add_run(f": {sanitize_text_for_word(parsed['body'])}")
        else:
            _add_markdown_text_runs(para, clean_content)

def _add_list_to_pdf(story: list, list_items: list[dict], list_type: str, body_style: ParagraphStyle, 
                     prev_block_type: str = None, next_block: dict = None, start_from: int = 1, use_bullet_icons_only: bool = True):
    """
    Add a list of items to PDF story.
    If use_bullet_icons_only is True (default), all lists use bullet icons (legacy behavior).
    If use_bullet_icons_only is False (edit content): numbered/alpha lists render as paragraphs
    with the exact number/letter from the final article (no ListFlowable), so PDF matches
    final article format and avoids wrong "1111" numbering; bullet lists use ListFlowable.
    """
    if not list_items:
        return
    
    from reportlab.platypus import ListFlowable, ListItem, Spacer
    
    # Determine spacing (same as PDF current logic)
    space_before = 3 if prev_block_type == 'paragraph' else 6
    space_after = 3 if next_block and next_block.get('type') == 'paragraph' else 6
    left_indent = 24  # 2em equivalent

    # Edit content: numbered/alpha lists use final article numbers (no ListFlowable)
    # so PDF shows exactly 1, 2, 3 / A, B, C as in the response (avoids "1111" default)
    use_final_article_numbers = (
        not use_bullet_icons_only
        and list_type in ['number', 'alpha_upper', 'alpha_lower']
    )

    if use_final_article_numbers:
        list_para_style = ParagraphStyle(
            'ListPara',
            parent=body_style,
            leftIndent=left_indent,
            spaceBefore=0,
            spaceAfter=4,
        )
        story.append(Spacer(1, space_before))
        url_pattern = re.compile(r'(https?://\S+)')
        for item in list_items:
            content = item.get('content', '')
            # Keep exact final article line (number/letter + text) so PDF matches response
            text_to_format = content.strip()
            formatted_text = _format_content_for_pdf(text_to_format)
            match = url_pattern.search(text_to_format)
            if match:
                url = match.group(1)
                formatted_text = formatted_text.replace(url, f'<a href="{url}">{url}</a>')
            story.append(Paragraph(formatted_text, list_para_style))
        story.append(Spacer(1, space_after))
        return

    # Bullet lists or legacy: use ListFlowable; strip prefix (list styling adds bullets)
    pdf_list_items = []
    url_pattern = re.compile(r'(https?://\S+)')
    for item in list_items:
        content = item.get('content', '')
        level = item.get('level', 0)
        parsed = item.get('parsed', parse_bullet(content))
        clean_content = content
        if list_type == 'number':
            clean_content = re.sub(r'^\d+\.\s+', '', content.strip())
        elif list_type in ['alpha_upper', 'alpha_lower']:
            clean_content = re.sub(r'^[A-Za-z]\.\s+', '', content.strip())
        elif list_type == 'bullet':
            clean_content = re.sub(r'^[•\-\*]\s+', '', content.strip())

        match = url_pattern.search(clean_content)
        if match:
            url = match.group(1)
            if clean_content.strip() == url:
                formatted_text = f'<a href="{url}">{url}</a>'
            else:
                formatted_text = _format_content_for_pdf(clean_content).replace(url, f'<a href="{url}">{url}</a>')
        elif parsed.get('label') and parsed.get('body'):
            formatted_text = f"<b>{_format_content_for_pdf(parsed['label'])}</b>: {_format_content_for_pdf(parsed['body'])}"
        else:
            formatted_text = _format_content_for_pdf(clean_content)
        pdf_list_items.append(ListItem(Paragraph(formatted_text, body_style)))

    pdf_bullet_type = 'bullet' if use_bullet_icons_only else (
        '1' if list_type == 'number' else ('A' if list_type == 'alpha_upper' else ('a' if list_type == 'alpha_lower' else 'bullet'))
    )
    story.append(
        ListFlowable(
            pdf_list_items,
            bulletType=pdf_bullet_type,
            bulletFontName='Helvetica',
            bulletFontSize=11,
            leftIndent=left_indent,
            bulletIndent=0,
            spaceBefore=space_before,
            spaceAfter=space_after,
        )
    )

def _order_list_items(items: list[dict], start_from: int = 1) -> list[dict]:
    """
    Order list items correctly if they are numbered or alphabetical.
    For numbered lists: ensure 1, 2, 3... sequence starting from start_from
    For alphabetical lists: ensure A, B, C... or a, b, c... sequence starting from start_from
    For bullets: preserve original order (no sorting)
    Returns ordered list of items.
    """
    if not items:
        return items
    
    # Determine list type from first item
    first_item = items[0]
    list_type = first_item.get('list_type', 'bullet')  # Default to bullet if not set
    
    if list_type == 'number':
        # Extract numbers and check if ordering is needed
        numbers = []
        for item in items:
            content = item.get('content', '')
            number_match = re.match(r'^(\d+)\.\s+', content.strip())
            if number_match:
                numbers.append(int(number_match.group(1)))
            else:
                numbers.append(0)
        
        # Check if already in order and starting from correct number
        is_ordered = all(numbers[i] <= numbers[i+1] for i in range(len(numbers)-1))
        starts_correctly = numbers[0] == start_from if numbers else True
        
        if not is_ordered or not starts_correctly:
            # Re-order by number if needed
            if not is_ordered:
                sorted_items = sorted(zip(numbers, items), key=lambda x: x[0])
            else:
                sorted_items = list(zip(numbers, items))
            
            # Re-number sequentially starting from start_from
            ordered_items = []
            for idx, (_, item) in enumerate(sorted_items, start=start_from):
                content = item.get('content', '')
                # Replace number with sequential number
                new_content = re.sub(r'^\d+\.\s+', f'{idx}. ', content.strip())
                new_item = item.copy()
                new_item['content'] = new_content
                ordered_items.append(new_item)
            return ordered_items
    
    elif list_type in ['alpha_upper', 'alpha_lower']:
        # Extract letters and check if ordering is needed
        letters = []
        for item in items:
            content = item.get('content', '')
            alpha_match = re.match(r'^([A-Za-z])\.\s+', content.strip())
            if alpha_match:
                letter = alpha_match.group(1)
                # Convert letter to number for comparison
                if list_type == 'alpha_upper':
                    letter_num = ord(letter.upper()) - ord('A') + 1
                else:
                    letter_num = ord(letter.lower()) - ord('a') + 1
                letters.append(letter_num)
            else:
                letters.append(0)
        
        # Check if already in order and starting from correct letter
        is_ordered = all(letters[i] <= letters[i+1] for i in range(len(letters)-1))
        expected_start_letter_num = start_from
        starts_correctly = letters[0] == expected_start_letter_num if letters else True
        
        if not is_ordered or not starts_correctly:
            # Re-order by letter if needed
            if not is_ordered:
                sorted_items = sorted(zip(letters, items), key=lambda x: x[0])
            else:
                sorted_items = list(zip(letters, items))
            
            # Re-letter sequentially starting from start_from
            ordered_items = []
            for idx, (_, item) in enumerate(sorted_items, start=start_from):
                content = item.get('content', '')
                # Calculate letter based on index
                if list_type == 'alpha_upper':
                    letter = chr(ord('A') + (idx - 1) % 26)
                else:
                    letter = chr(ord('a') + (idx - 1) % 26)
                # Replace letter with sequential letter
                new_content = re.sub(r'^[A-Za-z]\.\s+', f'{letter}. ', content.strip())
                new_item = item.copy()
                new_item['content'] = new_content
                ordered_items.append(new_item)
            return ordered_items
    
    # For bullets or already ordered lists, return as-is
    return items

def export_to_pdf(content: str, title: str = "Document") -> bytes:
    """Export content to PDF format"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    
    story = []
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor='#D04A02',
        spaceAfter=30,
        alignment=TA_LEFT
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=11,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceAfter=12
    )
    heading1_style = ParagraphStyle(
    'Heading1Bold',
    parent=styles['Heading1'],
    fontSize=16,
    leading=18,
    spaceAfter=12,
    alignment=TA_LEFT,
    textColor='black',
    fontName='Helvetica-Bold'
    )

    heading2_style = ParagraphStyle(
        'Heading2Bold',
        parent=styles['Heading2'],
        fontSize=14,
        leading=16,
        spaceAfter=10,
        alignment=TA_LEFT,
        textColor='black',
        fontName='Helvetica-Bold'
    )

    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 0.2 * inch))
    
    paragraphs = content.split('\n\n')
    for para in paragraphs:
        p = para.strip()
        if not p:
            continue
        bold_heading_match = re.match(r'^\*\*(.+?)\*\*$', p)
        if bold_heading_match:
            text = bold_heading_match.group(1).strip()
            # Format and normalize text before rendering
            text = _format_content_for_pdf(text)
            story.append(Paragraph(f"<b>{text}</b>", heading1_style))
            continue

        # Check for bullet lists and render real bullets
        if _is_bullet_list_block(p):
            bullet_items = _parse_bullet_items(p)
            list_items = [ListItem(Paragraph(_format_content_for_pdf(text), body_style)) for indent, text in bullet_items]
            story.append(
                ListFlowable(
                    list_items,
                    bulletType='bullet',
                    bulletFontName='Helvetica',
                    bulletFontSize=11,
                    leftIndent=12,
                    bulletIndent=0,
                )
            )
            continue

        if p.startswith("## "):
            text = p.replace("##", "").strip()
            # Remove ** markers if present
            text = text.replace("**", "")
            # Format and normalize text for PDF rendering
            text = _format_content_for_pdf(text)
            story.append(Paragraph(text, heading2_style))
        elif p.startswith("# "):
            text = p.replace("#", "").strip()
            # Remove ** markers if present
            text = text.replace("**", "")
            # Format and normalize text for PDF rendering
            text = _format_content_for_pdf(text)
            story.append(Paragraph(text, heading1_style))
        else:
            # Intelligently split long paragraphs into smaller chunks
            sentence_count = len(re.findall(r'[.!?]', p))
            if sentence_count > 3:
                # This is a long paragraph, split it into smaller chunks (2-3 sentences each)
                split_paragraphs = _split_paragraph_into_sentences(p, target_sentences=3)
                for split_para in split_paragraphs:
                    if split_para:
                        # Use _format_content_for_pdf for consistent formatting and normalization
                        p_html = _format_content_for_pdf(split_para)
                        story.append(Paragraph(p_html, body_style))
            else:
               # Keep short paragraphs as is, but format for PDF rendering
                p_html = _format_content_for_pdf(p)
                story.append(Paragraph(p_html, body_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def export_to_pdf_with_pwc_template(content: str, title: str = "Document", subtitle: str = "", content_type: Optional[str] = None) -> bytes:
    """
    Export content to PDF format with PWC branded cover page.
    
    VALIDATED with test_branded_pdf.py - This function properly creates:
    1. A branded cover page by overlaying title/subtitle on PWC template
    2. Formatted content pages
    3. Final PDF: Cover (with logo) + Content Pages (with conditional TOC)
    
    Args:
        content: The main content to export (starts from page 2)
        title: Document title (displays on cover page with logo)
        subtitle: Optional subtitle (displays on cover page)
        content_type: Type of content (article, whitepaper, executive-brief, blog)
                     If 'blog' or 'executive_brief', Table of Contents is skipped
    
    Returns:
        Bytes of the final PDF document with cover + TOC (if applicable) + content
    """
    try:
        from reportlab.pdfgen import canvas
        
        logger.info("Creating PWC branded PDF with title, subtitle, and content")
        
        template_path = _get_existing_pwc_pdf_template_path()
        
        # ===== STEP 1: Create branded cover page =====
        logger.info("Step 1: Creating branded cover page")
        
        template_reader = PdfReader(template_path)
        template_page = template_reader.pages[0]
        
        page_width = float(template_page.mediabox.width)
        page_height = float(template_page.mediabox.height)
        
        logger.info(f"Template page size: {page_width:.1f} x {page_height:.1f} points")
        
        # Create overlay with text
        overlay_buffer = io.BytesIO()
        c = canvas.Canvas(overlay_buffer, pagesize=(page_width, page_height))
        
        # Add title
        title_font_size = 32
        if len(title) > 80:
            title_font_size = 20
        elif len(title) > 60:
            title_font_size = 22
        elif len(title) > 40:
            title_font_size = 26
        
        c.setFont("Helvetica-Bold", title_font_size)
        c.setFillColor('#000000')  # Black color
        title_y = page_height * 0.72
        
        # Handle multi-line titles with better word wrapping
        # Maximum width for title (leaving margins on left and right)
        max_title_width = page_width * 0.70  # 70% of page width with margins
        
        # Better character width estimation - more conservative to avoid cutoff
        # Estimate pixels needed per character based on font size
        # At 20pt Helvetica: ~10 pixels per character average
        char_width_at_font = (title_font_size / 20.0) * 10
        max_chars_per_line = int(max_title_width / char_width_at_font)
        
        # Ensure reasonable minimum and maximum
        max_chars_per_line = max(20, min(max_chars_per_line, 50))
        
        words = title.split()
        lines = []
        current_line = []
        
        for word in words:
            test_line = ' '.join(current_line + [word])
            # Use calculated character limit
            if len(test_line) > max_chars_per_line:
                if current_line:
                    lines.append(' '.join(current_line))
                current_line = [word]
            else:
                current_line.append(word)
        
        if current_line:
            lines.append(' '.join(current_line))
        
        # Draw multi-line title
        if len(lines) > 1:
            line_height = title_font_size + 6
            # Center vertically: start higher if multiple lines
            start_y = title_y + (len(lines) - 1) * line_height / 2
            for i, line in enumerate(lines):
                c.drawCentredString(page_width / 2, start_y - (i * line_height), line)
            last_title_y = start_y - (len(lines) * line_height)
        else:
            c.drawCentredString(page_width / 2, title_y, title)
            last_title_y = title_y
        
        logger.info(f"Title added to overlay: {title} ({len(lines)} lines)")
        
        # Add subtitle if provided
        if subtitle:
            # Clean up markdown asterisks from subtitle
            subtitle_clean = subtitle.replace('**', '')
            
            c.setFont("Helvetica-Bold", 14)  # Bold font
            c.setFillColor('#000000')  # Black color
            subtitle_y = last_title_y - 70
            
            # Wrap subtitle text to fit within page width
            # Use a more conservative character limit for subtitle
            # Page width is typically 612 points (8.5 inches) for letter size
            # Helvetica 14pt: approximately 7-8 pixels per character
            max_subtitle_width = page_width * 0.75  # 75% of page width with margins
            subtitle_char_width = 8  # pixels per character at 14pt
            max_chars_per_line = int(max_subtitle_width / subtitle_char_width)
            
            words = subtitle_clean.split()
            lines = []
            current_line = []
            
            for word in words:
                test_line = ' '.join(current_line + [word])
                # Use more conservative line breaking - shorter lines for better visibility
                if len(test_line) > min(50, max_chars_per_line):
                    if current_line:
                        lines.append(' '.join(current_line))
                    current_line = [word]
                else:
                    current_line.append(word)
            
            if current_line:
                lines.append(' '.join(current_line))
            
            # Draw multi-line subtitle with proper centering
            line_height = 22
            # If multiple lines, center vertically
            if len(lines) > 1:
                start_y = subtitle_y + (len(lines) - 1) * line_height / 2
            else:
                start_y = subtitle_y
            
            for i, line in enumerate(lines):
                c.drawCentredString(page_width / 2, start_y - (i * line_height), line)
            
            logger.info(f"Subtitle added to overlay: {subtitle} ({len(lines)} lines)")
        
        c.save()
        overlay_buffer.seek(0)
        
        # Merge overlay with template
        overlay_reader = PdfReader(overlay_buffer)
        overlay_page = overlay_reader.pages[0]
        
        template_page.merge_page(overlay_page)
        logger.info("Overlay merged onto template cover page")
        
        # ===== STEP 2: Create content pages =====
        logger.info("Step 2: Creating formatted content pages")
        
        # First, extract all headings for Table of Contents
        headings = []
        blocks = content.split('\n')
        for block in blocks:
            if not block.strip():
                continue
            block = block.strip()
            
            # Check for various heading formats
            standalone_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*$', block)
            if standalone_bold_match:
                text = standalone_bold_match.group(1).strip()
                # Remove leading numbers like "1. ", "5.1. ", etc.
                text = re.sub(r'^\d+(\.\d+)*\.?\s*', '', text).strip()
                headings.append(text)
                continue
            
            first_line_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*\n', block)
            if first_line_bold_match:
                text = first_line_bold_match.group(1).strip()
                # Remove leading numbers like "1. ", "5.1. ", etc.
                text = re.sub(r'^\d+(\.\d+)*\.?\s*', '', text).strip()
                headings.append(text)
                continue
            
            # Markdown headings
            if block.startswith('#'):
                text = re.sub(r'^#+\s*', '', block.split('\n')[0]).strip()
                # Remove ** markers if present
                text = text.replace('**', '').strip()
                # Remove leading numbers like "1. ", "5.1. ", etc.
                text = re.sub(r'^\d+(\.\d+)*\.?\s*', '', text).strip()
                headings.append(text)
        
        logger.info(f"Extracted {len(headings)} headings for Table of Contents")
        
        content_buffer = io.BytesIO()
        doc = SimpleDocTemplate(content_buffer, pagesize=letter, topMargin=1*inch, bottomMargin=1*inch)
        styles = getSampleStyleSheet()
        
        # Define custom styles
        body_style = ParagraphStyle(
            'PWCBody',
            parent=styles['BodyText'],
            fontSize=11,
            leading=15,
            alignment=TA_JUSTIFY,
            spaceAfter=12,
            fontName='Helvetica'
        )
        
        heading_style = ParagraphStyle(
            'PWCHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor='#D04A02',
            spaceAfter=10,
            spaceBefore=10,
            fontName='Helvetica-Bold'
        )
        
        # Citation style with left alignment (no justify to avoid extra spaces)
        citation_style = ParagraphStyle(
            'PWCCitation',
            parent=styles['BodyText'],
            fontSize=11,
            leading=15,
            alignment=TA_LEFT,
            spaceAfter=12,
            fontName='Helvetica'
        )
        
        story = []
        
        # Parse and add content with formatting
        blocks = content.split('\n\n')
        for block in blocks:
            if not block.strip():
                continue
            
            # Skip separator lines (---, ---, etc.)
            if re.fullmatch(r'\s*-{3,}\s*', block):
                continue
            
            block = block.strip()
            
            # Check for headings (bold text on its own line or markdown style)
            standalone_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*$', block)
            if standalone_bold_match:
                heading_text = standalone_bold_match.group(1).strip()
                story.append(Paragraph(heading_text, heading_style))
                continue
            
            # Check for bold text at start of paragraph
            first_line_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*\n', block)
            if first_line_bold_match:
                heading_text = first_line_bold_match.group(1).strip()
                remaining_content = block[first_line_bold_match.end():].strip()
                # Format and normalize heading text
                heading_text = _format_content_for_pdf(heading_text)
                story.append(Paragraph(heading_text, heading_style))
                if remaining_content:
                    # Check if remaining content is a bullet list
                    if _is_bullet_list_block(remaining_content):
                        bullet_items = _parse_bullet_items(remaining_content)
                        list_items = [ListItem(Paragraph(_format_content_for_pdf(text), body_style)) for indent, text in bullet_items]
                        story.append(
                            ListFlowable(
                                list_items,
                                bulletType='bullet',
                                bulletFontName='Helvetica',
                                bulletFontSize=11,
                                leftIndent=12,
                                bulletIndent=0,
                            )
                        )
                    else:
                        para = Paragraph(_format_content_for_pdf(remaining_content), body_style)
                        story.append(para)
                continue
            
            # Check for markdown headings
            if block.startswith('####'):
                text = block.replace('####', '').strip()
                # Remove ** markers if present
                text = text.replace('**', '')
                # Format and normalize text for PDF rendering
                text = _format_content_for_pdf(text)
                story.append(Paragraph(text, heading_style))
                continue
            elif block.startswith('###'):
                text = block.replace('###', '').strip()
                # Remove ** markers if present
                text = text.replace('**', '')
                # Format and normalize text for PDF rendering
                text = _format_content_for_pdf(text)
                story.append(Paragraph(text, heading_style))
                continue
            elif block.startswith('##'):
                text = block.replace('##', '').strip()
                # Remove ** markers if present
                text = text.replace('**', '')
                # Format and normalize text for PDF rendering
                text = _format_content_for_pdf(text)
                story.append(Paragraph(text, heading_style))
                continue
            elif block.startswith('#'):
                text = block.replace('#', '').strip()
                # Remove ** markers if present
                text = text.replace('**', '')
                # Format and normalize text for PDF rendering
                text = _format_content_for_pdf(text)
                story.append(Paragraph(text, heading_style))
                continue
            
            # Check if block is a bullet list
            if _is_bullet_list_block(block):
                bullet_items = _parse_bullet_items(block)
                list_items = [ListItem(Paragraph(_format_content_for_pdf(text), body_style)) for indent, text in bullet_items]
                story.append(
                    ListFlowable(
                        list_items,
                        bulletType='bullet',
                        bulletFontName='Helvetica',
                        bulletFontSize=11,
                        leftIndent=12,
                        bulletIndent=0,
                    )
                )
                continue
            
            # Check if block contains multiple lines with citation patterns
            # Citations typically look like: [1] text or 1. text
            lines = block.split('\n')
            if len(lines) > 1:
                # Check if this looks like a citation/reference block
                citation_pattern = r'^\s*(\[\d+\]|\d+\.)\s+'
                citation_count = sum(1 for line in lines if re.match(citation_pattern, line.strip()))
                
                # If at least 2 lines match citation pattern, treat as citation block
                if citation_count >= 2:
                    # Process each line separately with left alignment (no justify)
                    for line in lines:
                        line_stripped = line.strip()
                        if line_stripped:
                            para = Paragraph(_format_content_for_pdf(line_stripped), citation_style)
                            story.append(para)
                    continue
            
            # Regular paragraph - intelligently split long paragraphs into smaller chunks
            sentence_count = len(re.findall(r'[.!?]', block))
            if sentence_count > 3:
                # This is a long paragraph, split it into smaller chunks (2-3 sentences each)
                split_paragraphs = _split_paragraph_into_sentences(block, target_sentences=3)
                for split_para in split_paragraphs:
                    if split_para:
                        para = Paragraph(_format_content_for_pdf(split_para), body_style)
                        story.append(para)
            else:
                # Keep short paragraphs as is
                para = Paragraph(_format_content_for_pdf(block), body_style)
                story.append(para)
        
        # Build the content PDF
        doc.build(story)
        content_buffer.seek(0)
        
        # ===== STEP 2.5: Create Table of Contents pages (multi-page support) - CONDITIONAL =====
        # Only generate TOC for Article and White Paper, skip for Blog and Executive Brief
        should_add_toc = content_type and content_type.lower() not in ['blog', 'executive_brief', 'executive-brief']
        toc_pages = []
        
        if headings and should_add_toc:
            logger.info(f"Step 2.5: Creating Table of Contents pages for content_type: {content_type}")
            toc_buffer = io.BytesIO()
            toc_doc = SimpleDocTemplate(toc_buffer, pagesize=(page_width, page_height), topMargin=1*inch, bottomMargin=1*inch)
            toc_styles = getSampleStyleSheet()
            toc_title_style = ParagraphStyle(
                'TOCTitle',
                parent=toc_styles['Heading1'],
                fontSize=24,
                textColor='#000000',
                spaceAfter=24,
                alignment=TA_LEFT,
                fontName='Helvetica-Bold'
            )
            toc_heading_style = ParagraphStyle(
                'TOCHeading',
                parent=toc_styles['BodyText'],
                fontSize=11,
                textColor='#000000',
                spaceAfter=12,
                alignment=TA_LEFT,
                fontName='Helvetica',
                leading=16,
                rightIndent=20
            )
            toc_story = []
            toc_story.append(Paragraph("Contents", toc_title_style))
            toc_story.append(Spacer(1, 0.2 * inch))
            for index, heading in enumerate(headings, start=1):
                # Add serial number before heading (ReportLab will handle text wrapping automatically)
                # Format and normalize heading text to handle dashes properly
                formatted_heading = _format_content_for_pdf(heading)
                toc_story.append(Paragraph(f"{index}. {formatted_heading}", toc_heading_style))
            toc_doc.build(toc_story)
            toc_buffer.seek(0)
            toc_reader = PdfReader(toc_buffer)
            toc_pages = [toc_reader.pages[i] for i in range(len(toc_reader.pages))]
        else:
            logger.info(f"Step 2.5: Skipping Table of Contents for content_type: {content_type}")
        # ===== STEP 3: Merge cover + ToC + content =====
        logger.info("Step 3: Merging cover page, ToC, and content pages")
        
        content_reader = PdfReader(content_buffer)
        
        writer = PdfWriter()
        
        # Add the branded cover page (Page 1)
        writer.add_page(template_page)
        logger.info("Added branded cover page with PWC logo, title, and subtitle")
        
        # Add the Table of Contents pages (Page 2+)
        for idx, toc_page in enumerate(toc_pages):
            writer.add_page(toc_page)
            logger.info(f"Added Table of Contents page {idx+1}")
        
        # Add all content pages (Page 3+)
        for page_num in range(len(content_reader.pages)):
            logger.info(f"Adding content page {page_num + 1}")
            writer.add_page(content_reader.pages[page_num])
        
        # Write final PDF
        output_buffer = io.BytesIO()
        writer.write(output_buffer)
        output_buffer.seek(0)
        
        result_bytes = output_buffer.getvalue()
        logger.info(f"PDF export complete: {len(writer.pages)} pages, {len(result_bytes)} bytes")
        
        return result_bytes
            
    except FileNotFoundError:
        # Bubble up so the API can surface a clear error instead of silently falling back
        raise
    except Exception as e:
        logger.error(f"Error exporting to PDF with PwC template: {e}", exc_info=True)
        # Fallback to basic PDF
        return _generate_pdf_with_title_subtitle(content, title, subtitle)


def _generate_pdf_with_title_subtitle(content: str, title: str, subtitle: str = "") -> bytes:
    """
    Generate a professional PDF with title, subtitle, and content.
    Used as fallback when PWC template is unavailable.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor='#D04A02',
        spaceAfter=20,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor='#666666',
        spaceAfter=40,
        alignment=TA_CENTER,
        fontName='Helvetica'
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=11,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceAfter=12
    )
    
    story = []
    
    # Add title
    story.append(Paragraph(title, title_style))
    
    # Add subtitle
    if subtitle:
        story.append(Paragraph(subtitle, subtitle_style))
    else:
        story.append(Spacer(1, 0.3 * inch))
    
    # Add content with intelligent paragraph splitting
    paragraphs = content.split('\n\n')
    for para in paragraphs:
        if para.strip():
            # Check if this is a long paragraph that should be split
            sentence_count = len(re.findall(r'[.!?]', para.strip()))
            
            if sentence_count > 3:
                # This is a long paragraph, split it into smaller chunks
                split_paragraphs = _split_paragraph_into_sentences(para.strip(), target_sentences=3)
                for split_para in split_paragraphs:
                    if split_para:
                        story.append(Paragraph(split_para, body_style))
            else:
                # Keep short paragraphs as is
                story.append(Paragraph(para.strip(), body_style))
    
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def _format_content_for_pdf(text: str) -> str:
    """
    Format content for PDF by converting markdown-style formatting to HTML-like tags.
    Reportlab supports a subset of HTML/XML tags for styling.
    
    Converts:
    - **bold** to <b>bold</b>
    - *italic* to <i>italic</i>
    - [text](url) to <a href="url" color="blue">text</a>
    - https?://... to <a href="url" color="blue">url</a>
    - Unicode superscript digits (¹²³ etc.) to <sup>1</sup> so they render correctly (not as bullet)
    - Normalizes all Unicode dash variants to standard hyphen for reliable PDF rendering
    """
    # First, handle special quotation marks and other problematic characters BEFORE processing HTML
    # This ensures they are replaced before being wrapped in HTML tags
    text = text.replace('\u201C', '"')  # Left double quotation mark
    text = text.replace('\u201D', '"')  # Right double quotation mark
    text = text.replace('\u2018', "'")  # Left single quotation mark
    text = text.replace('\u2019', "'")  # Right single quotation mark
    text = text.replace('\u2026', '...')  # Ellipsis

    # Convert Unicode superscript digits to <sup>N</sup> so PDF renders them correctly
    # (ReportLab may render ¹²³ as replacement glyphs/bullets; <sup> tag gives proper superscript)
    _SUPERSCRIPT_MAP = {
        '\u00B9': '1', '\u00B2': '2', '\u00B3': '3', '\u2074': '4', '\u2075': '5',
        '\u2076': '6', '\u2077': '7', '\u2078': '8', '\u2079': '9', '\u2070': '0',
    }
    for sup_char, digit in _SUPERSCRIPT_MAP.items():
        text = text.replace(sup_char, f'<sup>{digit}</sup>')
    
    # Normalize all Unicode dash/hyphen variants to standard ASCII hyphen-minus (-)
    # This prevents ReportLab rendering issues with special Unicode characters
    # Must be done BEFORE HTML processing to avoid encoding issues
    dash_variants = [
        '\u2010',  # Hyphen
        '\u2011',  # Non-breaking hyphen
        '\u2012',  # Figure dash
        '\u2013',  # En dash (–)
        '\u2014',  # Em dash (—)
        '\u2015',  # Horizontal bar
        '\u2212',  # Minus sign
        '\u058A',  # Armenian hyphen
        '\u05BE',  # Hebrew maqaf
        '\u1400',  # Canadian syllabics hyphen
        '\u1806',  # Mongolian todo soft hyphen
        '\u2E17',  # Double oblique hyphen
        '\u30A0',  # Katakana-hiragana double hyphen
        '\uFE58',  # Small em dash
        '\uFE63',  # Small hyphen-minus
        '\uFF0D',  # Fullwidth hyphen-minus
    ]
    
    for dash in dash_variants:
        text = text.replace(dash, '-')
    
    # Convert markdown links [text](url) to <a href="url" color="blue">text</a>
    text = re.sub(r'\[([^\]]+?)\]\(([^)]+?)\)', r'<a href="\2" color="blue">\1</a>', text)
    
    # Convert plain URLs to clickable links (but not those already inside HTML tags)
    # Match URLs that are not inside href= attributes or already converted
    text = re.sub(r'(?<![="])(?<![a-zA-Z])(?<!href)(https?://[^\s)>\]]+)', r'<a href="\1" color="blue">\1</a>', text)
    
    # Convert **bold** to <b>bold</b>
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    
    # Convert *italic* to <i>italic</i> (but not if it's part of **bold** or at line start for bullets)
    # Use negative lookbehind/lookahead to avoid double-processing
    text = re.sub(r'(?<!\*)\*([^\*]+?)\*(?!\*)', r'<i>\1</i>', text)
    
    return text


def _is_bullet_list_block(block: str) -> bool:
    """Check if a block contains bullet points"""
    lines = block.split('\n')
    bullet_count = 0
    for line in lines:
        stripped = line.strip()
        if stripped and (stripped.startswith('- ') or stripped.startswith('• ') or stripped.startswith('* ')):
            bullet_count += 1
    return bullet_count > 0


def _parse_bullet_items(block: str) -> list:
    """Parse bullet items from a block and return list of bullet texts"""
    lines = block.split('\n')
    items = []
    for line in lines:
        stripped = line.strip()
        indent = len(line) - len(line.lstrip())
        # if stripped and (stripped.startswith('- ') or stripped.startswith('• ') or stripped.startswith('* ')):
        if stripped.startswith(('- ', '• ', '* ')):
            
            # Remove bullet marker and leading/trailing whitespace
            bullet_text = re.sub(r'^[-•\*]\s+', '', stripped)
            # items.append(bullet_text)
            if bullet_text:
                items.append((indent, bullet_text))

    return items


def _split_paragraph_into_sentences(paragraph: str, target_sentences: int = 3) -> List[str]:
    """
    Split a long paragraph into smaller paragraphs by sentence boundaries.
    
    This ensures that even if content doesn't have explicit paragraph breaks (\n\n),
    long blocks of text are divided into readable chunks of 2-3 sentences each.
    
    Args:
        paragraph: The paragraph text to split
        target_sentences: Target number of sentences per paragraph chunk (default: 3)
    
    Returns:
        List of paragraph strings, each containing roughly target_sentences sentences
    """
    if not paragraph or not paragraph.strip():
        return []
    
    # Split by sentence boundaries (period, question mark, exclamation mark followed by space)
    # This regex splits on . ? ! followed by a space and capital letter, preserving the punctuation
    sentence_pattern = r'(?<=[.!?])\s+(?=[A-Z])'
    sentences = re.split(sentence_pattern, paragraph.strip())
    
    if len(sentences) <= target_sentences:
        # If paragraph has 3 or fewer sentences, keep it as is
        return [paragraph.strip()]
    
    # Group sentences into chunks
    paragraphs = []
    current_chunk = []
    
    for sentence in sentences:
        current_chunk.append(sentence)
        
        # When we have enough sentences, create a new paragraph
        if len(current_chunk) >= target_sentences:
            paragraphs.append(' '.join(current_chunk).strip())
            current_chunk = []
    
    # Add remaining sentences
    if current_chunk:
        paragraphs.append(' '.join(current_chunk).strip())
    
    return paragraphs

def add_hyperlink(paragraph, url, text=None, no_break=False, doc=None): #merge conflict resolved
    """
    Create a hyperlink in a Word paragraph with blue color and underline (same idea as PDF <a href>).
    If no_break is True, add w:noBreak so the URL does not break across lines (e.g. in citation list items).
    If doc is provided (e.g. from edit content list), use doc.part for the relationship so the link is clickable in Word/Word Online.
    """
    if not text:
        text = url
    
    # Sanitize inputs
    text = sanitize_text_for_word(text)
    url = str(url).strip()

    # Use document part when provided (edit content list) so relationship is on main document part - ensures clickable in Word/Word Online
    part = doc.part if doc is not None else paragraph.part
    r_id = part.relate_to(url, docx.opc.constants.RELATIONSHIP_TYPE.HYPERLINK, is_external=True)

    hyperlink = OxmlElement('w:hyperlink')
    hyperlink.set(qn('r:id'), r_id)
    # w:history="1" helps Word/Word Online treat the link as clickable (add to history when followed)
    hyperlink.set(qn('w:history'), '1')

    run = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')

    # Apply Hyperlink character style
    rStyle = OxmlElement('w:rStyle')
    rStyle.set(qn('w:val'), 'Hyperlink')
    rPr.append(rStyle)

    # Style (blue + underline) - ensure color is applied
    u = OxmlElement('w:u')
    u.set(qn('w:val'), 'single')
    rPr.append(u)

    color = OxmlElement('w:color')
    color.set(qn('w:val'), '0000FF')
    rPr.append(color)

    if no_break:
        no_break_elem = OxmlElement('w:noBreak')
        rPr.append(no_break_elem)

    run.append(rPr)
    
    # Add text to run - ensure it's properly encoded
    t = OxmlElement('w:t')
    # Set text with proper XML text handling
    if text:
        t.text = text
    run.append(t)

    hyperlink.append(run)
    paragraph._p.append(hyperlink)

def add_hyperlink_mi(paragraph, url, text=None,bold=False): #merge conflict resolved
    """
    Create a hyperlink in a Word paragraph with blue color and underline.
    """
    if not text:
        text = url
    
    # Sanitize inputs
    text = sanitize_text_for_word(text)
    url = str(url).strip()

    part = paragraph.part
    r_id = part.relate_to(url, docx.opc.constants.RELATIONSHIP_TYPE.HYPERLINK, is_external=True)

    hyperlink = OxmlElement('w:hyperlink')
    hyperlink.set(qn('r:id'), r_id)

    run = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')

    # Apply Hyperlink character style
    rStyle = OxmlElement('w:rStyle')
    rStyle.set(qn('w:val'), 'Hyperlink')
    rPr.append(rStyle)
    b = OxmlElement('w:b')
    b.set(qn('w:val'), 'true' if bold else 'false')
    rPr.append(b)


    # Style (blue + underline) - ensure color is applied
    u = OxmlElement('w:u')
    u.set(qn('w:val'), 'single')
    rPr.append(u)

    color = OxmlElement('w:color')
    color.set(qn('w:val'), '0000FF')
    rPr.append(color)

    run.append(rPr)
    
    # Add text to run - ensure it's properly encoded
    t = OxmlElement('w:t')
    # Set text with proper XML text handling
    if text:
        t.text = text
    run.append(t)

    hyperlink.append(run)
    paragraph._p.append(hyperlink)



def _normalize_citation_url_for_word(url: str) -> str:
    """
    Normalize a citation URL for Word export so the full URL is preserved as one string.
    Prevents breaks after dots (e.g. after www.pwc.) by stripping newlines and ensuring
    the URL is a single contiguous string. Use this for edit content Word citation links.
    """
    if not url:
        return ""
    s = str(url).strip()
    # Remove any newlines, carriage returns, or spaces that could cause Word to break the link
    s = re.sub(r'[\r\n\t\s]+', '', s)
    return s


def add_hyperlink_edit_content_citation(paragraph, url: str):
    """
    Add a citation URL as a single hyperlink in Word for edit content export.
    Uses noBreak on the run so the link does not break after dots (e.g. after www.pwc.);
    the full URL stays one clickable link instead of breaking into link + plain text.
    """
    url = _normalize_citation_url_for_word(url)
    if not url:
        return
    text = sanitize_text_for_word(url)
    part = paragraph.part
    r_id = part.relate_to(url, docx.opc.constants.RELATIONSHIP_TYPE.HYPERLINK, is_external=True)
    hyperlink = OxmlElement('w:hyperlink')
    hyperlink.set(qn('r:id'), r_id)
    run = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')
    rStyle = OxmlElement('w:rStyle')
    rStyle.set(qn('w:val'), 'Hyperlink')
    rPr.append(rStyle)
    u = OxmlElement('w:u')
    u.set(qn('w:val'), 'single')
    rPr.append(u)
    color = OxmlElement('w:color')
    color.set(qn('w:val'), '0000FF')
    rPr.append(color)
    # Prevent line break inside the URL so it doesn't break after a dot
    no_break = OxmlElement('w:noBreak')
    rPr.append(no_break)
    run.append(rPr)
    t = OxmlElement('w:t')
    if text:
        t.text = text
    run.append(t)
    hyperlink.append(run)
    paragraph._p.append(hyperlink)

def _set_footer_with_page_numbers_only(doc: Document):
    """
    Remove footer content from all sections and add page numbers only.
    This removes any branding, text, or other content but keeps page numbering.
    """
    from docx.oxml import parse_xml
    from docx.oxml.ns import nsdecls
    
    for section in doc.sections:
        footer = section.footer
        footer.is_linked_to_previous = False
        
        # Clear all existing footer content
        for para in list(footer.paragraphs):
            p = para._element
            p.getparent().remove(p)
        
        for table in list(footer.tables):
            t = table._element
            t.getparent().remove(t)
        
        # Add a single paragraph with page number only
        footer_para = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
        footer_para.text = ""
        footer_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        # Add page number field
        run = footer_para.add_run()
        
        # Create page number field XML
        fldChar1 = OxmlElement('w:fldChar')
        fldChar1.set(qn('w:fldCharType'), 'begin')
        
        instrText = OxmlElement('w:instrText')
        instrText.set(qn('xml:space'), 'preserve')
        instrText.text = 'PAGE'
        
        fldChar2 = OxmlElement('w:fldChar')
        fldChar2.set(qn('w:fldCharType'), 'end')
        
        run._r.append(fldChar1)
        run._r.append(instrText)
        run._r.append(fldChar2)
        
        logger.info(f"[_set_footer_with_page_numbers_only] Footer set with page numbers only")

def export_to_word(content: str, title: str = "Document") -> bytes:
    """Export content to Word DOCX format using PwC template"""
    try:
        # Load PwC template
        if os.path.exists(PWC_TEMPLATE_PATH):
            doc = Document(PWC_TEMPLATE_PATH)
            logger.info(f"Loaded PwC template from: {PWC_TEMPLATE_PATH}")
        else:
            logger.warning(f"PwC template not found at {PWC_TEMPLATE_PATH}, using default formatting")
            doc = Document()
    except Exception as e:
        logger.warning(f"Failed to load PwC template: {e}, using default formatting")
        doc = Document()
    
    # Remove footers and add page numbers only
    _set_footer_with_page_numbers_only(doc)
    
    # Check if template has proper structure (Title, Subtitle, page breaks)
    has_template_structure = (
        len(doc.paragraphs) > 2 and 
        doc.paragraphs[0].style.name == 'Title' and
        doc.paragraphs[1].style.name == 'Subtitle'
    )
    
    if has_template_structure:
        # Use template structure: update title, clear subtitle, remove page break paragraphs
        # Update title (paragraph 0)
        _set_paragraph_text_with_breaks(doc.paragraphs[0], title)
        
        # Clear subtitle (paragraph 1) - will be empty for basic export
        _set_paragraph_text_with_breaks(doc.paragraphs[1], '')
        
        # Remove ALL template content after title and subtitle (including old TOC and page breaks)
        paragraphs_to_remove = list(doc.paragraphs[2:])
        for para in paragraphs_to_remove:
            p = para._element
            p.getparent().remove(p)

        # Add page break after subtitle
        _ensure_page_break_after_paragraph(doc.paragraphs[1])
        
        # Extract headings from content before adding it
        headings = _extract_headings_from_content(content)
        
        # Add Table of Contents on page 2
        if headings:
            _add_table_of_contents(doc, headings)
        
        # Add a page break before the generated content so it starts after the TOC page
        page_break_para = doc.add_paragraph()
        run = page_break_para.add_run()
        run.add_break(WD_BREAK.PAGE)
        
        # Add content after the page break
        _add_formatted_content(doc, content)
    else:
        # No template structure, clear everything and build from scratch
        for para in doc.paragraphs[:]:
            p = para._element
            p.getparent().remove(p)
        
        # Add title using Title style
        title_para = doc.add_paragraph(title, style='Title')
        
        # Add a blank line after title
        doc.add_paragraph()
        
        # Parse and add content with proper formatting
        _add_formatted_content(doc, content)
    
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    docx_bytes = buffer.getvalue()
    
    # Apply encoding fix to ensure all Unicode characters are properly handled
    docx_bytes = _fix_docx_encoding(docx_bytes)
    
    return docx_bytes

def _add_bookmark_to_paragraph(para, bookmark_name: str):
    """Add a bookmark to a paragraph"""
    # Create bookmark start
    bookmark_id = str(next(_bookmark_counter))
    bookmark_start = OxmlElement('w:bookmarkStart')
    bookmark_start.set(qn('w:id'), bookmark_id)
    bookmark_start.set(qn('w:name'), bookmark_name)
    
    # Create bookmark end
    bookmark_end = OxmlElement('w:bookmarkEnd')
    bookmark_end.set(qn('w:id'), bookmark_id)
    
    # Add to paragraph
    para._element.insert(0, bookmark_start)
    para._element.append(bookmark_end)
    
def is_bullet_line(line: str) -> bool:
    return re.match(r'^\s*[-•]\s+', line) is not None

def export_to_word_pwc_standalone(
    content: str,
    title: str,
    subtitle: str | None = None,
    content_type: str | None = None,
    references: list[dict] | None = None
) -> bytes:
    logger.error("export_to_word_pwc_standalone() IS BEING CALLED")
    doc = Document(PWC_TEMPLATE_PATH) if os.path.exists(PWC_TEMPLATE_PATH) else Document()
    main_heading = None
    toc_items: list[str] = []
    references_heading_added = False
    # _set_paragraph_text_with_breaks(doc.paragraphs[0], sanitize_text_for_word(title))
    _set_paragraph_text_with_breaks(doc.paragraphs[1], sanitize_text_for_word(subtitle or ""))
    # for para in list(doc.paragraphs[2:]):
    #     para._element.getparent().remove(para._element)
    while len(doc.paragraphs) > 2:
        p = doc.paragraphs[-1]
        p._element.getparent().remove(p._element)
    
    # -------- FIRST PASS: collect TOC headings --------
    for block in content.split("\n\n"):
        block = block.strip()
        if not block:
            continue

        # Main / section headings
        if block.startswith("# ") and not block.startswith("##"):
            text = block[2:].strip()
            if not main_heading:
                main_heading = text
            toc_items.append(text.replace(":", ""))
        # Sub-headings
        elif block.startswith("##") and block.strip().lower() not in {"## references"}:
            text = block.replace("##", "").strip()
            # toc_items.append(text)
            toc_items.append(text.replace(":", ""))

        # Bold-only headings (**Heading**)
        else:
            m = re.match(r'^\*\*(.+?)\*\*$', block)
            if m:
                # toc_items.append(m.group(1).strip())
                toc_items.append(m.group(1).strip().replace(":", ""))

    title_para = doc.paragraphs[0]
    title_para.style = "Heading 1"
    print("Setting main heading:", main_heading," title",title_para)
    if main_heading:
        _set_paragraph_text_with_breaks(
            title_para,
            sanitize_text_for_word(main_heading)
        )
    else:
        title_para.text = ""
    
    _ensure_page_break_after_paragraph(doc.paragraphs[1])

    doc.add_paragraph("Contents", style="Heading 1")

    for idx, heading in enumerate(toc_items, start=1):
        p = doc.add_paragraph(style="Normal")
        p.paragraph_format.space_after = DocxPt(6)        
        run = p.add_run(f"{idx} {sanitize_text_for_word(heading)}")
        run.bold = False
    doc.add_page_break()
    for block in content.split("\n\n"):
        block = block.strip()

        if re.fullmatch(r'[-•–—]+', block):
            continue
        if not block:
            continue
        if block.strip().lower() in {"references:", "references"}:
            doc.add_paragraph("References", style="Heading 2")
            references_heading_added = True
            continue
        if block.startswith("##"):
            text = block.replace("##", "").strip()
            p = doc.add_paragraph(style="Heading 2")
            p.add_run(sanitize_text_for_word(text)).bold = True
            continue

        if block.startswith("#") and not block.startswith("##"):
            text = block[2:].strip()
            p = doc.add_paragraph(style="Heading 1")
            p.add_run(sanitize_text_for_word(text)).bold = True
            continue

        m = re.match(r'^\*\*(.+?)\*\*$', block)
        if m:
            p = doc.add_paragraph(style="Heading 1")
            p.add_run(sanitize_text_for_word(m.group(1))).bold = True
            continue
        lines = block.split("\n")
        if all(is_bullet_line(l) for l in lines):
            for line in lines:
                clean = re.sub(r'^\s*[-•]\s+', '', line).strip()
                if clean:
                    para = doc.add_paragraph(style="List Bullet")
                    _add_markdown_text_runs(para, clean)
            continue
        # if block.startswith(("-", "•", "*")):
        #     for line in block.split("\n"):
        #         line = re.sub(r'^[•\-\*]\s*', '', line.strip())
        #         if line:
        #             para = doc.add_paragraph(style="List Bullet")
        #             _add_markdown_text_runs(para, line)
        #             continue

        para = doc.add_paragraph(style="Normal")
        _add_markdown_text_runs(para, block)
    
    # doc.add_page_break()
   

    if references:
        doc.add_page_break()
        if not references_heading_added:
            doc.add_paragraph("References", style="Heading 2")


        for ref in references:
            para = _add_numbered_paragraph(
                doc,
                sanitize_text_for_word(ref.get("title", ""))
            )

            if ref.get("url"):
                add_hyperlink(para, ref["url"])

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return _fix_docx_encoding(buffer.getvalue())


def _add_markdown_text_runs(paragraph, text: str,allow_bold: bool = True):
    """
    Adds text to a paragraph with support for:
    **bold** text
    *italic* text
    [text](url) - markdown links converted to hyperlinks
    Plain URLs - converted to hyperlinks
    """
    if not text:
        return
    
    # Start with markdown links to avoid conflicts with other patterns
    # Replace markdown links [text](url) with a placeholder first
    link_placeholders = {}
    placeholder_counter = 0
    
    def replace_link(match):
        nonlocal placeholder_counter
        link_text = match.group(1)
        link_url = match.group(2)
        placeholder = f"__LINK_PLACEHOLDER_{placeholder_counter}__"
        link_placeholders[placeholder] = (link_text, link_url)
        placeholder_counter += 1
        return placeholder
    
    # Replace all markdown links with placeholders
    text_with_placeholders = re.sub(r'\[([^\]]+?)\]\(([^)]+?)\)', replace_link, text)
    
    # Now process the text with placeholders
    pos = 0
    while pos < len(text_with_placeholders):
        # Check for placeholder (hyperlink)
        placeholder_match = re.search(r'__LINK_PLACEHOLDER_\d+__', text_with_placeholders[pos:])
        # Check for bracketed URL [https://...] so it becomes clickable in Word
        bracketed_url_match = re.search(r'\[(https?://[^\]]+)\]', text_with_placeholders[pos:])
        # Check for bold
        bold_match = re.search(r'\*\*(.+?)\*\*', text_with_placeholders[pos:])
        # Check for italic
        italic_match = re.search(r'(?<!\*)\*([^\*]+?)\*(?!\*)', text_with_placeholders[pos:])
        # Check for plain URL (that wasn't converted to markdown); stop at ] so [https://...] is handled above
        # Match full URL including dots (e.g. https://www.pwc.com/...) so link doesn't break after dot
        url_match = re.search(r'https?://[^\s)\]]+', text_with_placeholders[pos:])
        
        # Collect matches with positions
        matches = []
        if placeholder_match:
            matches.append(('placeholder', pos + placeholder_match.start(), placeholder_match))
        if bracketed_url_match:
            matches.append(('bracketed_url', pos + bracketed_url_match.start(), bracketed_url_match))
        if allow_bold and bold_match:
            matches.append(('bold', pos + bold_match.start(), bold_match))
        if italic_match:
            matches.append(('italic', pos + italic_match.start(), italic_match))
        if url_match:
            matches.append(('url', pos + url_match.start(), url_match))
        
        if not matches:
            # No more patterns, add remaining text
            if pos < len(text_with_placeholders):
                remaining = text_with_placeholders[pos:]
                if remaining:
                    run = paragraph.add_run(sanitize_text_for_word(remaining))
            break
        
        # Process the earliest match
        matches.sort(key=lambda x: x[1])
        match_type, match_pos, match = matches[0]
        
        # Add text before match
        if match_pos > pos:
            before_text = text_with_placeholders[pos:match_pos]
            if before_text:
                run = paragraph.add_run(sanitize_text_for_word(before_text))
        
        # Process the match
        if match_type == 'placeholder':
            placeholder_text = match.group(0)
            if placeholder_text in link_placeholders:
                link_text, link_url = link_placeholders[placeholder_text]
                # Citation refs [1](url), [2](url): make clickable superscript like PDF
                if link_text.isdigit():
                    add_superscript_hyperlink(paragraph, f"[{link_text}]", link_url)
                else:
                    add_hyperlink(paragraph, link_url, link_text)
            pos = match_pos + len(placeholder_text)
        
        elif match_type == 'bracketed_url':
            url = match.group(1).strip()
            add_hyperlink(paragraph, url, url)
            pos = match_pos + len(match.group(0))
        
        elif match_type == 'bold':
            bold_text = match.group(1)
            run = paragraph.add_run(sanitize_text_for_word(bold_text))
            run.bold = True
            pos = match_pos + len(match.group(0))
        
        elif match_type == 'italic':
            italic_text = match.group(1)
            run = paragraph.add_run(sanitize_text_for_word(italic_text))
            run.italic = True
            pos = match_pos + len(match.group(0))
        
        elif match_type == 'url':
            url = match.group(0).rstrip('.,;:')
            # Full URL (regex captures including dots) so entire link is clickable like PDF
            add_hyperlink(paragraph, url, url)
            pos = match_pos + len(url)


def _add_numbered_paragraph(doc: Document, text: str):
    """
    Create a numbered paragraph with a BRAND-NEW numbering instance.
    Always starts from 1. Never interferes with other lists.
    """
    numbering_part = doc.part.numbering_part

    # Create a new abstract numbering definition
    abstract_num_id = _get_next_abstract_num_id(numbering_part)

    abstract_num = OxmlElement("w:abstractNum")
    abstract_num.set(qn("w:abstractNumId"), str(abstract_num_id))

    lvl = OxmlElement("w:lvl")
    lvl.set(qn("w:ilvl"), "0")

    start = OxmlElement("w:start")
    start.set(qn("w:val"), "1")

    lvl_restart = OxmlElement("w:lvlRestart")
    lvl_restart.set(qn("w:val"), "1") 
    num_fmt = OxmlElement("w:numFmt")
    num_fmt.set(qn("w:val"), "decimal")

    lvl_text = OxmlElement("w:lvlText")
    lvl_text.set(qn("w:val"), "%1.")

    lvl.extend([start, lvl_restart, num_fmt, lvl_text])
    abstract_num.append(lvl)
    root = _numbering_root(numbering_part)
    if root is not None:
        root.append(abstract_num)

    # Create a new numbering instance
    num_id = _get_next_num_id(numbering_part)

    num = OxmlElement("w:num")
    num.set(qn("w:numId"), str(num_id))

    abstract_ref = OxmlElement("w:abstractNumId")
    abstract_ref.set(qn("w:val"), str(abstract_num_id))

    num.append(abstract_ref)
    if root is not None:
        root.append(num)

    # Create paragraph using this numbering
    p = doc.add_paragraph()
    pPr = p._p.get_or_add_pPr()

    numPr = OxmlElement("w:numPr")
    ilvl = OxmlElement("w:ilvl")
    ilvl.set(qn("w:val"), "0")
    numId = OxmlElement("w:numId")
    numId.set(qn("w:val"), str(num_id))

    numPr.extend([ilvl, numId])
    pPr.append(numPr)

    p.add_run(text)
    return p

def _add_references_section(doc: Document, references: list[dict]):
    doc.add_page_break()
    doc.add_paragraph("References", style="Heading 2")

    for ref in references:
        title = ref.get("title", "")
        url = ref.get("url", "")
        
        # Create the reference text with URL
        if url:
            display_text = f"{title} (URL: {url})"
        else:
            display_text = title
        
        para = _add_numbered_paragraph(doc, display_text)
        
        # If URL exists, make the URL part a hyperlink
        if url:
            # Clear the paragraph and rebuild with hyperlink
            for run in para.runs[:]:
                run._element.getparent().remove(run._element)
            
            # Add title as plain text
            para.add_run(title)
            para.add_run(" (URL: ")
            
            # Add URL as hyperlink
            add_hyperlink(para, url, url)
            
            para.add_run(")")

def _add_formatted_content(doc: Document, content: str, references: list[dict] | None = None):
    """Parse and add content to document with appropriate styles"""
    
    # Split content into blocks (paragraphs separated by blank lines)
    blocks = content.split('\n\n')
    
    # Pre-process: Merge consecutive numbered list items and citations
    # This handles cases where citations are split across blocks (title and URL on separate blocks)
    merged_blocks = []
    i = 0
    while i < len(blocks):
        block = blocks[i].strip()
        if not block:
            i += 1
            continue
        
        # Check if this is a numbered item
        if re.match(r'^\d+\.', block):
            merged_block = block
            # Look ahead for consecutive numbered items
            j = i + 1
            while j < len(blocks):
                next_block = blocks[j].strip()
                if not next_block:
                    j += 1
                    continue
                
                # Check if next block is also a numbered item
                if re.match(r'^\d+\.', next_block):
                    # Merge with current block
                    merged_block += '\n' + next_block
                    j += 1
                else:
                    # No more numbered items, stop looking
                    break
            
            merged_blocks.append(merged_block)
            i = j
        else:
            merged_blocks.append(block)
            i += 1
    
    # Now process merged blocks
    for block in merged_blocks:
        if not block.strip():
            continue
        
        # Skip separator lines (---, ---, etc.)
        if re.fullmatch(r'\s*-{3,}\s*', block):
            continue
        
        # Check for headings (lines starting with # or **bold** markers)
        block = block.strip()
        
        # Check if the block is a standalone bold text (likely a heading)
        # Pattern: **Text** at the start of a line, possibly followed by newline or end of block
        standalone_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*$', block)
        if standalone_bold_match:
            # This is a standalone bold text, treat as Heading 2
            text = standalone_bold_match.group(1).strip()
            sanitized_text = sanitize_text_for_word(text)
            para = doc.add_paragraph(style='Heading 2')
            # para.add_run(text)
            run = para.add_run(sanitized_text)
            run.bold = True

            # Add bookmark for TOC page number reference
            bookmark_name = text.replace(" ", "_").replace("&", "and")
            _add_bookmark_to_paragraph(para, bookmark_name)
            continue
        
        # Check if the block starts with bold text on first line (likely a section header)
        # Pattern: **Text** followed by newline and more content
        first_line_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*\n', block)
        if first_line_bold_match:
            # Extract the bold heading and remaining content
            heading_text = first_line_bold_match.group(1).strip()
            sanitized_heading = sanitize_text_for_word(heading_text)
            remaining_content = block[first_line_bold_match.end():].strip()
            
            # Add heading
            para = doc.add_paragraph(style='Heading 2')
            # para.add_run(heading_text)
            run = para.add_run(sanitized_heading)
            run.bold = True
            # Add bookmark for TOC page number reference
            bookmark_name = heading_text.replace(" ", "_").replace("&", "and")
            _add_bookmark_to_paragraph(para, bookmark_name)
            
            # Process remaining content recursively
            if remaining_content:
                _add_formatted_content(doc, remaining_content)
            continue
        
        # Detect markdown-style headings
        if block.startswith('####'):
            # Heading 4
            text = block.replace('####', '').strip()
            # Remove ** markers if present
            text = text.replace('**', '')
            para = doc.add_paragraph(style='Heading 4')
            _add_text_with_formatting(para, text)
        elif block.startswith('###'):
            # Heading 3
            text = block.replace('###', '').strip()
            # Remove ** markers if present
            text = text.replace('**', '')
            para = doc.add_paragraph(style='Heading 3')
            _add_text_with_formatting(para, text)
        elif block.startswith('##'):
            # Heading 2
            text = block.replace('##', '').strip()
            # Remove ** markers if present
            text = text.replace('**', '')
            sanitized_text = sanitize_text_for_word(text)
            para = doc.add_paragraph(style='Heading 2')
            run = para.add_run(sanitized_text)
            run.bold = True
        elif block.startswith('#'):
            # Heading 1
            text = block.replace('#', '').strip()
            # Remove ** markers if present
            text = text.replace('**', '')
            para = doc.add_paragraph(style='Heading 1')
            _add_text_with_formatting(para, text)
        
        # Detect bullet lists
        elif block.startswith('•') or block.startswith('- ') or block.startswith('* '):
            lines = block.split('\n')
            for line in lines:
                if line.strip():
                    # Remove bullet markers
                    text = re.sub(r'^[•\-\*]\s*', '', line.strip())
                    para = doc.add_paragraph(style='List Bullet')
                    _add_text_with_formatting(para, text)
        
        # Detect numbered lists and citations
        elif re.match(r'^\d+\.', block):
            lines = block.split('\n')
            logger.debug(f"[_add_formatted_content] Detected numbered block with {len(lines)} lines")
            
            # Check if this is a citation/reference block with URL pattern
            # URLs can be: "URL: https://..." or just "https://..." lines
            is_citation_block = False
            url_pattern = r'(URL:\s*)?https?://'
            if any(re.search(url_pattern, line) for line in lines):
                is_citation_block = True
                logger.debug(f"[_add_formatted_content] Detected citation block (URL-based detection)")
            
            # Also check if this is a citation block by counting numbered lines (PDF-style detection)
            # If at least 2 lines start with a number followed by a period, treat as citations
            if not is_citation_block:
                citation_pattern = r'^\s*\d+\.\s+'
                citation_count = sum(1 for line in lines if re.match(citation_pattern, line.strip()))
                logger.debug(f"[_add_formatted_content] Citation count (PDF-style): {citation_count}")
                if citation_count >= 2:
                    is_citation_block = True
                    logger.debug(f"[_add_formatted_content] Detected citation block (PDF-style detection)")
            
            if is_citation_block:
                logger.debug(f"[_add_formatted_content] Processing citation block with {len(lines)} lines")
                # Process citations/references - keep original numbers, combine title+URL
                citation_entries = []
                
                for line in lines:
                    line_stripped = line.strip()
                    if not line_stripped:
                        continue
                    
                    # Extract complete citation entry (number + title + optional URL all on one line)
                    # Format examples: "1. Title", "1. Title (URL: https://...)", "1. Title [https://...]", "1. Title\nhttps://url"
                    title_match = re.match(r'^(\d+)\.\s+(.*?)(?:\s*\(URL:\s*(https?://[^\)]+)\))?$', line_stripped)
                    if title_match:
                        original_number = title_match.group(1)
                        title_text = title_match.group(2).strip()
                        url_text = title_match.group(3).strip() if title_match.group(3) else None
                        # Also extract URL from square brackets: "Title [https://...]"
                        if not url_text:
                            bracketed_url = re.search(r'\[(https?://[^\]]+)\]', title_text)
                            if bracketed_url:
                                url_text = bracketed_url.group(1).strip()
                                title_text = re.sub(r'\s*\[https?://[^\]]+\]\s*$', '', title_text).strip()
                        logger.debug(f"[_add_formatted_content] Parsed citation: {original_number}. {title_text[:40]}... URL: {url_text[:40] if url_text else 'None'}...")
                        citation_entries.append({
                            'number': original_number,
                            'title': title_text,
                            'url': url_text
                        })
                    # Check if this line is a URL continuation from previous title (plain or in brackets)
                    elif re.match(r'^\s*(?:URL:\s*)?(?:\[)?(https?://[^\s\)\]]+)(?:\])?', line_stripped):
                        # This is a URL line - try to attach to the last entry
                        url_match = re.search(r'(?:URL:\s*)?(?:\[)?(https?://[^\s\)\]]+)(?:\])?', line_stripped)
                        if url_match and citation_entries:
                            citation_entries[-1]['url'] = url_match.group(1).strip()
                            logger.debug(f"[_add_formatted_content] Attached URL to previous citation: {citation_entries[-1]['url'][:40]}...")
                
                logger.debug(f"[_add_formatted_content] Found {len(citation_entries)} citation entries")
                
                # Add entries as paragraphs with hyperlinks
                for idx, entry in enumerate(citation_entries):
                    logger.debug(f"[_add_formatted_content] Adding citation {idx+1}: {entry['number']}. {entry['title'][:30]}...")
                    
                    # Remove ** markers from title
                    title_text = entry['title'].replace('**', '')
                    
                    # Add paragraph with preserved original number
                    para = doc.add_paragraph(style='Body Text')
                    _add_text_with_formatting(para, f"{entry['number']}. {title_text}")
                    
                    # Add URL as hyperlink if it exists
                    if entry['url']:
                        para.add_run(" ")
                        add_hyperlink(para, entry['url'], entry['url'])
                        logger.debug(f"[_add_formatted_content] Added hyperlink: {entry['url'][:40]}...")
                    else:
                        logger.debug(f"[_add_formatted_content] No URL for this citation")

            else:
                # Regular numbered list - PRESERVE original numbers, don't auto-number
                for line in lines:
                    line_stripped = line.strip()
                    if line_stripped and re.match(r'^\d+\.', line_stripped):
                        # Extract the original number
                        number_match = re.match(r'^(\d+)\.\s+(.*)', line_stripped)
                        if number_match:
                            original_number = number_match.group(1)
                            text = number_match.group(2)
                            # Remove ** markers
                            text = text.replace('**', '')
                            # Add paragraph with preserved number, not auto-numbering
                            para = doc.add_paragraph(style='Body Text')
                            para.paragraph_format.left_indent = DocxInches(0.25)
                            _add_text_with_formatting(para, f"{original_number}. {text}")
        
        # Check if block contains multiple lines (multi-line paragraph)
        elif '\n' in block:
            # Check if it's a list within the block
            lines = block.split('\n')
            in_list = False
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Check for bullet points
                if line.startswith('•') or line.startswith('- ') or line.startswith('* '):
                    text = re.sub(r'^[•\-\*]\s*', '', line)
                    para = doc.add_paragraph(style='List Bullet')
                    _add_text_with_formatting(para, text)
                    in_list = True
                # Check for numbered items
                elif re.match(r'^\d+\.', line):
                    # Extract the original number
                    number_match = re.match(r'^(\d+)\.\s+(.*)', line)
                    if number_match:
                        original_number = number_match.group(1)
                        text = number_match.group(2)
                        # Add paragraph with preserved number, not auto-numbering
                        para = doc.add_paragraph(style='Body Text')
                        para.paragraph_format.left_indent = DocxInches(0.25)
                        _add_text_with_formatting(para, f"{original_number}. {text}")
                    in_list = True
                else:
                    # Regular paragraph continuation
                    if in_list:
                        para = doc.add_paragraph(style='List Bullet')
                        _add_text_with_formatting(para, line)
                    else:
                        para = doc.add_paragraph(style='Body Text')
                        _add_text_with_formatting(para, line)
        
        # Regular paragraph
        else:
            # Intelligently split long paragraphs into smaller chunks
            sentence_count = len(re.findall(r'[.!?]', block))
            
            if sentence_count > 3:
                # This is a long paragraph, split it into smaller chunks (2-3 sentences each)
                split_paragraphs = _split_paragraph_into_sentences(block, target_sentences=3)
                for split_para in split_paragraphs:
                    if split_para:
                        para = doc.add_paragraph(style='Body Text')
                        _add_text_with_formatting(para, split_para)
            else:
                # Keep short paragraphs as is
                para = doc.add_paragraph(style='Body Text')
                _add_text_with_formatting(para, block)

    if references:
        _add_references_section(doc, references)

def _set_paragraph_text_with_breaks(para, text):
    """
    Safely set paragraph text with proper line breaks.
    Clears existing runs and adds new text with line breaks where \n appears.
    """
    # Sanitize text first
    text = sanitize_text_for_word(text)
    
    # Clear existing runs
    for run in para.runs[:]:
        run._element.getparent().remove(run._element)
    
    # Split text by newlines and add with proper breaks
    lines = text.split('\n')
    for i, line in enumerate(lines):
        sanitized_line = sanitize_text_for_word(line)
        run = para.add_run(sanitized_line)
        # Add soft line break after each line except the last
        if i < len(lines) - 1:
            run.add_break()

def _ensure_page_break_after_paragraph(para):
    """Add a page break after the given paragraph if one is not already present."""
    # If the last run already ends with a page break, do nothing
    if para.runs:
        last_run = para.runs[-1]
        if getattr(last_run, "break_type", None) == WD_BREAK.PAGE:
            return
    run = para.add_run()
    run.add_break(WD_BREAK.PAGE)

def _extract_headings_from_content(content: str) -> List[str]:
    """
    Extract all headings from content (both markdown # style and **bold** style).
    Returns a list of heading texts in order.
    
    Note: Includes all bold text items and section headers in the table of contents.
    """
    headings = []
    blocks = content.split('\n\n')
    
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        
        # Check for standalone bold text (heading)
        standalone_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*$', block)
        if standalone_bold_match:
            text = standalone_bold_match.group(1).strip()
            # Remove leading numbers like "1. ", "5.1. ", etc.
            text = re.sub(r'^\d+(\.\d+)*\.?\s*', '', text).strip()
            headings.append(text)
            continue
        
        # Check for bold text at start of paragraph
        first_line_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*\n', block)
        if first_line_bold_match:
            text = first_line_bold_match.group(1).strip()
            # Remove leading numbers like "1. ", "5.1. ", etc.
            text = re.sub(r'^\d+(\.\d+)*\.?\s*', '', text).strip()
            headings.append(text)
            continue
        
        # Check for markdown headings
        if block.startswith('####'):
            text = block.replace('####', '').strip()
            # Remove ** markers if present
            text = text.replace('**', '').strip()
            text = re.sub(r'^\d+(\.\d+)*\.?\s*', '', text).strip()
            headings.append(text)
        elif block.startswith('###'):
            text = block.replace('###', '').strip()
            # Remove ** markers if present
            text = text.replace('**', '').strip()
            text = re.sub(r'^\d+(\.\d+)*\.?\s*', '', text).strip()
            headings.append(text)
        elif block.startswith('##'):
            text = block.replace('##', '').strip()
            # Remove ** markers if present
            text = text.replace('**', '').strip()
            text = re.sub(r'^\d+(\.\d+)*\.?\s*', '', text).strip()
            headings.append(text)
        elif block.startswith('#'):
            text = block.replace('#', '').strip()
            # Remove ** markers if present
            text = text.replace('**', '').strip()
            text = re.sub(r'^\d+(\.\d+)*\.?\s*', '', text).strip()
            headings.append(text)
    
    return headings

def _add_table_of_contents(doc: Document, headings: List[str]):
    """
    Add a custom table of contents with the provided headings and page numbers.
    Uses Word bookmarks and page number fields to automatically track page numbers.
    Includes serial numbers (1, 2, 3, ...) before each heading.
    """
    # Add "Contents" heading
    toc_title = doc.add_paragraph("Contents", style='Heading 1')
    doc.add_paragraph()  # Blank line
    
    # Add each heading as a TOC entry with serial number and page number field
    for index, heading in enumerate(headings, start=1):
        # Create a paragraph for the TOC entry
        toc_entry = doc.add_paragraph()
        toc_entry.paragraph_format.left_indent = DocxInches(0.5)
        
        # Add the serial number and heading text
        run = toc_entry.add_run(f"{index}. {heading}")
        run.font.size = DocxPt(11)
        
        # Add page number field that will be populated by Word
        # This uses the PAGEREF field to reference the page where the heading appears
        page_run = toc_entry.add_run()
        page_run.font.size = DocxPt(11)
        
        # Create a page number field using Word's field syntax
        fldChar1 = OxmlElement('w:fldChar')
        fldChar1.set(qn('w:fldCharType'), 'begin')
        
        instrText = OxmlElement('w:instrText')
        instrText.set(qn('xml:space'), 'preserve')
        instrText.text = f'PAGEREF "{heading.replace(" ", "_")}" \\h'
        
        fldChar2 = OxmlElement('w:fldChar')
        fldChar2.set(qn('w:fldCharType'), 'end')
        
        # Add field elements to the run
        page_run._r.append(fldChar1)
        page_run._r.append(instrText)
        page_run._r.append(fldChar2)
        
        # Add a space before page number
        toc_entry.runs[1].text = ' ' + toc_entry.runs[1].text


def _add_text_with_formatting(para, text):
    """
    Add text to a paragraph with inline markdown formatting (bold, italic, hyperlinks).
    Supports **bold**, *italic*, [text](url) markdown links, and plain URLs.
    """
    if not text:
        return
    
    # Start with markdown links to avoid conflicts with other patterns
    # Replace markdown links [text](url) with a placeholder first
    link_placeholders = {}
    placeholder_counter = 0
    
    def replace_link(match):
        nonlocal placeholder_counter
        link_text = match.group(1)
        link_url = match.group(2)
        placeholder = f"__LINK_PLACEHOLDER_{placeholder_counter}__"
        link_placeholders[placeholder] = (link_text, link_url)
        placeholder_counter += 1
        return placeholder
    
    # Replace all markdown links with placeholders
    text_with_placeholders = re.sub(r'\[([^\]]+?)\]\(([^)]+?)\)', replace_link, text)
    
    # Now process the text with placeholders
    pos = 0
    while pos < len(text_with_placeholders):
        # Check for placeholder (hyperlink)
        placeholder_match = re.search(r'__LINK_PLACEHOLDER_\d+__', text_with_placeholders[pos:])
        # Check for bracketed URL [https://...] so it becomes clickable in Word
        bracketed_url_match = re.search(r'\[(https?://[^\]]+)\]', text_with_placeholders[pos:])
        # Check for bold
        bold_match = re.search(r'\*\*(.+?)\*\*', text_with_placeholders[pos:])
        # Check for italic
        italic_match = re.search(r'(?<!\*)\*([^\*]+?)\*(?!\*)', text_with_placeholders[pos:])
        # Check for plain URL (that wasn't converted to markdown)
        # Match https?:// followed by non-whitespace characters, but stop at closing parens/brackets or end of string
        # Note: NOT stopping at dots since dots are normal in URLs
        url_match = re.search(r'https?://[^\s)\]]+(?=[)\]\s]|$)', text_with_placeholders[pos:])
        
        # Collect matches with positions
        matches = []
        if placeholder_match:
            matches.append(('placeholder', pos + placeholder_match.start(), placeholder_match))
        if bracketed_url_match:
            matches.append(('bracketed_url', pos + bracketed_url_match.start(), bracketed_url_match))
        if bold_match:
            matches.append(('bold', pos + bold_match.start(), bold_match))
        if italic_match:
            matches.append(('italic', pos + italic_match.start(), italic_match))
        if url_match:
            matches.append(('url', pos + url_match.start(), url_match))
        
        if not matches:
            # No more patterns, add remaining text
            if pos < len(text_with_placeholders):
                remaining = text_with_placeholders[pos:]
                if remaining:
                    run = para.add_run(sanitize_text_for_word(remaining))
            break
        
        # Process the earliest match
        matches.sort(key=lambda x: x[1])
        match_type, match_pos, match = matches[0]
        
        # Add text before match
        if match_pos > pos:
            before_text = text_with_placeholders[pos:match_pos]
            if before_text:
                run = para.add_run(sanitize_text_for_word(before_text))
        
        # Process the match
        if match_type == 'placeholder':
            placeholder_text = match.group(0)
            if placeholder_text in link_placeholders:
                link_text, link_url = link_placeholders[placeholder_text]
                add_hyperlink(para, link_url, link_text)
            pos = match_pos + len(placeholder_text)
        
        elif match_type == 'bracketed_url':
            url = match.group(1).strip()
            add_hyperlink(para, url, url)
            pos = match_pos + len(match.group(0))
        
        elif match_type == 'bold':
            bold_text = match.group(1)
            run = para.add_run(sanitize_text_for_word(bold_text))
            run.bold = True
            pos = match_pos + len(match.group(0))
        
        elif match_type == 'italic':
            italic_text = match.group(1)
            run = para.add_run(sanitize_text_for_word(italic_text))
            run.italic = True
            pos = match_pos + len(match.group(0))
        
        elif match_type == 'url':
            url = match.group(0).rstrip('.,;:')
            add_hyperlink(para, url, url)
            pos = match_pos + len(url)


def export_to_word_with_metadata(content: str, title: str, subtitle: Optional[str] = None, 
                                   content_type: Optional[str] = None) -> bytes:
    """
    Export content to Word DOCX format using PwC template with metadata
    
    Args:
        content: The main content to export
        title: Document title
        subtitle: Optional subtitle
        content_type: Type of content (article, whitepaper, executive-brief, blog)
    """
    logger.info(f"[export_to_word_with_metadata] Starting export. Title: {title[:50]}, Content length: {len(content)}")
    
    try:
        # Load PwC template
        if os.path.exists(PWC_TEMPLATE_PATH):
            doc = Document(PWC_TEMPLATE_PATH)
            logger.info(f"Loaded PwC template from: {PWC_TEMPLATE_PATH}")
        else:
            logger.warning(f"PwC template not found at {PWC_TEMPLATE_PATH}, using default formatting")
            doc = Document()
    except Exception as e:
        logger.warning(f"Failed to load PwC template: {e}, using default formatting")
        doc = Document()
    
    # Remove footers and add page numbers only
    _set_footer_with_page_numbers_only(doc)
    
    # Check if template has proper structure (Title, Subtitle, page breaks)
    has_template_structure = (
        len(doc.paragraphs) > 2 and 
        doc.paragraphs[0].style.name == 'Title' and
        doc.paragraphs[1].style.name == 'Subtitle'
    )
    
    if has_template_structure:
        # Use template structure: update title and subtitle, remove page break paragraphs
        # Update title (paragraph 0) - clear runs and set text
        _set_paragraph_text_with_breaks(doc.paragraphs[0], title)
        
        # Increase font size of title for better prominence on cover page
        for run in doc.paragraphs[0].runs:
            run.font.size = DocxPt(28)  # Large font for prominent title on cover page
        
        # Set paragraph alignment to center or left with word wrap enabled
        doc.paragraphs[0].alignment = None  # Use default alignment
        doc.paragraphs[0].paragraph_format.widow_control = True  # Better line breaking
        
        # Update subtitle (paragraph 1) with proper line breaks
        if subtitle and content_type:
            subtitle_text = f"{subtitle}\n{content_type.replace('-', ' ').title()}"
        elif subtitle:
            subtitle_text = subtitle
        else:
            # Don't show content_type as subtitle - it's only for metadata/formatting
            subtitle_text = ''
        
        _set_paragraph_text_with_breaks(doc.paragraphs[1], subtitle_text)
        
        # Remove ALL template content after title and subtitle (including old TOC and page breaks)
        paragraphs_to_remove = list(doc.paragraphs[2:])
        for para in paragraphs_to_remove:
            p = para._element
            p.getparent().remove(p)

        # Add page break after subtitle
        _ensure_page_break_after_paragraph(doc.paragraphs[1])
        
        # Extract headings from content before adding it
        headings = _extract_headings_from_content(content)
        
        # Add Table of Contents only for Article and White Paper, skip for Blog and Executive Brief
        should_add_toc = content_type and content_type.lower() not in ['blog', 'executive_brief', 'executive-brief']
        
        if headings and should_add_toc:
            logger.info(f"[export_to_word_with_metadata] Adding Table of Contents for content_type: {content_type}")
            _add_table_of_contents(doc, headings)
            
            # Add a page break before the generated content so it starts after the TOC page
            page_break_para = doc.add_paragraph()
            run = page_break_para.add_run()
            run.add_break(WD_BREAK.PAGE)
        else:
            logger.info(f"[export_to_word_with_metadata] Skipping Table of Contents for content_type: {content_type}")
        
        # Add content after the cover/TOC
        _add_formatted_content(doc, content)
    else:
        # No template structure, clear everything and build from scratch
        for para in doc.paragraphs[:]:
            p = para._element
            p.getparent().remove(p)
        
        # Add title using Title style with sanitization
        sanitized_title = sanitize_text_for_word(title)
        title_para = doc.add_paragraph(sanitized_title, style='Title')
        
        # Add subtitle if provided
        if subtitle:
            sanitized_subtitle = sanitize_text_for_word(subtitle)
            subtitle_para = doc.add_paragraph(sanitized_subtitle, style='Subtitle')
        
        # Add content type if provided
        if content_type:
            sanitized_content_type = sanitize_text_for_word(f"Content Type: {content_type.replace('-', ' ').title()}")
            type_para = doc.add_paragraph(sanitized_content_type, style='Subtitle')
        
        # Add a blank line
        doc.add_paragraph()
        
        # Parse and add content with proper formatting
        _add_formatted_content(doc, content)
    
    buffer = io.BytesIO()
    try:
        doc.save(buffer)
    except UnicodeEncodeError as e:
        logger.error(f"Encoding error while saving document: {e}")
        raise Exception(f"Failed to save Word document due to encoding error: {str(e)}")
    except Exception as e:
        logger.error(f"Error saving Word document: {e}")
        raise Exception(f"Failed to save Word document: {str(e)}")
    
    buffer.seek(0)
    docx_bytes = buffer.getvalue()
    
    logger.info(f"[export_to_word_with_metadata] Document created, size before encoding fix: {len(docx_bytes)} bytes")
    
    # Apply encoding fix to ensure all Unicode characters are properly handled
    try:
        docx_bytes = _fix_docx_encoding(docx_bytes)
        logger.info(f"[export_to_word_with_metadata] Encoding fix applied, final size: {len(docx_bytes)} bytes")
    except Exception as e:
        logger.error(f"[export_to_word_with_metadata] Error during encoding fix: {e}")
        # Continue anyway - the document might still be valid
    
    logger.info(f"[export_to_word_with_metadata] Export completed successfully")
    return docx_bytes

def export_to_text(content: str) -> bytes:
    """Export content to plain text format"""
    return content.encode('utf-8')
   
def _clean_bullet_text(text: str) -> str:
    text = re.sub(r'\*{1,2}', '', text)
    text = re.sub(r'^\s*(bullet|•|-)\s*', '', text, flags=re.IGNORECASE)
    return text.strip()

def _strip_ui_markdown(text: str) -> str:
    """
    Remove UI markdown artifacts (*, **) that should not
    be rendered as formatting in PDF.
    """
    if not text:
        return text
    text = re.sub(r'\*{1,2}', '', text)
    text = re.sub(r'^\s*[-•]\s*', '', text)
    return text.strip()

def export_to_word_ui_plain(content: str, title: str) -> bytes:
    """
    Standalone UI Word export
    - No template
    - No TOC
    - No headers/footers
    """
    doc = Document()

    def tighten_spacing(p):
        p.paragraph_format.space_before = DocxPt(0)
        p.paragraph_format.space_after = DocxPt(4)
        p.paragraph_format.line_spacing = 1

    lines = content.split("\n")

    for line in lines:
        text = line.rstrip()

        if not text:
            p = doc.add_paragraph("")
            tighten_spacing(p)
            continue

        # Bullet points
        if re.match(r"^(\-|\•)\s+", text):
            bullet_text = re.sub(r"^(\-|\•)\s+", "", text)
            p = doc.add_paragraph(style="List Bullet")
            tighten_spacing(p)

            # Bold heading before colon
            if ":" in bullet_text:
                head, rest = bullet_text.split(":", 1)
                r1 = p.add_run(head.strip() + ":")
                r1.bold = True
                p.add_run(rest)
            else:
                p.add_run(bullet_text)

            continue

        # Normal paragraph
        p = doc.add_paragraph()
        tighten_spacing(p)

        # Bold hashtags
        parts = re.split(r"(#\w+)", text)
        for part in parts:
            if part.startswith("#"):
                r = p.add_run(part)
                r.bold = True
            else:
                # Handle **bold**
                subparts = re.split(r"(\*\*.*?\*\*)", part)
                for sub in subparts:
                    if sub.startswith("**") and sub.endswith("**"):
                        r = p.add_run(sub[2:-2])
                        r.bold = True
                    else:
                        p.add_run(sub)

    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()

def normalize_broken_markdown(text: str) -> str:
    text = re.sub(r'\*(\w[^*]+)\*\*', r'**\1**', text)
    text = re.sub(r'\*{3,}', '**', text)
    return text

def _remove_bullets_from_block(text: str) -> str:
    """
    Removes bullet lines from a block of text and returns remaining paragraphs.
    Handles -, –, •, *, and numbered bullets.
    """
    lines = text.splitlines()
    cleaned = []

    bullet_pattern = re.compile(r'^\s*(?:[-–•*]|\d+[.)])\s+')

    for line in lines:
        if bullet_pattern.match(line):
            continue
        cleaned.append(line)

    return "\n".join(cleaned).strip()

def add_superscript_hyperlink(paragraph, text, url):
    run = paragraph.add_run(text)
    run.font.superscript = True
    run.bold = False

    r = run._r
    rPr = r.get_or_add_rPr()

    # Hyperlink XML
    hyperlink = OxmlElement('w:hyperlink')
    hyperlink.set(qn('r:id'), paragraph.part.relate_to(
        url,
        docx.opc.constants.RELATIONSHIP_TYPE.HYPERLINK,
        is_external=True
    ))

    hyperlink.append(r)
    paragraph._p.append(hyperlink)

def export_to_pdf_with_pwc_template_with_bullets(
    content: str,
    title: str,
    subtitle: str | None = None,include_toc: bool = True) -> bytes:
    
    logger.info("[Export] PDF-PWC-BULLETS endpoint hit")
    # title = re.sub(r'\*+', '', title).strip()
    title = re.sub(r'^[#\s]*', '', re.sub(r'\*+', '', title)).strip()

    logger.info(f"[Export] PDF-PWC-BULLETS title",{"title": title})
    subtitle = re.sub(r'\*+', '', subtitle).strip() if subtitle else None
    logger.info("Creating PWC branded PDF with title, subtitle, and content")
    # Check if template exists
    if not os.path.exists(PWC_PDF_TEMPLATE_PATH):
        logger.warning(f"PwC PDF template not found at {PWC_PDF_TEMPLATE_PATH}")
        return _generate_pdf_with_title_subtitle(content, title, subtitle)
    
    # ===== STEP 1: Create branded cover page =====
    logger.info("Step 1: Creating branded cover page")
    template_reader = PdfReader(PWC_PDF_TEMPLATE_PATH)
    template_page = template_reader.pages[0]
    page_width = float(template_page.mediabox.width)
    page_height = float(template_page.mediabox.height)
    logger.info(f"Template page size: {page_width:.1f} x {page_height:.1f} points")
    # Create overlay with text
    overlay_buffer = io.BytesIO()
    c = canvas.Canvas(overlay_buffer, pagesize=(page_width, page_height))
    # Add title
    title_font_size = 28
    if len(title) > 80:
        title_font_size = 20
    elif len(title) > 60:
        title_font_size = 22
    elif len(title) > 40:
        title_font_size = 26
    c.setFont("Helvetica-Bold", title_font_size)
    c.setFillColor('#000000')  # Black color
    title_y = page_height * 0.72
    
    # Handle multi-line titles with better word wrapping
    # Maximum width for title (leaving margins on left and right)
    max_title_width = page_width * 0.70  # 70% of page width with margins
    
    # Better character width estimation - more conservative to avoid cutoff
    # Estimate pixels needed per character based on font size
    # At 20pt Helvetica: ~10 pixels per character average
    char_width_at_font = (title_font_size / 20.0) * 10
    max_chars_per_line = int(max_title_width / char_width_at_font)
    
    # Ensure reasonable minimum and maximum
    max_chars_per_line = max(20, min(max_chars_per_line, 50))
    clean_title = re.sub(r'\*+', '', title).strip()
    words = clean_title.split()
    lines = []
    current_line = []
    for word in words:
        test_line = ' '.join(current_line + [word])
        if len(test_line) > max_chars_per_line:
            if current_line:
                lines.append(' '.join(current_line))
            current_line = [word]
        else:
            current_line.append(word)
    if current_line:
        lines.append(' '.join(current_line))
    # Draw multi-line title
    if len(lines) > 1:
        line_height = title_font_size + 6
        # Center vertically: start higher if multiple lines
        start_y = title_y + (len(lines) - 1) * line_height / 2
        for i, line in enumerate(lines):
            c.drawCentredString(page_width / 2, start_y - (i * line_height), line)
        last_title_y = start_y - (len(lines) * line_height)
    else:
        c.drawCentredString(page_width / 2, title_y, clean_title)
        last_title_y = title_y
    
    logger.info(f"Title added to overlay: {clean_title} ({len(lines)} lines)")
    # Add subtitle if provided
    if subtitle:
        # Clean up markdown asterisks from subtitle
        subtitle_clean = subtitle.replace('**', '')
        c.setFont("Helvetica-Bold", 14)  # Bold font
        c.setFillColor('#000000')  # Black color
        subtitle_y = last_title_y - 70        
        # Wrap subtitle text to fit within page width
        # Use a more conservative character limit for subtitle
        # Page width is typically 612 points (8.5 inches) for letter size
        # Helvetica 14pt: approximately 7-8 pixels per character
        max_subtitle_width = page_width * 0.75  # 75% of page width with margins
        subtitle_char_width = 8  # pixels per character at 14pt
        max_chars_per_line = int(max_subtitle_width / subtitle_char_width)
        words = subtitle_clean.split()
        lines = []
        current_line = []        
        for word in words:
            test_line = ' '.join(current_line + [word])
            # Use more conservative line breaking - shorter lines for better visibility
            if len(test_line) > min(50, max_chars_per_line):
                if current_line:
                    lines.append(' '.join(current_line))
                current_line = [word]
            else:
                current_line.append(word)        
        if current_line:
            lines.append(' '.join(current_line))        
        # Draw multi-line subtitle with proper centering
        line_height = 22
        # If multiple lines, center vertically
        if len(lines) > 1:
            start_y = subtitle_y + (len(lines) - 1) * line_height / 2
        else:
            start_y = subtitle_y        
        for i, line in enumerate(lines):
            c.drawCentredString(page_width / 2, start_y - (i * line_height), line)
        logger.info(f"Subtitle added to overlay: {subtitle_clean} ({len(lines)} lines)")
    c.save()
    overlay_buffer.seek(0)    
    # Merge overlay with template
    overlay_reader = PdfReader(overlay_buffer)
    overlay_page = overlay_reader.pages[0]    
    template_page.merge_page(overlay_page)
    logger.info("Overlay merged onto template cover page")        
    logger.info("Step 2: Creating formatted content pages")
    # First, extract all headings for Table of Contents
    headings = []
    if include_toc:
        # blocks = content.split('\n')
        blocks = re.split(r'\n\s*\n', content)
        for block in blocks:
            if not block.strip():
                continue
            block = block.strip()
            if re.match(r'^\s*[-_]{3,}\s*$', block):
                continue
            # Check for various heading formats
            standalone_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*$', block)
            if standalone_bold_match:
                heading_text = standalone_bold_match.group(1)
                heading_text = re.sub(r'\*+', '', heading_text).rstrip(':').strip()
                if heading_text.lower() == 'references':
                    headings.append('References')
                    continue
                headings.append(heading_text)
                continue
            first_line_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*\n', block)
            if first_line_bold_match:
                heading_text = re.sub(r'\*+', '', first_line_bold_match.group(1)).rstrip(':').strip()
                headings.append(heading_text)
                continue
            # Markdown headings
            if block.startswith('#'):
                text = re.sub(r'^#+\s*', '', block.split('\n')[0]).strip()
                text = re.sub(r'\*+', '', text).rstrip(':').strip()
                # headings.append(text.rstrip(':').strip())
                headings.append(text)
        logger.info(f"Extracted {len(headings)} headings for Table of Contents")
    content_buffer = io.BytesIO()
    doc = SimpleDocTemplate(
    content_buffer,
    pagesize=(page_width, page_height),
    topMargin=1*inch,
    bottomMargin=1*inch,
    leftMargin=1.1*inch,
    rightMargin=1*inch)
    styles = getSampleStyleSheet()
    # Define custom styles
    body_style = ParagraphStyle(
        'PWCBody',
        parent=styles['BodyText'],
        fontSize=11,
        leading=15,
        alignment=TA_JUSTIFY,
        spaceAfter=6,#12
        # fontName='Helvetica'
        fontName='DejaVu'
    )
    body_style.hyphenationLang = None
    table_cell_style = ParagraphStyle(
    'PWCTableCell',
    parent=styles['BodyText'],
    fontName='Helvetica',
    fontSize=10,
    leading=14,
    alignment=TA_LEFT,
    spaceAfter=0,
    spaceBefore=0,
)

    bullet_style = ParagraphStyle(
        'PWCBullet',
        parent=body_style,
        leftIndent=0,
        spaceAfter=6,
        alignment=TA_LEFT
    )
    reference_style = ParagraphStyle(
        'PWCReference',
        parent=styles['BodyText'],
        fontSize=11,
        leading=13,
        alignment=TA_LEFT,
        spaceAfter=4,  
        spaceBefore=0,
        fontName='Helvetica',
        bold = False
    )
    heading_style = ParagraphStyle(
        'PWCHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor='#D04A02',
        spaceAfter=10,
        spaceBefore=10, #10
        # fontName='Helvetica-Bold' #Helvetica
        fontName='DejaVu-Bold'

    )
 
   
    story = []   
    
    # Parse and add content with formatting
    # blocks = content.split('\n')
    blocks = re.split(r'\n\s*\n', content)
    for block in blocks:
        if not block.strip():
            continue
         # ===== TABLE DETECTION (ADD THIS BLOCK) =====
        if "|" in block and re.search(r"\|\s*-{3,}", block):
            rows = [r.strip() for r in block.split("\n") if "|" in r]
            # data = [
            #     [re.sub(r"[*#]+", "", cell).strip() for cell in row.strip("|").split("|")]
            #     for row in rows
            # ]
            data = [
                [
                    Paragraph(
                        re.sub(r"[*#]+", "", cell).strip(),
                        table_cell_style
                    )
                    for cell in row.strip("|").split("|")
                ]
                for row in rows
            ]

            usable_width = page_width - (1.1*inch + 1*inch + 0.3*inch)
            colWidths = [usable_width * 0.3] + [usable_width * 0.7 / (len(data[0]) - 1)] * (len(data[0]) - 1)


            table = Table(
                data,
                # colWidths=[(page_width - 2.1*inch) / len(data[0])] * len(data[0]),
                colWidths=colWidths,
                repeatRows=1
            )
            table.setStyle([
                ('GRID', (0,0), (-1,-1), 0.5, colors.black),
                ('BACKGROUND', (0,0), (-1,0), colors.whitesmoke),
                ('FONT', (0,0), (-1,0), 'Helvetica-Bold'),
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                # ('WORDWRAP', (0,0), (-1,-1), 'CJK'),
                ('LEFTPADDING', (0,0), (-1,-1), 6),
                ('RIGHTPADDING', (0,0), (-1,-1), 6),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                ('NOSPLIT', (0,0), (-1,-1)),
                
                # ('ROWHEIGHT', (0,0), (-1,-1), None),


            ])
            # story.append(table)
            # # story.append(Spacer(1, 12))
            # # story.append(Spacer(1, 20))
            # story.append(Spacer(1, 12))
            # story.append(KeepTogether([table]))
            # story.append(Spacer(1, 18))
            # story.append(Paragraph("&nbsp;", body_style))
            # table.hAlign = 'LEFT'
            story.append(KeepTogether([
                table,
                Spacer(1, 18)
            ]))



            continue
            # ===== END TABLE DETECTION =====        
        block = block.strip()
        if '\n' in block:
            lines = [l.rstrip() for l in block.split('\n') if l.strip()]
            first = lines[0].lstrip()
            rest = lines[1:]

            # ---------- 1️⃣ MARKDOWN HEADINGS ----------
            if first.startswith('#'):
                heading_text = re.sub(r'^#+\s*', '', first)
                heading_text = re.sub(r'\*+', '', heading_text).rstrip(':').strip()

                story.append(Paragraph(heading_text, heading_style))

                # render remaining content normally
                if rest:
                    remaining_block = "\n".join(rest).strip()

                    if _is_bullet_list_block(remaining_block):
                        bullet_items = _parse_bullet_items(remaining_block)
                        story.append(ListFlowable(
                            [
                                ListItem(
                                    Paragraph(
                                        _format_content_for_pdf_mi(
                                            _clean_bullet_text(item)
                                        ),
                                        bullet_style
                                    ),
                                    leftIndent=24 + indent * 12,
                                    bulletText='•'
                                )
                                for indent, item in bullet_items
                            ],
                            bulletType='bullet',
                            leftIndent=24
                        ))
                    else:
                        story.append(
                            Paragraph(
                                _format_content_for_pdf_mi(
                                    _clean_bullet_text(remaining_block)
                                ),
                                body_style
                            )
                        )
                continue

            # ---------- 2️⃣ NON-HEADING MULTI-LINE PARAGRAPHS ----------
            if not _is_bullet_list_block(block) and "|" not in block:
                for line in lines:
                    story.append(
                        Paragraph(
                            _format_content_for_pdf_mi(_clean_bullet_text(line)),
                            body_style
                        )
                    )
                continue

        if re.match(r'^\s*[-_]{3,}\s*$', block):
            continue
        # Check for headings (bold text on its own line or markdown style)
        standalone_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*$', block)
        if standalone_bold_match:
            heading_text = standalone_bold_match.group(1)
            heading_text = re.sub(r'\*+', '', heading_text).rstrip(':').strip()
            if heading_text.lower().rstrip(':') == 'references':
                story.append(Paragraph('References', heading_style))
                continue
            story.append(Paragraph(heading_text, heading_style))
            continue
        # Check for bold text at start of paragraph
        # ---- NUMBERED SECTION HEADING (e.g. 1. Executive Overview) ----
        numbered_heading_match = re.match(
            r'^#*\s*(\d+\.\s+[A-Z][^\n]+)\n+(.*)',
            block,
            re.DOTALL
        )
        if numbered_heading_match:
            heading_text = numbered_heading_match.group(1).strip()
            remaining = numbered_heading_match.group(2).strip()

            story.append(Paragraph(heading_text, heading_style))

            if remaining:
                story.append(Spacer(1, 8))
                story.append(Paragraph(
                    _format_content_for_pdf_mi(_strip_ui_markdown(remaining)),
                    body_style
                ))
            continue

        first_line_bold_match = re.match(r'^\*\*([^\*]+?)\*\*\s*\n', block)
        if first_line_bold_match:
            heading_text = first_line_bold_match.group(1)
            heading_text = re.sub(r'\*+', '', heading_text).rstrip(':').strip()
            remaining_content = block[first_line_bold_match.end():].strip()
            story.append(Paragraph(heading_text, heading_style))
            if remaining_content:
                # Check if remaining content is a bullet list
                if _is_bullet_list_block(remaining_content):
                    bullet_items = _parse_bullet_items(remaining_content)
                    bullet_flow = ListFlowable(
                        [
                            ListItem(
                                Paragraph(_format_content_for_pdf_mi(_strip_ui_markdown(_clean_bullet_text(text)).lstrip("-–• ")), bullet_style),
                                # leftIndent=24 + indent * 2,
                                leftIndent=18 + indent * 12,
                                bulletText='•'
                            )
                            for indent, text in bullet_items
                        ],
                        bulletType='bullet',
                        leftIndent=24,
                        spaceBefore=4,
                        spaceAfter=8
                    )
                    story.append(bullet_flow)
                    # trailing_text = _remove_bullets_from_block(remaining_content).strip()
                    if not _is_bullet_list_block(remaining_content):
                        trailing_text = remaining_content.strip()
                    else:
                        trailing_text = _remove_bullets_from_block(remaining_content).strip()

                    if trailing_text:
                        story.append(Spacer(1, 6))
                        story.append(Paragraph(
                            _format_content_for_pdf_mi(trailing_text),
                            body_style
                        ))
                else:
                    para = Paragraph(_format_content_for_pdf_mi( _strip_ui_markdown(remaining_content)), body_style)
                    story.append(para)
            continue
        bullet_heading_match = re.match(
            r'^###\s*•\s*(.+?)\s*\n+(.+)',
            block,
            re.DOTALL
        )

        if bullet_heading_match:
            heading_text = bullet_heading_match.group(1).strip()
            body_text = bullet_heading_match.group(2).strip()

            story.append(Paragraph(f"• {heading_text}", heading_style))
            story.append(Spacer(1, 6))
            story.append(Paragraph(
                _format_content_for_pdf_mi(_strip_ui_markdown(body_text)),
                body_style
            ))
            continue
        # Check for markdown headings
        if block.startswith('####'):
            text = block.replace('####', '').strip()
            text = re.sub(r'\*+', '', text).rstrip(':').strip()
            story.append(Paragraph(text, heading_style))
            continue
        elif block.startswith('###'):
            text = block.replace('###', '').strip()
            text = re.sub(r'\*+', '', text).rstrip(':').strip()
            story.append(Paragraph(text, heading_style))
            continue
        elif block.startswith('##'):
            text = block.replace('##', '').strip()
            text = re.sub(r'\*+', '', text).rstrip(':').strip()
            story.append(Paragraph(text, heading_style))
            continue
        elif block.startswith('#'):
            text = block.replace('#', '').strip()
            text = re.sub(r'\*+', '', text).rstrip(':').strip()
            story.append(Paragraph(text, heading_style))
            continue
        
        # Check if block is a bullet list
        if _is_bullet_list_block(block):
            bullet_items = _parse_bullet_items(block)
            bullet_flow = ListFlowable(
                [
                    ListItem(
                        Paragraph(_format_content_for_pdf_mi(_clean_bullet_text(item)), bullet_style),
                        # leftIndent=24 + indent * 2,
                        leftIndent = 24 + indent * 12,
                        # bulletText='•'
                        bulletText = '•' if indent < 2 else '-'
                    )
                    for indent,item in bullet_items
                ],
                # start='bullet',
                bulletType='bullet',
                leftIndent=24
            )
            story.append(bullet_flow)
            continue
        
        # Check if block contains multiple lines with citation patterns
        # Citations typically look like: [1] text or 1. text
        lines = block.split('\n')
        if len(lines) > 1:
            # Check if this looks like a citation/reference block
            citation_pattern = r'^\s*(\[\d+\]|\d+\.)\s+'
            citation_count = sum(1 for line in lines if re.match(citation_pattern, line.strip()))
            
            # If at least 2 lines match citation pattern, treat as citation block
            if citation_count >= 2:
                # Process each line separately with left alignment (no justify)
                for line in lines:
                    line_stripped = line.strip()
                    if line_stripped:
                        clean = _strip_ui_markdown(line_stripped)
                        para = Paragraph(_format_content_for_pdf_mi(clean), reference_style)

                        # para = Paragraph(_format_content_for_pdf_mi( _strip_ui_markdown(line_stripped))+ " ", reference_style)
                        # para = Paragraph(_strip_ui_markdown(line_stripped), reference_style)
                        story.append(Spacer(1, 6))
                        
                        story.append(para)
                        story.append(Spacer(1, 6))
                continue
        
        # Regular paragraph - intelligently split long paragraphs into smaller chunks
        sentence_count = len(re.findall(r'[.!?]', block))
        # if sentence_count > 999:
        if sentence_count > 20:    
            # This is a long paragraph, split it into smaller chunks (2-3 sentences each)
            split_paragraphs = _split_paragraph_into_sentences(block, target_sentences=3)
            for split_para in split_paragraphs:
                if split_para:
                    para = Paragraph(_format_content_for_pdf_mi(split_para), body_style)
                    story.append(para)
        else:
            # Keep short paragraphs as is
            # para = Paragraph(_format_content_for_pdf_mi(_strip_ui_markdown(_clean_bullet_text(block))), body_style)
            # para = Paragraph(_format_content_for_pdf_mi(_clean_bullet_text(block)), body_style)
            para = Paragraph(_format_content_for_pdf_mi(_clean_bullet_text(block)), body_style)

            story.append(para)
    
    # Build the content PDF
    # doc.build(story)
    doc.build(
        story,
        onFirstPage=_add_page_number,
        onLaterPages=_add_page_number
    )
    content_buffer.seek(0)
    if include_toc:
        logger.info("Step 2.5: Creating Table of Contents pages (multi-page)")
        toc_buffer = io.BytesIO()
        toc_doc = SimpleDocTemplate(toc_buffer, pagesize=(page_width, page_height), topMargin=1*inch, bottomMargin=1*inch)
        toc_styles = getSampleStyleSheet()
        toc_title_style = ParagraphStyle(
            'TOCTitle',
            parent=toc_styles['Heading1'],
            fontSize=24,
            textColor='#000000',
            spaceAfter=24,
            alignment=TA_LEFT,
            fontName='Helvetica-Bold'
        )
        toc_heading_style = ParagraphStyle(
            'TOCHeading',
            parent=toc_styles['BodyText'],
            fontSize=11,
            textColor='#000000',
            spaceAfter=6,#12
            alignment=TA_LEFT,
            fontName='Helvetica',
            leading=16,
            rightIndent=20
        )
        toc_story = []
        if not headings:
            toc_pages = []
        toc_story.append(Paragraph("Contents", toc_title_style))
        toc_story.append(Spacer(1, 0.2 * inch))
        seen = set()
        filtered_headings = []
        for h in headings:
            if h not in seen:
                filtered_headings.append(h)
                seen.add(h)
        for index, heading in enumerate(filtered_headings, start=1):
            clean_heading = re.sub(r'^\d+\.\s*', '', heading)
            toc_story.append(Paragraph(f"{index}. {heading}", toc_heading_style))

        toc_doc.build(toc_story)
        toc_buffer.seek(0)
        toc_reader = PdfReader(toc_buffer)
        toc_pages = [toc_reader.pages[i] for i in range(len(toc_reader.pages))]
    logger.info("Step 3: Merging cover page, ToC, and content pages")
    content_reader = PdfReader(content_buffer)
    writer = PdfWriter()
    # Add the branded cover page (Page 1)
    writer.add_page(template_page)
    logger.info("Added branded cover page with PWC logo, title, and subtitle")
        # Add the Table of Contents pages (Page 2+)
    if include_toc:    
        for toc_page in toc_pages:
            writer.add_page(toc_page)
    if not content_reader:
        raise RuntimeError("content_reader was not initialized")

    # Add all content pages (Page 3+)
    for page in content_reader.pages:
        # base_page = copy.deepcopy(template_reader.pages[0])
        # base_page.merge_page(page)
        writer.add_page(page)

    # Write final PDF
    output_buffer = io.BytesIO()
    writer.write(output_buffer)
    output_buffer.seek(0)
    
    result_bytes = output_buffer.getvalue()
    logger.info(f"PDF export complete: {len(writer.pages)} pages, {len(result_bytes)} bytes")
    
    return result_bytes

def _add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor('#666666')

    page_num_text = f"{doc.page}"
    canvas.drawRightString(
        doc.pagesize[0] - 1 * inch,   # right margin
        0.75 * inch,                  # footer height
        page_num_text
    )

    canvas.restoreState()


def _add_page_number_edit_content_pdf(canvas, doc):
    """
    Add page number at bottom of each content page for edit content PDF export.
    Content pages are merged after a single cover page, so display number as doc.page + 1.
    Use only in export_to_pdf_edit_content when building content pages.
    """
    canvas.saveState()
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor('#666666')
    page_num_text = f"{doc.page + 1}"
    canvas.drawRightString(
        doc.pagesize[0] - 1 * inch,
        0.75 * inch,
        page_num_text
    )
    canvas.restoreState()


def export_to_pdf_pwc_no_toc(
    content: str,
    title: str,
    subtitle: str | None = None,
    content_type: str | None = None,client: str | None = None

) -> bytes:
    """
    PwC PDF export WITHOUT Table of Contents.
    Uses same formatting as pdf-pwc-bullets.
    """
    if not os.path.exists(PWC_PDF_TEMPLATE_PATH):
        return _generate_pdf_with_title_subtitle(content, title, subtitle)
    logger.info(f"Generating PDF PwC no ToC for module: {title},{content_type}")
    
    # Reuse COVER creation logic from existing function
    pdf_bytes = export_to_pdf_with_pwc_template_with_bullets(
        content=content,
        title=title,
        subtitle=subtitle,
        include_toc=False
    )

    reader = PdfReader(io.BytesIO(pdf_bytes))
    writer = PdfWriter()
    writer.add_page(reader.pages[0])
    for page in reader.pages[1:]: 
        writer.add_page(page)
    buffer = io.BytesIO()
    writer.write(buffer)
    buffer.seek(0)
    return buffer.getvalue()

def build_cover_title(module: str, client: str | None) -> str:
    module_clean = re.sub(r'generate\s+', '', module, flags=re.IGNORECASE)
    module_clean = module_clean.replace("-", " ").title()
    if not client:
        return module_clean
    return f"{module_clean} on {client.title()}".strip()
    # module_clean = re.sub(r'[*#_`]+', '', module_clean).strip()  

    # if not clientname:
    #     return module_clean

    # return f"{module_clean} on {clientname}".strip()

def classify_block(block: str) -> str:
    """
    Returns one of:
    executive_takeaway
    bullet_heading
    heading_1
    heading_2
    bullet_list
    paragraph
    """
    if re.match(r'^\*\*Executive takeaway:\*\*', block, re.I):
        return "executive_takeaway"

    if re.match(r'^(\*.+\*|- .+)$', block):
        return "bullet_heading"

    if block.startswith("##"):
        return "heading_2"

    if block.startswith("#"):
        return "heading_1"

    if all(is_bullet_line(l) for l in block.split("\n")):
        return "bullet_list"

    return "paragraph"

def split_blocks(text: str) -> list[str]:
    """
    Split content into blocks with consistent normalization.
    
    Rules:
    - Normalize all newline types (\r\n, \r) to \n
    - Split on 2+ consecutive newlines
    - Strip each block
    - Remove empty blocks
    
    This prevents index drift from different newline handling across platforms.
    
    Args:
        text: Raw content string with possible mixed newlines
    
    Returns:
        List of non-empty, stripped content blocks
    """
    if not isinstance(text, str):
        text = str(text)
    
    # Normalize newlines: \r\n and \r become \n
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    
    # Split on 2+ newlines
    blocks = re.split(r"\n{2,}", text)
    
    # Strip and filter empty blocks
    return [b.strip() for b in blocks if b.strip()]


def html_to_marked_text(text: str) -> str:
    """Convert limited HTML to a simple markdown-like text we already support.

    Rules:
    - Decode HTML entities
    - Treat <p> as paragraph breaks and <br> as line breaks
    - Convert <strong>/<b> to **bold** markers (which existing formatters understand)
    - Convert <h1>-<h6> to markdown headings (#)
    - Convert <li> items to bullet format (- bullet)
    - Strip all other tags/attributes (like style="...")
    
    EDIT CONTENT ONLY: This function is specifically for converting HTML from
    formatFinalArticleWithBlockTypes() to plain text before backend processing.
    """
    if not isinstance(text, str):
        text = str(text)

    # Decode entities (&amp;, &nbsp; ...)
    text = unescape(text)

    # Convert headings to markdown: <h1>Text</h1> -> # Text
    text = re.sub(r"<h1[^>]*>([^<]+)</h1>", r"# \1", text, flags=re.IGNORECASE)
    text = re.sub(r"<h2[^>]*>([^<]+)</h2>", r"## \1", text, flags=re.IGNORECASE)
    text = re.sub(r"<h3[^>]*>([^<]+)</h3>", r"### \1", text, flags=re.IGNORECASE)
    text = re.sub(r"<h4[^>]*>([^<]+)</h4>", r"#### \1", text, flags=re.IGNORECASE)
    text = re.sub(r"<h5[^>]*>([^<]+)</h5>", r"##### \1", text, flags=re.IGNORECASE)
    text = re.sub(r"<h6[^>]*>([^<]+)</h6>", r"###### \1", text, flags=re.IGNORECASE)
    
    # Convert <ul> and <ol> lists to plain text
    # <li>content</li> -> - content (bullet format)
    text = re.sub(r"<li[^>]*>([^<]+)</li>", r"- \1", text, flags=re.IGNORECASE)
    text = re.sub(r"</?[ou]l[^>]*>", "", text, flags=re.IGNORECASE)  # Remove ul/ol tags

    # Paragraph and line breaks first so they survive tag stripping
    text = re.sub(r"</p\s*>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)

    # Convert bold tags to ** ** markers
    # Handle nested/overlapping conservatively by doing closing then opening
    text = re.sub(r"<\s*/\s*(strong|b)\s*>", "**", text, flags=re.IGNORECASE)
    text = re.sub(r"<\s*(strong|b)[^>]*>", "**", text, flags=re.IGNORECASE)
    
    # Convert italic tags to * * markers
    text = re.sub(r"<\s*/\s*(em|i)\s*>", "*", text, flags=re.IGNORECASE)
    text = re.sub(r"<\s*(em|i)[^>]*>", "*", text, flags=re.IGNORECASE)

    # Drop all remaining tags (div, span, p with style, etc.)
    text = re.sub(r"<[^>]+>", "", text)

    # Clean up excessive whitespace (but preserve intentional structure)
    # Multiple spaces -> single space (but not newlines)
    text = re.sub(r"[ \t]+", " ", text)
    # Multiple newlines (3+) -> double newline (paragraph break)
    text = re.sub(r"\n{3,}", "\n\n", text)
    
    return text.strip()
def parse_bullet(text: str) -> dict:
    """
    Parse bullet point structure consistently.
    
    Extracts:
    - number: int or None (e.g., 1, 2, 10 from "1.", "2.", "10)")
    - icon: str or None (bullet icon like "•", "-", "*")
    - label: str (bold text before colon, or first sentence)
    - body: str or None (text after colon, or remainder)
    
    This is the single source of truth for bullet semantics.
    Used by both Word and PDF export.
    
    Args:
        text: Raw bullet text (may include number/icon prefix)
    
    Returns:
        dict with keys: number, icon, label, body
    """
    text = text.strip()
    result = {
        "number": None,
        "icon": None,
        "label": "",
        "body": None
    }
    
    # Extract bullet icon first (•, -, *)
    icon_match = re.match(r'^([•\-\*])\s+', text)
    if icon_match:
        result["icon"] = icon_match.group(1)
        text = text[len(icon_match.group(0)):].strip()
    
    # Extract number prefix (1., 2., 10), etc.)
    number_match = re.match(r'^(\d+)[.)]\s+', text)
    if number_match:
        result["number"] = int(number_match.group(1))
        text = text[len(number_match.group(0)):].strip()
    
    # Extract label (before colon) and body (after colon)
    colon_idx = text.find(':')
    if colon_idx > 0:
        result["label"] = text[:colon_idx].strip()
        result["body"] = text[colon_idx + 1:].strip()
    else:
        result["label"] = text
    
    return result

def _format_content_with_block_types_word(doc: Document, content: str, block_types: list[dict] | None = None, use_bullet_icons_only: bool = False):
    """
    Format content in Word document using block type information.
    Applies formatting similar to frontend formatFinalArticleWithBlockTypes.
    Groups consecutive bullet items into lists, handles bullet icons, removes number prefixes.
    
    Content should be final_article format: plain text with "\n\n" separators.
    Uses split_blocks() to split content (same as final article processing).
    block_types should match final article generation structure with sequential indices.
    
    If use_bullet_icons_only is True, all lists (numbered, alphabetical, or bullet) use bullet icons (for edit content export).
    """
    if not block_types:
        # Fallback to default formatting
        for block in split_blocks(content):
            block = block.strip()
            if not block:
                continue
            if block.startswith("##"):
                p = doc.add_paragraph(style="Heading 2")
                p.add_run(sanitize_text_for_word(block.replace("##", "").strip())).bold = True
            elif block.startswith("#"):
                p = doc.add_paragraph(style="Heading 1")
                p.add_run(sanitize_text_for_word(block.replace("#", "").strip())).bold = True
            elif re.match(r'^\*\*(.+?)\*\*$', block):
                m = re.match(r'^\*\*(.+?)\*\*$', block)
                if m:
                    p = doc.add_paragraph(style="Heading 1")
                    p.add_run(sanitize_text_for_word(m.group(1))).bold = True
            else:
                lines = block.split("\n")
                if all(is_bullet_line(l) for l in lines):
                    for line in lines:
                        clean = re.sub(r'^\s*[-•]\s+', '', line).strip()
                        if clean:
                            para = doc.add_paragraph(style="List Bullet")
                            _add_markdown_text_runs(para, clean)
                else:
                    para = doc.add_paragraph(style="Body Text")
                    _add_markdown_text_runs(para, block)
        return
    
    # Use split_blocks() - same as final article processing
    # split_blocks() handles "\n\n" splitting (matches final_article format: "\n\n".join(final_paragraphs))
    paragraphs = split_blocks(content)
    
    # Create block type map - use index from block_types or fallback to position
    # block_types come from final article generation with sequential indices matching paragraphs
    # IMPORTANT: block_types have sequential indices (0, 1, 2, ...) that match paragraph positions
    block_type_map = {}
    for i, bt in enumerate(block_types):
        # Use the index from block_type if present, otherwise use enumeration index
        map_key = bt.get("index") if bt.get("index") is not None else i
        block_type_map[map_key] = bt
    
    # Citation line pattern (e.g. "1. ", "2. ") for splitting citation/reference blocks
    _citation_line_pattern_word = re.compile(r'^\s*\d+\.\s+')

    # First pass: process each paragraph with block type formatting
    formatted_blocks = []
    for idx, block in enumerate(paragraphs):
        block = block.strip()
        if not block:
            continue

        # Citation/reference block: split into one paragraph per line so each has its own line,
        # and merge split URLs ("https:\n//" -> "https://") so links are full and clickable (like PDF)
        lines_in_block = [ln.strip() for ln in block.split('\n') if ln.strip()]
        citation_line_count = sum(1 for ln in lines_in_block if _citation_line_pattern_word.match(ln))
        if len(lines_in_block) >= 2 and citation_line_count >= 2:
            # Merge URL continuations so "https:" on one line + "//url" on next -> "https://url"
            block_merged = re.sub(r'https:\s*\n\s*//', 'https://', block)
            lines_merged = [ln.strip() for ln in block_merged.split('\n') if ln.strip()]
            for line in lines_merged:
                formatted_blocks.append({
                    'type': 'paragraph',
                    'content': line,
                    'level': 0,
                    'raw_content': line
                })
            continue

        # Get block_info - use index from enumerate to match block_types indices
        # block_types indices are sequential (0, 1, 2, ...) matching paragraph positions
        block_info = block_type_map.get(idx)
        if not block_info:
            logger.warning(f"[Export Word] No block_type found for index {idx}, defaulting to paragraph")
            block_info = {"type": "paragraph", "level": 0, "index": idx}
        
        block_type = block_info.get("type")
        if not block_type or block_type == "":
            logger.warning(f"[Export Word] Empty block_type for index {idx}, defaulting to paragraph")
            block_type = "paragraph"
        level = block_info.get("level", 0)
        
        # Skip title blocks - title is already on cover page, don't duplicate in content
        if block_type == "title":
            continue
        
        # Process list items: detect type and preserve original order
        # Check if this is a list item (bullet, number, or alpha)
        # Always detect from content, even if block_type says "bullet_item"
        list_type, detected_level = _detect_list_type(block, level)
        
        # Use level from block_types first, fallback to detected level
        final_level = level if level > 0 else detected_level
        
        if list_type != 'none' or block_type == "bullet_item":
            # This is a list item (detected or from block_type)
            # If detected as 'none' but block_type is "bullet_item", treat as bullet
            if list_type == 'none' and block_type == "bullet_item":
                list_type = 'bullet'
            
            parsed = parse_bullet(block)
            formatted_blocks.append({
                'type': 'list_item',
                'list_type': list_type,
                'content': block,
                'level': final_level,
                'raw_content': block,
                'parsed': parsed
            })
        else:
            formatted_blocks.append({
                'type': block_type,
                'content': block,
                'level': level,
                'raw_content': block
            })
    
    # Second pass: group consecutive list items and apply formatting
    current_list = []
    prev_list_type = None
    prev_block_type = None
    
    for i, block_info in enumerate(formatted_blocks):
        block_type = block_info['type']
        content = block_info['content']
        level = block_info.get('level', 0)
        next_block = formatted_blocks[i + 1] if i + 1 < len(formatted_blocks) else None
        
        if block_type == 'list_item' or block_type == 'bullet_item':
            list_type = block_info.get('list_type', 'bullet')
            
            # Reset numbering if previous block was a heading
            reset_numbering = (prev_block_type == 'heading')
            
            # If previous block was heading, close current list (if any) and start new one with reset
            if reset_numbering and current_list:
                ordered_list = _order_list_items(current_list)
                _add_list_to_document(doc, ordered_list, prev_list_type, reset_numbering=False)
                current_list = []
            
            # Check if we should start a new list (different type or level)
            if current_list:
                first_item_level = current_list[0].get('level', 0)
                if prev_list_type != list_type or first_item_level != level:
                    # Close current list and start new one
                    # Order list if needed (for numbered/alphabetical)
                    ordered_list = _order_list_items(current_list)
                    # Check if this list should reset numbering
                    should_reset = current_list[0].get('_reset_numbering', False) if current_list else False
                    _add_list_to_document(doc, ordered_list, prev_list_type, reset_numbering=should_reset)
                    current_list = []
            
            # Add to current list
            current_list.append(block_info)
            # Mark if this list should reset numbering (after heading)
            if reset_numbering and len(current_list) == 1:
                current_list[0]['_reset_numbering'] = True
            prev_list_type = list_type
            prev_block_type = 'list_item'
        else:
            # Close any open list before processing non-list block
            if current_list:
                # Order list if needed (for numbered/alphabetical)
                ordered_list = _order_list_items(current_list)
                _add_list_to_document(doc, ordered_list, prev_list_type, reset_numbering=False)
                current_list = []
                prev_list_type = None
            
            # Process non-list blocks (title blocks already skipped in first pass)
            if block_type == "heading":
                # Remove heading numbers if present
                clean_content = re.sub(r'^\d+[.)]\s+', '', content).strip()
                
                # Heading: Based on level (Heading 1-6), bold, font-weight 600 equivalent
                heading_level = min(max(level, 1), 6)
                style_name = f"Heading {heading_level}"
                p = doc.add_paragraph(style=style_name)
                
                # Remove numbering from heading
                p.paragraph_format.left_indent = DocxInches(0)
                # Clear any numbering
                pPr = p._p.get_or_add_pPr()
                numPr = pPr.find(qn('w:numPr'))
                if numPr is not None:
                    pPr.remove(numPr)
                
                run = p.add_run(sanitize_text_for_word(clean_content))
                run.bold = True
                # Set spacing: margin-top: 0.9em equivalent, margin-bottom: 0.2em equivalent
                p.paragraph_format.space_before = DocxPt(11)  # ~0.9em
                p.paragraph_format.space_after = DocxPt(2)     # ~0.2em
            
            elif block_type == "paragraph":
                # Paragraph: proper spacing with Body Text style (matches PDF)
                para = doc.add_paragraph(style="Body Text")
                _add_markdown_text_runs(para, content)
                
                # Apply Body Text style configuration
                _apply_body_text_style_word(para)
                
                # Set spacing to match PDF exactly
                para.paragraph_format.space_before = DocxPt(2)   # ~0.15em (matches PDF spaceBefore=2)
                para.paragraph_format.space_after = DocxPt(8)    # ~0.7em (matches PDF spaceAfter=8)
                # Reduce spacing if followed by list (matches PDF)
                if next_block and (next_block.get('type') == 'list_item' or next_block.get('type') == 'bullet_item'):
                    para.paragraph_format.space_after = DocxPt(3)  # ~0.25em (matches PDF spaceAfter=3)
                # Reduce spacing if following heading (matches PDF)
                if prev_block_type == 'heading':
                    para.paragraph_format.space_before = DocxPt(0)  # Matches PDF spaceBefore=0
            
            prev_block_type = block_type
    
    # Close any remaining list
    if current_list:
        # Order list if needed (for numbered/alphabetical)
        ordered_list = _order_list_items(current_list)
        # Check if this list should reset numbering (marked when started after heading)
        should_reset = current_list[0].get('_reset_numbering', False) if current_list else False
        _add_list_to_document(doc, ordered_list, prev_list_type, reset_numbering=should_reset, force_bullet_style=use_bullet_icons_only)

def export_to_word_edit_content(
    content: str,
    title: str,
    subtitle: str | None = None,
    references: list[dict] | None = None,
    block_types: list[dict] | None = None
) -> bytes:
    """
    PwC Word export specifically for Edit Content workflow.
    Uses block type information for proper formatting (title, heading, bullet_item, paragraph).
    Numbered and alphabetical lists (e.g. Citations and references) are rendered with numbers/letters; bullet lists use bullet icons.
    No Table of Contents is generated for edit content export.
    
    Content should be final_article format: plain text with "\n\n" separators (same as final article generation).
    block_types should match final article generation structure with sequential indices.
    """
    # Content should be plain text final_article (from backend final article generation)
    # Format: "\n\n".join(final_paragraphs) - same as final article generation
    # Safety check: convert HTML to plain text if somehow HTML is present
    if '<' in content and '>' in content:
        logger.warning("HTML detected in export content - converting to plain text. Content should be final_article (plain text).")
        content = html_to_marked_text(content)
    
    # Content and block_types come from backend final article generation - already aligned
    # split_blocks() handles "\n\n" splitting (same as final article processing)
    
    doc = Document(PWC_TEMPLATE_PATH) if os.path.exists(PWC_TEMPLATE_PATH) else Document()

    # ---------- Cover ----------
    clean_title = re.sub(r'\*+', '', title).strip()
    title_para = doc.paragraphs[0]
    _set_paragraph_text_with_breaks(title_para, sanitize_text_for_word(clean_title))

    # Remove footers and add page numbers only
    _set_footer_with_page_numbers_only(doc)
    
    
    # Apply PDF's dynamic font sizing logic (matches PDF exactly)
    title_font_size = 32  # Default
    if len(clean_title) > 80:
        title_font_size = 20
    elif len(clean_title) > 60:
        title_font_size = 22
    elif len(clean_title) > 40:
        title_font_size = 26
    
    # Set font size for all runs in the title paragraph
    for run in title_para.runs:
        run.font.size = DocxPt(title_font_size)
        run.bold = True
    
    # Set center alignment (matches PDF)
    title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # Set title style to "Page 1"
    try:
        title_para.style = "Page 1"
    except:
        # Fallback if style doesn't exist
        title_para.style = "Heading 1"
    _set_paragraph_text_with_breaks(doc.paragraphs[1], sanitize_text_for_word(subtitle or ""))

    # Remove everything after subtitle
    while len(doc.paragraphs) > 2:
        p = doc.paragraphs[-1]
        p._element.getparent().remove(p._element)

    _ensure_page_break_after_paragraph(doc.paragraphs[1])

    # ---------- Content with Block Types ----------
    references_heading_added = False
    
    # Check for references section
    if "references" in content.lower() or "references:" in content.lower():
        # Handle references separately
        parts = re.split(r'\n\n(?:references|references:)\s*\n\n', content, flags=re.IGNORECASE)
        main_content = parts[0] if parts else content
        
        _format_content_with_block_types_word(doc, main_content, block_types, use_bullet_icons_only=False)
        
        if len(parts) > 1:
            doc.add_paragraph("References", style="Heading 2")
            references_heading_added = True
            # Format references section
            _format_content_with_block_types_word(doc, parts[1], None, use_bullet_icons_only=False)
    else:
        _format_content_with_block_types_word(doc, content, block_types, use_bullet_icons_only=False)

    # ---------- References ----------
    if references:
        doc.add_page_break()
        if not references_heading_added:
            doc.add_paragraph("References", style="Heading 2")

        for idx, ref in enumerate(references, start=1):
            title_text = sanitize_text_for_word(ref.get("title", ""))
            para = doc.add_paragraph(style="Body Text")
            para.add_run(f"{idx}. {title_text}")
            if ref.get("url"):
                para.add_run(" ")
                url_norm = _normalize_citation_url_for_word(ref["url"])
                add_hyperlink(para, url_norm, url_norm)

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return _fix_docx_encoding(buffer.getvalue())

def _format_content_with_block_types_pdf(story: list, content: str, block_types: list[dict] | None = None, 
                                         body_style: ParagraphStyle = None, heading_style: ParagraphStyle = None,
                                         use_bullet_icons_only: bool = True):
    """
    Format content for PDF using block type information.
    Applies formatting similar to frontend formatFinalArticleWithBlockTypes.
    Groups consecutive bullet items, handles spacing, font sizes, and colors correctly.
    
    Content should be final_article format: plain text with "\n\n" separators.
    Uses split_blocks() to split content (same as final article processing).
    block_types should match final article generation structure with sequential indices.
    
    If use_bullet_icons_only is False (edit content export), numbered/alpha lists use numbers/letters; bullet lists use bullets.
    """
    from reportlab.lib.styles import getSampleStyleSheet
    styles = getSampleStyleSheet()
    
    if not body_style:
        body_style = ParagraphStyle(
            'PWCBody',
            parent=styles['BodyText'],
            fontSize=11,
            leading=16.5,  # 1.5 line spacing (11 * 1.5 = 16.5)
            alignment=TA_JUSTIFY,
            spaceAfter=6,  # Pre-set spacing
            spaceBefore=2,  # ~0.15em equivalent
            fontName='Helvetica'
        )
    
    if not heading_style:
        heading_style = ParagraphStyle(
            'PWCHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor='black',  # Changed from '#D04A02' (orange) to black
            spaceAfter=2,   # ~0.2em equivalent
            spaceBefore=11, # ~0.9em equivalent
            fontName='Helvetica-Bold'
        )
    
    # Title style (larger, bold, font-weight 700 equivalent)
    title_style = ParagraphStyle(
        'PWCTitle',
        parent=styles['Heading1'],
        fontSize=24,  # Larger than headings
        textColor='#D04A02',  # Orange color
        spaceAfter=4,   # ~0.35em equivalent
        spaceBefore=15, # ~1.25em equivalent
        fontName='Helvetica-Bold'
    )
    
    if not block_types:
        # Fallback to default formatting
        blocks = split_blocks(content)
        for block in blocks:
            if not block.strip():
                continue
            block = block.strip()
            
            if block.startswith('####'):
                text = block.replace('####', '').strip()
                text = _format_content_for_pdf(text)
                story.append(Paragraph(text, heading_style))
            elif block.startswith('###'):
                text = block.replace('###', '').strip()
                text = _format_content_for_pdf(text)
                story.append(Paragraph(text, heading_style))
            elif block.startswith('##'):
                text = block.replace('##', '').strip()
                text = _format_content_for_pdf(text)
                story.append(Paragraph(text, heading_style))
            elif block.startswith('#'):
                text = block.replace('#', '').strip()
                text = _format_content_for_pdf(text)
                story.append(Paragraph(text, heading_style))
            elif _is_bullet_list_block(block):
                bullet_items = _parse_bullet_items(block)
                list_items = [ListItem(Paragraph(_format_content_for_pdf(text), body_style)) for indent, text in bullet_items]
                story.append(
                    ListFlowable(
                        list_items,
                        bulletType='bullet',
                        bulletFontName='Helvetica',
                        bulletFontSize=11,
                        leftIndent=12,
                        bulletIndent=0,
                    )
                )
            else:
                para = Paragraph(_format_content_for_pdf(block), body_style)
                story.append(para)
        return
    
    # Use split_blocks() - same as final article processing
    # split_blocks() handles "\n\n" splitting (matches final_article format: "\n\n".join(final_paragraphs))
    paragraphs = split_blocks(content)
    
    # Create block type map - use index from block_types or fallback to position
    # IMPORTANT: block_types have sequential indices (0, 1, 2, ...) that match paragraph positions
    block_type_map = {}
    for i, bt in enumerate(block_types):
        # Use the index from block_type if present, otherwise use enumeration index
        map_key = bt.get("index") if bt.get("index") is not None else i
        block_type_map[map_key] = bt
    
    # Citation pattern: line starts with number and period (e.g. "1. ", "2. ")
    _citation_line_pattern = re.compile(r'^\s*\d+\.\s+')

    # First pass: process each paragraph with block type formatting
    formatted_blocks = []
    for idx, block in enumerate(paragraphs):
        block = block.strip()
        if not block:
            continue

        # If block has multiple lines that look like citations (1., 2., 3., ...),
        # split into one paragraph per line so each citation starts on its own line in PDF
        lines_in_block = [ln.strip() for ln in block.split('\n') if ln.strip()]
        citation_line_count = sum(1 for ln in lines_in_block if _citation_line_pattern.match(ln))
        if len(lines_in_block) >= 2 and citation_line_count >= 2:
            for line in lines_in_block:
                formatted_blocks.append({
                    'type': 'paragraph',
                    'content': line,
                    'level': 0,
                    'raw_content': line
                })
            continue

        # Get block_info - use index from enumerate to match block_types indices
        # block_types indices are sequential (0, 1, 2, ...) matching paragraph positions
        block_info = block_type_map.get(idx)
        if not block_info:
            block_info = {"type": "paragraph", "level": 0, "index": idx}
        
        # Get block_type - ensure it's not None or empty string
        block_type = block_info.get("type")
        if not block_type or block_type == "":
            block_type = "paragraph"
        level = block_info.get("level", 0)
        
        # Skip title blocks - title is already on cover page, don't duplicate in content
        if block_type == "title":
            continue
        
        # Process list items: detect type and preserve original order (same as Word)
        # Always detect from content, even if block_type says "bullet_item"
        list_type, detected_level = _detect_list_type(block, level)
        
        # Use level from block_types first, fallback to detected level
        final_level = level if level > 0 else detected_level
        
        if list_type != 'none' or block_type == "bullet_item":
            # This is a list item (detected or from block_type)
            # If detected as 'none' but block_type is "bullet_item", treat as bullet
            if list_type == 'none' and block_type == "bullet_item":
                list_type = 'bullet'
            
            parsed = parse_bullet(block)
            formatted_blocks.append({
                'type': 'list_item',
                'list_type': list_type,
                'content': block,
                'level': final_level,
                'raw_content': block,
                'parsed': parsed
            })
        else:
            formatted_blocks.append({
                'type': block_type,
                'content': block,
                'level': level,
                'raw_content': block
            })
    
    # Second pass: group consecutive list items and apply formatting (same as Word)
    current_list = []
    prev_list_type = None
    prev_block_type = None
    
    for i, block_info in enumerate(formatted_blocks):
        block_type = block_info['type']
        content = block_info['content']
        level = block_info.get('level', 0)
        next_block = formatted_blocks[i + 1] if i + 1 < len(formatted_blocks) else None
        
        if block_type == 'list_item' or block_type == 'bullet_item':
            list_type = block_info.get('list_type', 'bullet')
            
            # Reset numbering if previous block was a heading (same as Word)
            reset_numbering = (prev_block_type == 'heading')
            
            # If previous block was heading, close current list (if any) and start new one with reset
            if reset_numbering and current_list:
                ordered_list = _order_list_items(current_list, start_from=1)
                _add_list_to_pdf(story, ordered_list, prev_list_type, body_style, prev_block_type, next_block, start_from=1, use_bullet_icons_only=use_bullet_icons_only)
                current_list = []
            
            # Check if we should start a new list (different type or level)
            if current_list:
                first_item_level = current_list[0].get('level', 0)
                if prev_list_type != list_type or first_item_level != level:
                    # Close current list and start new one
                    # Order list if needed (for numbered/alphabetical)
                    # Check if this list should reset numbering
                    should_reset = current_list[0].get('_reset_numbering', False) if current_list else False
                    start_from_val = 1 if should_reset else 1
                    ordered_list = _order_list_items(current_list, start_from=start_from_val)
                    _add_list_to_pdf(story, ordered_list, prev_list_type, body_style, prev_block_type, next_block, start_from=start_from_val, use_bullet_icons_only=use_bullet_icons_only)
                    current_list = []
            
            # Add to current list
            current_list.append(block_info)
            # Mark if this list should reset numbering (after heading) - same as Word
            if reset_numbering and len(current_list) == 1:
                current_list[0]['_reset_numbering'] = True
            prev_list_type = list_type
            prev_block_type = 'list_item'
        else:
            # Close any open list before processing non-list block
            if current_list:
                # Order list if needed (for numbered/alphabetical)
                # Check if this list should reset numbering (marked when started after heading)
                should_reset = current_list[0].get('_reset_numbering', False) if current_list else False
                start_from_val = 1 if should_reset or prev_block_type == 'heading' else 1
                ordered_list = _order_list_items(current_list, start_from=start_from_val)
                _add_list_to_pdf(story, ordered_list, prev_list_type, body_style, prev_block_type, next_block, start_from=start_from_val, use_bullet_icons_only=use_bullet_icons_only)
                current_list = []
                prev_list_type = None
            
            # Process non-bullet blocks
            # Title blocks already skipped in first pass, so they won't reach here
            if block_type == "heading":
                # Remove heading numbers if present
                clean_content = re.sub(r'^\d+[.)]\s+', '', content).strip()
                
                # Heading: Based on level, bold, black color, font-weight 600 equivalent
                text = _format_content_for_pdf(clean_content)
                # Adjust font size based on level (14pt base, decrease slightly for higher levels)
                heading_font_size = max(12, 14 - (level - 1))
                level_heading_style = ParagraphStyle(
                    f'PWCHeading{level}',
                    parent=heading_style,
                    fontSize=heading_font_size,
                    textColor='black',  # Changed from '#D04A02' (orange) to black
                    spaceAfter=2,   # ~0.2em
                    spaceBefore=11, # ~0.9em
                    fontName='Helvetica-Bold'
                )
                story.append(Paragraph(text, level_heading_style))
            
            elif block_type == "paragraph":
                # Paragraph: proper spacing
                para_style = ParagraphStyle(
                    'PWCBodyPara',
                    parent=body_style,
                    spaceAfter=8,   # ~0.7em
                    spaceBefore=2,  # ~0.15em
                )
                # Reduce spacing if followed by bullet list
                if next_block and next_block['type'] == 'bullet_item':
                    para_style.spaceAfter = 3  # ~0.25em
                # Reduce spacing if following heading
                if prev_block_type == 'heading':
                    para_style.spaceBefore = 0
                
                para = Paragraph(_format_content_for_pdf(content), para_style)
                story.append(para)
            
            prev_block_type = block_type
    
    # Close any remaining list
    if current_list:
        # Order list if needed (for numbered/alphabetical)
        ordered_list = _order_list_items(current_list, start_from=1)
        _add_list_to_pdf(story, ordered_list, prev_list_type, body_style, prev_block_type, None, start_from=1, use_bullet_icons_only=use_bullet_icons_only)

def export_to_pdf_edit_content(
    content: str,
    title: str,
    subtitle: str | None = None,
    block_types: list[dict] | None = None
) -> bytes:
    """
    PwC PDF export specifically for Edit Content workflow.
    Uses block type information for proper formatting (title, heading, bullet_item, paragraph).
    Numbered and alphabetical lists (e.g. Citations and references) are rendered with numbers/letters; bullet lists use bullet icons.
    No Table of Contents is generated for edit content export.
    
    Content should be final_article format: plain text with "\n\n" separators (same as final article generation).
    block_types should match final article generation structure with sequential indices.
    """
    # Content should be plain text final_article (from backend final article generation)
    # Format: "\n\n".join(final_paragraphs) - same as final article generation
    # Safety check: convert HTML to plain text if somehow HTML is present
    if '<' in content and '>' in content:
        logger.warning("HTML detected in export content - converting to plain text. Content should be final_article (plain text).")
        content = html_to_marked_text(content)
    
    # Content and block_types come from backend final article generation - already aligned
    # split_blocks() handles "\n\n" splitting (same as final article processing)
    
    if not os.path.exists(PWC_PDF_TEMPLATE_PATH):
        return _generate_pdf_with_title_subtitle(content, title, subtitle)

    # ===== STEP 1: Create branded cover page =====
    from reportlab.pdfgen import canvas
    
    template_reader = PdfReader(PWC_PDF_TEMPLATE_PATH)
    template_page = template_reader.pages[0]
    
    page_width = float(template_page.mediabox.width)
    page_height = float(template_page.mediabox.height)
    
    # Create overlay with text
    overlay_buffer = io.BytesIO()
    c = canvas.Canvas(overlay_buffer, pagesize=(page_width, page_height))
    
    # Add title
    title_font_size = 32
    if len(title) > 80:
        title_font_size = 20
    elif len(title) > 60:
        title_font_size = 22
    elif len(title) > 40:
        title_font_size = 26
    
    c.setFont("Helvetica-Bold", title_font_size)
    c.setFillColor('#000000')
    title_y = page_height * 0.72
    
    max_title_width = page_width * 0.70
    char_width_at_font = (title_font_size / 20.0) * 10
    max_chars_per_line = int(max_title_width / char_width_at_font)
    max_chars_per_line = max(20, min(max_chars_per_line, 50))
    
    words = title.split()
    lines = []
    current_line = []
    
    for word in words:
        test_line = ' '.join(current_line + [word])
        if len(test_line) > max_chars_per_line:
            if current_line:
                lines.append(' '.join(current_line))
            current_line = [word]
        else:
            current_line.append(word)
    
    if current_line:
        lines.append(' '.join(current_line))
    
    if len(lines) > 1:
        line_height = title_font_size + 6
        start_y = title_y + (len(lines) - 1) * line_height / 2
        for i, line in enumerate(lines):
            c.drawCentredString(page_width / 2, start_y - (i * line_height), line)
    else:
        c.drawCentredString(page_width / 2, title_y, title)
    
    # Do not add subtitle for edit content PDF export (requirement)
    
    c.save()
    overlay_buffer.seek(0)
    
    # Merge overlay with template
    overlay_reader = PdfReader(overlay_buffer)
    overlay_page = overlay_reader.pages[0]
    template_page.merge_page(overlay_page)
    
    # ===== STEP 2: Create content pages with block types =====
    content_buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        content_buffer,
        pagesize=(page_width, page_height),
        topMargin=1*inch,
        bottomMargin=1*inch,
        leftMargin=1.1*inch,
        rightMargin=1*inch
    )
    
    styles = getSampleStyleSheet()
    
    body_style = ParagraphStyle(
        'PWCBody',
        parent=styles['BodyText'],
        fontSize=11,
        leading=16.5,  # 1.5 line spacing (11 * 1.5 = 16.5)
        alignment=TA_JUSTIFY,
        spaceAfter=6,  # Pre-set spacing
        spaceBefore=2,  # ~0.15em equivalent
        fontName='Helvetica'
    )
    
    heading_style = ParagraphStyle(
        'PWCHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor='black',  # Changed from '#D04A02' (orange) to black
        spaceAfter=2,   # ~0.2em equivalent
        spaceBefore=11, # ~0.9em equivalent
        fontName='Helvetica-Bold'
    )
    
    story = []
    _format_content_with_block_types_pdf(story, content, block_types, body_style, heading_style, use_bullet_icons_only=False)
    
    # Build the content PDF with page numbers at bottom (edit content only)
    doc.build(
        story,
        onFirstPage=_add_page_number_edit_content_pdf,
        onLaterPages=_add_page_number_edit_content_pdf
    )
    content_buffer.seek(0)
    
    # ===== STEP 3: Merge cover + content =====
    content_reader = PdfReader(content_buffer)
    writer = PdfWriter()
    
    # Add the branded cover page (Page 1)
    writer.add_page(template_page)
    logger.info("Added branded cover page")
    
    # Add all content pages (Page 2+)
    for page_num in range(len(content_reader.pages)):
        logger.info(f"Adding content page {page_num + 1}")
        writer.add_page(content_reader.pages[page_num])
    
    # Write final PDF
    output_buffer = io.BytesIO()
    writer.write(output_buffer)
    output_buffer.seek(0)
    
    result_bytes = output_buffer.getvalue()
    logger.info(f"PDF export complete: {len(writer.pages)} pages, {len(result_bytes)} bytes")
    
    return result_bytes

# ======================================

def _format_content_for_pdf_mi(text: str) -> str:
    """
    Format content for PDF by converting markdown-style formatting to HTML-like tags.
    Reportlab supports a subset of HTML/XML tags for styling.
    
    Converts:
    - **bold** to <b>bold</b>
    - *italic* to <i>italic</i>
    - [text](url) to <a href="url" color="blue">text</a>
    - https?://... to <a href="url" color="blue">url</a>
    - Normalizes all Unicode dash variants to standard hyphen for reliable PDF rendering
    """
    if not text:
        return text
    # text = re.sub(
    #     r'\[(\d+)\]\((https?://[^)]+)\)',
    #     r'<super><a href="\2">\1</a></super>',
    #     text
    # )
    text = re.sub(
    r'\[(\d+)\]\((https?://[^)]+)\)',
    r'<a href="\2"><super>[\1]</super></a>',
    text
)

    # First, handle special quotation marks and other problematic characters BEFORE processing HTML
    # This ensures they are replaced before being wrapped in HTML tags
    text = text.replace('\u201C', '"')  # Left double quotation mark
    text = text.replace('\u201D', '"')  # Right double quotation mark
    text = text.replace('\u2018', "'")  # Left single quotation mark
    text = text.replace('\u2019', "'")  # Right single quotation mark
    text = text.replace('\u2026', '...')  # Ellipsis
    text = text.replace('\u00AD', '')
    # Normalize stray bullet/square characters sometimes used as hyphens
    text = text.replace('■', '-')   # U+25A0
    text = text.replace('▪', '-')   # U+25AA
    text = text.replace('●', '-')   # U+25CF
    text = text.replace('•', '-')   # U+2022

    # Normalize all Unicode dash/hyphen variants to standard ASCII hyphen-minus (-)
    # This prevents ReportLab rendering issues with special Unicode characters
    # Must be done BEFORE HTML processing to avoid encoding issues

    # dash_variants = [
    #     '\u2010',  # Hyphen
    #     '\u2011',  # Non-breaking hyphen
    #     '\u2012',  # Figure dash
    #     '\u2013',  # En dash (–)
    #     '\u2014',  # Em dash (—)
    #     '\u2015',  # Horizontal bar
    #     '\u2212',  # Minus sign
    #     '\u058A',  # Armenian hyphen
    #     '\u05BE',  # Hebrew maqaf
    #     '\u1400',  # Canadian syllabics hyphen
    #     '\u1806',  # Mongolian todo soft hyphen
    #     '\u2E17',  # Double oblique hyphen
    #     '\u30A0',  # Katakana-hiragana double hyphen
    #     '\uFE58',  # Small em dash
    #     '\uFE63',  # Small hyphen-minus
    #     '\uFF0D',  # Fullwidth hyphen-minus
    # ]

    dash_variants = [
    # ASCII lookalikes / invisible troublemakers
    '\u00AD',  # Soft hyphen (invisible)

    # Unicode dash punctuation (Pd)
    '\u2010',  # Hyphen
    '\u2011',  # Non-breaking hyphen
    '\u2012',  # Figure dash
    '\u2013',  # En dash
    '\u2014',  # Em dash
    '\u2015',  # Horizontal bar
    '\u2E3A',  # Two-em dash
    '\u2E3B',  # Three-em dash
    '\u2E17',  # Double oblique hyphen

    # Mathematical minus
    '\u2212',  # Minus sign

    # Script-specific hyphens
    '\u058A',  # Armenian hyphen
    '\u05BE',  # Hebrew maqaf
    '\u1400',  # Canadian syllabics hyphen
    '\u1806',  # Mongolian todo soft hyphen
    '\u30A0',  # Katakana-hiragana double hyphen

    # Bullets / symbols sometimes misused as hyphens
    '\u2043',  # Hyphen bullet

    # Compatibility / presentation forms
    '\uFE58',  # Small em dash
    '\uFE63',  # Small hyphen-minus
    '\uFF0D',  # Fullwidth hyphen-minus
]

    for dash in dash_variants:
        text = text.replace(dash, '-')
    # =====SUPERSCRIPTS =====
    text = re.sub(r"\^(\d+)", r"<super>\1</super>", text)
    # ===== END SUPERSCRIPTS =====
    # Convert markdown links [text](url) to <a href="url" color="blue">text</a>
    text = re.sub(r'\[([^\]]+?)\]\(([^)]+?)\)', r'<a href="\2" color="blue">\1</a>', text)
    
    # Convert plain URLs to clickable links (but not those already inside HTML tags)
    # Match URLs that are not inside href= attributes or already converted
    # text = re.sub(r'(?<![="])(?<![a-zA-Z])(?<!href)(https?://[^\s)>\]]+)', r'<a href="\1" color="blue">\1</a>', text)
    text = re.sub(
    r'(?<!href=")(https?://[^\s)>\]]+)',
    r'<a href="\1" color="blue">\1</a>',
    text
    )

    # Convert **bold** to <b>bold</b>
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    
    # Convert *italic* to <i>italic</i> (but not if it's part of **bold** or at line start for bullets)
    # Use negative lookbehind/lookahead to avoid double-processing
    text = re.sub(r'(?<!\*)\*([^\*]+?)\*(?!\*)', r'<i>\1</i>', text)
    
    return text

def remove_paragraph_borders(paragraph):
    pPr = paragraph._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    for edge in ("top", "left", "bottom", "right", "between"):
        elem = OxmlElement(f"w:{edge}")
        elem.set(qn("w:val"), "nil")
        pBdr.append(elem)
    pPr.append(pBdr)

def export_to_word_pwc_no_toc(
    content: str,
    title: str,
    subtitle: str | None = None
) -> bytes:
    # 1. Load PwC template
    doc = Document(PWC_TEMPLATE_PATH) if os.path.exists(PWC_TEMPLATE_PATH) else Document()
    # ---- REMOVE ALL FOOTERS (PwC template cleanup) ----
    for section in doc.sections:
        footer = section.footer
        footer.is_linked_to_previous = False

        for p in footer.paragraphs:
            p.text = ""

        for table in footer.tables:
            for row in table.rows:
                for cell in row.cells:
                    cell.text = ""
    
    for section in doc.sections:
        footer = section.footer

        p = footer.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT

        run = p.add_run()

        fldChar1 = OxmlElement('w:fldChar')
        fldChar1.set(qn('w:fldCharType'), 'begin')

        instrText = OxmlElement('w:instrText')
        instrText.text = 'PAGE'

        fldChar2 = OxmlElement('w:fldChar')
        fldChar2.set(qn('w:fldCharType'), 'end')

        run._r.append(fldChar1)
        run._r.append(instrText)
        run._r.append(fldChar2)
    logger.info(f">>>TITLE AND SUBTITLE:{title}>>>>{subtitle}")
    _set_paragraph_text_with_breaks(doc.paragraphs[1], sanitize_text_for_word(subtitle or ""))
    # 2. Cover page (CLEAN)
    clean_title = re.sub(r'^[#\s]*', '', re.sub(r"\*+", "", title)).strip()
    if doc.paragraphs:
        doc.paragraphs[0].text = clean_title

    # REMOVE subtitle placeholder completely
    if len(doc.paragraphs) > 1:
        doc.paragraphs[1].text = ""
    logger.info(f">>>TITLE>>>>>>>>>>>:{clean_title}")
    
    while len(doc.paragraphs) > 2:
        p = doc.paragraphs[-1]
        p._element.getparent().remove(p._element)

    # Single page break after cover
    doc.add_page_break()
    # 3. Render generated content properly
    content = normalize_headings(content)
    # for raw_line in content.split("\n"):
    for raw_line in re.split(r"\n\s*\n", content):
        original_line = raw_line
        raw_line = re.sub(r"\*+", "", raw_line)
        line = raw_line.strip()
        # for line in raw_line.splitlines():
        if "|" in raw_line and "\n" in raw_line:
            rows = [
                r.strip()
                for r in raw_line.splitlines()
                if "|" in r and not re.match(r'^\s*\|?\s*-{3,}', r)
            ]

            if len(rows) < 2:
                continue
            table_data = [
                [re.sub(r"\*+", "", cell).strip()
                for cell in row.strip("|").split("|")]
                for row in rows
            ]

            table = doc.add_table(rows=len(table_data), cols=len(table_data[0]))
            table.autofit = True
            for i, row in enumerate(table_data):
                for j, cell in enumerate(row):
                    table.cell(i, j).text = cell

            doc.add_paragraph("", style="Body Text")
            continue            
        if re.match(r'^\s*\|?\s*-{3,}\s*\|?\s*$', raw_line):
            continue
        if (
            "style:" in line.lower()
            or line.lower().endswith("style")
            or line.lower() in {...}
        ):
            continue
        if re.fullmatch(r"\s*-{3,}\s*", raw_line):
            continue
        if raw_line.strip().startswith("|---"):
            continue
        # ---------- Headings ----------
        first_line = original_line.lstrip().splitlines()[0]
        # ---------- Handle bullet links under citation headings ----------
        # if first_line.lstrip().startswith(("###", "##")) and "-" in original_line:
            # for sub in original_line.splitlines()[1:]:
            #     sub = sub.strip()
            #     if sub.startswith("- http"):
            #         p = doc.add_paragraph(style="List Bullet")
            #         url = sub.lstrip("- ").strip()
            #         add_hyperlink_mi(p, url, url, bold=False)

        if first_line.lstrip().startswith("###"):
        # if original_line.lstrip().startswith("###"):
            # text = re.sub(r"^#+\s*", "", original_line)
            text = re.sub(r"^#+\s*", "", first_line)
            p = doc.add_heading(text.strip(), level=3)
            for run in p.runs:
                run.bold = True
                
            for sub in original_line.splitlines()[1:]:
                sub = sub.strip()
                # if sub.startswith("-"):
                if sub.lstrip().startswith("-"):

                    url = sub.lstrip("- ").strip()
                    if re.match(r'^(https?://|www\.)', url):
                # if sub.startswith("- http"):
                        bp = doc.add_paragraph(style="List Bullet")
                        # url = sub.lstrip("- ").strip()
                        add_hyperlink_mi(bp, url, url, bold=False)

            continue
        elif first_line.startswith("##"):
        # elif original_line.lstrip().startswith("##"):
            # text = re.sub(r"^#+\s*", "", original_line)
            text = re.sub(r"^#+\s*", "", first_line)
            p = doc.add_heading(text.strip(), level=2)
            for run in p.runs:
                run.bold = True
            for sub in original_line.splitlines()[1:]:
                sub = sub.strip()
                # if sub.startswith("-"):
                if sub.lstrip().startswith("-"):

                    url = sub.lstrip("- ").strip()
                    if re.match(r'^(https?://|www\.)', url):
                # if sub.startswith("- http"):
                        bp = doc.add_paragraph(style="List Bullet")
                        # url = sub.lstrip("- ").strip()
                        add_hyperlink_mi(bp, url, url, bold=False)

            continue
        elif first_line.startswith("#"):
        # elif original_line.lstrip().startswith("#"):
            # text = re.sub(r"^#+\s*", "", original_line)
            text = re.sub(r"^#+\s*", "", first_line)
            p = doc.add_heading(text.strip(), level=1)
            for run in p.runs:
                run.bold = True
            continue
           
        # Skip template style explanation text completely
        # REMOVE PwC style explanation content completely
        # REMOVE ALL PwC template / style description junk (pages 2–4 root cause)
        # logger.info(f"[LINE CHECK] RAW='{raw_line}' | LINE='{line}'")

        if (
            "style:" in line.lower()
            or line.lower().endswith("style")
            or line.lower() in {
                "heading 1 style",
                "heading 2 style",
                "heading 3 style",
                "heading 4 style",
                "chart header",
                "table header",
                "table text",
                "caption",
                "quote",
                "hyperlink followed hyperlink",
                "“",
                "”",
            }
            
            # or line.startswith(("•", "–"))
            # or (line.startswith(("•", "–")) and "http" not in line)
            or (line.startswith(("•", "–")) and not re.search(r'https?://', line, re.I))

        ):   
            # logger.warning(f"[SKIPPED] '{line}'")
            continue
       
        # logger.info(f"[HYPERLINK PARSE] '{line}'")

        if not line:
            continue  # avoid empty paragraphs → extra pages
        # if not first_line.lstrip().startswith("#"):
        line = re.sub(r"^#+\s*", "", line)
       
        # elif raw_line.lstrip().startswith(("-", "*")):
        handled_bullet = False
        lines = raw_line.splitlines()

        # FIRST line → bullet
        first = lines[0]
        # if first.lstrip().startswith(("•", "- ", "* ")):
        if re.match(r"^[\s•\-*]", first):

            handled_bullet = True
            text = re.sub(r'^[\s•–-]+', '', first).strip()

            p = doc.add_paragraph(style="List Bullet")
            p.paragraph_format.keep_together = True

            # clean = re.sub(r"\*+", "", text)
            # if ":" in clean:
            #     head, rest = clean.split(":", 1)
            #     r1 = p.add_run(head.strip() + ": ")
            #     r1.bold = True
            #     p.add_run(rest.strip())
            # else:
            #     p.add_run(clean)
            
            raw = text.strip()
            # FULLY bold bullet (matches UI)
            if re.match(r"^\*\*.+\*\*$", raw):
                run = p.add_run(re.sub(r"\*\*", "", raw))
                run.bold = True

            else:
                clean = re.sub(r"\*+", "", raw)
                if ":" in clean:
                    head, rest = clean.split(":", 1)
                    r1 = p.add_run(head.strip() + ": ")
                    r1.bold = True
                    p.add_run(rest.strip())
                else:
                    p.add_run(clean)

            # 🔑 render remaining lines normally
            for extra in lines[1:]:
                extra = extra.strip()
                if not extra:
                    continue
                bp = doc.add_paragraph("", style="Body Text")
                # tokens = re.split(r'(https?://[^\s]+)', extra + " ")
                tokens = re.split(r'((?:https?://)?(?:www\.)?\S+\.\S+)', extra + " ")

                for token in tokens:
                    # if token.startswith("http"):
                    # if re.match(r'^(https?://|www\.)', token):
                    if re.match(r'^(https?://|www\.|/)', token):
                        add_hyperlink_mi(bp, token, token, bold=False)
                    else:
                        bp.add_run(token)
        #  SAFETY: render any leftover non-empty lines
        # remaining = lines[1:]
        # for r in remaining:
        #     if r.strip():
        #         p = doc.add_paragraph(r.strip(), style="Body Text")
        # if handled_bullet:
        if handled_bullet and len(lines) == 1:
        # if handled_bullet and "http" not in raw_line:
        # if handled_bullet and not re.search(r'https?://', raw_line, re.I):
            continue

       

        # ---------- Citations / References ----------
        if re.match(r'^\s*(\[\d+\]|\d+\.)\s+', line):
            p = doc.add_paragraph(style="List Bullet")
            p.paragraph_format.keep_together = True

            # tokens = re.split(r'(https?://[^\s]+)', line + " ")
            # tokens = re.split(r'(https?://\S+)', line)
            tokens = re.split(r'((?:https?://)?(?:www\.)?\S+\.\S+)', line)


            for token in tokens:
                # if token.startswith("http"):
                if re.match(r'^(https?://|www\.)', token):

                    add_hyperlink_mi(p, token, token, bold=False)
                else:
                    p.add_run(token)

            remove_paragraph_borders(p)
            continue

        # ---------- Normal body text ----------
        else:
            p = doc.add_paragraph("", style="Body Text")
            # is_reference = bool(re.match(r'^(\[\d+\]|\d+\.)', line.strip()))
            is_reference = bool(
                re.match(r'^(\[\d+\]|\d+\.)', line.strip())
                or line.strip().startswith("http")
            )
            line = re.sub(r'^[\s•–-]+', '', line)
            # tokens = re.split(r'(https?://[^\s]+)', line)
            # tokens = re.split(r'(https?://[^\s]+)', line + " ")
            # tokens = [line]
            # tokens = re.split(r'(https?://[^\s]+)', line + " ")
            # tokens = re.split(r'(https?://\S+)', line)
            tokens = re.split(r'((?:https?://)?(?:www\.)?\S+\.\S+)', line)

            for token in tokens:
                # if token.startswith("http://") or token.startswith("https://"):
                # if re.match(r"https?://", token):
                # if token.startswith("http"):
                if re.match(r'^(https?://|www\.)', token):

                    add_hyperlink_mi(p, token, token,bold=not is_reference)
                else:
                    subparts = [token]
                    for sub in subparts:
                        parts = re.split(r"(\[\d+\]\([^)]+\))", sub)

                        for part in parts:
                            m = re.match(r"\[(\d+)\]\(([^)]+)\)", part)
                            if m:
                                num, url = m.groups()
                                add_superscript_hyperlink(p, f"[{num}]", url)
                            else:
                                p.add_run(part)

            remove_paragraph_borders(p)
    # 4. Save exactly like before
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return _fix_docx_encoding(buffer.getvalue())

def normalize_headings(content: str) -> str:
    lines = content.splitlines()
    out = []

    for line in lines:
        l = line.strip()

        # Convert numbered bold headings → markdown heading
        if re.match(r"^\*\*\d+\.\s+.+\*\*$", l):
            text = re.sub(r"^\*\*|\*\*$", "", l)
            text = re.sub(r"^\d+\.\s*", "", text)
            out.append(f"### {text}")
            continue
        # Bold-only headings (UI h3)
        if re.match(r"^\*\*[^*].+[^*]\*\*$", l):
            text = re.sub(r"^\*\*|\*\*$", "", l)
            out.append(f"### {text}")
            continue
        
        # Convert numbered plain headings
        if re.match(r"^\d+\.\s+[A-Z].+", l):
            text = re.sub(r"^\d+\.\s*", "", l)
            out.append(f"### {text}")
            continue

        out.append(line)

    return "\n".join(out)



