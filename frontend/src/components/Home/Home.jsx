import { useState, useEffect } from 'react';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from 'react-router-dom';
import './Home.css';
import { handleDriveSelect } from "../../lib/apis/gdrive";

function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const { isSignedIn, getToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isSignedIn) {
      navigate('/dashboard');
    }
  }, [isSignedIn, navigate]);

  const handleDriveSelectClick = async () => {
    console.log('=== Starting Google Drive Selection Flow ===');
    try {
      console.log('Getting Clerk token...');
      const token = await getToken();
      console.log('Token received:', token ? 'Present' : 'Missing');
      
      console.log('Calling handleDriveSelect...');
      await handleDriveSelect(token);
    } catch (error) {
      console.error('Error in handleDriveSelectClick:', error);
    }
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="container">
          <div className="nav-content">
            <a href="/" className="logo">
              <span className="logo-bold">SEWA</span>
              <span className="logo-normal">मित्र</span>
            </a>

            <div className="desktop-nav">
              <div className="nav-links">
                <a href="/about" className="nav-link">About Us</a>
                <a href="/contact" className="nav-link">Contact Us</a>
              </div>
            </div>

            <div className="auth-buttons">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="button-primary">Login</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="button-primary">Sign Up</button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>

            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="mobile-menu-button"
            >
              <svg className="menu-icon" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {isOpen && (
            <div className="mobile-nav">
              <a href="/about" className="mobile-link">About Us</a>
              <a href="/contact" className="mobile-link">Contact Us</a>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="mobile-button">Login</button>
                </SignInButton>
                <SignInButton mode="modal">
                  <button className="mobile-button">Sign Up</button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <div className="mobile-user-button">
                  <UserButton />
                </div>
              </SignedIn>
            </div>
          )}
        </div>
      </nav>
      
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              Stay on track with check-ups, right at your fingertips.
            </h1>
          </div>
        </div>
      </section>

      <section className="about">
        <div className="container">
          <h2 className="about-title">About SEWA मित्र</h2>
          <div className="info-grid">
            <div className="info-box">
              <p>Reliable health management at your fingertips.</p>
            </div>
            <div className="info-box">
              <p>Secure scheduling for hassle-free checkups.</p>
            </div>
            <div className="info-box">
              <p>Stay informed with expert wellness tips.</p>
            </div>
          </div>
        </div>
      </section>

      {isSignedIn && (
        <button
          onClick={handleDriveSelectClick}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-4"
        >
          Import from Google Drive
        </button>
      )}
    </div>
  );
}

export default Home;