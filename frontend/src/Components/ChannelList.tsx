import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrash } from "react-icons/fa";
import styles from "../Styles/dashboardStyles";
import { getChannels } from "../Services/dashboardService";

interface ChannelListProps {
  selectedTeam: string | null;
  selectedChannel: string | null;
  setSelectedChannel: React.Dispatch<React.SetStateAction<string | null>>;
}

const ChannelList: React.FC<ChannelListProps> = ({selectedTeam, selectedChannel, setSelectedChannel}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [channels, setChannels] = useState<string[]>([]);
  const navigate = useNavigate();

  const handleDeleteChannel = (channelToDelete: string) => {
    try {
      // Add delete channel functionality
    } catch (err) {
      console.error("Failed to delete channel", err);
    }
  };

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        if (!selectedTeam) return;
        const channelsList = await getChannels(selectedTeam);
        setChannels(channelsList);
      } catch (err) {
        console.error("Failed to fetch channels", err);
      }
    };

    fetchChannels();
  }, [ selectedTeam ]);

  const toggleChannelSelection = (channel: string) => {
    setSelectedChannel((prevSelectedChannel) =>
      prevSelectedChannel === channel ? null : channel
    );
  };

  return (
    <div style={styles.channelList}>
      <h3 onClick={() => setCollapsed(!collapsed)} style={styles.listHeader}>
        Channels {collapsed ? "▲" : "▼"}
      </h3>
      {!collapsed && (
        <ul style={styles.listContainer}>
          {channels.map((channel, index) => (
            <li 
              key={index} 
              style={{
                ...styles.listItem,
                backgroundColor: selectedChannel === channel ? "#f0f0f0" : "transparent",
                fontWeight: selectedChannel === channel ? "bold" : "normal",
              }}
              onClick={() => toggleChannelSelection(channel)}
            >
              {channel}
              <button
                style={styles.deleteChannelButton}
                onClick={() => handleDeleteChannel(channel)}
              >
                <FaTrash style={styles.trashIcon} /> {/* Small red trash bin */}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        style={styles.createChannelButton}
        onClick={() => navigate("/create-channel", { state: { selectedTeam } })}>
        Create Channel
      </button>
    </div>
  );
};

export default ChannelList;
