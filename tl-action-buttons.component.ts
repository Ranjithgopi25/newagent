from pypdf import PdfReader
from docx import Document
import io
import logging
from typing import Optional
from collections import defaultdict
from pptx import Presentation
import base64
import pandas as pd
from io import BytesIO
from PIL import Image

logger = logging.getLogger(__name__)

# def extract_text_from_pdf(pdf_bytes: bytes, max_chars: Optional[int] = None) -> str:
#     """
#     Extract text from PDF file.
    
#     Args:
#         pdf_bytes: PDF file content as bytes
#         max_chars: Optional maximum characters limit (None = no limit, extracts all pages)
    
#     Returns:
#         Extracted text from all pages
#     """
#     try:
#         if not pdf_bytes:
#             logger.warning("Empty PDF file provided")
#             return ""
        
#         pdf_file = io.BytesIO(pdf_bytes)
#         reader = PdfReader(pdf_file)
#         text = ""
#         total_pages = len(reader.pages)
        
#         if total_pages == 0:
#             logger.warning("PDF file has no pages")
#             return ""
        
#         # Extract text from ALL pages
#         for page_num, page in enumerate(reader.pages, 1):
#             try:
#                 page_text = page.extract_text()
#                 if page_text:
#                     text += page_text
#             except Exception as page_error:
#                 logger.warning(f"Error extracting text from page {page_num}: {page_error}")
#                 continue  # Continue with next page instead of failing
            
#             # Only check limit if max_chars is specified
#             if max_chars and len(text) >= max_chars:
#                 logger.warning(f"PDF text extraction reached max_chars limit ({max_chars}) at page {page_num}/{total_pages}")
#                 break
        
#         # Apply truncation only if max_chars is specified
#         if max_chars:
#             text = text[:max_chars]
        
#         logger.info(f"Extracted {len(text)} characters from {total_pages} PDF pages")
#         return text
#     except Exception as e:
#         logger.error(f"Error extracting PDF text: {e}")
#         raise

def extract_text_from_pdf(pdf_bytes: bytes, max_chars: Optional[int] = None) -> str:
    try:
        if not pdf_bytes:
            logger.warning("Empty PDF file provided")
            return ""

        # Primary: pypdf
        try:
            pdf_file = io.BytesIO(pdf_bytes)
            reader = PdfReader(pdf_file)
            text = ""
            total_pages = len(reader.pages)

            if total_pages == 0:
                logger.warning("PDF file has no pages")
                return ""

            for page_num, page in enumerate(reader.pages, 1):
                try:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text
                except Exception as page_error:
                    logger.warning(f"Error extracting text from page {page_num}: {page_error}")
                    continue

                if max_chars and len(text) >= max_chars:
                    logger.warning(f"PDF text extraction reached max_chars limit ({max_chars}) at page {page_num}/{total_pages}")
                    break

            if max_chars:
                text = text[:max_chars]

            if text.strip():
                logger.info(f"Extracted {len(text)} characters from {total_pages} PDF pages using pypdf")
                return text

            logger.warning("pypdf returned no text, falling back to pymupdf")

        except Exception as pypdf_error:
            logger.warning(f"pypdf failed: {pypdf_error}, falling back to pymupdf")

        # Fallback: pymupdf
        import fitz
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
            if max_chars and len(text) >= max_chars:
                break

        if max_chars:
            text = text[:max_chars]

        logger.info(f"Extracted {len(text)} characters using pymupdf fallback")
        return text

    except Exception as e:
        logger.error(f"Error extracting PDF text: {e}")
        raise

