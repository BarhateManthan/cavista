import React, { useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import './Dashboard.css'

const DriveButton = () => {
    const handleFolderSelect = async (folderId, token) => {
        try {
            console.log("Selected Folder ID:", folderId);

            const downloadResponse = await fetch('http://localhost:8000/api/drive/download-folder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    folder_id: folderId
                }),
            });

            if (!downloadResponse.ok) {
                throw new Error('Failed to download folder');
            }

            const result = await downloadResponse.json();
            console.log("Download response:", result);
        } catch (error) {
            console.error('Error downloading folder:', error);
        }
    };

    const handleSuccess = async (response) => {
        try {
            console.log("OAuth Token:", response.access_token);
            const token = response.access_token;
            
            if (!window.gapi || !window.google || !window.google.picker) {
                console.error("Google Picker API not loaded");
                return;
            }

            const view = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
                .setSelectFolderEnabled(true)
                .setIncludeFolders(true)
                .setMimeTypes("application/vnd.google-apps.folder");

            const picker = new window.google.picker.PickerBuilder()
                .setOAuthToken(token)
                .addView(view)
                .setCallback((data) => {
                    if (data.action === window.google.picker.Action.PICKED) {
                        const folderId = data.docs[0].id;
                        console.log("Folder Picked ID:", folderId);
                        handleFolderSelect(folderId, token);
                    }
                })
                .build();

            picker.setVisible(true);
        } catch (error) {
            console.error('Error loading picker:', error);
        }
    };

    const login = useGoogleLogin({
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        onSuccess: handleSuccess,
        flow: 'implicit'  // Using implicit flow for client-side only
    });

    useEffect(() => {
        const loadPicker = () => {
            if (window.gapi && window.google && window.google.picker) return;
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                window.gapi.load('picker', { callback: () => console.log("Google Picker Loaded") });
            };
            document.body.appendChild(script);
        };
        loadPicker();
    }, []);

    return (
        <button onClick={() => login()} className='connect-button'>
            Select Google Drive Folder
        </button>
    );
};

export default DriveButton;