from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from app.features.export.schemas import ExportRequest
from app.common.export_utils import (
    export_to_pdf,
    export_to_pdf_pwc_no_toc,
    export_to_word_pwc_no_toc,
    export_to_word,
    export_to_word_with_metadata,
    export_to_word_ui_plain,
    export_to_text,
    extract_subtitle_from_content,
    export_to_pdf_with_pwc_template,
    export_to_pdf_with_pwc_template_with_bullets,
    export_to_pdf_edit_content,
    export_to_word_edit_content,
    html_to_marked_text,
)
from app.common.document_utils import extract_text_from_pdf, extract_text_from_docx,extract_text_from_txt, extract_text_from_pptx
from io import BytesIO
import logging
import re
from urllib.parse import quote
from app.common.export_utils import export_to_word_pwc_standalone
from app.services.auth_service import validate_jwt_token
from app.core.config import get_settings

router = APIRouter(prefix="/export", tags=["Export"], dependencies=[Depends(validate_jwt_token)])
logger = logging.getLogger(__name__)

@router.post("/word")
async def export_word(request: ExportRequest):
    """Export content to Word document using PwC template"""
    try:
        logger.info(f"[Export] Generating Word document: {request.title}")
        
        # Extract subtitle from first line of content if not provided
        subtitle = request.subtitle
        content = request.content
        content_type = request.content_type  # From request body (sent by frontend)
        
        logger.info(f"[Export] Content Type from request body: {content_type}")
        
        if not subtitle and content:
            extracted_subtitle, remaining_content = extract_subtitle_from_content(content)
            if extracted_subtitle:
                subtitle = extracted_subtitle
                content = remaining_content
                logger.info(f"[Export] Extracted subtitle from content: {subtitle[:50]}")
        
        # Clean subtitle by removing markdown asterisks
        if subtitle:
            subtitle = re.sub(r'\*\*(.+?)\*\*', r'\1', subtitle)
            subtitle = subtitle.replace('**', '')
        
        # For draft content, use subtitle as title and remove original title
        title = request.title
        if subtitle:
            # Use subtitle as the main title on the first page
            title = subtitle
            subtitle = None  # Clear subtitle so it doesn't appear twice
            logger.info(f"[Export] Using subtitle as title for draft content export")
        
        # Use enhanced export with metadata if content_type provided or subtitle extracted
        if content_type or subtitle:
            logger.info(f"[Export] ✓ Applying content_type '{content_type}' to Word document")
            word_bytes = export_to_word_with_metadata(
                content=content, 
                title=title,
                subtitle=subtitle,
                content_type=content_type
            )
        else:
            word_bytes = export_to_word(content, title)
        
        buffer = BytesIO(word_bytes)
        
        # Sanitize filename to remove special characters and properly encode
        safe_title = re.sub(r'[^\w\s\-]', '', request.title)  # Remove non-word chars except dash
        safe_title = re.sub(r'\s+', '_', safe_title)  # Replace spaces with underscores
        filename = f"{safe_title}.docx"
        
        # Use RFC 5987 encoding for the filename in Content-Disposition header
        encoded_filename = quote(filename, safe='')
        
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
        )
    except Exception as e:
        logger.error(f"[Export] Word export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ppt")
async def export_ppt(request: ExportRequest):
    """
    Export content to PPT using PlusDocs Slides template
    """
    try:
        settings = get_settings()
        logger.info(f"[Export] Generating PPT document: {request.title}")
        from app.features.ddc.services.slide_creation_service import PlusDocsClient
        template_id = settings.PLUSDOCS_TEMPLATE_ID
        API_TOKEN = settings.PLUSDOCS_API_TOKEN
        client = PlusDocsClient(API_TOKEN)
        download_url = client.create_and_wait(
            prompt=request.content,
            template_id=template_id,
            isImage=False
        )
        if not download_url:
            raise HTTPException(status_code=500, detail="PPT generation failed")
        return JSONResponse({
            "status": "success",
            "download_url": download_url
        })
    except Exception as e:
        logger.error(f"[Export] PPT export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pdf")
async def export_pdf(request: ExportRequest):
    """Export content to PDF document"""
    try:
        logger.info(f"[Export] Generating PDF document: {request.title}")
        
        pdf_bytes = export_to_pdf(request.content, request.title)
        buffer = BytesIO(pdf_bytes)
        
        # Sanitize filename to remove special characters and properly encode
        safe_title = re.sub(r'[^\w\s\-]', '', request.title)  # Remove non-word chars except dash
        safe_title = re.sub(r'\s+', '_', safe_title)  # Replace spaces with underscores
        filename = f"{safe_title}.pdf"
        
        # Use RFC 5987 encoding for the filename in Content-Disposition header
        encoded_filename = quote(filename, safe='')
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
        )
    except Exception as e:
        logger.error(f"[Export] PDF export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pdf-pwc")