def extract_text_from_docx(docx_bytes: bytes, max_chars: Optional[int] = None) -> str:
    """
    Extract text from DOCX file.
    
    Args:
        docx_bytes: DOCX file content as bytes
        max_chars: Optional maximum characters limit (None = no limit, extracts all content)
    
    Returns:
        Extracted text from all paragraphs
    """
    try:
        if not docx_bytes:
            logger.warning("Empty DOCX file provided")
            return ""

        def _get_list_info(para) -> tuple[bool, bool, str]:
            style_name = (para.style.name or "").lower() if para.style else ""
            p_pr = para._p.pPr
            num_pr = p_pr.numPr if p_pr is not None else None

            if num_pr is not None and num_pr.numId is not None:
                num_id = num_pr.numId.val
                ilvl = num_pr.ilvl.val if num_pr.ilvl is not None else 0
                is_numbered = "bullet" not in style_name
                return True, is_numbered, f"numid:{num_id}:level:{ilvl}"

            if "bullet" in style_name:
                return True, False, f"style:{style_name}"
            if "number" in style_name or "list" in style_name:
                return True, True, f"style:{style_name}"

            return False, False, ""

        doc = Document(io.BytesIO(docx_bytes))
        paragraphs: list[str] = []
        list_counters: defaultdict[str, int] = defaultdict(int)

        for para in doc.paragraphs:
            para_text = para.text.strip()
            if not para_text:
                continue

            is_list, is_numbered, list_key = _get_list_info(para)
            first_char = para_text[0]
            has_explicit_bullet = first_char in {"•", "-", "*"}
            cleaned_text = para_text[2:].strip() if has_explicit_bullet and len(para_text) > 1 else para_text
            if is_list:
                if is_numbered:
                    list_counters[list_key] += 1
                    paragraphs.append(f"{list_counters[list_key]}. {cleaned_text}")
                else:
                    marker = first_char if has_explicit_bullet else "-"
                    paragraphs.append(f"{marker} {cleaned_text}")
            else:
                paragraphs.append(para_text)

        text = "\n".join(paragraphs)
        
        if not text:
            logger.warning("DOCX file contains no text content")
            return ""
        
        # Apply truncation only if max_chars is specified
        if max_chars and len(text) > max_chars:
            logger.warning(f"DOCX text extraction truncated to max_chars limit ({max_chars})")
            text = text[:max_chars]
        
        logger.info(f"Extracted {len(text)} characters from DOCX file ({len(paragraphs)} paragraphs)")
        return text
    except Exception as e:
        logger.error(f"Error extracting DOCX text: {e}")
        raise

def extract_text_from_xlsx(xlsx_bytes: bytes, max_chars: Optional[int] = None) -> str:
    """
    Extract text from xslx file.
    
    Args:
        docx_bytes: xlsx file content as bytes
        max_chars: Optional maximum characters limit (None = no limit, extracts all content)
    
    Returns:
        Extracted text from all sheets
    """
    try:
        if not xlsx_bytes:
            logger.warning("Empty xlsx file provided")
            return ""
        # chart_data_file_bytes = await xlsx_bytes.read()

        chart_data_file_bytes = xlsx_bytes

        sheets = pd.read_excel(BytesIO(chart_data_file_bytes), sheet_name=None, engine="openpyxl")
        raw_text_chart = "".join(f"=== {name} ===\n{df.to_csv(index=False)}" for name, df in sheets.items())    
                
        logger.info(f"Extracted following data from xlsx file {raw_text_chart}")
        return "<xlsx_data>"+raw_text_chart+"</xlsx_data>"
    
    except Exception as e:
        logger.error(f"Error extracting xlsx text: {e}")
        raise

# def extract_text_from_image(image_bytes: bytes, file_extension: str, max_chars: Optional[int] = None) -> str:
#     """
#     Extract text from image file.
    
#     Args:
#         docx_bytes: image file content as bytes
#         max_chars: Optional maximum characters limit (None = no limit, extracts all content)
    
#     Returns:
#         Extracted image bytes
#     """
#     try:
#         if not image_bytes:
#             logger.warning("Empty image file provided")
#             return ""
        
#         img_bytes = base64.b64encode(image_bytes).decode("utf-8")    
        
#         #logger.info(f"Extracted image encoded data {img_bytes}")
#         char_count = len(img_bytes)

#         logger.info(f"Extracted image encoded data char count {char_count}")

