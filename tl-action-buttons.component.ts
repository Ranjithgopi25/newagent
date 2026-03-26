import os
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import quote

import requests
from dotenv import load_dotenv
from msal import ConfidentialClientApplication

load_dotenv()

# ── CONFIG ────────────────────────────────────────────────────────────────────

GRAPH_BASE = "https://graph.microsoft.com/v1.0"   # ← correct Graph API base

TENANT_ID     = os.getenv("AZURE_TENANT_ID")
CLIENT_ID     = os.getenv("AZURE_CLIENT_ID")
CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET")

SITE_HOSTNAME = "pwc.sharepoint.com/:f:/r"
SITE_PATH     = "/sites/US-IFS-ThinkSpace"
FOLDER_PATH   = "Ready to Publish - Content"


# ── STEP 1 · AUTH ─────────────────────────────────────────────────────────────

def acquire_access_token() -> str:
    """Acquire an app-only Microsoft Graph token using client credentials.
    Raises a clear error when Azure credentials or token response are invalid."""
    if not all([TENANT_ID, CLIENT_ID, CLIENT_SECRET]):
        raise RuntimeError("Missing Azure credentials")

    app = ConfidentialClientApplication(
        client_id=CLIENT_ID,
        client_credential=CLIENT_SECRET,
        authority=f"https://login.microsoftonline.com/{TENANT_ID}",
    )

    result = app.acquire_token_for_client(
        scopes=["https://graph.microsoft.com/.default"]
    )
    if "access_token" not in result:
        err_desc = result.get("error_description", result)
        raise RuntimeError(f"Token acquisition failed: {err_desc}")

    print(f"[1/4] Access token acquired (expires in {result.get('expires_in')}s)")
    return result["access_token"]


def auth_headers(token: str) -> dict:
    """Build standard authorization headers for Graph API requests.
    Returns bearer token and JSON accept headers in one place."""
    return {"Authorization": f"Bearer {token}", "Accept": "application/json"}


# ── STEP 2 · SITE ID ──────────────────────────────────────────────────────────

def get_site_id(token: str) -> str:
    """Resolve the SharePoint site id from configured hostname and site path.
    Returns the site id required for downstream drive and folder calls."""
    url = f"{GRAPH_BASE}/sites/{SITE_HOSTNAME}{SITE_PATH}"

    resp = requests.get(url, headers=auth_headers(token))
    resp.raise_for_status()

    site = resp.json()
    print(f"[2/4] Site found  → {site['displayName']}  (id: {site['id']})")
    return site["id"]


# ── STEP 3 · DRIVE ID ─────────────────────────────────────────────────────────

def get_drive_id(token: str, site_id: str) -> str:
    """Fetch available drives for a site and prefer the Documents library.
    Falls back to the first drive when no explicit Documents drive exists."""
    url = f"{GRAPH_BASE}/sites/{site_id}/drives"

    resp = requests.get(url, headers=auth_headers(token))
    resp.raise_for_status()

    drives = resp.json().get("value", [])
    if not drives:
        raise RuntimeError("No drives found on this site")

    # prefer the Documents library; fall back to first drive
    drive = next(
        (d for d in drives if "document" in d["name"].lower()),
        drives[0]
    )

    print(f"[3/4] Drive found → {drive['name']}  (id: {drive['id']})")
    return drive["id"]


# ── STEP 4 · LIST FOLDER + FILES ──────────────────────────────────────────────

def get_folder_id(token: str, drive_id: str) -> str:
    """Resolve the configured base SharePoint folder under drive root.
    Returns folder item id used as parent for upload subfolders."""
    encoded_folder_path = quote(FOLDER_PATH, safe="")
    url = f"{GRAPH_BASE}/drives/{drive_id}/root:/{encoded_folder_path}"

    resp = requests.get(url, headers=auth_headers(token))
    resp.raise_for_status()

    folder = resp.json()
    print(f"[4/4] Folder found → {folder['name']}  (id: {folder['id']})")
    return folder["id"]


