import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/Settings.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [oldUsername, setOldUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleSave = () => {
    if (!oldUsername && !oldPassword) {
      alert(
        "You must enter at least your old username or old password to make changes."
      );
      return;
    }
    alert("Settings saved successfully!");
  };

  return (
    <div className="settings-container">
      <h2 className="settings-title">Settings</h2>
      <p className="settings-subtitle">Manage your account settings.</p>

      <div className="settings-boxes">
        {/* Username Box */}
        <div className="settings-card">
          <div className="settings-section-title">Change Username</div>
          <div className="settings-input-group">
            <label>Old Username</label>
            <input
              type="text"
              className="settings-input"
              placeholder="Enter current username"
              value={oldUsername}
              onChange={(e) => setOldUsername(e.target.value)}
            />
          </div>
          <div className="settings-input-group">
            <label>New Username</label>
            <input
              type="text"
              className="settings-input"
              placeholder="Enter new username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
            />
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
                onChange={(e) => setOldPassword(e.target.value)}
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
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <span
                className="password-toggle"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>
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
