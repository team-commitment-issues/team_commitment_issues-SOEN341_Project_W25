import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../Context/ThemeContext";
import "../Styles/Profile.css"; // ✅ Import Profile Styles

const EditProfile: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  const USER_ID = "12345"; // Replace with actual logged-in user ID

  useEffect(() => {
    fetch(`/api/users/profile/${USER_ID}`)
      .then((res) => res.json())
      .then((data) => {
        setName(data.firstName + " " + data.lastName);
        setEmail(data.email);
        setProfilePreview(data.profilePicture);
      })
      .catch((error) => console.error("Error fetching profile:", error));
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setProfilePicture(event.target.files[0]);

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
      const response = await fetch(`/api/users/profile/${USER_ID}`, {
        method: "PUT",
        body: formData,
      });

      if (response.ok) {
        alert("Profile updated successfully!");
        navigate("/dashboard");                      //Redirect to dashboard after successful update
      } else {
        alert("Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  return (
    <div className={`profile-container ${theme === "dark" ? "dark-mode" : ""}`}>
      <h2 className="profile-title">Edit Profile</h2>
      <p className="profile-subtitle">Update your profile details.</p>

      {/* Edit Name & Email */}
      <div className="profile-boxes">
        <div className="profile-card">
          <div className="profile-section-title">Edit Name</div>
          <input
            type="text"
            className="profile-input"
            placeholder="Enter full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="profile-card">
          <div className="profile-section-title">Edit Email</div>
          <input
            type="email"
            className="profile-input"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      {/* Edit Profile Picture */}
      <div className="profile-boxes">
        <div className="profile-card">
          <div className="profile-section-title">Edit Profile Picture</div>
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
      <button className="profile-button save" onClick={handleSave}>
        Save Changes
      </button>
      <button className="profile-button back" onClick={() => navigate("/dashboard")}>
        Back to Dashboard
      </button>
    </div>
  );
};

export default EditProfile;
