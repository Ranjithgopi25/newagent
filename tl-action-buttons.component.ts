"""
SharePoint Export Service  (v3)
================================
FastAPI + LangGraph + Microsoft Graph API

Two independent flows:

① GENERATE + EXPORT  →  POST /api/export
    Accepts raw data, generates file (json|csv|xlsx|word|pdf|ppt),
    optionally stores in SharePoint, always returns the file as download.

② STORE EXISTING FILE  →  POST /api/store-to-sharepoint          ← NEW
    The file already exists on the client (previously downloaded as
    pdf / pptx / docx / xlsx etc.).  Accepts it as multipart/form-data.
    Skips generation entirely — goes straight to:
        Authenticate → Resolve user → Ensure folder →
        Upload existing bytes → Grant user-only read permission →
        Return share link + web URL.

UI Actions (SharePoint path, both flows):
    Open      → window.open(web_url)
    Copy Link → clipboard ← share_url  (user-scoped, read-only)
    Share     → show share_url with "Only you" badge
"""

import io
import os
import json
import csv
import re
import uuid as _uuid_lib
from datetime import datetime
from typing import Any, Optional

import msal
import httpx
import openpyxl
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Response, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langgraph.graph import StateGraph, END
from typing import TypedDict

# ── optional heavy-document deps (word / pdf / ppt) ──────────────────────────
try:
    from docx import Document as DocxDocument
    _HAS_DOCX = True
except ImportError:
    _HAS_DOCX = False

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib import colors
    _HAS_PDF = True
except ImportError:
    _HAS_PDF = False

try:
    from pptx import Presentation
    from pptx.util import Inches, Pt
    _HAS_PPTX = True
except ImportError:
    _HAS_PPTX = False

load_dotenv()

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

TENANT_ID     = os.getenv("TENANT_ID")
CLIENT_ID     = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
SITE_ID       = os.getenv("SHAREPOINT_SITE_ID")
ROOT_FOLDER   = os.getenv("SHAREPOINT_ROOT_FOLDER", "Exports")
DRIVE_ID      = os.getenv("SHAREPOINT_DRIVE_ID", "")

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
AUTHORITY  = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPE      = ["https://graph.microsoft.com/.default"]

