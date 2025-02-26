import React, { useState } from 'react';
import Sidebar from '../Components/Sidebar';
import ChannelBar from '../Components/ChannelBar';
import ChatArea from '../Components/ChatArea';
import Modal from '../Components/UI/Modal';
import { teams } from '../data/teams';
import { SidebarContainer, ChannelBarContainer, ChatAreaContainer, Header, Button, ProfilePic, DropdownMenu } from '../Styles/MainDashboardNormalUserStyles';

const settingsOptions = {
  "Settings": ["Notification Preferences", "Privacy Settings", "Chat Settings", "Theme Customization"],
  "Manage Profile": ["Edit Profile", "Account Management", "Block Users"],
  "App Settings": ["Communication Preferences", "Accessibility Settings", "Data Usage", "Language"]
};

const MainDashboardNormalUser: React.FC = () => {
    const [selectedTeam, setSelectedTeam] = useState<string>('Team 1');
    const [channels, setChannels] = useState<string[]>(teams[selectedTeam]);
    const [selectedChannel, setSelectedChannel] = useState<string>('');
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [modalContent, setModalContent] = useState<string | null>(null);

    const handleTeamClick = (team: string) => {
        setSelectedTeam(team);
        setChannels(teams[team]);
        setSelectedChannel('');
    };

    const handleChannelClick = (channel: string) => {
        setSelectedChannel(channel);
    };

    const toggleDropdown = () => {
        setDropdownVisible(!dropdownVisible);
    };

    const showModal = (content: string) => {
        setModalContent(content);
        setDropdownVisible(false);
    };

    return (
        <div>
            <Sidebar teams={teams} selectedTeam={selectedTeam} onTeamClick={handleTeamClick} />
            <ChannelBar channels={channels} selectedChannel={selectedChannel} selectedTeam={selectedTeam} onChannelClick={handleChannelClick} />
            <ChatArea selectedChannel={selectedChannel} selectedTeam={selectedTeam} dropdownVisible={dropdownVisible} toggleDropdown={toggleDropdown} showModal={showModal} />
            {dropdownVisible && (
                <DropdownMenu>
                    <div onClick={() => showModal("Settings")}>Settings</div>
                    <div onClick={() => showModal("Manage Profile")}>Manage Profile</div>
                    <div onClick={() => showModal("App Settings")}>App Settings</div>
                </DropdownMenu>
            )}
            {modalContent && (
                <Modal 
                    title={modalContent} 
                    onClose={() => setModalContent(null)} 
                    options={settingsOptions[modalContent as keyof typeof settingsOptions]} 
                />
            )}
        </div>
    );
}

export default MainDashboardNormalUser;