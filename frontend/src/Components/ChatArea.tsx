import React from 'react';
import { ChatAreaContainer, Header, ProfilePic, DropdownMenu } from '../Styles/MainDashboardNormalUserStyles';

interface ChatAreaProps {
    selectedChannel: string;
    selectedTeam: string;
    dropdownVisible: boolean;
    toggleDropdown: () => void;
    showModal: (content: string) => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({ selectedChannel, selectedTeam, dropdownVisible, toggleDropdown, showModal }) => {
    return (
        <ChatAreaContainer>
            <Header>
                <h1>{selectedChannel ? `${selectedTeam.split(" ")[1]}-${selectedChannel}` : "Select a Channel"}</h1>
                <ProfilePic onClick={toggleDropdown} />
                {dropdownVisible && (
                    <DropdownMenu>
                        <div onClick={() => showModal("Settings")}>Settings</div>
                        <div onClick={() => showModal("Manage Profile")}>Manage Profile</div>
                        <div onClick={() => showModal("App Settings")}>App Settings</div>
                    </DropdownMenu>
                )}
            </Header>
            <div className="chat-messages">
                <p>Message from User</p>
            </div>
        </ChatAreaContainer>
    );
};

export default ChatArea;