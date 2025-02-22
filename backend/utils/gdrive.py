import os
from pathlib import Path
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from io import BytesIO
from googleapiclient.errors import HttpError
import traceback
import io
from fastapi import HTTPException
import logging

DATA_DIR = 'data'

log = logging.getLogger(__name__)


def download_file(credentials: dict, file_id: str) -> str:
    creds = Credentials.from_authorized_user_info(credentials)
    drive_service = build('drive', 'v3', credentials=creds)

    try:
        file = drive_service.files().get(fileId=file_id).execute()
        print(f"File metadata: {file}")

        file_name = file.get('name', f'unknown_file_{file_id}')
        file_mime_type = file.get('mimeType', '')

        if file_mime_type == 'application/vnd.google-apps.document':
            # Export Google Docs file to PDF
            file_name = f"{file_name}.pdf"
            file_path = os.path.join('static', 'backend_files', file_name)
            export_mime_type = 'application/pdf'
            request = drive_service.files().export_media(
                fileId=file_id, mimeType=export_mime_type)
            fh = BytesIO()
            downloader = MediaIoBaseDownload(fh, request, chunksize=1024*1024)
            done = False
            while done is False:
                status, done = downloader.next_chunk()
                print(f"Export progress: {int(status.progress() * 100)}%.")
            fh.seek(0)
            with open(file_path, 'wb') as f:
                f.write(fh.read())
        else:
            # Download regular files
            file_path = os.path.join(DATA_DIR, 'uploads', file_name)
            request = drive_service.files().get_media(fileId=file_id)
            fh = BytesIO()
            downloader = MediaIoBaseDownload(fh, request, chunksize=1024*1024)
            done = False
            while done is False:
                status, done = downloader.next_chunk()
                print(f"Download progress: {int(status.progress() * 100)}%.")
            fh.seek(0)
            with open(file_path, 'wb') as f:
                f.write(fh.read())

        print(f"File downloaded: {file_path}")
        return file_path
    except HttpError as error:
        print(f"An HTTP error occurred: {error}")
        print("Stacktrace:")
        traceback.print_exc()
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        print("Stacktrace:")
        traceback.print_exc()
        return None


def download_folder(credentials, folder_id, base_path='downloads'):
    try:
        creds = Credentials.from_authorized_user_info(info=credentials)
        service = build('drive', 'v3', credentials=creds)

        folder_name = get_folder_name(service, folder_id)
        if not folder_name:
            raise HTTPException(
                status_code=404,
                detail="Folder name could not be retrieved"
            )
        folder_path = os.path.join(DATA_DIR, 'uploads', folder_name)
        os.makedirs(folder_path, exist_ok=True)

        download_folder_contents(service, folder_id, folder_path)

        return folder_path
    except HttpError as e:
        log.error(f"Google Drive API error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=e.resp.status,
            detail=f"Google Drive API error: {str(e)}"
        )
    except Exception as e:
        log.error(f"Error downloading folder: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error downloading folder: {str(e)}"
        )


def get_folder_name(service, folder_id, drive_id=None):
    try:
        params = {
            'fileId': folder_id,
            'fields': 'name',
            'supportsAllDrives': True
        }

        if drive_id:
            params['driveId'] = drive_id

        folder = service.files().get(**params).execute()
        return folder.get('name')
    except HttpError as error:
        if error.resp.status == 404:
            raise HTTPException(
                status_code=404,
                detail=f"Folder with ID {folder_id} not found. Please check if the folder exists and you have access to it."
            )
        raise HTTPException(
            status_code=500,
            detail=f"Error accessing Google Drive: {str(error)}"
        )


def download_folder_contents(service, folder_id, folder_path, drive_id=None):
    query = f"'{folder_id}' in parents"
    try:
        params = {
            'q': query,
            'pageSize': 1000,
            'fields': "nextPageToken, files(id, name, mimeType)",
            'supportsAllDrives': True,
            'includeItemsFromAllDrives': True
        }

        if drive_id:
            params['driveId'] = drive_id
            params['corpora'] = 'drive'

        results = service.files().list(**params).execute()

        items = results.get('files', [])
        if not items:
            print(f"No files found in folder {folder_id}")
            return True

        for item in items:
            file_id = item['id']
            file_name = item['name']
            mime_type = item['mimeType']

            try:
                if mime_type == 'application/vnd.google-apps.folder':
                    # Create subfolder
                    subfolder_path = os.path.join(folder_path, file_name)
                    os.makedirs(subfolder_path, exist_ok=True)
                    # Recursively download subfolder contents with the same drive_id
                    download_folder_contents(
                        service, file_id, subfolder_path, drive_id)
                else:
                    file_path = os.path.join(folder_path, file_name)

                    if mime_type.startswith('application/vnd.google-apps'):
                        # Handle Google Docs files
                        if mime_type == 'application/vnd.google-apps.document':
                            request = service.files().export_media(
                                fileId=file_id, mimeType='application/pdf')
                            file_path = f"{file_path}.pdf"
                        else:
                            continue  # Skip other Google Apps files
                    else:
                        request = service.files().get_media(fileId=file_id)

                    fh = io.BytesIO()
                    downloader = MediaIoBaseDownload(fh, request)
                    done = False
                    while done is False:
                        status, done = downloader.next_chunk()
                        print(
                            f"Download {file_name} {int(status.progress() * 100)}%")

                    fh.seek(0)
                    with open(file_path, 'wb') as f:
                        f.write(fh.read())

            except Exception as e:
                print(f"Error downloading {file_name}: {str(e)}")
                continue  # Continue with next file even if one fails

        return True

    except Exception as e:
        print(f"Error listing files in folder: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error downloading folder contents: {str(e)}"
        )


def download_file_by_path(service, file_id, folder_path, file_name):
    request = service.files().get_media(fileId=file_id)
    file_path = os.path.join(folder_path, file_name)

    with io.FileIO(file_path, 'wb') as file:
        downloader = MediaIoBaseDownload(file, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()

    return file_path
