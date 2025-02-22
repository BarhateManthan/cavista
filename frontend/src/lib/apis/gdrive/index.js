import { WEBUI_API_BASE_URL } from "../../constants";

const GOOGLE_CLIENT_ID = "553717593899-lo8846a22oaep6glau4mao7bo5n923ar.apps.googleusercontent.com";
const REDIRECT_URI = `${window.location.origin}/home`;

const google = window.google;
const gapi = window.gapi;

const CLIENT_ID = "553717593899-lo8846a22oaep6glau4mao7bo5n923ar.apps.googleusercontent.com"
const API_KEY = "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";
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

let pickerInited = false;
let authClient; // Store the client instance globally

console.log('Google Drive API module loaded');

async function loadGoogleScript() {
  console.log('loadGoogleScript: Starting...');
  try {
    if (window.google?.accounts?.oauth2) {
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      console.log('Google Script loaded successfully');
    };
    script.onerror = () => {
      console.error('Failed to load Google script');
    };
    document.head.appendChild(script);
  } catch (error) {
    console.error('loadGoogleScript Error:', error);
    throw error;
  }
}

export async function initGoogleAuthClient() {
  console.log('initGoogleAuthClient: Starting...');
  try {
    console.log('Loading Google Script...');
    await loadGoogleScript();
    
    console.log('Checking if authClient exists:', !!authClient);
    if (!authClient) {
      console.log('Creating new authClient with config:', {
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        ux_mode: 'popup',
      });
      
      authClient = window.google.accounts.oauth2.initCodeClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        ux_mode: 'popup',
        callback: async (response) => {
          console.log('Google Auth Callback received:', response);
          if (response.error) {
            console.error('Auth error:', response.error);
            return;
          }
          
          console.log('Sending auth code to backend...');
          try {
            const result = await fetch(`${WEBUI_API_BASE_URL}/api/v1/integrations/auth`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XmlHttpRequest'
              },
              credentials: 'include',
              body: JSON.stringify({
                code: response.code,
                redirect_uri: REDIRECT_URI
              })
            });
            
            console.log('Backend auth response status:', result.status);
            const data = await result.json();
            console.log('Backend auth response data:', data);
            
            if(data.success) {
              console.log('Auth successful, initializing picker...');
              await initGoogleDrivePicker();
            } else {
              console.error('Auth failed:', data);
            }
          } catch (error) {
            console.error('Error sending auth code to backend:', error);
          }
        }
      });
      console.log('AuthClient created successfully');
    }
  } catch (error) {
    console.error('initGoogleAuthClient Error:', error);
    throw error;
  }
}

export async function authenticateWithGoogle() {
  try {
    const response = await fetch(`${WEBUI_API_BASE_URL}/integrations/url`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.auth_url) {
      window.location.href = data.auth_url;
    } else {
      console.error('No auth_url in response:', data);
    }
  } catch (error) {
    console.error('Error during authentication:', error);
  }
}

export async function checkAuthStatus(token) {
  console.log('checkAuthStatus: Starting...');
  
  try {
    // OPTIONS preflight
    await fetch(`${WEBUI_API_BASE_URL}/api/v1/integrations/status`, {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization, Content-Type, X-Requested-With'
      }
    });

    // Actual GET request
    const response = await fetch(`${WEBUI_API_BASE_URL}/api/v1/integrations/status`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Response data:', data);
    return data.isAuthenticated;
  } catch (error) {
    console.error('Error in checkAuthStatus:', error);
    return false;
  }
}

