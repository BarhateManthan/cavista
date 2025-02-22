import os
import logging
from typing import Optional
from pathlib import Path

from fastapi.responses import RedirectResponse, JSONResponse
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status, Header
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
import json
from datetime import datetime, timezone
from clerk_backend_api import Clerk
from pydantic import BaseModel

GOOGLE_CLIENT_ID = "553717593899-lo8846a22oaep6glau4mao7bo5n923ar.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET = "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"
GOOGLE_REDIRECT_URIS = [
    'http://localhost:8080/home',
    'http://localhost:5173/home'  # Add Vite dev server URI
]
flow = Flow.from_client_config(
    {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": GOOGLE_REDIRECT_URIS,
        }
    },
    scopes=['https://www.googleapis.com/auth/drive.readonly']
)

logger = logging.getLogger(__name__)

router = APIRouter()
clerk = Clerk(bearer_auth="sk_test_dfIsNAYuOURJspfknM7ihUHP2xbHnzVkome6NZVHXe")  # Add your Clerk secret key

# Add the dependency function here before the routes that use it
async def get_verified_user(authorization: str = Header(None)):
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization header missing")
            
        # Extract Bearer token
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization format")
            
        token = authorization.split("Bearer ")[1]
        
        # Verify session with Clerk
        session = clerk.verify_session(token)
        if not session or not session.user:
            raise HTTPException(status_code=401, detail="Invalid session")
            
        return session.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

@router.post("/download")
async def download_drive_item(file_info: dict, user=Depends(get_verified_user)):
    # Get stored credentials from Clerk metadata
    credentials_data = user.private_metadata.get("google_credentials")
    
    if not credentials_data:
        raise HTTPException(
            status_code=401,
            detail="Google authentication required. Please sign in with Google."
        )

    # Handle token expiration
    credentials = Credentials(
        token=credentials_data["token"],
        refresh_token=credentials_data["refresh_token"],
        token_uri=credentials_data["token_uri"],
        client_id=credentials_data["client_id"],
        client_secret=credentials_data["client_secret"],
        scopes=credentials_data["scopes"],
        expiry=datetime.fromisoformat(credentials_data["expiry"])
    )
    
    if credentials.expired:
        credentials.refresh(GoogleRequest())
        # Update stored credentials
        clerk.update_user_metadata(
            user_id=user.id,
            private_metadata={"google_credentials": credentials.to_json()}
        )

    file_info = file_info.get('fileInfo', {})
    item_id = file_info['fileId']
    is_folder = file_info.get('isFolder', False)
    downloaded_files = []

    if is_folder:
        folder_path = download_folder(credentials, item_id)
        if folder_path:
            for root, dirs, files in os.walk(folder_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    downloaded_files.append(file_path)
        else:
            raise HTTPException(
                status_code=404, detail="Folder not found or inaccessible")
    else:
        file_path = download_file(credentials, item_id)
        if file_path:
            downloaded_files.append(file_path)
        else:
            raise HTTPException(
                status_code=404, detail="File not found or inaccessible")

    # Return downloadable URLs instead of local paths
    return {
        "message": "Files ready for download",
        "download_links": [f"/downloads/{Path(f).name}" for f in downloaded_files]
    }

class GoogleAuthRequest(BaseModel):
    code: str
    redirect_uri: str

@router.post("/auth")
async def handle_google_auth(
    request: GoogleAuthRequest, 
    user=Depends(get_verified_user)
):
    try:
        # Now using the validated request model
        code = request.code
        redirect_uri = request.redirect_uri
        
        # Exchange code for tokens
        flow.redirect_uri = redirect_uri  # Important: Set flow's redirect URI
        flow.fetch_token(code=code)
        credentials = flow.credentials

        # Store credentials in Clerk user metadata
        clerk.update_user_metadata(
            user_id=user.id,
            private_metadata={
                "google_credentials": {
                    "token": credentials.token,
                    "refresh_token": credentials.refresh_token,
                    "token_uri": credentials.token_uri,
                    "client_id": credentials.client_id,
                    "client_secret": credentials.client_secret,
                    "scopes": credentials.scopes,
                    "expiry": credentials.expiry.isoformat()
                }
            }
        )

        return {"success": True, "message": "Authentication successful"}
        
    except Exception as e:
        logging.error(f"Auth error: {str(e)}")
        raise HTTPException(status_code=400, detail="Authentication failed")

@router.get("/status")
async def check_auth_status(request: Request, user=Depends(get_verified_user)):
    logger.debug("Checking auth status")
    try:
        credentials_data = user.private_metadata.get("google_credentials")
        if not credentials_data:
            return JSONResponse(
                content={"isAuthenticated": False}
            )
            
        credentials = Credentials(
            token=credentials_data["token"],
            refresh_token=credentials_data["refresh_token"],
            token_uri=credentials_data["token_uri"],
            client_id=credentials_data["client_id"],
            client_secret=credentials_data["client_secret"],
            scopes=credentials_data["scopes"],
            expiry=datetime.fromisoformat(credentials_data["expiry"])
        )
        
        return JSONResponse(
            content={"isAuthenticated": not credentials.expired}
        )
        
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        return JSONResponse(
            content={"isAuthenticated": False}
        )

