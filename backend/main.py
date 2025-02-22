from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from google_auth_oauthlib.flow import Flow
from typing import List, Optional, Dict
import os
import io
import json
import shutil
from datetime import datetime
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Google Drive Integration API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
GOOGLE_REDIRECT_URI = os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:8080/api/v1/drive/callback')
DATA_DIR = 'data'
UPLOAD_DIR = os.path.join(DATA_DIR, 'uploads')

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Create router
router = APIRouter()

# Pydantic models
class DriveCredentials(BaseModel):
    token: str
    refresh_token: str
    token_uri: str
    client_id: str
    client_secret: str
    scopes: List[str]

class FolderRequest(BaseModel):
    folder_id: str
    credentials: DriveCredentials

class DownloadStatus(BaseModel):
    status: str
    file_count: Optional[int]
    total_size_bytes: Optional[int]
    folder_path: str
    message: Optional[str]

# Helper functions
def get_drive_service(credentials: DriveCredentials):
    """Create and return a Google Drive service instance"""
    try:
        creds = Credentials(
            token=credentials.token,
            refresh_token=credentials.refresh_token,
            token_uri=credentials.token_uri,
            client_id=credentials.client_id,
            client_secret=credentials.client_secret,
            scopes=credentials.scopes
        )
        return build('drive', 'v3', credentials=creds)
    except Exception as e:
        logger.error(f"Error creating Drive service: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to create Drive service"
        )

async def download_file(service, file_id: str, filepath: str) -> bool:
    """Download a single file from Google Drive"""
    try:
        request = service.files().get_media(fileId=file_id)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        
        done = False
        while not done:
            status, done = downloader.next_chunk()
            logger.info(f"Download Progress: {int(status.progress() * 100)}%")
        
        fh.seek(0)
        with open(filepath, 'wb') as f:
            f.write(fh.read())
        return True
    except Exception as e:
        logger.error(f"Error downloading file {file_id}: {str(e)}")
        return False

def create_folder_structure(items: List[Dict], parent_path: str):
    """Create local folder structure based on Drive items"""
    for item in items:
        path = os.path.join(parent_path, item['name'])
        if item['mimeType'] == 'application/vnd.google-apps.folder':
            os.makedirs(path, exist_ok=True)
        elif not os.path.exists(os.path.dirname(path)):
            os.makedirs(os.path.dirname(path), exist_ok=True)

async def process_folder(service, folder_id: str, base_path: str):
    """Process a folder and its contents recursively"""
    results = []
    page_token = None
    
    while True:
        try:
            query = f"'{folder_id}' in parents"
            fields = "files(id, name, mimeType, parents), nextPageToken"
            
            response = service.files().list(
                q=query,
                spaces='drive',
                fields=fields,
                pageToken=page_token,
                supportsAllDrives=True,
                includeItemsFromAllDrives=True
            ).execute()
            
            items = response.get('files', [])
            create_folder_structure(items, base_path)
            
            for item in items:
                item_path = os.path.join(base_path, item['name'])
                
                if item['mimeType'] == 'application/vnd.google-apps.folder':
                    # Recursively process subfolders
                    subfolder_results = await process_folder(service, item['id'], item_path)
                    results.extend(subfolder_results)
                else:
                    # Handle Google Workspace files
                    if item['mimeType'].startswith('application/vnd.google-apps'):
                        if item['mimeType'] == 'application/vnd.google-apps.document':
                            item_path += '.pdf'
                            success = await export_google_doc(service, item['id'], item_path)
                        else:
                            continue  # Skip other Google Workspace files
                    else:
                        # Download regular files
                        success = await download_file(service, item['id'], item_path)
                    
                    results.append({
                        'id': item['id'],
                        'name': item['name'],
                        'path': item_path,
                        'status': 'success' if success else 'failed'
                    })
            
            page_token = response.get('nextPageToken')
            if not page_token:
                break
                
        except Exception as e:
            logger.error(f"Error processing folder: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error processing folder: {str(e)}")
    
    return results

async def export_google_doc(service, file_id: str, filepath: str) -> bool:
    """Export Google Docs to PDF"""
    try:
        request = service.files().export_media(
            fileId=file_id,
            mimeType='application/pdf'
        )
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        
        done = False
        while not done:
            status, done = downloader.next_chunk()
        
        fh.seek(0)
        with open(filepath, 'wb') as f:
            f.write(fh.read())
        return True
    except Exception as e:
        logger.error(f"Error exporting Google Doc {file_id}: {str(e)}")
        return False

# API Routes
@router.post("/download-drive-folder", response_model=Dict)
async def download_drive_folder(
    request: FolderRequest,
    background_tasks: BackgroundTasks
):
    """Start downloading a Google Drive folder"""
    try:
        service = get_drive_service(request.credentials)
        
        # Get folder details
        folder = service.files().get(
            fileId=request.folder_id,
            fields='name',
            supportsAllDrives=True
        ).execute()
        
        folder_name = folder.get('name', 'downloaded_folder')
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_folder = os.path.join(UPLOAD_DIR, f"{folder_name}_{timestamp}")
        os.makedirs(base_folder, exist_ok=True)
        
        # Start download process in background
        background_tasks.add_task(process_folder, service, request.folder_id, base_folder)
        
        return {
            "status": "success",
            "message": "Folder download started",
            "folder_path": base_folder
        }
        
    except Exception as e:
        logger.error(f"Error initiating folder download: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download-status/{folder_path}", response_model=DownloadStatus)
async def get_download_status(folder_path: str):
    """Check the status of a folder download"""
    try:
        if not os.path.exists(folder_path):
            return DownloadStatus(
                status="not_found",
                message="Folder not found",
                folder_path=folder_path
            )
        
        total_size = 0
        file_count = 0
        
        for root, dirs, files in os.walk(folder_path):
            file_count += len(files)
            for file in files:
                file_path = os.path.join(root, file)
                total_size += os.path.getsize(file_path)
                
        return DownloadStatus(
            status="success",
            file_count=file_count,
            total_size_bytes=total_size,
            folder_path=folder_path
        )
        
    except Exception as e:
        logger.error(f"Error checking download status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/cleanup/{folder_path}")
async def cleanup_downloaded_folder(folder_path: str):
    """Delete a downloaded folder"""
    try:
        if not os.path.exists(folder_path):
            raise HTTPException(status_code=404, detail="Folder not found")
            
        if not folder_path.startswith(DATA_DIR):
            raise HTTPException(status_code=400, detail="Invalid folder path")
            
        shutil.rmtree(folder_path)
        
        return {
            "status": "success",
            "message": "Folder deleted successfully"
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up folder: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Add router to app
app.include_router(router, prefix="/api/v1/drive")

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("Starting up the application...")
    # You can add any initialization code here

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down the application...")
    # You can add any cleanup code here

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)