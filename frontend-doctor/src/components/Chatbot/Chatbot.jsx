import React, { useState } from 'react';
import { UserButton, useUser } from "@clerk/clerk-react";
import { Home, Settings, MessageCircle, LogOut } from 'lucide-react';
import useSessionPolling from '../useSessionPolling';
import './Chatbot.css';

const Chatbot = () => {
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isVerified, setIsVerified] = useState(true); // Assume session is verified

  // Use the custom hook for session polling
  useSessionPolling(user?.id, isVerified);

  const handleSendMessage = () => {
    if (inputText.trim()) {
      // Add user message
      setMessages([...messages, { text: inputText, sender: 'user' }]);

      // Simulate bot response
      setTimeout(() => {
        setMessages((prevMessages) => [
          ...prevMessages,
          { text: `You said: "${inputText}"`, sender: 'bot' },
        ]);
      }, 1000);

      // Clear input
      setInputText('');
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
          <button onClick={handleSendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;