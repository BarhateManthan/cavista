import React, { useState, useEffect } from 'react';
import { UserButton, useUser } from "@clerk/clerk-react";
import useSessionPolling from '../useSessionPolling';
import './Chatbot.css';

const Chatbot = () => {
  const { user } = useUser();
  const [messages, setMessages] = useState([]); // Stores chat messages
  const [inputText, setInputText] = useState(''); // Stores input text from the user
  const [isVerified, setIsVerified] = useState(true); // Simulating verification status (we don't like unverified peeps)
  const [isLoading, setIsLoading] = useState(false); // Shows loading state for messages
  const [files, setFiles] = useState([]); // Stores available files
  const [selectedFile, setSelectedFile] = useState(null); // Stores the currently selected file
  const [showPdfViewer, setShowPdfViewer] = useState(false); // Controls the PDF modal visibility

  // Keep session alive (because ghosts shouldn’t be chatting)
  useSessionPolling(user?.id, isVerified);

  useEffect(() => {
    // Fetch available files when the component loads
    const fetchFiles = async () => {
      try {
        const response = await fetch('https://hkxwqg2z-5000.inc1.devtunnels.ms/kb_files');
        if (!response.ok) throw new Error('Failed to fetch files');
        const data = await response.json();
        setFiles(data.filenames); // Store those file names
      } catch (error) {
        console.error('Bruh, error fetching files:', error);
      }
    };

    fetchFiles();
  }, []);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return; // Don't send empty messages, duh.

    setMessages([...messages, { text: inputText, sender: 'user' }]); // Add user message
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('https://hkxwqg2z-5000.inc1.devtunnels.ms/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: inputText }),
      });

      if (!response.ok) throw new Error('Chatbot is having a meltdown');

      const data = await response.json();
      setMessages((prevMessages) => [...prevMessages, { text: data.response, sender: 'bot' }]); // Add bot response
    } catch (error) {
      console.error('Error:', error);
      setMessages((prevMessages) => [...prevMessages, { text: 'Oops, chatbot died. Try again.', sender: 'bot' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClick = (filename) => {
    // If it's a PDF, show it in the viewer, else open in a new tab
    if (filename.toLowerCase().endsWith('.pdf')) {
      setSelectedFile(`https://hkxwqg2z-5000.inc1.devtunnels.ms/kb_files/${filename}`);
      setShowPdfViewer(true);
    } else {
      window.open(`https://hkxwqg2z-5000.inc1.devtunnels.ms/kb_files/${filename}`, '_blank');
    }
  };

  return (
    <div className="chatbot-container">
      {/* Sidebar for navigation */}
      <div className="chatbot-sidebar">
        <div className="logo">SEWA मित्र</div>
        <ul className="nav">
          {files.map((file, index) => (
            <li key={index} onClick={() => handleFileClick(file)} className="file-item">
              {file} {/* Show file names */}
            </li>
          ))}
        </ul>

        <div className="user-info">
          <UserButton />
          <span className="user-name">{user?.fullName?.toUpperCase() || 'GUEST'}</span>
        </div>
      </div>

      {/* Main chat area */}
      <div className="chatbot-main-content">
        <div className="chatbot-header">
          <h1>Chatbot</h1>
        </div>

        <div className="chatbot-messages">
          {messages.map((message, index) => (
            <div key={index} className={`chatbot-message ${message.sender}`}>
              <div className="message-content">{message.text}</div>
            </div>
          ))}

          {isLoading && (
            <div className="chatbot-message bot">
              <div className="message-content">
                <div className="loader"></div> {/* Typing indicator */}
              </div>
            </div>
          )}
        </div>

        {/* Input field for user messages */}
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

      {/* PDF Viewer Modal */}
      {showPdfViewer && (
        <div className="pdf-modal">
          <div className="pdf-modal-content">
            <button className="close-button" onClick={() => setShowPdfViewer(false)}>×</button>
            <iframe src={selectedFile} title="PDF Viewer" width="100%" height="100%" style={{ border: 'none' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;