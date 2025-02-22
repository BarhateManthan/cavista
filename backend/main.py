import os
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict

from fastapi import FastAPI, HTTPException, APIRouter, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload
from dotenv import load_dotenv

# Initialize application
load_dotenv()
app = FastAPI(title="Google Drive Integration API")
router = APIRouter(prefix="/api/v1/integrations")

# Configuration
TOKEN_FILE = "gdrive_token.json"
DATA_DIR = 'data'
UPLOAD_DIR = os.path.join(DATA_DIR, 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler("api.log"), logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Pydantic models
class TokenData(BaseModel):
    access_token: str
    expires_in: int
    refresh_token: Optional[str] = None

class DownloadRequest(BaseModel):
    file_id: str
    is_folder: bool

# Helper functions
def save_token_data(token_data: dict):
    try:
        expiry = datetime.now(timezone.utc) + timedelta(seconds=token_data['expires_in'])
        token_data['expiry'] = expiry.isoformat()
        
        with open(TOKEN_FILE, 'w') as f:
            json.dump(token_data, f)
            
        logger.info("Token saved successfully")
    except Exception as e:
        logger.error(f"Token save error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save token"
        )

def load_token_data() -> Optional[dict]:
    try:
        with open(TOKEN_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None
    except Exception as e:
        logger.error(f"Token load error: {str(e)}")
        return None

def get_credentials() -> Credentials:
    token_data = load_token_data()
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    credentials = Credentials(
        token=token_data.get('access_token'),
        refresh_token=token_data.get('refresh_token'),
        token_uri='https://oauth2.googleapis.com/token',
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scopes=['https://www.googleapis.com/auth/drive.readonly']
    )

    if credentials.expired and credentials.refresh_token:
        try:
            credentials.refresh(Request())
            save_token_data({
                'access_token': credentials.token,
                'refresh_token': credentials.refresh_token,
                'expires_in': int((credentials.expiry - datetime.now(timezone.utc)).total_seconds())
            })
        except Exception as e:
            logger.error(f"Token refresh failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token refresh failed"
            )

    return credentials

# API endpoints
@router.get("/health")
async def health_check():
    return {"status": "OK", "service": "Google Drive Integration API"}

@router.get("/status")
async def auth_status():
    token_data = load_token_data()
    if not token_data:
        return {"isAuthenticated": False}

    expiry = datetime.fromisoformat(token_data['expiry'])
    if expiry < datetime.now(timezone.utc):
        return {"isAuthenticated": False}
    
    return {"isAuthenticated": True}

@router.post("/token")
async def save_token(token_data: TokenData):
    try:
        save_token_data(token_data.dict())
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Token save error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save token"
        )

@router.post("/download")
async def download_folder(request: DownloadRequest, credentials: Credentials = Depends(get_credentials)):
    try:
        service = build('drive', 'v3', credentials=credentials)
        
        if request.is_folder:
            return await handle_folder_download(service, request.file_id)
        return await handle_file_download(service, request.file_id)
    except HttpError as e:
        logger.error(f"Google API error: {str(e)}")
        raise HTTPException(
            status_code=e.status_code,
            detail=e.reason
        )

async def handle_folder_download(service, folder_id: str):
    folder = service.files().get(fileId=folder_id).execute()
    folder_name = folder['name']
    folder_path = os.path.join(UPLOAD_DIR, folder_name)
    os.makedirs(folder_path, exist_ok=True)

    items = []
    page_token = None
    
    while True:
        results = service.files().list(
            q=f"'{folder_id}' in parents and trashed = false",
            fields="nextPageToken, files(id, name, mimeType)",
            pageToken=page_token
        ).execute()
        
        items.extend(results.get('files', []))
        page_token = results.get('nextPageToken')
        
        if not page_token:
            break

    for item in items:
        await download_file(service, item['id'], folder_path, item['name'])

    return {"message": f"Downloaded {len(items)} files to {folder_path}"}

async def handle_file_download(service, file_id: str):
    file = service.files().get(fileId=file_id).execute()
    file_path = os.path.join(UPLOAD_DIR, file['name'])
    await download_file(service, file_id, UPLOAD_DIR, file['name'])
    return {"message": f"Downloaded file to {file_path}"}

async def download_file(service, file_id: str, path: str, name: str):
    request = service.files().get_media(fileId=file_id)
    file_path = os.path.join(path, name)
    
    with open(file_path, 'wb') as f:
        downloader = MediaIoBaseDownload(f, request)
        done = False
        
        while not done:
            status, done = downloader.next_chunk()
            if status:
                logger.info(f"Download {name} progress: {int(status.progress() * 100)}%")

# Register routes
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
        ssl_keyfile=os.getenv("SSL_KEYFILE"),
        ssl_certfile=os.getenv("SSL_CERTFILE")
    )