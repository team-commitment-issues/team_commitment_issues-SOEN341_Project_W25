import React from 'react';
import { ChannelBarContainer, Button } from '../Styles/MainDashboardNormalUserStyles';

interface ChannelBarProps {
    channels: string[];
    selectedChannel: string;
    selectedTeam: string;
    onChannelClick: (channel: string) => void;
}

const ChannelBar: React.FC<ChannelBarProps> = ({ channels, selectedChannel, selectedTeam, onChannelClick }) => {
    return (
        <ChannelBarContainer>
            {channels.map((channel, index) => (
                <Button
                    key={index}
                    onClick={() => onChannelClick(channel)}
                    selected={selectedChannel === channel}
                >
                    {selectedTeam.split(" ")[1]}-{channel}
                </Button>
            ))}
        </ChannelBarContainer>
    );
};

export default ChannelBar;