def list_folder_contents(
    token: str,
    drive_id: str,
    folder_id: str,
    folder_display_name: Optional[str] = None,
) -> list[dict]:
    """List direct child items (folders and files) for a folder id.
    Prints a readable summary and returns raw item objects."""
    url = f"{GRAPH_BASE}/drives/{drive_id}/items/{folder_id}/children"

    resp = requests.get(url, headers=auth_headers(token))
    resp.raise_for_status()

    items = resp.json().get("value", [])

    # ── pretty print ──
    print(f"\n{'─' * 54}")
    print(f"{folder_display_name or FOLDER_PATH}")
    print(f"{'─' * 54}")

    folders = [i for i in items if "folder" in i]
    files   = [i for i in items if "folder" not in i]

    for item in sorted(folders, key=lambda x: x["name"].lower()):
        child_count = item["folder"].get("childCount", "?")
        print(f"{item['name']}  ({child_count} items)")

    for item in sorted(files, key=lambda x: x["name"].lower()):
        size_kb  = item.get("size", 0) / 1024
        modified = (item.get("lastModifiedDateTime") or "")[:10]
        print(f"{item['name']}  {size_kb:,.1f} KB  {modified}")

    print(f"  {len(folders)} folder(s)  ·  {len(files)} file(s)  ·  {len(items)} total")
    return items


# ── UPLOAD ────────────────────────────────────────────────────────────────────

def _encode_graph_path(path_segments: list[str]) -> str:
    """URL-encode each path segment while preserving path separators.
    Produces Graph-safe paths for folder and file endpoints."""
    return "/".join(quote(str(seg), safe="") for seg in path_segments)


def upload_file(
    token: str,
    drive_id: str,
    folder_path_segments: list[str],
    file_name: str,
    file_bytes: bytes,
) -> dict:
    """Upload bytes to SharePoint at an exact folder path and file name.
    Overwrites existing file with the same name and returns Graph metadata."""
    encoded_folder_path = _encode_graph_path(folder_path_segments)
    encoded_file_name = quote(str(file_name), safe="")

    url = f"{GRAPH_BASE}/drives/{drive_id}/root:/{encoded_folder_path}/{encoded_file_name}:/content"

    resp = requests.put(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/octet-stream",
        },
        data=file_bytes,
    )
    resp.raise_for_status()

    print(f"---Uploaded → {file_name}")
    return resp.json()


def build_sharepoint_file_url(
    username: str,
    timestamp_folder: str,
    uuid_folder: str,
    file_name: str,
) -> str:
    """Construct the full SharePoint URL for the uploaded file.
    Includes username, timestamp, uuid folder path, and original filename."""
    encoded_segments = [
        quote(seg, safe="")
        for seg in [FOLDER_PATH, username, timestamp_folder, uuid_folder]
    ]
    encoded_folder_path = "/".join(encoded_segments)
    encoded_file_name = quote(file_name, safe="")
    return f"https://{SITE_HOSTNAME}{SITE_PATH}/{encoded_folder_path}/{encoded_file_name}"


# ── FOLDER CREATION ─────────────────────────────────────────────────────────

def get_username_for_folder() -> str:
    """Get username from environment or interactive input for folder naming.
    Sanitizes invalid SharePoint characters and validates non-empty output."""
    def sanitize(value: str) -> str:
        return re.sub(r'[\\/:*?"<>|]+', "_", value).strip()

    username = os.getenv("SHAREPOINT_FOLDER_USERNAME")
    if username:
        username = sanitize(username)
        if not username:
            raise RuntimeError("SHAREPOINT_FOLDER_USERNAME is empty after sanitization")
        return username

    # Manual entry because this script uses app-only auth (no user claims).
    username = input("Enter username for SharePoint folder: ").strip()
    if not username:
        raise RuntimeError("Username cannot be empty")
    username = sanitize(username)
    if not username:
        raise RuntimeError("Username is empty after sanitization")
    return username


def ensure_folder(
    token: str,
    drive_id: str,
    parent_folder_id: str,
    folder_name: str,
    always_create: bool = False,
) -> str:
    """Get a child folder if it exists, or create it under the parent folder.
    Set always_create=True to force creation of a new folder every run."""
    if not always_create:
        lookup_url = (
            f"{GRAPH_BASE}/drives/{drive_id}/items/{parent_folder_id}/children"
            "?$select=id,name,folder"
        )
        lookup_resp = requests.get(lookup_url, headers=auth_headers(token))
        lookup_resp.raise_for_status()

        for item in lookup_resp.json().get("value", []):
            if item.get("name") == folder_name and "folder" in item:
                return item["id"]

    create_url = f"{GRAPH_BASE}/drives/{drive_id}/items/{parent_folder_id}/children"
    create_resp = requests.post(
        create_url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        json={"name": folder_name, "folder": {}},
    )
    create_resp.raise_for_status()
    return create_resp.json()["id"]


# ── FILE HANDLING ─────────────────────────────────────────────────────────────

