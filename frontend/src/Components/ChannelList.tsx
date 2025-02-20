import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrash } from "react-icons/fa";
import styles from "../Styles/dashboardStyles";

const ChannelList: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [channels, setChannels] = useState<string[]>([
    "Channel 1",
    "Channel 2",
    "Channel 3",
  ]);

  const navigate = useNavigate();

  const handleDeleteChannel = (channelToDelete: string) => {
    setChannels(channels.filter((channel) => channel !== channelToDelete));
  };

  return (
    <div style={styles.channelList}>
      <h3 onClick={() => setCollapsed(!collapsed)} style={styles.listHeader}>
        Channels {collapsed ? "▲" : "▼"}
      </h3>
      {!collapsed && (
        <ul style={styles.listContainer}>
          {channels.map((channel, index) => (
            <li key={index} style={styles.listItem}>
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
        onClick={() => navigate("/create-channel")}
      >
        Create Channel
      </button>
    </div>
  );
};

export default ChannelList;
