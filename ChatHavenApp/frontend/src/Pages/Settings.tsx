import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/Settings.css";
import { FaEye, FaEyeSlash, FaMoon, FaSun } from "react-icons/fa";

const languages = {
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
};

const Settings: React.FC = () => {
  const navigate = useNavigate();

  const [oldUsername, setOldUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [usernameError, setUsernameError] = useState("");

  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  const [language, setLanguage] = useState(
    localStorage.getItem("language") || "en"
  );

  useEffect(() => {
    document.body.classList.toggle("dark-mode", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.body.classList.toggle("dark-mode", newTheme === "dark");
  };

  const handleLanguageChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedLanguage = event.target.value;
    setLanguage(selectedLanguage);
    localStorage.setItem("language", selectedLanguage);
  };

  const validatePassword = (password: string, oldPassword: string) => {
    const specialCharRegex = /[!@#$%^&*]/;
    if (password.length < 8)
      return "Password must be at least 8 characters long.";
    if (!specialCharRegex.test(password))
      return "Password must include at least one special character (!@#$%^&*).";
    if (password === oldPassword)
      return "New password cannot be the same as the old password.";
    return "";
  };

  const validateUsername = (newUsername: string, oldUsername: string) => {
    if (newUsername === oldUsername)
      return "New username cannot be the same as the old username.";
    return "";
  };

  const handleSave = () => {
    let valid = true;

    if (newUsername) {
      const usernameValidation = validateUsername(newUsername, oldUsername);
      if (usernameValidation) {
        setUsernameError(usernameValidation);
        valid = false;
      }
    }

    if (newPassword) {
      const passwordValidation = validatePassword(newPassword, oldPassword);
      if (passwordValidation) {
        setPasswordError(passwordValidation);
        valid = false;
      }
    }

    if (!valid) return;

    setUsernameError("");
    setPasswordError("");
    alert("Settings saved successfully!");
  };

  return (
    <div className="settings-container">
      <h2 className="settings-title">Settings</h2>
      <p className="settings-subtitle">Manage your account settings.</p>

      <div className="settings-boxes">
        <div className="settings-card">
          <div className="settings-section-title">Change Username</div>
          <div className="username-input-group">
            <label>Old Username</label>
            <input
              type="text"
              className="username-input"
              placeholder="Enter current username"
              value={oldUsername}
              onChange={(e) => {
                setOldUsername(e.target.value);
                setUsernameError("");
              }}
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
            {usernameError && <p className="input-error">{usernameError}</p>}
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-section-title">Change Password</div>
          <div className="settings-input-group">
            <label>Old Password</label>
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
            {passwordError && <p className="input-error">{passwordError}</p>}
          </div>
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

      <button className="settings-button save" onClick={handleSave}>
        Save Changes
      </button>

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
