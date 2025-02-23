import React, { useState, useEffect } from 'react';
import { UserButton, useUser } from "@clerk/clerk-react";
import useSessionPolling from '../useSessionPolling';
import './Chatbot.css';

const Chatbot = () => {
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isVerified, setIsVerified] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState(() => {
    const cached = localStorage.getItem('draftNote');
    return cached || '';
  });

  useSessionPolling(user?.id, isVerified);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch('https://hkxwqg2z-5000.inc1.devtunnels.ms/kb_files');
        if (!response.ok) throw new Error('Failed to fetch files');
        const data = await response.json();
        setFiles(data.filenames);
      } catch (error) {
        console.error('Error fetching files:', error);
      }
    };

    fetchFiles();
  }, []);

  const handleNoteChange = (e) => {
    const newText = e.target.value;
    setNoteText(newText);
    localStorage.setItem('draftNote', newText);
  };

  const handleSubmitNote = async () => {
    if (!noteText.trim()) return;

    try {
      const fileName = `note_${new Date().toISOString().slice(0,10)}.txt`;
      const fileContent = noteText;
    
      // Save to localStorage first
      localStorage.setItem(fileName, fileContent);
    
      // Create a Blob from the file content
      const blob = new Blob([fileContent], { type: 'text/plain' });
      
      // Create FormData and append the file
      const formData = new FormData();
      formData.append('file', blob, fileName);
    
      // Send the request with FormData
      const response = await fetch('https://hkxwqg2z-5000.inc1.devtunnels.ms/kb_add_file', {
        method: 'POST',
        body: formData  // Remove Content-Type header - it will be set automatically
      });
    
      if (!response.ok) throw new Error('Failed to save note');
    
      localStorage.removeItem('draftNote');
      setNoteText('');
      setShowNoteModal(false);
    
      const filesResponse = await fetch('https://hkxwqg2z-5000.inc1.devtunnels.ms/kb_files');
      const data = await filesResponse.json();
      setFiles(data.filenames);
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    setMessages([...messages, { text: inputText, sender: 'user' }]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('https://hkxwqg2z-5000.inc1.devtunnels.ms/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: inputText }),
      });

      if (!response.ok) throw new Error('Failed to fetch bot response');

      const data = await response.json();
      setMessages((prevMessages) => [...prevMessages, { text: data.response, sender: 'bot' }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: 'Sorry, something went wrong. Please try again.', sender: 'bot' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClick = (filename) => {
    if (filename.toLowerCase().endsWith('.pdf')) {
      setSelectedFile(`https://hkxwqg2z-5000.inc1.devtunnels.ms/kb_files/${filename}`);
      setShowPdfViewer(true);
    } else {
      window.open(`https://hkxwqg2z-5000.inc1.devtunnels.ms/kb_files/${filename}`, '_blank');
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-sidebar">
        <div className="logo">SEWA मित्र</div>
        <ul className="nav">
          {files.map((file, index) => (
            <li key={index} onClick={() => handleFileClick(file)} className="file-item">
              {file}
            </li>
          ))}
          <li className="add-note-button" onClick={() => setShowNoteModal(true)}>
            <span className="plus-icon">+</span>
            Add Note
          </li>
        </ul>

        <div className="user-info">
          <UserButton />
          <span className="user-name">{user?.fullName?.toUpperCase() || 'GUEST'}</span>
        </div>
      </div>

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
                <div className="loader"></div>
              </div>
            </div>
          )}
        </div>

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

      {showPdfViewer && (
        <div className="pdf-modal">
          <div className="pdf-modal-content">
            <button className="close-button" onClick={() => setShowPdfViewer(false)}>×</button>
            <iframe
              src={selectedFile}
              title="PDF Viewer"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            />
          </div>
        </div>
      )}

      {showNoteModal && (
        <div className="note-modal">
          <div className="note-modal-content">
            <h2>Add Note</h2>
            <textarea
              value={noteText}
              onChange={handleNoteChange}
              placeholder="Type your note here..."
            />
            <div className="note-modal-buttons">
              <button onClick={() => setShowNoteModal(false)}>Cancel</button>
              <button onClick={handleSubmitNote}>Save Note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;