export async function refreshToken() {
  try {
    const response = await fetch(`${WEBUI_API_BASE_URL}/integrations/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.message === 'Token refreshed successfully';
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
}

export async function getAccessToken() {
    try {
        const response = await fetch(`${WEBUI_API_BASE_URL}/integrations/token`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Error getting access token:', error);
        throw error;
    }
}

async function loadScript(url) {
    console.log(`1. Loading script: ${url}`);
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => {
            console.log(`2. Script loaded successfully: ${url}`);
            resolve();
        };
        script.onerror = (err) => {
            console.error(`3. Script load error: ${url}`, err);
            reject(err);
        };
        document.body.appendChild(script);
    });
}

export async function initGoogleDrivePicker() {
    console.log('4. Starting initGoogleDrivePicker');
    try {
        console.log('5. Loading Google API script');
        await loadScript('https://apis.google.com/js/api.js');
        
        console.log('6. Initializing gapi client');
        await new Promise((resolve) => {
            gapi.load('client:picker', async () => {
                console.log('7. Gapi loaded, initializing client');
                try {
                    await gapi.client.init({
                        apiKey: API_KEY,
                        clientId: CLIENT_ID,
                        scope: SCOPES,
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
                    });
                    console.log('8. Gapi client initialized successfully');
                    pickerInited = true;
                    resolve();
                } catch (error) {
                    console.error('9. Error initializing gapi client:', error);
                    throw error;
                }
            });
        });
    } catch (error) {
        console.error('10. Error in initGoogleDrivePicker:', error);
        throw error;
    }
}

export async function createPicker() {
    console.log('11. Starting createPicker');
    if (!pickerInited) {
        console.error('12. Picker not initialized');
        throw new Error('Google Picker API not initialized');
    }
    
    try {
        console.log('13. Getting auth instance');
        const auth = gapi.auth2.getAuthInstance();
        console.log('14. Getting current user');
        const user = auth.currentUser.get();
        console.log('15. Getting auth response');
        const accessToken = user.getAuthResponse().access_token;
        console.log('16. Access token obtained:', accessToken ? 'Present' : 'Missing');

        return new Promise((resolve) => {
            console.log('17. Creating picker view');
            const view = new google.picker.DocsView()
                .setIncludeFolders(true)
                .setMimeTypes('application/vnd.google-apps.folder,application/vnd.google-apps.document,application/pdf')
                .setSelectFolderEnabled(true);

            console.log('18. Building picker');
            const picker = new google.picker.PickerBuilder()
                .setAppId(CLIENT_ID)
                .setOAuthToken(accessToken)
                .setDeveloperKey(API_KEY)
                .addView(view)
                .setCallback((data) => {
                    console.log('19. Picker callback received data:', data);
                    const result = pickerCallback(data);
                    if (result) {
                        console.log('20. Picker selection successful:', result);
                        resolve(result);
                    }
                })
                .build();
            
            console.log('21. Showing picker');
            picker.setVisible(true);
        });
    } catch (error) {
        console.error('22. Error in createPicker:', error);
        throw error;
    }
}

function pickerCallback(data) {
    console.log('23. Processing picker callback data:', data);
    if (data.action === google.picker.Action.PICKED) {
        const file = data.docs[0];
        console.log('24. Selected file:', file);
        
        const fileId = file.id;
        let driveId = null;
        
        if (file.url) {
            console.log('25. File URL present:', file.url);
            const urlMatch = file.url.match(/drive\/folders\/([^/?]+)/);
            if (urlMatch) {
                driveId = urlMatch[1];
                console.log('26. DriveId extracted from URL:', driveId);
            }
        }
        
        if (!driveId && file.isShared) {
            driveId = fileId;
            console.log('27. Using fileId as driveId for shared file');
        }
        
        const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
        
        const result = { 
            fileId, 
            driveId,
            isFolder, 
            name: file.name,
            mimeType: file.mimeType,
            isShared: file.isShared,
            organization: file.organizationDisplayName
        };
        
        console.log('28. Final picker result:', result);
        return result;
    }
    console.log('29. No file picked');
    return null;
}

export async function sendFileInfoToBackend(fileInfo, token) {
    console.log('30. Sending file info to backend:', fileInfo);
    try {
        const response = await fetch(`${WEBUI_API_BASE_URL}/api/v1/integrations/download`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                fileId: fileInfo.fileId,
                isFolder: fileInfo.isFolder,
                accessToken: fileInfo.accessToken
            }),
        });
        
        console.log('31. Backend response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('32. Backend response data:', result);
        
        if (result.download_links) {
            console.log('33. Opening download links');
            result.download_links.forEach(url => {
                window.open(`${WEBUI_API_BASE_URL}${url}`, '_blank');
            });
        }
        
        return result;
    } catch (error) {
        console.error('34. Error sending file info to backend:', error);
        throw error;
    }
}

export async function handleDriveSelect(token) {
  console.log('=== handleDriveSelect Started ===');
  console.log('Token present:', !!token);
  
  try {
    console.log('1. Loading Google Script...');
    await loadGoogleScript();
    
    console.log('2. Checking authClient:', !!authClient);
    if (!authClient) {
      console.log('3. No authClient, initializing...');
      await initGoogleAuthClient();
    }
    
    console.log('4. Checking auth status...');
    const isAuthenticated = await checkAuthStatus(token);
    console.log('5. Auth status:', isAuthenticated);
    
    if (!isAuthenticated) {
      console.log('6. Not authenticated, requesting code...');
      if (!authClient) {
        throw new Error('authClient is null after initialization');
      }
      authClient.requestCode();
      return;
    }
    
    console.log('7. User is authenticated, initializing Drive Picker...');
    await initGoogleDrivePicker();
    
    console.log('8. Creating Picker...');
    const pickerResult = await createPicker();
    console.log('9. Picker result:', pickerResult);
    
    console.log('10. Getting access token...');
    const accessToken = await getAccessToken();
    
    console.log('11. Sending file info to backend...');
    await sendFileInfoToBackend(pickerResult, accessToken);
    
  } catch (error) {
    console.error('Error in handleDriveSelect:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    if (error.message.includes('401')) {
      console.log('Redirecting to sign-in due to 401');
      window.location.href = '/sign-in';
    }
  }
}