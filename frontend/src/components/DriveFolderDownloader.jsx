import React, { useState, useEffect } from 'react';

const DriveFolderDownloader = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [googleReady, setGoogleReady] = useState(false);

  // Load Google Identity Services script
  useEffect(() => {
    const checkGoogleLoaded = () => {
      if (window.google?.accounts?.oauth2) {
        setGoogleReady(true);
        return true;
      }
      return false;
    };

    if (checkGoogleLoaded()) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      const interval = setInterval(() => {
        if (checkGoogleLoaded()) {
          clearInterval(interval);
          console.log('Google OAuth2 client loaded');
        }
      }, 100);
    };

    script.onerror = () => {
      setError('Failed to load Google authentication services');
      setGoogleReady(false);
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Check authentication status
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/v1/integrations/status');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setIsAuthenticated(data.isAuthenticated);
      } catch (err) {
        console.error('Auth check error:', err);
        setError('Failed to check authentication status');
      }
    };

    if (googleReady) checkAuthStatus();
  }, [googleReady]);

  const handleAuth = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!window.google?.accounts?.oauth2) {
        throw new Error('Google authentication services not fully loaded');
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: "553717593899-lo8846a22oaep6glau4mao7bo5n923ar.apps.googleusercontent.com",
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: async (response) => {
          if (response.error) {
            throw new Error(response.error);
          }

          try {
            const tokenResponse = await fetch('/api/v1/integrations/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: response.access_token,
                expires_in: response.expires_in
              }),
            });

            if (!tokenResponse.ok) {
              const errorData = await tokenResponse.json();
              throw new Error(errorData.detail || 'Failed to save token');
            }

            setIsAuthenticated(true);
          } catch (err) {
            setError(err.message);
          } finally {
            setIsLoading(false);
          }
        },
      });

      client.requestAccessToken();
    } catch (error) {
      console.error('Authentication error:', error);
      setError(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '2rem',
      maxWidth: '600px',
      margin: '2rem auto',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      borderRadius: '8px'
    }}>
      <h2 style={{ color: '#1a73e8', marginBottom: '1.5rem' }}>
        Google Drive Integration
      </h2>
      
      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#ffecec',
          color: '#d93025',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {!isAuthenticated ? (
        <button 
          onClick={handleAuth} 
          disabled={!googleReady || isLoading}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: !googleReady || isLoading ? '#f1f3f4' : '#1a73e8',
            color: !googleReady || isLoading ? '#5f6368' : 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            cursor: !googleReady || isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          {!googleReady ? (
            'Loading Google Services...'
          ) : isLoading ? (
            'Authenticating...'
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a5.94 5.94 0 1 1 0-11.88c1.094 0 2.174.327 3.083.945l2.107-2.107A9.928 9.928 0 0 0 12.545 2C7.021 2 2.545 6.477 2.545 12s4.476 10 10 10c5.523 0 10-4.477 10-10c0-.67-.069-1.325-.201-1.955H12.545z"/>
              </svg>
              Sign in with Google
            </>
          )}
        </button>
      ) : (
        <div style={{
          padding: '1rem',
          backgroundColor: '#e8f0fe',
          borderRadius: '4px',
          color: '#1967d2'
        }}>
          ✓ Successfully authenticated with Google Drive
        </div>
      )}
    </div>
  );
};

export default DriveFolderDownloader;