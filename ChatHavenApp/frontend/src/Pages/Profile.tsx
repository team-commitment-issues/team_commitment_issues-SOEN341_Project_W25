import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../Context/ThemeContext.tsx';
import '../Styles/Profile.css';

const EditProfile: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [dateJoined, setDateJoined] = useState('');

  const USER_ID = '12345';

  useEffect(() => {
    fetch(`/api/users/profile/${USER_ID}`)
      .then(res => res.json())
      .then(data => {
        setName(data.firstName + ' ' + data.lastName);
        setEmail(data.email);
        setProfilePreview(data.profilePicture);
        setBio(data.bio || '');
        if (data.dateJoined) {
          setDateJoined(new Date(data.dateJoined).toLocaleDateString());
        } else {
          setDateJoined('N/A');
        }
      })
      .catch(error => console.error('Error fetching profile:', error));
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
    formData.append('name', name);
    formData.append('email', email);
    formData.append('bio', bio);
    if (profilePicture) formData.append('profilePicture', profilePicture);

    try {
      const response = await fetch(`/api/users/profile/${USER_ID}`, {
        method: 'PUT',
        body: formData
      });

      if (response.ok) {
        alert('Profile updated successfully!');
        navigate('/dashboard');
      } else {
        alert('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  return (
    <div className={`profile-container ${theme === 'dark' ? 'dark-mode' : ''}`}>
      <h2 className="profile-title">Edit Profile</h2>

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
      <div className="profile-card">
        <div className="profile-section-title">Bio</div>
        <textarea
          className="profile-input"
          placeholder="Tell us a bit about yourself"
          value={bio}
          onChange={e => setBio(e.target.value)}
          rows={3}
        />
      </div>

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
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="profile-card">
          <div className="profile-section-title">Edit Email</div>
          <input
            type="email"
            className="profile-input"
            placeholder="Enter email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
      </div>

      <button className="profile-button save" onClick={handleSave}>
        Save Changes
      </button>
      <button className="profile-button back" onClick={() => navigate('/dashboard')}>
        Back to Dashboard
      </button>

      <div className="profile-date-container">
        <span className="profile-section-title">Date Joined:</span>{' '}
        <span className="profile-date">{dateJoined}</span>
      </div>
    </div>
  );
};

export default EditProfile;
