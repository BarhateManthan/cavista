import React, { useEffect, useState } from 'react';

const DriveFolderSelector = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Move these to environment variables
  const GOOGLE_CLIENT_ID = "553717593899-lo8846a22oaep6glau4mao7bo5n923ar.apps.googleusercontent.com"
  const GOOGLE_DEVELOPER_KEY= "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"

  useEffect(() => {
    const loadGoogleAPIs = () => {
      // Load the Google API client library
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.onload = () => {
        window.gapi.load('client:auth2', initializeGoogleDriveAPI);
      };
      document.body.appendChild(gapiScript);

      // Load the Google Picker API
      const pickerScript = document.createElement('script');
      pickerScript.src = 'https://apis.google.com/js/api.js';
      document.body.appendChild(pickerScript);

      window.onApiLoad = () => {
        window.gapi.load('picker', () => {
          console.log('Picker API loaded');
        });
      };

      return () => {
        document.body.removeChild(gapiScript);
        document.body.removeChild(pickerScript);
      };
    };

    loadGoogleAPIs();
  }, []);

  const initializeGoogleDriveAPI = async () => {
    try {
      await window.gapi.client.init({
        apiKey: GOOGLE_DEVELOPER_KEY,
        clientId: GOOGLE_CLIENT_ID,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        scope: 'https://www.googleapis.com/auth/drive.readonly'
      });
      
      const authInstance = window.gapi.auth2.getAuthInstance();
      setIsAuthenticated(authInstance.isSignedIn.get());
      
      authInstance.isSignedIn.listen((isSignedIn) => {
        setIsAuthenticated(isSignedIn);
      });
    } catch (error) {
      setError(`Failed to initialize Google Drive API: ${error.details || error.message}`);
      console.error('Error initializing Google Drive API:', error);
    }
  };

  const handleAuth = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const authInstance = window.gapi.auth2.getAuthInstance();
      if (!authInstance) {
        throw new Error('Auth instance not initialized');
      }

      await authInstance.signIn({
        prompt: 'select_account'
      });
    } catch (error) {
      setError(`Authentication failed: ${error.details || error.message}`);
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = () => {
    if (!window.google || !window.google.picker) {
      setError('Google Picker API not loaded');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const authInstance = window.gapi.auth2.getAuthInstance();
      const token = authInstance.currentUser.get().getAuthResponse().access_token;

      const picker = new window.google.picker.PickerBuilder()
        .addView(new window.google.picker.DocsView()
          .setIncludeFolders(true)
          .setSelectFolderEnabled(true)
          .setMimeTypes('application/vnd.google-apps.folder'))
        .setOAuthToken(token)
        .setDeveloperKey(GOOGLE_DEVELOPER_KEY)
        .setCallback(handlePickerCallback)
        .build();
      
      picker.setVisible(true);
    } catch (error) {
      setError(`Failed to open folder picker: ${error.message}`);
      setIsLoading(false);
    }
  };

  const handlePickerCallback = async (data) => {
    if (data.action === 'picked') {
      const folder = data.docs[0];
      setSuccess(`Selected folder: ${folder.name} (ID: ${folder.id})`);
      // You can handle the selected folder data here
      console.log('Selected folder:', folder);
    } else if (data.action === 'cancel') {
      setSuccess('');
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-4 border rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Google Drive Folder Selector</h2>
      
      <div className="space-y-4">
        {!isAuthenticated ? (
          <button 
            onClick={handleAuth}
            disabled={isLoading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign in with Google'}
          </button>
        ) : (
          <button 
            onClick={handleSelect}
            disabled={isLoading}
            className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Select Drive Folder'}
          </button>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriveFolderSelector;