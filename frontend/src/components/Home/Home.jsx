import { useState } from 'react';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser } from "@clerk/clerk-react";
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUser();
  const navigate = useNavigate();

  SignedIn && user && navigate('/dashboard');

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
              <div className="icon-container">
                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
              </div>
              <h3 className="info-title">Reliable Health Management</h3>
              <p className="info-text">Access your health records and manage appointments with ease, all in one place.</p>
            </div>
            <div className="info-box">
              <div className="icon-container">
                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
              <h3 className="info-title">Secure Scheduling</h3>
              <p className="info-text">Book and manage your checkups securely, without any hassle.</p>
            </div>
            <div className="info-box">
              <div className="icon-container">
                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
              </div>
              <h3 className="info-title">Expert Wellness Tips</h3>
              <p className="info-text">Stay informed with tips and advice from health experts.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;