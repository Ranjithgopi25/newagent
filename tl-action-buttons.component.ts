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

        return {"status": "success", "message": "SharePoint connection successful", "stable": True}
    except Exception as e:
        return {"status": "failed", "message": str(e), "stable": False}