#         return "<image_data>"+img_bytes+"<image_ext>"+file_extension
#     except Exception as e:
#         logger.error(f"Error extracting image data: {e}")
#         raise
def extract_text_from_image(image_bytes: bytes, file_extension: str, max_chars: Optional[int] = None) -> str:
    """
    Extract text from image file.
    
    Args:
        docx_bytes: image file content as bytes
        max_chars: Optional maximum characters limit (None = no limit, extracts all content)
    
    Returns:
        Extracted image bytes
    """
    try:
        if not image_bytes:
            logger.warning("Empty image file provided")
            return ""
        logger.info(f"We are here")
        # img_bytes = base64.b64encode(image_bytes).decode("utf-8")    
        
        # #logger.info(f"Extracted image encoded data {img_bytes}")
        # char_count = len(img_bytes)

        # logger.info(f"Extracted image encoded data char count {char_count}")

        # Optional: resize image to reduce size (helps with token limits)
        img = Image.open(io.BytesIO(image_bytes))
        max_dimension = 1024  # adjust to reduce size
        img.thumbnail((max_dimension, max_dimension))
        buffered = io.BytesIO()
        img.save(buffered, format=img.format)
        resized_bytes = buffered.getvalue()
        
        # Convert to Base64
        img_b64 = base64.b64encode(resized_bytes).decode("utf-8")
        
        # Truncate if needed
        if max_chars:
            img_b64 = img_b64[:max_chars]

        return "<image_data>"+img_b64+"<image_ext>"+file_extension
    except Exception as e:
        logger.error(f"Error extracting image data: {e}")
        raise

def extract_text_from_txt(txt_bytes: bytes, max_chars: Optional[int] = None) -> str:
    """
    Extract text from TXT file.
    
    Args:
        txt_bytes: TXT file content as bytes
        max_chars: Optional maximum characters limit (None = no limit, extracts all content)
    
    Returns:
        Extracted text from file
    """
    try:
        # Try UTF-8 first, fallback to other encodings if needed
        try:
            text = txt_bytes.decode('utf-8')
        except UnicodeDecodeError:
            # Fallback to latin-1 which can decode any byte sequence
            logger.warning("UTF-8 decoding failed, trying latin-1 fallback")
            text = txt_bytes.decode('latin-1')
        
        # Apply truncation only if max_chars is specified
        if max_chars and len(text) > max_chars:
            logger.warning(f"TXT text extraction truncated to max_chars limit ({max_chars})")
            text = text[:max_chars]
        
        logger.info(f"Extracted {len(text)} characters from TXT file")
        return text
    except Exception as e:
        logger.error(f"Error extracting TXT text: {e}")
        raise



def extract_text_from_pptx(pptx_bytes: bytes, max_chars: Optional[int] = None) -> str:
    """
    Extract text from PPTX file.
    
    Args:
        pptx_bytes: PPTX file content as bytes
        max_chars: Optional maximum characters limit (None = no limit, extracts all content)
    
    Returns:
        Extracted text from all slides
    """
    try:
        if not pptx_bytes:
            logger.warning("Empty PPTX file provided")
            return ""
        
        prs = Presentation(io.BytesIO(pptx_bytes))
        text = ""
        total_slides = len(prs.slides)
        
        if total_slides == 0:
            logger.warning("PPTX file has no slides")
            return ""
        
        # Extract text from all slides
        for slide_num, slide in enumerate(prs.slides, 1):
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text.strip():
                    text += shape.text + "\n"
            
            # Only check limit if max_chars is specified
            if max_chars and len(text) >= max_chars:
                logger.warning(f"PPTX text extraction reached max_chars limit ({max_chars}) at slide {slide_num}/{total_slides}")
                break
        
        # Apply truncation only if max_chars is specified
        if max_chars:
            text = text[:max_chars]
        
        logger.info(f"Extracted {len(text)} characters from {total_slides} PPTX slides")
        return text
    except Exception as e:
        logger.error(f"Error extracting PPTX text: {e}")
        raise
