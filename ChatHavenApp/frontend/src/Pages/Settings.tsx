import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/Settings.css"; 

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); 

  const handleSave = () => {
    alert("Settings saved successfully!");
  };

  return (
    <div className="settings-container">
      <h2 className="settings-title">Settings</h2>
      <p className="settings-subtitle">Manage your account settings.</p>

      <div className="settings-card">
        <div className="settings-input-group">
          <label>Username</label>
          <input
            type="text"
            className="settings-input"
            placeholder="Enter new username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="settings-input-group">
          <label>Password</label>
          <div className="password-container">
            <input
              type={showPassword ? "text" : "password"}
              className="settings-input password-input"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span 
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </span>
          </div>
        </div>

        <button className="settings-button save" onClick={handleSave}>
          Save Changes
        </button>

        <button className="settings-button back" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default Settings;
