import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../Components/UI/Button';
import styles from '../Styles/dashboardStyles';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<{ firstName: string; lastName: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login'); // Redirect if not logged in
      return;
    }

    // Load user from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  //dropdown menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={styles.container}>
      {/* Dropdown Menu for Profile, Settings, and Logout */}
      <div style={styles.menuContainer} ref={dropdownRef}>
        <button style={styles.menuButton} onClick={() => setDropdownOpen(!dropdownOpen)}>
          ☰ Menu
        </button>
        {dropdownOpen && (
          <div style={styles.dropdownMenu}>
            <button onClick={() => navigate('/profile')} style={styles.menuItem}>View Profile</button>
            <button onClick={() => navigate('/settings')} style={styles.menuItem}>Settings</button>
            <button onClick={handleLogout} style={styles.menuItem}>Logout</button>
          </div>
        )}
      </div>

      <h2 style={styles.heading}>Welcome To ChatHaven {user?.firstName}</h2>
      <p style={styles.text}>Manage your channels.</p>

      <div style={styles.cardContainer}>
        {/* Create a Channel */}
        <div style={styles.card}>
          <h3>Create a Channel</h3>
          <p>Start a New Discussion Space.</p>
          <div style={styles.buttonContainer}>
            <Button text="Create Team" onClick={() => navigate('/create-team')} />
          </div>
        </div>

        {/* Join a Channel */}
        <div style={styles.card}>
          <h3>Join a Channel</h3>
          <p>Join your Friends in a Channel.</p>
          <div style={styles.buttonContainer}>
            <Button text="Join Channel" onClick={() => navigate('/join-channel')} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
