import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/Settings.css"; // Reuse the same styles
import { useTheme } from "../Context/ThemeContext"; // Use the same dark mode setup

const EditProfile: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme(); // Ensures dark mode is applied

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setProfilePicture(event.target.files[0]);

      // Preview Image
      const reader = new FileReader();
      reader.onload = () => setProfilePreview(reader.result as string);
      reader.readAsDataURL(event.target.files[0]);
    }
  };

  const handleSave = async () => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    if (profilePicture) formData.append("profilePicture", profilePicture);

    try {
      const response = await fetch("/api/users/profile/USER_ID", {
        method: "PUT",
        body: formData,
      });

      if (response.ok) {
        alert("Profile updated successfully!");
        navigate("/settings"); // Redirect to Settings after saving
      } else {
        console.error("Profile update failed");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  return (
    <div className={`settings-container ${theme === "dark" ? "dark-mode" : ""}`}>
      <h2 className="settings-title">Edit Profile</h2>
      <p className="settings-subtitle">Update your profile information.</p>

      <div className="settings-boxes">
        {/* Name & Email */}
        <div className="settings-card">
          <div className="settings-section-title">Profile Information</div>
          <div className="settings-input-group">
            <label>Name</label>
            <input
              type="text"
              className="settings-input"
              placeholder="Enter new name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="settings-input-group">
            <label>Email</label>
            <input
              type="email"
              className="settings-input"
              placeholder="Enter new email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Profile Picture */}
        <div className="settings-card">
          <div className="settings-section-title">Profile Picture</div>
          <div className="profile-picture-container">
            {profilePreview ? (
              <img src={profilePreview} alt="Profile Preview" className="profile-preview" />
            ) : (
              <p>No profile picture selected</p>
            )}
            <input type="file" className="file-input" onChange={handleFileChange} />
          </div>
        </div>
      </div>

      {/* Save & Back Buttons */}
      <button className="settings-button save" onClick={handleSave}>
        Save Changes
      </button>

      <button className="settings-button back" onClick={() => navigate("/settings")}>
        Back to Settings
      </button>
    </div>
  );
};

export default EditProfile;
