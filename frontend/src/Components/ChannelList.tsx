import React, { useState } from "react";
import { FaTrash } from "react-icons/fa"; // ✅ Import FontAwesome trash bin icon
import styles from "../Styles/dashboardStyles";

const ChannelList: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [channels, setChannels] = useState<string[]>([
    "Channel 1",
    "Channel 2",
    "Channel 3",
  ]);

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
                <FaTrash style={styles.trashIcon} />{" "}
                {/* ✅ Small red trash bin */}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChannelList;