def load_file(file_path: str) -> tuple[bytes, Path]:
    """Read a local file and return raw bytes with its Path object.
    Validates that the input path exists and points to a file."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    if not path.is_file():
        raise ValueError(f"Not a file: {file_path}")
    return path.read_bytes(), path


def download_locally(file_bytes: bytes, source_path: Path) -> str:
    """Save a timestamped local copy in a downloads subfolder.
    Returns the full destination path of the copied file."""
    download_dir = source_path.parent / "downloads"
    download_dir.mkdir(parents=True, exist_ok=True)
    timestamp    = datetime.now().strftime("%Y%m%d_%H%M%S")
    new_name     = f"{source_path.stem}_{timestamp}{source_path.suffix}"
    destination  = download_dir / new_name
    destination.write_bytes(file_bytes)
    return str(destination)


def ask_user_choice() -> bool:
    """Prompt the user to confirm SharePoint upload with yes or no.
    Repeats until valid input is provided and returns a boolean choice."""
    while True:
        choice = input("Upload to SharePoint? (yes/no): ").lower().strip()
        if choice in {"yes", "y"}:
            return True
        if choice in {"no", "n"}:
            return False
        print("Please type 'yes' or 'no'.")


# ── MAIN PROCESS ──────────────────────────────────────────────────────────────

def process_file(file_path: str) -> Dict[str, Any]:
    """Process one file through local-save and optional SharePoint upload flow.
    Creates username/timestamp/uuid folders and returns upload metadata + URL."""
    file_bytes, path = load_file(file_path)

    # Keep a local copy regardless of upload choice.
    local_path = download_locally(file_bytes, path)

    result: Dict[str, Any] = {
        "file_name":       path.name,
        "file_size_bytes": len(file_bytes),
        "file_format":     path.suffix.lower().lstrip("."),
        "local_path":     local_path,
    }

    if not ask_user_choice():
        print(f"📥 SharePoint upload not requested; saved locally → {local_path}")
        result.update({"status": "saved_locally"})
        return result

    # ── SharePoint flow ────────────────────────────────────────────────────
    token     = acquire_access_token()                  # step 1 — auth
    site_id   = get_site_id(token)                      # step 2 — site
    drive_id  = get_drive_id(token, site_id)            # step 3 — drive
    base_folder_id = get_folder_id(token, drive_id)    # step 4 — base folder

    print("\n── Folder contents (base) before upload ──")
    list_folder_contents(token, drive_id, base_folder_id, folder_display_name=FOLDER_PATH)

    # Create: Ready to Publish - Content / {username} / {timestamp} / {uuid}/
    username = get_username_for_folder()
    timestamp_folder = datetime.now().strftime("%Y%m%d_%H%M%S")
    uuid_folder = uuid.uuid4().hex

    username_folder_id = ensure_folder(token, drive_id, base_folder_id, username)
    timestamp_folder_id = ensure_folder(token, drive_id, username_folder_id, timestamp_folder)
    uuid_folder_id = ensure_folder(
        token,
        drive_id,
        timestamp_folder_id,
        uuid_folder,
        always_create=True,
    )

    created_folder_path = f"{FOLDER_PATH}/{username}/{timestamp_folder}/{uuid_folder}"
    print(f"\nCreated SharePoint folder → {created_folder_path}")

    print("\n── Folder contents (created folder) before upload ──")
    list_folder_contents(
        token,
        drive_id,
        uuid_folder_id,
        folder_display_name=created_folder_path,
    )

    # Upload file with the exact original filename.
    upload_file(
        token,
        drive_id,
        folder_path_segments=[FOLDER_PATH, username, timestamp_folder, uuid_folder],
        file_name=path.name,
        file_bytes=file_bytes,
    )

    sharepoint_file_url = build_sharepoint_file_url(
        username=username,
        timestamp_folder=timestamp_folder,
        uuid_folder=uuid_folder,
        file_name=path.name,
    )
    print(f"SharePoint file URL → {sharepoint_file_url}")

    print("\n── Folder contents (created folder) after upload ──")
    list_folder_contents(
        token,
        drive_id,
        uuid_folder_id,
        folder_display_name=created_folder_path,
    )

    result.update(
        {
            "status": "uploaded_to_sharepoint",
            "sharepoint_folder": created_folder_path,
            "sharepoint_file_url": sharepoint_file_url,
        }
    )
    return result


# ── ENTRY POINT ───────────────────────────────────────────────────────────────

def main():
    """Run manual local test using agentic.pdf next to this script.
    Prints the final result dictionary for quick verification."""
     file_path = Path(__file__).with_name("agentic.pdf")
    result    = process_file(str(file_path))

    print("--------------RESULT:---------------")
    print(result)


if __name__ == "__main__":
    main()
