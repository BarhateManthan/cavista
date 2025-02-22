import React, { useEffect, useState, useCallback } from 'react';

const LoaderIcon = () => (
  <svg className="w-5 h-5 mr-2 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const FolderIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function DriveFolderSelector() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Configuration
  const GOOGLE_CLIENT_ID = "553717593899-lo8846a22oaep6glau4mao7bo5n923ar.apps.googleusercontent.com";
  const GOOGLE_DEVELOPER_KEY = "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";
  const API_BASE_URL = 'http://localhost:8080';

  const resetStatus = () => {
    setError('');
    setSuccess('');
  };

  const showError = (message) => {
    setError(message);
    setSuccess('');
    setIsLoading(false);
  };

  const showSuccess = (message) => {
    setSuccess(message);
    setError('');
    setIsLoading(false);
  };

  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/integrations/status`, {
        credentials: 'include'
      });
      const data = await response.json();
      setIsAuthenticated(data.isAuthenticated);
    } catch (error) {
      console.error('Error checking auth status:', error);
      showError('Failed to check authentication status');
    }
  }, [API_BASE_URL]);

  const initializeGoogleAPIs = useCallback(async () => {
    try {
      // Load Google Identity Services
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });

      // Load Google API Client
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
          window.gapi.load('client:picker', async () => {
            try {
              await window.gapi.client.init({
                apiKey: GOOGLE_DEVELOPER_KEY,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
              });
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        };
        script.onerror = reject;
        document.body.appendChild(script);
      });

      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing Google APIs:', error);
      showError('Failed to initialize Google APIs');
    }
  }, [GOOGLE_DEVELOPER_KEY]);

  useEffect(() => {
    checkAuthStatus();
    initializeGoogleAPIs();
  }, [checkAuthStatus, initializeGoogleAPIs]);

  const handleAuth = async () => {
    setIsLoading(true);
    resetStatus();

    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: async (response) => {
          if (response.access_token) {
            try {
              const tokenResponse = await fetch(`${API_BASE_URL}/api/v1/integrations/token`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                  access_token: response.access_token,
                  refresh_token: response.refresh_token,
                  expiry: new Date(Date.now() + response.expires_in * 1000).toISOString()
                }),
              });

              if (!tokenResponse.ok) {
                throw new Error(`HTTP error! status: ${tokenResponse.status}`);
              }

              setIsAuthenticated(true);
              showSuccess('Successfully connected to Google Drive');
            } catch (error) {
              showError('Failed to save authentication token');
            }
          }
        },
        error_callback: (error) => {
          console.error('Auth error:', error);
          showError('Authentication failed');
        }
      });

      client.requestAccessToken();
    } catch (error) {
      showError('Failed to initialize Google authentication');
    }
  };

  const handleSelect = async () => {
    if (!isInitialized) {
      showError('Google Drive API not initialized');
      return;
    }

    setIsLoading(true);
    resetStatus();

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/integrations/token`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const accessToken = data.access_token;

      const picker = new window.google.picker.PickerBuilder()
        .addView(new window.google.picker.DocsView()
          .setIncludeFolders(true)
          .setSelectFolderEnabled(true)
          .setMimeTypes('application/vnd.google-apps.folder'))
        .setOAuthToken(accessToken)
        .setDeveloperKey(GOOGLE_DEVELOPER_KEY)
        .setCallback(handlePickerCallback)
        .setSize(800, 600)
        .setTitle('Select a Google Drive Folder')
        .build();
      
      picker.setVisible(true);
    } catch (error) {
      showError('Failed to open Google Drive selector');
    }
  };

  const handlePickerCallback = async (data) => {
    if (data.action === 'picked') {
      const folder = data.docs[0];
      setSuccess(`Selected folder: ${folder.name}`);
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/integrations/download`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            fileInfo: {
              fileId: folder.id,
              isFolder: true
            }
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        showSuccess(`Successfully downloaded folder: ${folder.name}`);
      } catch (error) {
        showError(`Failed to download folder: ${error.message}`);
      }
    } else if (data.action === 'cancel') {
      setIsLoading(false);
      resetStatus();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6 bg-white rounded-xl shadow-lg">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Google Drive Integration</h2>
        <p className="text-gray-600">Select and download folders from your Google Drive</p>
      </div>

      <div className="space-y-4">
        {!isAuthenticated ? (
          <button
            onClick={handleAuth}
            disabled={isLoading || !isInitialized}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <LoaderIcon />
                Connecting...
              </>
            ) : (
              <>
                <FolderIcon />
                Connect Google Drive
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleSelect}
            disabled={isLoading || !isInitialized}
            className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <LoaderIcon />
                Processing...
              </>
            ) : (
              <>
                <FolderIcon />
                Select Drive Folder
              </>
            )}
          </button>
        )}

        {error && (
          <div className="flex items-center p-4 text-red-800 bg-red-50 rounded-lg">
            <AlertIcon />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center p-4 text-green-800 bg-green-50 rounded-lg">
            <CheckIcon />
            <p>{success}</p>
          </div>
        )}
      </div>
    </div>
  );
}