# MIME lookup by file extension
_MIME_BY_EXT = {
    "json":  "application/json",
    "csv":   "text/csv",
    "xlsx":  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "docx":  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "pdf":   "application/pdf",
    "pptx":  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    # friendly aliases for the generate flow
    "word":  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "ppt":   "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}

_EXT_MAP = {
    "json": "json",
    "csv":  "csv",
    "xlsx": "xlsx",
    "word": "docx",
    "pdf":  "pdf",
    "ppt":  "pptx",
}

_EXPOSE_HEADERS = (
    "X-SharePoint-Url, X-SharePoint-ItemId, X-SharePoint-FolderItemId, "
    "X-SharePoint-WebUrl, X-SharePoint-Folder, X-User-DisplayName"
)


# ─────────────────────────────────────────────────────────────────────────────
# AUTHENTICATION
# ─────────────────────────────────────────────────────────────────────────────

_msal_app = msal.ConfidentialClientApplication(
    client_id=CLIENT_ID,
    client_credential=CLIENT_SECRET,
    authority=AUTHORITY,
)


def get_access_token() -> str:
    token = _msal_app.acquire_token_silent(scopes=SCOPE, account=None)
    if not token:
        token = _msal_app.acquire_token_for_client(scopes=SCOPE)
    if "access_token" not in token:
        raise RuntimeError(f"Auth failed: {token.get('error_description', token.get('error'))}")
    return token["access_token"]


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _drive_url() -> str:
    if DRIVE_ID:
        return f"{GRAPH_BASE}/sites/{SITE_ID}/drives/{DRIVE_ID}"
    return f"{GRAPH_BASE}/sites/{SITE_ID}/drive"


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _safe_name(s: str) -> str:
    """Strip characters SharePoint folder/file names disallow."""
    return re.sub(r'[\\/:*?"<>|#%]', "_", s).strip()


def _mime_for_filename(filename: str) -> str:
    """Derive MIME type from a file's extension."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return _MIME_BY_EXT.get(ext, "application/octet-stream")


# ─────────────────────────────────────────────────────────────────────────────
# FILE GENERATOR — used only by /api/export (generate-then-store flow)
# ─────────────────────────────────────────────────────────────────────────────

def generate_file(data: Any, fmt: str) -> tuple[io.BytesIO, str]:
    fmt = fmt.lower()

    if fmt == "json":
        content = json.dumps(data, indent=2, default=str)
        return io.BytesIO(content.encode("utf-8")), _MIME_BY_EXT["json"]

    if fmt == "csv":
        if not isinstance(data, list) or not data:
            raise ValueError("CSV requires a non-empty list of dicts")
        out = io.StringIO()
        writer = csv.DictWriter(out, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        return io.BytesIO(out.getvalue().encode("utf-8")), _MIME_BY_EXT["csv"]

    if fmt == "xlsx":
        if not isinstance(data, list) or not data:
            raise ValueError("XLSX requires a non-empty list of dicts")
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Export"
        hdrs = list(data[0].keys())
        ws.append(hdrs)
        for row in data:
            ws.append([row.get(h) for h in hdrs])
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return buf, _MIME_BY_EXT["xlsx"]

    if fmt == "word":
        if not _HAS_DOCX:
            raise RuntimeError("python-docx not installed. Add 'python-docx' to requirements.txt")
        doc = DocxDocument()
        doc.add_heading("Export", 0)
        if isinstance(data, list) and data and isinstance(data[0], dict):
            hdrs = list(data[0].keys())
            tbl = doc.add_table(rows=1, cols=len(hdrs))
            tbl.style = "Light Grid Accent 1"
            for i, h in enumerate(hdrs):
                tbl.cell(0, i).text = str(h)
            for row in data:
                cells = tbl.add_row().cells
                for i, h in enumerate(hdrs):
                    cells[i].text = str(row.get(h, ""))
        else:
            doc.add_paragraph(json.dumps(data, indent=2, default=str))
        buf = io.BytesIO()
        doc.save(buf)
        buf.seek(0)
        return buf, _MIME_BY_EXT["word"]

    if fmt == "pdf":
        if not _HAS_PDF:
            raise RuntimeError("reportlab not installed. Add 'reportlab' to requirements.txt")
        buf = io.BytesIO()
        styles = getSampleStyleSheet()
        doc_pdf = SimpleDocTemplate(buf, pagesize=letter)
        elements = [Paragraph("Export", styles["Title"]), Spacer(1, 12)]
        if isinstance(data, list) and data and isinstance(data[0], dict):
            hdrs   = list(data[0].keys())
            tdata  = [hdrs] + [[str(row.get(h, "")) for h in hdrs] for row in data]
            t = Table(tdata, repeatRows=1)
            t.setStyle(TableStyle([
                ("BACKGROUND",    (0, 0), (-1, 0),  colors.HexColor("#2E5FA3")),
                ("TEXTCOLOR",     (0, 0), (-1, 0),  colors.white),
                ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
                ("GRID",          (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, colors.HexColor("#EEF2FA")]),
            ]))
            elements.append(t)
        else:
            elements.append(Paragraph(json.dumps(data, default=str), styles["BodyText"]))
        doc_pdf.build(elements)
        buf.seek(0)
        return buf, _MIME_BY_EXT["pdf"]

    if fmt == "ppt":
        if not _HAS_PPTX:
            raise RuntimeError("python-pptx not installed. Add 'python-pptx' to requirements.txt")
        prs = Presentation()
        title_slide = prs.slides.add_slide(prs.slide_layouts[0])
        title_slide.shapes.title.text = "Export"
        title_slide.placeholders[1].text = datetime.now().strftime("%Y-%m-%d %H:%M")
        if isinstance(data, list) and data and isinstance(data[0], dict):
            hdrs = list(data[0].keys())
            for idx in range(0, len(data), 10):
                chunk = data[idx:idx + 10]
                slide = prs.slides.add_slide(prs.slide_layouts[1])
                slide.shapes.title.text = f"Data (rows {idx + 1}–{idx + len(chunk)})"
                tf = slide.placeholders[1].text_frame
                tf.text = "  |  ".join(hdrs)
                for row in chunk:
                    p = tf.add_paragraph()
                    p.text = "  |  ".join(str(row.get(h, "")) for h in hdrs)
        else:
            slide = prs.slides.add_slide(prs.slide_layouts[1])
            slide.shapes.title.text = "Data"
            slide.placeholders[1].text = json.dumps(data, indent=2, default=str)[:1000]
        buf = io.BytesIO()
        prs.save(buf)
        buf.seek(0)
        return buf, _MIME_BY_EXT["ppt"]

    raise ValueError(f"Unsupported format '{fmt}'. Use: json, csv, xlsx, word, pdf, ppt")


# ─────────────────────────────────────────────────────────────────────────────
# SHAREPOINT — USER INFO
# ─────────────────────────────────────────────────────────────────────────────

async def fetch_user_display_name(token: str, user_id: str) -> str:
    url = f"{GRAPH_BASE}/users/{user_id}?$select=displayName"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_auth_header(token), timeout=15.0)
    return resp.json().get("displayName", user_id) if resp.is_success else user_id


# ─────────────────────────────────────────────────────────────────────────────
# SHAREPOINT — FOLDER MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

async def ensure_folder_path(token: str, folder_path: str) -> str:
    """
    Walks folder_path segment by segment, creating missing folders.
    Returns the item ID of the deepest (leaf) folder.
    Example: "Exports/John Smith/uuid-here/2024-Q1"
    """
    segments = [s for s in folder_path.split("/") if s]
    hdrs     = {**_auth_header(token), "Content-Type": "application/json"}
    parent   = "root"

    async with httpx.AsyncClient() as client:
        for seg in segments:
            check = (
                f"{_drive_url()}/items/{parent}/children"
                f"?$filter=name eq '{seg}'&$select=id,name"
            )
            resp     = await client.get(check, headers=_auth_header(token), timeout=15.0)
            existing = resp.json().get("value", []) if resp.is_success else []

            if existing:
                parent = existing[0]["id"]
            else:
                cr = await client.post(
                    f"{_drive_url()}/items/{parent}/children",
                    headers=hdrs,
                    json={"name": seg, "folder": {}, "@microsoft.graph.conflictBehavior": "rename"},
                    timeout=20.0,
                )
                if not cr.is_success:
                    raise RuntimeError(f"Could not create folder '{seg}': {cr.text}")
                parent = cr.json()["id"]

    return parent


# ─────────────────────────────────────────────────────────────────────────────
# SHAREPOINT — UPLOAD
# ─────────────────────────────────────────────────────────────────────────────

async def upload_to_sharepoint(
    token: str,
    buffer: io.BytesIO,
    file_name: str,
    mime_type: str,
    folder_item_id: str,
) -> dict:
    """
    Simple PUT upload (≤ 4 MB). Returns the created driveItem dict.
    """
    url = f"{_drive_url()}/items/{folder_item_id}:/{file_name}:/content"
    buffer.seek(0)
    async with httpx.AsyncClient() as client:
        resp = await client.put(
            url,
            headers={**_auth_header(token), "Content-Type": mime_type},
            content=buffer.read(),
            timeout=60.0,
        )
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Upload failed [{resp.status_code}]: {resp.text}")
    return resp.json()


# ─────────────────────────────────────────────────────────────────────────────
# SHAREPOINT — USER-ONLY PERMISSION + SCOPED LINK
# ─────────────────────────────────────────────────────────────────────────────

async def grant_folder_permission_to_user(token: str, folder_item_id: str, user_id: str) -> None:
    """
    Grants read-only access on the folder to user_id ONLY via direct /invite.
    No email is sent. Idempotent — 409 (already has access) is fine.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{_drive_url()}/items/{folder_item_id}/invite",
            headers={**_auth_header(token), "Content-Type": "application/json"},
            json={
                "requireSignIn":  True,
                "sendInvitation": False,
                "roles":          ["read"],
                "recipients":     [{"objectId": user_id}],
                "message":        "",
            },
            timeout=30.0,
        )
    if not resp.is_success and resp.status_code != 409:
        raise RuntimeError(
            f"Folder permission grant failed [{resp.status_code}]: {resp.text}"
        )


