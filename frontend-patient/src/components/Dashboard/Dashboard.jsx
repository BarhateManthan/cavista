import React, { useState } from 'react';
import './Dashboard.css';
import { UserButton, useUser } from "@clerk/clerk-react";
import { X, RefreshCw, Share2, Power } from 'lucide-react';

const Dashboard = () => {
  const { user, isLoaded } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [otpData, setOtpData] = useState(null);

  if (!isLoaded) {
    return <div>Loading...</div>; // Chill until the user info loads
  }

  const handleGetOTP = async () => {
    if (!user?.id) {
      setError('User not logged in'); // Bruh, login first
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Asking the backend homie for an OTP
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
        throw new Error('Failed to generate OTP'); // Something's sus
      }

      const data = await response.json();
      setOtpData(data); // Got the OTP, let's roll
      setShowModal(true);
    } catch (err) {
      setError(err.message);
      console.error('Error generating OTP:', err);
    } finally {
      setIsLoading(false); // Chill, request is done
    }
  };

  const handleRefresh = () => {
    handleGetOTP(); // Get a fresh OTP, cause why not
  };

  const handleEndSession = async () => {
    try {
      // Telling the backend, "Yo, end this session"
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
        throw new Error('Failed to end session'); // Backend ghosted us
      }

      setShowModal(false); // Close the popup
      setOtpData(null); // Yeet the OTP
    } catch (err) {
      setError(err.message);
    }
  };

  const handleShare = () => {
    // Time to flex that OTP on WhatsApp
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
            {isLoading ? 'Generating...' : 'Get OTP'} {/* The button gotta tell you what's up */}
          </button>
          <button className="connect-button">CONNECT TO DRIVE</button> {/* Placeholder button for future magic */}
          {error && <div className="error-message">{error}</div>} {/* If it breaks, let 'em know */}
        </div>
        
        <div className="user-info">
          <UserButton /> {/* Fancy Clerk auth button */}
          <span className="user-name">
            {user ? user.fullName?.toUpperCase() : 'GUEST'} {/* Either a username or we treat you like an NPC */}
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
                <div className="otp-display">{otpData?.otp}</div> {/* OTP flex zone */}
                
                <div className="modal-actions">
                  <button className="action-button refresh" onClick={handleRefresh}>
                    <RefreshCw size={20} />
                    Refresh {/* Get a new OTP, cause why not */}
                  </button>
                  
                  <button className="action-button end-session" onClick={handleEndSession}>
                    <Power size={20} />
                    End Session {/* Shut it down, we're done here */}
                  </button>
                  
                  <button className="action-button share" onClick={handleShare}>
                    <Share2 size={20} />
                    Share {/* Time to slide that OTP into DMs */}
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