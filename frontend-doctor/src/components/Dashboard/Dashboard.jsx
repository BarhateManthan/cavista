import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { UserButton, useUser } from "@clerk/clerk-react";
import { X, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import useSessionPolling from '../useSessionPolling';

const Dashboard = () => {
  const { user, isLoaded } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const navigate = useNavigate(); // Initialize useNavigate

  // Use the custom hook for session polling
  useSessionPolling(user?.id, isVerified);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  const handleSendOTP = async () => {
    if (!otpInput) {
      setError('Please enter the OTP');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          otp: otpInput,
          doctor_id: user.id // Send the doctor's ID for session tracking
        })
      });

      if (!response.ok) {
        throw new Error('Failed to verify OTP');
      }

      const data = await response.json();
      if (data.verified) {
        setIsVerified(true);
        setPatientData(data.patient_data);
        alert('OTP Verified! Connection established with the patient.');
      } else {
        setError('Invalid OTP');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="file-upload-container">
      <div className="sidebar">
        <div className="logo">
          <span className="sewa">SEWA</span>
          <span className="hindi">मित्र</span>
          <span className="sewa"> - </span>
          <span className="sewa">Doctor Portal</span>
        </div>
        
        <div className="button-container">
          <button 
            className={`add-button ${isLoading ? 'loading' : ''}`} 
            onClick={() => setShowModal(true)}
            disabled={isLoading}
          >
            Connect to Patient
          </button>
          <button 
            className={`connect-button ${isLoading ? 'loading' : ''}`} 
            onClick={() => navigate('/chat')} // Navigate to /chat
            disabled={isLoading}
          >
            Chat
          </button>
          {error && <div className="error-message">{error}</div>}
        </div>
        
        <div className="user-info">
          <UserButton />
          <span className="user-name">
            {user ? user.fullName?.toUpperCase() : 'GUEST'}
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
                <h2>Connect to Patient</h2>
                {!isVerified ? (
                  <>
                    <p className="otp-message">Enter the OTP shared by the patient.</p>
                    
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
                    <h3>OTP Verified Successfully!</h3>
                    <p>You are now connected to the patient.</p>
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