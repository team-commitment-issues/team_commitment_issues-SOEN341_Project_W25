import React, { useState } from 'react';
import styled from 'styled-components';

const ModalBackdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
`;

const ModalContent = styled.div`
  background-color: #333;
  color: #ddd;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  width: 60%;
  max-width: 800px;
  display: flex;
  position: relative;
`;

const Sidebar = styled.div`
  width: 200px;
  background-color: #252525;
  padding: 10px;
  border-right: 1px solid #444;
`;

const MainContent = styled.div`
  flex: 1;
  padding: 20px;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 24px;
  color: #ddd;
  cursor: pointer;
`;

const ModalHeader = styled.div`
  width: 100%;
  padding: 10px 0;
  background: #282828;
  color: #fff;
  text-align: center;
  font-size: 1.5em;
`;

const OptionButton = styled.div`
  padding: 10px;
  cursor: pointer;
  color: #ccc;
  &:hover {
    background-color: #3a3a3a;
  }
`;

interface ModalProps {
  onClose: () => void;
  title: string;
  options: string[];
}

const Modal: React.FC<ModalProps> = ({ onClose, title, options }) => {
  const [selectedOption, setSelectedOption] = useState<string>('');

  return (
    <ModalBackdrop onClick={onClose}>
      <ModalContent onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
        <Sidebar>
          {options.map(option => (
            <OptionButton key={option} onClick={() => setSelectedOption(option)}>
              {option}
            </OptionButton>
          ))}
        </Sidebar>
        <MainContent>
          <CloseButton onClick={onClose}>&times;</CloseButton>
          <ModalHeader>{title}</ModalHeader>
          <div>
            {selectedOption === 'Manage Profile' && (
              <div>
                <h3>Edit Profile</h3>
                <OptionButton>Change Profile Picture</OptionButton>
                <OptionButton>Change User Name</OptionButton>
                <OptionButton>Change Name</OptionButton>
                <OptionButton>Change Email Address</OptionButton>
                <OptionButton>Change Password</OptionButton>
              </div>
            )}
            {selectedOption === 'Privacy Settings' && (
              <div>
                <h3>Privacy Settings</h3>
                <OptionButton>Blocked Users</OptionButton>
                <OptionButton>Two Step Verification</OptionButton>
                <OptionButton>Last Seen & Online</OptionButton>
                <OptionButton>Profile Photo</OptionButton>
                <OptionButton>Bio</OptionButton>
                <OptionButton>Date of Birth</OptionButton>
              </div>
            )}
            {selectedOption === 'Theme Customization' && (
              <div>
                <h3>Theme Customization</h3>
                <OptionButton>Chat Theme</OptionButton>
                <OptionButton>Chat Wallpaper</OptionButton>
                <OptionButton>Your Color</OptionButton>
                <OptionButton>Night Mode</OptionButton>
                <OptionButton>Auto Night Mode</OptionButton>
                <OptionButton>Text Size</OptionButton>
              </div>
            )}
          </div>
        </MainContent>
      </ModalContent>
    </ModalBackdrop>
  );
}

export default Modal;