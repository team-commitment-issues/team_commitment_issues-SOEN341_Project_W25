import React, { useState } from 'react';
import Modal from './Modal'; // Ensure the Modal component is properly imported and configured
import { Sidebar, ChannelBar, ChatArea, Header, Button, ProfilePic, DropdownMenu } from '../Styles/MainDashboardNormalUserStyles';

type TeamsType = {
    [key: string]: string[];
};

const teams: TeamsType = {
    "Team 1": ["Memes", "Gaming", "News"],
    "Team 2": ["Sports", "Movies", "Technology"],
    "Team 3": ["Finance", "Health", "DIY"],
    "Team 4": ["Travel", "Cooking", "Fashion"],
    "Team 5": ["Music", "Education", "Photography"]
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
        setDropdownVisible(false); // Close the dropdown menu when a modal is opened
    };

    return (
        <div>
            <Sidebar>
                {Object.keys(teams).map((team) => (
                    <Button
                        key={team}
                        onClick={() => handleTeamClick(team)}
                        selected={selectedTeam === team}
                    >
                        <div className="team-icon"></div>
                        {team}
                    </Button>
                ))}
            </Sidebar>
            <ChannelBar>
                {channels.map((channel, index) => (
                    <Button
                        key={index}
                        onClick={() => handleChannelClick(channel)}
                        selected={selectedChannel === channel}
                    >
                        {selectedTeam.split(" ")[1]}-{channel}
                    </Button>
                ))}
            </ChannelBar>
            <ChatArea>
                <Header>
                    <h1>{selectedChannel ? `${selectedTeam.split(" ")[1]}-${selectedChannel}` : "Select a Channel"}</h1>
                    <ProfilePic onClick={toggleDropdown}/>
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
            </ChatArea>
            {modalContent && (
                <Modal
                    title={modalContent.replace(/([A-Z])/g, ' $1').trim()} // Nicely formats the modal title
                    onClose={() => setModalContent(null)}
                >
                    {/* Here we could map over specific content based on modalContent when more details are ready */}
                    <div>{`Content for ${modalContent}`}</div>
                </Modal>
            )}
        </div>
    );
}

export default MainDashboardNormalUser;
