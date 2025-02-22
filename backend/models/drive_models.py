# models/drive_models.py
from pydantic import BaseModel
from typing import Dict, Optional

class DriveCredentials(BaseModel):
    token: str
    refresh_token: str
    token_uri: str
    client_id: str
    client_secret: str
    scopes: list[str]

class FolderRequest(BaseModel):
    folder_id: str