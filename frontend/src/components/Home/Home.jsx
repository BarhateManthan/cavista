// App.jsx
import { useState } from 'react';
import './Home.css';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
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
            <button className="button-primary">Login</button>
            <button className="button-primary">Sign Up</button>
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
            <button className="mobile-button">Login</button>
            <button className="mobile-button">Sign Up</button>
          </div>
        )}
      </div>
    </nav>
  );
}

function InfoBox({ text }) {
  return (
    <div className="info-box">
      <p>{text}</p>
    </div>
  );
}

function App() {
  return (
    <div className="app">
      <Navbar />
      
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
            <InfoBox text="Reliable health management at your fingertips." />
            <InfoBox text="Secure scheduling for hassle-free checkups." />
            <InfoBox text="Stay informed with expert wellness tips." />
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;