async def create_user_scoped_file_link(token: str, file_item_id: str, user_id: str) -> str:
    """
    Creates a sharing link with scope="users" then patches it to only
    allow user_id. Falls back to direct webUrl if tenant disallows user-scope links.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{_drive_url()}/items/{file_item_id}/createLink",
            headers={**_auth_header(token), "Content-Type": "application/json"},
            json={"type": "view", "scope": "users"},
            timeout=30.0,
        )

        if not resp.is_success:
            # Tenant doesn't support users-scope — fall back to direct webUrl
            fb = await client.get(
                f"{_drive_url()}/items/{file_item_id}?$select=webUrl",
                headers=_auth_header(token), timeout=15.0,
            )
            return fb.json().get("webUrl", "") if fb.is_success else ""

        link_data     = resp.json()
        share_url     = link_data["link"]["webUrl"]
        permission_id = link_data.get("id")

        if permission_id:
            await client.patch(
                f"{_drive_url()}/items/{file_item_id}/permissions/{permission_id}",
                headers={**_auth_header(token), "Content-Type": "application/json"},
                json={
                    "link": {"scope": "users", "type": "view"},
                    "grantedToIdentitiesV2": [
                        {
                            "user":     {"id": user_id},
                            "siteUser": {"loginName": f"i:0#.f|membership|{user_id}"},
                        }
                    ],
                },
                timeout=30.0,
            )

    return share_url


# ─────────────────────────────────────────────────────────────────────────────
# SHARED CORE — resolve user → folder → upload → grant → link
# Called by BOTH the LangGraph node AND the direct store endpoint.
# ─────────────────────────────────────────────────────────────────────────────

async def store_buffer_to_sharepoint(
    token     : str,
    buffer    : io.BytesIO,
    file_name : str,
    mime_type : str,
    user_id   : str,
    timeframe : Optional[str],
) -> dict:
    """
    Full SharePoint storage pipeline for an already-generated buffer.

    Returns:
        display_name, folder_path, folder_item_id,
        item_id, web_url, share_url
    """
    # 1 — resolve display name
    display_name = await fetch_user_display_name(token, user_id)

    # 2 — build + ensure folder:  ROOT/<display_name>/<user_id>/<timeframe>/
    user_safe      = _safe_name(display_name)
    user_uuid      = _safe_name(user_id)
    tf             = _safe_name(timeframe or datetime.now().strftime("%Y-%m"))
    folder_path    = f"{ROOT_FOLDER}/{user_safe}/{user_uuid}/{tf}"
    folder_item_id = await ensure_folder_path(token, folder_path)

    # 3 — upload
    item    = await upload_to_sharepoint(token, buffer, file_name, mime_type, folder_item_id)
    item_id = item["id"]
    web_url = item.get("webUrl", "")

    # 4 — grant user-only read on the folder
    await grant_folder_permission_to_user(token, folder_item_id, user_id)

    # 5 — user-scoped link on the file
    share_url = await create_user_scoped_file_link(token, item_id, user_id)

    return {
        "display_name":   display_name,
        "folder_path":    folder_path,
        "folder_item_id": folder_item_id,
        "item_id":        item_id,
        "web_url":        web_url,
        "share_url":      share_url,
    }


# ─────────────────────────────────────────────────────────────────────────────
# LANGGRAPH — EXPORT STATE MACHINE  (generate-then-store flow only)
# ─────────────────────────────────────────────────────────────────────────────

class ExportState(TypedDict):
    store_in_sharepoint : bool
    file_format         : str
    file_name           : str
    data                : Any
    user_id             : Optional[str]
    timeframe           : Optional[str]
    buffer              : Optional[io.BytesIO]
    mime_type           : Optional[str]
    access_token        : Optional[str]
    display_name        : Optional[str]
    folder_item_id      : Optional[str]
    folder_path         : Optional[str]
    item_id             : Optional[str]
    share_url           : Optional[str]
    web_url             : Optional[str]
    path                : Optional[str]   # "local" | "sharepoint" | "error"
    error               : Optional[str]


async def node_generate(state: ExportState) -> ExportState:
    try:
        buffer, mime_type = generate_file(state["data"], state["file_format"])
        return {**state, "buffer": buffer, "mime_type": mime_type}
    except Exception as e:
        return {**state, "error": str(e), "path": "error"}


async def node_local(state: ExportState) -> ExportState:
    return {**state, "path": "local"}


async def node_auth(state: ExportState) -> ExportState:
    try:
        return {**state, "access_token": get_access_token()}
    except Exception as e:
        return {**state, "error": str(e), "path": "error"}


async def node_store(state: ExportState) -> ExportState:
    """Delegates to the shared store_buffer_to_sharepoint helper."""
    try:
        result = await store_buffer_to_sharepoint(
            token     = state["access_token"],
            buffer    = state["buffer"],
            file_name = state["file_name"],
            mime_type = state["mime_type"],
            user_id   = state["user_id"] or str(_uuid_lib.uuid4()),
            timeframe = state.get("timeframe"),
        )
        return {
            **state,
            "display_name":   result["display_name"],
            "folder_path":    result["folder_path"],
            "folder_item_id": result["folder_item_id"],
            "item_id":        result["item_id"],
            "web_url":        result["web_url"],
            "share_url":      result["share_url"],
            "path":           "sharepoint",
        }
    except Exception as e:
        return {**state, "error": str(e), "path": "error"}


async def node_error(state: ExportState) -> ExportState:
    return state


def route_after_generate(state: ExportState) -> str:
    if state.get("error"):
        return "error"
    return "auth" if state["store_in_sharepoint"] else "local"


def route_or_error(next_node: str):
    def _r(state: ExportState) -> str:
        return "error" if state.get("error") else next_node
    return _r


def build_graph():
    g = StateGraph(ExportState)
    g.add_node("generate", node_generate)
    g.add_node("local",    node_local)
    g.add_node("auth",     node_auth)
    g.add_node("store",    node_store)
    g.add_node("error",    node_error)
    g.set_entry_point("generate")
    g.add_conditional_edges(
        "generate", route_after_generate,
        {"local": "local", "auth": "auth", "error": "error"},
    )
    g.add_conditional_edges("auth", route_or_error("store"), {"store": "store", "error": "error"})
    g.add_edge("local",  END)
    g.add_edge("store",  END)
    g.add_edge("error",  END)
    return g.compile()


export_graph = build_graph()


# ─────────────────────────────────────────────────────────────────────────────
# FASTAPI APP
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(title="SharePoint Export Service", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic models ───────────────────────────────────────────────────────────

class ExportRequest(BaseModel):
    store_in_sharepoint : bool
    file_format         : str = "xlsx"
    data                : Any
    file_name           : Optional[str] = None
    user_id             : Optional[str] = None
    timeframe           : Optional[str] = None


class ShareRequest(BaseModel):
    item_id        : str   # driveItem ID of the uploaded file
    folder_item_id : str   # driveItem ID of the user's folder
    user_id        : str   # Graph object ID — only this user gets access


class ShareLinkResponse(BaseModel):
    share_url    : str
    scope        : str = "users"
    type         : str = "view"
    web_url      : Optional[str] = None
    folder_path  : Optional[str] = None
    display_name : Optional[str] = None


class StoreResponse(BaseModel):
    """Returned by POST /api/store-to-sharepoint"""
    file_name      : str
    display_name   : str
    folder_path    : str
    folder_item_id : str
    item_id        : str
    web_url        : str
    share_url      : str
    scope          : str = "users"
    type           : str = "view"


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/store-to-sharepoint
# Accepts an ALREADY-EXPORTED file — skips generation entirely.
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/store-to-sharepoint", response_model=StoreResponse)
async def store_to_sharepoint(
    file      : UploadFile = File(..., description="The already-exported file (pdf/pptx/docx/xlsx/…)"),
    user_id   : str        = Form(..., description="Microsoft Graph object ID of the exporting user"),
    timeframe : str        = Form(..., description="Folder segment, e.g. '2024-Q1' or 'March-2025'"),
):
    """
    Stores an already-exported file into the user's private SharePoint folder.

    ✔  File was previously downloaded locally — NO regeneration happens here.
    ✔  Accepts any format: pdf, pptx, docx, xlsx, json, csv, etc.
    ✔  Folder path: <ROOT_FOLDER>/<display_name>/<user_id>/<timeframe>/
    ✔  Only user_id gets read access — no org-wide link is ever created.

    multipart/form-data fields:
        file      — binary file upload
        user_id   — Microsoft Graph user UUID
        timeframe — folder label, e.g. "2024-Q1"

    Response JSON:
        file_name, display_name, folder_path, folder_item_id,
        item_id, web_url, share_url
    """
    # ── Read the uploaded bytes ───────────────────────────────────────────────
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    buffer    = io.BytesIO(file_bytes)
    file_name = _safe_name(
        file.filename or f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    )
    # Use Content-Type from upload if present; derive from extension otherwise
    mime_type = (
        file.content_type
        if file.content_type and file.content_type != "application/octet-stream"
        else _mime_for_filename(file_name)
    )

    # ── Authenticate ──────────────────────────────────────────────────────────
    try:
        token = get_access_token()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {e}")

    # ── Store: resolve user → ensure folder → upload → grant → link ──────────
    try:
        result = await store_buffer_to_sharepoint(
            token     = token,
            buffer    = buffer,
            file_name = file_name,
            mime_type = mime_type,
            user_id   = user_id,
            timeframe = timeframe,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return StoreResponse(
        file_name      = file_name,
        display_name   = result["display_name"],
        folder_path    = result["folder_path"],
        folder_item_id = result["folder_item_id"],
        item_id        = result["item_id"],
        web_url        = result["web_url"],
        share_url      = result["share_url"],
    )


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/export   (generate data → file → optionally store)
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/export")
async def export(req: ExportRequest):
    """
    Generates a file from raw data and optionally stores it in SharePoint.

    file_format: json | csv | xlsx | word | pdf | ppt

    Response headers when store_in_sharepoint = true:
        X-SharePoint-Url          user-scoped share link (read-only)
        X-SharePoint-ItemId       driveItem ID
        X-SharePoint-FolderItemId folder driveItem ID
        X-SharePoint-WebUrl       direct file URL
        X-SharePoint-Folder       folder path used
        X-User-DisplayName        resolved display name
    """
    fmt       = req.file_format.lower()
    ext       = _EXT_MAP.get(fmt, fmt)
    file_name = req.file_name or f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{ext}"

    result = await export_graph.ainvoke({
        "store_in_sharepoint": req.store_in_sharepoint,
        "file_format":         fmt,
        "file_name":           file_name,
        "data":                req.data,
        "user_id":             req.user_id,
        "timeframe":           req.timeframe,
        "buffer":              None,
        "mime_type":           None,
        "access_token":        None,
        "display_name":        None,
        "folder_item_id":      None,
        "folder_path":         None,
        "item_id":             None,
        "share_url":           None,
        "web_url":             None,
        "path":                None,
        "error":               None,
    })

    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])

    buf: io.BytesIO = result["buffer"]
    buf.seek(0)

    headers = {
        "Content-Disposition":           f'attachment; filename="{file_name}"',
        "Access-Control-Expose-Headers": _EXPOSE_HEADERS,
    }

    if result["path"] == "sharepoint":
        headers.update({
            "X-SharePoint-Url":          result.get("share_url", ""),
            "X-SharePoint-ItemId":       result.get("item_id", ""),
            "X-SharePoint-FolderItemId": result.get("folder_item_id", ""),
            "X-SharePoint-WebUrl":       result.get("web_url", ""),
            "X-SharePoint-Folder":       result.get("folder_path", ""),
            "X-User-DisplayName":        result.get("display_name", ""),
        })

    return Response(content=buf.read(), media_type=result["mime_type"], headers=headers)


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/share
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/share", response_model=ShareLinkResponse)
async def share(req: ShareRequest):
    """
    Re-grants folder permission + returns a fresh user-scoped file link.
    Works for files stored by either /api/export or /api/store-to-sharepoint.

    UI usage:
        Open      → window.open(web_url)
        Copy Link → navigator.clipboard.writeText(share_url)
        Share     → display share_url with "Only you can access" badge
    """
    try:
        token = get_access_token()
        await grant_folder_permission_to_user(token, req.folder_item_id, req.user_id)
        share_url = await create_user_scoped_file_link(token, req.item_id, req.user_id)

        async with httpx.AsyncClient() as client:
            ir = await client.get(
                f"{_drive_url()}/items/{req.item_id}?$select=webUrl",
                headers=_auth_header(token), timeout=15.0,
            )
        web_url = ir.json().get("webUrl") if ir.is_success else None

        return ShareLinkResponse(share_url=share_url, web_url=web_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/open  |  GET /api/copy-link
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/open")
async def open_file(url: str):
    if not url:
        raise HTTPException(status_code=400, detail="Missing url parameter")
    return {"redirect_url": url}


@app.get("/api/copy-link")
async def copy_link(url: str):
    if not url:
        raise HTTPException(status_code=400, detail="Missing url parameter")
    return {"share_url": url, "scope": "users", "type": "view"}


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/folder-contents
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/folder-contents")
async def folder_contents(user_id: str, timeframe: Optional[str] = None):
    """Lists all exported files for a user, optionally filtered by timeframe."""
    try:
        token        = get_access_token()
        display_name = await fetch_user_display_name(token, user_id)
        path = (
            f"{ROOT_FOLDER}/{_safe_name(display_name)}/{_safe_name(user_id)}/{_safe_name(timeframe)}"
            if timeframe else
            f"{ROOT_FOLDER}/{_safe_name(display_name)}/{_safe_name(user_id)}"
        )
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{_drive_url()}/root:/{path}:/children"
                f"?$select=id,name,webUrl,size,lastModifiedDateTime",
                headers=_auth_header(token), timeout=15.0,
            )
        if not resp.is_success:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return {
            "user_id":      user_id,
            "display_name": display_name,
            "folder_path":  path,
            "files":        resp.json().get("value", []),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# GET /health
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "version": "3.0.0"}
