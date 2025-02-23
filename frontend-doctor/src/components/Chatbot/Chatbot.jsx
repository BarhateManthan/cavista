import React, { useState } from 'react';
import { UserButton, useUser } from "@clerk/clerk-react";
import useSessionPolling from '../useSessionPolling';
import './Chatbot.css';

const Chatbot = () => {
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isVerified, setIsVerified] = useState(true); // Assume session is verified
  const [isLoading, setIsLoading] = useState(false); // New state for loading

  // Use the custom hook for session polling
  useSessionPolling(user?.id, isVerified);

  const handleSendMessage = async () => {
    if (inputText.trim()) {
      // Add user message
      setMessages([...messages, { text: inputText, sender: 'user' }]);

      // Clear input
      setInputText('');

      // Set loading state
      setIsLoading(true);

      try {
        // Send the user's input to the chatbot API
        const response = await fetch('https://hkxwqg2z-5000.inc1.devtunnels.ms/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: inputText }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch bot response');
        }

        const data = await response.json();

        // Add bot's response to the messages
        setMessages((prevMessages) => [
          ...prevMessages,
          { text: data.response, sender: 'bot' },
        ]);
      } catch (error) {
        console.error('Error:', error);
        // Handle error (e.g., show an error message to the user)
        setMessages((prevMessages) => [
          ...prevMessages,
          { text: 'Sorry, something went wrong. Please try again.', sender: 'bot' },
        ]);
      } finally {
        // Reset loading state
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="chatbot-container">
      {/* Sidebar */}
      <div className="chatbot-sidebar">
        <div className="logo">SEWA मित्र</div>
        <ul className="nav">
          {/* We can have here the list of files */}
        </ul>

        {/* User Info at Bottom */}
        <div className="user-info">
          <UserButton />
          <span className="user-name">{user?.fullName?.toUpperCase() || 'GUEST'}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="chatbot-main-content">
        {/* Header */}
        <div className="chatbot-header">
          <h1>Chatbot</h1>
        </div>

        {/* Chat Messages */}
        <div className="chatbot-messages">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`chatbot-message ${message.sender}`}
            >
              <div className="message-content">{message.text}</div>
            </div>
          ))}

          {/* Show loader while waiting for response */}
          {isLoading && (
            <div className="chatbot-message bot">
              <div className="message-content">
                <div className="loader"></div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="chatbot-input-area">
          <input
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button onClick={handleSendMessage} disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;