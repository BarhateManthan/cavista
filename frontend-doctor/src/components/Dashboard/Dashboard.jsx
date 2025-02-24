import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { UserButton, useUser } from "@clerk/clerk-react";
import { X, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // For switching pages
import useSessionPolling from '../useSessionPolling';

const Dashboard = () => {
  const { user, isLoaded } = useUser(); // Get user info
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const navigate = useNavigate(); // Page navigation

  // Keep checking session status (like a stalker)
  useSessionPolling(user?.id, isVerified);

  if (!isLoaded) {
    return <div>Loading...</div>; // If user info ain't here yet
  }

  // Sends OTP for verification, because we don’t trust you
  const handleSendOTP = async () => {
    if (!otpInput) {
      setError('Bruh, enter the OTP first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:9000/api/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          otp: otpInput,
          doctor_id: user.id // Identify the doc
        })
      });

      if (!response.ok) {
        throw new Error('OTP verification failed, you noob');
      }

      const data = await response.json();
      if (data.verified) {
        setIsVerified(true);
        // setPatientData(data.patient_data);
        alert('OTP Verified! You and the patient are BFFs now');
      } else {
        setError('Nah, wrong OTP');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="file-upload-container">
      {/* Sidebar for navigation and buttons */}
      <div className="sidebar">
        <div className="logo">
          <span className="sewa">SEWA</span>
          <span className="hindi">मित्र</span>
          <span className="sewa"> - </span>
          <span className="sewa">Doctor Portal</span>
        </div>
        
        <div className="button-container">
          {/* Open modal to connect with a patient */}
          <button 
            className={`add-button ${isLoading ? 'loading' : ''}`} 
            onClick={() => setShowModal(true)}
            disabled={isLoading}
          >
            Connect to Patient
          </button>
          {/* Navigate to chat section */}
          <button 
            className={`connect-button ${isLoading ? 'loading' : ''}`} 
            onClick={() => navigate('/chat')} // Go to /chat
            disabled={isLoading}
          >
            Chat
          </button>
          {error && <div className="error-message">{error}</div>}
        </div>
        
        {/* Show user info and logout button */}
        <div className="user-info">
          <UserButton />
          <span className="user-name">
            {user ? user.fullName?.toUpperCase() : 'GUEST'}
          </span>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="main-content">
        {showModal && (
          <div className="modal-overlay">
            <div className="modal">
              <button className="close-button" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
              
              <div className="modal-content">
                <h2>Connect to Patient</h2>
                {!isVerified ? (
                  <>
                    <p className="otp-message">Enter the OTP from the patient. No peeking!</p>
                    
                    <div className="verify-section">
                      <input 
                        type="text" 
                        placeholder="Enter OTP to verify" 
                        className="otp-input" 
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                      />
                      <button 
                        className="verify-button" 
                        onClick={handleSendOTP}
                        disabled={isLoading}
                      >
                        <Send size={20} />
                        Verify
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="success-message">
                    <h3>OTP Verified! You made it.</h3>
                    <p>You're now connected to the patient.</p>
                    {patientData && (
                      <div className="patient-data">
                        <h4>Patient Data:</h4>
                        <pre>{JSON.stringify(patientData, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;