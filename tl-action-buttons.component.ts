import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

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
    """Acquire an app-only access token from Azure AD via MSAL."""
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
        raise RuntimeError(f"Token acquisition failed: {result.get('error_description', result)}")

    print(f"[1/4] Access token acquired (expires in {result.get('expires_in')}s)")
    return result["access_token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Accept": "application/json"}


# ── STEP 2 · SITE ID ──────────────────────────────────────────────────────────

def get_site_id(token: str) -> str:
    """Resolve the SharePoint site ID via Graph API site lookup by hostname + path."""
    url = f"{GRAPH_BASE}/sites/{SITE_HOSTNAME}{SITE_PATH}"

    resp = requests.get(url, headers=auth_headers(token))
    resp.raise_for_status()

    site = resp.json()
    print(f"[2/4] Site found  → {site['displayName']}  (id: {site['id']})")
    return site["id"]


# ── STEP 3 · DRIVE ID ─────────────────────────────────────────────────────────

def get_drive_id(token: str, site_id: str) -> str:
    """Fetch all drives on the site and pick the Documents library."""
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
    """Resolve the target folder item ID."""
    url = f"{GRAPH_BASE}/drives/{drive_id}/root:/{FOLDER_PATH}"

    resp = requests.get(url, headers=auth_headers(token))
    resp.raise_for_status()

    folder = resp.json()
    print(f"[4/4] Folder found → {folder['name']}  (id: {folder['id']})")
    return folder["id"]


def list_folder_contents(token: str, drive_id: str, folder_id: str) -> list[dict]:
    """List all items (sub-folders + files) inside the target folder."""
    url = f"{GRAPH_BASE}/drives/{drive_id}/items/{folder_id}/children"

    resp = requests.get(url, headers=auth_headers(token))
    resp.raise_for_status()

    items = resp.json().get("value", [])

    # ── pretty print ──
    print(f"\n{'─' * 54}")
    print(f"{FOLDER_PATH}")
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

def upload_file(token: str,drive_id: str,file_name: str,file_bytes: bytes,) -> dict:
    """Upload (or overwrite) a file into the configured folder."""
    url = f"{GRAPH_BASE}/drives/{drive_id}/root:/{FOLDER_PATH}/{file_name}:/content"

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


# ── FILE HANDLING ─────────────────────────────────────────────────────────────

def load_file(file_path: str) -> tuple[bytes, Path]:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    if not path.is_file():
        raise ValueError(f"Not a file: {file_path}")
    return path.read_bytes(), path


def download_locally(file_bytes: bytes, source_path: Path) -> str:
    download_dir = source_path.parent / "downloads"
    download_dir.mkdir(parents=True, exist_ok=True)
    timestamp    = datetime.now().strftime("%Y%m%d_%H%M%S")
    new_name     = f"{source_path.stem}_{timestamp}{source_path.suffix}"
    destination  = download_dir / new_name
    destination.write_bytes(file_bytes)
    return str(destination)


def ask_user_choice() -> bool:
    while True:
        choice = input("Upload to SharePoint? (yes/no): ").lower().strip()
        if choice in {"yes", "y"}:
            return True
        if choice in {"no", "n"}:
            return False
        print("Please type 'yes' or 'no'.")


# ── MAIN PROCESS ──────────────────────────────────────────────────────────────

def process_file(file_path: str) -> Dict[str, Any]:
    """
    Load a file, ask the user what to do, then either:
      • NO  → save a timestamped copy locally under ./downloads/
      • YES → token → site → drive → folder → list → upload → list again
    """
    file_bytes, path = load_file(file_path)

    result: Dict[str, Any] = {
        "file_name":       path.name,
        "file_size_bytes": len(file_bytes),
        "file_format":     path.suffix.lower().lstrip("."),
    }

    if not ask_user_choice():
        local_path = download_locally(file_bytes, path)
        print(f"📥 Saved locally → {local_path}")
        result.update({"status": "saved_locally", "path": local_path})
        return result

    # ── SharePoint flow (steps 1 → 4) ────────────────────────────────────────
    token     = acquire_access_token()                  # step 1 — auth
    site_id   = get_site_id(token)                      # step 2 — site
    drive_id  = get_drive_id(token, site_id)            # step 3 — drive
    folder_id = get_folder_id(token, drive_id)          # step 4 — folder

    print("\n── Folder contents before upload ──")
    list_folder_contents(token, drive_id, folder_id)

    upload_file(token, drive_id, path.name, file_bytes)
    print("── Folder contents after upload ──")

    list_folder_contents(token, drive_id, folder_id)

    result.update({"status": "uploaded_to_sharepoint"})
    return result


# ── ENTRY POINT ───────────────────────────────────────────────────────────────

def main():
    file_path = Path(__file__).with_name("agentic.pdf")
    result    = process_file(str(file_path))

    print("--------------RESULT:---------------")
    print(result)


if __name__ == "__main__":
    main()
