# routes/google_drive.py
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
from models.drive_models import DriveCredentials, FolderRequest
from utils.gdrive import download_folder  # Import the download_folder function from your existing code

router = APIRouter()

@router.post("/download-drive-folder")
async def download_drive_folder(
    request: FolderRequest,
    credentials: DriveCredentials
) -> Dict[str, str]:
    """
    Endpoint to download all files from a selected Google Drive folder
    
    Args:
        request: FolderRequest containing the folder_id
        credentials: Google Drive credentials
    
    Returns:
        Dict containing the path where files were downloaded
    """
    try:
        folder_path = download_folder(
            credentials=credentials.dict(),
            folder_id=request.folder_id
        )
        
        return {
            "status": "success",
            "message": "Folder downloaded successfully",
            "folder_path": folder_path
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download folder: {str(e)}"
        )