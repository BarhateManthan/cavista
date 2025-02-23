import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { UserButton, useUser } from "@clerk/clerk-react";
import { X, RefreshCw, Share2, Power } from 'lucide-react';
import DriveButton from "./DriveButton";
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, isLoaded } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [otpData, setOtpData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  const handleGetOTP = async () => {
    if (!user?.id) {
      setError('User not logged in');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/generate-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate OTP');
      }

      const data = await response.json();
      setOtpData(data);
      setShowModal(true);
    } catch (err) {
      setError(err.message);
      console.error('Error generating OTP:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    handleGetOTP();
  };

  const handleEndSession = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/end-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to end session');
      }

      setShowModal(false);
      setOtpData(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleShare = () => {
    const message = `Here's your OTP: ${otpData?.otp}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="file-upload-container">
      <div className="sidebar">
        <div className="logo">
          <span className="sewa">SEWA</span>
          <span className="hindi">मित्र</span>
          <span className="sewa"> - </span>
          <span className="sewa">Patient Portal</span>
        </div>
        
        <div className="button-container">
          <button 
            className={`add-button ${isLoading ? 'loading' : ''}`} 
            onClick={handleGetOTP}
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Get OTP'}
          </button>

          <DriveButton 
            onFolderSelect={(folderId, credentials) => {
              try {
                fetch('/download-drive-folder', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    folder_id: folderId,
                    credentials: {
                      client_id: process.env.GOOGLE_CLIENT_ID,
                      access_token: credentials.access_token,
                      token_uri: "https://oauth2.googleapis.com/token",
                      auth_uri: "https://accounts.google.com/o/oauth2/auth",
                      redirect_uris: [window.location.origin + "/dashboard"]
                    }
                  })
                });
              } catch (error) {
                console.error('Error downloading folder:', error);
              }
            }}
          />

          {error && <div className="error-message">{error}</div>}
        </div>
        
        <div className="user-info">
          <UserButton />
          <span className="user-name">
            {user?.fullName?.toUpperCase() || 'GUEST'}
          </span>
        </div>
      </div>
      
      <div className="main-content">
        {showModal && (
          <div className="modal-overlay">
            <div className="modal">
              <button className="close-button" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
              
              <div className="modal-content">
                <h2>Your OTP</h2>
                <div className="otp-display">{otpData?.otp}</div>
                
                <div className="modal-actions">
                  <button className="action-button refresh" onClick={handleRefresh}>
                    <RefreshCw size={20} />
                    Refresh
                  </button>
                  
                  <button className="action-button end-session" onClick={handleEndSession}>
                    <Power size={20} />
                    End Session
                  </button>
                  
                  <button className="action-button share" onClick={handleShare}>
                    <Share2 size={20} />
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