async def export_pdf_pwc(request: ExportRequest):
    """Export content to PDF document using PwC template with logo and branding"""
    try:
        logger.info(f"[Export] Generating PDF document with PwC template: {request.title}")
        
        # Extract subtitle from first line of content if not provided
        subtitle = request.subtitle
        content = request.content
        
        if not subtitle and content:
            extracted_subtitle, remaining_content = extract_subtitle_from_content(content)
            if extracted_subtitle:
                subtitle = extracted_subtitle
                content = remaining_content
                logger.info(f"[Export] Extracted subtitle from content: {subtitle[:50]}")
        
        # Clean subtitle by removing markdown asterisks
        if subtitle:
            subtitle = re.sub(r'\*\*(.+?)\*\*', r'\1', subtitle)
            subtitle = subtitle.replace('**', '')
        
        # For draft content, use subtitle as title and remove original title
        title = request.title
        content_type = request.content_type  # From request body
        if subtitle:
            # Use subtitle as the main title on the cover page
            title = subtitle
            subtitle = None  # Clear subtitle so it doesn't appear twice
            logger.info(f"[Export] Using subtitle as title for draft content export")
        
        logger.info(f"[Export] Content Type from request body: {content_type}")
        
        # Generate PWC branded PDF
        pdf_bytes = export_to_pdf_with_pwc_template(
            content=content, 
            title=title,
            subtitle=subtitle,
            content_type=content_type
        )
        
        logger.info(f"[Export] PDF generated: {len(pdf_bytes)} bytes")
        
        # Create buffer and reset position
        buffer = BytesIO(pdf_bytes)
        buffer.seek(0)
        
        # Create proper filename with sanitization
        safe_title = re.sub(r'[^\w\s\-]', '', request.title)  # Remove non-word chars except dash
        safe_title = re.sub(r'\s+', '_', safe_title)  # Replace spaces with underscores
        filename = f"{safe_title}.pdf"
        encoded_filename = quote(filename, safe='')
        logger.info(f"[Export] Returning PDF with filename: {encoded_filename}")
        
        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
                "Content-Length": str(len(pdf_bytes))
            }
        )
    except Exception as e:
        logger.error(f"[Export] PDF-PWC export error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/text")
async def export_text(request: ExportRequest):
    """Export content to plain text file"""
    try:
        logger.info(f"[Export] Generating text file: {request.title}")
        
        content_with_title = f"{request.title}\n{'='*len(request.title)}\n\n{request.content}"
        text_bytes = export_to_text(content_with_title)
        buffer = BytesIO(text_bytes)
        
        # Sanitize filename to remove special characters and properly encode
        safe_title = re.sub(r'[^\w\s\-]', '', request.title)  # Remove non-word chars except dash
        safe_title = re.sub(r'\s+', '_', safe_title)  # Replace spaces with underscores
        filename = f"{safe_title}.txt"
        encoded_filename = quote(filename, safe='')
        
        return StreamingResponse(
            buffer,
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
        )
    except Exception as e:
        logger.error(f"[Export] Text export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/word-standalone")
async def export_word_pwc(request: ExportRequest):
    """
    Standalone Word export (PwC template)
    """
    return StreamingResponse(
        BytesIO(
            export_to_word_pwc_standalone(
                content=request.content,
                title=request.title,
                subtitle=request.subtitle,
                content_type=request.content_type,
                references=request.references
            )
        ),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )

@router.post("/pdf-pwc-bullets")
async def export_pdf_pwc_with_bullets(request: ExportRequest):
    """
    Standalone PDF export that supports bullet rendering.
    Does NOT impact existing pdf-pwc flow.
    """
    try:
        
        pdf_bytes = export_to_pdf_with_pwc_template_with_bullets(
            content=request.content,
            title=request.title,
            subtitle=request.subtitle
        )

        buffer = BytesIO(pdf_bytes)
        buffer.seek(0)

        # filename = f"{request.title}.pdf"
        filename = f"{safe_filename(request.title)}.pdf"
        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except Exception as e:
        logger.error("PDF-PWC-BULLETS export failed", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

def safe_filename(value: str) -> str:
    value = value.replace("“", '"').replace("”", '"')
    value = value.replace("‘", "'").replace("’", "'")
    value = re.sub(r"[^\w\-. ]", "", value)
    return value.strip()

@router.post("/extract-text", include_in_schema=True)
@router.post("/extract-text/", include_in_schema=True)
async def extract_text_from_file(file: UploadFile = File(...)):
    """
    Extract text from uploaded document (PDF, DOCX, TXT, MD).
    Extracts content from the document for editing.
    """
    try:
        logger.info(f"[Export] Extracting text from file: {file.filename}")
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename is required")
        
        file_content = await file.read()
        
        if not file_content:
            raise HTTPException(status_code=400, detail="File is empty")
        
        file_extension = file.filename.lower().split('.')[-1] if '.' in file.filename else ''
        
        if not file_extension:
            raise HTTPException(status_code=400, detail="File extension is required")
        
        extracted_text = ""
        
        # Extract content from document
        try:
            if file_extension == 'pdf':
                extracted_text = extract_text_from_pdf(file_content, max_chars=None)
            elif file_extension in ['docx', 'doc']:
                extracted_text = extract_text_from_docx(file_content, max_chars=None)
            elif file_extension in ['txt', 'md']:
                extracted_text = extract_text_from_txt(file_content, max_chars=None)
            elif file_extension in ['pptx', 'ppt']:
                extracted_text = extract_text_from_pptx(file_content, max_chars=None)
            elif file_extension in ['jpeg','png', 'jpg']:
                extracted_text = extract_text_from_image(file_content, file_extension, max_chars=None)
            elif file_extension in ['xlsx']:
                extracted_text = extract_text_from_xlsx(file_content, max_chars=None)
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_extension}")
        except HTTPException:
            raise
        except Exception as extraction_error:
            logger.error(f"[Export] Extraction failed for {file.filename}: {extraction_error}")
            raise HTTPException(status_code=500, detail=f"Failed to extract text from file: {str(extraction_error)}")
        
        if not extracted_text:
            logger.warning(f"[Export] No text extracted from {file.filename}")
            # Return empty string instead of error - some files might legitimately be empty
            return JSONResponse(content={"text": ""})
        
        logger.info(f"[Export] Successfully extracted {len(extracted_text)} characters from {file.filename}")
        
        return JSONResponse(content={"text": extracted_text})
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Export] Text extraction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/word-ui")
async def export_word_ui(request: ExportRequest):
    """
    UI-exact Word export (no template, no TOC)
    """
    try:
        word_bytes = export_to_word_ui_plain(
            content=request.content,
            title=request.title
        )

        buffer = BytesIO(word_bytes)
        filename = f"{re.sub(r'[^\\w\\s-]', '', request.title)}.docx"

        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        logger.error(f"UI Word export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/word-pwc-no-toc")
