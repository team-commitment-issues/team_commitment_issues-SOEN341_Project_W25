import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserList from "../Components/userList";
import TeamList from "../Components/TeamList";
import ChannelList from "../Components/ChannelList";
import DirectMessages from "../Components/DirectMessages";
import AdminActions from "../Components/AdminActions";
import styles from "../Styles/dashboardStyles";

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div style={styles.container}>
      {/* Dropdown Menu for Profile, Settings, and Logout */}
      <div style={styles.menuContainer} ref={dropdownRef}>
        <button
          style={styles.menuButton}
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          ☰ Menu
        </button>
        {dropdownOpen && (
          <div style={styles.dropdownMenu}>
            <button
              onClick={() => navigate("/profile")}
              style={styles.menuItem}
            >
              Profile
            </button>
            <button
              onClick={() => navigate("/settings")}
              style={styles.menuItem}
            >
              Settings
            </button>
            <button onClick={handleLogout} style={styles.menuItem}>
              Logout
            </button>
          </div>
        )}
      </div>

      <h2 style={styles.heading}>Ultimate Admin Dashboard</h2>
      <p style={styles.text}>Manage users, teams, channels, and messages.</p>

      <div style={styles.cardContainer}>
        {/* Create a Channel */}
        <div style={styles.card}>
          <h3>Create a Channel</h3>
          <p>Start a New Discussion Space.</p>
          <div style={styles.buttonContainer}>
            <Button text="Create Team" onClick={() => navigate('/create-team')} />
          </div>
        </div>

        <DirectMessages />
      </div>

      {/* ✅ Assign Admins Box Now Positioned at Bottom-Left */}
      <div style={styles.adminActionsContainer}>
        <AdminActions />
      </div>
    </div>
  );
};

export default AdminDashboard;
