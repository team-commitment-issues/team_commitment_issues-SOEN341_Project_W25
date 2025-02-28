import React, { useState } from 'react';
import '../../Styles/modal.css';

interface ModalProps {
  onClose: () => void;
  title: string;
  options: string[];
}

const Modal: React.FC<ModalProps> = ({ onClose, title, options }) => {
  const [selectedOption, setSelectedOption] = useState<string>('');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
        <div className="sidebar">
          {options.map(option => (
            <button key={option} className="option-button" onClick={() => setSelectedOption(option)}>
              {option}
            </button>
          ))}
        </div>
        <div className="main-content">
          <button className="close-button" onClick={onClose}>&times;</button>
          <div className="modal-header">{title}</div>
          <div>
            {selectedOption === 'Manage Profile' && (
              <div>
                <h3>Edit Profile</h3>
                <button className="option-button">Change Profile Picture</button>
                <button className="option-button">Change User Name</button>
                <button className="option-button">Change Name</button>
                <button className="option-button">Change Email Address</button>
                <button className="option-button">Change Password</button>
              </div>
            )}
            {selectedOption === 'Privacy Settings' && (
              <div>
                <h3>Privacy Settings</h3>
                <button className="option-button">Blocked Users</button>
                <button className="option-button">Two Step Verification</button>
                <button className="option-button">Last Seen & Online</button>
                <button className="option-button">Profile Photo</button>
                <button className="option-button">Bio</button>
                <button className="option-button">Date of Birth</button>
              </div>
            )}
            {selectedOption === 'Theme Customization' && (
              <div>
                <h3>Theme Customization</h3>
                <button className="option-button">Chat Theme</button>
                <button className="option-button">Chat Wallpaper</button>
                <button className="option-button">Your Color</button>
                <button className="option-button">Night Mode</button>
                <button className="option-button">Auto Night Mode</button>
                <button className="option-button">Text Size</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Modal;