async def export_word_pwc_no_toc_api(request: ExportRequest):
    return StreamingResponse(
        BytesIO(
            export_to_word_pwc_no_toc(
                content=request.content,
                title=request.title,
                subtitle=request.subtitle,
                content_type=request.content_type,
                references=request.references
            )
        ),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename={safe_filename(request.title)}.docx"
        }
    )

@router.post("/pdf-pwc-no-toc")
async def export_pdf_pwc_no_toc_api(request: ExportRequest):
    pdf_bytes = export_to_pdf_pwc_no_toc(
        content=request.content,
        title=request.title,
        subtitle=request.subtitle
    )

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={safe_filename(request.title)}.pdf"
        }
    )
@router.post("/edit-content/word")
async def export_edit_content_word(request: ExportRequest):
    """Export edit content to Word document using PwC template"""
    try:
        logger.info(f"[Export] Generating Edit Content Word document: {request.title}")
        
        # Use formatted HTML content as-is from frontend (preserves HTML formatting)
        clean_content = request.content
        
        word_bytes = export_to_word_edit_content(
            content=clean_content,
            title=request.title,
            subtitle=request.subtitle,
            references=request.references
        )
        
        buffer = BytesIO(word_bytes)
        filename = f"{safe_filename(request.title)}.docx"
        
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        logger.error(f"[Export] Edit Content Word export error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/edit-content/pdf")
async def export_edit_content_pdf(request: ExportRequest):
    """Export edit content to PDF document using PwC template"""
    try:
        logger.info(f"[Export] Generating Edit Content PDF document: {request.title}")
        
        # Use formatted HTML content as-is from frontend (preserves HTML formatting)
        clean_content = request.content
        
        pdf_bytes = export_to_pdf_edit_content(
            content=clean_content,
            title=request.title,
            subtitle=request.subtitle
        )
        
        buffer = BytesIO(pdf_bytes)
        filename = f"{safe_filename(request.title)}.pdf"
        
        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(len(pdf_bytes))
            }
        )
    except Exception as e:
        logger.error(f"[Export] Edit Content PDF export error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/word-pwc-mi-module")
async def export_word_pwc_no_toc_module_api(request: ExportRequest):
    title = build_cover_title(
    module=normalize_module_name(request.content_type),
    client=request.client)
    return StreamingResponse(
        BytesIO(
            export_to_word_pwc_no_toc(
                content=request.content,
                title=title,
                subtitle=request.subtitle,
                content_type=request.content_type,
                references=request.references,
                client=request.client
            )
        ),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename={safe_filename(title)}.docx"
        }
    )

@router.post("/pdf-pwc-mi-module")
async def export_pdf_pwc_no_toc_module_api(request: ExportRequest):
    logger.info(f"[PDF API] client = received: {request.client}")
    title = build_cover_title(
        module=normalize_module_name(request.content_type),
    client=request.client
)

    pdf_bytes = export_to_pdf_pwc_no_toc(
        content=request.content,
        title=title,
        subtitle=request.subtitle,
        content_type=request.content_type,
        client=request.client
    )

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={safe_filename(title)}.pdf"
        }
    )

def get_router():
    """Get export router for mounting"""
    return router

def normalize_module_name(module: str) -> str:
    mapping = {
        "industry-insights": "Industry Insights",
        "industry_insights": "Industry Insights",
        "proposal-inputs":"Proposal Inputs",
        "pov": "Point of View",
        "prep-meet": "Client Preparation Meeting",
    }
    return mapping.get(module.lower(), module)
