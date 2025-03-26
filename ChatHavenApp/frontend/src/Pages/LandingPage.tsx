import React from 'react';
import { Link } from 'react-router-dom';
import '../Styles/LandingPage.css';

const LandingPage: React.FC = () => {
  return (
    <div className="landing-page">
      <header className="header">
        <h1>Welcome to ChatHaven</h1>
        <nav>
          <div className="nav-buttons">
            <Link to="/login">
              <button className="nav-button">Login</button>
            </Link>
            <Link to="/signup">
              <button className="nav-button">Sign Up</button>
            </Link>
          </div>
        </nav>
      </header>
      <main className="main-content">
        <h2>Connect with your friends and communities</h2>
        <p>
          ChatHaven is a place where you can communicate with your friends and join communities that
          share your interests.
        </p>
        <Link to="/signup" className="cta-button">
          Get Started
        </Link>
      </main>
      <footer className="footer">
        <p>&copy; 2025 ChatHaven. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
