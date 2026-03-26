import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict


def check_sharepoint_connection(config: dict) -> Dict[str, Any]:
    """Check SharePoint connection using MSAL."""
    try:
        from msal import ConfidentialClientApplication
    except ImportError:
        return {"status": "error", "message": "msal package not installed", "stable": False}

    try:
        authority = f"https://login.microsoftonline.com/{config['tenant_id']}"
        app = ConfidentialClientApplication(
            client_id=config["client_id"],
            client_credential=config["client_secret"],
            authority=authority,
        )
        result = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])

        if "access_token" not in result:
            error_msg = result.get("error_description", "Failed to acquire access token")
            return {"status": "failed", "message": error_msg, "stable": False}

        return {
            "status": "success",
            "message": "SharePoint connection successful",
            "stable": True,
            "access_token": result["access_token"],
            "token_type": result.get("token_type", "Bearer"),
            "expires_in": result.get("expires_in"),
        }
    except Exception as e:
        return {"status": "failed", "message": str(e), "stable": False}


def load_file(file_path: str) -> tuple[bytes, Path]:
    """Load file bytes from disk (first step in flow)."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    if not path.is_file():
        raise ValueError(f"Path is not a file: {file_path}")
    return path.read_bytes(), path


def ask_upload_choice() -> bool:
    """Prompt user until a valid yes/no choice is provided."""
    while True:
        choice = input("Do you want to upload to SharePoint? (yes/no): ").strip().lower()
        if choice in {"y", "yes"}:
            return True
        if choice in {"n", "no"}:
            return False
        print("Please enter only 'yes' or 'no'.")


def _sharepoint_config_from_env() -> Dict[str, str]:
    return {
        "tenant_id": os.getenv("TENANT_ID", "").strip(),
        "client_id": os.getenv("CLIENT_ID", "").strip(),
        "client_secret": os.getenv("CLIENT_SECRET", "").strip(),
    }


def download_again_same_format(file_bytes: bytes, source_path: Path) -> str:
    """
    Save the same file again locally, preserving original format/extension.
    """
    download_dir = source_path.parent / "downloads"
    download_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    downloaded_name = f"{source_path.stem}_{timestamp}{source_path.suffix}"
    destination = download_dir / downloaded_name
    destination.write_bytes(file_bytes)
    return str(destination)


def process_file_and_optional_sharepoint_upload(file_path: str) -> Dict[str, Any]:
    """
    1) Load file first.
    2) Ask if user wants SharePoint upload.
    3) If yes, validate connection details and test MSAL token acquisition.
    """
    file_bytes, source_path = load_file(file_path)
    result: Dict[str, Any] = {
        "file_loaded": True,
        "file_name": source_path.name,
        "file_size_bytes": len(file_bytes),
        "file_format": source_path.suffix.lower().lstrip("."),
    }

    if not ask_upload_choice():
        local_path = download_again_same_format(file_bytes, source_path)
        result.update(
            {
                "upload_to_sharepoint": False,
                "status": "downloaded_locally",
                "download_path": local_path,
                "message": "File loaded and downloaded again locally in same format.",
            }
        )
        return result

    config = _sharepoint_config_from_env()
    missing = [k for k, v in config.items() if not v]
    if missing:
        result.update(
            {
                "upload_to_sharepoint": True,
                "status": "failed",
                "stable": False,
                "message": f"Missing SharePoint config in environment: {', '.join(missing)}",
            }
        )
        return result

    connection = check_sharepoint_connection(config)
    result.update({"upload_to_sharepoint": True, **connection})
    return result


if __name__ == "__main__":
    # You can pass a file path directly here if needed.
    default_file = Path(__file__).with_name("AKSHAY RAVIJ SRINIVAS..pdf")
    output = process_file_and_optional_sharepoint_upload(str(default_file))
    print(output)
    if output.get("upload_to_sharepoint") and output.get("status") == "success":
        print("Access Token:")
        print(output.get("access_token", ""))
