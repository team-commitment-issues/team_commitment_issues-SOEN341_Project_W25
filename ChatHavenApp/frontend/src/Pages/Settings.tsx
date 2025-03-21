import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/Settings.css";
import { FaEye, FaEyeSlash, FaMoon, FaSun } from "react-icons/fa";
import { useTheme } from "../Context/ThemeContext";
import { updateUsername, updatePassword } from "../Services/authService";

const languages = {
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
};

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [oldUsername, setOldUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [passwordError, setPasswordError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const userData = localStorage.getItem("user");
      console.log("User data from localStorage:", userData);
      
      if (userData) {
        const currentUser = JSON.parse(userData);
        console.log("Parsed user data:", currentUser);
        
        if (currentUser && currentUser.username) {
          console.log("Setting oldUsername to:", currentUser.username);
          setOldUsername(currentUser.username);
        } else {
          console.log("Username not found in user data");
        }
      } else {
        console.log("No user data found in localStorage");
        navigate("/login");
      }
    } catch (error) {
      console.error("Error retrieving username:", error);
      navigate("/login");
    }
  }, [navigate]);

  const [language, setLanguage] = useState(
    localStorage.getItem("language") || "en"
  );

  const handleLanguageChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedLanguage = event.target.value;
    setLanguage(selectedLanguage);
    localStorage.setItem("language", selectedLanguage);
  };

  const validatePassword = (password: string, oldPassword: string, confirmPass: string) => {
    const specialCharRegex = /[!@#$%^&*]/;
    if (password.length < 8)
      return "Password must be at least 8 characters long.";
    if (!specialCharRegex.test(password))
      return "Password must include at least one special character (!@#$%^&*).";
    if (password === oldPassword)
      return "New password cannot be the same as the old password.";
    if (password !== confirmPass)
      return "Passwords do not match.";
    return "";
  };

  const validateUsername = (newUsername: string, oldUsername: string) => {
    if (!newUsername.trim()) 
      return "Username cannot be empty.";
    if (newUsername === oldUsername)
      return "New username cannot be the same as the old username.";
    return "";
  };

  const handleUsernameUpdate = async () => {
    const usernameValidation = validateUsername(newUsername, oldUsername);
    if (usernameValidation) {
      setUsernameError(usernameValidation);
      return;
    }

    if (!oldPassword) {
      setUsernameError("Password is required to change username.");
      return;
    }

    setIsLoading(true);
    setUsernameError("");
    
    try {
      const response = await updateUsername(oldUsername, newUsername, oldPassword);
      
      if (response && response.token) {
        localStorage.setItem("token", response.token);
        
        try {
          const userData = localStorage.getItem("user");
          if (userData) {
            const user = JSON.parse(userData);
            user.username = newUsername;
            localStorage.setItem("user", JSON.stringify(user));
          }
        } catch (error) {
          console.error("Error updating username in localStorage:", error);
        }
        
        setOldUsername(newUsername);
        setNewUsername("");
        setOldPassword("");
        
        setSuccessMessage("Username updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        throw new Error("No token received from server. Username update failed.");
      }
    } catch (error) {
      setUsernameError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    const passwordValidation = validatePassword(newPassword, oldPassword, confirmPassword);
    if (passwordValidation) {
      setPasswordError(passwordValidation);
      return;
    }

    setIsLoading(true);
    setPasswordError("");
    
    try {
      await updatePassword(oldPassword, newPassword);
      
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      setSuccessMessage("Password updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      setPasswordError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="settings-container">
      <h2 className="settings-title">Settings</h2>
      <p className="settings-subtitle">Manage your account settings.</p>

      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}

      <div className="settings-boxes">
        <div className="settings-card">
          <div className="settings-section-title">Change Username</div>
          <div className="username-input-group">
            <label>Current Username</label>
            <input
              type="text"
              className="username-input"
              value={oldUsername}
              readOnly
              style={{ backgroundColor: "#f5f5f5" }}
            />
          </div>
          <div className="username-input-group">
            <label>New Username</label>
            <input
              type="text"
              className="username-input"
              placeholder="Enter new username"
              value={newUsername}
              onChange={(e) => {
                setNewUsername(e.target.value);
                setUsernameError("");
              }}
            />
          </div>
          <div className="settings-input-group">
            <label>Current Password (for verification)</label>
            <div className="password-container">
              <input
                type={showOldPassword ? "text" : "password"}
                className="settings-input password-input"
                placeholder="Enter current password"
                value={oldPassword}
                onChange={(e) => {
                  setOldPassword(e.target.value);
                  setUsernameError("");
                }}
              />
              <span
                className="password-toggle"
                onClick={() => setShowOldPassword(!showOldPassword)}
              >
                {showOldPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            {usernameError && <p className="input-error">{usernameError}</p>}
          </div>
          <button 
            className="settings-button save" 
            onClick={handleUsernameUpdate}
            disabled={isLoading || !newUsername || !oldPassword}
          >
            {isLoading ? "Updating..." : "Update Username"}
          </button>
        </div>

        <div className="settings-card">
          <div className="settings-section-title">Change Password</div>
          <div className="settings-input-group">
            <label>Current Password</label>
            <div className="password-container">
              <input
                type={showOldPassword ? "text" : "password"}
                className="settings-input password-input"
                placeholder="Enter current password"
                value={oldPassword}
                onChange={(e) => {
                  setOldPassword(e.target.value);
                  setPasswordError("");
                }}
              />
              <span
                className="password-toggle"
                onClick={() => setShowOldPassword(!showOldPassword)}
              >
                {showOldPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>
          <div className="settings-input-group">
            <label>New Password</label>
            <div className="password-container">
              <input
                type={showNewPassword ? "text" : "password"}
                className="settings-input password-input"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError("");
                }}
              />
              <span
                className="password-toggle"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>
          <div className="settings-input-group">
            <label>Confirm New Password</label>
            <div className="password-container">
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="settings-input password-input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError("");
                }}
              />
              <span
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            {passwordError && <p className="input-error">{passwordError}</p>}
          </div>
          <button 
            className="settings-button save" 
            onClick={handlePasswordUpdate}
            disabled={isLoading || !oldPassword || !newPassword || !confirmPassword}
          >
            {isLoading ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>

      <div className="settings-boxes">
        <div className="settings-card">
          <div className="settings-section-title">Appearance</div>
          <button className="toggle-button" onClick={toggleTheme}>
            {theme === "dark" ? <FaSun /> : <FaMoon />}
            {theme === "dark" ? " Light Mode" : " Dark Mode"}
          </button>
        </div>

        <div className="settings-card">
          <div className="settings-section-title">Language</div>
          <select
            className="language-select"
            value={language}
            onChange={handleLanguageChange}
          >
            {Object.entries(languages).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        className="settings-button back"
        onClick={() => navigate("/dashboard")}
      >
        Back to Dashboard
      </button>
    </div>
  );
};

export default Settings;