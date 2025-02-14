import React, { useState } from "react";
import styles from "../Styles/dashboardStyles";

const ChannelList: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const channels = ["Channel 1", "Channel 2", "Channel 3"];

  return (
    <div style={styles.channelList}>
      <h3 onClick={() => setCollapsed(!collapsed)} style={styles.listHeader}>
        Channels {collapsed ? "▲" : "▼"}
      </h3>
      {!collapsed && (
        <ul style={styles.listContainer}>
          {" "}
          {/* ✅ Uses listContainer */}
          {channels.map((channel, index) => (
            <li key={index} style={styles.listItem}>
              {" "}
              {/* ✅ Uses listItem */}
              {channel}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChannelList;
