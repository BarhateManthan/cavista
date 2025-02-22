import { useState } from 'react';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser } from "@clerk/clerk-react";
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUser();
  const navigate = useNavigate();

  // Redirect to dashboard if user is logged in
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

            {/* Desktop Navigation */}
            <div className="desktop-nav">
              <div className="nav-links">
                <a href="/about" className="nav-link">About Us</a>
                <a href="/contact" className="nav-link">Contact Us</a>
                <a href="/terms" className="nav-link">Terms of Service</a>
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

            {/* Mobile menu button */}
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

          {/* Mobile Navigation */}
          {isOpen && (
            <div className="mobile-nav">
              <a href="/about" className="mobile-link">About Us</a>
              <a href="/contact" className="mobile-link">Contact Us</a>
              <a href="/terms" className="mobile-link">Terms of Service</a>
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
      
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              Stay on track with check-ups, right at your fingertips.
            </h1>
          </div>
        </div>
      </section>

      {/* About Section */}
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
    </div>
  );
}

export default Home;